global.WebSocket = require('isomorphic-ws');
// eslint-disable-next-line @typescript-eslint/no-var-requires
global.crypto = require('crypto').webcrypto;

import { WebSocketServer } from 'ws';
import { SocketSession, WsRequest, WsRouter } from 'ws-routable';

type Example = {
  key: string;
  name: string;
};

function toAbsoluteURL(base: string, url: string): URL {
  try {
    const urlObject = new URL(url);
    return urlObject;
  } catch (err) {}

  let urlObject: URL | null = null;
  try {
    urlObject = new URL(base ?? 'http://localhost');
  } catch (err) {
    urlObject = new URL('http://localhost');
  }

  if (!urlObject) {
    throw new Error('toAbsoluteURL: Impossibly invalid base URL');
  }

  urlObject.pathname = urlObject.pathname.replace(/\/+$/, '') + url;
  return urlObject;
}

export const router = new WsRouter();
const examples: Example[] = [];

export type WsResponse = {
  status: number;
  statusText: string;
  body?: string;
};

router.get('/examples', () => {
  const res: WsResponse = {
    status: 200,
    statusText: 'OK',
    body: JSON.stringify(examples),
  };
  return res;
});

router.put('/examples/:exampleId', req => {
  console.log(`PUT /examples/${req.params.exampleId}`);
  const index = examples.findIndex(example => example.key === req.params.exampleId);
  const json = JSON.parse(req.body);
  json.key = req.params.exampleId;
  if (index >= 0) {
    examples[index] = json;
  } else {
    examples.push(json);
  }
  const res: WsResponse = {
    status: 200,
    statusText: 'OK',
  };
  return res;
});

router.get('/examples/:exampleId', req => {
  const example = examples.find(example => example.key === req.params.exampleId);
  const res: WsResponse = {
    status: 200,
    statusText: 'OK',
    body: example ? JSON.stringify(example) : undefined,
  };
  return res;
});

const wss = new WebSocketServer({ port: 8787 });
wss.on('connection', function connection(socket: WebSocket) {
  const session = new SocketSession<WsRequest, WsResponse>(socket);

  const ctx = { env: { user: 1 } };
  session.listen((req: any): Promise<any> => {
    req.url = toAbsoluteURL(socket.url, req.url).toString(); // Add this to higher level objectreq.url =
    return router.handle(req, ctx);
  });
});
