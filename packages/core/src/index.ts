// Primitives
export { createStore, type Store } from "./primitives/store";
export {
	type SpringConfig,
	springToCSS,
	springKeyframes,
	animateSpring,
	getDefaultSpringCSS,
	FLUIX_SPRING,
} from "./primitives/spring";
export { createDismiss, type DismissOptions } from "./primitives/dismiss";

// Toast component
export {
	fluix,
	Toaster,
	getToastMachine,
	resetToastMachine,
	createToastMachine,
	getToastAttrs,
	getViewportAttrs,
	connectToast,
	TOAST_DEFAULTS,
	EXIT_DURATION_MS,
	AUTO_EXPAND_DELAY_MS,
	AUTO_COLLAPSE_DELAY_MS,
	FLUIX_POSITIONS,
} from "./components/toast";

export type {
	ToasterApi,
	ToastMachine,
	ToastMachineState,
	ToastAttrs,
	ToastConnectCallbacks,
	FluixToastState,
	FluixTheme,
	FluixToastLayout,
	FluixPosition,
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixToastItem,
	FluixToastButton,
	FluixToastStyles,
	FluixToasterConfig,
	FluixOffsetValue,
	FluixOffsetConfig,
} from "./components/toast";
