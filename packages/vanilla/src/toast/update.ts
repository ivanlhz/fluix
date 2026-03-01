/** Toast instance runtime: layout computation, animation, update, crossfade, and teardown. */

import {
	Toaster as CoreToaster,
	FLUIX_SPRING,
	type FluixToastItem,
	TOAST_DEFAULTS,
	type ToastMachine,
	animateSpring,
} from "@fluix-ui/core";

import { applyAttrs } from "../shared";
import { renderIconInto } from "./icons";
import type { ToastInstance } from "./instance";
import { WIDTH, HEIGHT } from "./instance";

/* ----------------------------- Constants ----------------------------- */

const PILL_PADDING = 10;
const MIN_EXPAND_RATIO = 2.25;
const HEADER_EXIT_MS = 600 * 0.7;
const BODY_MERGE_OVERLAP = 6;

/* ----------------------------- Layout ----------------------------- */

function computeLayout(item: FluixToastItem, inst: ToastInstance) {
	const { ready, expanded: isExpanded } = inst.localState;
	const roundness = item.roundness ?? TOAST_DEFAULTS.roundness;
	const blur = Math.min(10, Math.max(6, roundness * 0.45));
	const hasDesc = Boolean(item.description) || Boolean(item.button);
	const isLoading = item.state === "loading";
	const open = hasDesc && isExpanded && !isLoading;
	const position = getPillAlignLocal(item.position);
	const edge = item.position.startsWith("top") ? "bottom" : "top";

	const resolvedPillWidth = Math.max(inst.pillWidth || HEIGHT, HEIGHT);
	const pillHeight = HEIGHT + blur * 3;
	const pillX =
		position === "right" ? WIDTH - resolvedPillWidth
		: position === "center" ? (WIDTH - resolvedPillWidth) / 2
		: 0;

	const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
	const rawExpanded = hasDesc ? Math.max(minExpanded, HEIGHT + inst.contentHeight) : minExpanded;
	if (open) inst.frozenExpanded = rawExpanded;
	const expanded = open ? rawExpanded : inst.frozenExpanded;
	const expandedContent = Math.max(0, expanded - HEIGHT);
	const svgHeight = hasDesc ? Math.max(expanded, minExpanded) : HEIGHT;

	return {
		ready, isExpanded, roundness, blur, hasDesc, isLoading, open,
		position, edge, resolvedPillWidth, pillHeight, pillX,
		minExpanded, expanded, expandedContent, svgHeight,
	};
}

function getPillAlignLocal(position: string): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

/* ----------------------------- Measurement ----------------------------- */

export function measurePillWidth(inst: ToastInstance) {
	if (!inst.el.isConnected) return;
	if (inst.headerPad === null) {
		const cs = getComputedStyle(inst.headerEl);
		inst.headerPad = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight);
	}
	const w = inst.innerEl.getBoundingClientRect().width + inst.headerPad + PILL_PADDING;
	if (w > PILL_PADDING && w !== inst.pillWidth) inst.pillWidth = w;
}

/* ----------------------------- CSS vars ----------------------------- */

export function applyVars(inst: ToastInstance, item: FluixToastItem) {
	const layout = computeLayout(item, inst);
	const { open, expanded, resolvedPillWidth, pillX, edge, expandedContent, svgHeight } = layout;

	const vars: Record<string, string> = {
		"--_h": `${open ? expanded : HEIGHT}px`,
		"--_pw": `${resolvedPillWidth}px`,
		"--_px": `${pillX}px`,
		"--_ht": `translateY(${open ? (edge === "bottom" ? 3 : -3) : 0}px) scale(${open ? 0.9 : 1})`,
		"--_co": `${open ? 1 : 0}`,
		"--_cy": `${open ? 0 : -14}px`,
		"--_cm": `${open ? expandedContent : 0}px`,
		"--_by": `${open ? HEIGHT - BODY_MERGE_OVERLAP : HEIGHT}px`,
		"--_bh": `${open ? expandedContent : 0}px`,
		"--_bo": `${open ? 1 : 0}`,
	};

	for (const [key, value] of Object.entries(vars)) inst.el.style.setProperty(key, value);
	inst.svgEl.setAttribute("height", String(svgHeight));
	inst.svgEl.setAttribute("viewBox", `0 0 ${WIDTH} ${svgHeight}`);
}

