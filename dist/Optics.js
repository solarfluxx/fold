import { Atom, createFeature, createOptic } from './Main';
export const [focusAtom, useFocusAtom] = createOptic(generator => (opticAtom, property) => {
    return generator(() => opticAtom.get()[property], (incoming) => { opticAtom.do((value) => (value[property] = incoming)); }).with(createFeature((external, internal) => {
        external.watch(incoming => {
            const opticValue = opticAtom.get()[property];
            if (opticValue !== incoming) {
                opticAtom.do((optic) => (optic[property] = incoming));
            }
        });
        internal.dependencies.add(Atom.getInternal(opticAtom), () => {
            const opticValue = opticAtom.get()[property];
            if (opticValue !== internal.value) {
                internal.set(opticValue);
            }
        });
        return {};
    }));
});
//# sourceMappingURL=Optics.js.map