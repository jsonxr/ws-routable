global.WebSocket = require('isomorphic-ws');
// eslint-disable-next-line @typescript-eslint/no-var-requires
global.crypto = require('crypto').webcrypto;

import { WebSocketServer } from 'ws';
import { SocketSession, WsRouter } from 'ws-routable';

export const router = new WsRouter();
const examples = new Map<string, unknown>();

export type WsResponse = {
  status: number;
  statusText: string;
  body?: string;
};

router.put('/examples/:exampleId', (req, ctx) => {
  console.log(`PUT /examples/${req.params.exampleId}`);
  const json = JSON.parse(req.body);
  const example = { ...json, user: ctx.user };
  examples.set(req.params.exampleId, example);
  const res: WsResponse = {
    status: 200,
    statusText: 'OK',
  };
  console.log('sending...', res);
  return res;
});

router.get('/examples/:exampleId', req => {
  console.log(`GET /examples/${req.params.exampleId}`);
  const example = examples.get(req.params.exampleId);
  const res: WsResponse = {
    status: 200,
    statusText: 'OK',
    body: JSON.stringify(example),
  };
  console.log('sending...', res);
  return res;
});

const wss = new WebSocketServer({ port: 8787 });
wss.on('connection', function connection(socket: WebSocket) {
  const session = new SocketSession(socket);
  const ctx = { env: { user: 1 } };
  session.listen(router, ctx);
});
