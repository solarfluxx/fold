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
    /** Determines whether new dependencies will be sent to limbo. */
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
    /**
     * Returns the freedom status of this atom.
     *
     * An atom is "free" if it doesn't have any observers or dependents relying on it.
     */
    isFree: () => boolean;
    /**
     * Safely returns the current value. This will reevaulate the value if its not assigned or is outdated.
     *
     * Atom values are lazily loaded (only evaluated when needed) so reading
     * `this.value` directly is dangerous.
     *
     * **Note** — This is wrapped by `Atom.get` (external).
     */
    get: () => T;
    /**
     * Sets `this.value` directly, then calls `this.notify()` to notify observers of the new value.
     *
     * This does not accept a setter so `this.set(v => v)` will assign `this.value` to `v => v` literally.
     * Use `Atom.set` (external) for that function.
     */
    set: (value: T) => void;
    /**
     * Evaulates the getter and assigns `this.value` to the returned value.
     *
     * **Note** — Do not call this unnecessarily since the evaluation of the getter may be expessive.
     */
    refresh: () => void;
    /**
     * Calls every observer and notifies every dependent associated with this atom.
     *
     * **Note** — Do not call this unnecessarily since the execution of the observers/dependents may be expessive.
     */
    notify: () => void;
    /**
     * Adds an observer that will be called when the value changes.
     *
     * Unlike `Atom.watch` (external), this does not evaluate and pass the atom's current value into the observer.
     */
    watch: (observer: Observer) => () => void;
    /**
     * Releases all observers, dependencies, and dependents.
     *
     * **Warning** — These observers cannot be recovered; they must be rebound manually.
     */
    release: () => void;
    /**
     * Evaulates the getter (`this.getter`) and returns its value.
     *
     * This operation can be costly so its important to do it as little as possible.
     * Internally, the return value of this is cached in `this.value`.
     */
    useGetter: () => T;
    /**
     * Evaulates a setter and returns its value.
     *
     * **Side Effect** — Atom value is evaluated.
     */
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
    /**
     * Returns the unique identifier of this atom.
     *
     * ```
     * `${atom}`
     * ```
     */
    toString(): string;
    /**
     * Hooks into the value of this atom.
     *
     * **React Components**
     * When called inside of a React component,
     * it will hook into the component and rerender it when the atom changes.
     *
     * **Derived Atoms**
     * When called inside of an atom's getter,
     * it will hook into that atom and update it when this atom changes.
     */
    use(): T;
    /**
     * Returns the current value of the atom.
     * This will **not** hook into React components nor derived atoms.
     */
    get(): T;
    /**
     * Passes a value into this atom's setter.
     * The setter determines what happens with the value.
     * The default setter will assign the atom to the passed value.
     *
     * **Counter Example**
     * ```
     * const countAtom = atom(0);
     * console.log(countAtom.get()); // 0
     *
     * countAtom.set(10);
     * console.log(countAtom.get()); // 10
     *
     * countAtom.set(count => count + 5);
     * console.log(countAtom.get()); // 15
     *
     * ```
     */
    set(value: Primitive<U> | ((current: T) => U)): this;
    /**
     * Calls the provided action then notifies observers of the mutation.
     * This provides a simple way to mutate properties without reassigning the atom.
     *
     * **Array Push Example**
     * ```
     * const arrayAtom = atom([ 1, 2, 3 ]);
     * console.log(arrayAtom.get()); // [ 1, 2, 3 ]
     *
     * // `push` mutates the array. By calling `push` inside of `do`, the atom is aware of the mutation.
     * arrayAtom.do(value => value.push(7));
     * console.log(arrayAtom.get()); // [ 1, 2, 3, 7 ]
     * ```
     */
    do(action: (current: T) => void): this;
    /**
     * Attaches an observer that is called when the atom updates. Its basically an event listener.
     *
     * **Example**
     * ```
     * const nameAtom = atom('John');
     *
     * // Will log the value of `nameAtom` when its updated.
     * nameAtom.watch(value => {
     * 	console.log(value);
     * });
     * ```
     */
    watch(observer: (current: T) => void): () => void;
    /**
     * Attaches a feature to this atom.
     *
     * **Warning** — This mutates the atom object; it does not return a new atom.
     */
    with<F extends FeatureMixin, FF extends FeatureMixin>(feature: Feature<T, U, F, FF>): this & FF;
    /**
     * Alias of `this.with` but asserts the feature's existance instead of returning it.
     *
     * **Example**
     * ```
     * const myAtom = atom(0);
     * myAtom.assertWith(resetFeature);
     * myAtom.reset(); // `reset()` from `resetFeature` exists
     * ```
     */
    assertWith<F extends FeatureMixin, FF extends FeatureMixin>(feature: Feature<T, U, F, FF>): asserts this is this & FF;
    /**
     * Returns very basic details of this atom. Honestly, not very useful at the moment.
     *
     * @param handler If this is set to `'console'`, it will log to the console too.
     */
    debug(handler?: 'console' | 'inline'): {
        id: string;
    };
}
export declare function atom<T>(initial: Primitive<T>): Atom<T>;
export declare function atom<T, U = T>(initial: Primitive<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function atom<T>(getter: Getter<T>): Atom<T>;
export declare function atom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U>;
/**
 * Creates a memoized atom.
 */
export declare function useAtom<T>(initial: Primitive<T>): Atom<T>;
export declare function useAtom<T, U = T>(initial: Primitive<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function useAtom<T>(getter: Getter<T>): Atom<T>;
export declare function useAtom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U>;
export declare function inspectAtom(atom: Atom<any>): readonly [Atom<any, any>, InternalAtom<any>];
export declare function isAtom<T, U>(atom: Atom<T, U> | AnyType): atom is Atom<T, U>;
export declare function createFeature<FF extends FeatureMixin, T = any, U = any, F = {}>(feature: Feature<T, U, F, FF>): Feature<T, U, F, FF>;
/**
 * Creates a wrapper for the `atom` and `useAtom` functions.
 * This function is simply a helper to create both a wrapped traditional
 * factory (`atom`) and wrapped hook factory (`useAtom`) at the same time.
 *
 * **Example**
 * ```
 * const [ myOpticAtom, useMyOpticAtom ] = createOptic(generator => {
 * 	// `generator` is both `atom` and `useAtom`
 * 	return generator(0, (incoming) => 2 * incoming);
 * });
 * ```
 */
export declare function createOptic<T extends (...parameters: any) => Atom<any>>(factory: (generator: typeof atom | typeof useAtom) => T): readonly [T, T];
