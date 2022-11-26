import { ulidFactory } from 'ulid-workers';
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

  wrapRequest(payload: any): Envelope {
    return {
      id: ulid(),
      type: EnvelopeType.REQUEST,
      payload,
    };
  },

  wrapResponse(id: string, payload: any): Envelope {
    return {
      id,
      type: EnvelopeType.RESPONSE,
      payload,
    };
  },
};
