/**
 * Vanilla JS Toaster — imperative DOM adapter for the Fluix toast system.
 *
 * Subscribes to the core store and diffs snapshots to create, update, and
 * destroy toast DOM elements without any framework dependency.
 */

import {
	Toaster as CoreToaster,
	FLUIX_SPRING,
	type FluixPosition,
	type FluixToastItem,
	type FluixToastLayout,
	type FluixToasterConfig,
	TOAST_DEFAULTS,
	type ToastMachine,
	animateSpring,
} from "@fluix/core";

/* ----------------------------- Constants ----------------------------- */

const WIDTH = 350;
const HEIGHT = 40;
const PILL_PADDING = 10;
const MIN_EXPAND_RATIO = 2.25;
const HEADER_EXIT_MS = 600 * 0.7;
const BODY_MERGE_OVERLAP = 6;

const SVG_NS = "http://www.w3.org/2000/svg";

/* ----------------------------- Types ----------------------------- */

interface ToastInstance {
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

/* ----------------------------- SVG icon builders ----------------------------- */

function createSvgIcon(state: FluixToastItem["state"]): SVGSVGElement | null {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("width", "14");
	svg.setAttribute("height", "14");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "2.5");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");
	svg.setAttribute("aria-hidden", "true");

	switch (state) {
		case "success": {
			const p = document.createElementNS(SVG_NS, "polyline");
			p.setAttribute("points", "20 6 9 17 4 12");
			svg.appendChild(p);
			break;
		}
		case "error": {
			const l1 = document.createElementNS(SVG_NS, "line");
			l1.setAttribute("x1", "18");
			l1.setAttribute("y1", "6");
			l1.setAttribute("x2", "6");
			l1.setAttribute("y2", "18");
			const l2 = document.createElementNS(SVG_NS, "line");
			l2.setAttribute("x1", "6");
			l2.setAttribute("y1", "6");
			l2.setAttribute("x2", "18");
			l2.setAttribute("y2", "18");
			svg.appendChild(l1);
			svg.appendChild(l2);
			break;
		}
		case "warning": {
			const path = document.createElementNS(SVG_NS, "path");
			path.setAttribute(
				"d",
				"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
			);
			const l1 = document.createElementNS(SVG_NS, "line");
			l1.setAttribute("x1", "12");
			l1.setAttribute("y1", "9");
			l1.setAttribute("x2", "12");
			l1.setAttribute("y2", "13");
			const l2 = document.createElementNS(SVG_NS, "line");
			l2.setAttribute("x1", "12");
			l2.setAttribute("y1", "17");
			l2.setAttribute("x2", "12.01");
			l2.setAttribute("y2", "17");
			svg.appendChild(path);
			svg.appendChild(l1);
			svg.appendChild(l2);
			break;
		}
		case "info": {
			const c = document.createElementNS(SVG_NS, "circle");
			c.setAttribute("cx", "12");
			c.setAttribute("cy", "12");
			c.setAttribute("r", "10");
			const l1 = document.createElementNS(SVG_NS, "line");
			l1.setAttribute("x1", "12");
			l1.setAttribute("y1", "16");
			l1.setAttribute("x2", "12");
			l1.setAttribute("y2", "12");
			const l2 = document.createElementNS(SVG_NS, "line");
			l2.setAttribute("x1", "12");
			l2.setAttribute("y1", "8");
			l2.setAttribute("x2", "12.01");
			l2.setAttribute("y2", "8");
			svg.appendChild(c);
			svg.appendChild(l1);
			svg.appendChild(l2);
			break;
		}
		case "loading": {
			svg.setAttribute("data-fluix-icon", "spin");
			const lines: [string, string, string, string][] = [
				["12", "2", "12", "6"],
				["12", "18", "12", "22"],
				["4.93", "4.93", "7.76", "7.76"],
				["16.24", "16.24", "19.07", "19.07"],
				["2", "12", "6", "12"],
				["18", "12", "22", "12"],
				["4.93", "19.07", "7.76", "16.24"],
				["16.24", "7.76", "19.07", "4.93"],
			];
			for (const [x1, y1, x2, y2] of lines) {
				const l = document.createElementNS(SVG_NS, "line");
				l.setAttribute("x1", x1);
				l.setAttribute("y1", y1);
				l.setAttribute("x2", x2);
				l.setAttribute("y2", y2);
				svg.appendChild(l);
			}
			break;
		}
		case "action": {
			const c = document.createElementNS(SVG_NS, "circle");
			c.setAttribute("cx", "12");
			c.setAttribute("cy", "12");
			c.setAttribute("r", "10");
			const poly = document.createElementNS(SVG_NS, "polygon");
			poly.setAttribute("points", "10 8 16 12 10 16 10 8");
			poly.setAttribute("fill", "currentColor");
			poly.setAttribute("stroke", "none");
			svg.appendChild(c);
			svg.appendChild(poly);
			break;
		}
		default:
			return null;
	}
	return svg;
}

