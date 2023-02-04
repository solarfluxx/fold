import { useDebugValue, useEffect, useMemo, useState } from 'react';
import { atomSymbol } from './Const';
let counter = 0;
let context = null;
function isGetter(getter) {
    return typeof getter === 'function';
}
function useGetter(self, getter) {
    const previousContext = context;
    context = {
        bind: (dependency) => {
            if (!dependency.dependents.has(self)) {
                self.addDependency(dependency, () => {
                    if (self.isUseless()) {
                        self.isHot = true;
                        return;
                    }
                    self.set(useGetter(self, getter));
                });
            }
        }
    };
    const value = getter();
    context = previousContext;
    return value;
}
export function atom(getter, setter) {
    function isUseless() {
        return internal.observers.length === 0 && internal.dependents.size === 0;
    }
    function set(value) {
        // if (internal.value === value) { return; }
        internal.value = value;
        notify();
    }
    function get(isHot = false) {
        if (internal.isHot || isHot) {
            internal.set(isGetter(getter) ? useGetter(internal, getter) : getter);
            internal.isHot = false;
        }
        return internal.value;
    }
    function notify() {
        if (isUseless()) {
            return;
        }
        if (internal.observers.length > 100) {
            console.warn(`Excessive (${internal.observers.length}) observers on '${id}'`);
        }
        if (internal.dependents.size > 100) {
            console.warn(`Excessive (${internal.dependents.size}) dependents on '${id}'`);
        }
        for (const observer of internal.observers) {
            observer();
        }
        for (const [, observer] of internal.dependents) {
            observer();
        }
    }
    function addDependency(dependency, observer) {
        internal.dependencies.add(dependency);
        dependency.dependents.set(internal, observer);
    }
    const id = `atom${counter++}`;
    const features = [];
    const internal = {
        value: null,
        features: features,
        observers: [],
        dependents: new Map(),
        dependencies: new Set(),
        isHot: true,
        isUseless,
        set,
        get,
        notify,
        addDependency
    };
    const external = {
        toString: () => id,
        [atomSymbol]: internal,
        use: () => {
            const value = get();
            if (context) {
                context.bind(internal);
                return value;
            }
            const [_value, setValue] = useState(0);
            useDebugValue(value);
            useEffect(() => {
                const observer = () => setValue(_value + 1);
                internal.observers.push(observer);
                return () => { internal.observers = internal.observers.filter(peer => peer !== observer); };
            });
            return value;
        },
        get: () => get(false),
        set: (value) => {
            const incoming = (typeof value === 'function') ? value(internal.get()) : value;
            const update = setter ? setter(incoming, internal.get()) : incoming;
            if (typeof update !== 'undefined')
                internal.set(update);
            return external;
        },
        do: (action) => {
            action(internal.get());
            notify();
            return external;
        },
        watch: (action) => {
            const observer = () => action(internal.get());
            internal.observers.push(observer);
            return () => { internal.observers = internal.observers.filter(peer => peer !== observer); };
        },
        with: (feature) => {
            features.push(feature);
            Object.assign(external, feature(external, internal));
            return external;
        },
    };
    return external;
}
export function inspectAtom(atom) {
    return [atom, atom[atomSymbol]];
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
export function hasFeature(atom, feature) {
    return atom[atomSymbol].features.includes(feature);
}
export function useMemoAtom(factory, dependencies = []) {
    // Memoize atom
    const external = useMemo(factory, dependencies);
    const internal = external[atomSymbol];
    // Attach dependents
    internal.get();
    // Detach dependents for strict mode's weird second render logic
    for (const dependency of internal.dependencies) {
        dependency.dependents.delete(internal);
    }
    useEffect(() => {
        // Reattach dependents
        internal.get(true);
        return () => {
            // Cleanup dependencies when component is unloaded
            for (const dependency of internal.dependencies) {
                dependency.dependents.delete(internal);
            }
        };
    });
    return external;
}
//# sourceMappingURL=Main.js.map