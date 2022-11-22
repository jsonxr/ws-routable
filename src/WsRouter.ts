import { Router, RouterOptions } from './Router';
import { WsRequest, WsResponse } from './types';

export type WsRouterOptions<Res extends WsResponse = WsResponse, T = any> = RouterOptions<WsRequest, Res, T>;

export class WsRouter<Res extends WsResponse = WsResponse, T = any> extends Router<WsRequest, Res, T> {
  constructor(options?: WsRouterOptions<Res, T>) {
    super(options);
  }
}
