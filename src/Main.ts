import { DependencyList, useDebugValue, useEffect, useMemo, useState } from 'react';
import { atomSymbol } from './Const';
import { AnyValue as AnyType, Feature, FeatureMixin, Getter, Observer, Primitive, Setter } from './Types';

let counter = 0;
let context: null | { bind: (atom: InternalAtom<any>) => void } = null;

function isGetter<T>(getter: Primitive<T> | Getter<T>): getter is Getter<T> {
	return typeof getter === 'function';
}

export class InternalAtom<T> {
	/** Stores the atoms that this atom relies on. */
	private __dependencies = new Set<InternalAtom<any>>();
	/** Backup of dependencies. */
	private __dependenciesBackup = new Map<InternalAtom<any>, Observer>();
	/** Stores the atoms that rely on this atom. */
	private __dependents = new Map<InternalAtom<any>, Observer>();
	/** Stores the observers of this value. */
	private __observers: Observer[] = [];
	
	/** Unique atom identifier. This can be used for the `key` prop on components. */
	public readonly id = `atom${counter++}`;
	
	/**
	 * This is the true value of this atom.
	 * 
	 * **Important** — Setting this value will not trigger updates on observers! Use `set()` instead.
	 * 
	 * **Warning** — Be very careful when reading this value since it may not have been set yet. Use `get()` for safety.
	 */
	public value!: T;
	
	/** True when dependencies change but there are no observers to update; a get compute would be unnecessary. */
	public isHot = true;
	
	public dependencies = {
		list: () => {
			return { observers: this.__observers, dependents: this.__dependents, dependencies: this.__dependencies } as const;
		},
		add: (dependency: InternalAtom<any>, observer: Observer) => {
			this.__dependencies.add(dependency);
			dependency.__dependents.set(this, observer);
		},
		remove: (dependency: InternalAtom<any>) => {
			this.__dependencies.delete(dependency);
			dependency.__dependents.delete(this);
		},
		/** Clear all dependencies. */
		revoke: () => {
			for (const dependency of this.__dependencies) {
				this.__dependenciesBackup.set(dependency, dependency.__dependents.get(this) as Observer);
				dependency.__dependents.delete(this);
			}
			
			console.log('REVOKE', this.id, this.__dependenciesBackup.size, this.__dependencies.size);
			
			this.__dependencies = new Set();
		},
		/** Restore dependencies cleared by `revoke()`. */
		restore: () => {
			for (const [ dependency, observer ] of this.__dependenciesBackup) {
				this.dependencies.add(dependency, observer);
			}
			
			console.log('RESTORE', this.id, this.__dependenciesBackup.size, this.__dependencies.size);
			
			this.__dependenciesBackup = new Map();
		},
	};
	
	constructor(public __external: Atom<T, any>) {}
	
	private useGetter(getter: Getter<T>) {
		const previousContext = context;
		context = {
			bind: (dependency) => {
				if (!dependency.__dependents.has(this)) {
					this.dependencies.add(dependency, () => {
						if (this.isFree()) { return this.isHot = true; }
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
	}
	
	get = () => {
		if (this.isHot) {
			const { getter } = this.__external;
			this.value = isGetter(getter) ? this.useGetter(getter) : getter;
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
	 * Sends an update notification to every observer associated with this atom.
	 */
	notify = () => {
		if (this.__observers.length > 100) { console.warn(`Excessive (${this.__observers.length}) observers on '${this.id}'`) }
		if (this.__dependents.size > 100) { console.warn(`Excessive (${this.__dependents.size}) observers on '${this.id}'`) }
		console.log('INTERNAL NOTIFY', this);
		for (const observer of this.__observers) { observer() }
		for (const [, observer] of this.__dependents) { observer() }
	}
	
	/** Adds an observer that will be called when the value changes. */
	watch = (observer: Observer) => {
		this.__observers.push(observer);
		return () => {
			const index = this.__observers.indexOf(observer);
			if (index < 0) { return; }
			this.__observers.splice(index, 1);
		};
	}
}

export class Atom<T, U = T> {
	static getInternal(atom: Atom<any>) {
		return atom.__internal;
	}
	
	private __internal: InternalAtom<T> = new InternalAtom(this);
	
	public [atomSymbol] = true;
	
	constructor(initial: Primitive<T>);
	constructor(initial: Primitive<T>, setter: Setter<T, U>);
	constructor(getter: Getter<T>);
	constructor(getter: Getter<T>, setter: Setter<T, U>);
	constructor(public getter: Primitive<T> | Getter<T>, public setter?: Setter<T, U>) {}
	
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
	
	set(value: Primitive<U> | ((current: T) => U)) {
		const { get, set } = this.__internal;
		const current = get();
		const incoming = typeof value === 'function' ? (value as (value: T) => U)(current) : value;
		const update = this.setter ? this.setter(incoming, current) : (incoming as unknown as T);
		if (typeof update !== 'undefined') { set(update); }
		return this;
	}
	
	do(action?: (current: T) => void) {
		const { get, notify } = this.__internal;
		action?.(get());
		notify();
		console.log('EXTERNAL DO', this.__internal.isHot);
		return this;
	}
	
	watch(observer: (current: T) => void) {
		const { get, watch } = this.__internal;
		return watch(() => observer(get()));
	}
	
	with<F extends FeatureMixin>(feature: Feature<T, U, F>) {
		Object.assign(this, feature(this, this.__internal));
		return this as this & F;
	}
}

export function atom<T>(initial: Primitive<T>): Atom<T>;
export function atom<T, U = T>(initial: Primitive<T>, setter: Setter<T, U>): Atom<T, U>;
export function atom<T>(getter: Getter<T>): Atom<T>;
export function atom<T, U = T>(getter: Getter<T>, setter: Setter<T, U>): Atom<T, U>;
export function atom<T, U = T>(getter: Primitive<T> | Getter<T>, setter?: Setter<T, U>): Atom<T, U> {
	return new Atom(getter as Getter<T>, setter as Setter<T, U>);
}

export function inspectAtom(atom: Atom<any>) {
	return [ atom, Atom.getInternal(atom) ] as const;
}

export function isAtom<T, U>(atom: Atom<T, U> | AnyType): atom is Atom<T, U> {
	try { return atomSymbol in (atom as any); }
	catch { return false; }
}

export function createFeature<F extends FeatureMixin, T = any, U = any>(feature: Feature<T, U, F>) {
	return feature;
}

export function useMemoAtom<T extends Atom<any>>(factory: () => T, dependencies: DependencyList = []) {
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
