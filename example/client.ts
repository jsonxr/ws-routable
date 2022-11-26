global.WebSocket = require('isomorphic-ws');
// eslint-disable-next-line @typescript-eslint/no-var-requires
global.crypto = require('node:crypto').webcrypto;

import { SocketSession } from 'ws-routable';

async function main() {
  const webSocket = new WebSocket('ws://127.0.0.1:8787');
  const socket = new SocketSession(webSocket);

  try {
    await socket.open();

    await Promise.all(
      ['0001', '0002'].map(key =>
        socket.send({ method: 'PUT', url: `/examples/${key}`, body: JSON.stringify({ key, name: `name${key}` }) })
      )
    );

    const list = await socket.send({ method: 'GET', url: '/examples/' });
    console.log('GET /examples', list);

    const res = await socket.send({ method: 'GET', url: '/examples/0002' });
    console.log('GET /examples/0002', res);

    socket.close();
  } catch (err) {
    console.error(err);
  }
}

main();
