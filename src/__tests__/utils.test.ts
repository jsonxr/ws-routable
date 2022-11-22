import { toAbsoluteURL } from '../utils';

describe('utils', () => {
  describe('relativeToAbsoluteURL', () => {
    it("should prepend url with base if it's relative", () => {
      const base = 'http://localhost:1234/start/';
      const url = toAbsoluteURL(base, '/tests').toString();
      expect(url).toEqual('http://localhost:1234/start/tests');
    });
    it('should use url as is if it is an absolute url', () => {
      const base = 'http://localhost:1234/start/';
      const url = toAbsoluteURL(base, 'http://localhost/tests').toString();
      expect(url).toEqual('http://localhost/tests');
    });
  });
});
