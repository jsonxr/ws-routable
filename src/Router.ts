// itty-router...

export const Method = {
  DELETE: 'DELETE',
  GET: 'GET',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
  PATCH: 'PATCH',
  POST: 'POST',
  PUT: 'PUT',
  TRACE: 'TRACE',
} as const;
export const Methods = Object.values(Method);
export type Method = keyof typeof Method;

export type TRequest = {
  readonly url: string;
  readonly method: string;
  query?: {
    [k: string]: string;
  };
  params?: {
    [k: string]: string;
  };
};

export type RouteHandler<Req extends TRequest, Res, Ctx> = (
  req: Req,
  context: Ctx
) => Res | undefined | void | Promise<Res | undefined | void>;

export type RouteEntry<Req extends TRequest, Res, Ctx> = [string, RegExp, RouteHandler<Req, Res, Ctx>[]];

export interface Route<Req extends TRequest, Res, Ctx> {
  (path: string, ...handlers: RouteHandler<Req, Res, Ctx>[]): Router<Req, Res, Ctx>;
}

export interface RouterOptions<Req extends TRequest, Res, Ctx = any> {
  base?: string;
  routes?: RouteEntry<Req, Res, Ctx>[];
}

export class Router<Req extends TRequest, Res, Ctx = any> {
  base: string;
  routes: RouteEntry<Req, Res, Ctx>[];

  all: Route<Req, Res, Ctx>;
  delete: Route<Req, Res, Ctx>;
  get: Route<Req, Res, Ctx>;
  head: Route<Req, Res, Ctx>;
  options: Route<Req, Res, Ctx>;
  patch: Route<Req, Res, Ctx>;
  post: Route<Req, Res, Ctx>;
  put: Route<Req, Res, Ctx>;
  trace: Route<Req, Res, Ctx>;

  constructor({ base = '', routes = [] }: RouterOptions<Req, Res, Ctx> = {}) {
    this.base = base;
    this.routes = routes;
    this.all = this.addRoute('ALL');
    this.delete = this.addRoute('DELETE');
    this.get = this.addRoute('GET');
    this.head = this.addRoute('HEAD');
    this.options = this.addRoute('OPTIONS');
    this.patch = this.addRoute('PATCH');
    this.post = this.addRoute('POST');
    this.put = this.addRoute('PUT');
    this.trace = this.addRoute('TRACE');
  }

  // We want to be able to just hand off router.handle so, bind it to this instance
  handle = async (req: Req, context: Ctx) => {
    //TODO: localhost hardcoded here for DurableObjects, how can we remove?
    const url = req.url.indexOf('://') > 0 ? new URL(req.url) : new URL(`http://localhost${req.url}`);
    req.query = Object.fromEntries(url.searchParams);
    for (const [method, route, handlers] of this.routes) {
      const match = url.pathname.match(route);
      if ((method === req.method || method === 'ALL') && match) {
        req.params = match.groups ?? {};
        for (const handler of handlers) {
          const res = await handler(req, context);
          if (res !== undefined) {
            return res;
          }
        }
      }
    }
  };

  private addRoute(method: Method | 'ALL') {
    return (route: string, ...handlers: RouteHandler<Req, Res, Ctx>[]): Router<Req, Res, Ctx> => {
      const entry: RouteEntry<Req, Res, Ctx> = [
        method,
        RegExp(
          `^${
            (this.base + route)
              .replace(/(\/?)\*/g, '($1.*)?') // trailing wildcard
              .replace(/\/$/, '') // remove trailing slash
              .replace(/:(\w+)(\?)?(\.)?/g, '$2(?<$1>[^/]+)$2$3') // named params
              .replace(/\.(?=[\w(])/, '\\.') // dot in path
              .replace(/\)\.\?\(([^\[]+)\[\^/g, '?)\\.?($1(?<=\\.)[^\\.') // optional image format
          }/*$`
        ),
        handlers,
      ];
      this.routes.push(entry);
      return this;
    };
  }
}
