import { v4 as randomUUID } from 'uuid';
import { atom, createFeature } from './Main';
import { InternalAtom } from './Types';

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

export const arrayFeature = createFeature((_external, internal: InternalAtom<any[]>) => {
	type V = typeof internal extends InternalAtom<infer T> ? T : never;
	return {
		push: (...items: V) => {
			internal.value.push(...items);
			internal.notify();
		},
		filter: (predicate: (value: V, index: number, array: any[]) => value is V) => {
			internal.value = internal.value.filter(predicate);
			internal.notify();
		},
	};
});

export function asyncFeature<T>(data: () => Promise<T>) {
	return createFeature((_external, internal: InternalAtom<T>) => {
		const isLoadingAtom = atom(true);
		data().then(awaited => {
			internal.set(awaited);
			isLoadingAtom.set(false);
		});
		return { isLoadingAtom };
	});
}

export function localStorageFeature(key: string) {
	return createFeature((external, internal) => {
		const value = localStorage.getItem(key);
		if (value !== null) { internal.set(JSON.parse(value)); }
		external.watch(value => localStorage.setItem(key, JSON.stringify(value)));
		return {};
	});
}

export function sessionStorageFeature(key: string) {
	return createFeature((external, internal) => {
		const value = sessionStorage.getItem(key);
		if (value !== null) { internal.set(JSON.parse(value)); }
		external.watch(value => sessionStorage.setItem(key, JSON.stringify(value)));
		return {};
	});
}
