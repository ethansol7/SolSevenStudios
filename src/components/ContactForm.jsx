import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { trackContactSubmit } from '../analytics.js';

const CONTACT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwp7vn9E_TSuuvdf19mvOCTBhzWQgDfNvtph-mKdE-0zifIBF4BTVAdSS8lLCKEhtYkkw/exec';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ACCEPTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ACCEPTED_IMAGE_INPUT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

const initialForm = {
  fullName: '',
  email: '',
  company: '',
  message: '',
  website: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatFileSize(bytes) {
  if (!bytes) return '0 KB';
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getFileExtension(fileName) {
  const extension = fileName.split('.').pop();
  return extension ? extension.toLowerCase() : '';
}

function validateImageFile(file) {
  if (!file) return '';

  const extension = getFileExtension(file.name);
  if (!ACCEPTED_IMAGE_TYPES.has(file.type) || !ACCEPTED_IMAGE_EXTENSIONS.has(extension)) {
    return 'Attach a JPG, PNG, or WEBP image only.';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `Images must be ${formatFileSize(MAX_IMAGE_BYTES)} or smaller.`;
  }

  return '';
}

function readImageAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64 = ''] = result.split(',');
      if (!base64) {
        reject(new Error('Image data could not be read.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Image data could not be read.'));
    reader.readAsDataURL(file);
  });
}

function parseContactResponse(text) {
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: 'The contact service returned an unreadable response.' };
  }
}

