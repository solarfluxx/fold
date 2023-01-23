import { atomSymbol } from './Const';

export interface BaseAtom<T, U = T, F extends Features = Features> {
	toString(): string;
	
	readonly [atomSymbol]: InternalAtom<T>;
	
	/**
	 * Subscribes to the value of this atom.
	 * When the atom value changes, it will trigger an update here.
	 * 
	 * *Supports*: React components, atom getters.
	 * 
	 * > ```
	 * > const myValue = myAtom.use();
	 * > ```
	 */
	readonly use: () => T;
	
	/**
	 * Retrieves the current atom value one time.
	 * 
	 * Any atoms accessed with `atom.use()` inside of this getter will be observed.
	 * If any of them change, this atom will update.
	 * 
	 * > IMPORTANT: This only returns the current value.
	 * > It will **not** rerender components or update atoms using it.
	 */
	readonly get: () => T;
	
	/**
	 * Passes a value to the atom's setter.
	 * 
	 * The atom will only update when one of the following happens:
	 * 1. A value is returned from the setter.
	 * 2. An atom the getter depends on is updated.
	 */
	readonly set: (value: U | ((value: U) => T)) => Atom<T, U, F>;
	
	/**
	 * Notifies observers of a mutation to the current atom value.
	 * This should only be used with object/array values.
	 * 
	 * > Array Value Example
	 * > ```
	 * > const arrayAtom = atom([1, 2]);
	 * > arrayAtom.do(current => current.push(3));
	 * > ```
	 * 
	 * > Object Property Mutation Example
	 * > ```
	 * > const objectAtom = atom({ firstName: 'John', lastName: 'Doe' });
	 * objectAtom.do(value => value.firstName = 'Jane');
	 * > ```
	 */
	readonly do: (action: (value: T) => void) => Atom<T, U, F>
	
	/**
	 * Watches this atom for changes to the value and calls the action.
	 * 
	 * > Example
	 * > ```
	 * > const counterAtom = atom(0);
	 * > const unwatch = counterAtom.watch((count) => console.log(count));
	 * > ```
	 */
	readonly watch: (action: (value: T) => void) => () => void;
	
	/**
	 * Applies a feature to the atom.
	 * Features can interface with the internal atom state and add new methods to the external atom.
	 * 
	 * > Reset Feature Example
	 * > ```
	 * > const resettableAtom = atom(2).with(resetFeature);
	 * > resettableAtom.set(6);
	 * > console.log(resettableAtom.get()); // 6
	 * > resettableAtom.reset(); // Added by `resetFeature`
	 * > console.log(resettableAtom.get()); // 2
	 * > ```
	 */
	readonly with: <FF extends Features>(feature: Feature<T, U, F, FF>) => Atom<T, U, F & FF>;
}

export type Atom<T, U = T, F extends Features = Features> = BaseAtom<T, U, F> & F;

export type Primitive = string | number | boolean | null | undefined | Function;

export type Getter<T> = () => T;
export type Setter<T, U> = (value: U, current: T) => T | void;
export type Feature<T, U, F extends Features, FF extends Features> = (external: Atom<T, U, F>, internal: InternalAtom<T>) => FF;
export type Features = { [K in string]: any };

export type Observer = () => void;

export interface InternalAtom<T> {
	/**
	 * Raw atom value.
	 * > IMPORTANT: Setting this value will not trigger updates on dependents!
	 * > Use `set()` *or* call `notify()` manually after changing this value.
	 */
	value: T;
	
	/**
	 * List of all features applied to this atom.
	 */
	features: Feature<T, any, any, any>[];
	
	/**
	 * List of observers registered to this atom.
	 * When the atom value changes, each of the callbacks here will be called.
	 * 
	 * > *Add observer*
	 * > ```
	 * > observers.push(callback)
	 * > ```
	 */
	observers: Observer[];
	
	/**
	 * Stores atoms that depend on this atom.
	 * When the atom changes, its dependents will be notified.
	 * 
	 * > *Add dependent*
	 * > ```
	 * > dependents.set(atom, callback)
	 * > ```
	 */
	dependents: Map<InternalAtom<any>, Observer>;
	
	/**
	 * When derivations change but no observers were attached at the time, this value becomes true.
	 * Inversely, when an observer is attached this becomes false.
	 */
	isHot: boolean;
	
	/**
	 * Returns true if this atom has no observers or dependents.
	 * If there are no observers or dependents, no calculations need to be made.
	 */
	readonly isUseless: () => boolean;
	
	/**
	 * Sets `value` then notifies observers and dependents of the change.
	 */
	readonly set: (value: T) => void;
	
	/**
	 * Sends an update notification to every observer and dependent.
	 */
	readonly notify: () => void;
};

export type AtomValue<T> = T extends Atom<infer V> ? V : T;

export type ExcludeAtom<T> = (
	T extends Atom<infer V> ? V
	: T extends Atom<infer V>[] ? V[]
	: { [K in keyof T]: ExcludeAtom<T[K]> }
);

export type IntersectFeatures<T> = T extends [ infer F, ...infer R ] ? (F extends Feature<any, any, any, infer FF> ? FF & IntersectFeatures<R> : IntersectFeatures<R>) : {};

export type WithFeatures<A extends Atom<any>, FF extends Feature<any, any, any, any>[]> = (
	A extends Atom<infer T, infer U, infer F> ? Atom<T, U, IntersectFeatures<[ F, ...FF ]>>
	: never
);
