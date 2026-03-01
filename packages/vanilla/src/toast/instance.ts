/** Toast instance creation and DOM building. */

import {
	Toaster as CoreToaster,
	type FluixToastItem,
	TOAST_DEFAULTS,
	type ToastMachine,
} from "@fluix-ui/core";

import { SVG_NS, applyAttrs, createGooeyFilter } from "../shared";
import { renderIconInto } from "./icons";
import { measurePillWidth, applyVars, applyUpdate, setTimer, setupAutoDismiss, setupAutopilot } from "./update";

/* ----------------------------- Constants ----------------------------- */

export const WIDTH = 350;
export const HEIGHT = 40;
const MIN_EXPAND_RATIO = 2.25;

/* ----------------------------- Types ----------------------------- */

export interface ToastInstance {
	el: HTMLButtonElement;
	pillEl: SVGRectElement;
	bodyEl: SVGRectElement;
	svgEl: SVGSVGElement;
	headerEl: HTMLDivElement;
	innerEl: HTMLDivElement;
	headerStackEl: HTMLDivElement;
	contentEl: HTMLDivElement | null;
	descriptionEl: HTMLDivElement | null;
	localState: { ready: boolean; expanded: boolean };
	pillWidth: number;
	contentHeight: number;
	frozenExpanded: number;
	hovering: boolean;
	pendingDismiss: boolean;
	dismissRequested: boolean;
	pillRo: ResizeObserver;
	contentRo: ResizeObserver | null;
	pillAnim: Animation | null;
	prevPill: { x: number; width: number; height: number };
	pillFirst: boolean;
	headerKey: string;
	headerPad: number | null;
	connectHandle: { destroy(): void };
	timers: Set<ReturnType<typeof setTimeout>>;
	item: FluixToastItem;
}

/* ----------------------------- Re-exports ----------------------------- */

export { applyUpdate, destroyInstance } from "./update";

/* ----------------------------- Helpers ----------------------------- */

export function getPillAlign(position: string): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

/* ----------------------------- SVG builder ----------------------------- */

function buildInstanceSvg(item: FluixToastItem, roundness: number, blur: number) {
	const filterId = `fluix-gooey-${item.id.replace(/[^a-z0-9-]/gi, "-")}`;
	const hasDesc = Boolean(item.description) || Boolean(item.button);
	const initialSvgHeight = hasDesc ? HEIGHT * MIN_EXPAND_RATIO : HEIGHT;

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("data-fluix-svg", "");
	svg.setAttribute("width", String(WIDTH));
	svg.setAttribute("height", String(initialSvgHeight));
	svg.setAttribute("viewBox", `0 0 ${WIDTH} ${initialSvgHeight}`);
	svg.setAttribute("aria-hidden", "true");

	const { g, defs } = createGooeyFilter(filterId, blur);
	svg.appendChild(defs);

	const initialPillX =
		getPillAlign(item.position) === "right" ? WIDTH - HEIGHT
		: getPillAlign(item.position) === "center" ? (WIDTH - HEIGHT) / 2
		: 0;

	const fill = item.fill ?? "var(--fluix-surface-contrast)";

	const pillEl = document.createElementNS(SVG_NS, "rect");
	pillEl.setAttribute("data-fluix-pill", "");
	for (const [k, v] of Object.entries({ x: initialPillX, y: 0, width: HEIGHT, height: HEIGHT, rx: roundness, ry: roundness })) {
		pillEl.setAttribute(k, String(v));
	}
	pillEl.setAttribute("fill", fill);

	const bodyEl = document.createElementNS(SVG_NS, "rect");
	bodyEl.setAttribute("data-fluix-body", "");
	for (const [k, v] of Object.entries({ x: 0, y: HEIGHT, width: WIDTH, height: 0, rx: roundness, ry: roundness })) {
		bodyEl.setAttribute(k, String(v));
	}
	bodyEl.setAttribute("fill", fill);
	bodyEl.setAttribute("opacity", "0");

	g.appendChild(pillEl);
	g.appendChild(bodyEl);
	svg.appendChild(g);

	return { svg, pillEl, bodyEl, initialPillX };
}

/* ----------------------------- Content builder ----------------------------- */

function buildInstanceContent(item: FluixToastItem) {
	let contentEl: HTMLDivElement | null = null;
	let descriptionEl: HTMLDivElement | null = null;
	const hasDesc = Boolean(item.description) || Boolean(item.button);

	if (!hasDesc) return { contentEl, descriptionEl };

	contentEl = document.createElement("div");
	descriptionEl = document.createElement("div");
	if (item.styles?.description) descriptionEl.className = item.styles.description;

	if (item.description != null) {
		if (typeof item.description === "string") descriptionEl.textContent = item.description;
		else if (item.description instanceof HTMLElement) descriptionEl.appendChild(item.description);
	}

	if (item.button) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.textContent = item.button.title;
		if (item.styles?.button) btn.className = item.styles.button;
		btn.addEventListener("click", (e) => { e.stopPropagation(); item.button?.onClick(); });
		descriptionEl.appendChild(btn);
	}

	contentEl.appendChild(descriptionEl);
	return { contentEl, descriptionEl };
}

/* ----------------------------- Header builder ----------------------------- */

