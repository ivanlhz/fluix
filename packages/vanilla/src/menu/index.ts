/**
 * Vanilla JS Menu — imperative DOM adapter for the Fluix Menu component.
 */

import {
	FLUIX_SPRING,
	MENU_DEFAULTS,
	connectMenu,
	createMenuMachine,
	getMenuAttrs,
	type MenuMachine,
	type MenuOrientation,
	type MenuVariant,
	type MenuTheme,
	type SpringConfig,
} from "@fluix-ui/core";

import { SVG_NS, applyAttrs, clearChildren, createGooeyFilter, zeroRect } from "../shared";

/* ----------------------------- Types ----------------------------- */

export interface MenuItemConfig { id: string; label: string; disabled?: boolean; }

export interface MenuOptions {
	orientation?: MenuOrientation;
	variant?: MenuVariant;
	theme?: MenuTheme;
	activeId?: string | null;
	onActiveChange?: (id: string) => void;
	spring?: SpringConfig;
	roundness?: number;
	blur?: number;
	fill?: string;
	items: MenuItemConfig[];
}

export interface MenuInstance {
	setActive(id: string | null): void;
	update(opts: Partial<MenuOptions>): void;
	destroy(): void;
}

/** Internal mutable state for a menu instance. */
interface MenuCtx {
	orientation: MenuOrientation;
	variant: MenuVariant;
	theme: MenuTheme;
	controlledActiveId: string | null | undefined;
	onActiveChange: ((id: string) => void) | undefined;
	spring: SpringConfig | undefined;
	roundness: number;
	blurProp: number | undefined;
	fill: string | undefined;
	items: MenuItemConfig[];
	snapshot: { activeId: string | null };
	lastActiveNotified: string | null;
	attrs: ReturnType<typeof getMenuAttrs>;
	indicatorEl: SVGRectElement | SVGPathElement;
	ghostIndicatorEl: SVGRectElement | null;
	connection: ReturnType<typeof connectMenu>;
	size: { width: number; height: number };
	measureRaf: number;
	machine: MenuMachine;
	navEl: HTMLElement;
	svg: SVGSVGElement;
	listDiv: HTMLElement;
	buttonMap: Map<string, HTMLButtonElement>;
	filterId: string;
}

/* ----------------------------- SVG Indicator ----------------------------- */

function buildSvgIndicator(
	svg: SVGSVGElement, isTab: boolean, filterId: string,
	resolvedBlur: number, fill: string | undefined, indicatorAttrs: Record<string, string>,
) {
	clearChildren(svg);
	const effectiveFill = fill ?? "var(--fluix-menu-indicator)";

	if (isTab) {
		const indicatorEl = document.createElementNS(SVG_NS, "path") as SVGPathElement;
		applyAttrs(indicatorEl, indicatorAttrs);
		indicatorEl.setAttribute("d", "");
		indicatorEl.setAttribute("opacity", "0");
		indicatorEl.style.fill = effectiveFill;
		svg.appendChild(indicatorEl);
		return { indicatorEl, ghostIndicatorEl: null as SVGRectElement | null };
	}

	const { g, defs } = createGooeyFilter(filterId, resolvedBlur);
	svg.appendChild(defs);

	const ghostIndicatorEl = document.createElementNS(SVG_NS, "rect") as SVGRectElement;
	zeroRect(ghostIndicatorEl);
	ghostIndicatorEl.setAttribute("opacity", "0");
	ghostIndicatorEl.style.fill = effectiveFill;

	const indicatorEl = document.createElementNS(SVG_NS, "rect") as SVGRectElement;
	applyAttrs(indicatorEl, indicatorAttrs);
	zeroRect(indicatorEl);
	indicatorEl.setAttribute("opacity", "0");
	indicatorEl.style.fill = effectiveFill;

	g.appendChild(ghostIndicatorEl);
	g.appendChild(indicatorEl);
	svg.appendChild(g);

	return { indicatorEl, ghostIndicatorEl };
}

/* ----------------------------- DOM ----------------------------- */

