export function viewFromUrl(fallback = 'dashboard') {
  return new URLSearchParams(window.location.search).get('view') || fallback;
}

export function setView(view, extra = {}) {
  const params = new URLSearchParams({ view, ...extra });
  history.replaceState({}, '', `${location.pathname}?${params}`);
}
