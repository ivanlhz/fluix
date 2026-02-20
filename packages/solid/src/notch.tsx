/**
 * Notch component for Solid.js
 *
 * Expanding pill with gooey SVG morphing, spring physics,
 * and highlight item tracking. Ported from Svelte adapter.
 */

import {
	createSignal,
	createEffect,
	createMemo,
	onCleanup,
	type JSX,
} from "solid-js";
import {
	createNotchMachine,
	getNotchAttrs,
	animateSpring,
	FLUIX_SPRING,
	NOTCH_DEFAULTS,
	type NotchPosition,
	type NotchTrigger,
	type NotchTheme,
	type SpringConfig,
} from "@fluix-ui/core";

export interface NotchProps {
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
	pill: JSX.Element | (() => JSX.Element);
	/** Content shown when expanded */
	content: JSX.Element | (() => JSX.Element);
}

export function Notch(props: NotchProps) {
	const trigger = () => props.trigger ?? "click";
	const position = () => props.position ?? "top-center";
	const dotSize = () => props.dotSize ?? 36;
	const roundness = () => props.roundness ?? NOTCH_DEFAULTS.roundness;
	const theme = () => props.theme ?? "dark";
	const fill = () => props.fill;
	const springConfig = () => props.spring ?? FLUIX_SPRING;

	const machine = createNotchMachine({
		position: position(),
		trigger: trigger(),
		roundness: roundness(),
		fill: fill(),
		spring: props.spring,
	});

	// Bridge core store to Solid signal
	const [snapshot, setSnapshot] = createSignal(machine.store.getSnapshot());

	const unsub = machine.store.subscribe(() => {
		setSnapshot(machine.store.getSnapshot());
	});
	onCleanup(unsub);

	// Controlled open sync
	createEffect(() => {
		const controlledOpen = props.open;
		if (controlledOpen !== undefined) {
			const snap = snapshot();
			if (controlledOpen && !snap.open) machine.open();
			else if (!controlledOpen && snap.open) machine.close();
		}
	});

	// Notify parent on open change
	let prevOpenVal: boolean | undefined;
	createEffect(() => {
		const o = snapshot().open;
		if (prevOpenVal !== undefined && prevOpenVal !== o) {
			props.onOpenChange?.(o);
		}
		prevOpenVal = o;
	});

	// Re-configure machine when props change
	createEffect(() => {
		machine.configure({
			position: position(),
			trigger: trigger(),
			roundness: roundness(),
			fill: fill(),
			spring: props.spring,
		});
	});

	// Refs
	let rootEl: HTMLDivElement | undefined;
	let measureContentEl: HTMLDivElement | undefined;
	let svgRectEl: SVGRectElement | undefined;
	let highlightRectEl: SVGRectElement | undefined;

	// Derived state
	const isOpen = createMemo(() => snapshot().open);
	const attrs = createMemo(() => getNotchAttrs({ open: isOpen(), position: position(), theme: theme() }));
	const blur = createMemo(() => Math.min(10, Math.max(6, roundness() * 0.45)));

	// Collapsed = circle
	const collapsedW = createMemo(() => dotSize());
	const collapsedH = createMemo(() => dotSize());

	// Measure expanded content
	const [contentSize, setContentSize] = createSignal({ w: 200, h: 44 });

	createEffect(() => {
		const el = measureContentEl;
		if (!el) return;

		const measure = () => {
			const r = el.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) {
				setContentSize({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
			}
		};
		measure();

		let raf = 0;
		const obs = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(measure);
		});
		obs.observe(el);

		onCleanup(() => {
			cancelAnimationFrame(raf);
			obs.disconnect();
		});
	});

	// Expanded dimensions with highlight padding
	const hlPad = 12;
	const expandedW = createMemo(() => contentSize().w + hlPad * 2);
	const expandedH = createMemo(() => Math.max(contentSize().h + hlPad, dotSize()));

	// Target dimensions
	const targetW = createMemo(() => (isOpen() ? expandedW() : collapsedW()));
	const targetH = createMemo(() => (isOpen() ? expandedH() : collapsedH()));

	// Root = always the max of both states
	const rootW = createMemo(() => Math.max(expandedW(), collapsedW()));
	const rootH = createMemo(() => Math.max(expandedH(), collapsedH()));

	// Track previous for animation (mutable, not reactive)
	const prev = { w: 0, h: 0, initialized: false };

	// --- Highlight blob state ---
	let highlightAnim: Animation | null = null;
	const hlPrev = { x: 0, y: 0, w: 0, h: 0, visible: false };

	function onItemEnter(e: MouseEvent) {
		const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
		const rect = highlightRectEl;
		const root = rootEl;
		if (!target || !rect || !root || !isOpen()) return;

		const rootRect = root.getBoundingClientRect();
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
			rect.setAttribute("x", String(toX));
			rect.setAttribute("y", String(toY));
			rect.setAttribute("width", String(toW));
			rect.setAttribute("height", String(toH));
			rect.setAttribute("rx", String(toRx));
			rect.setAttribute("ry", String(toRx));
			rect.setAttribute("opacity", "1");
			hlPrev.x = toX;
			hlPrev.y = toY;
			hlPrev.w = toW;
			hlPrev.h = toH;
			hlPrev.visible = true;
			return;
		}

		if (highlightAnim) {
			highlightAnim.cancel();
			highlightAnim = null;
		}

		const sc = springConfig();
		const a = animateSpring(
			rect,
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
				rect.setAttribute("x", String(toX));
				rect.setAttribute("y", String(toY));
				rect.setAttribute("width", String(toW));
				rect.setAttribute("height", String(toH));
				rect.setAttribute("rx", String(toRx));
				rect.setAttribute("ry", String(toRx));
			};
		}
	}

	function onItemLeave() {
		const rect = highlightRectEl;
		if (!rect) return;
		rect.setAttribute("opacity", "0");
		hlPrev.visible = false;
		if (highlightAnim) {
			highlightAnim.cancel();
			highlightAnim = null;
		}
	}

	// --- Event handlers ---
	function handleOpen() {
		if (props.open === undefined) machine.open();
		else props.onOpenChange?.(true);
	}
	function handleClose() {
		if (props.open === undefined) machine.close();
		else props.onOpenChange?.(false);
	}
	function handleToggle() {
		if (props.open === undefined) machine.toggle();
		else props.onOpenChange?.(!snapshot().open);
	}
	function onMouseEnter() {
		if (trigger() === "hover") handleOpen();
	}
	function onMouseLeave() {
		if (trigger() === "hover") handleClose();
		onItemLeave();
	}
	function onClick() {
		if (trigger() === "click") handleToggle();
	}

	// Init: set rect to collapsed size, centered
	createEffect(() => {
		const rect = svgRectEl;
		if (!rect || prev.initialized) return;
		prev.w = collapsedW();
		prev.h = collapsedH();
		prev.initialized = true;

		const cx = (rootW() - collapsedW()) / 2;
		const cy = (rootH() - collapsedH()) / 2;
		rect.setAttribute("width", String(collapsedW()));
		rect.setAttribute("height", String(collapsedH()));
		rect.setAttribute("x", String(cx));
		rect.setAttribute("y", String(cy));
		rect.setAttribute("rx", String(collapsedW() / 2));
		rect.setAttribute("ry", String(collapsedH() / 2));
	});

	// Animate SVG rect
	let currentAnim: Animation | null = null;

	createEffect(() => {
		const rect = svgRectEl;
		if (!rect || !prev.initialized) return;

		const tw = targetW();
		const th = targetH();

		if (tw === prev.w && th === prev.h) return;

		if (currentAnim) {
			currentAnim.cancel();
			currentAnim = null;
		}

		const fromW = prev.w;
		const fromH = prev.h;
		const rw = rootW();
		const rh = rootH();
		const fromX = (rw - fromW) / 2;
		const fromY = (rh - fromH) / 2;
		const toX = (rw - tw) / 2;
		const toY = (rh - th) / 2;

		prev.w = tw;
		prev.h = th;

		const isCollapsing = tw === collapsedW() && th === collapsedH();
		const wasCollapsed = fromW === collapsedW() && fromH === collapsedH();
		const fromRx = wasCollapsed ? collapsedW() / 2 : roundness();
		const toRx = isCollapsing ? collapsedW() / 2 : roundness();

		const a = animateSpring(
			rect,
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
				rect.setAttribute("width", String(tw));
				rect.setAttribute("height", String(th));
				rect.setAttribute("x", String(toX));
				rect.setAttribute("y", String(toY));
				rect.setAttribute("rx", String(toRx));
				rect.setAttribute("ry", String(toRx));
			};
		} else {
			rect.setAttribute("width", String(tw));
			rect.setAttribute("height", String(th));
			rect.setAttribute("x", String(toX));
			rect.setAttribute("y", String(toY));
			rect.setAttribute("rx", String(toRx));
			rect.setAttribute("ry", String(toRx));
		}
	});

	// Reset highlight when closing
	createEffect(() => {
		if (!isOpen()) {
			onItemLeave();
		}
	});

	// Expose notch height as CSS variable on :root for toast collision avoidance
	createEffect(() => {
		const h = rootH();
		document.documentElement.style.setProperty("--fluix-notch-offset", `${h}px`);
		onCleanup(() => {
			document.documentElement.style.removeProperty("--fluix-notch-offset");
		});
	});

	// Destroy machine on cleanup
	onCleanup(() => machine.destroy());

	// Resolve pill/content — supports both JSX.Element and () => JSX.Element
	const renderPill = () => {
		const p = props.pill;
		return typeof p === "function" ? (p as () => JSX.Element)() : p;
	};
	const renderContent = () => {
		const c = props.content;
		return typeof c === "function" ? (c as () => JSX.Element)() : c;
	};

	return (
		<>
			{/* Hidden content measurer */}
			<div data-fluix-notch-measure ref={(el) => (measureContentEl = el)}>
				{renderContent()}
			</div>

			{/* Visible notch */}
			<div
				ref={(el) => (rootEl = el)}
				{...attrs().root}
				style={`width:${rootW()}px;height:${rootH()}px;`}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onMouseOver={onItemEnter}
				onClick={onClick}
			>
				{/* SVG gooey background */}
				<div {...attrs().canvas}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width={rootW()}
						height={rootH()}
						viewBox={`0 0 ${rootW()} ${rootH()}`}
						aria-hidden="true"
					>
						<defs>
							<filter
								id="fluix-notch-goo"
								x="-20%"
								y="-20%"
								width="140%"
								height="140%"
								color-interpolation-filters="sRGB"
							>
								<feGaussianBlur in="SourceGraphic" stdDeviation={blur()} result="blur" />
								<feColorMatrix
									in="blur"
									type="matrix"
									values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
									result="goo"
								/>
								<feComposite in="SourceGraphic" in2="goo" operator="atop" />
							</filter>
						</defs>
						<g filter="url(#fluix-notch-goo)">
							<rect
								ref={(el) => (svgRectEl = el)}
								x={(rootW() - collapsedW()) / 2}
								y={(rootH() - collapsedH()) / 2}
								width={collapsedW()}
								height={collapsedH()}
								rx={collapsedW() / 2}
								ry={collapsedH() / 2}
								fill={fill() ?? "var(--fluix-notch-bg)"}
							/>
						</g>
						{/* Highlight blob: independent rect (no gooey), sits on top of bg */}
						<rect
							ref={(el) => (highlightRectEl = el)}
							x="0"
							y="0"
							width="0"
							height="0"
							rx="0"
							ry="0"
							opacity="0"
							fill="var(--fluix-notch-hl)"
						/>
					</svg>
				</div>

				{/* Pill dot (collapsed icon) -- centered */}
				<div {...attrs().pill} style={`width:${dotSize()}px;height:${dotSize()}px;`}>
					{renderPill()}
				</div>

				{/* Expanded content -- centered */}
				<div {...attrs().content}>
					{renderContent()}
				</div>
			</div>
		</>
	);
}
