/**
 * Notch state machine.
 *
 * Manages open/close state and content dimensions.
 * Adapters subscribe to the store and animate based on snapshots.
 */

import { type Store, createStore } from "../../primitives/store";
import type { NotchConfig, NotchPosition, NotchSize, NotchTrigger } from "./notch.types";

export const NOTCH_DEFAULTS = {
	position: "top-center" as NotchPosition,
	trigger: "click" as NotchTrigger,
	roundness: 20,
	pillHeight: 40,
	pillMinWidth: 40,
} as const;

export interface NotchMachineState {
	open: boolean;
	config: NotchConfig;
	/** Measured size of the expanded content slot */
	contentSize: NotchSize;
	/** Measured size of the collapsed pill slot */
	baseSize: NotchSize;
}

export interface NotchMachine {
	store: Store<NotchMachineState>;
	open(): void;
	close(): void;
	toggle(): void;
	/** Update measured content dimensions (called by adapter's ResizeObserver) */
	setContentSize(size: NotchSize): void;
	/** Update measured base pill dimensions */
	setBaseSize(size: NotchSize): void;
	/** Update config */
	configure(config: NotchConfig): void;
	destroy(): void;
}

export function createNotchMachine(initialConfig?: NotchConfig): NotchMachine {
	const store = createStore<NotchMachineState>({
		open: false,
		config: { ...initialConfig },
		contentSize: { w: 0, h: 0 },
		baseSize: { w: NOTCH_DEFAULTS.pillMinWidth, h: NOTCH_DEFAULTS.pillHeight },
	});

	function open() {
		store.update((prev) => (prev.open ? prev : { ...prev, open: true }));
	}

	function close() {
		store.update((prev) => (prev.open ? { ...prev, open: false } : prev));
	}

	function toggle() {
		store.update((prev) => ({ ...prev, open: !prev.open }));
	}

	function setContentSize(size: NotchSize) {
		store.update((prev) => {
			if (prev.contentSize.w === size.w && prev.contentSize.h === size.h) return prev;
			return { ...prev, contentSize: size };
		});
	}

	function setBaseSize(size: NotchSize) {
		store.update((prev) => {
			if (prev.baseSize.w === size.w && prev.baseSize.h === size.h) return prev;
			return { ...prev, baseSize: size };
		});
	}

	function configure(config: NotchConfig) {
		store.update((prev) => ({ ...prev, config: { ...prev.config, ...config } }));
	}

	function destroy() {
		// Reserved for future timer/listener cleanup
	}

	return { store, open, close, toggle, setContentSize, setBaseSize, configure, destroy };
}
