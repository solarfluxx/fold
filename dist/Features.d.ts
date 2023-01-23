export declare const resetFeature: import("./Types").Feature<any, any, import("./Types").Features, {
    /**
     * Resets the atom to the value it had when this reset feature was applied.
     */
    reset: () => void;
}>;
export declare const hashFeature: import("./Types").Feature<any, any, import("./Types").Features, {
    hash: string;
}>;
export declare const arrayFeature: import("./Types").Feature<any[], any, import("./Types").Features, {
    push: (...items: any[]) => void;
    filter: (predicate: (value: any[], index: number, array: any[]) => value is any[]) => void;
}>;
export declare function asyncFeature<T>(data: () => Promise<T>): import("./Types").Feature<T, any, import("./Types").Features, {
    isLoadingAtom: import("./Types").BaseAtom<boolean, boolean, {}>;
}>;
