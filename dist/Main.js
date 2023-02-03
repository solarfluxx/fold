import { useDebugValue, useEffect, useState } from 'react';
import { atomSymbol } from './Const';
let counter = 0;
let context = null;
function isGetter(getter) {
    return typeof getter === 'function';
}
function useGetter(atom, getter) {
    const previousContext = context;
    context = {
        bind: (peer) => {
            if (!peer.dependents.has(atom)) {
                peer.dependents.set(atom, () => {
                    if (atom.isUseless()) {
                        atom.isHot = true;
                        return;
                    }
                    atom.set(useGetter(atom, getter));
                });
            }
            // return () => void peer.dependents.delete(atom);
        }
    };
    const value = getter();
    context = previousContext;
    return value;
}
export function atom(getter, setter) {
    const id = `atom${counter++}`;
    const internal = {};
    const features = [];
    function isUseless() {
        return internal.observers.length === 0 && internal.dependents.size === 0;
    }
    function set(value) {
        internal.value = value;
        notify();
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
    ;
    Object.assign(internal, {
        value: isGetter(getter) ? useGetter(internal, getter) : getter,
        features: [],
        observers: [],
        dependents: new Map(),
        isHot: false,
        isUseless,
        set,
        notify,
    });
    const external = {
        toString: () => id,
        [atomSymbol]: internal,
        use: () => {
            if (context) {
                context.bind(internal);
                return internal.value;
            }
            if (internal.isHot) {
                internal.set(isGetter(getter) ? useGetter(internal, getter) : getter);
                internal.isHot = false;
            }
            const [value, setValue] = useState(0);
            useDebugValue(internal.value);
            useEffect(() => {
                const observer = () => setValue(value + 1);
                internal.observers.push(observer);
                return () => { internal.observers = internal.observers.filter(peer => peer !== observer); };
            });
            return internal.value;
        },
        get: () => internal.value,
        set: (value) => {
            const incoming = (typeof value === 'function') ? value(internal.value) : value;
            const update = setter ? setter(incoming, internal.value) : incoming;
            if (typeof update !== 'undefined')
                internal.set(update);
            return external;
        },
        do: (action) => {
            action(internal.value);
            notify();
            return external;
        },
        watch: (action) => {
            const observer = () => action(internal.value);
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
//# sourceMappingURL=Main.js.map