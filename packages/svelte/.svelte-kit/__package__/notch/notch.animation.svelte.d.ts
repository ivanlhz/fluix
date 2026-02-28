import { type SpringConfig } from "@fluix-ui/core";
interface AnimPrev {
    w: number;
    h: number;
    initialized: boolean;
}
export declare function createNotchAnimation(): {
    prev: AnimPrev;
    init: (rect: SVGRectElement, collapsedW: number, collapsedH: number, rootW: number, rootH: number) => void;
    animate: (rect: SVGRectElement, opts: {
        targetW: number;
        targetH: number;
        rootW: number;
        rootH: number;
        collapsedW: number;
        collapsedH: number;
        roundness: number;
        springConfig: SpringConfig;
    }) => void;
};
export {};
//# sourceMappingURL=notch.animation.svelte.d.ts.map