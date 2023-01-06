# ws-routable

Provides a routable WebSocket Session which enables the ability to send requests and receive responses that can be
routed similar to express.

![Badge](https://github.com/jsonxr/ws-routable/actions/workflows/cicd.yml/badge.svg)
[![CodeFactor](https://www.codefactor.io/repository/github/jsonxr/ws-routable/badge)](https://www.codefactor.io/repository/github/jsonxr/ws-routable)
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/jsonxr/ws-routable.svg)](http://isitmaintained.com/project/jsonxr/ws-routable "Average time to resolve an issue")
[![Percentage of issues still open](http://isitmaintained.com/badge/open/jsonxr/ws-routable.svg)](http://isitmaintained.com/project/jsonxr/ws-routable "Percentage of issues still open")

## Client

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

## Server

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

```sh
brew install fnm
brew install direnv
```

Requires Node 18
