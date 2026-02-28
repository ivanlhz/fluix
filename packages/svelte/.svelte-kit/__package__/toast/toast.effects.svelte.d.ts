import { type FluixToastItem } from "@fluix-ui/core";
import type { DismissState } from "./toast.dismiss.svelte.js";
export declare function applyCssProps(getRootEl: () => HTMLDivElement | null, rootStyleObj: Record<string, string>): void;
export declare function observePillWidth(getHeaderEl: () => HTMLDivElement | null, getHeaderInnerEl: () => HTMLDivElement | null, setPillWidth: (w: number) => void): (() => void) | undefined;
export declare function observeContentHeight(hasDescription: boolean, getContentEl: () => HTMLDivElement | null, setContentHeight: (h: number) => void): (() => void) | undefined;
export declare function setupAutoDismiss(item: FluixToastItem, dismiss: DismissState, doDismiss: () => void): (() => void) | undefined;
export declare function setupAutopilot(item: FluixToastItem, dismiss: DismissState, onLocalStateChange: (patch: Partial<{
    ready: boolean;
    expanded: boolean;
}>) => void): (() => void) | undefined;
export declare function connectDomEvents(getRootEl: () => HTMLDivElement | null, item: FluixToastItem, dismiss: DismissState, onLocalStateChange: (patch: Partial<{
    ready: boolean;
    expanded: boolean;
}>) => void, doDismiss: () => void): (() => void) | undefined;
//# sourceMappingURL=toast.effects.svelte.d.ts.map