import { AnyValue as AnyType, Feature, FeatureMixin, Getter, Observer, Primitive, Setter } from './Types';
export declare class InternalAtom<T> {
    readonly __external: Atom<T, any>;
    readonly getter: Primitive<T> | Getter<T>;
    readonly setter?: Setter<T, any> | undefined;
    /** Stores the listeners attached to this value. */
    private __observers;
    /** Stores the atoms that this atom relies on. */
    private __dependencies;
    private __incomingDependencies;
    /** Stores the atoms that rely on this atom. */
    private __dependents;
    /**  */
    private __dependenciesFrozen;
    /**
     * This is the true value of this atom. This value is a cache which makes read/write unstable (See below).
     *
     * **Warning** — Setting this value will not trigger updates on observers! Use `set()` if that is desired.
     *
     * **Warning** — Be very careful when reading this value since it may not be set or may be out of date! Use `get()` for safety.
     */
    value: T;
    /** True when dependencies change but there are no observers to update; a getter compute would be unnecessary. */
    isHot: boolean;
    dependencies: {
        list: () => {
            readonly observers: Observer[];
            readonly dependents: Map<InternalAtom<any>, Observer>;
            readonly dependencies: Set<InternalAtom<any>>;
        };
        add: (dependency: InternalAtom<any>, observer: Observer) => void;
        remove: (dependency: InternalAtom<any>) => void;
        unlink: () => void;
        freeze: () => void;
        unfreeze: () => void;
    };
    constructor(__external: Atom<T, any>, getter: Primitive<T> | Getter<T>, setter?: Setter<T, any> | undefined);
    isFree: () => boolean;
    get: () => T;
    /**
     * Sets `value` then calls `notify()` to notify observers of the new value.
     */
    set: (value: T) => void;
    /**
     * Sets `value` using the getter/initial value.
     */
    refresh: () => void;
    /**
     * Sends an update notification to every observer associated with this atom.
     */
    notify: () => void;
    /** Adds an observer that will be called when the value changes. */
    watch: (observer: Observer) => () => void;
    /**
     * Destroys this atom.
     *
     * **Warning** — This is a permanent action. This should only be called after this atom is done being used.
     */
    destroy: () => void;
    useGetter: () => T;
    useSetter: <U>(predicate: Exclude<U, Function | undefined> | ((current: T) => U)) => void | T;
}
export declare class Atom<T, U = T> {
    static getInternal(atom: Atom<any>): InternalAtom<any>;
    private readonly __internal;
    /** Unique atom identifier. This can be used for the `key` prop on components. */
    readonly id: string;
    constructor(initial: Primitive<T>);
    constructor(initial: Primitive<T>, setter: Setter<T, U>);
    constructor(getter: Getter<T>);
    constructor(getter: Getter<T>, setter: Setter<T, U>);
    toString(): string;
    use(): T;
    get(): T;
    set(value: Primitive<U> | ((current: T) => U)): this;
    do(action: (current: T) => void): this;
    watch(observer: (current: T) => void): () => void;
    with<F extends FeatureMixin>(feature: Feature<T, U, F>): this & F;
    debug(handler?: 'console' | 'inline'): {
        id: string;
    };
}
export declare function atom<T>(initial: Primitive<T>): Atom<T>;
export declare function atom<T, U = T>(initial: Primitive<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function atom<T>(getter: Getter<T>): Atom<T>;
export declare function atom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function useAtom<T>(initial: Primitive<T>): Atom<T>;
export declare function useAtom<T, U = T>(initial: Primitive<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function useAtom<T>(getter: Getter<T>): Atom<T>;
export declare function useAtom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function inspectAtom(atom: Atom<any>): readonly [Atom<any, any>, InternalAtom<any>];
export declare function isAtom<T, U>(atom: Atom<T, U> | AnyType): atom is Atom<T, U>;
export declare function createFeature<F extends FeatureMixin, T = any, U = any>(feature: Feature<T, U, F>): Feature<T, U, F>;
export declare function createOptic<T extends (...parameters: any) => Atom<any>>(optic: (generator: typeof atom | typeof useAtom) => T): readonly [T, T];
