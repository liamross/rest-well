import type {z} from "zod";
import type {Route} from "../schema";

export function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.message} at "${e.path.join(".")}"`).join(", ");
}

export class InitializationError extends Error {
  private _code: InitializationErrorCode;

  constructor(code: InitializationErrorCode, message: string) {
    super(message);
    this.name = "InitializationError";
    this._code = code;
  }
  get code() {
    return this._code;
  }
}

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

export const initErrors = {
  /*
   * Initialization errors (during schema or route creation).
   */

  init_duplicate_routes: (oldRoute: Route, newRoute: Route) =>
    new InitializationError(
      "init_duplicate_routes",
      `Duplicate routes: ${newRoute.method} "${newRoute.path}" is duplicated in your schema. To fix this, update one of the routes in your schema, either by changing the path or the method`,
    ),

  init_overlapping_routes: (oldRoute: Route, newRoute: Route) =>
    new InitializationError(
      "init_overlapping_routes",
      `Overlapping routes: ${newRoute.method} "${newRoute.path}" matches same path as "${oldRoute.path}". To fix this, update one of the routes in your schema, either by changing the path or the method`,
    ),

  init_missing_route_implementation: (routeName: string) =>
    new InitializationError(
      "init_missing_route_implementation",
      `Missing route implementation: "${routeName}". To fix this, provide a route handler implementation for the route.`,
    ),
};

export const errors = {
  /**
   * Runtime errors to handle.
   */

  invalid_path_params: (error: z.ZodError, routeTemplate: string) =>
    new RestWellError(
      "invalid_path_params",
      `Invalid path: ${formatZodError(error)}`,
      `Compare your path with the expected path "${routeTemplate}" and ensure it matches, and fix any errors`,
    ),
};

export type InitializationErrorCode = keyof typeof initErrors;
export type RestWellErrorCode = keyof typeof errors;
