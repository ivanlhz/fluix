/**
 * Vanilla JS Menu — imperative DOM adapter for the Fluix Menu component.
 *
 * Creates all DOM elements (nav, item buttons, SVG canvas with indicator),
 * subscribes to the core menu machine, and drives the indicator animation
 * via connectMenu.
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

/* ----------------------------- Constants ----------------------------- */

const SVG_NS = "http://www.w3.org/2000/svg";
const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

/* ----------------------------- Types ----------------------------- */

export interface MenuItemConfig {
	id: string;
	label: string;
	disabled?: boolean;
}

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

/* ----------------------------- Helpers ----------------------------- */

function applyAttrs(el: Element, attrs: Record<string, string>) {
	for (const [key, value] of Object.entries(attrs)) {
		el.setAttribute(key, value);
	}
}

/* ----------------------------- createMenu ----------------------------- */

export function createMenu(
	container: HTMLElement,
	options: MenuOptions,
): MenuInstance {
	let {
		orientation = MENU_DEFAULTS.orientation,
		variant = "pill",
		theme = "dark",
		activeId: controlledActiveId,
		onActiveChange,
		spring,
		roundness = MENU_DEFAULTS.roundness,
		blur: blurProp,
		fill,
		items,
	} = options;

	const springConfig = (): SpringConfig => spring ?? FLUIX_SPRING;
	const resolvedBlur = () => blurProp ?? Math.min(10, Math.max(6, roundness * 0.45));

	/* ---- Core machine ---- */
	const machine: MenuMachine = createMenuMachine({
		orientation,
		variant,
		spring,
		roundness,
		blur: blurProp,
		fill,
		initialActiveId: controlledActiveId ?? null,
	});

	let snapshot = machine.store.getSnapshot();
	let lastActiveNotified: string | null = snapshot.activeId;

	/* ---- Create DOM ---- */
	const attrs = getMenuAttrs({ orientation, theme, variant });
	const filterId = `fluix-menu-goo-${Math.random().toString(36).slice(2, 8)}`;
	const isTab = variant === "tab";

	// Nav root
	const navEl = document.createElement("nav");
	applyAttrs(navEl, attrs.root);
	navEl.setAttribute("aria-label", "Fluix menu");

	// SVG canvas
	const canvasDiv = document.createElement("div");
	applyAttrs(canvasDiv, attrs.canvas);

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("xmlns", SVG_NS);
	svg.setAttribute("width", "1");
	svg.setAttribute("height", "1");
	svg.setAttribute("viewBox", "0 0 1 1");
	svg.setAttribute("aria-hidden", "true");

	let indicatorEl: SVGRectElement | SVGPathElement;
	let ghostIndicatorEl: SVGRectElement | null = null;

	if (isTab) {
		indicatorEl = document.createElementNS(SVG_NS, "path") as SVGPathElement;
		applyAttrs(indicatorEl, attrs.indicator);
		indicatorEl.setAttribute("d", "");
		indicatorEl.setAttribute("opacity", "0");
		indicatorEl.style.fill = fill ?? "var(--fluix-menu-indicator)";
		svg.appendChild(indicatorEl);
	} else {
		// Defs + gooey filter
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
		feBlur.setAttribute("stdDeviation", String(resolvedBlur()));
		feBlur.setAttribute("result", "blur");

		const feCM = document.createElementNS(SVG_NS, "feColorMatrix");
		feCM.setAttribute("in", "blur");
		feCM.setAttribute("type", "matrix");
		feCM.setAttribute("values", GOO_MATRIX);
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

		const gGroup = document.createElementNS(SVG_NS, "g");
		gGroup.setAttribute("filter", `url(#${filterId})`);

		ghostIndicatorEl = document.createElementNS(SVG_NS, "rect") as SVGRectElement;
		ghostIndicatorEl.setAttribute("x", "0");
		ghostIndicatorEl.setAttribute("y", "0");
		ghostIndicatorEl.setAttribute("width", "0");
		ghostIndicatorEl.setAttribute("height", "0");
		ghostIndicatorEl.setAttribute("rx", "0");
		ghostIndicatorEl.setAttribute("ry", "0");
		ghostIndicatorEl.setAttribute("opacity", "0");
		ghostIndicatorEl.style.fill = fill ?? "var(--fluix-menu-indicator)";

		indicatorEl = document.createElementNS(SVG_NS, "rect") as SVGRectElement;
		applyAttrs(indicatorEl, attrs.indicator);
		indicatorEl.setAttribute("x", "0");
		indicatorEl.setAttribute("y", "0");
		indicatorEl.setAttribute("width", "0");
		indicatorEl.setAttribute("height", "0");
		indicatorEl.setAttribute("rx", "0");
		indicatorEl.setAttribute("ry", "0");
		indicatorEl.setAttribute("opacity", "0");
		indicatorEl.style.fill = fill ?? "var(--fluix-menu-indicator)";

		gGroup.appendChild(ghostIndicatorEl);
		gGroup.appendChild(indicatorEl);
		svg.appendChild(gGroup);
	}

	canvasDiv.appendChild(svg);
	navEl.appendChild(canvasDiv);

	// Item list
	const listDiv = document.createElement("div");
	applyAttrs(listDiv, attrs.list);

	const buttonMap = new Map<string, HTMLButtonElement>();

	function createItemButton(item: MenuItemConfig) {
		const btn = document.createElement("button");
		btn.type = "button";
		const active = snapshot.activeId === item.id;
		const itemAttrs = attrs.item({ id: item.id, active, disabled: item.disabled });
		applyAttrs(btn, itemAttrs);
		if (item.disabled) btn.disabled = true;
		btn.textContent = item.label;
		btn.addEventListener("click", () => {
			if (item.disabled) return;
			if (controlledActiveId === undefined) {
				machine.setActive(item.id);
			} else {
				onActiveChange?.(item.id);
			}
		});
		buttonMap.set(item.id, btn);
		listDiv.appendChild(btn);
	}

	for (const item of items) {
		createItemButton(item);
	}

	navEl.appendChild(listDiv);
	container.appendChild(navEl);

	/* ---- ResizeObserver ---- */
	let size = { width: 0, height: 0 };
	let measureRaf = 0;

	const measure = () => {
		const rect = navEl.getBoundingClientRect();
		const w = Math.ceil(rect.width);
		const h = Math.ceil(rect.height);
		if (size.width !== w || size.height !== h) {
			size = { width: w, height: h };
			updateSvgSize();
			connection?.sync(false);
		}
	};

	const resizeObs = new ResizeObserver(() => {
		cancelAnimationFrame(measureRaf);
		measureRaf = requestAnimationFrame(measure);
	});
	resizeObs.observe(navEl);

	function updateSvgSize() {
		const w = Math.max(1, size.width);
		const h = Math.max(1, size.height);
		svg.setAttribute("width", String(w));
		svg.setAttribute("height", String(h));
		svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
	}

	/* ---- connectMenu ---- */
	let connection = connectMenu({
		root: navEl,
		indicator: indicatorEl,
		ghostIndicator: ghostIndicatorEl,
		getActiveId: () => snapshot.activeId,
		onSelect(id) {
			if (controlledActiveId === undefined) {
				machine.setActive(id);
			} else {
				onActiveChange?.(id);
			}
		},
		spring: springConfig(),
		variant,
		orientation,
	});

	// Initial measure
	requestAnimationFrame(() => {
		measure();
		connection.sync(false);
	});

	/* ---- Store subscription ---- */
	const unsubscribe = machine.store.subscribe(() => {
		const next = machine.store.getSnapshot();
		snapshot = next;

		// Update item button states
		for (const item of items) {
			const btn = buttonMap.get(item.id);
			if (btn) {
				const active = next.activeId === item.id;
				const itemAttrs = attrs.item({ id: item.id, active, disabled: item.disabled });
				applyAttrs(btn, itemAttrs);
			}
		}

		// Fire onActiveChange callback
		if (next.activeId && lastActiveNotified !== next.activeId && onActiveChange) {
			onActiveChange(next.activeId);
		}
		lastActiveNotified = next.activeId;

		connection.sync(false);
	});

	/* ---- Public API ---- */
	return {
		setActive(id: string | null) {
			machine.setActive(id);
		},

		update(opts: Partial<MenuOptions>) {
			if (opts.orientation !== undefined) orientation = opts.orientation;
			if (opts.variant !== undefined) variant = opts.variant;
			if (opts.theme !== undefined) theme = opts.theme;
			if (opts.activeId !== undefined) controlledActiveId = opts.activeId;
			if (opts.onActiveChange !== undefined) onActiveChange = opts.onActiveChange;
			if (opts.spring !== undefined) spring = opts.spring;
			if (opts.roundness !== undefined) roundness = opts.roundness;
			if (opts.blur !== undefined) blurProp = opts.blur;
			if (opts.fill !== undefined) fill = opts.fill;

			machine.configure({ orientation, variant, spring, roundness, blur: blurProp, fill });

			if (controlledActiveId !== undefined) {
				machine.setActive(controlledActiveId ?? null);
			}

			// Update root attrs
			const newAttrs = getMenuAttrs({ orientation, theme, variant });
			applyAttrs(navEl, newAttrs.root);

			// Rebuild items if provided
			if (opts.items !== undefined) {
				items = opts.items;
				listDiv.innerHTML = "";
				buttonMap.clear();
				for (const item of items) {
					createItemButton(item);
				}
			}

			// Reconnect
			connection.destroy();
			connection = connectMenu({
				root: navEl,
				indicator: indicatorEl,
				ghostIndicator: ghostIndicatorEl,
				getActiveId: () => snapshot.activeId,
				onSelect(id) {
					if (controlledActiveId === undefined) {
						machine.setActive(id);
					} else {
						onActiveChange?.(id);
					}
				},
				spring: springConfig(),
				variant,
				orientation,
			});

			requestAnimationFrame(() => {
				measure();
				connection.sync(false);
			});
		},

		destroy() {
			unsubscribe();
			cancelAnimationFrame(measureRaf);
			resizeObs.disconnect();
			connection.destroy();
			machine.destroy();
			navEl.remove();
		},
	};
}