async function sendContactPayload(payload) {
  const response = await fetch(CONTACT_ENDPOINT, {
    method: 'POST',
    mode: 'cors',
    redirect: 'follow',
    credentials: 'omit',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  const result = parseContactResponse(await response.text());
  if (!response.ok || result.success === false || result.ok === false) {
    throw new Error(result.error || result.message || 'The contact service could not save this message.');
  }

  return result;
}

function validateForm(form) {
  if (!form.fullName.trim()) return 'Enter your full name.';
  if (!emailPattern.test(form.email.trim())) return 'Enter a valid email address.';
  if (form.message.trim().length < 10) return 'Add a short message so the studio has context.';
  return '';
}

export default function ContactForm({ context = 'site-contact' }) {
  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState('');
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef(null);
  const imageInputId = `${context}-contact-image`;
  const imageLabelId = `${context}-contact-image-label`;
  const imageDescriptionId = `${context}-contact-image-description`;

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (status !== 'submitting') {
      setStatus('idle');
      setNotice('');
    }
  };

  const resetImage = () => {
    setImageFile(null);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateImage = (event) => {
    const [file] = event.target.files || [];
    setStatus('idle');
    setNotice('');

    if (!file) {
      resetImage();
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setImageFile(null);
      setImageError(validationError);
      event.target.value = '';
      return;
    }

    setImageFile(file);
    setImageError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (status === 'submitting') return;

    if (form.website.trim()) {
      setStatus('success');
      setNotice('Message sent.');
      setForm(initialForm);
      resetImage();
      return;
    }

    const validationError = validateForm(form);
    if (validationError) {
      setStatus('error');
      setNotice(validationError);
      return;
    }

    if (imageFile) {
      const imageValidationError = validateImageFile(imageFile);
      if (imageValidationError) {
        setStatus('error');
        setNotice(imageValidationError);
        setImageError(imageValidationError);
        return;
      }
    }

    setStatus('submitting');
    setNotice(imageFile ? 'Uploading image and sending message...' : 'Sending message...');

    try {
      const imageDataBase64 = imageFile ? await readImageAsBase64(imageFile) : '';
      const attachment = imageFile
        ? {
            fileName: imageFile.name,
            mimeType: imageFile.type,
            size: imageFile.size,
            dataBase64: imageDataBase64,
          }
        : null;
      const trimmedName = form.fullName.trim();
      const trimmedEmail = form.email.trim();
      const payload = {
        name: trimmedName,
        fullName: trimmedName,
        email: trimmedEmail,
        company: form.company.trim(),
        message: form.message.trim(),
        source: 'Sol Seven Studios website contact form',
        context,
        pageUrl: window.location.href,
        submittedAt: new Date().toISOString(),
        attachment,
        fileName: attachment?.fileName || '',
        mimeType: attachment?.mimeType || '',
        imageDataBase64: attachment?.dataBase64 || '',
        imageFileName: attachment?.fileName || '',
        imageMimeType: attachment?.mimeType || '',
        imageSize: attachment?.size || '',
      };

      const result = await sendContactPayload(payload);

      if (imageFile && result.imageUploadFailed) {
        throw new Error(result.error || 'Message saved, but the image could not be uploaded. Please try sending the image again.');
      }

      setStatus('success');
      setNotice(
        imageFile
          ? 'Message sent with the attached image. The studio will follow up soon.'
          : 'Message sent. The studio will follow up soon.'
      );
      trackContactSubmit({ context, hasImage: Boolean(imageFile) });
      setForm(initialForm);
      resetImage();
    } catch (error) {
      setStatus('error');
      setNotice(error.message || 'The message or image could not be sent. Please try again in a moment.');
      trackContactSubmit({ context, hasImage: Boolean(imageFile), status: 'error' });
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-form__grid">
        <label>
          <span>Full name</span>
          <input
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={updateField('fullName')}
            autoComplete="name"
            required
          />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={updateField('email')}
            autoComplete="email"
            required
          />
        </label>
      </div>

      <label>
        <span>Company / business</span>
        <input
          type="text"
          name="company"
          value={form.company}
          onChange={updateField('company')}
          autoComplete="organization"
        />
      </label>

      <label>
        <span>Message</span>
        <textarea
          name="message"
          value={form.message}
          onChange={updateField('message')}
          rows="6"
          required
        />
      </label>

      <div className="contact-form__upload">
        <div className="contact-form__file-label" id={imageLabelId}>
          <span>Attach a screenshot or reference image</span>
          <small id={imageDescriptionId}>Optional. Upload a configurator screenshot, sketch, or reference image so we can better understand your request.</small>
        </div>
        <div className="contact-form__file-row">
          <label className="contact-form__file-button" htmlFor={imageInputId}>
            <ImagePlus size={18} aria-hidden="true" />
            <span>{imageFile ? 'Replace image' : 'Choose image'}</span>
          </label>
          <input
            ref={fileInputRef}
            id={imageInputId}
            type="file"
            name="referenceImage"
            accept={ACCEPTED_IMAGE_INPUT}
            onChange={updateImage}
            disabled={status === 'submitting'}
            aria-labelledby={imageLabelId}
            aria-describedby={imageDescriptionId}
          />
          <p className="contact-form__file-limit">JPG, PNG, or WEBP up to {formatFileSize(MAX_IMAGE_BYTES)}.</p>
        </div>
        {imageFile && (
          <div className="contact-form__file-summary">
            <div>
              <strong>{imageFile.name}</strong>
              <span>{formatFileSize(imageFile.size)}</span>
            </div>
            <button type="button" className="contact-form__file-remove" onClick={resetImage} disabled={status === 'submitting'}>
              <X size={16} aria-hidden="true" />
              <span>Remove</span>
            </button>
          </div>
        )}
        {imageError && (
          <p className="contact-form__file-error" role="alert">
            {imageError}
          </p>
        )}
      </div>

      <label className="contact-form__trap" aria-hidden="true">
        <span>Website</span>
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={updateField('website')}
          tabIndex="-1"
          autoComplete="off"
        />
      </label>

      <div className="contact-form__footer">
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? <Loader2 size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
          <span>{status === 'submitting' ? 'Sending' : 'Send message'}</span>
        </button>
        <p className={`contact-form__notice contact-form__notice--${status}`} role="status" aria-live="polite">
          {status === 'success' && <CheckCircle2 size={17} aria-hidden="true" />}
          {status === 'error' && <AlertCircle size={17} aria-hidden="true" />}
          <span>{notice || 'Secure project inquiries for Sol Seven Studios.'}</span>
        </p>
      </div>
    </form>
  );
}
