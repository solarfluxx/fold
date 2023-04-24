import { useEffect, useMemo, useState } from 'react';
import { AnyValue as AnyType, Feature, FeatureMixin, Getter, Observer, Primitive, Setter } from './Types';

type AtomContext = { provider: InternalAtom<any>, onDestroy: (observer: Observer) => void };

let counter = 0;
let context: AtomContext | null = null;

function isGetter<T>(getter: Primitive<T> | Getter<T>): getter is Getter<T> {
	return typeof getter === 'function';
}

function isPredicate<T, U>(predicate: Primitive<U> | ((current: T) => U)): predicate is ((current: T) => U) {
	return typeof predicate === 'function';
}

export class InternalAtom<T> {
	/** Stores the listeners attached to this value. */
	private __observers: Observer[] = [];
	/** Stores the atoms that this atom relies on. */
	private __dependencies = new Set<InternalAtom<any>>();
	/* Holds dependencies in limbo. */
	private __incomingDependencies = new Map<InternalAtom<any>, Observer>();
	/** Stores the atoms that rely on this atom. */
	private __dependents = new Map<InternalAtom<any>, Observer>();
	/** Determines whether new dependencies will be sent to limbo. */
	private __dependenciesFrozen = false;
	
	/**
	 * This is the true value of this atom. This value is a cache which makes read/write unstable (See below).
	 * 
	 * **Warning** — Setting this value will not trigger updates on observers! Use `set()` if that is desired.
	 * 
	 * **Warning** — Be very careful when reading this value since it may not be set or may be out of date! Use `get()` for safety.
	 */
	public value!: T;
	
	/** True when dependencies change but there are no observers to update; a getter compute would be unnecessary. */
	public isHot = true;
	
	public dependencies = {
		list: () => {
			return { observers: this.__observers, dependents: this.__dependents, dependencies: this.__dependencies } as const;
		},
		add: (dependency: InternalAtom<any>, observer: Observer) => {
			if (this.__dependenciesFrozen) {
				this.__incomingDependencies.set(dependency, observer);
				return;
			}
			
			this.__dependencies.add(dependency);
			dependency.__dependents.set(this, observer);
		},
		remove: (dependency: InternalAtom<any>) => {
			this.__dependencies.delete(dependency);
			dependency.__dependents.delete(this);
		},
		unlink: () => {
			for (const dependency of this.__dependencies) { this.dependencies.remove(dependency); }
			for (const [ dependent ] of this.__dependents) { dependent.dependencies.remove(this); }
		},
		freeze: () => {
			this.__dependenciesFrozen = true;
		},
		unfreeze: () => {
			this.__dependenciesFrozen = false;
			for (const [ dependency, observer ] of this.__incomingDependencies) {
				this.dependencies.add(dependency, observer);
			}
		},
	};
	
	constructor(
		public readonly __external: Atom<T, any>,
		public readonly getter: Primitive<T> | Getter<T>,
		public readonly setter?: Setter<T, any>
	) {}
	
	isFree = () => {
		return this.__observers.length === 0 && this.__dependents.size === 0;
	}
	
	get = () => {
		if (this.isHot) {
			this.value = this.useGetter();
			this.isHot = false;
		}
		
		return this.value;
	}
	
	/**
	 * Sets `value` then calls `notify()` to notify observers of the new value.
	 */
	set = (value: T) => {
		this.value = value;
		this.notify();
	}
	
	/**
	 * Sets `value` using the getter/initial value.
	 */
	refresh = () => {
		if (this.isFree()) {
			this.isHot = true;
			return;
		}
		
		this.set(this.useGetter());
	}
	
	/**
	 * Sends an update notification to every observer associated with this atom.
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
		
		for (const observer of this.__observers) { observer() }
		for (const [, observer] of this.__dependents) { observer() }
	}
	
	/** Adds an observer that will be called when the value changes. */
	watch = (observer: Observer) => {
		this.__observers.push(observer);
		return () => {
			const index = this.__observers.indexOf(observer);
			if (index < 0) { return }
			this.__observers.splice(index, 1);
		};
	}
	
	/**
	 * Destroys this atom.
	 * 
	 * **Warning** — This is a permanent action. This should only be called after this atom is done being used.
	 */
	destroy = () => {
		this.__observers = [];
		this.dependencies.unlink();
	}
	
	useGetter = () => {
		const { getter } = this;
		
		// If there is no getter, use initial value.
		if (!isGetter(getter)) { return getter }
		
		// Save previous context so it can be restored.
		const previousContext = context;
		
		// This stores the listeners that need to be called when the new context is destroyed.
		const destroyObservers: Observer[] = [];
		
		// Set new context.
		context = {
			provider: this,
			onDestroy: (observer) => { destroyObservers.push(observer) }
		};
		
		// Call getter for current value.
		const value = getter();
		
		// Call destroy observers for cleanup.
		for (const observer of destroyObservers) { observer() }
		
		// Restore previous context.
		context = previousContext;
		
		// Return value from getter.
		return value;
	}
	
