export {
	createNotchMachine,
	NOTCH_DEFAULTS,
	type NotchMachine,
	type NotchMachineState,
} from "./notch.machine";
export { getNotchAttrs, type NotchAttrs } from "./notch.attrs";
export { connectNotch, type NotchConnectCallbacks } from "./notch.connect";
export type {
	NotchConfig,
	NotchPosition,
	NotchTrigger,
	NotchTheme,
	NotchSize,
} from "./notch.types";
