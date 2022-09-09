import { validate } from 'jtd';
import { ulidFactory } from 'ulid-workers';
import {
  WsEnvelope,
  WsEnvelopeSchema,
  WsRequest,
  WsRequestSchema,
  WsResponse,
  WsResponseSchema,
  WsRouter,
} from './WsRouter';

const ulid = ulidFactory();

type Resolver = (value?: void | PromiseLike<void> | any) => void;
type Rejector = (reason?: any) => void;
type Executor = {
  resolve: Resolver;
  reject: Rejector;
};

export class SocketSession {
  private socket: WebSocket;
  private executors = new Map<string, Executor>();
  private abort: AbortController;

  constructor(socket: WebSocket) {
    if (!socket) {
      throw new Error('WebSocket must be provided');
    }

    this.socket = socket;
    this.abort = new AbortController();
    this.socket.addEventListener('close', this.handleClose, { signal: this.abort.signal });
    this.socket.addEventListener('error', this.handleError, { signal: this.abort.signal });
  }

  async connect(): Promise<void> {
    // WebSocket.READY_STATE_OPEN
    if (this.socket?.readyState === 1) {
      return;
    }

    this.socket.addEventListener('open', this.handleOpen, { signal: this.abort.signal });

    return new Promise((resolve, reject) => {
      this.executors.set('this', { resolve, reject });
    });
  }

  async send(req: Omit<WsRequest, 'id' | 'params' | 'query'>): Promise<WsResponse> {
    return new Promise((resolve, reject) => {
      // if (!this.socket) {
      //   reject(new Error('SocketSession: Socket is closed'));
      //   return;
      // }

      const id = ulid();
      const envelope: WsEnvelope = {
        id,
        type: 'REQUEST',
        payload: req,
      };
      this.executors.set(id, { resolve, reject });
      this.socket?.send(JSON.stringify(envelope));
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

  private handleClose = (event: CloseEvent) => {};

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
    const handler = this.createListener(router, ctx);
    this.socket?.addEventListener('message', handler, { signal: this.abort.signal });
  }

  private createListener = <Ctx = any>(router: WsRouter<Ctx>, context?: Ctx) => {
    function parse(event: MessageEvent): WsEnvelope | undefined {
      try {
        if (typeof event.data !== 'string') {
          throw new Error('event.data is not a string');
        }

        const data: WsEnvelope = JSON.parse(event.data);
        const errors = validate(WsEnvelopeSchema, data);
        if (errors.length) {
          console.error('failed validation...');
          console.error(errors);
          // Should we abort this websocket and fail permanently?
          throw new Error('Invalid message received.');
        }
        return data;
      } catch (err) {
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        if (err instanceof Error) {
          console.error(err.message);
        } else {
          console.error(`${err}`);
        }
      }
      return undefined;
    }

    const handleMessage = async (event: MessageEvent) => {
      const data = parse(event);
      if (!data) {
        console.error('non conforming envelope received', data);
        return;
      }

      const id = data.id;
      switch (data.type) {
        case 'REQUEST': {
          // Handle with a router...
          const errors = validate(WsRequestSchema, data.payload);
          if (errors.length) {
            console.error('ignoring, non-conforming request');
            return;
          }

          const req: WsRequest = data.payload;
          const request: WsRequest = {
            ...req,
            url: req.url,
          };

          const res = (await router?.handle(request, context!)) ?? { status: 404, statusText: 'Not Found' };
          const envelope: WsEnvelope = {
            id,
            type: 'RESPONSE',
            payload: res,
          };

          this.socket?.send(JSON.stringify(envelope));
          return;
        }
        case 'RESPONSE': {
          const executors = this.executors.get(id);

          const errors = validate(WsResponseSchema, data.payload);
          if (errors.length) {
            console.error('ignoring, non-conforming response');
            console.error(errors);
            executors?.reject(errors);
            return;
          }

          const res: WsResponse = data.payload;
          executors?.resolve(res);
          return;
        }
      }
    };
    return handleMessage;
  };
}
