import { Router, TContext } from './Router';
import { WsRequest, WsResponse } from './types';

export class WsRouter<Res extends WsResponse, Ctx extends TContext> extends Router<WsRequest, Res, Ctx> {}
