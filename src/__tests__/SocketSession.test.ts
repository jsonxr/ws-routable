import WS from 'jest-websocket-mock';

import { getSessionStateFromSocket, Logger, SocketSession, SocketSessionState } from '../SocketSession';
import { Envelope, EnvelopeType } from '../Envelope';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const create = async () => {
  const server = new WS(URL);
  const client = new WebSocket(URL);
  const socket = new SocketSession(client);
  await socket.open();
  return {
    server,
    client,
    socket,
  };
};

const createLogger = (): Logger => ({
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
});

const respond = async (server: WS, body: any) => {
  const str: any = await server.nextMessage;
  const message: any = JSON.parse(str);
  const id = message.id;
  const envelope: Envelope = Envelope.wrapResponse(id, {
    status: 200,
    statusText: 'Ok',
    body,
  });
  server.send(JSON.stringify(envelope));
};

const URL = 'ws://localhost:1234';
describe('SocketSession', () => {
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

  describe('open', () => {
    it('should reject if can not open', async () => {
      const server = new WS(URL);
      const client = new WebSocket(URL);
      const socket = new SocketSession(client);
      const promise = socket.open();
      server.error({ code: 3000, reason: 'test', wasClean: false }); // code doesn't matter
      await expect(promise).rejects.toEqual({ code: 3000, reason: 'test' });
      socket.close();
    });
    it('should return immediately if websocket is already open', async () => {
      const server = new WS(URL);
      const client = new WebSocket(URL);
      await server.connected;

      const socket = new SocketSession(client);
      await socket.open();
      expect(socket.state).toEqual(SocketSessionState.OPEN);
    });
  });

  // describe('event listeners', () => {
  //   it('should handle errors', async () => {
  //     const { server, socket } = await create();
  //     server.error();
  //   });
  // });

  describe('send', () => {
    it('should resolve with a response', async () => {
      const { server, socket } = await create();
      // Should NOT await send because it will block forever while we wait for the response that is sent on the next line...
      const promise = socket.send(42);
      await respond(server, 'hi!');
      const res1 = await promise;
      expect(res1.body).toBeDefined();
      expect(res1.body).toEqual('hi!');
    });

    it('should allow sending of a number', async () => {
      const { server, socket } = await create();
      socket.send(42);
      await respond(server, 'ok');
      socket.close();
    });

    it('should allow sending of a string', async () => {
      const { server, socket } = await create();
      socket.send('42');
      await respond(server, 'yep');
      socket.close();
    });

    it('should allow sending of an object', async () => {
      const { server, socket } = await create();
      socket.send({ value: '42' });
      await respond(server, 'yes');
      socket.close();
    });

    it('should reject if server returns error', async () => {
      const { server, socket } = await create();
      const fn = jest.fn();
      socket.listen(fn);
      const promise = socket.send({ hello: 'world' });

      await delay(10);
      expect(server.messagesToConsume.pendingItems.length).toEqual(1);
      const msg: any = await server.nextMessage;
      const req = Envelope.parse(msg);
      if (req) {
        const id = req.id;
        server.send(JSON.stringify(Envelope.wrapError(id, 'Oops')));
      }
      expect(promise).rejects.toEqual('Oops');
    });
  });

  describe('close', () => {
    it('should close', async () => {
      const { client, socket } = await create();
      expect(client.readyState).toEqual(WebSocket.OPEN);
      await socket.close();
      expect(client.readyState).toEqual(WebSocket.CLOSED);
    });

    it('should log a warning if we close before our promises have resolved', async () => {
      const server = new WS(URL);
      const client = new WebSocket(URL);
      const logger = createLogger();
      const socket = new SocketSession(client, { logger });
      await socket.open();
      socket.send(42);

      socket.close();
      expect(logger.warn).toBeCalledWith(expect.stringContaining('SocketSession: requests'));
      await respond(server, 'ok'); // Don't make us timeout
    });
  });

  describe('listen', () => {
    it('should send a response if we are listening', async () => {
      const { server, socket } = await create();
      const fn = jest.fn();
      socket.listen(fn);
      const payload = { method: 'GET', url: 'http://localhost/test' };
      server.send(JSON.stringify(Envelope.wrapRequest(payload)));

      // Make certain that the client sent a message
      await delay(10);
      expect(server.messagesToConsume.pendingItems.length).toEqual(1);

      // Make sure we sent a message back to the server
      const next: any = await server.nextMessage;
      const res = JSON.parse(next);
      expect(res.type).toEqual(EnvelopeType.RESPONSE);

      // Did it call our listener?
      expect(fn).toHaveBeenCalledWith(payload);
    });

    it("should ignore all requests if we aren't listening", async () => {
      const { server } = await create();
      const payload = { method: 'GET', url: 'http://localhost/test' };
      server.send(JSON.stringify(Envelope.wrapRequest(payload)));

      // Make certain that the client didn't send a message
      await delay(100);
      expect(server.messagesToConsume.pendingItems.length).toEqual(0);
    });

    it('should not respond to a respone when listening', async () => {
      const { server, socket } = await create();
      const fn = jest.fn();
      socket.listen(fn);
      const payload = { method: 'GET', url: 'http://localhost/test' };
      server.send(JSON.stringify(Envelope.wrapResponse('1', payload)));
      expect(fn).not.toHaveBeenCalled();
    });

    it('should send an ERROR if the listener throws an error', async () => {
      const server = new WS(URL);
      const client = new WebSocket(URL);
      const logger = createLogger();
      const socket = new SocketSession(client, { logger });
      socket.listen(() => {
        throw Error('Error');
      });

      const envelope = Envelope.wrapRequest(42);
      server.send(JSON.stringify(envelope));

      await delay(10); // Let the socket have time to send the mock an error response
      expect(server.messagesToConsume.pendingItems.length).toBeGreaterThan(0);
      const str: any = await server.nextMessage;
      const res = JSON.parse(str);
      expect(res.type).toEqual(EnvelopeType.ERROR);
    });
  });

  describe('#handleMessage', () => {
    it('should log an error if the server does not send us an Envelope', async () => {
      const server = new WS(URL);
      const client = new WebSocket(URL);
      const logger = createLogger();
      const socket = new SocketSession(client, { logger });
      const promise = socket.send(42, { timeout: 1000 });

      server.send('garbage message');
      await expect(promise).rejects.toEqual(new Error('TIMEOUT'));
      expect(logger.error).toHaveBeenCalledWith(new SyntaxError('Unexpected token g in JSON at position 0'));
    });
  });
});

describe('getSessionStateFromSocket', () => {
  it('should return correct values when sent the readyState of a socket', () => {
    expect(getSessionStateFromSocket(-1)).toEqual(SocketSessionState.UNKNOWN);
    expect(getSessionStateFromSocket(WebSocket.CLOSED)).toEqual(SocketSessionState.CLOSED);
    expect(getSessionStateFromSocket(WebSocket.CLOSING)).toEqual(SocketSessionState.CLOSING);
    expect(getSessionStateFromSocket(WebSocket.CONNECTING)).toEqual(SocketSessionState.CONNECTING);
    expect(getSessionStateFromSocket(WebSocket.OPEN)).toEqual(SocketSessionState.OPEN);
  });
});
