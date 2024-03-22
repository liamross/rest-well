export type NoEmptyObject<T> = keyof T extends never ? never : T;

export type PartialByIfSameType<A, B> = Prettify<
  {
    // Keys that don't match are still required.
    [K in keyof A as K extends keyof B ? (TypeMatch<A[K], B[K]> extends true ? never : K) : K]: A[K];
  } & {
    // Keys that match are made optional.
    [K in keyof A as K extends keyof B ? (TypeMatch<A[K], B[K]> extends true ? K : never) : never]?: A[K];
  }
>;

// type PartialBy<T, K extends string | number | symbol> = Prettify<Omit<T, K> & Partial<Pick<T, Extract<K, keyof T>>>>;
export type IsFullyPartialObject<T> = T extends object ? ({[K in keyof T]: undefined} extends T ? true : false) : false;

export type TypeMatch<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type MergeObjects<T, U> = Prettify<Omit<T, keyof U> & U>;

/** Simplify the type representation of objects. */
export type Prettify<T> = {[K in keyof T]: T[K]} & {};
export type PrettifyDeep<T> = {[K in keyof T]: Prettify<T[K]>} & {};

/** Checks to see if a type T is unknown or not. */
export type IsUnknown<T> = T extends unknown ? (unknown extends T ? true : false) : false;
