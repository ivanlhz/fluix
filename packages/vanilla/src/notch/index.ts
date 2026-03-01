/**
 * Vanilla JS Notch — imperative DOM adapter for the Fluix Notch component.
 */

import {
	createNotchMachine,
	getNotchAttrs,
	animateSpring,
	FLUIX_SPRING,
	NOTCH_DEFAULTS,
	type NotchMachine,
	type NotchPosition,
	type NotchTrigger,
	type NotchTheme,
	type SpringConfig,
} from "@fluix-ui/core";

import { applyAttrs } from "../shared";
import { type HighlightTracker } from "./highlight";
import { resolveContent, buildNotchDOM, type NotchDOMRefs } from "./dom";

/* ----------------------------- Types ----------------------------- */

export interface NotchOptions {
	trigger?: NotchTrigger;
	position?: NotchPosition;
	spring?: SpringConfig;
	dotSize?: number;
	roundness?: number;
	theme?: NotchTheme;
	fill?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	pill: HTMLElement | string;
	content: HTMLElement | string;
}

export interface NotchInstance {
	open(): void;
	close(): void;
	toggle(): void;
	destroy(): void;
	update(opts: Partial<NotchOptions>): void;
}

/** Internal mutable state for a notch instance. */
interface NotchCtx {
	trigger: NotchTrigger;
	position: NotchPosition;
	spring: SpringConfig | undefined;
	dotSize: number;
	roundness: number;
	theme: NotchTheme;
	fill: string | undefined;
	controlledOpen: boolean | undefined;
	onOpenChange: ((open: boolean) => void) | undefined;
	snapshot: { open: boolean };
	prevOpenVal: boolean | undefined;
	contentSize: { w: number; h: number };
	currentAnim: Animation | null;
	measureRaf: number;
	machine: NotchMachine;
	highlight: HighlightTracker;
	prev: { w: number; h: number };
	dom: NotchDOMRefs;
}

/* ----------------------------- Helpers ----------------------------- */

const HL_PAD = 12;

function dims(ctx: NotchCtx) {
	const collW = ctx.dotSize, collH = ctx.dotSize;
	const expW = ctx.contentSize.w + HL_PAD * 2;
	const expH = Math.max(ctx.contentSize.h + HL_PAD, ctx.dotSize);
	const tW = ctx.snapshot.open ? expW : collW;
	const tH = ctx.snapshot.open ? expH : collH;
	const rW = Math.max(expW, collW);
	const rH = Math.max(expH, collH);
	return { collW, collH, expW, expH, tW, tH, rW, rH };
}

function blur(ctx: NotchCtx) { return Math.min(10, Math.max(6, ctx.roundness * 0.45)); }
function springCfg(ctx: NotchCtx): SpringConfig { return ctx.spring ?? FLUIX_SPRING; }

/* ----------------------------- Rect animation ----------------------------- */

function animateRect(ctx: NotchCtx) {
	const d = dims(ctx);
	if (d.tW === ctx.prev.w && d.tH === ctx.prev.h) return;

	if (ctx.currentAnim) { ctx.currentAnim.cancel(); ctx.currentAnim = null; }

	const fromW = ctx.prev.w, fromH = ctx.prev.h;
	const fromX = (d.rW - fromW) / 2, fromY = (d.rH - fromH) / 2;
	const toX = (d.rW - d.tW) / 2, toY = (d.rH - d.tH) / 2;
	ctx.prev.w = d.tW; ctx.prev.h = d.tH;

	const wasCollapsed = fromW === d.collW && fromH === d.collH;
	const isCollapsing = d.tW === d.collW && d.tH === d.collH;
	const fromRx = wasCollapsed ? d.collW / 2 : ctx.roundness;
	const toRx = isCollapsing ? d.collW / 2 : ctx.roundness;

	const el = ctx.dom.svgRectEl;
	const a = animateSpring(el, {
		width: { from: fromW, to: d.tW, unit: "px" }, height: { from: fromH, to: d.tH, unit: "px" },
		x: { from: fromX, to: toX, unit: "px" }, y: { from: fromY, to: toY, unit: "px" },
		rx: { from: fromRx, to: toRx, unit: "px" }, ry: { from: fromRx, to: toRx, unit: "px" },
	}, springCfg(ctx));

	const applyFinal = () => {
		for (const [k, v] of Object.entries({ width: d.tW, height: d.tH, x: toX, y: toY, rx: toRx, ry: toRx })) el.setAttribute(k, String(v));
	};
	if (a) { ctx.currentAnim = a; a.onfinish = () => { ctx.currentAnim = null; applyFinal(); }; }
	else applyFinal();
}

/* ----------------------------- Layout update ----------------------------- */