	useSetter = <U>(predicate: Primitive<U> | ((current: T) => U)) => {
		// Safely get the current atom value.
		const current = this.get();
		
		const incoming = isPredicate(predicate) ? predicate(current) : predicate;
		const update = this.setter ? this.setter(incoming, current) : (incoming as U extends T ? T : never);
		
		return update;
	}
}

export class Atom<T, U = T> {
	static getInternal(atom: Atom<any>) {
		return atom.__internal;
	}
	
	private readonly __internal: InternalAtom<T>;
	
	/** Unique atom identifier. This can be used for the `key` prop on components. */
	public readonly id = `atom${counter++}`;
	
	constructor(initial: Primitive<T>);
	constructor(initial: Primitive<T>, setter: Setter<T, U>);
	constructor(getter: Getter<T>);
	constructor(getter: Getter<T>, setter: Setter<T, U>);
	constructor(getter: Primitive<T> | Getter<T>, setter?: Setter<T, U>) {
		this.__internal = new InternalAtom(this, getter, setter);
	}
	
	toString() {
		// Return unique id.
		return this.id;
	}
	
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
		const [ , setState ] = useState(0);
		
		// Attach observer to atom value.
		useEffect(() => watch(() => setState(current => current + 1)));
		
		// Return current value.
		return value;
	}
	
	get() {
		if (context && context.provider === this.__internal) {
			throw new Error("Cannot read the value of this atom inside of it's own getter.");
		}
		
		// Safely return the current value.
		return this.__internal.get();
	}
	
	set(value: Primitive<U> | ((current: T) => U)) {
		const { set, useSetter } = this.__internal;
		
		// Refine value.
		const update = useSetter(value);
		
		// Set value if `update` is not undefined
		if (typeof update !== 'undefined') { set(update) }
		
		return this;
	}
	
	do(action: (current: T) => void) {
		const { get, notify } = this.__internal;
		
		// Call the action.
		action(get());
		
		// Notify observers.
		notify();
		
		return this;
	}
	
	watch(observer: (current: T) => void) {
		const { get, watch } = this.__internal;
		
		// Call observer when value updates.
		return watch(() => observer(get()));
	}
	
	with<F extends FeatureMixin>(feature: Feature<T, U, F>) {
		// Merge feature properties into this.
		Object.assign(this, feature(this, this.__internal));
		
		// Return this; which has been mutated.
		return this as this & F;
	}
	
	debug(handler: 'console' | 'inline' = 'console') {
		const value = {
			id: this.id,
		};
		
		if (handler === 'console') {
			console.log(value);
		}
		
		return value;
	}
}

export function atom<T>(initial: Primitive<T>): Atom<T>;
export function atom<T, U = T>(initial: Primitive<T>, setter: Setter<T, U>): Atom<T, U>;
export function atom<T>(getter: Getter<T>): Atom<T>;
export function atom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U>;
export function atom<T, U = T>(getter: Primitive<T> | Getter<T>, setter?: Setter<T, U>): Atom<T, U> {
	// Was this called inside of an atom's getter?
	if (context) {
		const { onDestroy } = context;
		
		const external = new Atom(getter as any, setter as any);
		const internal = Atom.getInternal(external);
		
		onDestroy(internal.dependencies.unlink);
		
		return external;
	}
	
	// Return new atom.
	return new Atom(getter as any, setter as any);
}

//! This could be merged into `atom` if React supports a way to check if hooks are enabled (AKA check if this code is running inside of a component).
export function useAtom<T>(initial: Primitive<T>): Atom<T>;
export function useAtom<T, U = T>(initial: Primitive<T>, setter: Setter<T, U>): Atom<T, U>;
export function useAtom<T>(getter: Getter<T>): Atom<T>;
export function useAtom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U>;
export function useAtom<T, U = T>(getter: Primitive<T> | Getter<T>, setter?: Setter<T, U>): Atom<T, U> {
	// Memoize atom.
	const external = useMemo(() => new Atom(getter as any, setter as any), []);
	const internal = Atom.getInternal(external);
	
	// Hold dependencies in limbo until atom is unfrozen.
	// This is here to prevent a memory leak due to React's bad logic during strict render cycles.
	internal.dependencies.freeze();
	
	useEffect(() => {
		// Bind dependencies that were frozen.
		internal.dependencies.unfreeze();
		
		// Destroy atom.
		return internal.destroy;
	});
	
	return external;
}

export function inspectAtom(atom: Atom<any>) {
	return [ atom, Atom.getInternal(atom) ] as const;
}

export function isAtom<T, U>(atom: Atom<T, U> | AnyType): atom is Atom<T, U> {
	return atom instanceof Atom;
}

export function createFeature<F extends FeatureMixin, T = any, U = any>(feature: Feature<T, U, F>) {
	return feature;
}

export function createOptic<T extends (...parameters: any) => Atom<any>>(optic: (generator: typeof atom | typeof useAtom) => T) {
	return [ optic(atom), optic(useAtom) ] as const;
}
