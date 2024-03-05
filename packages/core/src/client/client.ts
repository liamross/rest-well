import type {Resource, Route, RouteImplementation} from "../schema";

function clientRoute<R extends Route>(route: R): RouteImplementation<R> {
  throw new Error("NOT IMPLEMENTED");
  // return (args) => {};
}

export function createClient<R extends Resource>(resource: R): RouteImplementation<R> {
  throw new Error("NOT IMPLEMENTED");
}
