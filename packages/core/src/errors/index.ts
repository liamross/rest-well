import type {Route} from "../schema";

export class RestWellError extends Error {
  private _code: RestWellErrorCode;
  private _suggestion: string;

  constructor(code: RestWellErrorCode, message: string, suggestion: string) {
    super(message);
    this.name = "RestWellError";
    this._code = code;
    this._suggestion = suggestion;
  }
  get code() {
    return this._code;
  }
  get suggestion() {
    return this._suggestion;
  }
}

export const errors = {
  /*
   * Initialization errors (during schema or route creation).
   */

  init_duplicate_routes: (oldRoute: Route, newRoute: Route) =>
    new RestWellError(
      "init_duplicate_routes",
      `Duplicate routes: ${newRoute.method} "${newRoute.path}" is duplicated in your schema`,
      `Update one of the routes in your schema, either by changing the path or the method`,
    ),

  init_overlapping_routes: (oldRoute: Route, newRoute: Route) =>
    new RestWellError(
      "init_overlapping_routes",
      `Overlapping routes: ${newRoute.method} "${newRoute.path}" matches same path as "${oldRoute.path}"`,
      `Update one of the routes in your schema, either by changing the path or the method`,
    ),

  init_missing_route_implementation: (routeName: string) =>
    new RestWellError(
      "init_missing_route_implementation",
      `Missing route implementation: "${routeName}"`,
      `Provide a route handler implementation for the route "${routeName}"`,
    ),
};

type RestWellErrorCode = keyof typeof errors;
