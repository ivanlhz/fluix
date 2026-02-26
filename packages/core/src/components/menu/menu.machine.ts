import { type Store, createStore } from "../../primitives/store";
import type { MenuConfig, MenuOrientation } from "./menu.types";

export const MENU_DEFAULTS = {
	orientation: "vertical" as MenuOrientation,
	roundness: 16,
} as const;

export interface MenuMachineState {
	activeId: string | null;
	config: MenuConfig;
}

export interface MenuMachine {
	store: Store<MenuMachineState>;
	setActive(id: string | null): void;
	configure(config: MenuConfig): void;
	destroy(): void;
}

export function createMenuMachine(initialConfig?: MenuConfig): MenuMachine {
	const store = createStore<MenuMachineState>({
		activeId: initialConfig?.initialActiveId ?? null,
		config: { ...initialConfig },
	});

	function setActive(id: string | null) {
		store.update((prev) => {
			if (prev.activeId === id) return prev;
			return { ...prev, activeId: id };
		});
	}

	function configure(config: MenuConfig) {
		store.update((prev) => {
			const merged = { ...prev.config, ...config };
			const keys = Object.keys(merged) as (keyof MenuConfig)[];
			if (keys.every((k) => prev.config[k] === merged[k])) return prev;
			return { ...prev, config: merged };
		});
	}

	function destroy() {
		// Reserved for future cleanup.
	}

	return { store, setActive, configure, destroy };
}
