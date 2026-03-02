<script lang="ts">
import {
	createNotchMachine,
	getNotchAttrs,
	FLUIX_SPRING,
	NOTCH_DEFAULTS,
	type NotchPosition,
	type NotchTrigger,
	type NotchTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import type { Snippet } from "svelte";
import { createNotchAnimation } from "./notch.animation.svelte.js";
import { createNotchHighlight } from "./notch.highlight.svelte.js";

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

const machine = createNotchMachine({
	position: "top-center",
	trigger: "click",
	roundness: NOTCH_DEFAULTS.roundness,
});

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
let hoverBlobEl: SVGRectElement | null = $state(null);

// State
const isOpen = $derived(snapshot.open);
const attrs = $derived(getNotchAttrs({ open: isOpen, position, theme }));
const springConfig = $derived(spring ?? FLUIX_SPRING);
const blur = $derived(Math.min(10, Math.max(6, roundness * 0.45)));

const collapsedW = $derived(dotSize);
const collapsedH = $derived(dotSize);

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
	const obs = new ResizeObserver(() => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(measure);
	});
	obs.observe(el);
	return () => {
		cancelAnimationFrame(raf);
		obs.disconnect();
	};
});

const hlPad = 12;
const expandedW = $derived(contentSize.w + hlPad * 2);
const expandedH = $derived(Math.max(contentSize.h + hlPad, dotSize));
const targetW = $derived(isOpen ? expandedW : collapsedW);
const targetH = $derived(isOpen ? expandedH : collapsedH);
const rootW = $derived(Math.max(expandedW, collapsedW));
const rootH = $derived(Math.max(expandedH, collapsedH));

// --- Extracted modules ---
const highlight = createNotchHighlight();
const anim = createNotchAnimation();

function onItemEnter(e: MouseEvent) {
	highlight.onItemEnter(e, { hoverBlobEl, rootEl, isOpen, roundness, springConfig });
}
function resetHoverBlobImmediate() {
	highlight.resetImmediate(hoverBlobEl, rootW, rootH);
}
function onItemLeave() {
	highlight.onItemLeave(hoverBlobEl, springConfig);
}

// Event handlers
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
	if (trigger === "hover") {
		handleClose();
		resetHoverBlobImmediate();
		return;
	}
	onItemLeave();
}
function onClick() { if (trigger === "click") handleToggle(); }

// SVG rect init + animation
$effect(() => {
	const rect = svgRectEl;
	if (!rect) return;
	anim.init(rect, collapsedW, collapsedH, rootW, rootH);
});

$effect(() => {
	const rect = svgRectEl;
	if (!rect) return;
	anim.animate(rect, { targetW, targetH, rootW, rootH, collapsedW, collapsedH, roundness, springConfig });
});

// Reset blob when closing
$effect(() => {
	if (!isOpen) resetHoverBlobImmediate();
});

// Expose notch height as CSS variable
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
<div
	bind:this={rootEl}
	{...attrs.root}
	role="button"
	tabindex="0"
	aria-expanded={isOpen}
	style="width:{rootW}px;height:{rootH}px;"
	onmouseenter={onMouseEnter}
	onmouseleave={onMouseLeave}
	onmouseover={onItemEnter}
	onclick={onClick}
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick();
		}
	}}
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
				<rect
					bind:this={hoverBlobEl}
					x={(rootW - collapsedW) / 2}
					y={(rootH - collapsedH) / 2}
					width="0"
					height="0"
					rx="0"
					ry="0"
					opacity="0"
					fill={fill ?? "var(--fluix-notch-bg)"}
				/>
			</g>
		</svg>
	</div>

	<!-- Pill dot (collapsed icon) -->
	<div {...attrs.pill} style="width:{dotSize}px;height:{dotSize}px;">
		{@render pill()}
	</div>

	<!-- Expanded content -->
	<div bind:this={contentEl} {...attrs.content}>
		{@render content()}
	</div>
</div>