function buildMenuDOM(attrs: ReturnType<typeof getMenuAttrs>, filterId: string, variant: MenuVariant, resolvedBlur: number, fill: string | undefined) {
	const navEl = document.createElement("nav");
	applyAttrs(navEl, attrs.root);
	navEl.setAttribute("aria-label", "Fluix menu");

	const canvasDiv = document.createElement("div");
	applyAttrs(canvasDiv, attrs.canvas);

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("xmlns", SVG_NS);
	for (const [k, v] of Object.entries({ width: "1", height: "1", viewBox: "0 0 1 1", "aria-hidden": "true" })) svg.setAttribute(k, v);

	const { indicatorEl, ghostIndicatorEl } = buildSvgIndicator(svg, variant === "tab", filterId, resolvedBlur, fill, attrs.indicator);
	canvasDiv.appendChild(svg);
	navEl.appendChild(canvasDiv);

	const listDiv = document.createElement("div");
	applyAttrs(listDiv, attrs.list);
	navEl.appendChild(listDiv);

	return { navEl, svg, listDiv, buttonMap: new Map<string, HTMLButtonElement>(), indicatorEl, ghostIndicatorEl };
}

/* ----------------------------- Helpers ----------------------------- */

function createItemButton(ctx: MenuCtx, item: MenuItemConfig) {
	const btn = document.createElement("button");
	btn.type = "button";
	const active = ctx.snapshot.activeId === item.id;
	applyAttrs(btn, ctx.attrs.item({ id: item.id, active, disabled: item.disabled }));
	if (item.disabled) btn.disabled = true;
	btn.textContent = item.label;
	btn.addEventListener("click", () => {
		if (item.disabled) return;
		if (ctx.controlledActiveId === undefined) ctx.machine.setActive(item.id);
		else ctx.onActiveChange?.(item.id);
	});
	ctx.buttonMap.set(item.id, btn);
	ctx.listDiv.appendChild(btn);
}

function makeConnection(ctx: MenuCtx) {
	return connectMenu({
		root: ctx.navEl, indicator: ctx.indicatorEl, ghostIndicator: ctx.ghostIndicatorEl,
		getActiveId: () => ctx.snapshot.activeId,
		onSelect(id) {
			if (ctx.controlledActiveId === undefined) ctx.machine.setActive(id);
			else ctx.onActiveChange?.(id);
		},
		spring: ctx.spring ?? FLUIX_SPRING, variant: ctx.variant, orientation: ctx.orientation,
	});
}

function measure(ctx: MenuCtx) {
	const rect = ctx.navEl.getBoundingClientRect();
	const w = Math.ceil(rect.width);
	const h = Math.ceil(rect.height);
	if (ctx.size.width !== w || ctx.size.height !== h) {
		ctx.size = { width: w, height: h };
		const sw = Math.max(1, w);
		const sh = Math.max(1, h);
		ctx.svg.setAttribute("width", String(sw));
		ctx.svg.setAttribute("height", String(sh));
		ctx.svg.setAttribute("viewBox", `0 0 ${sw} ${sh}`);
		ctx.connection?.sync(false);
	}
}

