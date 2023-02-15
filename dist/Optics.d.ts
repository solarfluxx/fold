import { Atom } from './Main';
export declare const focusAtom: <T extends {
    [key: string]: any;
}, U extends keyof T>(opticAtom: Atom<T, T>, property: U) => Atom<T[U], T[U]>, useFocusAtom: <T extends {
    [key: string]: any;
}, U extends keyof T>(opticAtom: Atom<T, T>, property: U) => Atom<T[U], T[U]>;
