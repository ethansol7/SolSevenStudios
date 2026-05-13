# Sol Seven Studios Contact Form Apps Script

Use `contact-form-image-upload.gs` as the deployed Google Apps Script web app for the Sol Seven Studios contact form.

The script is backward-compatible with the older PlastiVista / ICFF lead capture payloads that use the same endpoint. Contact-form payloads route to `Contact Submissions`; older lead-capture payloads keep routing to `Waitlist` or `ICFF Contact List`.

## Deployment Notes

1. Open the existing Apps Script project used by the contact endpoint.
2. Replace the current web app code with `contact-form-image-upload.gs`.
3. If the script is not bound to the destination Google Sheet, add this script property:
   - `SPREADSHEET_ID`: the destination Google Sheet ID.
4. Optional: create a Drive folder for uploads and add this script property:
   - `IMAGE_FOLDER_ID`: the destination Google Drive folder ID.
5. Deploy a new web app version.
6. Keep access set so anonymous site visitors can submit the form.

If `IMAGE_FOLDER_ID` is not set, the script creates or reuses a folder named `Sol Seven Studios Contact Uploads`.

## Sheet Columns

The script preserves existing sheet columns and appends any missing columns from this set:

- `Timestamp`
- `Name`
- `Email`
- `Company`
- `Message`
- `Page URL`
- `Context`
- `Source`
- `Image File Name`
- `Image MIME Type`
- `Image Size Bytes`
- `Drive View Link`
- `Direct Image URL`
- `Thumbnail URL`
- `Image Preview`
- `Image Upload Status`

Uploaded files are shared as "Anyone with the link can view" so the `Image Preview` column can render either a Google Sheets cell image or an `IMAGE()` formula.
