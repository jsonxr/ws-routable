import { Envelope, EnvelopeType } from '../Envelope';
import { WsRequest, WsResponse } from '../types';

describe('Envelope', () => {
  describe('parse', () => {
    it('should throw an error if invalid envelope', () => {
      const data = { type: EnvelopeType.REQUEST };
      const str = JSON.stringify(data);
      expect(() => {
        Envelope.parse(str, EnvelopeType.REQUEST);
      }).toThrowError('Envelope is non conforming');
    });
    it('should parse a request', () => {
      const envelope = Envelope.wrapRequest({ method: 'GET', url: '/tests' });
      const str = JSON.stringify(envelope);
      const parsed = Envelope.parse(str, EnvelopeType.REQUEST);
      expect(parsed).toBeDefined();
      expect(parsed!.type).toEqual(EnvelopeType.REQUEST);
      expect(parsed!.payload).toEqual(envelope.payload);
    });
    it('should ignore if parsed with wrong type', () => {
      const envelope = Envelope.wrapRequest({ method: 'GET', url: '/tests' });
      const str = JSON.stringify(envelope);
      const parsed = Envelope.parse(str, EnvelopeType.RESPONSE);
      expect(parsed).toBeUndefined();
    });
    it('should throw an error if data is not a string', () => {
      expect(() => {
        Envelope.parse(0 as any, EnvelopeType.RESPONSE);
      }).toThrowError();
    });
  });

  describe('wrapRequest', () => {
    it('should return valid envelope with payload of request', () => {
      const payload: WsRequest = { method: 'GET', url: 'http://localhost' };
      const envelope = Envelope.wrapRequest(payload);
      expect(envelope).toBeDefined();
      expect(envelope.id).toBeTruthy();
      expect(envelope.type).toEqual(EnvelopeType.REQUEST);
      expect(envelope.payload).toEqual(payload);
    });
  });

  describe('wrapResponse', () => {
    it('should return valid envelope with payload of response', () => {
      const payload: WsResponse = {
        status: 200,
        statusText: 'Ok',
      };
      const envelope = Envelope.wrapResponse('1', payload);
      expect(envelope).toBeDefined();
      expect(envelope.type).toEqual(EnvelopeType.RESPONSE);
      expect(envelope.payload).toEqual(payload);
    });
  });
});