function renderIconInto(container: HTMLElement, icon: unknown, state: FluixToastItem["state"]) {
	container.textContent = "";
	if (icon != null) {
		if (icon instanceof HTMLElement || icon instanceof SVGElement) {
			container.appendChild(icon);
		} else {
			const span = document.createElement("span");
			span.setAttribute("aria-hidden", "true");
			span.textContent = String(icon);
			container.appendChild(span);
		}
		return;
	}
	const svgIcon = createSvgIcon(state);
	if (svgIcon) container.appendChild(svgIcon);
}

/* ----------------------------- Helpers ----------------------------- */

function getPillAlign(position: FluixPosition): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

function applyAttrs(el: Element, attrs: Record<string, string>) {
	for (const [key, value] of Object.entries(attrs)) {
		el.setAttribute(key, value);
	}
}

function resolveOffsetValue(v: number | string): string {
	return typeof v === "number" ? `${v}px` : v;
}

function applyViewportOffset(
	el: HTMLElement,
	offset: FluixToasterConfig["offset"],
	position: FluixPosition,
) {
	el.style.top = "";
	el.style.right = "";
	el.style.bottom = "";
	el.style.left = "";
	el.style.paddingLeft = "";
	el.style.paddingRight = "";

	if (offset == null) return;

	let top: string | undefined;
	let right: string | undefined;
	let bottom: string | undefined;
	let left: string | undefined;

	if (typeof offset === "number" || typeof offset === "string") {
		const v = resolveOffsetValue(offset as number | string);
		top = v;
		right = v;
		bottom = v;
		left = v;
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

function setTimer(inst: ToastInstance, fn: () => void, ms: number): ReturnType<typeof setTimeout> {
	const id = setTimeout(() => {
		inst.timers.delete(id);
		fn();
	}, ms);
	inst.timers.add(id);
	return id;
}

/* ----------------------------- Compute layout values ----------------------------- */

function computeLayout(item: FluixToastItem, inst: ToastInstance) {
	const { ready, expanded: isExpanded } = inst.localState;
	const roundness = item.roundness ?? TOAST_DEFAULTS.roundness;
	const blur = Math.min(10, Math.max(6, roundness * 0.45));
	const hasDesc = Boolean(item.description) || Boolean(item.button);
	const isLoading = item.state === "loading";
	const open = hasDesc && isExpanded && !isLoading;
	const position = getPillAlign(item.position);
	const edge = item.position.startsWith("top") ? "bottom" : "top";

	const resolvedPillWidth = Math.max(inst.pillWidth || HEIGHT, HEIGHT);
	const pillHeight = HEIGHT + blur * 3;
	const pillX =
		position === "right"
			? WIDTH - resolvedPillWidth
			: position === "center"
				? (WIDTH - resolvedPillWidth) / 2
				: 0;

	const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
	const rawExpanded = hasDesc ? Math.max(minExpanded, HEIGHT + inst.contentHeight) : minExpanded;
	if (open) {
		inst.frozenExpanded = rawExpanded;
	}
	const expanded = open ? rawExpanded : inst.frozenExpanded;
	const expandedContent = Math.max(0, expanded - HEIGHT);
	const svgHeight = hasDesc ? Math.max(expanded, minExpanded) : HEIGHT;

	return {
		ready,
		isExpanded,
		roundness,
		blur,
		hasDesc,
		isLoading,
		open,
		position,
		edge,
		resolvedPillWidth,
		pillHeight,
		pillX,
		minExpanded,
		expanded,
		expandedContent,
		svgHeight,
	};
}

/* ----------------------------- createInstance ----------------------------- */

function createInstance(item: FluixToastItem, machine: ToastMachine): ToastInstance {
	const localState = { ready: false, expanded: false };
	const roundness = item.roundness ?? TOAST_DEFAULTS.roundness;
	const blur = Math.min(10, Math.max(6, roundness * 0.45));
	const filterId = `fluix-gooey-${item.id.replace(/[^a-z0-9-]/gi, "-")}`;
	const hasDesc = Boolean(item.description) || Boolean(item.button);

	// Root button
	const el = document.createElement("button");
	el.type = "button";

	// Canvas div
	const canvasDiv = document.createElement("div");

	// SVG — initial height accounts for description area (matches React/Vue)
	const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
	const initialSvgHeight = hasDesc ? minExpanded : HEIGHT;
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("data-fluix-svg", "");
	svg.setAttribute("width", String(WIDTH));
	svg.setAttribute("height", String(initialSvgHeight));
	svg.setAttribute("viewBox", `0 0 ${WIDTH} ${initialSvgHeight}`);
	svg.setAttribute("aria-hidden", "true");

	// Defs + filter
	const defs = document.createElementNS(SVG_NS, "defs");
	const filter = document.createElementNS(SVG_NS, "filter");
	filter.setAttribute("id", filterId);
	filter.setAttribute("x", "-20%");
	filter.setAttribute("y", "-20%");
	filter.setAttribute("width", "140%");
	filter.setAttribute("height", "140%");
	filter.setAttribute("color-interpolation-filters", "sRGB");

	const feBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
	feBlur.setAttribute("in", "SourceGraphic");
	feBlur.setAttribute("stdDeviation", String(blur));
	feBlur.setAttribute("result", "blur");

	const feCM = document.createElementNS(SVG_NS, "feColorMatrix");
	feCM.setAttribute("in", "blur");
	feCM.setAttribute("type", "matrix");
	feCM.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10");
	feCM.setAttribute("result", "goo");

	const feComp = document.createElementNS(SVG_NS, "feComposite");
	feComp.setAttribute("in", "SourceGraphic");
	feComp.setAttribute("in2", "goo");
	feComp.setAttribute("operator", "atop");

	filter.appendChild(feBlur);
	filter.appendChild(feCM);
	filter.appendChild(feComp);
	defs.appendChild(filter);
	svg.appendChild(defs);

	const g = document.createElementNS(SVG_NS, "g");
	g.setAttribute("filter", `url(#${filterId})`);

	// Pill rect — initial position matches React/Vue (computed from position)
	const initialPillX =
		getPillAlign(item.position) === "right"
			? WIDTH - HEIGHT
			: getPillAlign(item.position) === "center"
				? (WIDTH - HEIGHT) / 2
				: 0;
	const pillEl = document.createElementNS(SVG_NS, "rect");
	pillEl.setAttribute("data-fluix-pill", "");
	pillEl.setAttribute("x", String(initialPillX));
	pillEl.setAttribute("y", "0");
	pillEl.setAttribute("width", String(HEIGHT));
	pillEl.setAttribute("height", String(HEIGHT));
	pillEl.setAttribute("rx", String(roundness));
	pillEl.setAttribute("ry", String(roundness));
	pillEl.setAttribute("fill", item.fill ?? "#FFFFFF");

	// Body rect
	const bodyEl = document.createElementNS(SVG_NS, "rect");
	bodyEl.setAttribute("data-fluix-body", "");
	bodyEl.setAttribute("x", "0");
	bodyEl.setAttribute("y", String(HEIGHT));
	bodyEl.setAttribute("width", String(WIDTH));
	bodyEl.setAttribute("height", "0");
	bodyEl.setAttribute("rx", String(roundness));
	bodyEl.setAttribute("ry", String(roundness));
	bodyEl.setAttribute("fill", item.fill ?? "#FFFFFF");
	bodyEl.setAttribute("opacity", "0");

	g.appendChild(pillEl);
	g.appendChild(bodyEl);
	svg.appendChild(g);
	canvasDiv.appendChild(svg);
	el.appendChild(canvasDiv);

	// Header div
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
	el.appendChild(headerEl);

	// Content div (optional)
	let contentEl: HTMLDivElement | null = null;
	let descriptionEl: HTMLDivElement | null = null;

	if (hasDesc) {
		contentEl = document.createElement("div");
		descriptionEl = document.createElement("div");
		if (item.styles?.description) {
			descriptionEl.className = item.styles.description;
		}

		if (item.description != null) {
			if (typeof item.description === "string") {
				descriptionEl.textContent = item.description;
			} else if (item.description instanceof HTMLElement) {
				descriptionEl.appendChild(item.description);
			}
		}

		if (item.button) {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.textContent = item.button.title;
			if (item.styles?.button) {
				btn.className = item.styles.button;
			}
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				item.button?.onClick();
			});
			descriptionEl.appendChild(btn);
		}

		contentEl.appendChild(descriptionEl);
		el.appendChild(contentEl);
	}

	// Apply initial attrs
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

	// Apply button attrs
	if (item.button && descriptionEl) {
		const btnEl = descriptionEl.querySelector("button");
		if (btnEl) applyAttrs(btnEl, attrs.button);
	}

	const headerKey = `${item.state}-${item.title ?? item.state}`;

	const inst: ToastInstance = {
		el,
		pillEl,
		bodyEl,
		svgEl: svg,
		headerEl,
		innerEl,
		headerStackEl,
		contentEl,
		descriptionEl,
		localState,
		pillWidth: 0,
		contentHeight: 0,
		frozenExpanded: HEIGHT * MIN_EXPAND_RATIO,
		hovering: false,
		pendingDismiss: false,
		dismissRequested: false,
		pillRo: null!,
		contentRo: null,
		pillAnim: null,
		prevPill: { x: initialPillX, width: HEIGHT, height: HEIGHT },
		pillFirst: true,
		headerKey,
		headerPad: null,
		connectHandle: null!,
		timers: new Set(),
		item,
	};

	// Set up pill ResizeObserver
	inst.pillRo = new ResizeObserver(() => {
		requestAnimationFrame(() => {
			measurePillWidth(inst);
			applyVars(inst, inst.item);
			animatePill(inst, inst.item);
		});
	});
	inst.pillRo.observe(innerEl);

	// Set up content ResizeObserver
	if (descriptionEl) {
		inst.contentRo = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				const h = descriptionEl!.scrollHeight;
				if (h !== inst.contentHeight) {
					inst.contentHeight = h;
					applyVars(inst, inst.item);
				}
			});
		});
		inst.contentRo.observe(descriptionEl);
	}

	// Wire connect
	inst.connectHandle = CoreToaster.connect(
		el,
		{
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
			onHoverStart: () => {
				inst.hovering = true;
			},
			onHoverEnd: () => {
				inst.hovering = false;
				if (inst.pendingDismiss) {
					inst.pendingDismiss = false;
					if (inst.dismissRequested) return;
					inst.dismissRequested = true;
					machine.dismiss(inst.item.id);
				}
			},
		},
		item,
	);

	// Apply initial CSS vars
	applyVars(inst, item);

	// Ready timer
	setTimer(
		inst,
		() => {
			inst.localState.ready = true;
			applyUpdate(inst, inst.item, machine);
		},
		32,
	);

	// Auto-dismiss timer
	setupAutoDismiss(inst, item, machine);

	// Autopilot timers
	setupAutopilot(inst, item, machine);

	// Initial pill measurement
	measurePillWidth(inst);

	return inst;
}

