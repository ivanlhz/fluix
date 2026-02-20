/**
 * Vanilla JS Notch — imperative DOM adapter for the Fluix Notch component.
 *
 * Creates all DOM elements (measurer, root, SVG canvas with gooey filter +
 * highlight rect, pill div, content div), subscribes to the core notch machine,
 * and drives WAAPI spring animations.
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

/* ----------------------------- Constants ----------------------------- */

const SVG_NS = "http://www.w3.org/2000/svg";

/* ----------------------------- Types ----------------------------- */

export interface NotchOptions {
	trigger?: NotchTrigger;
	position?: NotchPosition;
	spring?: SpringConfig;
	/** Collapsed dot size in px. Default: 36 */
	dotSize?: number;
	roundness?: number;
	/** Visual theme. Default: "dark" */
	theme?: NotchTheme;
	fill?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Icon/content shown in the collapsed dot */
	pill: HTMLElement | string;
	/** Content shown when expanded */
	content: HTMLElement | string;
}

export interface NotchInstance {
	open(): void;
	close(): void;
	toggle(): void;
	destroy(): void;
	update(opts: Partial<NotchOptions>): void;
}

/* ----------------------------- Helpers ----------------------------- */

function applyAttrs(el: Element, attrs: Record<string, string>) {
	for (const [key, value] of Object.entries(attrs)) {
		el.setAttribute(key, value);
	}
}

function resolveContent(source: HTMLElement | string): HTMLElement {
	if (source instanceof HTMLElement) return source;
	const span = document.createElement("span");
	span.textContent = source;
	return span;
}

/* ----------------------------- createNotch ----------------------------- */

