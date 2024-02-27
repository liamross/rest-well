type PathWithParams = {path: string; params: {[key: string]: string}};

/**
 * Match the url to a template path and extract the parameters.
 *
 * @example
 * getPathWithParams("/users/1", ["/users/{id}"]); // {path: "/users/{id}", params: {id: "1"}}
 */
export function getPathWithParams(pathname: string, paths: string[]): PathWithParams | null {
  let match: (PathWithParams & {pathParts: string[]}) | null = null;

  const urlParts = pathname.split("/");

  pathLoop: for (const path of paths) {
    const pathParts = path.split("/");

    // Ensure pathParts is same length as urlParts so we can do non-null assertions.
    if (pathParts.length !== urlParts.length) continue;

    const params: {[key: string]: string} = {};

    for (let i = 0; i < pathParts.length; i++) {
      const pathPart = pathParts[i]!;
      const urlPart = urlParts[i]!;
      const matchPart = match && match.pathParts[i]!;

      if (pathPart === urlPart) {
        // If current match is less specific, we can clear it.
        if (matchPart && isVariable(matchPart)) match = null;
        continue;
      } else if (isVariable(pathPart)) {
        // If current match is more specific, we can skip this path.
        if (matchPart && !isVariable(matchPart)) continue pathLoop;
        params[pathPart.slice(1, -1)] = urlPart;
        continue;
      }

      // If no match but also not a variable, we can skip this path.
      continue pathLoop;
    }

    // If we still have a match by this point, then there are two routes with
    // the same level of specificity and that is an error.
    if (match) throw new Error(`You have two routes that match the same URL: '${match.path}' and '${path}'`);
    match = {path, params, pathParts};
  }

  return match && {path: match.path, params: match.params};
}

function isVariable(pathPart: string) {
  return pathPart.startsWith("{") && pathPart.endsWith("}");
}

type InvalidPathError<Original extends string, Error extends string> = `$_${Original}_$_${Error}$`;
type FormatErrorOrString<T extends string> = T extends InvalidPathError<infer _O, infer E> ? `Invalid path: ${E}` : T;

type StringMatches<S extends string, Match extends string, Error extends string> = S extends Match
  ? S
  : InvalidPathError<S, Error>;
type StringDoesNotMatch<S extends string, Match extends string, Error extends string> = S extends Match
  ? InvalidPathError<S, Error>
  : S;

type CombineErrors<Error extends InvalidPathError<string, string>, Maybe extends string> =
  Error extends InvalidPathError<infer O, infer EE>
    ? Maybe extends InvalidPathError<infer _O, infer ME>
      ? InvalidPathError<O, `${EE}, ${ME}`>
      : Error
    : Maybe;

type StartsWithSlash<T extends string> =
  T extends InvalidPathError<infer O, infer _E>
    ? CombineErrors<T, StringMatches<O, `/${string}`, "must start with '/'">>
    : StringMatches<T, `/${string}`, "must start with '/'">;

type DoesNotEndWithSlash<T extends string> =
  T extends InvalidPathError<infer O, infer _E>
    ? CombineErrors<T, StringDoesNotMatch<O, `${string}/`, "must not end with '/'">>
    : StringDoesNotMatch<T, `${string}/`, "must not end with '/'">;

type NoPathParameters<T extends string> =
  T extends InvalidPathError<infer O, infer _E>
    ? CombineErrors<
        T,
        StringDoesNotMatch<O, `${string}${"{" | "}"}${string}`, "path parameters ('{}') are not allowed">
      >
    : StringDoesNotMatch<T, `${string}{${"{" | "}"}}${string}`, "path parameters ('{}') are not allowed">;

export type RestrictPath<T extends string> = FormatErrorOrString<DoesNotEndWithSlash<StartsWithSlash<T>>>;

export type RestrictRootPath<T extends string> = FormatErrorOrString<
  NoPathParameters<DoesNotEndWithSlash<StartsWithSlash<T>>>
>;