/* ----------------------------- measurePillWidth ----------------------------- */

function measurePillWidth(inst: ToastInstance) {
	// Skip measurement if the element is not connected to the DOM yet
	if (!inst.el.isConnected) return;

	if (inst.headerPad === null) {
		const cs = getComputedStyle(inst.headerEl);
		inst.headerPad = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight);
	}
	// Use getBoundingClientRect for accurate measurement (matches Vue adapter)
	const intrinsicWidth = inst.innerEl.getBoundingClientRect().width;
	const w = intrinsicWidth + inst.headerPad + PILL_PADDING;
	if (w > PILL_PADDING && w !== inst.pillWidth) {
		inst.pillWidth = w;
	}
}

/* ----------------------------- applyVars ----------------------------- */

function applyVars(inst: ToastInstance, item: FluixToastItem) {
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

	for (const [key, value] of Object.entries(vars)) {
		inst.el.style.setProperty(key, value);
	}

	// Update SVG dimensions
	inst.svgEl.setAttribute("height", String(svgHeight));
	inst.svgEl.setAttribute("viewBox", `0 0 ${WIDTH} ${svgHeight}`);
}

/* ----------------------------- animatePill ----------------------------- */

function animatePill(inst: ToastInstance, item: FluixToastItem) {
	const layout = computeLayout(item, inst);
	const { open, resolvedPillWidth, pillX, pillHeight } = layout;

	const prev = inst.prevPill;
	const next = { x: pillX, width: resolvedPillWidth, height: open ? pillHeight : HEIGHT };

	if (prev.x === next.x && prev.width === next.width && prev.height === next.height) return;

	inst.pillAnim?.cancel();

	// Before ready or on first measurement, set attributes directly (no spring)
	if (!inst.localState.ready || inst.pillFirst) {
		inst.pillFirst = false;
		inst.pillEl.setAttribute("x", String(next.x));
		inst.pillEl.setAttribute("width", String(next.width));
		inst.pillEl.setAttribute("height", String(next.height));
		inst.prevPill = next;
		return;
	}

	const anim = animateSpring(
		inst.pillEl,
		{
			x: { from: prev.x, to: next.x, unit: "px" },
			width: { from: prev.width, to: next.width, unit: "px" },
			height: { from: prev.height, to: next.height, unit: "px" },
		},
		FLUIX_SPRING,
	);

	inst.pillAnim = anim;
	inst.prevPill = next;
}

