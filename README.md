# ws-routable

Provides a routable WebSocket Session which enables the ability to send requests and receive responses that can be
routed similar to express.

![Badge](https://github.com/jsonxr/ws-routable/actions/workflows/test.yml/badge.svg)

Client

```typescript
import { SocketSession } from 'ws-routable';
async function main() {
  const webSocket = new WebSocket('ws://127.0.0.1:8787');
  const socket = new SocketSession(webSocket);

  await socket.open();
  const res = await socket.send({ method: 'GET', url: '/examples/1' });
  console.log(res);
  socket.close();
}
```

Server

```typescript
import { WebSocketServer } from 'ws';
import { SocketSession, WsRouter } from 'ws-routable';

export const router = new WsRouter();
router.get('/examples/:exampleId', (req, ctx) => ({
  status: 200,
  statusText: 'OK',
  body: JSON.stringify({ user: ctx.user, exampleId: req.params.exampleId }),
}));

const wss = new WebSocketServer({ port: 8787 });
wss.on('connection', function connection(socket: WebSocket) {
  const session = new SocketSession(socket);
  const ctx = { user: 'The User' }; // Get this from socket.url via a json token
  session.listen(router, ctx);
});
```

## Use in Node

If using inside node, this needs to be before the import of ws-routable

```js
global.WebSocket = require('isomorphic-ws');
global.crypto = require('crypto').webcrypto;
```

# Development

- Requires Node 18
