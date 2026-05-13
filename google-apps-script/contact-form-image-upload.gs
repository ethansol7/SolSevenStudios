var SHEET_NAME = 'Contact Submissions';
var IMAGE_FOLDER_NAME = 'Sol Seven Studios Contact Uploads';
var MAX_IMAGE_BYTES = 5 * 1024 * 1024;

var REQUIRED_HEADERS = [
  'Timestamp',
  'Name',
  'Email',
  'Company',
  'Message',
  'Page URL',
  'Context',
  'Source',
  'Image File Name',
  'Image MIME Type',
  'Image Size Bytes',
  'Drive View Link',
  'Direct Image URL',
  'Thumbnail URL',
  'Image Preview',
  'Image Upload Status'
];

var ALLOWED_IMAGE_TYPES = {
  'image/jpeg': true,
  'image/png': true,
  'image/webp': true
};

var LEGACY_DEFAULT_SHEET_NAME = 'Waitlist';
var LEGACY_SHEET_HEADERS = {
  Waitlist: [
    'timestamp',
    'name',
    'email',
    'company_or_organization',
    'role_or_title',
    'interest_type',
    'message_or_notes',
    'source_page',
    'campaign',
    'submission_id'
  ],
  'ICFF Contact List': [
    'timestamp',
    'name',
    'email',
    'phone',
    'interest_type',
    'message',
    'source_page',
    'campaign',
    'submission_id',
    'capture_mode',
    'discount_code',
    'form_name'
  ]
};

function doGet() {
  return jsonResponse_({
    success: true,
    ok: true,
    service: 'Sol Seven Studios contact form and lead capture',
    imageUploads: true,
    maxImageBytes: MAX_IMAGE_BYTES
  });
}

function doPost(event) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var payload = parsePayload_(event);

    if (!isContactSubmission_(payload)) {
      return handleLegacyLeadCapture_(payload);
    }

    return handleContactSubmission_(payload);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({
      success: false,
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  } finally {
    lock.releaseLock();
  }
}

function handleContactSubmission_(payload) {
  if (String(payload.website || '').trim()) {
    return jsonResponse_({ success: true, skipped: true });
  }

  var submission = normalizeSubmission_(payload);
  var validationError = validateSubmission_(submission);
  if (validationError) {
    return jsonResponse_({ success: false, error: validationError });
  }

  var imageResult = null;
  var imageError = '';

  try {
    imageResult = uploadImageIfPresent_(payload);
  } catch (error) {
    imageError = error && error.message ? error.message : String(error);
    console.error('Image upload failed: ' + imageError);
  }

  var appendResult = appendSubmission_(submission, imageResult, imageError);
  SpreadsheetApp.flush();

  if (imageError) {
    return jsonResponse_({
      success: false,
      ok: false,
      partialSuccess: true,
      imageUploadFailed: true,
      row: appendResult.row,
      error: 'Message saved, but the image could not be uploaded: ' + imageError
    });
  }

  return jsonResponse_({
    success: true,
    ok: true,
    row: appendResult.row,
    image: imageResult
  });
}

function isContactSubmission_(payload) {
  var context = cleanText_(payload.context).toLowerCase();
  var source = cleanText_(payload.source).toLowerCase();
  var formName = cleanText_(payload.formName || payload.form_name).toLowerCase();
  var attachment = payload.attachment || {};

  return Boolean(
    payload.imageDataBase64 ||
    payload.imageData ||
    payload.imageFileName ||
    attachment.dataBase64 ||
    attachment.fileName ||
    source.indexOf('website contact form') !== -1 ||
    context.indexOf('contact') !== -1 ||
    formName.indexOf('contact') !== -1
  );
}

function handleLegacyLeadCapture_(payload) {
  var sheetName = getLegacyTargetSheetName_(payload);
  var headers = LEGACY_SHEET_HEADERS[sheetName] || LEGACY_SHEET_HEADERS[LEGACY_DEFAULT_SHEET_NAME];
  var spreadsheet = getSpreadsheet_();
  var sheet = getOrCreateSheet_(spreadsheet, sheetName);

  ensureLegacyHeaders_(sheet, headers);

  var submissionId = cleanText_(payload.submissionId || payload.submission_id);
  if (submissionId && isDuplicateLegacySubmission_(sheet, headers, submissionId)) {
    return jsonResponse_({
      success: true,
      ok: true,
      duplicate: true,
      sheetName: sheetName,
      message: 'Submission already captured.'
    });
  }

  sheet.appendRow(headers.map(function(header) {
    return legacyValueForHeader_(header, payload, submissionId);
  }));

  return jsonResponse_({
    success: true,
    ok: true,
    sheetName: sheetName,
    message: 'Submission captured.'
  });
}