/* ----------------------------- setupAutoDismiss ----------------------------- */

function setupAutoDismiss(inst: ToastInstance, item: FluixToastItem, machine: ToastMachine) {
	const duration = item.duration;
	if (duration == null || duration <= 0) return;

	setTimer(
		inst,
		() => {
			if (inst.hovering) {
				inst.pendingDismiss = true;
				setTimer(
					inst,
					() => {
						if (inst.dismissRequested) return;
						inst.dismissRequested = true;
						inst.pendingDismiss = false;
						machine.dismiss(item.id);
					},
					1200,
				);
				return;
			}
			inst.pendingDismiss = false;
			inst.dismissRequested = true;
			machine.dismiss(item.id);
		},
		duration,
	);
}

/* ----------------------------- setupAutopilot ----------------------------- */

function setupAutopilot(inst: ToastInstance, item: FluixToastItem, machine: ToastMachine) {
	if (!inst.localState.ready) return;

	if (item.autoExpandDelayMs != null && item.autoExpandDelayMs > 0) {
		setTimer(
			inst,
			() => {
				if (!inst.hovering) {
					inst.localState.expanded = true;
					applyUpdate(inst, inst.item, machine);
				}
			},
			item.autoExpandDelayMs,
		);
	}

	if (item.autoCollapseDelayMs != null && item.autoCollapseDelayMs > 0) {
		setTimer(
			inst,
			() => {
				if (!inst.hovering) {
					inst.localState.expanded = false;
					applyUpdate(inst, inst.item, machine);
				}
			},
			item.autoCollapseDelayMs,
		);
	}
}

