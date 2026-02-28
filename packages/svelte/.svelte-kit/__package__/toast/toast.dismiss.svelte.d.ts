import type { ToastMachine } from "@fluix-ui/core";
export interface DismissState {
    hovering: boolean;
    pendingDismiss: boolean;
    dismissRequested: boolean;
    dismissTimer: ReturnType<typeof setTimeout> | null;
}
export declare function createDismissState(): DismissState;
export declare function resetDismissState(s: DismissState): void;
export declare function clearDismissTimer(s: DismissState): void;
export declare function requestDismiss(s: DismissState, machine: ToastMachine, id: string, hasDescription: boolean, onLocalStateChange: (patch: Partial<{
    ready: boolean;
    expanded: boolean;
}>) => void): void;
//# sourceMappingURL=toast.dismiss.svelte.d.ts.map