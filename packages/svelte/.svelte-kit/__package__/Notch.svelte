<script lang="ts">
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
import type { Snippet } from "svelte";

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
	pill: Snippet;
	/** Content shown when expanded */
	content: Snippet;
}

const {
	trigger = "click",
	position = "top-center",
	spring,
	dotSize = 36,
	roundness = NOTCH_DEFAULTS.roundness,
	theme = "dark",
	fill,
	open: controlledOpen,
	onOpenChange,
	pill,
	content,
}: NotchProps = $props();

const machine = createNotchMachine({ position, trigger, roundness, fill, spring });

let snapshot = $state.raw(machine.store.getSnapshot());
$effect(() => {
	return machine.store.subscribe(() => {
		snapshot = machine.store.getSnapshot();
	});
});

$effect(() => {
	if (controlledOpen !== undefined) {
		if (controlledOpen && !snapshot.open) machine.open();
		else if (!controlledOpen && snapshot.open) machine.close();
	}
});

let prevOpenVal: boolean | undefined;
$effect(() => {
	const o = snapshot.open;
	if (prevOpenVal !== undefined && prevOpenVal !== o) onOpenChange?.(o);
	prevOpenVal = o;
});

$effect(() => {
	machine.configure({ position, trigger, roundness, fill, spring });
});

// Refs
let rootEl: HTMLDivElement | null = $state(null);
let measureContentEl: HTMLDivElement | null = $state(null);
let contentEl: HTMLDivElement | null = $state(null);
let svgRectEl: SVGRectElement | null = $state(null);
let highlightRectEl: SVGRectElement | null = $state(null);

// State
const isOpen = $derived(snapshot.open);
const attrs = $derived(getNotchAttrs({ open: isOpen, position, theme }));
const springConfig = $derived(spring ?? FLUIX_SPRING);
const blur = $derived(Math.min(10, Math.max(6, roundness * 0.45)));

// Collapsed = circle
const collapsedW = $derived(dotSize);
const collapsedH = $derived(dotSize);

// Measure expanded content
let contentSize = $state({ w: 200, h: 44 });

$effect(() => {
	const el = measureContentEl;
	if (!el) return;
	const measure = () => {
		const r = el.getBoundingClientRect();
		if (r.width > 0 && r.height > 0) {
			contentSize = { w: Math.ceil(r.width), h: Math.ceil(r.height) };
		}
	};
	measure();
	let raf = 0;
	const obs = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
	obs.observe(el);
	return () => { cancelAnimationFrame(raf); obs.disconnect(); };
});

// Expanded = content + padding for highlight blob overflow
const hlPad = 12; // extra space so highlight rect fits inside SVG viewBox
const expandedW = $derived(contentSize.w + hlPad * 2);
const expandedH = $derived(Math.max(contentSize.h + hlPad, dotSize));

// Target dimensions
const targetW = $derived(isOpen ? expandedW : collapsedW);
const targetH = $derived(isOpen ? expandedH : collapsedH);

// Root = always the max of both states
const rootW = $derived(Math.max(expandedW, collapsedW));
const rootH = $derived(Math.max(expandedH, collapsedH));

// Track previous for animation (mutable, not reactive)
const prev = { w: 0, h: 0, initialized: false };

// --- Highlight blob state ---
let highlightAnim: Animation | null = null;
const hlPrev = { x: 0, y: 0, w: 0, h: 0, visible: false };

function onItemEnter(e: MouseEvent) {
	const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
	const rect = highlightRectEl;
	const root = rootEl;
	if (!target || !rect || !root || !isOpen) return;

	const rootRect = root.getBoundingClientRect();
	// Use offsetWidth/Height to get size without CSS transforms (scale)
	const itemW = target.offsetWidth;
	const itemH = target.offsetHeight;
	// Use getBoundingClientRect only for position (center point is stable with scale)
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
		// First hover — snap into place, no animation
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

	// Animate from previous position
	if (highlightAnim) { highlightAnim.cancel(); highlightAnim = null; }

	const a = animateSpring(rect, {
		x: { from: hlPrev.x, to: toX, unit: "px" },
		y: { from: hlPrev.y, to: toY, unit: "px" },
		width: { from: hlPrev.w, to: toW, unit: "px" },
		height: { from: hlPrev.h, to: toH, unit: "px" },
		rx: { from: hlPrev.h / 2, to: toRx, unit: "px" },
		ry: { from: hlPrev.h / 2, to: toRx, unit: "px" },
	}, { ...springConfig, stiffness: (springConfig.stiffness ?? 300) * 1.2 });

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
	if (highlightAnim) { highlightAnim.cancel(); highlightAnim = null; }
}

