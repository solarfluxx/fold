import { Atom, InternalAtom } from './Main';
export type AnyValue = string | number | boolean | null | undefined | Function | object;
export type Getter<T> = () => T;
export type Setter<T, U> = (incoming: U, current: T) => T | void;
export type Feature<T, U = T, F extends FeatureMixin = FeatureMixin> = (external: Atom<T, U>, internal: InternalAtom<T>) => F;
export type FeatureMixin = {
    [K in string]: any;
};
export type Primitive<T> = Exclude<T, undefined | Function>;
export type Observer = () => void;
export type AtomValue<T> = T extends Atom<infer V> ? V : T;
export type ExcludeAtom<T> = (T extends Atom<infer V> ? V : T extends Atom<infer V>[] ? V[] : {
    [K in keyof T]: ExcludeAtom<T[K]>;
});
export type IntersectFeatures<T> = T extends [infer F, ...infer R] ? (F extends Feature<any, any, infer FF> ? FF & IntersectFeatures<R> : IntersectFeatures<R>) : {};
export type WithFeatures<A extends Atom<any>, FF extends Feature<any, any, any>[]> = A & IntersectFeatures<FF>;
