const BASE = 'http://localhost';

export function toAbsoluteURL(base: string, url: string): URL {
  try {
    const urlObject = new URL(url);
    return urlObject;
  } catch (err) {}

  let urlObject: URL | null = null;
  try {
    urlObject = new URL(base ?? BASE);
  } catch (err) {
    urlObject = new URL(BASE);
  }

  urlObject.pathname = urlObject.pathname.replace(/\/+$/, '') + url;
  return urlObject;
}