/* ----------------------------- Pill animation ----------------------------- */

export function animatePill(inst: ToastInstance, item: FluixToastItem) {
	const { open, resolvedPillWidth, pillX, pillHeight } = computeLayout(item, inst);
	const prev = inst.prevPill;
	const next = { x: pillX, width: resolvedPillWidth, height: open ? pillHeight : HEIGHT };

	if (prev.x === next.x && prev.width === next.width && prev.height === next.height) return;
	inst.pillAnim?.cancel();

	if (!inst.localState.ready || inst.pillFirst) {
		inst.pillFirst = false;
		inst.pillEl.setAttribute("x", String(next.x));
		inst.pillEl.setAttribute("width", String(next.width));
		inst.pillEl.setAttribute("height", String(next.height));
		inst.prevPill = next;
		return;
	}

	inst.pillAnim = animateSpring(inst.pillEl, {
		x: { from: prev.x, to: next.x, unit: "px" },
		width: { from: prev.width, to: next.width, unit: "px" },
		height: { from: prev.height, to: next.height, unit: "px" },
	}, FLUIX_SPRING);
	inst.prevPill = next;
}

/* ----------------------------- Timers ----------------------------- */

export function setTimer(inst: ToastInstance, fn: () => void, ms: number) {
	const id = setTimeout(() => { inst.timers.delete(id); fn(); }, ms);
	inst.timers.add(id);
	return id;
}

export function setupAutoDismiss(inst: ToastInstance, item: FluixToastItem, machine: ToastMachine) {
	const duration = item.duration;
	if (duration == null || duration <= 0) return;
	setTimer(inst, () => {
		if (inst.hovering) {
			inst.pendingDismiss = true;
			setTimer(inst, () => {
				if (inst.dismissRequested) return;
				inst.dismissRequested = true;
				inst.pendingDismiss = false;
				machine.dismiss(item.id);
			}, 1200);
			return;
		}
		inst.pendingDismiss = false;
		inst.dismissRequested = true;
		machine.dismiss(item.id);
	}, duration);
}

export function setupAutopilot(inst: ToastInstance, item: FluixToastItem, machine: ToastMachine) {
	if (item.autoExpandDelayMs != null && item.autoExpandDelayMs > 0) {
		setTimer(inst, () => {
			if (!inst.hovering) { inst.localState.expanded = true; applyUpdate(inst, inst.item, machine); }
		}, item.autoExpandDelayMs);
	}
	if (item.autoCollapseDelayMs != null && item.autoCollapseDelayMs > 0) {
		setTimer(inst, () => {
			if (!inst.hovering) { inst.localState.expanded = false; applyUpdate(inst, inst.item, machine); }
		}, item.autoCollapseDelayMs);
	}
}

/* ----------------------------- Update ----------------------------- */

function updateDescription(inst: ToastInstance, item: FluixToastItem, attrs: ReturnType<typeof CoreToaster.getAttrs>) {
	const hasDesc = Boolean(item.description) || Boolean(item.button);
	if (hasDesc && !inst.contentEl) {
		const contentEl = document.createElement("div");
		const descriptionEl = document.createElement("div");
		contentEl.appendChild(descriptionEl);
		inst.el.appendChild(contentEl);
		inst.contentEl = contentEl;
		inst.descriptionEl = descriptionEl;

		inst.contentRo = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				const h = descriptionEl.scrollHeight;
				if (h !== inst.contentHeight) { inst.contentHeight = h; applyVars(inst, inst.item); }
			});
		});
		inst.contentRo.observe(descriptionEl);
	}

	if (inst.contentEl) applyAttrs(inst.contentEl, attrs.content);
	if (!inst.descriptionEl) return;

	applyAttrs(inst.descriptionEl, attrs.description);
	if (item.styles?.description) inst.descriptionEl.className = item.styles.description;

	const existingBtn = inst.descriptionEl.querySelector("[data-fluix-button]");
	inst.descriptionEl.textContent = "";

	if (item.description != null) {
		if (typeof item.description === "string") inst.descriptionEl.textContent = item.description;
		else if (item.description instanceof HTMLElement) inst.descriptionEl.appendChild(item.description);
	}

	if (item.button) {
		let btnEl = existingBtn as HTMLButtonElement | null;
		if (!btnEl) { btnEl = document.createElement("button"); btnEl.type = "button"; }
		btnEl.textContent = item.button.title;
		if (item.styles?.button) btnEl.className = item.styles.button;
		applyAttrs(btnEl, attrs.button);
		const newBtn = btnEl.cloneNode(true) as HTMLButtonElement;
		newBtn.addEventListener("click", (e) => { e.stopPropagation(); item.button?.onClick(); });
		inst.descriptionEl.appendChild(newBtn);
	}
}

