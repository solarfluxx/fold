import { Atom, Feature, Features, Getter, InternalAtom, Primitive, Setter } from './Types';
export declare function atom<T>(initial: Exclude<T, Function>): Atom<T, T, {}>;
export declare function atom<T, U = T>(initial: Exclude<T, Function>, setter: Setter<T, U>): Atom<T, U, {}>;
export declare function atom<T>(getter: Getter<T>): Atom<T, T, {}>;
export declare function atom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U, {}>;
export declare function inspectAtom(atom: Atom<any>): (InternalAtom<any> | Atom<any, any, Features>)[];
export declare function isAtom<T, U, F extends Features>(atom: Atom<T, U, F> | Primitive | object): atom is Atom<T, U, F>;
export declare function createFeature<FF extends Features, T = any, U = any, F extends Features = Features>(feature: Feature<T, U, F, FF>): Feature<T, U, F, FF>;