import { Toaster as CoreToaster } from "@fluix/core";
export function createFluixToasts() {
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
