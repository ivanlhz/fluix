<script lang="ts">
import {
	Toaster as CoreToaster,
	type FluixToastItem,
	TOAST_DEFAULTS,
	type ToastMachine,
} from "@fluix-ui/core";
import type { Snippet } from "svelte";
import ToastIcon from "./ToastIcon.svelte";
import { createDismissState, resetDismissState, requestDismiss } from "./toast.dismiss.svelte.js";
import {
	applyCssProps,
	observePillWidth,
	observeContentHeight,
	setupAutoDismiss,
	setupAutopilot,
	connectDomEvents,
} from "./toast.effects.svelte.js";

const WIDTH = 350;
const HEIGHT = 40;
const HEADER_HORIZONTAL_PADDING_PX = 12;
const MIN_EXPAND_RATIO = 2.25;
const BODY_MERGE_OVERLAP = 6;

interface Props {
	item: FluixToastItem;
	machine: ToastMachine;
	localState: { ready: boolean; expanded: boolean };
	onLocalStateChange: (patch: Partial<{ ready: boolean; expanded: boolean }>) => void;
}

const { item, machine, localState, onLocalStateChange }: Props = $props();

// --- Element refs ---
let rootEl: HTMLDivElement | null = $state(null);
let headerEl: HTMLDivElement | null = $state(null);
let headerInnerEl: HTMLDivElement | null = $state(null);
let contentEl: HTMLDivElement | null = $state(null);

// --- Reactive measurements ---
let pillWidth = $state(HEIGHT);
let contentHeight = $state(0);
let frozenExpanded = $state(HEIGHT * MIN_EXPAND_RATIO);

// --- Transient dismiss state (plain vars, NOT $state — must not trigger $effect re-runs) ---
const dismiss = createDismissState();

// --- Derived values ---
function getPillAlign(position: string): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

const attrs = $derived(CoreToaster.getAttrs(item, localState));
const hasDescription = $derived(Boolean(item.description) || Boolean(item.button));
const isLoading = $derived(item.state === "loading");
const open = $derived(hasDescription && localState.expanded && !isLoading);
const edge = $derived(item.position.startsWith("top") ? "bottom" : "top");
const pillAlign = $derived(getPillAlign(item.position));
const filterId = $derived(`fluix-gooey-${item.id.replace(/[^a-z0-9-]/gi, "-")}`);
const roundness = $derived(item.roundness ?? TOAST_DEFAULTS.roundness);
const blur = $derived(Math.min(10, Math.max(6, roundness * 0.45)));
const minExpanded = HEIGHT * MIN_EXPAND_RATIO;

const rawExpanded = $derived(
	hasDescription ? Math.max(minExpanded, HEIGHT + contentHeight) : minExpanded,
);

// Freeze expanded height when open
$effect(() => {
	if (open) frozenExpanded = rawExpanded;
});

const expanded = $derived(open ? rawExpanded : frozenExpanded);
const expandedContent = $derived(Math.max(0, expanded - HEIGHT));
const expandedHeight = $derived(hasDescription ? Math.max(expanded, minExpanded) : HEIGHT);
const resolvedPillWidth = $derived(Math.max(HEIGHT, pillWidth));
const pillX = $derived(
	pillAlign === "right"
		? WIDTH - resolvedPillWidth
		: pillAlign === "center"
			? (WIDTH - resolvedPillWidth) / 2
			: 0,
);

const rootStyleObj = $derived({
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
});

function doDismiss() {
	requestDismiss(dismiss, machine, item.id, hasDescription, onLocalStateChange);
}

// --- Effects ---

$effect(() => applyCssProps(() => rootEl, rootStyleObj));

$effect(() => observePillWidth(() => headerEl, () => headerInnerEl, (w) => { pillWidth = w; }));

$effect(() => observeContentHeight(hasDescription, () => contentEl, (h) => { contentHeight = h; }));

// Ready timer (32ms after mount)
$effect(() => {
	const timer = setTimeout(() => onLocalStateChange({ ready: true }), 32);
	return () => clearTimeout(timer);
});

// Auto-dismiss timer
$effect(() => {
	void item.id; void item.instanceId;
	return setupAutoDismiss(item, dismiss, doDismiss);
});

// Autopilot timers
$effect(() => {
	if (!localState.ready) return;
	void item.id; void item.instanceId;
	return setupAutopilot(item, dismiss, onLocalStateChange);
});

// Reset flags on instanceId change
$effect(() => { void item.instanceId; resetDismissState(dismiss); });

// Connect DOM events
$effect(() => connectDomEvents(() => rootEl, item, dismiss, onLocalStateChange, doDismiss));
</script>

<div
	bind:this={rootEl}
	role="button"
	tabindex="0"
	{...attrs.root}
>
	<div {...attrs.canvas}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			data-fluix-svg=""
			width={WIDTH}
			height={expandedHeight}
			viewBox="0 0 {WIDTH} {expandedHeight}"
			aria-hidden="true"
			style="position:absolute;left:0;top:0;overflow:visible;"
		>
			<defs>
				<filter
					id={filterId}
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
			<g filter="url(#{filterId})">
				<rect
					data-fluix-pill=""
					x={pillX} y={0}
					width={resolvedPillWidth} height={HEIGHT}
					rx={roundness} ry={roundness}
					fill={item.fill ?? "var(--fluix-surface-contrast)"}
				/>
				<rect
					data-fluix-body=""
					x={0} y={HEIGHT}
					width={WIDTH} height={0}
					rx={0} ry={0}
					fill={item.fill ?? "var(--fluix-surface-contrast)"}
					opacity={0}
				/>
			</g>
		</svg>
	</div>

	<div
		bind:this={headerEl}
		{...attrs.header}
		style="padding-left:{HEADER_HORIZONTAL_PADDING_PX}px;padding-right:{HEADER_HORIZONTAL_PADDING_PX}px"
	>
		<div data-fluix-header-stack="">
			<div
				bind:this={headerInnerEl}
				data-fluix-header-inner=""
				data-layer="current"
			>
				<div {...attrs.badge} class={item.styles?.badge}>
					<ToastIcon state={item.state} icon={item.icon} />
				</div>
				<span {...attrs.title} class={item.styles?.title}>
					{item.title ?? item.state}
				</span>
			</div>
		</div>
	</div>

	{#if hasDescription}
		<div {...attrs.content}>
			<div
				bind:this={contentEl}
				{...attrs.description}
				class={item.styles?.description}
			>
				{#if typeof item.description === "string" || typeof item.description === "number"}
					{String(item.description)}
				{:else if typeof item.description === "function"}
					{@render (item.description as Snippet)()}
				{/if}

				{#if item.button}
					<button
						{...attrs.button}
						type="button"
						class={item.styles?.button}
						onclick={(e: MouseEvent) => { e.stopPropagation(); item.button?.onClick(); }}
					>
						{item.button.title}
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
