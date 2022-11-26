// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Resolver = (value?: void | PromiseLike<void> | any) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rejector = (reason?: any) => void;
export type Executor = {
  timeout?: number;
  timeoutHandle?: number;
  resolve: Resolver;
  reject: Rejector;
};

export class Executors {
  static timeout = 30000;
  #executors = new Map<string, Executor>();

  set(key: string, executor: Executor) {
    if (typeof executor.timeout === 'undefined' || executor.timeout > 0) {
      executor.timeoutHandle = +setTimeout(() => {
        const executor = this.#executors.get(key);
        if (executor) {
          executor?.reject(new Error('TIMEOUT'));
        }
      }, executor.timeout ?? Executors.timeout);
    }
    this.#executors.set(key, executor);
  }

  peek(key: string): Executor | undefined {
    const executor = this.#executors.get(key);
    if (executor) {
      if (executor.timeoutHandle) {
        clearTimeout(executor.timeoutHandle);
        executor.timeoutHandle = undefined;
      }
    }
    return executor;
  }

  get(key: string): Executor | undefined {
    const executor = this.peek(key);
    if (executor) {
      this.delete(key);
    }
    return executor;
  }

  has(key: string): boolean {
    return this.#executors.has(key);
  }

  delete(key: string) {
    this.#executors.delete(key);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve(key: string, value?: any) {
    const executor = this.get(key);
    if (!executor) {
      throw new Error(`Executor "${key}" not found`);
    }
    executor.resolve(value);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject(key: string, reason?: any) {
    const executor = this.get(key);
    if (!executor) {
      throw new Error(`Executor "${key}" not found`);
    }
    executor.reject(reason);
  }
}
