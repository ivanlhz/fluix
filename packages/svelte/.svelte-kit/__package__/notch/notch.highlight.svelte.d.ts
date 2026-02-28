import { type SpringConfig } from "@fluix-ui/core";
export declare function createNotchHighlight(): {
    onItemEnter: (e: MouseEvent, opts: {
        hoverBlobEl: SVGRectElement | null;
        rootEl: HTMLDivElement | null;
        isOpen: boolean;
        roundness: number;
        springConfig: SpringConfig;
    }) => void;
    onItemLeave: (hoverBlobEl: SVGRectElement | null, springConfig: SpringConfig) => void;
    resetImmediate: (hoverBlobEl: SVGRectElement | null, rootW: number, rootH: number) => void;
};
//# sourceMappingURL=notch.highlight.svelte.d.ts.map