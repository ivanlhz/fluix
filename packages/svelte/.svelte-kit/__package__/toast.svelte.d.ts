import type { FluixToastItem, FluixToasterConfig, ToastMachine } from "@fluix/core";
export interface FluixToastsResult {
    readonly toasts: FluixToastItem[];
    readonly config: FluixToasterConfig;
    readonly machine: ToastMachine;
}
export declare function createFluixToasts(): FluixToastsResult;
//# sourceMappingURL=toast.svelte.d.ts.map