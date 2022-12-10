import WS from 'jest-websocket-mock';
import { logSocketState, pick, stringifyCloseEvent, stringifyMessageEvent, toAbsoluteURL } from '../utils';

describe('utils', () => {
  describe('logSocketState(state: number)', () => {
    afterEach(() => {
      WS.clean();
    });
    beforeEach(() => {
      new WS('ws://localhost');
    });
    it('should log WebSocket enum', () => {
      expect(logSocketState(WebSocket.CLOSED)).toEqual('CLOSED');
      expect(logSocketState(WebSocket.CLOSING)).toEqual('CLOSING');
      expect(logSocketState(WebSocket.CONNECTING)).toEqual('CONNECTING');
      expect(logSocketState(WebSocket.OPEN)).toEqual('OPEN');
      expect(logSocketState(-1)).toEqual('UNKNOWN');
    });
  });

  describe('pick(obj: object, keys: string[])', () => {
    it('should return subset of properties of an objct', () => {
      const obj = pick({ one: 1, two: 2, three: 3 }, ['one', 'two']);
      expect(obj).toEqual({ one: 1, two: 2 });
    });
  });

  describe('stringifyMessageEvent(event: MessageEvent)', () => {
    it('should return a string', () => {
      const expected: any = { type: 'type', timeStamp: 'timeStamp', data: 'data', origin: 'origin' };
      const event: any = { ...expected, lastEventId: 'no' };
      const str = stringifyMessageEvent(event);
      const result = JSON.parse(str);
      expect(result).not.toEqual(event);
      expect(result).toEqual(expected);
    });
  });

  describe('stringifyCloseEvent(event: CloseEvent)', () => {
    it('should return a string', () => {
      const expected: any = {
        type: 'type',
        timeStamp: 'timeStamp',
        code: 'code',
        wasClean: 'wasClean',
        reason: 'reason',
      };
      const event: any = { ...expected, cancelable: true };
      const str = stringifyCloseEvent(event);
      const result = JSON.parse(str);
      expect(result).not.toEqual(event);
      expect(result).toEqual(expected);
    });
  });

  describe('toAbsoluteURL(base: string, url: string)', () => {
    it('should return url if it is an absolute url', () => {
      const base = 'http://localhost:1234/start/';
      const url = toAbsoluteURL(base, 'http://localhost/tests').toString();
      expect(url).toEqual('http://localhost/tests');
    });

    it('should prepend url with base if it is relative', () => {
      const base = 'http://localhost:1234/start/';
      const url = toAbsoluteURL(base, '/tests').toString();
      expect(url).toEqual('http://localhost:1234/start/tests');
    });

    it('should not matter if base URL ends with a slash or not', () => {
      const base = 'http://localhost:1234/start';
      const url = toAbsoluteURL(base, '/tests').toString();
      expect(url).toEqual(`${base}/tests`);
      const url2 = toAbsoluteURL(`${base}/`, '/tests').toString();
      expect(url2).toEqual(`${base}/tests`);
    });

    it('should return valid URL even if base is undefined', () => {
      const url = toAbsoluteURL(undefined as any, '/tests').toString();
      expect(url).toEqual('http://localhost/tests');
    });

    it('should return valid URL even if base is invalid', () => {
      const base = 'bad';
      const url = toAbsoluteURL(base, '/tests').toString();
      expect(url).toEqual('http://localhost/tests');
    });
  });
});
