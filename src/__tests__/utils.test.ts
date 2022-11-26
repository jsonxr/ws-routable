import { toAbsoluteURL } from '../utils';

describe('utils', () => {
  describe('relativeToAbsoluteURL', () => {
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
