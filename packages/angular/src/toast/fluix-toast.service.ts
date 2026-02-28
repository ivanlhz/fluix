/**
 * Injectable service that exposes the Fluix toast imperative API.
 * Inject in components or services and call success(), error(), etc.
 */

import { Injectable } from "@angular/core";
import {
	fluix,
	getToastMachine,
	type FluixToastOptions,
	type FluixToastPromiseOptions,
	type FluixPosition,
	type ToastMachine,
} from "@fluix-ui/core";

@Injectable({ providedIn: "root" })
export class FluixToastService {
	/** Imperative API: show toasts and control them. */
	readonly fluix = fluix;

	/** Access the underlying toast machine (e.g. for configure). */
	getMachine(): ToastMachine {
		return getToastMachine();
	}

	success(options: FluixToastOptions | string): string {
		return this.fluix.success(typeof options === "string" ? { title: options } : options);
	}

	error(options: FluixToastOptions | string): string {
		return this.fluix.error(typeof options === "string" ? { title: options } : options);
	}

	warning(options: FluixToastOptions | string): string {
		return this.fluix.warning(typeof options === "string" ? { title: options } : options);
	}

	info(options: FluixToastOptions | string): string {
		return this.fluix.info(typeof options === "string" ? { title: options } : options);
	}

	action(options: FluixToastOptions): string {
		return this.fluix.action(options);
	}

	promise<T>(promise: Promise<T>, options: FluixToastPromiseOptions<T>): Promise<T> {
		return this.fluix.promise(promise, options);
	}

	dismiss(id: string): void {
		this.fluix.dismiss(id);
	}

	clear(position?: FluixPosition): void {
		this.fluix.clear(position);
	}
}
