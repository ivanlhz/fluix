import type { FluixToastItem, ToastMachine } from "@fluix/core";
interface Props {
	item: FluixToastItem;
	machine: ToastMachine;
	localState: {
		ready: boolean;
		expanded: boolean;
	};
	onLocalStateChange: (
		patch: Partial<{
			ready: boolean;
			expanded: boolean;
		}>,
	) => void;
}
declare const ToastItem: import("svelte").Component<Props, {}, "">;
type ToastItem = ReturnType<typeof ToastItem>;
export default ToastItem;
//# sourceMappingURL=ToastItem.svelte.d.ts.map
