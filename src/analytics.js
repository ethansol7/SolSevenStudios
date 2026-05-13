export const GOOGLE_TAG_ID = 'G-QN3TZEVE03';

const CANONICAL_ORIGIN = 'https://SolSevenStudios.com';
const STRIPE_HOST = 'buy.stripe.com';
const GA_COLLECT_URL = 'https://www.google-analytics.com/g/collect';
const CLIENT_ID_STORAGE_KEY = 'sss_ga_client_id';
const SESSION_ID_STORAGE_KEY = 'sss_ga_session_id';
const ENGAGEMENT_INTERVAL_MS = 15000;
let initialized = false;
let lastTrackedPath = '';
let engagementTimer = null;
let lastEngagementAt = 0;

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

function randomAnalyticsId() {
  const cryptoApi = window.crypto || window.msCrypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(2);
    cryptoApi.getRandomValues(values);
    return `${values[0].toString(36)}${values[1].toString(36)}`;
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function readStoredValue(storage, key) {
  try {
    return storage?.getItem(key);
  } catch {
    return undefined;
  }
}

function writeStoredValue(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or locked-down browsers.
  }
}

function getClientId() {
  const existingId = readStoredValue(window.localStorage, CLIENT_ID_STORAGE_KEY);
  if (existingId) return existingId;

  const nextId = randomAnalyticsId();
  writeStoredValue(window.localStorage, CLIENT_ID_STORAGE_KEY, nextId);
  return nextId;
}

function getSessionId() {
  const existingSession = readStoredValue(window.sessionStorage, SESSION_ID_STORAGE_KEY);
  if (existingSession) return existingSession;

  const nextSession = Math.floor(Date.now() / 1000).toString();
  writeStoredValue(window.sessionStorage, SESSION_ID_STORAGE_KEY, nextSession);
  return nextSession;
}

function getScreenResolution() {
  if (!window.screen?.width || !window.screen?.height) return undefined;
  return `${window.screen.width}x${window.screen.height}`;
}

function appendCollectParams(searchParams, params = {}) {
  Object.entries(sanitizeParams(params)).forEach(([key, value]) => {
    if (['page_location', 'page_title', 'page_path'].includes(key)) return;
    if (typeof value === 'number' && Number.isFinite(value)) {
      searchParams.set(`epn.${key}`, String(value));
      return;
    }

    const normalizedValue = typeof value === 'boolean' ? String(value) : String(value);
    searchParams.set(`ep.${key}`, normalizedValue.slice(0, 100));
  });
}

function sendCollectEvent(eventName, params = {}, { engagementTimeMsec } = {}) {
  if (!hasBrowser() || !eventName) return;

  const collectUrl = new URL(GA_COLLECT_URL);
  collectUrl.searchParams.set('v', '2');
  collectUrl.searchParams.set('tid', GOOGLE_TAG_ID);
  collectUrl.searchParams.set('cid', getClientId());
  collectUrl.searchParams.set('sid', getSessionId());
  collectUrl.searchParams.set('sct', '1');
  collectUrl.searchParams.set('seg', '1');
  collectUrl.searchParams.set('_p', `${Date.now()}${Math.floor(Math.random() * 1000)}`);
  collectUrl.searchParams.set('ul', (navigator.language || 'en-us').toLowerCase());
  collectUrl.searchParams.set('en', eventName);
  collectUrl.searchParams.set('dl', params.page_location || window.location.href);
  collectUrl.searchParams.set('dt', params.page_title || document.title);

  const screenResolution = getScreenResolution();
  if (screenResolution) collectUrl.searchParams.set('sr', screenResolution);
  if (params.page_path) collectUrl.searchParams.set('dp', params.page_path);
  if (engagementTimeMsec) collectUrl.searchParams.set('_et', String(Math.max(1, Math.round(engagementTimeMsec))));
  if (analyticsDebugEnabled()) collectUrl.searchParams.set('ep.debug_mode', '1');

  appendCollectParams(collectUrl.searchParams, params);

  fetch(collectUrl.href, {
    method: 'GET',
    mode: 'no-cors',
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {
    const fallbackPixel = new Image();
    fallbackPixel.src = collectUrl.href;
  });
}

function flushEngagement() {
  if (!hasBrowser() || document.visibilityState !== 'visible') return;

  const now = Date.now();
  const elapsed = lastEngagementAt ? now - lastEngagementAt : 1;
  lastEngagementAt = now;

  sendCollectEvent('user_engagement', {
    page_location: canonicalUrlForPath(window.location.pathname),
    page_title: document.title,
    page_path: cleanPath(window.location.pathname),
  }, {
    engagementTimeMsec: elapsed,
  });
}

function startEngagementTracking() {
  if (engagementTimer) return;

  lastEngagementAt = Date.now();
  engagementTimer = window.setInterval(flushEngagement, ENGAGEMENT_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEngagement();
    if (document.visibilityState === 'visible') lastEngagementAt = Date.now();
  });
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

  const existingScript = document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js"]');
  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js';
    document.head.appendChild(script);
  }

  if (!dataLayerHasCommand('config', GOOGLE_TAG_ID)) {
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_TAG_ID, {
      send_page_view: false,
    });
  }

  document.addEventListener('click', trackExternalLinkFromClick, { capture: true });
  startEngagementTracking();
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
  sendCollectEvent('page_view', params, { engagementTimeMsec: 1 });
  if (analyticsDebugEnabled()) console.debug('[analytics] page_view', params);
}

export function trackEvent(eventName, params = {}) {
  if (!hasBrowser() || !GOOGLE_TAG_ID) return;

  initAnalytics();
  const cleanParams = sanitizeParams(params);
  window.gtag?.('event', eventName, cleanParams);
  sendCollectEvent(eventName, cleanParams);
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
