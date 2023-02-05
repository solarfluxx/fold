import { useDebugValue, useEffect, useMemo, useState } from 'react';
import { atomSymbol } from './Const';
let counter = 0;
let context = null;
function isGetter(getter) {
    return typeof getter === 'function';
}
export class InternalAtom {
    __external;
    /** Stores the atoms that this atom relies on. */
    __dependencies = new Set();
    /** Backup of dependencies. */
    __dependenciesBackup = new Map();
    /** Stores the atoms that rely on this atom. */
    __dependents = new Map();
    /** Stores the observers of this value. */
    __observers = [];
    /** Unique atom identifier. This can be used for the `key` prop on components. */
    id = `atom${counter++}`;
    /**
     * This is the true value of this atom.
     *
     * **Important** — Setting this value will not trigger updates on observers! Use `set()` instead.
     *
     * **Warning** — Be very careful when reading this value since it may not have been set yet. Use `get()` for safety.
     */
    value;
    /** True when dependencies change but there are no observers to update; a get compute would be unnecessary. */
    isHot = true;
    dependencies = {
        list: () => {
            return { observers: this.__observers, dependents: this.__dependents, dependencies: this.__dependencies };
        },
        add: (dependency, observer) => {
            this.__dependencies.add(dependency);
            dependency.__dependents.set(this, observer);
        },
        remove: (dependency) => {
            this.__dependencies.delete(dependency);
            dependency.__dependents.delete(this);
        },
        /** Clear all dependencies. */
        revoke: () => {
            for (const dependency of this.__dependencies) {
                this.__dependenciesBackup.set(dependency, dependency.__dependents.get(this));
                dependency.__dependents.delete(this);
            }
            console.log('REVOKE', this.id, this.__dependenciesBackup.size, this.__dependencies.size);
            this.__dependencies = new Set();
        },
        /** Restore dependencies cleared by `revoke()`. */
        restore: () => {
            for (const [dependency, observer] of this.__dependenciesBackup) {
                this.dependencies.add(dependency, observer);
            }
            console.log('RESTORE', this.id, this.__dependenciesBackup.size, this.__dependencies.size);
            this.__dependenciesBackup = new Map();
        },
    };
    constructor(__external) {
        this.__external = __external;
    }
    useGetter(getter) {
        const previousContext = context;
        context = {
            bind: (dependency) => {
                if (!dependency.__dependents.has(this)) {
                    this.dependencies.add(dependency, () => {
                        if (this.isFree()) {
                            return this.isHot = true;
                        }
                        this.set(this.useGetter(getter));
                    });
                }
            }
        };
        const value = getter();
        context = previousContext;
        return value;
    }
    isFree = () => {
        return this.__observers.length === 0 && this.__dependents.size === 0;
    };
    get = () => {
        if (this.isHot) {
            const { getter } = this.__external;
            this.value = isGetter(getter) ? this.useGetter(getter) : getter;
            this.isHot = false;
        }
        return this.value;
    };
    /**
     * Sets `value` then calls `notify()` to notify observers of the new value.
     */
    set = (value) => {
        this.value = value;
        this.notify();
    };
    /**
     * Sends an update notification to every observer associated with this atom.
     */
    notify = () => {
        if (this.__observers.length > 100) {
            console.warn(`Excessive (${this.__observers.length}) observers on '${this.id}'`);
        }
        if (this.__dependents.size > 100) {
            console.warn(`Excessive (${this.__dependents.size}) observers on '${this.id}'`);
        }
        console.log('INTERNAL NOTIFY', this);
        for (const observer of this.__observers) {
            observer();
        }
        for (const [, observer] of this.__dependents) {
            observer();
        }
    };
    /** Adds an observer that will be called when the value changes. */
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
}
export class Atom {
    getter;
    setter;
    static getInternal(atom) {
        return atom.__internal;
    }
    __internal = new InternalAtom(this);
    [atomSymbol] = true;
    constructor(getter, setter) {
        this.getter = getter;
        this.setter = setter;
    }
    toString() {
        return this.__internal.id;
    }
    use() {
        const { get, watch } = this.__internal;
        const value = get();
        if (context) {
            // Use as dependency
            context.bind(this.__internal);
            return value;
        }
        // Use as react hook
        const [, setCount] = useState(0);
        useDebugValue(value);
        useEffect(() => watch(() => setCount(count => count + 1)), []);
        return value;
    }
    get() {
        return this.__internal.get();
    }
    set(value) {
        const { get, set } = this.__internal;
        const current = get();
        const incoming = typeof value === 'function' ? value(current) : value;
        const update = this.setter ? this.setter(incoming, current) : incoming;
        if (typeof update !== 'undefined') {
            set(update);
        }
        return this;
    }
    do(action) {
        const { get, notify } = this.__internal;
        action?.(get());
        notify();
        console.log('EXTERNAL DO', this.__internal.isHot);
        return this;
    }
    watch(observer) {
        const { get, watch } = this.__internal;
        return watch(() => observer(get()));
    }
    with(feature) {
        Object.assign(this, feature(this, this.__internal));
        return this;
    }
}
export function atom(getter, setter) {
    return new Atom(getter, setter);
}
export function inspectAtom(atom) {
    return [atom, Atom.getInternal(atom)];
}
export function isAtom(atom) {
    try {
        return atomSymbol in atom;
    }
    catch {
        return false;
    }
}
export function createFeature(feature) {
    return feature;
}
export function useMemoAtom(factory, dependencies = []) {
    // Memoize atom
    const external = useMemo(factory, dependencies);
    const internal = Atom.getInternal(external);
    // Attach dependents
    internal.get();
    // Detach dependents to fix weird strict mode logic
    internal.dependencies.revoke();
    useEffect(() => {
        // Reattach dependents
        internal.dependencies.restore();
        // Detach dependencies when component is unmounted
        return internal.dependencies.revoke;
    });
    return external;
}
//# sourceMappingURL=Main.js.map