/* ----------------------------- applyUpdate ----------------------------- */

function applyUpdate(inst: ToastInstance, item: FluixToastItem, _machine: ToastMachine) {
	inst.item = item;

	const attrs = CoreToaster.getAttrs(item, inst.localState);
	applyAttrs(inst.el, attrs.root);

	// Canvas
	const canvasEl = inst.el.querySelector("[data-fluix-canvas]");
	if (canvasEl) applyAttrs(canvasEl, attrs.canvas);

	// Header
	applyAttrs(inst.headerEl, attrs.header);

	// Badge & title in current layer
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

	// Content
	if (inst.contentEl) applyAttrs(inst.contentEl, attrs.content);
	if (inst.descriptionEl) applyAttrs(inst.descriptionEl, attrs.description);

	// Button attrs
	if (item.button && inst.descriptionEl) {
		const btnEl = inst.descriptionEl.querySelector("button");
		if (btnEl) applyAttrs(btnEl, attrs.button);
	}

	// Update pill fill
	inst.pillEl.setAttribute("fill", item.fill ?? "#FFFFFF");
	inst.bodyEl.setAttribute("fill", item.fill ?? "#FFFFFF");

	// Header crossfade
	const newHeaderKey = `${item.state}-${item.title ?? item.state}`;
	if (newHeaderKey !== inst.headerKey) {
		crossfadeHeader(inst, item, attrs);
		inst.headerKey = newHeaderKey;
	}

	applyVars(inst, item);
	animatePill(inst, item);
}

/* ----------------------------- crossfadeHeader ----------------------------- */

