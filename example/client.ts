global.WebSocket = require('isomorphic-ws');
global.crypto = require('crypto').webcrypto;

import { SocketSession, WsRouter } from 'ws-routable';

const router = new WsRouter<{ socket: SocketSession }>();
router.all('*', (req, ctx) => {
  console.log('all:', req);
});
router.get('/churches/:churchId', async req => {
  console.log('req:', req);
});

async function main() {
  const token = 'USER1'; // This is really an encoded token when implemented...
  const tenantId = 'TENANT1'; // This really should be a non-guessable id
  const webSocket = new WebSocket(`ws://127.0.0.1:8787/${tenantId}?authorization=${token}`);
  const socket = new SocketSession(webSocket);
  socket.listen(router, { socket });

  try {
    await socket.connect();
    console.log('connected...');
    const res1 = await socket.send({ method: 'PUT', url: '/churches/0002', body: JSON.stringify({ name: 'help' }) });
    console.log(res1);

    const res2 = await socket.send({ method: 'GET', url: '/churches/0002' });
    console.log('res:', res2);
    //await socket.close();
    //await socket.send({ method: 'GET', url: '/churches/0003' });
  } catch (err) {
    console.error('ERROR=======================================');
    console.error(err);
  }
  //session.close();
}

main();
