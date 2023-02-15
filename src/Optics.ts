import { Atom, createFeature, createOptic } from './Main';

export const [ focusAtom, useFocusAtom ] = createOptic(generator => <T extends { [key: string]: any }, U extends keyof T>(opticAtom: Atom<T>, property: U) => {
	return generator(
		() => opticAtom.get()[property],
		(incoming) => { opticAtom.do((value) => (value[property] = incoming)) }
	).with(createFeature((_external, internal) => {
		internal.watch(() => opticAtom.do((value) => (value[property] = internal.value)));
		internal.dependencies.add(Atom.getInternal(opticAtom), () => {
			const value = opticAtom.get()[property];
			if (value !== internal.value) { internal.set(value); }
		});
		
		return {};
	}));
});
