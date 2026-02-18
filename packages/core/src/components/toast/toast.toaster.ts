/**
 * Toaster — single entry point for the toast component from core.
 *
 * Adapters (React, Vue, etc.) use this to subscribe, get attrs, and connect
 * DOM events. All toast logic lives here; adapters only bind to their framework.
 */

import { getToastMachine, resetToastMachine } from "./toast.api";
import { getToastAttrs, getViewportAttrs } from "./toast.attrs";
import { connectToast } from "./toast.connect";
import type { ToastMachine } from "./toast.machine";
import type { ToastAttrs } from "./toast.attrs";
import type { FluixToastItem, FluixPosition } from "./toast.types";
import type { ToastConnectCallbacks } from "./toast.connect";

export interface ToasterApi {
	/** Get the singleton toast machine (store + create/dismiss/configure). */
	getMachine(): ToastMachine;
	/** Reset the singleton (e.g. for tests). */
	reset(): void;
	/** Get data-attributes for a single toast. */
	getAttrs(item: FluixToastItem, context: { ready: boolean; expanded: boolean }): ToastAttrs;
	/** Get data-attributes for a viewport container by position. */
	getViewportAttrs(position: FluixPosition): Record<string, string>;
	/** Wire DOM events (hover, swipe, expand/collapse) for a toast element. */
	connect(
		element: HTMLElement,
		callbacks: ToastConnectCallbacks,
		item: FluixToastItem,
	): { destroy(): void };
}

export const Toaster: ToasterApi = {
	getMachine: getToastMachine,
	reset: resetToastMachine,
	getAttrs: getToastAttrs,
	getViewportAttrs,
	connect: connectToast,
};
