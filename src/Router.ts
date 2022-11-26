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
export type Method = keyof typeof Method;

export type TRequest = {
  readonly url: string;
  readonly method: string;
};
export type Query = Record<string, string | string[]>;
export type RequestParams = {
  query: Query;
  params: {
    [k: string]: string;
  };
};

const Query = {
  fromURLSearchParams: (search: URLSearchParams) => {
    const query: Query = {};
    for (const name of search.keys()) {
      const values = search.getAll(name);
      if (values.length === 1) {
        query[name] = values[0];
      } else {
        query[name] = values;
      }
    }
    return query;
  },
};

export type RouteHandler<Req extends TRequest, Res, Ctx> = (
  req: Req & RequestParams,
  context?: Ctx
) => Res | undefined | void | Promise<Res | undefined | void>;

export type RouteEntry<Req extends TRequest, Res, Ctx> = [string, RegExp, RouteHandler<Req, Res, Ctx>[]];

export interface Route<Req extends TRequest, Res, Ctx> {
  (path: string, ...handlers: RouteHandler<Req, Res, Ctx>[]): Router<Req, Res, Ctx>;
}

export interface RouterOptions<Req extends TRequest, Res, Ctx = unknown> {
  id?: string;
  base?: string;
  routes?: RouteEntry<Req, Res, Ctx>[];
}

export class Router<Req extends TRequest, Res, Ctx = unknown> {
  id: string;
  base: string;
  routes: RouteEntry<Req, Res, Ctx>[];

  constructor({ base = '', routes = [], id }: RouterOptions<Req, Res, Ctx> = {}) {
    this.base = base;
    this.routes = routes;
    this.id = id ?? '';
  }

  all = this.addRoute('ALL');
  delete = this.addRoute('DELETE');
  get = this.addRoute('GET');
  head = this.addRoute('HEAD');
  options = this.addRoute('OPTIONS');
  patch = this.addRoute('PATCH');
  post = this.addRoute('POST');
  put = this.addRoute('PUT');
  trace = this.addRoute('TRACE');

  // We want to be able to just hand off router.handle so, bind it to this instance
  handle = async (req: Req, context?: Ctx) => {
    const request = req as Req & RequestParams; // query, parmas Guaranteed to be assigned before called in handler

    //TODO: localhost hardcoded here for DurableObjects, how can we remove?
    const url = new URL(req.url); // req.url.indexOf('://') > 0 ? new URL(req.url) : new URL(`http://localhost${req.url}`);
    request.query = Query.fromURLSearchParams(url.searchParams);

    for (const [method, route, handlers] of this.routes) {
      const match = url.pathname.match(route);
      if ((method === req.method || method === 'ALL') && match) {
        request.params = match.groups ?? {};
        for (const handler of handlers) {
          const res = await (context ? handler(request, context) : handler(request));
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
