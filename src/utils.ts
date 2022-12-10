const BASE = 'http://localhost';

export const logSocketState = (state: number) => {
  switch (state) {
    case WebSocket.CLOSED:
      return 'CLOSED';
    case WebSocket.CLOSING:
      return 'CLOSING';
    case WebSocket.CONNECTING:
      return 'CONNECTING';
    case WebSocket.OPEN:
      return 'OPEN';
    default:
      return 'UNKNOWN';
  }
};

export const pick = <T, P extends keyof T>(object: T, keys: P[]): Pick<T, P> => {
  const result: any = {};
  for (const p of keys) {
    result[p] = object[p];
  }
  return result;
};

export const stringifyMessageEvent = (event: MessageEvent): string => {
  return JSON.stringify(pick(event, ['type', 'timeStamp', 'data', 'origin']));
};

export const stringifyCloseEvent = (event: CloseEvent): string => {
  return JSON.stringify(pick(event, ['type', 'timeStamp', 'code', 'wasClean', 'reason']));
};

export const toAbsoluteURL = (base: string, url: string): URL => {
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
};
