/**
 * Toast state machine.
 *
 * Manages the global list of toasts, their lifecycle (create, update, dismiss, exit),
 * and timing (auto-dismiss, auto-expand, auto-collapse).
 *
 * This is the single source of truth. Adapters subscribe to the store
 * and render based on snapshots.
 */

import { createStore, type Store } from "../../primitives/store";
import type {
	FluixPosition,
	FluixToastItem,
	FluixToastOptions,
	FluixToastState,
	FluixToasterConfig,
} from "./toast.types";

/* -------------------------------- Constants -------------------------------- */

export const TOAST_DEFAULTS = {
	duration: 6000,
	fill: "#FFFFFF",
	roundness: 16,
	position: "top-right" as FluixPosition,
} as const;

/** Exit animation duration — toast is in "exiting" state for this long before removal */
export const EXIT_DURATION_MS = TOAST_DEFAULTS.duration * 0.1;

/** Auto-expand delay (time before toast auto-expands to show description) */
export const AUTO_EXPAND_DELAY_MS = TOAST_DEFAULTS.duration * 0.025;

/** Auto-collapse delay (time before expanded toast collapses back) */
export const AUTO_COLLAPSE_DELAY_MS = TOAST_DEFAULTS.duration - 2000;

/* ---------------------------------- State ---------------------------------- */

export interface ToastMachineState {
	toasts: FluixToastItem[];
	config: FluixToasterConfig;
}

/* -------------------------------- ID generation ----------------------------- */

let idCounter = 0;

function generateId(): string {
	return `${++idCounter}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* -------------------------------- Machine ---------------------------------- */

export interface ToastMachine {
	store: Store<ToastMachineState>;
	/** Create or replace a toast. Returns the toast ID. */
	create(options: FluixToastOptions & { state?: FluixToastState }): string;
	/** Update an existing toast in-place. */
	update(id: string, options: FluixToastOptions & { state?: FluixToastState }): void;
	/** Begin exit animation, then remove. */
	dismiss(id: string): void;
	/** Remove all toasts, optionally filtered by position. */
	clear(position?: FluixPosition): void;
	/** Update toaster configuration. */
	configure(config: FluixToasterConfig): void;
	/** Clean up all timers. */
	destroy(): void;
}

export function createToastMachine(): ToastMachine {
	const store = createStore<ToastMachineState>({
		toasts: [],
		config: { position: TOAST_DEFAULTS.position },
	});

	const exitTimers = new Map<string, ReturnType<typeof setTimeout>>();

	/* ------------------------------ Helpers ------------------------------ */

	function getConfig(): FluixToasterConfig {
		return store.getSnapshot().config;
	}

	function resolveAutopilot(
		opts: FluixToastOptions,
		duration: number | null,
	): { expandDelayMs?: number; collapseDelayMs?: number } {
		if (opts.autopilot === false || !duration || duration <= 0) return {};
		const cfg = typeof opts.autopilot === "object" ? opts.autopilot : undefined;
		const clamp = (v: number) => Math.min(duration, Math.max(0, v));
		return {
			expandDelayMs: clamp(cfg?.expand ?? AUTO_EXPAND_DELAY_MS),
			collapseDelayMs: clamp(cfg?.collapse ?? AUTO_COLLAPSE_DELAY_MS),
		};
	}

	function mergeDefaults(opts: FluixToastOptions): FluixToastOptions {
		const defaults = getConfig().defaults;
		if (!defaults) return opts;
		return {
			...defaults,
			...opts,
			styles: { ...defaults.styles, ...opts.styles },
		};
	}

	function buildItem(
		opts: FluixToastOptions & { state?: FluixToastState },
		id: string,
		fallbackPosition?: FluixPosition,
	): FluixToastItem {
		const merged = mergeDefaults(opts);
		const duration = merged.duration ?? TOAST_DEFAULTS.duration;
		const auto = resolveAutopilot(merged, duration);

		return {
			...merged,
			id,
			instanceId: generateId(),
			state: opts.state ?? "success",
			position: merged.position ?? fallbackPosition ?? getConfig().position ?? TOAST_DEFAULTS.position,
			fill: merged.fill ?? TOAST_DEFAULTS.fill,
			roundness: merged.roundness ?? TOAST_DEFAULTS.roundness,
			exiting: false,
			autoExpandDelayMs: auto.expandDelayMs,
			autoCollapseDelayMs: auto.collapseDelayMs,
		};
	}

	/* ----------------------------- Public API ----------------------------- */

	function create(opts: FluixToastOptions & { state?: FluixToastState }): string {
		const id = opts.id ?? "fluix-default";

		store.update((prev) => {
			const live = prev.toasts.filter((t) => !t.exiting);
			const existing = live.find((t) => t.id === id);
			const item = buildItem(opts, id, existing?.position);

			if (existing) {
				return {
					...prev,
					toasts: prev.toasts.map((t) => (t.id === id ? item : t)),
				};
			}
			return {
				...prev,
				toasts: [...prev.toasts.filter((t) => t.id !== id), item],
			};
		});

		return id;
	}

	function update(id: string, opts: FluixToastOptions & { state?: FluixToastState }): void {
		store.update((prev) => {
			const existing = prev.toasts.find((t) => t.id === id);
			if (!existing) return prev;
			const item = buildItem(opts, id, existing.position);
			return {
				...prev,
				toasts: prev.toasts.map((t) => (t.id === id ? item : t)),
			};
		});
	}

	function dismiss(id: string): void {
		const { toasts } = store.getSnapshot();
		const item = toasts.find((t) => t.id === id);
		if (!item || item.exiting) return;

		// Mark as exiting
		store.update((prev) => ({
			...prev,
			toasts: prev.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
		}));

		// Remove after exit animation
		const timer = setTimeout(() => {
			exitTimers.delete(id);
			store.update((prev) => ({
				...prev,
				toasts: prev.toasts.filter((t) => t.id !== id),
			}));
		}, EXIT_DURATION_MS);

		exitTimers.set(id, timer);
	}

	function clear(position?: FluixPosition): void {
		store.update((prev) => ({
			...prev,
			toasts: position ? prev.toasts.filter((t) => t.position !== position) : [],
		}));
	}

	function configure(config: FluixToasterConfig): void {
		store.update((prev) => ({
			...prev,
			config: { ...prev.config, ...config },
		}));
	}

	function destroy(): void {
		for (const timer of exitTimers.values()) clearTimeout(timer);
		exitTimers.clear();
	}

	return { store, create, update, dismiss, clear, configure, destroy };
}
