import { assert } from '../assert';

describe('assert', () => {
  it('should throw an error if false', () => {
    expect(() => assert(false)).toThrow();
  });

  it('should throw an error with message if false', () => {
    expect(() => assert(false, 'Test')).toThrowError('Test');
  });

  it('should do nothing if true', () => {
    expect(() => assert(true)).not.toThrow();
  });
});