function parsePayload_(event) {
  var raw = event && event.postData && event.postData.contents ? event.postData.contents : '';

  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('JSON parse failed, falling back to form parameters: ' + error);
    }
  }

  return event && event.parameter ? event.parameter : {};
}

function getLegacyTargetSheetName_(payload) {
  var requested = cleanText_(payload.sheetName || payload.targetSheet || payload.listName);
  if (requested && LEGACY_SHEET_HEADERS[requested]) {
    return requested;
  }

  return LEGACY_DEFAULT_SHEET_NAME;
}

function ensureLegacyHeaders_(sheet, headers) {
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  var currentHeaders = headerRange.getValues()[0];
  var hasHeaders = currentHeaders.some(function(value) {
    return String(value || '').trim() !== '';
  });

  if (!hasHeaders) {
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function isDuplicateLegacySubmission_(sheet, headers, submissionId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var submissionIdColumn = headers.indexOf('submission_id') + 1;
  if (submissionIdColumn < 1) return false;

  var values = sheet
    .getRange(2, submissionIdColumn, lastRow - 1, 1)
    .getValues()
    .flat();

  return values.some(function(value) {
    return cleanText_(value) === submissionId;
  });
}

function legacyValueForHeader_(header, payload, submissionId) {
  var values = {
    timestamp: cleanText_(payload.timestamp || payload.submittedAt) || new Date().toISOString(),
    name: cleanText_(payload.name || payload.fullName),
    email: cleanText_(payload.email),
    phone: cleanText_(payload.phone),
    company_or_organization: cleanText_(payload.company || payload.companyOrOrganization),
    role_or_title: cleanText_(payload.roleTitle || payload.role || payload.title),
    interest_type: cleanText_(payload.interestType || payload.interest_type),
    message: cleanText_(payload.message || payload.notes),
    message_or_notes: cleanText_(payload.message || payload.notes),
    source_page: cleanText_(payload.sourcePage || payload.source_page),
    campaign: cleanText_(payload.campaign),
    submission_id: submissionId,
    capture_mode: cleanText_(payload.captureMode || payload.capture_mode),
    discount_code: cleanText_(payload.discountCode || payload.discount_code),
    form_name: cleanText_(payload.formName || payload.form_name)
  };

  return values[header] || '';
}

function normalizeSubmission_(payload) {
  return {
    timestamp: new Date(),
    name: cleanText_(payload.name || payload.fullName || payload.full_name),
    email: cleanText_(payload.email).toLowerCase(),
    company: cleanText_(payload.company || payload.business),
    message: cleanText_(payload.message),
    pageUrl: cleanText_(payload.pageUrl || payload.page_url),
    context: cleanText_(payload.context),
    source: cleanText_(payload.source || 'Sol Seven Studios website contact form')
  };
}

function validateSubmission_(submission) {
  if (!submission.name) return 'Name is required.';
  if (!submission.email || submission.email.indexOf('@') === -1) return 'A valid email is required.';
  if (!submission.message || submission.message.length < 10) return 'Message must be at least 10 characters.';
  return '';
}

function uploadImageIfPresent_(payload) {
  var attachment = payload.attachment || {};
  var fileName = cleanFileName_(attachment.fileName || payload.fileName || payload.imageFileName);
  var mimeType = cleanText_(attachment.mimeType || payload.mimeType || payload.imageMimeType);
  var declaredSize = Number(attachment.size || payload.imageSize || payload.imageSizeBytes || 0);
  var dataBase64 = attachment.dataBase64 || payload.imageDataBase64 || payload.imageData || '';

  if (!fileName && !mimeType && !dataBase64) {
    return null;
  }

  if (!fileName || !mimeType || !dataBase64) {
    throw new Error('Image payload is incomplete.');
  }

  if (!ALLOWED_IMAGE_TYPES[mimeType]) {
    throw new Error('Only JPG, PNG, and WEBP images are accepted.');
  }

  if (declaredSize > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  var strippedBase64 = String(dataBase64).replace(/^data:[^,]+,/, '').replace(/\s/g, '');
  var bytes = Utilities.base64Decode(strippedBase64);

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }

  var uniqueName = makeUniqueFileName_(fileName);
  var blob = Utilities.newBlob(bytes, mimeType, uniqueName);
  var folder = getUploadFolder_();
  var file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  var driveViewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
  var directImageUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
  var thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w600';

  return {
    fileId: fileId,
    fileName: uniqueName,
    originalFileName: fileName,
    mimeType: mimeType,
    sizeBytes: bytes.length,
    driveViewUrl: driveViewUrl,
    directImageUrl: directImageUrl,
    thumbnailUrl: thumbnailUrl
  };
}

function appendSubmission_(submission, imageResult, imageError) {
  var spreadsheet = getSpreadsheet_();
  var sheet = getOrCreateSheet_(spreadsheet, SHEET_NAME);
  var headerMap = ensureHeaders_(sheet);

  var imageStatus = imageResult ? 'Uploaded' : imageError ? 'Image upload failed: ' + imageError : 'No image attached';
  var rowValues = {};
  rowValues['Timestamp'] = submission.timestamp;
  rowValues['Name'] = submission.name;
  rowValues['Email'] = submission.email;
  rowValues['Company'] = submission.company;
  rowValues['Message'] = submission.message;
  rowValues['Page URL'] = submission.pageUrl;
  rowValues['Context'] = submission.context;
  rowValues['Source'] = submission.source;
  rowValues['Image File Name'] = imageResult ? imageResult.fileName : '';
  rowValues['Image MIME Type'] = imageResult ? imageResult.mimeType : '';
  rowValues['Image Size Bytes'] = imageResult ? imageResult.sizeBytes : '';
  rowValues['Drive View Link'] = imageResult ? imageResult.driveViewUrl : '';
  rowValues['Direct Image URL'] = imageResult ? imageResult.directImageUrl : '';
  rowValues['Thumbnail URL'] = imageResult ? imageResult.thumbnailUrl : '';
  rowValues['Image Preview'] = imageResult ? '=IMAGE("' + escapeFormulaString_(imageResult.thumbnailUrl) + '", 4, 120, 120)' : '';
  rowValues['Image Upload Status'] = imageStatus;

  var row = [];
  var lastColumn = sheet.getLastColumn();
  for (var column = 1; column <= lastColumn; column += 1) {
    row.push('');
  }

  Object.keys(rowValues).forEach(function(header) {
    if (headerMap[header]) {
      row[headerMap[header] - 1] = rowValues[header];
    }
  });

  sheet.appendRow(row);
  var rowNumber = sheet.getLastRow();

  if (imageResult && headerMap['Image Preview']) {
    insertImagePreview_(sheet, rowNumber, headerMap['Image Preview'], imageResult);
  }

  return {
    row: rowNumber,
    headerMap: headerMap
  };
}

function insertImagePreview_(sheet, row, column, imageResult) {
  var range = sheet.getRange(row, column);

  try {
    var cellImage = SpreadsheetApp
      .newCellImage()
      .setSourceUrl(imageResult.thumbnailUrl)
      .setAltTextTitle(imageResult.originalFileName)
      .setAltTextDescription('Sol Seven Studios contact form image upload')
      .build();
    range.setValue(cellImage);
  } catch (error) {
    console.warn('Cell image insert failed, using IMAGE formula: ' + error);
    range.setFormula('=IMAGE("' + escapeFormulaString_(imageResult.thumbnailUrl) + '", 4, 120, 120)');
  }

  sheet.setRowHeight(row, 132);
}

function getSpreadsheet_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!activeSpreadsheet) {
    throw new Error('No active spreadsheet found. Set Script Property SPREADSHEET_ID to the destination sheet ID.');
  }

  return activeSpreadsheet;
}

