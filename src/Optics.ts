import { atomSymbol } from './Const';
import { atom, createFeature } from './Main';
import { Atom } from './Types';

export function focusAtom<T extends { [key: string]: any }, U extends keyof T>(opticAtom: Atom<T>, property: U) {
	return atom(
		() => opticAtom.get()[property],
		(incoming) => { opticAtom.do((value) => (value[property] = incoming)) }
	).with(createFeature((_external, internal) => {
		opticAtom[atomSymbol].dependents.set(internal, () => {
			const value = opticAtom.get()[property];
			if (value !== internal.value) { internal.set(value); }
		});
		
		return {};
	}));
}
