import { v4 as randomUUID } from 'uuid';
import { atom, createFeature } from './Main';
export const resetFeature = createFeature((external, internal) => {
    const initial = external.get();
    return {
        /**
         * Resets the atom to the value it had when this reset feature was applied.
         */
        reset: () => internal.set(initial),
    };
});
export const hashFeature = createFeature(() => {
    return { hash: randomUUID() };
});
export const arrayFeature = createFeature((_external, internal) => {
    return {
        push: (...items) => {
            internal.value.push(...items);
            internal.notify();
        },
        filter: (predicate) => {
            internal.value = internal.value.filter(predicate);
            internal.notify();
        },
    };
});
export function asyncFeature(data) {
    return createFeature((_external, internal) => {
        const isLoadingAtom = atom(true);
        data().then(awaited => {
            internal.set(awaited);
            isLoadingAtom.set(false);
        });
        return { isLoadingAtom };
    });
}
export function localStorageFeature(key) {
    return createFeature((external, internal) => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            internal.set(value);
        }
        external.watch(value => localStorage.setItem(key, value));
        return {};
    });
}
export function sessionStorageFeature(key) {
    return createFeature((external, internal) => {
        const value = sessionStorage.getItem(key);
        if (value !== null) {
            internal.set(value);
        }
        external.watch(value => sessionStorage.setItem(key, value));
        return {};
    });
}
//# sourceMappingURL=Features.js.map