function updateLayout(ctx: NotchCtx) {
	const d = dims(ctx);
	const isOpen = ctx.snapshot.open;
	const newAttrs = getNotchAttrs({ open: isOpen, position: ctx.position, theme: ctx.theme });

	applyAttrs(ctx.dom.rootEl, newAttrs.root);
	ctx.dom.rootEl.setAttribute("aria-expanded", String(isOpen));
	ctx.dom.rootEl.style.width = `${d.rW}px`;
	ctx.dom.rootEl.style.height = `${d.rH}px`;

	ctx.dom.svg.setAttribute("width", String(d.rW));
	ctx.dom.svg.setAttribute("height", String(d.rH));
	ctx.dom.svg.setAttribute("viewBox", `0 0 ${d.rW} ${d.rH}`);
	ctx.dom.feBlur.setAttribute("stdDeviation", String(blur(ctx)));

	const effectiveFill = ctx.fill ?? "var(--fluix-notch-bg)";
	ctx.dom.svgRectEl.setAttribute("fill", effectiveFill);
	ctx.dom.hoverBlobEl.setAttribute("fill", effectiveFill);

	applyAttrs(ctx.dom.contentDiv, newAttrs.content);
	ctx.dom.contentDiv.style.opacity = isOpen ? "1" : "0";
	ctx.dom.contentDiv.style.pointerEvents = isOpen ? "auto" : "none";
	ctx.dom.pillDiv.style.opacity = isOpen ? "0" : "1";

	animateRect(ctx);
	if (!isOpen) ctx.highlight.reset(d.rW, d.rH);
	document.documentElement.style.setProperty("--fluix-notch-offset", `${d.rH}px`);
}

/* ----------------------------- Event setup ----------------------------- */

type NotchListeners = { mouseenter: () => void; mouseleave: () => void; mouseover: (e: MouseEvent) => void; click: () => void; keydown: (e: KeyboardEvent) => void };

function createListeners(ctx: NotchCtx): NotchListeners {
	const handleOpen = () => { ctx.controlledOpen === undefined ? ctx.machine.open() : ctx.onOpenChange?.(true); };
	const handleClose = () => { ctx.controlledOpen === undefined ? ctx.machine.close() : ctx.onOpenChange?.(false); };
	const handleToggle = () => { ctx.controlledOpen === undefined ? ctx.machine.toggle() : ctx.onOpenChange?.(!ctx.snapshot.open); };

	return {
		mouseenter: () => { if (ctx.trigger === "hover") handleOpen(); },
		mouseleave: () => {
			if (ctx.trigger === "hover") { handleClose(); ctx.highlight.reset(dims(ctx).rW, dims(ctx).rH); return; }
			ctx.highlight.onItemLeave();
		},
		mouseover: (e) => { ctx.highlight.onItemEnter(e, ctx.dom.rootEl, ctx.snapshot.open, ctx.roundness); },
		click: () => { if (ctx.trigger === "click") handleToggle(); },
		keydown: (e) => {
			if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggle(); }
			else if (e.key === "Escape" && ctx.snapshot.open) { e.preventDefault(); handleClose(); }
		},
	};
}

function attachListeners(el: HTMLElement, ls: NotchListeners) {
	el.addEventListener("mouseenter", ls.mouseenter);
	el.addEventListener("mouseleave", ls.mouseleave);
	el.addEventListener("mouseover", ls.mouseover);
	el.addEventListener("click", ls.click);
	el.addEventListener("keydown", ls.keydown);
}

function detachListeners(el: HTMLElement, ls: NotchListeners) {
	el.removeEventListener("mouseenter", ls.mouseenter);
	el.removeEventListener("mouseleave", ls.mouseleave);
	el.removeEventListener("mouseover", ls.mouseover);
	el.removeEventListener("click", ls.click);
	el.removeEventListener("keydown", ls.keydown);
}

/* ----------------------------- Update ----------------------------- */

function notchUpdate(ctx: NotchCtx, opts: Partial<NotchOptions>, listeners: NotchListeners) {
	if (opts.trigger !== undefined) ctx.trigger = opts.trigger;
	if (opts.position !== undefined) ctx.position = opts.position;
	if (opts.spring !== undefined) ctx.spring = opts.spring;
	if (opts.dotSize !== undefined) ctx.dotSize = opts.dotSize;
	if (opts.roundness !== undefined) ctx.roundness = opts.roundness;
	if (opts.theme !== undefined) ctx.theme = opts.theme;
	if (opts.fill !== undefined) ctx.fill = opts.fill;
	if (opts.open !== undefined) ctx.controlledOpen = opts.open;
	if (opts.onOpenChange !== undefined) ctx.onOpenChange = opts.onOpenChange;

	if (opts.pill !== undefined) { ctx.dom.pillDiv.textContent = ""; ctx.dom.pillDiv.appendChild(resolveContent(opts.pill)); }
	if (opts.content !== undefined) {
		ctx.dom.contentDiv.textContent = ""; ctx.dom.contentDiv.appendChild(resolveContent(opts.content));
		ctx.dom.measureEl.textContent = ""; ctx.dom.measureEl.appendChild(resolveContent(opts.content).cloneNode(true));
	}

	ctx.dom.pillDiv.style.width = `${ctx.dotSize}px`;
	ctx.dom.pillDiv.style.height = `${ctx.dotSize}px`;
	ctx.machine.configure({ position: ctx.position, trigger: ctx.trigger, roundness: ctx.roundness, fill: ctx.fill, spring: ctx.spring });

	if (ctx.controlledOpen !== undefined) {
		if (ctx.controlledOpen && !ctx.snapshot.open) ctx.machine.open();
		else if (!ctx.controlledOpen && ctx.snapshot.open) ctx.machine.close();
	}

	detachListeners(ctx.dom.rootEl, listeners);
	const newListeners = createListeners(ctx);
	Object.assign(listeners, newListeners);
	attachListeners(ctx.dom.rootEl, listeners);

	updateLayout(ctx);
	return listeners;
}

