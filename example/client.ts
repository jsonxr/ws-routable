global.WebSocket = require('isomorphic-ws');
// eslint-disable-next-line @typescript-eslint/no-var-requires
global.crypto = require('node:crypto').webcrypto;

import { SocketSession } from 'ws-routable';

async function main() {
  const webSocket = new WebSocket('ws://127.0.0.1:8787');
  const socket = new SocketSession(webSocket);

  try {
    await socket.open();
    console.log('connected...');
    await socket.send({ method: 'PUT', url: '/examples/0002', body: JSON.stringify({ name: 'help' }) });

    const res2 = await socket.send({ method: 'GET', url: '/examples/0002' });
    console.log(res2);
    socket.close();
  } catch (err) {
    console.error('ERROR=======================================');
    console.error(err);
  }
}

main();
