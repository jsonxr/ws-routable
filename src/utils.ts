export function toAbsoluteURL(base: string, url: string): URL {
  try {
    const urlObject = new URL(url);
    return urlObject;
  } catch (err) {
    const urlObject = new URL(base);
    urlObject.pathname = urlObject.pathname.replace(/\/+$/, '') + url;
    return urlObject;
  }
}