export function createNotch(
	container: HTMLElement,
	options: NotchOptions,
): NotchInstance {
	let {
		trigger = "click",
		position = "top-center",
		spring,
		dotSize = 36,
		roundness = NOTCH_DEFAULTS.roundness,
		theme = "dark",
		fill,
		open: controlledOpen,
		onOpenChange,
	} = options;

	const springConfig = (): SpringConfig => spring ?? FLUIX_SPRING;

	/* ---- Core machine ---- */
	const machine: NotchMachine = createNotchMachine({
		position,
		trigger,
		roundness,
		fill,
		spring,
	});

	let snapshot = machine.store.getSnapshot();
	let prevOpenVal: boolean | undefined;

	/* ---- Derived values ---- */
	const blur = () => Math.min(10, Math.max(6, roundness * 0.45));

	const collapsedW = () => dotSize;
	const collapsedH = () => dotSize;

	let contentSize = { w: 200, h: 44 };

	const hlPad = 12;
	const expandedW = () => contentSize.w + hlPad * 2;
	const expandedH = () => Math.max(contentSize.h + hlPad, dotSize);

	const targetW = () => (snapshot.open ? expandedW() : collapsedW());
	const targetH = () => (snapshot.open ? expandedH() : collapsedH());

	const rootW = () => Math.max(expandedW(), collapsedW());
	const rootH = () => Math.max(expandedH(), collapsedH());

	/* ---- Animation state ---- */
	const prev = { w: 0, h: 0, initialized: false };
	let currentAnim: Animation | null = null;

	/* ---- Highlight blob state ---- */
	let highlightAnim: Animation | null = null;
	const hlPrev = { x: 0, y: 0, w: 0, h: 0, visible: false };

	/* ---- Create DOM: Hidden content measurer ---- */
	const measureEl = document.createElement("div");
	measureEl.setAttribute("data-fluix-notch-measure", "");
	measureEl.appendChild(resolveContent(options.content).cloneNode(true));
	container.appendChild(measureEl);

	/* ---- Create DOM: Root ---- */
	const rootEl = document.createElement("div");
	const attrs = getNotchAttrs({ open: snapshot.open, position, theme });
	applyAttrs(rootEl, attrs.root);
	rootEl.style.width = `${rootW()}px`;
	rootEl.style.height = `${rootH()}px`;

	/* ---- Create DOM: SVG canvas ---- */
	const canvasDiv = document.createElement("div");
	applyAttrs(canvasDiv, attrs.canvas);

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	svg.setAttribute("width", String(rootW()));
	svg.setAttribute("height", String(rootH()));
	svg.setAttribute("viewBox", `0 0 ${rootW()} ${rootH()}`);
	svg.setAttribute("aria-hidden", "true");

	// Defs + gooey filter
	const defs = document.createElementNS(SVG_NS, "defs");
	const filter = document.createElementNS(SVG_NS, "filter");
	filter.setAttribute("id", "fluix-notch-goo");
	filter.setAttribute("x", "-20%");
	filter.setAttribute("y", "-20%");
	filter.setAttribute("width", "140%");
	filter.setAttribute("height", "140%");
	filter.setAttribute("color-interpolation-filters", "sRGB");

	const feBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
	feBlur.setAttribute("in", "SourceGraphic");
	feBlur.setAttribute("stdDeviation", String(blur()));
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

	const gGroup = document.createElementNS(SVG_NS, "g");
	gGroup.setAttribute("filter", "url(#fluix-notch-goo)");

	// Main shape rect
	const svgRectEl = document.createElementNS(SVG_NS, "rect");
	const cw = collapsedW();
	const ch = collapsedH();
	svgRectEl.setAttribute("x", String((rootW() - cw) / 2));
	svgRectEl.setAttribute("y", String((rootH() - ch) / 2));
	svgRectEl.setAttribute("width", String(cw));
	svgRectEl.setAttribute("height", String(ch));
	svgRectEl.setAttribute("rx", String(cw / 2));
	svgRectEl.setAttribute("ry", String(ch / 2));
	svgRectEl.setAttribute("fill", fill ?? "var(--fluix-notch-bg)");

	gGroup.appendChild(svgRectEl);
	svg.appendChild(gGroup);

	// Highlight rect (independent, sits on top of bg, no gooey filter)
	const highlightRectEl = document.createElementNS(SVG_NS, "rect");
	highlightRectEl.setAttribute("x", "0");
	highlightRectEl.setAttribute("y", "0");
	highlightRectEl.setAttribute("width", "0");
	highlightRectEl.setAttribute("height", "0");
	highlightRectEl.setAttribute("rx", "0");
	highlightRectEl.setAttribute("ry", "0");
	highlightRectEl.setAttribute("opacity", "0");
	highlightRectEl.setAttribute("fill", "var(--fluix-notch-hl)");
	svg.appendChild(highlightRectEl);

	canvasDiv.appendChild(svg);
	rootEl.appendChild(canvasDiv);

	/* ---- Create DOM: Pill div ---- */
	const pillDiv = document.createElement("div");
	applyAttrs(pillDiv, attrs.pill);
	pillDiv.style.width = `${dotSize}px`;
	pillDiv.style.height = `${dotSize}px`;
	pillDiv.appendChild(resolveContent(options.pill));
	rootEl.appendChild(pillDiv);

	/* ---- Create DOM: Content div ---- */
	const contentDiv = document.createElement("div");
	applyAttrs(contentDiv, attrs.content);
	contentDiv.appendChild(resolveContent(options.content));
	rootEl.appendChild(contentDiv);

	container.appendChild(rootEl);

	/* ---- Initialize prev for animation ---- */
	prev.w = cw;
	prev.h = ch;
	prev.initialized = true;

	/* ---- ResizeObserver for content measurement ---- */
	let measureRaf = 0;
	const measureObs = new ResizeObserver(() => {
		cancelAnimationFrame(measureRaf);
		measureRaf = requestAnimationFrame(() => {
			const r = measureEl.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) {
				const newSize = { w: Math.ceil(r.width), h: Math.ceil(r.height) };
				if (newSize.w !== contentSize.w || newSize.h !== contentSize.h) {
					contentSize = newSize;
					updateLayout();
				}
			}
		});
	});
	measureObs.observe(measureEl);

	/* ---- Highlight tracking ---- */
	function onItemEnter(e: MouseEvent) {
		const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
		if (!target || !snapshot.open) return;

		const rootRect = rootEl.getBoundingClientRect();
		const itemW = target.offsetWidth;
		const itemH = target.offsetHeight;
		const itemRect = target.getBoundingClientRect();
		const itemCenterX = itemRect.left + itemRect.width / 2;
		const itemCenterY = itemRect.top + itemRect.height / 2;

		const padX = 8;
		const padY = 4;
		const toW = itemW + padX * 2;
		const toH = itemH + padY * 2;
		const toX = itemCenterX - rootRect.left - toW / 2;
		const toY = itemCenterY - rootRect.top - toH / 2;
		const toRx = toH / 2;

		if (!hlPrev.visible) {
			// First hover -- snap into place
			highlightRectEl.setAttribute("x", String(toX));
			highlightRectEl.setAttribute("y", String(toY));
			highlightRectEl.setAttribute("width", String(toW));
			highlightRectEl.setAttribute("height", String(toH));
			highlightRectEl.setAttribute("rx", String(toRx));
			highlightRectEl.setAttribute("ry", String(toRx));
			highlightRectEl.setAttribute("opacity", "1");
			hlPrev.x = toX;
			hlPrev.y = toY;
			hlPrev.w = toW;
			hlPrev.h = toH;
			hlPrev.visible = true;
			return;
		}

		// Animate from previous position
		if (highlightAnim) {
			highlightAnim.cancel();
			highlightAnim = null;
		}

		const sc = springConfig();
		const a = animateSpring(
			highlightRectEl,
			{
				x: { from: hlPrev.x, to: toX, unit: "px" },
				y: { from: hlPrev.y, to: toY, unit: "px" },
				width: { from: hlPrev.w, to: toW, unit: "px" },
				height: { from: hlPrev.h, to: toH, unit: "px" },
				rx: { from: hlPrev.h / 2, to: toRx, unit: "px" },
				ry: { from: hlPrev.h / 2, to: toRx, unit: "px" },
			},
			{ ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 },
		);

		hlPrev.x = toX;
		hlPrev.y = toY;
		hlPrev.w = toW;
		hlPrev.h = toH;

		if (a) {
			highlightAnim = a;
			a.onfinish = () => {
				highlightAnim = null;
				highlightRectEl.setAttribute("x", String(toX));
				highlightRectEl.setAttribute("y", String(toY));
				highlightRectEl.setAttribute("width", String(toW));
				highlightRectEl.setAttribute("height", String(toH));
				highlightRectEl.setAttribute("rx", String(toRx));
				highlightRectEl.setAttribute("ry", String(toRx));
			};
		}
	}

	function onItemLeave() {
		highlightRectEl.setAttribute("opacity", "0");
		hlPrev.visible = false;
		if (highlightAnim) {
			highlightAnim.cancel();
			highlightAnim = null;
		}
	}

	/* ---- Event handlers ---- */
	function handleOpen() {
		if (controlledOpen === undefined) machine.open();
		else onOpenChange?.(true);
	}
	function handleClose() {
		if (controlledOpen === undefined) machine.close();
		else onOpenChange?.(false);
	}
	function handleToggle() {
		if (controlledOpen === undefined) machine.toggle();
		else onOpenChange?.(!snapshot.open);
	}
	function onMouseEnter() {
		if (trigger === "hover") handleOpen();
	}
	function onMouseLeave() {
		if (trigger === "hover") handleClose();
		onItemLeave();
	}
	function onClick() {
		if (trigger === "click") handleToggle();
	}

	rootEl.addEventListener("mouseenter", onMouseEnter);
	rootEl.addEventListener("mouseleave", onMouseLeave);
	rootEl.addEventListener("mouseover", onItemEnter);
	rootEl.addEventListener("click", onClick);

	/* ---- SVG rect animation ---- */
	function animateRect() {
		const tw = targetW();
		const th = targetH();

		if (tw === prev.w && th === prev.h) return;

		if (currentAnim) {
			currentAnim.cancel();
			currentAnim = null;
		}

		const rw = rootW();
		const rh = rootH();

		const fromW = prev.w;
		const fromH = prev.h;
		const fromX = (rw - fromW) / 2;
		const fromY = (rh - fromH) / 2;
		const toX = (rw - tw) / 2;
		const toY = (rh - th) / 2;

		prev.w = tw;
		prev.h = th;

		const isCollapsing = tw === collapsedW() && th === collapsedH();
		const wasCollapsed = fromW === collapsedW() && fromH === collapsedH();
		const fromRx = wasCollapsed ? collapsedW() / 2 : roundness;
		const toRx = isCollapsing ? collapsedW() / 2 : roundness;

		const a = animateSpring(
			svgRectEl,
			{
				width: { from: fromW, to: tw, unit: "px" },
				height: { from: fromH, to: th, unit: "px" },
				x: { from: fromX, to: toX, unit: "px" },
				y: { from: fromY, to: toY, unit: "px" },
				rx: { from: fromRx, to: toRx, unit: "px" },
				ry: { from: fromRx, to: toRx, unit: "px" },
			},
			springConfig(),
		);

		if (a) {
			currentAnim = a;
			a.onfinish = () => {
				currentAnim = null;
				svgRectEl.setAttribute("width", String(tw));
				svgRectEl.setAttribute("height", String(th));
				svgRectEl.setAttribute("x", String(toX));
				svgRectEl.setAttribute("y", String(toY));
				svgRectEl.setAttribute("rx", String(toRx));
				svgRectEl.setAttribute("ry", String(toRx));
			};
		} else {
			svgRectEl.setAttribute("width", String(tw));
			svgRectEl.setAttribute("height", String(th));
			svgRectEl.setAttribute("x", String(toX));
			svgRectEl.setAttribute("y", String(toY));
			svgRectEl.setAttribute("rx", String(toRx));
			svgRectEl.setAttribute("ry", String(toRx));
		}
	}

	/* ---- Layout update ---- */
	function updateLayout() {
		const isOpen = snapshot.open;
		const newAttrs = getNotchAttrs({ open: isOpen, position, theme });

		// Update root attrs and size
		applyAttrs(rootEl, newAttrs.root);
		rootEl.style.width = `${rootW()}px`;
		rootEl.style.height = `${rootH()}px`;

		// Update SVG viewBox
		svg.setAttribute("width", String(rootW()));
		svg.setAttribute("height", String(rootH()));
		svg.setAttribute("viewBox", `0 0 ${rootW()} ${rootH()}`);

		// Update gooey filter blur
		feBlur.setAttribute("stdDeviation", String(blur()));

		// Update fill
		svgRectEl.setAttribute("fill", fill ?? "var(--fluix-notch-bg)");

		// Update content attrs
		applyAttrs(contentDiv, newAttrs.content);

		// Animate the SVG rect
		animateRect();

		// Reset highlight when closing
		if (!isOpen) {
			onItemLeave();
		}

		// Expose notch height as CSS variable for toast collision avoidance
		document.documentElement.style.setProperty(
			"--fluix-notch-offset",
			`${rootH()}px`,
		);
	}

	/* ---- Store subscription ---- */
	const unsubscribe = machine.store.subscribe(() => {
		const next = machine.store.getSnapshot();
		snapshot = next;

		// Controlled open sync
		if (controlledOpen !== undefined) {
			if (controlledOpen && !next.open) machine.open();
			else if (!controlledOpen && next.open) machine.close();
		}

		// Fire onOpenChange callback
		if (prevOpenVal !== undefined && prevOpenVal !== next.open) {
			onOpenChange?.(next.open);
		}
		prevOpenVal = next.open;

		updateLayout();
	});

	// Initial layout
	updateLayout();

	// Set initial CSS variable
	document.documentElement.style.setProperty(
		"--fluix-notch-offset",
		`${rootH()}px`,
	);

	/* ---- Public API ---- */
	return {
		open() {
			handleOpen();
		},

		close() {
			handleClose();
		},

		toggle() {
			handleToggle();
		},

		destroy() {
			unsubscribe();
			cancelAnimationFrame(measureRaf);
			measureObs.disconnect();
			currentAnim?.cancel();
			highlightAnim?.cancel();
			rootEl.removeEventListener("mouseenter", onMouseEnter);
			rootEl.removeEventListener("mouseleave", onMouseLeave);
			rootEl.removeEventListener("mouseover", onItemEnter);
			rootEl.removeEventListener("click", onClick);
			machine.destroy();
			measureEl.remove();
			rootEl.remove();
			document.documentElement.style.removeProperty("--fluix-notch-offset");
		},

		update(opts: Partial<NotchOptions>) {
			// Update local option values
			if (opts.trigger !== undefined) trigger = opts.trigger;
			if (opts.position !== undefined) position = opts.position;
			if (opts.spring !== undefined) spring = opts.spring;
			if (opts.dotSize !== undefined) dotSize = opts.dotSize;
			if (opts.roundness !== undefined) roundness = opts.roundness;
			if (opts.theme !== undefined) theme = opts.theme;
			if (opts.fill !== undefined) fill = opts.fill;
			if (opts.open !== undefined) controlledOpen = opts.open;
			if (opts.onOpenChange !== undefined) onOpenChange = opts.onOpenChange;

			// Update pill content
			if (opts.pill !== undefined) {
				pillDiv.textContent = "";
				pillDiv.appendChild(resolveContent(opts.pill));
			}

			// Update expanded content
			if (opts.content !== undefined) {
				contentDiv.textContent = "";
				contentDiv.appendChild(resolveContent(opts.content));
				measureEl.textContent = "";
				measureEl.appendChild(resolveContent(opts.content).cloneNode(true));
			}

			// Update pill style
			pillDiv.style.width = `${dotSize}px`;
			pillDiv.style.height = `${dotSize}px`;

			// Reconfigure the core machine
			machine.configure({ position, trigger, roundness, fill, spring });

			// Sync controlled open
			if (controlledOpen !== undefined) {
				if (controlledOpen && !snapshot.open) machine.open();
				else if (!controlledOpen && snapshot.open) machine.close();
			}

			// Re-apply event listeners (trigger may have changed)
			rootEl.removeEventListener("mouseenter", onMouseEnter);
			rootEl.removeEventListener("mouseleave", onMouseLeave);
			rootEl.removeEventListener("click", onClick);
			rootEl.addEventListener("mouseenter", onMouseEnter);
			rootEl.addEventListener("mouseleave", onMouseLeave);
			rootEl.addEventListener("click", onClick);

			updateLayout();
		},
	};
}
