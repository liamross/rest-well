/* eslint-disable @typescript-eslint/no-explicit-any */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type LastOf<T> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never;
type Push<T extends any[], V> = [...T, V];
/* eslint-enable @typescript-eslint/no-explicit-any */
type TuplifyUnion<T, L = LastOf<T>, N = [T] extends [never] ? true : false> = true extends N
  ? []
  : Push<TuplifyUnion<Exclude<T, L>>, L>;
type ObjectKeysToArray<T extends object> = TuplifyUnion<keyof T>;
type ArrayToString<A extends string[]> = A extends [infer H extends string, ...infer T extends string[]]
  ? `${H}${T extends [] ? "" : `, ${ArrayToString<T>}`}`
  : "";

export type ObjectKeysToString<T extends object> = ArrayToString<
  ObjectKeysToArray<T> extends infer A extends string[] ? A : never
>;
