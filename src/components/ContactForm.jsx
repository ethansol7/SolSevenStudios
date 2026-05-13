import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useState } from 'react';

const CONTACT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzbsyq90MK4_5MCOmCVn_YZ901hioj16a0EepEEnRvd5KqrFD07ATe-XkR81t4FaySE/exec';

const initialForm = {
  fullName: '',
  email: '',
  company: '',
  message: '',
  website: '',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(form) {
  if (!form.fullName.trim()) return 'Enter your full name.';
  if (!emailPattern.test(form.email.trim())) return 'Enter a valid email address.';
  if (form.message.trim().length < 10) return 'Add a short message so the studio has context.';
  return '';
}

export default function ContactForm({ context = 'site-contact' }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState('');

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (status !== 'submitting') {
      setStatus('idle');
      setNotice('');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.website.trim()) {
      setStatus('success');
      setNotice('Message sent.');
      setForm(initialForm);
      return;
    }

    const validationError = validateForm(form);
    if (validationError) {
      setStatus('error');
      setNotice(validationError);
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      message: form.message.trim(),
      source: 'Sol Seven Studios website contact form',
      context,
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
    };

    setStatus('submitting');
    setNotice('');

    try {
      await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      setStatus('success');
      setNotice('Message sent. The studio will follow up soon.');
      setForm(initialForm);
    } catch {
      setStatus('error');
      setNotice('The message could not be sent. Please try again in a moment.');
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
