import { Atom } from './Types';
export declare function focusAtom<T extends {
    [key: string]: any;
}, U extends keyof T>(opticAtom: Atom<T>, property: U): import("./Types").BaseAtom<T[U], T[U], {}>;
