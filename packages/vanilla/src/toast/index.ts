/**
 * Vanilla JS Toaster — public API for the Fluix toast system.
 */

import {
	Toaster as CoreToaster,
	type FluixPosition,
	type FluixToastLayout,
	type FluixToasterConfig,
} from "@fluix-ui/core";

import { applyAttrs } from "../shared";
import { createInstance, destroyInstance, applyUpdate, type ToastInstance } from "./instance";

/* ----------------------------- Viewport offset ----------------------------- */

function resolveOffsetValue(v: number | string): string {
	return typeof v === "number" ? `${v}px` : v;
}

function applyViewportOffset(el: HTMLElement, offset: FluixToasterConfig["offset"], position: FluixPosition) {
	el.style.top = ""; el.style.right = ""; el.style.bottom = ""; el.style.left = "";
	el.style.paddingLeft = ""; el.style.paddingRight = "";
	if (offset == null) return;

	let top: string | undefined, right: string | undefined, bottom: string | undefined, left: string | undefined;

	if (typeof offset === "number" || typeof offset === "string") {
		const v = resolveOffsetValue(offset as number | string);
		top = v; right = v; bottom = v; left = v;
	} else {
		if (offset.top != null) top = resolveOffsetValue(offset.top);
		if (offset.right != null) right = resolveOffsetValue(offset.right);
		if (offset.bottom != null) bottom = resolveOffsetValue(offset.bottom);
		if (offset.left != null) left = resolveOffsetValue(offset.left);
	}

	if (position.startsWith("top") && top) el.style.top = top;
	if (position.startsWith("bottom") && bottom) el.style.bottom = bottom;
	if (position.endsWith("right") && right) el.style.right = right;
	if (position.endsWith("left") && left) el.style.left = left;
	if (position.endsWith("center")) {
		if (left) el.style.paddingLeft = left;
		if (right) el.style.paddingRight = right;
	}
}

/* ----------------------------- Sync ----------------------------- */

interface ToasterState {
	machine: ReturnType<typeof CoreToaster.getMachine>;
	instances: Map<string, ToastInstance>;
	viewports: Map<FluixPosition, HTMLElement>;
	currentConfig: FluixToasterConfig | undefined;
}

function ensureViewport(state: ToasterState, position: FluixPosition, layout: FluixToastLayout, offset: FluixToasterConfig["offset"]) {
	let vp = state.viewports.get(position);
	if (!vp) {
		vp = document.createElement("section");
		applyAttrs(vp, CoreToaster.getViewportAttrs(position, layout));
		applyViewportOffset(vp, offset, position);
		document.body.appendChild(vp);
		state.viewports.set(position, vp);
	}
	return vp;
}

function sync(state: ToasterState) {
	const next = state.machine.store.getSnapshot();
	const layout = next.config?.layout ?? state.currentConfig?.layout ?? "stack";
	const offset = next.config?.offset ?? state.currentConfig?.offset;

	const activePositions = new Set<FluixPosition>();
	const nextIds = new Set(next.toasts.map((t) => t.id));

	for (const [id, inst] of state.instances) {
		if (!nextIds.has(id)) { destroyInstance(inst); state.instances.delete(id); }
	}

	for (const item of next.toasts) {
		activePositions.add(item.position);
		const vp = ensureViewport(state, item.position, layout, offset);
		const existing = state.instances.get(item.id);

		if (!existing) {
			const inst = createInstance(item, state.machine);
			state.instances.set(item.id, inst);
			vp.appendChild(inst.el);
		} else if (existing.item.instanceId !== item.instanceId) {
			destroyInstance(existing);
			const inst = createInstance(item, state.machine);
			state.instances.set(item.id, inst);
			vp.appendChild(inst.el);
		} else {
			applyUpdate(existing, item, state.machine);
			if (existing.el.parentElement !== vp) vp.appendChild(existing.el);
		}
	}

	for (const [position, vp] of state.viewports) {
		applyAttrs(vp, CoreToaster.getViewportAttrs(position, layout));
		applyViewportOffset(vp, offset, position);
	}

	for (const [position] of state.viewports) {
		if (!activePositions.has(position)) { state.viewports.get(position)?.remove(); state.viewports.delete(position); }
	}
}

/* ----------------------------- createToaster ----------------------------- */

export function createToaster(config?: FluixToasterConfig): {
	destroy(): void;
	update(config: FluixToasterConfig): void;
} {
	const state: ToasterState = {
		machine: CoreToaster.getMachine(),
		instances: new Map(),
		viewports: new Map(),
		currentConfig: config,
	};
	if (config) state.machine.configure(config);

	sync(state);
	const unsubscribe = state.machine.store.subscribe(() => sync(state));

	return {
		destroy() {
			unsubscribe();
			for (const inst of state.instances.values()) destroyInstance(inst);
			state.instances.clear();
			for (const vp of state.viewports.values()) vp.remove();
			state.viewports.clear();
		},
		update(newConfig) { state.currentConfig = newConfig; state.machine.configure(newConfig); },
	};
}
