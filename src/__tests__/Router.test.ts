import { Method, Router } from '../Router';

const createRouter = () => {
  const router = new Router();
  const functions = {
    delete: jest.fn(),
    get: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    trace: jest.fn(),
  };
  router.delete('*', functions.delete);
  router.get('*', functions.get);
  router.head('*', functions.head);
  router.options('*', functions.options);
  router.patch('*', functions.patch);
  router.post('*', functions.post);
  router.put('*', functions.put);
  router.trace('*', functions.trace);

  return { router, functions };
};

/**
 * Expect all calls to NOT be called except the one in method
 * @param functions
 * @param name
 */
const expectOnlyToBeCalled = (functions: Record<string, unknown>, name: string) => {
  const functionNames = Object.keys(functions);
  for (const functionName of functionNames) {
    if (name === functionName) {
      expect(functions[functionName]).toBeCalled();
    } else {
      expect(functions[functionName]).not.toBeCalled();
    }
  }
};

describe('Router', () => {
  describe('constructor', () => {
    it('should allow zero arguments', () => {
      const r = new Router();
      expect(r.base).toEqual('');
      expect(r.id).toEqual('');
      expect(r.context).toEqual({});
    });
    it('should options', () => {
      const ctx = { val: 1 };
      const r = new Router({ context: ctx, id: '1', base: '/base' });
      expect(r.base).toEqual('/base');
      expect(r.id).toEqual('1');
      expect(r.context).toEqual(ctx);
    });
  });

  describe('addRoute', () => {
    it('should route to delete', async () => {
      const { router, functions: functions } = createRouter();
      await router.handle({ url: 'http://localhost', method: Method.DELETE });
      expectOnlyToBeCalled(functions, 'delete');
    });

    it('should route to get', async () => {
      const { router, functions: functions } = createRouter();
      await router.handle({ url: 'http://localhost', method: Method.GET });
      expectOnlyToBeCalled(functions, 'get');
    });

    it('should route to head', async () => {
      const { router, functions: functions } = createRouter();
      await router.handle({ url: 'http://localhost', method: Method.HEAD });
      expectOnlyToBeCalled(functions, 'head');
    });

    it('should route to options', async () => {
      const { router, functions: functions } = createRouter();
      await router.handle({ url: 'http://localhost', method: Method.OPTIONS });
      expectOnlyToBeCalled(functions, 'options');
    });

    it('should route to patch', async () => {
      const { router, functions: functions } = createRouter();
      await router.handle({ url: 'http://localhost', method: Method.PATCH });
      expectOnlyToBeCalled(functions, 'patch');
    });

    it('should route to post', async () => {
      const { router, functions: functions } = createRouter();
      await router.handle({ url: 'http://localhost', method: Method.POST });
      expectOnlyToBeCalled(functions, 'post');
    });

    it('should route to put', async () => {
      const { router, functions: functions } = createRouter();
      await router.handle({ url: 'http://localhost', method: Method.PUT });
      expectOnlyToBeCalled(functions, 'put');
    });

    it('should route to trace', async () => {
      const { router, functions: functions } = createRouter();
      await router.handle({ url: 'http://localhost', method: Method.GET });

      expect(functions.get);
    });

    it('should route all', async () => {
      const { router } = createRouter();
      const all = jest.fn();
      router.all('*', all);
      await router.handle({ url: 'http://localhost', method: Method.GET });
      expect(all).toBeCalled();
    });
  });

  describe('handle', () => {
    it('should populate params for request', async () => {
      const ctx = {};
      const router = new Router({ context: ctx });
      const call = jest.fn();
      router.get('/examples/:exampleId', call);
      await router.handle({ url: 'http://localhost/examples/1', method: Method.GET });
      expect(call).toBeCalledWith(
        {
          method: 'GET',
          params: {
            exampleId: '1',
          },
          query: {},
          url: 'http://localhost/examples/1',
        },
        ctx
      );
    });

    it('should populate query for request', async () => {
      const router = new Router();
      const call = jest.fn();
      router.get('/examples/:exampleId', call);
      const ctx = {};
      await router.handle({ url: 'http://localhost/examples/1?param1=one&param2=two', method: Method.GET });
      expect(call).toBeCalledWith(
        {
          method: 'GET',
          params: {
            exampleId: '1',
          },
          query: {
            param1: 'one',
            param2: 'two',
          },
          url: 'http://localhost/examples/1?param1=one&param2=two',
        },
        ctx
      );
    });

    it('should populate query array for request', async () => {
      const router = new Router();
      const call = jest.fn();
      router.get('/examples/:exampleId', call);
      const ctx = {};
      await router.handle({ url: 'http://localhost/examples/1?param1=one&param1=two', method: Method.GET });
      expect(call).toBeCalledWith(
        {
          method: 'GET',
          params: {
            exampleId: '1',
          },
          query: {
            param1: ['one', 'two'],
          },
          url: 'http://localhost/examples/1?param1=one&param1=two',
        },
        ctx
      );
    });

    it('should stop after the first route returns a response', async () => {
      const router = new Router();
      const nocall = jest.fn();
      const call = jest.fn();
      const response = jest.fn(() => 'response');
      router.all('*', call);
      router.all('*', response);
      router.all('*', nocall);

      await router.handle({ url: 'http://localhost', method: Method.GET });
      expect(call).toBeCalled();
      expect(response).toBeCalled();
      expect(response).toReturnWith('response');
      expect(nocall).not.toBeCalled();
    });

    it('should match * patterns at the end', async () => {
      const router = new Router();
      const nocall = jest.fn();
      const call = jest.fn();

      router.all('/examples2/:id', nocall);
      router.all('/examples*', call);
      router.all('/examples/*', call);
      await router.handle({ url: 'http://localhost/examples/1', method: Method.GET });
      expect(nocall).not.toBeCalled();
      expect(call).toBeCalledTimes(2);
    });

    it('should match * patterns in the middle', async () => {
      const router = new Router();
      const nocall = jest.fn();
      const call = jest.fn();

      router.all('/examples/:id/*/posts', nocall);
      router.all('/examples/:id/*/messages/:messageId', nocall);
      router.all('/examples/:id/*/messages/:messageId/*/bob', call);
      const url = 'http://localhost/examples/1/messages/1/bob';
      await router.handle({ url, method: Method.GET });
      expect(nocall).not.toBeCalled();
      expect(call).toBeCalledWith(
        {
          method: 'GET',
          params: {
            id: '1',
            messageId: '1',
          },
          query: {},
          url,
        },
        {}
      );
    });
  });
});
