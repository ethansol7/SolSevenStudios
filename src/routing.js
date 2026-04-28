export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export const buildPath = (path = '/') => `${basePath}${path.startsWith('/') ? path : `/${path}`}`;

export const currentRoutePath = () => {
  const pathname = window.location.pathname;
  const withoutBase = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  return withoutBase || '/';
};

export const useClientNavigation = (setRoutePath) => (event, path) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

  event.preventDefault();
  const nextPath = buildPath(path);
  const routePath = path.split('#')[0] || '/';
  const hash = path.includes('#') ? `#${path.split('#')[1]}` : '';
  window.history.pushState({}, '', nextPath);
  setRoutePath(routePath);

  if (hash) {
    window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 40);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
