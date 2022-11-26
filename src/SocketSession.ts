import { Envelope, EnvelopeType } from './Envelope';
import { Executors } from './Executors';
import { WsRequest, WsResponse } from './types';
import { toAbsoluteURL } from './utils';
import { throwIfValidationErrors, RequestSchema, ResponseSchema } from './Validation';
import { WsRouter } from './WsRouter';

export type SocketLogger = {
  error(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
};

export class SocketSession<Ctx = any> {
  static timeout = 3000;
  #logger?: SocketLogger;
  #headers: Record<string, string>;
  #socket: WebSocket;
  #executors = new Executors();
  #abort: AbortController;

  constructor(socket: WebSocket, options: { headers?: Record<string, string>; logger?: Console } = {}) {
    if (!socket) {
      throw new Error('WebSocket must be provided');
    }

    this.#socket = socket;
    this.#headers = options.headers ?? {};
    this.#logger = options.logger;
    this.#abort = new AbortController();
    this.#socket.addEventListener('close', this.#handleClose, { signal: this.#abort.signal });
    this.#socket.addEventListener('error', this.#handleError, { signal: this.#abort.signal });
    this.#socket.addEventListener('message', this.#handleMessage, { signal: this.#abort.signal });
  }

  async open(): Promise<void> {
    // WebSocket.READY_STATE_OPEN
    if (this.#socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.#socket.addEventListener('open', this.#handleOpen, { signal: this.#abort.signal });

    return new Promise((resolve, reject) => {
      this.#executors.set('this', { resolve, reject, timeout: 30000 });
    });
  }

  async close() {
    return new Promise(resolve => {
      this.#socket.addEventListener(
        'close',
        () => {
          resolve(undefined);
          this.#abort.abort();
        },
        { signal: this.#abort.signal }
      );
      this.#socket.close();
    });
  }

  send(req: WsRequest, options: { timeout?: number } = {}): Promise<WsResponse> {
    throwIfValidationErrors(RequestSchema, req, 'Invalid Request');
    return this.open().then(() => {
      return new Promise((resolve, reject) => {
        req.url = toAbsoluteURL(this.#socket.url, req.url).toString();
        const envelope: Envelope = Envelope.wrapRequest(req);
        this.#executors.set(envelope.id, { resolve, reject, timeout: options.timeout ?? SocketSession.timeout });
        this.#socket.send(JSON.stringify(envelope));
      });
    });
  }

  listen(router: WsRouter<WsResponse, Ctx>, ctx?: Ctx) {
    const handler = this.#createHandleRequest(router, ctx);
    this.#socket.addEventListener('message', handler, { signal: this.#abort.signal });
  }

  #handleClose = (_event: CloseEvent) => {
    this.#logger?.log('close...');
  };

  #handleError = (event: Event) => {
    const errorEvent = event as ErrorEvent;
    const error = event.type === 'error' ? { error: errorEvent.error, message: errorEvent.message } : event;
    const executor = this.#executors.peek('this');
    if (executor) {
      executor.reject(error);
    }
  };

  #handleOpen = (_event: Event) => {
    const executor = this.#executors.peek('this');
    if (executor) {
      executor.resolve();
    }
  };

  #createHandleRequest = (router: WsRouter<WsResponse, Ctx>, context?: Ctx) => async (event: MessageEvent) => {
    try {
      const data = Envelope.parse(event.data, EnvelopeType.REQUEST);
      if (!data) {
        return;
      }
      const id = data.id;
      throwIfValidationErrors(RequestSchema, data.payload);

      const req: WsRequest = data.payload;
      req.headers = this.#headers;
      const res = await router.handle(req, context);
      const envelope = Envelope.wrapResponse(id, res ?? { status: 404, statusText: 'Not Found' });
      this.#socket.send(JSON.stringify(envelope));
    } catch (err) {
      console.error(err);
      this.#logger?.error(err);
    }
  };

  #handleMessage = async (event: MessageEvent) => {
    let executor;
    try {
      const data = Envelope.parse(event.data, EnvelopeType.RESPONSE);
      if (!data) {
        return;
      }
      const id = data.id;
      executor = this.#executors.get(id);

      throwIfValidationErrors(ResponseSchema, data.payload);
      executor?.resolve(data.payload);
    } catch (err) {
      this.#logger?.error(err);
      executor?.reject(err);
    }
  };
}
