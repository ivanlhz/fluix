import type { ToastMachine } from "@fluix-ui/core";

export interface DismissState {
	hovering: boolean;
	pendingDismiss: boolean;
	dismissRequested: boolean;
	dismissTimer: ReturnType<typeof setTimeout> | null;
}

export function createDismissState(): DismissState {
	return {
		hovering: false,
		pendingDismiss: false,
		dismissRequested: false,
		dismissTimer: null,
	};
}

export function resetDismissState(s: DismissState) {
	s.hovering = false;
	s.pendingDismiss = false;
	s.dismissRequested = false;
	clearDismissTimer(s);
}

export function clearDismissTimer(s: DismissState) {
	if (s.dismissTimer) {
		clearTimeout(s.dismissTimer);
		s.dismissTimer = null;
	}
}

export function requestDismiss(
	s: DismissState,
	machine: ToastMachine,
	id: string,
	hasDescription: boolean,
	onLocalStateChange: (patch: Partial<{ ready: boolean; expanded: boolean }>) => void,
) {
	if (s.dismissRequested) return;
	s.dismissRequested = true;
	s.hovering = false;
	s.pendingDismiss = false;
	onLocalStateChange({ expanded: false });
	clearDismissTimer(s);
	const DISMISS_STAGE_DELAY_MS = 260;
	const delay = hasDescription ? DISMISS_STAGE_DELAY_MS : 0;
	s.dismissTimer = setTimeout(() => {
		machine.dismiss(id);
		s.dismissTimer = null;
	}, delay);
}