function buildHeader(item: FluixToastItem) {
	const headerEl = document.createElement("div");
	const headerStackEl = document.createElement("div");
	headerStackEl.setAttribute("data-fluix-header-stack", "");

	const innerEl = document.createElement("div");
	innerEl.setAttribute("data-fluix-header-inner", "");
	innerEl.setAttribute("data-layer", "current");

	const badgeEl = document.createElement("div");
	renderIconInto(badgeEl, item.icon, item.state);

	const titleEl = document.createElement("span");
	titleEl.textContent = item.title ?? item.state;

	innerEl.appendChild(badgeEl);
	innerEl.appendChild(titleEl);
	headerStackEl.appendChild(innerEl);
	headerEl.appendChild(headerStackEl);

	return { headerEl, headerStackEl, innerEl, badgeEl, titleEl };
}

/* ----------------------------- createInstance ----------------------------- */

export function createInstance(item: FluixToastItem, machine: ToastMachine): ToastInstance {
	const localState = { ready: false, expanded: false };
	const roundness = item.roundness ?? TOAST_DEFAULTS.roundness;
	const blur = Math.min(10, Math.max(6, roundness * 0.45));

	const el = document.createElement("button");
	el.type = "button";

	const canvasDiv = document.createElement("div");
	const { svg, pillEl, bodyEl, initialPillX } = buildInstanceSvg(item, roundness, blur);
	canvasDiv.appendChild(svg);
	el.appendChild(canvasDiv);

	const { headerEl, headerStackEl, innerEl, badgeEl, titleEl } = buildHeader(item);
	el.appendChild(headerEl);

	const { contentEl, descriptionEl } = buildInstanceContent(item);
	if (contentEl) el.appendChild(contentEl);

	const attrs = CoreToaster.getAttrs(item, localState);
	applyAttrs(el, attrs.root);
	applyAttrs(canvasDiv, attrs.canvas);
	applyAttrs(headerEl, attrs.header);
	applyAttrs(badgeEl, attrs.badge);
	if (item.styles?.badge) badgeEl.className = item.styles.badge;
	applyAttrs(titleEl, attrs.title);
	if (item.styles?.title) titleEl.className = item.styles.title;
	if (contentEl) applyAttrs(contentEl, attrs.content);
	if (descriptionEl) applyAttrs(descriptionEl, attrs.description);
	if (item.button && descriptionEl) {
		const btnEl = descriptionEl.querySelector("button");
		if (btnEl) applyAttrs(btnEl, attrs.button);
	}

	const inst: ToastInstance = {
		el, pillEl, bodyEl, svgEl: svg, headerEl, innerEl, headerStackEl,
		contentEl, descriptionEl, localState,
		pillWidth: 0, contentHeight: 0,
		frozenExpanded: HEIGHT * MIN_EXPAND_RATIO,
		hovering: false, pendingDismiss: false, dismissRequested: false,
		pillRo: null!, contentRo: null, pillAnim: null,
		prevPill: { x: initialPillX, width: HEIGHT, height: HEIGHT },
		pillFirst: true,
		headerKey: `${item.state}-${item.title ?? item.state}`,
		headerPad: null, connectHandle: null!,
		timers: new Set(), item,
	};

	wireObservers(inst, item);
	wireConnect(inst, item, machine);
	applyVars(inst, item);
	setTimer(inst, () => {
		inst.localState.ready = true;
		applyUpdate(inst, inst.item, machine);
		setupAutopilot(inst, inst.item, machine);
	}, 32);
	setupAutoDismiss(inst, item, machine);
	measurePillWidth(inst);

	return inst;
}

/* ----------------------------- Observers ----------------------------- */

function wireObservers(inst: ToastInstance, _item: FluixToastItem) {
	inst.pillRo = new ResizeObserver(() => {
		requestAnimationFrame(() => {
			measurePillWidth(inst);
			applyVars(inst, inst.item);
		});
	});
	inst.pillRo.observe(inst.innerEl);

	if (inst.descriptionEl) {
		const descEl = inst.descriptionEl;
		inst.contentRo = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				const h = descEl.scrollHeight;
				if (h !== inst.contentHeight) { inst.contentHeight = h; applyVars(inst, inst.item); }
			});
		});
		inst.contentRo.observe(descEl);
	}
}

function wireConnect(inst: ToastInstance, item: FluixToastItem, machine: ToastMachine) {
	inst.connectHandle = CoreToaster.connect(inst.el, {
		onExpand: () => {
			if (inst.item.exiting || inst.dismissRequested) return;
			inst.localState.expanded = true;
			applyUpdate(inst, inst.item, machine);
		},
		onCollapse: () => {
			if (inst.item.exiting || inst.dismissRequested) return;
			if (inst.item.autopilot !== false) return;
			inst.localState.expanded = false;
			applyUpdate(inst, inst.item, machine);
		},
		onDismiss: () => {
			if (inst.dismissRequested) return;
			inst.dismissRequested = true;
			machine.dismiss(item.id);
		},
		onHoverStart: () => { inst.hovering = true; },
		onHoverEnd: () => {
			inst.hovering = false;
			if (inst.pendingDismiss) {
				inst.pendingDismiss = false;
				if (inst.dismissRequested) return;
				inst.dismissRequested = true;
				machine.dismiss(inst.item.id);
			}
		},
	}, item);
}
