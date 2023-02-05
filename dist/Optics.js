import { Atom, atom, createFeature } from './Main';
export function focusAtom(opticAtom, property) {
    return atom(() => opticAtom.get()[property], (incoming) => { opticAtom.do((value) => (value[property] = incoming)); }).with(createFeature((_external, internal) => {
        internal.dependencies.add(Atom.getInternal(opticAtom), () => {
            const value = opticAtom.get()[property];
            if (value !== internal.value) {
                internal.set(value);
            }
        });
        return {};
    }));
}
//# sourceMappingURL=Optics.js.map