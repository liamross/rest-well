import type {Route, RouteImplementation, Schema} from "../schema";

export type Router = <T extends Schema | Route>(
  schema: T,
  implementations: RouteImplementation<T>,
) => RouteImplementation<T>;
