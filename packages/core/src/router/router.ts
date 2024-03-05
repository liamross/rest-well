import type {Resource, Route, RouteImplementation} from "../schema";

export function route<R extends Route>(route: R, implementation: RouteImplementation<R>): RouteImplementation<R> {
  return implementation;
}

export function router<R extends Resource>(
  resource: R,
  implementations: RouteImplementation<R>,
): RouteImplementation<R> {
  return implementations;
}
