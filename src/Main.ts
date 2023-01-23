import { useDebugValue, useEffect, useState } from 'react';
import { atomSymbol } from './Const';
import { Atom, Feature, Features, Getter, InternalAtom, Primitive, Setter } from './Types';

let counter = 0;
let context: null | { bind: (atom: InternalAtom<any>) => void } = null;

function isGetter<T>(getter: T | Getter<T>): getter is Getter<T> {
	return typeof getter === 'function';
}

function useGetter<T>(atom: InternalAtom<any>, getter: Getter<T>) {
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

export function atom<T>(initial: Exclude<T, Function>): Atom<T, T, {}>;
export function atom<T, U = T>(initial: Exclude<T, Function>, setter: Setter<T, U>): Atom<T, U, {}>;
export function atom<T>(getter: Getter<T>): Atom<T, T, {}>;
export function atom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U, {}>;
export function atom<T, U = T>(getter: T | Getter<T>, setter?: Setter<T, U>): Atom<T, U, {}> {
	const id = `atom${counter++}`;
	const internal = {} as InternalAtom<T>;
	const features: Feature<T, U, any, any>[] = [];
	
	function isUseless() {
		return internal.observers.length === 0 && internal.dependents.size === 0;
	}
	
	function set(value: T) {
		internal.value = value;
		notify();
	}
	
	function notify() {
		if (isUseless()) { return; }
		if (internal.observers.length > 100) { console.warn(`Excessive (>100) observers on atom: '${id}'`); }
		if (internal.dependents.size > 10) { console.warn(`Excessive (>10) dependents on atom: '${id}'`); }
		for (const observer of internal.observers) { observer(); }
		for (const [, observer ] of internal.dependents) { observer(); }
	};
	
	Object.assign(internal, {
		value: isGetter(getter) ? useGetter(internal, getter) : getter,
		features: [],
		observers: [],
		dependents: new Map(),
		isHot: false,
		isUseless,
		set,
		notify,
	} satisfies InternalAtom<T>);
	
	const external: Atom<T, U> = {
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
			
			const [ value, setValue ] = useState(0);
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
			const incoming = (typeof value === 'function') ? (value as ((value: T) => U))(internal.value) : value;
			const update = setter ? setter(incoming, internal.value) : (incoming as unknown as T);
			if (typeof update !== 'undefined') internal.set(update);
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
			return () => { internal.observers = internal.observers.filter(peer => peer !== observer); }
		},
		with: (feature) => {
			features.push(feature);
			Object.assign(external, feature(external, internal));
			return external as any;
		},
	}
	
	return external;
}

export function inspectAtom(atom: Atom<any>) {
	return [ atom, atom[atomSymbol] ];
}

export function isAtom<T, U, F extends Features>(atom: Atom<T, U, F> | Primitive | object): atom is Atom<T, U, F> {
	try { return atomSymbol in (atom as any); }
	catch { return false; }
}

export function createFeature<FF extends Features, T = any, U = any, F extends Features = Features>(feature: Feature<T, U, F, FF>) {
	return feature;
}