/* ----------------------------- createNotch ----------------------------- */

export function createNotch(container: HTMLElement, options: NotchOptions): NotchInstance {
	const machine = createNotchMachine({
		position: options.position ?? "top-center", trigger: options.trigger ?? "click",
		roundness: options.roundness ?? NOTCH_DEFAULTS.roundness, fill: options.fill, spring: options.spring,
	});

	const dotSize = options.dotSize ?? 36;
	const roundness = options.roundness ?? NOTCH_DEFAULTS.roundness;
	const spring = options.spring;

	const domCfg = {
		snapshot: machine.store.getSnapshot(), position: (options.position ?? "top-center") as NotchPosition,
		theme: (options.theme ?? "dark") as NotchTheme, dotSize, fill: options.fill,
		contentSize: { w: 200, h: 44 }, roundness, spring,
	};
	const dom = buildNotchDOM(domCfg, options.pill, options.content, container, () => springCfg(ctx));

	const ctx: NotchCtx = {
		trigger: options.trigger ?? "click", position: options.position ?? "top-center",
		spring, dotSize, roundness, theme: options.theme ?? "dark",
		fill: options.fill, controlledOpen: options.open, onOpenChange: options.onOpenChange,
		snapshot: machine.store.getSnapshot(), prevOpenVal: undefined,
		contentSize: { w: 200, h: 44 }, currentAnim: null, measureRaf: 0,
		machine, prev: { w: dotSize, h: dotSize }, highlight: dom.highlight, dom,
	};

	let listeners = createListeners(ctx);
	attachListeners(ctx.dom.rootEl, listeners);

	const measureObs = new ResizeObserver(() => {
		cancelAnimationFrame(ctx.measureRaf);
		ctx.measureRaf = requestAnimationFrame(() => {
			const r = ctx.dom.measureEl.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) {
				const newSize = { w: Math.ceil(r.width), h: Math.ceil(r.height) };
				if (newSize.w !== ctx.contentSize.w || newSize.h !== ctx.contentSize.h) { ctx.contentSize = newSize; updateLayout(ctx); }
			}
		});
	});
	measureObs.observe(ctx.dom.measureEl);

	const unsubscribe = machine.store.subscribe(() => {
		ctx.snapshot = machine.store.getSnapshot();
		if (ctx.controlledOpen !== undefined) {
			if (ctx.controlledOpen && !ctx.snapshot.open) machine.open();
			else if (!ctx.controlledOpen && ctx.snapshot.open) machine.close();
		}
		if (ctx.prevOpenVal !== undefined && ctx.prevOpenVal !== ctx.snapshot.open) ctx.onOpenChange?.(ctx.snapshot.open);
		ctx.prevOpenVal = ctx.snapshot.open;
		updateLayout(ctx);
	});

	updateLayout(ctx);
	document.documentElement.style.setProperty("--fluix-notch-offset", `${dims(ctx).rH}px`);

	return {
		open() { ctx.controlledOpen === undefined ? machine.open() : ctx.onOpenChange?.(true); },
		close() { ctx.controlledOpen === undefined ? machine.close() : ctx.onOpenChange?.(false); },
		toggle() { ctx.controlledOpen === undefined ? machine.toggle() : ctx.onOpenChange?.(!ctx.snapshot.open); },
		destroy() {
			unsubscribe(); cancelAnimationFrame(ctx.measureRaf); measureObs.disconnect();
			ctx.currentAnim?.cancel(); ctx.highlight.cancelAnim();
			detachListeners(ctx.dom.rootEl, listeners);
			machine.destroy(); ctx.dom.measureEl.remove(); ctx.dom.rootEl.remove();
			document.documentElement.style.removeProperty("--fluix-notch-offset");
		},
		update(opts) { listeners = notchUpdate(ctx, opts, listeners); },
	};
}
