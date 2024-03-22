type InvalidPathError<Original extends string, Error extends string> = `${Original}|${Error}`;
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

export type RestrictPath<T extends string> = FormatErrorOrString<DoesNotEndWithSlash<StartsWithSlash<T>>>;
