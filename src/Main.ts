import { DependencyList, useCallback, useDebugValue, useEffect, useMemo, useState } from 'react';
import { atomSymbol } from './Const';
import { Atom, Feature, Features, Getter, InternalAtom, Observer, Primitive, Setter, WithFeatures } from './Types';

let counter = 0;
let context: null | { bind: (atom: InternalAtom<any>) => void } = null;

function isGetter<T>(getter: T | Getter<T>): getter is Getter<T> {
	return typeof getter === 'function';
}

function useGetter<T>(self: InternalAtom<any>, getter: Getter<T>) {
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

export function atom<T>(initial: Exclude<T, Function>): Atom<T, T, {}>;
export function atom<T, U = T>(initial: Exclude<T, Function>, setter: Setter<T, U>): Atom<T, U, {}>;
export function atom<T>(getter: Getter<T>): Atom<T, T, {}>;
export function atom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U, {}>;
export function atom<T, U = T>(getter: T | Getter<T>, setter?: Setter<T, U>): Atom<T, U, {}> {
	function isUseless() {
		return internal.observers.length === 0 && internal.dependents.size === 0;
	}
	
	function set(value: T) {
		// if (internal.value === value) { return; }
		internal.value = value;
		notify();
	}
	
	function get(isHot: boolean = false) {
		if (internal.isHot || isHot) {
			internal.set(isGetter(getter) ? useGetter(internal, getter) : getter);
			internal.isHot = false;
		}
		
		return internal.value;
	}
	
	function notify() {
		if (isUseless()) { return; }
		if (internal.observers.length > 100) { console.warn(`Excessive (${internal.observers.length}) observers on '${id}'`); }
		if (internal.dependents.size > 100) { console.warn(`Excessive (${internal.dependents.size}) dependents on '${id}'`); }
		for (const observer of internal.observers) { observer(); }
		for (const [, observer] of internal.dependents) { observer(); }
	}
	
	function addDependency(dependency: InternalAtom<any>, observer: Observer) {
		internal.dependencies.add(dependency);
		dependency.dependents.set(internal, observer);
	}
	
	const id = `atom${counter++}`;
	const features: Feature<T, U, any, any>[] = [];
	const internal: InternalAtom<T> = {
		value: null as any,
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
	
	const external: Atom<T, U> = {
		toString: () => id,
		[atomSymbol]: internal,
		use: () => {
			const value = get();
			
			if (context) {
				context.bind(internal);
				return value;
			}
			
			const [ _value, setValue ] = useState(0);
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
			const incoming = (typeof value === 'function') ? (value as ((value: T) => U))(internal.get()) : value;
			const update = setter ? setter(incoming, internal.get()) : (incoming as unknown as T);
			if (typeof update !== 'undefined') internal.set(update);
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
	return [ atom, atom[atomSymbol] ] as const;
}

export function isAtom<T, U, F extends Features>(atom: Atom<T, U, F> | Primitive | object): atom is Atom<T, U, F> {
	try { return atomSymbol in (atom as any); }
	catch { return false; }
}

export function createFeature<FF extends Features, T = any, U = any, F extends Features = Features>(feature: Feature<T, U, F, FF>) {
	return feature;
}

export function hasFeature<F extends Feature<any, any, Features, Features>>(atom: Atom<any>, feature: F): atom is WithFeatures<typeof atom, [ F ]> {
	return atom[atomSymbol].features.includes(feature);
}

export function useMemoAtom<T extends Atom<any>>(factory: () => T, dependencies: DependencyList = []) {
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
