import { EnvelopeType } from '../Envelope';
import { Method } from '../Router';
import {
  EnvelopeSchema,
  RequestSchema,
  ResponseSchema,
  throwIfValidationErrors,
  validate,
  ValidationErrors,
} from '../Validation';

describe('Validation', () => {
  describe('validate', () => {
    it('should validate Envelope', () => {
      const errors = validate(EnvelopeSchema, {});
      const mapped = errors.map(e => e.schemaPath.join('/'));
      expect(mapped).toEqual(['properties/id', 'properties/type', 'properties/payload']);
    });
    it('should validate WsResponse', () => {
      const errors = validate(ResponseSchema, {});
      const mapped = errors.map(e => e.schemaPath.join('/'));
      expect(mapped).toEqual(['properties/status', 'properties/statusText']);
    });
    it('should validate WsRequest', () => {
      const errors = validate(RequestSchema, {});
      const mapped = errors.map(e => e.schemaPath.join('/'));
      expect(mapped).toEqual(['properties/url', 'properties/method']);
    });
    it('should throw error if data is not an object', () => {
      expect(() => {
        validate(RequestSchema, 'fake' as any);
      }).toThrow('Validation.validate: data is not an object');
    });
  });

  describe('ValidationErrors', () => {
    it('should construct ValidationErrors', () => {
      const errors = validate(EnvelopeSchema, {});
      const err = new ValidationErrors('Validation Errors', errors);
      expect(err.message).toEqual('Validation Errors');
      expect(err.errors).toEqual(errors);
      expect(err.name).toEqual('Error');
    });
  });

  describe('throwIfValidationErrors', () => {
    it("should throw error if schema doesn't match data", () => {
      expect(() => {
        throwIfValidationErrors(EnvelopeSchema, {}, 'MyError');
      }).toThrow('MyError');
    });

    it('should throw a ValidationError', () => {
      const errors = validate(EnvelopeSchema, {});
      const error: Error = new ValidationErrors('Payload is non conforming', errors);
      expect(() => {
        throwIfValidationErrors(EnvelopeSchema, {});
      }).toThrow(error);
    });
  });

  describe('EnvelopeSchema', () => {
    it('should have all the types for the EnvelopeType enum', () => {
      const EnvelopeTypes = [...Object.keys(EnvelopeType)];
      const schema: any = EnvelopeSchema;
      expect(EnvelopeTypes).toEqual(schema.properties?.type?.enum);
    });
  });

  describe('RequestSchema', () => {
    it('should have all the types for the Method enum', () => {
      const MethodTypes = [...Object.keys(Method)];
      const schema: any = RequestSchema;
      expect(MethodTypes).toEqual(schema.properties?.method?.enum);
    });
  });
});
