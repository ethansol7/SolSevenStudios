export const GOOGLE_TAG_ID = 'G-ZYML25KSKD';

const CANONICAL_ORIGIN = 'https://SolSevenStudios.com';
const STRIPE_HOST = 'buy.stripe.com';
let initialized = false;
let lastTrackedPath = '';

function hasBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function cleanPath(path = '/') {
  if (!path || path === '/') return '/';
  const [withoutHash] = path.split('#');
  const [pathname] = withoutHash.split('?');
  return pathname.startsWith('/') ? pathname.replace(/\/+$/, '') || '/' : `/${pathname.replace(/\/+$/, '')}`;
}

export function canonicalUrlForPath(path = '/') {
  const normalizedPath = cleanPath(path);
  const canonicalPath = normalizedPath === '/' ? '/' : `${normalizedPath}/`;
  return new URL(canonicalPath, CANONICAL_ORIGIN).href;
}

function analyticsDebugEnabled() {
  if (!hasBrowser()) return false;
  return window.location.search.includes('analytics_debug=1');
}

function sanitizeParams(params = {}) {
  return Object.entries(params).reduce((nextParams, [key, value]) => {
    if (value === undefined || value === null || value === '') return nextParams;
    nextParams[key] = value;
    return nextParams;
  }, {});
}

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
}

function dataLayerHasCommand(command, id) {
  return window.dataLayer?.some?.((entry) => {
    const values = Array.from(entry || []);
    return values[0] === command && values[1] === id;
  });
}

function trackExternalLinkFromClick(event) {
  const link = event.target?.closest?.('a[href]');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

  let targetUrl;
  try {
    targetUrl = new URL(href, window.location.href);
  } catch {
    return;
  }

  if (targetUrl.origin === window.location.origin || targetUrl.hostname === STRIPE_HOST) return;

  trackEvent('external_link_click', {
    link_url: targetUrl.href,
    link_domain: targetUrl.hostname,
    link_text: link.textContent?.trim().slice(0, 80),
  });
}

export function initAnalytics() {
  if (!hasBrowser() || initialized || !GOOGLE_TAG_ID) return;

  ensureGtag();

  const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}"]`);
  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_TAG_ID)}`;
    document.head.appendChild(script);
  }

  if (!dataLayerHasCommand('config', GOOGLE_TAG_ID)) {
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_TAG_ID, {
      send_page_view: false,
    });
  }

  document.addEventListener('click', trackExternalLinkFromClick, { capture: true });
  initialized = true;
}

export function trackPageView(path, metadata = {}) {
  if (!hasBrowser() || !GOOGLE_TAG_ID) return;

  initAnalytics();
  const pagePath = cleanPath(path);
  if (pagePath === lastTrackedPath) return;
  lastTrackedPath = pagePath;

  const params = sanitizeParams({
    page_title: metadata.title || document.title,
    page_location: metadata.location || canonicalUrlForPath(pagePath),
    page_path: pagePath,
  });

  window.gtag?.('event', 'page_view', params);
  if (analyticsDebugEnabled()) console.debug('[analytics] page_view', params);
}

export function trackEvent(eventName, params = {}) {
  if (!hasBrowser() || !GOOGLE_TAG_ID) return;

  initAnalytics();
  const cleanParams = sanitizeParams(params);
  window.gtag?.('event', eventName, cleanParams);
  if (analyticsDebugEnabled()) console.debug('[analytics]', eventName, cleanParams);
}

export function trackContactSubmit({ context, hasImage, status = 'success' } = {}) {
  trackEvent('contact_form_submit', {
    event_category: 'lead',
    form_context: context,
    has_image: Boolean(hasImage),
    submission_status: status,
  });
}

export function trackStripeCheckoutClick(product = {}) {
  trackEvent('stripe_checkout_click', {
    event_category: 'commerce',
    product_name: product.name,
    product_slug: product.slug,
    product_category: product.collection || product.category,
    currency: 'USD',
    value: parsePrice(product.price),
  });
}

export function trackProductCardClick(product = {}, target = 'card') {
  trackEvent('product_card_click', {
    event_category: 'shop',
    product_name: product.name,
    product_slug: product.slug,
    product_category: product.collection || product.category,
    click_target: target,
  });
}

export function trackConfiguratorInteraction(action, details = {}) {
  trackEvent('configurator_interaction', {
    event_category: 'solx_configurator',
    configurator_action: action,
    ...details,
  });
}

export function trackExternalLink(url, label = '') {
  if (!url) return;

  let targetUrl;
  try {
    targetUrl = new URL(url, hasBrowser() ? window.location.href : CANONICAL_ORIGIN);
  } catch {
    return;
  }

  if (targetUrl.hostname === STRIPE_HOST) return;

  trackEvent('external_link_click', {
    link_url: targetUrl.href,
    link_domain: targetUrl.hostname,
    link_text: label,
  });
}

function parsePrice(price) {
  if (typeof price !== 'string') return undefined;
  const match = price.replace(/,/g, '').match(/\$?(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}
