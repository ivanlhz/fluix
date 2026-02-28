import { Toaster as CoreToaster } from "@fluix-ui/core";
import type { FluixToastItem, FluixToasterConfig, ToastMachine } from "@fluix-ui/core";

export interface FluixToastsResult {
	readonly toasts: FluixToastItem[];
	readonly config: FluixToasterConfig;
	readonly machine: ToastMachine;
}

export function createFluixToasts(): FluixToastsResult {
	const machine = CoreToaster.getMachine();
	let snapshot = $state.raw(machine.store.getSnapshot());

	$effect(() => {
		return machine.store.subscribe(() => {
			snapshot = machine.store.getSnapshot();
		});
	});

	return {
		get toasts() {
			return snapshot.toasts;
		},
		get config() {
			return snapshot.config;
		},
		machine,
	};
}