// --- Event handlers ---
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
function onMouseEnter() { if (trigger === "hover") handleOpen(); }
function onMouseLeave() {
	if (trigger === "hover") handleClose();
	onItemLeave();
}
function onClick() { if (trigger === "click") handleToggle(); }

// --- Measure pill (not needed, pill = dotSize x dotSize) ---

// Init: set rect to collapsed size, centered
$effect(() => {
	const rect = svgRectEl;
	if (!rect || prev.initialized) return;
	prev.w = collapsedW;
	prev.h = collapsedH;
	prev.initialized = true;

	const cx = (rootW - collapsedW) / 2;
	const cy = (rootH - collapsedH) / 2;
	rect.setAttribute("width", String(collapsedW));
	rect.setAttribute("height", String(collapsedH));
	rect.setAttribute("x", String(cx));
	rect.setAttribute("y", String(cy));
	rect.setAttribute("rx", String(collapsedW / 2));
	rect.setAttribute("ry", String(collapsedH / 2));
});

// Animate SVG rect
let currentAnim: Animation | null = null;

$effect(() => {
	const rect = svgRectEl;
	if (!rect || !prev.initialized) return;

	const tw = targetW;
	const th = targetH;

	if (tw === prev.w && th === prev.h) return;

	if (currentAnim) { currentAnim.cancel(); currentAnim = null; }

	const fromW = prev.w;
	const fromH = prev.h;
	const fromX = (rootW - fromW) / 2;
	const fromY = (rootH - fromH) / 2;
	const toX = (rootW - tw) / 2;
	const toY = (rootH - th) / 2;

	prev.w = tw;
	prev.h = th;

	const isCollapsing = tw === collapsedW && th === collapsedH;
	const wasCollapsed = fromW === collapsedW && fromH === collapsedH;
	const fromRx = wasCollapsed ? collapsedW / 2 : roundness;
	const toRx = isCollapsing ? collapsedW / 2 : roundness;

	const a = animateSpring(rect, {
		width: { from: fromW, to: tw, unit: "px" },
		height: { from: fromH, to: th, unit: "px" },
		x: { from: fromX, to: toX, unit: "px" },
		y: { from: fromY, to: toY, unit: "px" },
		rx: { from: fromRx, to: toRx, unit: "px" },
		ry: { from: fromRx, to: toRx, unit: "px" },
	}, springConfig);

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
$effect(() => {
	if (!isOpen) {
		onItemLeave();
	}
});

// Expose notch height as CSS variable on :root for toast collision avoidance
$effect(() => {
	const h = rootH;
	document.documentElement.style.setProperty("--fluix-notch-offset", `${h}px`);
	return () => {
		document.documentElement.style.removeProperty("--fluix-notch-offset");
	};
});

$effect(() => () => machine.destroy());
</script>

<!-- Hidden content measurer -->
<div data-fluix-notch-measure bind:this={measureContentEl}>
	{@render content()}
</div>

<!-- Visible notch -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={rootEl}
	{...attrs.root}
	style="width:{rootW}px;height:{rootH}px;"
	onmouseenter={onMouseEnter}
	onmouseleave={onMouseLeave}
	onmouseover={onItemEnter}
	onclick={onClick}
>
	<!-- SVG gooey background -->
	<div {...attrs.canvas}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={rootW}
			height={rootH}
			viewBox="0 0 {rootW} {rootH}"
			aria-hidden="true"
		>
			<defs>
				<filter
					id="fluix-notch-goo"
					x="-20%" y="-20%" width="140%" height="140%"
					color-interpolation-filters="sRGB"
				>
					<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
					<feColorMatrix
						in="blur" type="matrix"
						values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
						result="goo"
					/>
					<feComposite in="SourceGraphic" in2="goo" operator="atop" />
				</filter>
			</defs>
			<g filter="url(#fluix-notch-goo)">
				<rect
					bind:this={svgRectEl}
					x={(rootW - collapsedW) / 2}
					y={(rootH - collapsedH) / 2}
					width={collapsedW}
					height={collapsedH}
					rx={collapsedW / 2}
					ry={collapsedH / 2}
					fill={fill ?? "var(--fluix-notch-bg)"}
				/>
			</g>
			<!-- Highlight blob: independent rect (no gooey), sits on top of bg -->
			<rect
				bind:this={highlightRectEl}
				x="0" y="0" width="0" height="0"
				rx="0" ry="0"
				opacity="0"
				fill="var(--fluix-notch-hl)"
			/>
		</svg>
	</div>

	<!-- Pill dot (collapsed icon) — centered -->
	<div {...attrs.pill} style="width:{dotSize}px;height:{dotSize}px;">
		{@render pill()}
	</div>

	<!-- Expanded content — centered -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={contentEl}
		{...attrs.content}
	>
		{@render content()}
	</div>
</div>
