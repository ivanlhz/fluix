/**
 * Imperative Toast API.
 *
 * This is the public-facing API that users import and call directly.
 * It wraps a singleton toast machine.
 *
 * Usage:
 *   import { fluix } from "@fluix-ui/core";
 *   fluix.success({ title: "Saved!" });
 */

import { type ToastMachine, createToastMachine } from "./toast.machine";
import type {
	FluixPosition,
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixToasterConfig,
} from "./toast.types";

/* ----------------------------- Singleton Machine --------------------------- */

let machine: ToastMachine | null = null;

export function getToastMachine(): ToastMachine {
	if (!machine) {
		machine = createToastMachine();
	}
	return machine;
}

/** Reset the singleton (useful for tests). */
export function resetToastMachine(): void {
	machine?.destroy();
	machine = null;
}

/* -------------------------------- Public API -------------------------------- */

export const fluix = {
	/** Show a toast with explicit options. */
	show(opts: FluixToastOptions): string {
		return getToastMachine().create(opts);
	},

	/** Show a success toast. */
	success(opts: FluixToastOptions): string {
		return getToastMachine().create({ ...opts, state: "success" });
	},

	/** Show an error toast. */
	error(opts: FluixToastOptions): string {
		return getToastMachine().create({ ...opts, state: "error" });
	},

	/** Show a warning toast. */
	warning(opts: FluixToastOptions): string {
		return getToastMachine().create({ ...opts, state: "warning" });
	},

	/** Show an info toast. */
	info(opts: FluixToastOptions): string {
		return getToastMachine().create({ ...opts, state: "info" });
	},

	/** Show an action toast (with button). */
	action(opts: FluixToastOptions): string {
		return getToastMachine().create({ ...opts, state: "action" });
	},

	/**
	 * Bind a promise to a toast.
	 * Shows loading state, then transitions to success or error.
	 */
	promise<T>(
		promise: Promise<T> | (() => Promise<T>),
		opts: FluixToastPromiseOptions<T>,
	): Promise<T> {
		const m = getToastMachine();
		const id = m.create({
			...opts.loading,
			state: "loading",
			duration: null, // Persistent until promise resolves
			position: opts.position,
		});

		const p = typeof promise === "function" ? promise() : promise;

		p.then((data) => {
			if (opts.action) {
				const actionOpts = typeof opts.action === "function" ? opts.action(data) : opts.action;
				m.update(id, { ...actionOpts, state: "action", id });
			} else {
				const successOpts = typeof opts.success === "function" ? opts.success(data) : opts.success;
				m.update(id, { ...successOpts, state: "success", id });
			}
		}).catch((err) => {
			const errorOpts = typeof opts.error === "function" ? opts.error(err) : opts.error;
			m.update(id, { ...errorOpts, state: "error", id });
		});

		return p;
	},

	/** Dismiss a specific toast by ID. */
	dismiss(id: string): void {
		getToastMachine().dismiss(id);
	},

	/** Clear all toasts, or only those at a specific position. */
	clear(position?: FluixPosition): void {
		getToastMachine().clear(position);
	},

	/** Update default toaster configuration. */
	configure(config: FluixToasterConfig): void {
		getToastMachine().configure(config);
	},
};
