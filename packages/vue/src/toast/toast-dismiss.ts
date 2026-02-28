import { ref } from "vue";
import type { ToastMachine } from "@fluix-ui/core";

const DISMISS_STAGE_DELAY_MS = 260;

export function useDismissState() {
	const hovering = ref(false);
	const pendingDismiss = ref(false);
	const dismissRequested = ref(false);
	const dismissTimer = ref<ReturnType<typeof setTimeout> | null>(null);

	function clearTimer() {
		if (dismissTimer.value) {
			clearTimeout(dismissTimer.value);
			dismissTimer.value = null;
		}
	}

	function reset() {
		hovering.value = false;
		pendingDismiss.value = false;
		dismissRequested.value = false;
		clearTimer();
	}

	function requestDismiss(
		machine: ToastMachine,
		id: string,
		hasDescription: boolean,
		onCollapse: () => void,
	) {
		if (dismissRequested.value) return;
		dismissRequested.value = true;
		hovering.value = false;
		pendingDismiss.value = false;
		onCollapse();
		clearTimer();
		dismissTimer.value = setTimeout(
			() => {
				machine.dismiss(id);
				dismissTimer.value = null;
			},
			hasDescription ? DISMISS_STAGE_DELAY_MS : 0,
		);
	}

	return { hovering, pendingDismiss, dismissRequested, clearTimer, reset, requestDismiss };
}
