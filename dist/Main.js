import { useEffect, useMemo, useState } from 'react';
let counter = 0;
let context = null;
function isGetter(getter) {
    return typeof getter === 'function';
}
function isPredicate(predicate) {
    return typeof predicate === 'function';
}
export class InternalAtom {
    __external;
    getter;
    setter;
    /** Stores the listeners attached to this value. */
    __observers = [];
    /** Stores the atoms that this atom relies on. */
    __dependencies = new Set();
    /* Holds dependencies in limbo. */
    __incomingDependencies = new Map();
    /** Stores the atoms that rely on this atom. */
    __dependents = new Map();
    /** Determines whether new dependencies will be sent to limbo. */
    __dependenciesFrozen = false;
    /**
     * This is the true value of this atom. This value is a cache which makes read/write unstable (See below).
     *
     * **Warning** — Setting this value will not trigger updates on observers! Use `set()` if that is desired.
     *
     * **Warning** — Be very careful when reading this value since it may not be set or may be out of date! Use `get()` for safety.
     */
    value;
    /** True when dependencies change but there are no observers to update; a getter compute would be unnecessary. */
    isHot = true;
    dependencies = {
        list: () => {
            return { observers: this.__observers, dependents: this.__dependents, dependencies: this.__dependencies };
        },
        add: (dependency, observer) => {
            if (this.__dependenciesFrozen) {
                this.__incomingDependencies.set(dependency, observer);
                return;
            }
            this.__dependencies.add(dependency);
            dependency.__dependents.set(this, observer);
        },
        remove: (dependency) => {
            this.__dependencies.delete(dependency);
            dependency.__dependents.delete(this);
        },
        unlink: () => {
            for (const dependency of this.__dependencies) {
                this.dependencies.remove(dependency);
            }
            for (const [dependent] of this.__dependents) {
                dependent.dependencies.remove(this);
            }
        },
        freeze: () => {
            this.__dependenciesFrozen = true;
        },
        unfreeze: () => {
            this.__dependenciesFrozen = false;
            for (const [dependency, observer] of this.__incomingDependencies) {
                this.dependencies.add(dependency, observer);
            }
        },
    };
    constructor(__external, getter, setter) {
        this.__external = __external;
        this.getter = getter;
        this.setter = setter;
    }
    /**
     * Returns the freedom status of this atom.
     *
     * An atom is "free" if it doesn't have any observers or dependents relying on it.
     */
    isFree = () => {
        return this.__observers.length === 0 && this.__dependents.size === 0;
    };
    /**
     * Safely returns the current value. This will reevaulate the value if its not assigned or is outdated.
     *
     * Atom values are lazily loaded (only evaluated when needed) so reading
     * `this.value` directly is dangerous.
     *
     * **Note** — This is wrapped by `Atom.get` (external).
     */
    get = () => {
        if (this.isHot) {
            this.value = this.useGetter();
            this.isHot = false;
        }
        return this.value;
    };
    /**
     * Sets `this.value` directly, then calls `this.notify()` to notify observers of the new value.
     *
     * This does not accept a setter so `this.set(v => v)` will assign `this.value` to `v => v` literally.
     * Use `Atom.set` (external) for that function.
     */
    set = (value) => {
        this.value = value;
        this.notify();
    };
    /**
     * Evaulates the getter and assigns `this.value` to the returned value.
     *
     * **Note** — Do not call this unnecessarily since the evaluation of the getter may be expessive.
     */
    refresh = () => {
        if (this.isFree()) {
            this.isHot = true;
            return;
        }
        this.set(this.useGetter());
    };
    /**
     * Calls every observer and notifies every dependent associated with this atom.
     *
     * **Note** — Do not call this unnecessarily since the execution of the observers/dependents may be expessive.
     */
    notify = () => {
        if (this.__observers.length > 100) {
            console.warn(`Warning: C1001; Excessive (${this.__observers.length}) observers on '${this.__external.id}' = '${this.value}'`);
            console.dir(this.__observers);
        }
        if (this.__dependents.size > 100) {
            console.warn(`Warning: C1002; Excessive (${this.__dependents.size}) dependents on '${this.__external.id}' = '${this.value}'`);
            console.dir(this.__dependents);
        }
        for (const observer of this.__observers) {
            observer();
        }
        for (const [, observer] of this.__dependents) {
            observer();
        }
    };
    /**
     * Adds an observer that will be called when the value changes.
     *
     * Unlike `Atom.watch` (external), this does not evaluate and pass the atom's current value into the observer.
     */
    watch = (observer) => {
        this.__observers.push(observer);
        return () => {
            const index = this.__observers.indexOf(observer);
            if (index < 0) {
                return;
            }
            this.__observers.splice(index, 1);
        };
    };
    /**
     * Releases all observers, dependencies, and dependents.
     *
     * **Warning** — These observers cannot be recovered; they must be rebound manually.
     */
    release = () => {
        this.__observers = [];
        this.dependencies.unlink();
    };
    /**
     * Evaulates the getter (`this.getter`) and returns its value.
     *
     * This operation can be costly so its important to do it as little as possible.
     * Internally, the return value of this is cached in `this.value`.
     */
    useGetter = () => {
        const { getter } = this;
        // If there is no getter, use initial value.
        if (!isGetter(getter)) {
            return getter;
        }
        // Save previous context so it can be restored.
        const previousContext = context;
        // This stores the listeners that need to be called when the new context is destroyed.
        const destroyObservers = [];
        // Set new context.
        context = {
            provider: this,
            onDestroy: (observer) => { destroyObservers.push(observer); }
        };
        // Call getter for current value.
        const value = getter();
        // Call destroy observers for cleanup.
        for (const observer of destroyObservers) {
            observer();
        }
        // Restore previous context.
        context = previousContext;
        // Return value from getter.
        return value;
    };
    /**
     * Evaulates a setter and returns its value.
     *
     * **Side Effect** — Atom value is evaluated.
     */
    useSetter = (predicate) => {
        // Safely get the current atom value.
        const current = this.get();
        const incoming = isPredicate(predicate) ? predicate(current) : predicate;
        const update = this.setter ? this.setter(incoming, current) : incoming;
        return update;
    };
}
export class Atom {
    static getInternal(atom) {
        return atom.__internal;
    }
    __internal;
    /** Unique atom identifier. This can be used for the `key` prop on components. */
    id = `atom${counter++}`;
    constructor(getter, setter) {
        this.__internal = new InternalAtom(this, getter, setter);
    }
    /**
     * Returns the unique identifier of this atom.
     *
     * ```
     * `${atom}`
     * ```
     */
    toString() {
        // Return unique id.
        return this.id;
    }
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
    use() {
        const { get, watch } = this.__internal;
        // Safely get the current atom value.
        const value = get();
        // Was this called inside of an atom's getter?
        if (context) {
            const { provider } = context;
            if (provider === this.__internal) {
                throw new Error("Cannot read the value of this atom inside of it's own getter.");
            }
            // Add this atom as a dependency of the context atom.
            provider.dependencies.add(this.__internal, provider.refresh);
            // Return current value.
            return value;
        }
        // Use counter state to trigger rerenders.
        const [, setState] = useState(0);
        // Attach observer to atom value.
        useEffect(() => watch(() => setState(current => current + 1)));
        // Return current value.
        return value;
    }
    /**
     * Returns the current value of the atom.
     * This will **not** hook into React components nor derived atoms.
     */
    get() {
        if (context && context.provider === this.__internal) {
            throw new Error("Cannot read the value of this atom inside of it's own getter.");
        }
        // Safely return the current value.
        return this.__internal.get();
    }
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
    set(value) {
        const { set, useSetter } = this.__internal;
        // Refine value.
        const update = useSetter(value);
        // Set value if `update` is not undefined
        if (typeof update !== 'undefined') {
            set(update);
        }
        return this;
    }
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
    do(action) {
        const { get, notify } = this.__internal;
        // Call the action.
        action(get());
        // Notify observers.
        notify();
        return this;
    }
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
    watch(observer) {
        const { get, watch } = this.__internal;
        // Call observer when value updates.
        return watch(() => observer(get()));
    }
    /**
     * Attaches a feature to this atom.
     *
     * **Warning** — This mutates the atom object; it does not return a new atom.
     */
    with(feature) {
        // Merge feature properties into this.
        Object.assign(this, feature(this, this.__internal));
        // Return `this`, which has been mutated.
        return this;
    }
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
    assertWith(feature) {
        // Merge feature properties into this.
        Object.assign(this, feature(this, this.__internal));
    }
    /**
     * Returns very basic details of this atom. Honestly, not very useful at the moment.
     *
     * @param handler If this is set to `'console'`, it will log to the console too.
     */
    debug(handler = 'console') {
        const value = {
            id: this.id,
        };
        if (handler === 'console') {
            console.log(value);
        }
        return value;
    }
}
export function atom(getter, setter) {
    // Was this called inside of an atom's getter?
    if (context) {
        const { onDestroy } = context;
        const external = new Atom(getter, setter);
        const internal = Atom.getInternal(external);
        onDestroy(internal.dependencies.unlink);
        return external;
    }
    // Return new atom.
    return new Atom(getter, setter);
}
export function useAtom(getter, setter) {
    // Memoize atom.
    const external = useMemo(() => new Atom(getter, setter), []);
    const internal = Atom.getInternal(external);
    // Hold dependencies in limbo until atom is unfrozen.
    // This is here to prevent a memory leak due to React's bad logic during strict render cycles.
    internal.dependencies.freeze();
    useEffect(() => {
        // Bind dependencies that were frozen.
        internal.dependencies.unfreeze();
        // Destroy atom.
        return internal.release;
    });
    return external;
}
export function inspectAtom(atom) {
    return [atom, Atom.getInternal(atom)];
}
export function isAtom(atom) {
    return atom instanceof Atom;
}
export function createFeature(feature) {
    return feature;
}
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
export function createOptic(factory) {
    return [factory(atom), factory(useAtom)];
}
//# sourceMappingURL=Main.js.map