function getUploadFolder_() {
  var folderId = PropertiesService.getScriptProperties().getProperty('IMAGE_FOLDER_ID');
  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }

  var folders = DriveApp.getFoldersByName(IMAGE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(IMAGE_FOLDER_NAME);
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(REQUIRED_HEADERS);
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var hasAnyHeader = existingHeaders.some(function(header) {
    return String(header || '').trim();
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
    existingHeaders = REQUIRED_HEADERS.slice();
  }

  var headerMap = {};
  existingHeaders.forEach(function(header, index) {
    var normalized = String(header || '').trim();
    if (normalized && !headerMap[normalized]) {
      headerMap[normalized] = index + 1;
    }
  });

  REQUIRED_HEADERS.forEach(function(header) {
    if (!headerMap[header]) {
      var nextColumn = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextColumn).setValue(header);
      headerMap[header] = nextColumn;
    }
  });

  return headerMap;
}

function makeUniqueFileName_(fileName) {
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Etc/UTC', 'yyyyMMdd-HHmmss');
  var uuid = Utilities.getUuid().slice(0, 8);
  return timestamp + '-' + uuid + '-' + cleanFileName_(fileName);
}

function cleanText_(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function cleanFileName_(value) {
  var name = cleanText_(value).replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-');
  return name ? name.slice(0, 140) : '';
}

function escapeFormulaString_(value) {
  return String(value || '').replace(/"/g, '""');
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
