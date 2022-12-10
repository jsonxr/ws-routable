import { ulidFactory } from 'ulid-workers';
import { assert } from './assert';
import { Envelope, EnvelopeType } from './Envelope';
import { Executors } from './Executors';
import { stringifyCloseEvent, stringifyMessageEvent } from './utils';

const ulid = ulidFactory();

export type Listener = <T>(payload: any) => Promise<T>;

export type Logger = {
  info(...data: any[]): void;
  debug(...data: any[]): void;
  log(...data: any[]): void;
  error(...data: any[]): void;
  warn(...data: any[]): void;
};

const OPEN_EXECUTOR = 'OPEN';
const CLOSE_EXECUTOR = 'CLOSE';

export const SocketSessionState = {
  CLOSED: 'CLOSED',
  CLOSING: 'CLOSING',
  CONNECTING: 'CONNECTING',
  OPEN: 'OPEN',
  UNKNOWN: 'UNKNOWN',
} as const;
export type SocketSessionState = keyof typeof SocketSessionState;

export const getSessionStateFromSocket = (readyState: number) => {
  switch (readyState) {
    case WebSocket.CLOSED:
      return SocketSessionState.CLOSED;
    case WebSocket.OPEN:
      return SocketSessionState.OPEN;
    case WebSocket.CONNECTING:
      return SocketSessionState.CONNECTING;
    case WebSocket.CLOSING:
      return SocketSessionState.CLOSING;
  }
  return SocketSessionState.UNKNOWN;
};

export class SocketSession<Req extends object = any, Res extends object = any> {
  timeout = 3000;
  #id: string;
  #logger: Logger | null;
  #socket: WebSocket;
  #executors = new Executors();
  #abort: AbortController;
  #listener?: Listener;
  #state: SocketSessionState;

  constructor(socket: WebSocket, options: { logger?: Logger } = {}) {
    this.#logger = options.logger ?? null;
    this.#id = ulid(); // shortUlid();
    assert(socket, 'SocketSession.constructor: socket must be provided');
    this.#logger?.debug(`SocketSession_${this.#id} = new SocketSession(${socket.url})`);
    this.#socket = socket;
    this.#state = getSessionStateFromSocket(socket.readyState);
    this.#abort = new AbortController();
    this.#socket.addEventListener('open', this.#handleSocketOpen, { signal: this.#abort.signal });
    this.#socket.addEventListener('close', this.#handleSocketClose, { signal: this.#abort.signal });
    this.#socket.addEventListener('message', this.#handleMessage, { signal: this.#abort.signal });
    this.#socket.addEventListener('error', this.#handleSocketError, { signal: this.#abort.signal });
  }

