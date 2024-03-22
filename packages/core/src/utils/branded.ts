declare const tag: unique symbol;
declare type Tagged<Tag> = {readonly [tag]: Tag};
export type Branded<T, Tag = unknown> = T & Tagged<Tag>;
export type UnwrapBranded<B extends Tagged<unknown>> = B extends Branded<infer Type, B[typeof tag]> ? Type : B;
export type IsBranded<B extends Tagged<unknown>> = B extends Branded<infer _, B[typeof tag]> ? true : false;
