import { Schema } from 'jtd';
import { Router, Method, RouterOptions, Methods } from './Router';

export interface WsRequest {
  url: string;
  method: Method;
  body?: any;
  query: {
    [k: string]: string;
  };
  params: {
    [k: string]: string;
  };
}

export const WsRequestSchema: Schema = {
  properties: {
    url: { type: 'string' },
    method: { enum: Methods },
  },
  optionalProperties: {
    body: {},
  },
};

export interface WsResponse {
  status: number;
  statusText: string;
  body?: any;
}

export const WsResponseSchema: Schema = {
  properties: {
    status: { type: 'uint32' },
    statusText: { type: 'string' },
  },
  optionalProperties: {
    body: {},
  },
};

export interface WsEnvelope {
  id: string;
  type: 'REQUEST' | 'RESPONSE';
  payload: any;
}

export const WsEnvelopeSchema: Schema = {
  properties: {
    id: { type: 'string' },
    type: { enum: ['REQUEST', 'RESPONSE'] },
    payload: { nullable: false },
  },
};

export type WsRouterOptions<T = any> = RouterOptions<WsRequest, WsResponse, T>;

export class WsRouter<T = any> extends Router<WsRequest, WsResponse, T> {
  constructor(options?: WsRouterOptions<T>) {
    super(options);
  }
}