export function applyUpdate(inst: ToastInstance, item: FluixToastItem, _machine: ToastMachine) {
	inst.item = item;
	const attrs = CoreToaster.getAttrs(item, inst.localState);
	applyAttrs(inst.el, attrs.root);

	const canvasEl = inst.el.querySelector("[data-fluix-canvas]");
	if (canvasEl) applyAttrs(canvasEl, attrs.canvas);
	applyAttrs(inst.headerEl, attrs.header);

	const badgeEl = inst.innerEl.querySelector("[data-fluix-badge]");
	if (badgeEl) {
		applyAttrs(badgeEl, attrs.badge);
		if (item.styles?.badge) (badgeEl as HTMLElement).className = item.styles.badge;
	}
	const titleEl = inst.innerEl.querySelector("[data-fluix-title]");
	if (titleEl) {
		applyAttrs(titleEl, attrs.title);
		if (item.styles?.title) (titleEl as HTMLElement).className = item.styles.title;
	}

	updateDescription(inst, item, attrs);

	inst.pillEl.setAttribute("fill", item.fill ?? "var(--fluix-surface-contrast)");
	inst.bodyEl.setAttribute("fill", item.fill ?? "var(--fluix-surface-contrast)");

	const newHeaderKey = `${item.state}-${item.title ?? item.state}`;
	if (newHeaderKey !== inst.headerKey) { crossfadeHeader(inst, item, attrs); inst.headerKey = newHeaderKey; }

	applyVars(inst, item);
	animatePill(inst, item);
}

/* ----------------------------- Crossfade ----------------------------- */

function crossfadeHeader(inst: ToastInstance, item: FluixToastItem, attrs: ReturnType<typeof CoreToaster.getAttrs>) {
	const oldInner = inst.innerEl;
	oldInner.setAttribute("data-layer", "prev");
	oldInner.setAttribute("data-exiting", "true");

	const newInner = document.createElement("div");
	newInner.setAttribute("data-fluix-header-inner", "");
	newInner.setAttribute("data-layer", "current");

	const badgeEl = document.createElement("div");
	applyAttrs(badgeEl, attrs.badge);
	if (item.styles?.badge) badgeEl.className = item.styles.badge;
	renderIconInto(badgeEl, item.icon, item.state);

	const titleEl = document.createElement("span");
	applyAttrs(titleEl, attrs.title);
	if (item.styles?.title) titleEl.className = item.styles.title;
	titleEl.textContent = item.title ?? item.state;

	newInner.appendChild(badgeEl);
	newInner.appendChild(titleEl);
	inst.headerStackEl.insertBefore(newInner, oldInner);
	inst.innerEl = newInner;

	inst.pillRo.unobserve(oldInner);
	inst.pillRo.observe(newInner);
	setTimer(inst, () => { oldInner.remove(); }, HEADER_EXIT_MS);

	requestAnimationFrame(() => {
		measurePillWidth(inst);
		applyVars(inst, inst.item);
		animatePill(inst, inst.item);
	});
}

/* ----------------------------- Destroy ----------------------------- */

export function destroyInstance(inst: ToastInstance) {
	for (const t of inst.timers) clearTimeout(t);
	inst.timers.clear();
	inst.pillAnim?.cancel();
	inst.pillRo.disconnect();
	inst.contentRo?.disconnect();
	inst.connectHandle.destroy();
	inst.el.remove();
}
