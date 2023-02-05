import { Atom } from './Main';
export declare function focusAtom<T extends {
    [key: string]: any;
}, U extends keyof T>(opticAtom: Atom<T>, property: U): Atom<T[U], T[U]>;
