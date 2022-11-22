import { Schema, ValidationError, validate as jtdValidate } from 'jtd';

//------------------------------------------------------------------------------
// Envelope
//------------------------------------------------------------------------------
export const EnvelopeSchema = {
  properties: {
    id: { type: 'string' },
    type: { enum: ['REQUEST', 'RESPONSE'] },
    payload: { nullable: false },
  },
} as Schema;

//------------------------------------------------------------------------------
// Request
//------------------------------------------------------------------------------
export const RequestSchema: Schema = {
  properties: {
    url: { type: 'string' },
    method: { enum: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE'] },
  },
  optionalProperties: {
    headers: {},
    body: {},
    query: {},
    params: {},
  },
};

//------------------------------------------------------------------------------
// Response
//------------------------------------------------------------------------------
export const ResponseSchema: Schema = {
  properties: {
    status: { type: 'uint32' },
    statusText: { type: 'string' },
  },
  optionalProperties: {
    body: {},
  },
};

//------------------------------------------------------------------------------
// ValidationErrors
//------------------------------------------------------------------------------

export class ValidationErrors extends Error {
  errors: ValidationError[];
  constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.errors = errors;
  }
}

export function validate(schema: Schema, data: any) {
  const errors = jtdValidate(schema, data);
  return errors;
}

export function throwIfValidationErrors(schema: Schema, data: any, errorMessage: string = 'Payload is non conforming') {
  const errors = validate(schema, data);
  if (errors.length) {
    throw new ValidationErrors(errorMessage, errors);
  }
}
