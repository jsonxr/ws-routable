/* eslint-disable @typescript-eslint/no-explicit-any */
import { Method } from './Router';

//------------------------------------------------------------------------------
// Request
//------------------------------------------------------------------------------
export interface WsRequest {
  url: string;
  method: Method;
  body?: any;
  headers?: Record<string, string>;
}

//------------------------------------------------------------------------------
// Response
//------------------------------------------------------------------------------

export interface WsResponse {
  status: number;
  statusText: string;
  body?: any;
}
