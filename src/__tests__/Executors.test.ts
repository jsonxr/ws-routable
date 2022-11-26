import { Executor, Executors } from '../Executors';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Executors', () => {
  it('constructor', () => {
    new Executors();
  });

  it('should get executor by key', async () => {
    const executors = new Executors();
    const executor: Executor = {
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 1,
    };
    executors.set('1', executor);
    const result = executors.get('1'); // Clears the timeout
    expect(result).toBeDefined();
    await delay(10);
    result?.resolve();
    expect(executor.reject).not.toBeCalled();
    expect(executor.resolve).toBeCalled();
  });

  it('should remove executor when retrieved', async () => {
    const executors = new Executors();
    const executor: Executor = {
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 1,
    };
    executors.set('1', executor);
    executors.get('1'); // get and remove
    const result = executors.get('1'); // Make sure it's empty
    expect(result).toBeUndefined();
  });

  it('should return executor when we peek', async () => {
    const executors = new Executors();
    const executor: Executor = {
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 1,
    };
    executors.set('1', executor);
    const result = executors.peek('1'); // get but keep...
    expect(result).toBeDefined();
    const result2 = executors.peek('1');
    expect(result2).toBeDefined();
  });

  it('should resolve by key', async () => {
    const executors = new Executors();
    const executor: Executor = {
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 1,
    };
    executors.set('1', executor);
    executors.resolve('1', 'yes');
    expect(executor.resolve).toBeCalledWith('yes');
    expect(executor.reject).not.toBeCalled();
  });

  it('should throw error if resolve can not find key', async () => {
    const executors = new Executors();
    expect(() => {
      executors.resolve('1', 'yes');
    }).toThrow();
  });

  it('should reject by key', async () => {
    const executors = new Executors();
    const executor: Executor = {
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 1,
    };
    executors.set('1', executor);
    executors.reject('1', 'yes');
    expect(executor.resolve).not.toBeCalled();
    expect(executor.reject).toBeCalledWith('yes');
  });

  it('should throw error if reject can not find key', async () => {
    const executors = new Executors();
    expect(() => {
      executors.reject('1', 'yes');
    }).toThrow();
  });

  it('should return undefined if key does not exist', async () => {
    const executors = new Executors();
    const executor = executors.get('fake');
    expect(executor).toBeUndefined();
  });

  it('should reject if timeout reached', async () => {
    const executors = new Executors();
    const executor: Executor = { resolve: jest.fn(), reject: jest.fn(), timeout: 1 };
    executors.set('1', executor);
    await delay(10);
    expect(executor.reject).toBeCalledWith(new Error('TIMEOUT'));
  });

  it('should reject if default timeout reached', async () => {
    const executors = new Executors();
    Executors.timeout = 1;
    const executor: Executor = { resolve: jest.fn(), reject: jest.fn() };
    executors.set('1', executor);
    await delay(10);
    expect(executor.reject).toBeCalledWith(new Error('TIMEOUT'));
  });

  it('should return true if has key', () => {
    const executors = new Executors();
    const executor: Executor = {
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 1,
    };
    executors.set('1', executor);
    expect(executors.has('1')).toBeTruthy();
    expect(executors.has('fake')).toBeFalsy();
  });
});
