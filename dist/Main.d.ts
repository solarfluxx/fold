import { DependencyList } from 'react';
import { atomSymbol } from './Const';
import { AnyValue as AnyType, Feature, FeatureMixin, Getter, Observer, Primitive, Setter } from './Types';
export declare class InternalAtom<T> {
    __external: Atom<T, any>;
    /** Stores the atoms that this atom relies on. */
    private __dependencies;
    /** Backup of dependencies. */
    private __dependenciesBackup;
    /** Stores the atoms that rely on this atom. */
    private __dependents;
    /** Stores the listeners attached to this value. */
    private __observers;
    /** Unique atom identifier. This can be used for the `key` prop on components. */
    readonly id: string;
    /**
     * This is the true value of this atom.
     *
     * **Important** — Setting this value will not trigger updates on observers! Use `set()` instead.
     *
     * **Warning** — Be very careful when reading this value since it may not have been set yet. Use `get()` for safety.
     */
    value: T;
    /** True when dependencies change but there are no observers to update; a get compute would be unnecessary. */
    isHot: boolean;
    dependencies: {
        list: () => {
            readonly observers: Observer[];
            readonly dependents: Map<InternalAtom<any>, Observer>;
            readonly dependencies: Set<InternalAtom<any>>;
        };
        add: (dependency: InternalAtom<any>, observer: Observer) => void;
        remove: (dependency: InternalAtom<any>) => void;
        /** Clear all dependencies. */
        revoke: () => void;
        /** Restore dependencies cleared by `revoke()`. */
        restore: () => void;
    };
    constructor(__external: Atom<T, any>);
    private useGetter;
    isFree: () => boolean;
    get: () => T;
    /**
     * Sets `value` then calls `notify()` to notify observers of the new value.
     */
    set: (value: T) => void;
    /**
     * Sends an update notification to every observer associated with this atom.
     */
    notify: () => void;
    /** Adds an observer that will be called when the value changes. */
    watch: (observer: Observer) => () => void;
}
export declare class Atom<T, U = T> {
    getter: Primitive<T> | Getter<T>;
    setter?: Setter<T, U> | undefined;
    static getInternal(atom: Atom<any>): InternalAtom<any>;
    private __internal;
    [atomSymbol]: boolean;
    constructor(initial: Primitive<T>);
    constructor(initial: Primitive<T>, setter: Setter<T, U>);
    constructor(getter: Getter<T>);
    constructor(getter: Getter<T>, setter: Setter<T, U>);
    toString(): string;
    use(): T;
    get(): T;
    set(value: Primitive<U> | ((current: T) => U)): this;
    do(action?: (current: T) => void): this;
    watch(observer: (current: T) => void): () => void;
    with<F extends FeatureMixin>(feature: Feature<T, U, F>): this & F;
}
export declare function atom<T>(initial: Primitive<T>): Atom<T>;
export declare function atom<T, U = T>(initial: Primitive<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function atom<T>(getter: Getter<T>): Atom<T>;
export declare function atom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function inspectAtom(atom: Atom<any>): readonly [Atom<any, any>, InternalAtom<any>];
export declare function isAtom<T, U>(atom: Atom<T, U> | AnyType): atom is Atom<T, U>;
export declare function createFeature<F extends FeatureMixin, T = any, U = any>(feature: Feature<T, U, F>): Feature<T, U, F>;
export declare function useMemoAtom<T extends Atom<any>>(factory: () => T, dependencies?: DependencyList): T;
