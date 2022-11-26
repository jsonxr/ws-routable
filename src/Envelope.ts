import { ulidFactory } from 'ulid-workers';
import { WsRequest, WsResponse } from './types';
import { EnvelopeSchema, throwIfValidationErrors } from './Validation';

const ulid = ulidFactory();
//------------------------------------------------------------------------------
// Envelope
//------------------------------------------------------------------------------
export const EnvelopeType = {
  REQUEST: 'REQUEST',
  RESPONSE: 'RESPONSE',
} as const;
export type EnvelopeType = keyof typeof EnvelopeType;

export interface Envelope {
  id: string;
  type: EnvelopeType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

export const Envelope = {
  parse(data: unknown, type: EnvelopeType): Envelope | undefined {
    if (typeof data !== 'string') {
      throw new Error('data is not a string');
    }

    const parsed: Envelope = JSON.parse(data);
    // Abort early if this isn't the type we are listening for...
    if (parsed.type !== type) {
      return;
    }

    throwIfValidationErrors(EnvelopeSchema, parsed, 'Envelope is non conforming');

    return parsed;
  },

  wrapRequest(payload: WsRequest): Envelope {
    return {
      id: ulid(),
      type: EnvelopeType.REQUEST,
      payload,
    };
  },

  wrapResponse(id: string, payload: WsResponse): Envelope {
    return {
      id,
      type: EnvelopeType.RESPONSE,
      payload,
    };
  },
};
