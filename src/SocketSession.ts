import { Schema, validate } from 'jtd';
import { ulidFactory } from 'ulid-workers';
import {
  WsEnvelope,
  WsEnvelopeSchema,
  WsRequest,
  WsRequestSchema,
  WsResponse,
  WsResponseSchema,
  WsRouter,
  ValidationErrors,
} from './WsRouter';

const ulid = ulidFactory();

type Resolver = (value?: void | PromiseLike<void> | any) => void;
type Rejector = (reason?: any) => void;
type Executor = {
  resolve: Resolver;
  reject: Rejector;
};

function validateData(schema: Schema, data: any, errorMessage: string = 'Payload is non conforming') {
  const errors = validate(schema, data);
  if (errors.length) {
    throw new ValidationErrors(errorMessage, errors);
  }
}

function parse(event: MessageEvent, type: 'REQUEST' | 'RESPONSE'): WsEnvelope | undefined {
  if (typeof event.data !== 'string') {
    throw new Error('event.data is not a string');
  }

  const data: WsEnvelope = JSON.parse(event.data);
  // Abort early if this isn't the type we are listening for...
  if (data.type !== type) {
    return;
  }

  validateData(WsEnvelopeSchema, data, 'Envelope is non conforming');

  return data;
}

export class SocketSession {
  private logger?: Console;
  private socket: WebSocket;
  private executors = new Map<string, Executor>();
  private abort: AbortController;

  constructor(socket: WebSocket, logger?: Console) {
    if (!socket) {
      throw new Error('WebSocket must be provided');
    }

    this.socket = socket;
    this.logger = logger;
    this.abort = new AbortController();
    this.socket.addEventListener('close', this.handleClose, { signal: this.abort.signal });
    this.socket.addEventListener('error', this.handleError, { signal: this.abort.signal });
    this.socket.addEventListener('message', this.handleResponse, { signal: this.abort.signal });
  }

  async connect(): Promise<void> {
    // WebSocket.READY_STATE_OPEN
    if (this.socket.readyState === 1) {
      return;
    }

    this.socket.addEventListener('open', this.handleOpen, { signal: this.abort.signal });

    return new Promise((resolve, reject) => {
      this.executors.set('this', { resolve, reject });
    });
  }

  async send(req: Omit<WsRequest, 'id' | 'params' | 'query'>): Promise<WsResponse> {
    return new Promise((resolve, reject) => {
      const id = ulid();
      const envelope: WsEnvelope = {
        id,
        type: 'REQUEST',
        payload: req,
      };
      this.executors.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(envelope));
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('SocketSession: Socket is closed'));
        return;
      }

      this.socket.addEventListener(
        'close',
        () => {
          resolve(undefined);
          this.abort.abort();
        },
        { signal: this.abort.signal }
      );
      this.socket.close();
    });
  }

  private handleClose = (event: CloseEvent) => {
    this.logger?.log('close...');
  };

  private handleError = (event: Event) => {
    const executor = this.executors.get('this');
    if (event.type === 'error') {
      const error: ErrorEvent = event as ErrorEvent;
      executor?.reject({ error: error.error, message: error.message });
    }
    executor?.reject(event);
    this.executors.delete('this');
  };

  private handleOpen = (event: Event) => {
    const executor = this.executors.get('this');
    executor?.resolve();
    this.executors.delete('this');
  };

  //----------------------------------------------------------------------------
  // Listener and Router
  //----------------------------------------------------------------------------

  async listen<Ctx = any>(router: WsRouter<Ctx>, ctx?: Ctx) {
    const handler = this.createHandleRequest(router, ctx);
    this.socket.addEventListener('message', handler, { signal: this.abort.signal });
  }

  private handleResponse = async (event: MessageEvent) => {
    let executor;
    try {
      const data = parse(event, 'RESPONSE');
      if (!data) {
        return;
      }
      const id = data.id;
      executor = this.executors.get(id);

      validateData(WsResponseSchema, data.payload);
      executor?.resolve(data.payload);
    } catch (err) {
      this.logger?.error(err);
      executor?.reject(err);
    }
  };

  private createHandleRequest =
    <Ctx = any>(router: WsRouter, context?: Ctx) =>
    async (event: MessageEvent) => {
      try {
        const data = parse(event, 'REQUEST');
        if (!data) {
          return;
        }
        const id = data.id;
        validateData(WsRequestSchema, data.payload);

        const req: WsRequest = data.payload;
        const res = (await router?.handle(req, context!)) ?? { status: 404, statusText: 'Not Found' };
        const envelope: WsEnvelope = {
          id,
          type: 'RESPONSE',
          payload: res,
        };
        this.socket.send(JSON.stringify(envelope));
      } catch (err) {
        this.logger?.error(err);
      }
    };
}
