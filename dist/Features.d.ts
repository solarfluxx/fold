export declare const resetFeature: import("./Types").Feature<any, any, {}, {
    /**
     * Resets the atom to the value it had when this reset feature was applied.
     */
    reset: () => void;
    /**
     * Gets the value that this atom will be reset to when `reset()` is called.
     */
    getResetValue: () => any;
    /**
     * Sets the value that this atom will be reset to when `reset()` is called.
     */
    setResetValue: (value: any) => void;
}>;
export declare const hashFeature: import("./Types").Feature<any, any, {}, {
    hash: string;
}>;
export declare const arrayFeature: import("./Types").Feature<any[], any, {}, {
    push: (...items: any[]) => void;
    filter: (predicate: (value: any[], index: number, array: any[]) => value is any[]) => void;
}>;
export declare function asyncFeature<T>(data: () => Promise<T>): import("./Types").Feature<T, any, {}, {
    isLoadingAtom: import("./Main").Atom<boolean, boolean>;
}>;
export declare function localStorageFeature(key: string): import("./Types").Feature<any, any, {}, {}>;
export declare function sessionStorageFeature(key: string): import("./Types").Feature<any, any, {}, {}>;