function crossfadeHeader(
	inst: ToastInstance,
	item: FluixToastItem,
	attrs: ReturnType<typeof CoreToaster.getAttrs>,
) {
	// Move current → prev (exiting)
	const oldInner = inst.innerEl;
	oldInner.setAttribute("data-layer", "prev");
	oldInner.setAttribute("data-exiting", "true");

	// Create new current
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

	// Re-observe for pill measurement
	inst.pillRo.unobserve(oldInner);
	inst.pillRo.observe(newInner);

	// Remove old after exit animation
	setTimer(
		inst,
		() => {
			oldInner.remove();
		},
		HEADER_EXIT_MS,
	);

	// Re-measure pill
	requestAnimationFrame(() => {
		measurePillWidth(inst);
		applyVars(inst, inst.item);
		animatePill(inst, inst.item);
	});
}

/* ----------------------------- destroyInstance ----------------------------- */

function destroyInstance(inst: ToastInstance) {
	for (const t of inst.timers) clearTimeout(t);
	inst.timers.clear();
	inst.pillAnim?.cancel();
	inst.pillRo.disconnect();
	inst.contentRo?.disconnect();
	inst.connectHandle.destroy();
	inst.el.remove();
}

/* ----------------------------- createToaster ----------------------------- */

export function createToaster(config?: FluixToasterConfig): {
	destroy(): void;
	update(config: FluixToasterConfig): void;
} {
	const machine = CoreToaster.getMachine();
	let currentConfig = config;
	if (currentConfig) machine.configure(currentConfig);

	const instances = new Map<string, ToastInstance>();
	const viewports = new Map<FluixPosition, HTMLElement>();

	function ensureViewport(
		position: FluixPosition,
		layout: FluixToastLayout,
		offset: FluixToasterConfig["offset"],
	): HTMLElement {
		let vp = viewports.get(position);
		if (!vp) {
			vp = document.createElement("section");
			const vpAttrs = CoreToaster.getViewportAttrs(position, layout);
			applyAttrs(vp, vpAttrs);
			applyViewportOffset(vp, offset, position);
			document.body.appendChild(vp);
			viewports.set(position, vp);
		}
		return vp;
	}

	function removeViewport(position: FluixPosition) {
		const vp = viewports.get(position);
		if (vp) {
			vp.remove();
			viewports.delete(position);
		}
	}

	function sync() {
		const next = machine.store.getSnapshot();
		const resolvedLayout = next.config?.layout ?? currentConfig?.layout ?? "stack";
		const resolvedOffset = next.config?.offset ?? currentConfig?.offset;

		// Track which positions are active
		const activePositions = new Set<FluixPosition>();
		const nextIds = new Set(next.toasts.map((t) => t.id));

		// Remove instances for toasts that are gone
		for (const [id, inst] of instances) {
			if (!nextIds.has(id)) {
				destroyInstance(inst);
				instances.delete(id);
			}
		}

		// Create/update instances
		for (const item of next.toasts) {
			activePositions.add(item.position);
			const vp = ensureViewport(item.position, resolvedLayout, resolvedOffset);

			const existing = instances.get(item.id);
			if (!existing) {
				// New toast
				const inst = createInstance(item, machine);
				instances.set(item.id, inst);
				vp.appendChild(inst.el);
			} else if (existing.item.instanceId !== item.instanceId) {
				// Content swapped (e.g., promise resolution) - rebuild
				destroyInstance(existing);
				const inst = createInstance(item, machine);
				instances.set(item.id, inst);
				vp.appendChild(inst.el);
			} else {
				// Same instance, update attrs/vars
				applyUpdate(existing, item, machine);
				// Ensure it's in the right viewport
				if (existing.el.parentElement !== vp) {
					vp.appendChild(existing.el);
				}
			}
		}

		// Update viewport attrs (layout may have changed)
		for (const [position, vp] of viewports) {
			const vpAttrs = CoreToaster.getViewportAttrs(position, resolvedLayout);
			applyAttrs(vp, vpAttrs);
			applyViewportOffset(vp, resolvedOffset, position);
		}

		// Remove empty viewports
		for (const [position] of viewports) {
			if (!activePositions.has(position)) {
				removeViewport(position);
			}
		}
	}

	// Initial sync
	sync();

	// Subscribe to store changes
	const unsubscribe = machine.store.subscribe(sync);

	return {
		destroy() {
			unsubscribe();
			for (const inst of instances.values()) {
				destroyInstance(inst);
			}
			instances.clear();
			for (const vp of viewports.values()) {
				vp.remove();
			}
			viewports.clear();
		},
		update(newConfig: FluixToasterConfig) {
			currentConfig = newConfig;
			machine.configure(newConfig);
		},
	};
}
