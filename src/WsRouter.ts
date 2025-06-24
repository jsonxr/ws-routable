import { Router, type TContext } from './Router';
import type { WsRequest, WsResponse } from './types';

export class WsRouter<Res extends WsResponse, Ctx extends TContext> extends Router<WsRequest, Res, Ctx> {}
