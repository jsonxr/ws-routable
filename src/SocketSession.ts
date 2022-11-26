import { Envelope, EnvelopeType } from './Envelope';
import { Executors } from './Executors';
import { throwIfValidationErrors, RequestSchema, ResponseSchema } from './Validation';

export type Listener = <T>(req: any) => Promise<T>;

export type SocketLogger = {
  error(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
};

export class SocketSession<Req extends object = any, Res extends object = any> {
  timeout = 3000;
  #logger?: SocketLogger;
  #socket: WebSocket;
  #executors = new Executors();
  #abort: AbortController;

  constructor(socket: WebSocket, options: { logger?: Console } = {}) {
    if (!socket) {
      throw new Error('WebSocket must be provided');
    }

    this.#socket = socket;
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
      this.#executors.set('this', { resolve, reject, timeout: this.timeout });
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

  send(req: Req, options: { timeout?: number } = {}): Promise<Res> {
    throwIfValidationErrors(RequestSchema, req, 'Invalid Request');
    return this.open().then(() => {
      return new Promise((resolve, reject) => {
        //TODO: req.url = toAbsoluteURL(this.#socket.url, req.url).toString(); // Add this to higher level object
        const envelope: Envelope = Envelope.wrapRequest(req);
        this.#executors.set(envelope.id, { resolve, reject, timeout: options.timeout ?? this.timeout });
        this.#socket.send(JSON.stringify(envelope));
      });
    });
  }

  listen(listener: Listener) {
    const handler = this.#createHandleRequest(listener);
    this.#socket.addEventListener('message', handler, { signal: this.#abort.signal });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  #handleOpen = (_event: Event) => {
    const executor = this.#executors.peek('this');
    if (executor) {
      executor.resolve();
    }
  };

  #createHandleRequest = (listener: Listener) => async (event: MessageEvent) => {
    try {
      const data = Envelope.parse(event.data, EnvelopeType.REQUEST);
      if (!data) {
        return;
      }
      const id = data.id;
      throwIfValidationErrors(RequestSchema, data.payload);
      //TODO: req.headers = this.#headers; // Add this to a higher level object...
      const res = await listener(data.payload);
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