  async open(): Promise<void> {
    this.#logger?.debug(`SocketSession_${this.#id}.open()`);

    // WebSocket.READY_STATE_OPEN
    if (this.#socket.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.#executors.set(OPEN_EXECUTOR, { resolve, reject, timeout: this.timeout });
    });
  }

  async close() {
    assert(this.#socket);

    this.#logger?.debug(`SocketSession_${this.#id}.close()`);
    if (this.#socket.readyState === WebSocket.CLOSED) {
      return;
    }

    if (this.#executors.size) {
      const keys = [...this.#executors.keys()];
      this.#logger?.warn(`SocketSession: requests ${keys} are still waiting for a response`);
    }

    return new Promise((resolve, reject) => {
      this.#executors.set(CLOSE_EXECUTOR, { resolve, reject, timeout: this.timeout });
      this.#socket.close();
    });
  }

  send(req: Req, options: { timeout?: number } = {}): Promise<Res> {
    assert(req);
    assert(typeof options === 'object');
    this.#logger?.debug(`SocketSession_${this.#id}.send(${JSON.stringify(req)})`);

    return new Promise((resolve, reject) => {
      //TODO: req.url = toAbsoluteURL(this.#socket.url, req.url).toString(); // Add this to higher level object
      const envelope: Envelope = Envelope.wrapRequest(req);
      this.#executors.set(envelope.id, { resolve, reject, timeout: options.timeout ?? this.timeout });
      this.#socket.send(JSON.stringify(envelope));
    });
  }

  get state(): SocketSessionState {
    return this.#state;
  }

  //----------------------------------------------------------------------------
  // Handle Incoming Messages
  //----------------------------------------------------------------------------

  /**
   * If we are acting as a server, we need to respond to requests
   * @param listener
   */
  listen(listener: Listener) {
    assert(typeof listener === 'function');
    this.#logger?.debug(`SocketSession_${this.#id}.listen(listener)`);

    this.#listener = listener;
    // const handler = this.#createHandleRequest(listener);
    // this.#socket.addEventListener('message', handler, { signal: this.#abort.signal });
  }

  //----------------------------------------------------------------------------
  // Handle WebSocket messages
  //----------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  #handleSocketOpen = (_event: Event) => {
    this.#logger?.debug(`SocketSession_${this.#id}.#handleSocketOpen()`);

    this.#state = getSessionStateFromSocket(this.#socket?.readyState);
    const executor = this.#executors.peek(OPEN_EXECUTOR);
    if (executor) {
      executor.resolve();
      this.#executors.delete(OPEN_EXECUTOR);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  #handleSocketClose = (event: CloseEvent) => {
    assert(typeof event === 'object');
    this.#logger?.debug(`SocketSession_${this.#id}.#handleSocketClose(${stringifyCloseEvent(event)})`);

    this.#state = getSessionStateFromSocket(this.#socket?.readyState);

    // If we are awaiting an open, reject the open promise
    const executor = this.#executors.peek(OPEN_EXECUTOR);
    if (executor) {
      const error = { code: event.code, reason: event.reason };
      executor.reject(error);
      this.#executors.delete(OPEN_EXECUTOR);
    }

    // If we are awaiting a close, exeucte it
    if (event.wasClean) {
      const closeExecutor = this.#executors.peek(CLOSE_EXECUTOR);
      if (closeExecutor) {
        closeExecutor.resolve();
        this.#executors.delete(CLOSE_EXECUTOR);
      }
      return;
    }
  };

  #handleSocketError = (event: Event) => {
    assert(typeof event === 'object');
    this.#logger?.debug(`SocketSession_${this.#id}.#handleSocketError(${JSON.stringify(event)})`);

    this.#state = getSessionStateFromSocket(this.#socket?.readyState);
  };

  /**
   * Handles message received from socket by routing to appropriate method
   * @param event
   * @returns
   */
  #handleMessage = async (event: MessageEvent) => {
    assert(typeof event === 'object');
    this.#logger?.debug(`SocketSession_${this.#id}.#handleMessage(${stringifyMessageEvent(event)})`);

    try {
      const envelope = Envelope.parse(event.data);
      switch (envelope?.type) {
        // The "client" asked us for something
        case EnvelopeType.REQUEST: {
          return this.#handleRequest(envelope);
        }
        // The "server" sent a response to our request
        case EnvelopeType.RESPONSE: {
          return this.#handleResponse(envelope);
        }
        // The "server" sent an error in response to our request
        case EnvelopeType.ERROR: {
          return this.#handleError(envelope);
        }
      }
    } catch (err) {
      //TODO: Should we just eat errors so rogue clients can't swamp us with crap? Or do we prevent this at the connection level?
      this.#logger?.error(err);
    }
  };

  //----------------------------------------------------------------------------
  // Handle Request, Response, Error
  //----------------------------------------------------------------------------

  /**
   * Process incoming message as a request
   * @param envelope Incoming request
   */
  #handleRequest = async (envelope: Envelope) => {
    assert(typeof envelope === 'object');
    assert(envelope.type === EnvelopeType.REQUEST);
    this.#logger?.debug(`SocketSession_${this.#id}.#handleRequest(${JSON.stringify(envelope)})`);

    // We aren't listening for requests, so just drop
    if (!this.#listener) {
      return;
    }

    const id = envelope.id; // Save the id so we can send it back with our response or error
    let responseEnvelope;
    try {
      //throwIfValidationErrors(RequestSchema, envelope.payload);
      const res = await this.#listener?.(envelope.payload);
      responseEnvelope = Envelope.wrapResponse(id, res);
    } catch (err) {
      responseEnvelope = Envelope.wrapError(id, err);
    }
    this.#socket.send(JSON.stringify(responseEnvelope));
  };

  /**
   * Process incoming message as a response
   * @param envelope
   */
  #handleResponse = async (envelope: Envelope) => {
    assert(typeof envelope === 'object');
    assert(envelope.type === EnvelopeType.RESPONSE);
    this.#logger?.debug(`SocketSession_${this.#id}.#handleResponse(${JSON.stringify(envelope)})`);

    const id = envelope.id;
    const executor = this.#executors.get(id);
    executor?.resolve(envelope.payload);
    // try {
    // } catch (err) {
    //   executor?.reject(err);
    // }
  };

  /**
   * Process incoming message as an error
   * @param envelope
   */
  #handleError = async (envelope: Envelope) => {
    assert(typeof envelope === 'object');
    assert(envelope.type === EnvelopeType.ERROR);
    this.#logger?.debug(`SocketSession_${this.#id}.#handleError(${JSON.stringify(envelope)})`);

    const id = envelope.id;
    const executor = this.#executors.get(id);
    executor?.reject(envelope.payload);
    // try {
    // } catch (err) {
    //   executor?.reject(err);
    // }
  };
}
