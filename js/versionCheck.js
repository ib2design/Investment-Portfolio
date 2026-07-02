const VERSION_RELOAD_KEY = 'portfolioVersionReload';

function getLocalCodeVersion() {
  return document.querySelector('meta[name="code-version"]')?.getAttribute('content') || '';
}

export async function ensureLatestVersion() {
  const localVersion = getLocalCodeVersion();

  let remote;

  try {
    const response = await fetch(`version.json?_=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      return;
    }

    remote = await response.json();
  } catch {
    return;
  }

  const remoteVersion = remote?.codeVersion || '';

  if (!remoteVersion || remoteVersion === localVersion) {
    sessionStorage.removeItem(VERSION_RELOAD_KEY);
    return;
  }

  if (sessionStorage.getItem(VERSION_RELOAD_KEY) === remoteVersion) {
    const url = new URL(window.location.href);
    url.searchParams.set('_bust', String(Date.now()));
    window.location.replace(url.toString());
    return new Promise(() => {});
  }

  sessionStorage.setItem(VERSION_RELOAD_KEY, remoteVersion);

  const url = new URL(window.location.href);
  url.searchParams.set('_v', remoteVersion);
  window.location.replace(url.toString());
  return new Promise(() => {});
}