function menuUpdate(ctx: MenuCtx, opts: Partial<MenuOptions>) {
	const prevVariant = ctx.variant;
	if (opts.orientation !== undefined) ctx.orientation = opts.orientation;
	if (opts.variant !== undefined) ctx.variant = opts.variant;
	if (opts.theme !== undefined) ctx.theme = opts.theme;
	if (opts.activeId !== undefined) ctx.controlledActiveId = opts.activeId;
	if (opts.onActiveChange !== undefined) ctx.onActiveChange = opts.onActiveChange;
	if (opts.spring !== undefined) ctx.spring = opts.spring;
	if (opts.roundness !== undefined) ctx.roundness = opts.roundness;
	if (opts.blur !== undefined) ctx.blurProp = opts.blur;
	if (opts.fill !== undefined) ctx.fill = opts.fill;

	ctx.machine.configure({ orientation: ctx.orientation, variant: ctx.variant, spring: ctx.spring, roundness: ctx.roundness, blur: ctx.blurProp, fill: ctx.fill });
	if (ctx.controlledActiveId !== undefined) ctx.machine.setActive(ctx.controlledActiveId ?? null);

	ctx.attrs = getMenuAttrs({ orientation: ctx.orientation, theme: ctx.theme, variant: ctx.variant });
	applyAttrs(ctx.navEl, ctx.attrs.root);

	if (prevVariant !== ctx.variant) {
		const resolvedBlur = ctx.blurProp ?? Math.min(10, Math.max(6, ctx.roundness * 0.45));
		const refs = buildSvgIndicator(ctx.svg, ctx.variant === "tab", ctx.filterId, resolvedBlur, ctx.fill, ctx.attrs.indicator);
		ctx.indicatorEl = refs.indicatorEl;
		ctx.ghostIndicatorEl = refs.ghostIndicatorEl;
	}

	if (opts.items !== undefined) {
		ctx.items = opts.items;
		clearChildren(ctx.listDiv);
		ctx.buttonMap.clear();
		for (const item of ctx.items) createItemButton(ctx, item);
	}

	ctx.connection.destroy();
	ctx.connection = makeConnection(ctx);
	requestAnimationFrame(() => { measure(ctx); ctx.connection.sync(false); });
}

/* ----------------------------- createMenu ----------------------------- */

export function createMenu(container: HTMLElement, options: MenuOptions): MenuInstance {
	const {
		orientation = MENU_DEFAULTS.orientation, variant = "pill", theme = "dark",
		activeId: controlledActiveId, onActiveChange, spring,
		roundness = MENU_DEFAULTS.roundness, blur: blurProp, fill, items,
	} = options;

	const machine = createMenuMachine({
		orientation, variant, spring, roundness, blur: blurProp, fill,
		initialActiveId: controlledActiveId ?? null,
	});

	const attrs = getMenuAttrs({ orientation, theme, variant });
	const filterId = `fluix-menu-goo-${Math.random().toString(36).slice(2, 8)}`;
	const resolvedBlur = blurProp ?? Math.min(10, Math.max(6, roundness * 0.45));
	const dom = buildMenuDOM(attrs, filterId, variant, resolvedBlur, fill);

	const ctx: MenuCtx = {
		orientation, variant, theme, controlledActiveId, onActiveChange, spring,
		roundness, blurProp, fill, items, attrs, filterId, machine,
		snapshot: machine.store.getSnapshot(),
		lastActiveNotified: machine.store.getSnapshot().activeId,
		...dom, connection: null!,
		size: { width: 0, height: 0 }, measureRaf: 0,
	};

	for (const item of items) createItemButton(ctx, item);
	container.appendChild(ctx.navEl);

	const resizeObs = new ResizeObserver(() => {
		cancelAnimationFrame(ctx.measureRaf);
		ctx.measureRaf = requestAnimationFrame(() => measure(ctx));
	});
	resizeObs.observe(ctx.navEl);

	ctx.connection = makeConnection(ctx);
	requestAnimationFrame(() => { measure(ctx); ctx.connection.sync(false); });

	const unsubscribe = machine.store.subscribe(() => {
		ctx.snapshot = machine.store.getSnapshot();
		for (const item of ctx.items) {
			const btn = ctx.buttonMap.get(item.id);
			if (btn) applyAttrs(btn, ctx.attrs.item({ id: item.id, active: ctx.snapshot.activeId === item.id, disabled: item.disabled }));
		}
		if (ctx.snapshot.activeId && ctx.lastActiveNotified !== ctx.snapshot.activeId && ctx.onActiveChange) {
			ctx.onActiveChange(ctx.snapshot.activeId);
		}
		ctx.lastActiveNotified = ctx.snapshot.activeId;
		ctx.connection.sync(false);
	});

	return {
		setActive(id) { machine.setActive(id); },
		update(opts) { menuUpdate(ctx, opts); },
		destroy() {
			unsubscribe();
			cancelAnimationFrame(ctx.measureRaf);
			resizeObs.disconnect();
			ctx.connection.destroy();
			machine.destroy();
			ctx.navEl.remove();
		},
	};
}
