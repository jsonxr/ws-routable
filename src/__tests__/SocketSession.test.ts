import WS from 'jest-websocket-mock';

import { SocketSession } from '../SocketSession';
import { Envelope, EnvelopeType } from '../Envelope';

async function create() {
  const server = new WS(URL);
  const client = new WebSocket(URL);
  const socket = new SocketSession(client);
  await socket.open();
  return {
    server,
    client,
    socket,
  };
}

async function respond(server: WS, body: any) {
  const str: any = await server.nextMessage;
  const message: any = JSON.parse(str);
  const id = message.id;
  const envelope: Envelope = Envelope.wrapResponse(id, {
    status: 200,
    statusText: 'Ok',
    body,
  });
  server.send(JSON.stringify(envelope));
}

const URL = 'ws://localhost:1234';
describe.only('SocketSession', () => {
  afterEach(() => {
    WS.clean();
  });

  describe('constructor', () => {
    it('constructor', async () => {
      new WS(URL);
      const client = new WebSocket('ws://localhost'); // Intentionaly bad url
      const socket = new SocketSession(client);
      expect(socket).toBeDefined();
    });

    it('constructor should throw an error if sockeet is falsey', async () => {
      expect(() => {
        new SocketSession(undefined as any);
      }).toThrowError();
    });
  });

  it('should resolve with a WsResponse', async () => {
    const { server, socket } = await create();
    // Should NOT await send because it will block forever while we wait for the response that is sent on the next line...
    const promise = socket.send({ method: 'PUT', url: '/examples/0002', body: JSON.stringify({ name: 'help' }) });
    await respond(server, 'hi!');
    const res1 = await promise;
    expect(res1.body).toBeDefined();
    expect(res1.body).toEqual('hi!');
  });

  it('should throw an error if invalid send request', async () => {
    const { socket } = await create();
    expect(() => socket.send({ fake: 'fake' } as any)).toThrowError('Invalid Request');
  });

  it('should reject with a bad server response with an invalid payload', async () => {
    const { server, socket } = await create();
    // Should NOT await send because it will block forever while we wait for the response that is sent on the next line...
    const promise = socket.send({ method: 'PUT', url: '/examples/0002', body: JSON.stringify({ name: 'help' }) });

    // Server responds with an invalid envelope but correct id...
    const str: any = await server.nextMessage;
    const message: any = JSON.parse(str);
    const id = message.id;
    const envelope: Envelope = {
      id,
      type: EnvelopeType.RESPONSE,
      payload: { fake: 'fake' },
    };
    server.send(JSON.stringify(envelope));

    await expect(promise).rejects.toThrowError('Payload is non conforming');
  });

  it('should close', async () => {
    const { client, socket } = await create();
    expect(client.readyState).toEqual(WebSocket.OPEN);
    await socket.close();
    expect(client.readyState).toEqual(WebSocket.CLOSED);
  });

  it('should listen', async () => {
    const { server, socket } = await create();
    const fn = jest.fn();
    //TODO: Add this to a higher level object...
    // const router = new WsRouter();
    // router.all('*', fn);
    socket.listen(fn);

    server.send(JSON.stringify(Envelope.wrapRequest({ method: 'GET', url: 'http://localhost/test' })));

    expect(fn).toHaveBeenCalledWith({
      method: 'GET',
      url: 'http://localhost/test',
    });
  });
});
