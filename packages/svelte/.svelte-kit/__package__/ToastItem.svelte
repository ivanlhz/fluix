<script lang="ts">
import {
	Toaster as CoreToaster,
	TOAST_DEFAULTS,
	type FluixToastItem,
	type FluixToastState,
	type ToastMachine,
} from "@fluix/core";
import type { Snippet } from "svelte";

const WIDTH = 350;
const HEIGHT = 40;
const PILL_CONTENT_PADDING = 16;
const HEADER_HORIZONTAL_PADDING_PX = 12;
const MIN_EXPAND_RATIO = 2.25;
const BODY_MERGE_OVERLAP = 6;
const DISMISS_STAGE_DELAY_MS = 260;

interface Props {
	item: FluixToastItem;
	machine: ToastMachine;
	localState: { ready: boolean; expanded: boolean };
	onLocalStateChange: (patch: Partial<{ ready: boolean; expanded: boolean }>) => void;
}

let { item, machine, localState, onLocalStateChange }: Props = $props();

// --- Element refs ---
let rootEl: HTMLButtonElement | undefined = $state();
let headerEl: HTMLElement | undefined = $state();
let headerInnerEl: HTMLElement | undefined = $state();
let contentEl: HTMLElement | undefined = $state();

// --- Reactive measurements ---
let pillWidth = $state(HEIGHT);
let contentHeight = $state(0);
let frozenExpanded = $state(HEIGHT * MIN_EXPAND_RATIO);

// --- Transient flags (plain vars, NOT $state — must not trigger $effect re-runs) ---
let hoveringFlag = false;
let pendingDismissFlag = false;
let dismissRequestedFlag = false;
let dismissTimerHandle: ReturnType<typeof setTimeout> | null = null;

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
// Update frozen while open
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

// --- Helper functions ---
function clearDismissTimer() {
	if (dismissTimerHandle) {
		clearTimeout(dismissTimerHandle);
		dismissTimerHandle = null;
	}
}

function requestDismiss() {
	if (dismissRequestedFlag) return;
	dismissRequestedFlag = true;
	hoveringFlag = false;
	pendingDismissFlag = false;
	onLocalStateChange({ expanded: false });
	clearDismissTimer();
	const delay = hasDescription ? DISMISS_STAGE_DELAY_MS : 0;
	dismissTimerHandle = setTimeout(() => {
		machine.dismiss(item.id);
		dismissTimerHandle = null;
	}, delay);
}

// --- Effects ---

// Apply CSS custom properties to root element
$effect(() => {
	const el = rootEl;
	if (!el) return;
	const style = rootStyleObj;
	for (const [key, value] of Object.entries(style)) {
		el.style.setProperty(key, value);
	}
});

// Measure pill width (synchronous initial measure, rAF-debounced for resize)
$effect(() => {
	const headerElement = headerEl;
	const headerInner = headerInnerEl;
	if (!headerElement || !headerInner) return;

	const measure = () => {
		const cs = getComputedStyle(headerElement);
		const horizontalPadding =
			parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
		const intrinsicWidth = headerInner.getBoundingClientRect().width;
		pillWidth = intrinsicWidth + horizontalPadding + PILL_CONTENT_PADDING;
	};

	// Measure synchronously so pill is correct before ready transitions enable
	measure();

	let rafId = 0;
	const observer = new ResizeObserver(() => {
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(measure);
	});
	observer.observe(headerInner);

	return () => {
		cancelAnimationFrame(rafId);
		observer.disconnect();
	};
});

// Measure content height (runs after DOM update — Svelte $effect default)
$effect(() => {
	if (!hasDescription) {
		contentHeight = 0;
		return;
	}
	const el = contentEl;
	if (!el) return;

	const measure = () => {
		contentHeight = el.scrollHeight;
	};
	measure();

	let rafId = 0;
	const observer = new ResizeObserver(() => {
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(measure);
	});
	observer.observe(el);

	return () => {
		cancelAnimationFrame(rafId);
		observer.disconnect();
	};
});

// Ready timer (32ms after mount)
$effect(() => {
	const timer = setTimeout(() => {
		onLocalStateChange({ ready: true });
	}, 32);
	return () => clearTimeout(timer);
});

// Auto-dismiss timer
$effect(() => {
	// Track deps for re-run
	const id = item.id;
	const instanceId = item.instanceId;
	const duration = item.duration;
	void id;
	void instanceId;

	if (duration == null || duration <= 0) return;

	const timer = setTimeout(() => {
		if (hoveringFlag) {
			pendingDismissFlag = true;
			return;
		}
		pendingDismissFlag = false;
		requestDismiss();
	}, duration);

	return () => clearTimeout(timer);
});

// Autopilot timers
$effect(() => {
	if (!localState.ready) return;
	// Track deps
	void item.id;
	void item.instanceId;

	const timers: ReturnType<typeof setTimeout>[] = [];

	if (item.autoExpandDelayMs != null && item.autoExpandDelayMs > 0) {
		timers.push(
			setTimeout(() => {
				if (dismissRequestedFlag) return;
				if (!hoveringFlag) onLocalStateChange({ expanded: true });
			}, item.autoExpandDelayMs),
		);
	}

	if (item.autoCollapseDelayMs != null && item.autoCollapseDelayMs > 0) {
		timers.push(
			setTimeout(() => {
				if (dismissRequestedFlag) return;
				if (!hoveringFlag) onLocalStateChange({ expanded: false });
			}, item.autoCollapseDelayMs),
		);
	}

	return () => {
		for (const t of timers) clearTimeout(t);
	};
});

// Reset flags on instanceId change
$effect(() => {
	void item.instanceId;
	hoveringFlag = false;
	pendingDismissFlag = false;
	dismissRequestedFlag = false;
	clearDismissTimer();
});

// Connect DOM events
$effect(() => {
	const el = rootEl;
	if (!el) return;

	// Capture current item for the closure
	const currentItem = item;

	const callbacks = {
		onExpand: () => {
			if (currentItem.exiting || dismissRequestedFlag) return;
			onLocalStateChange({ expanded: true });
		},
		onCollapse: () => {
			if (currentItem.exiting || dismissRequestedFlag) return;
			if (currentItem.autopilot !== false) return;
			onLocalStateChange({ expanded: false });
		},
		onDismiss: () => requestDismiss(),
		onHoverStart: () => {
			hoveringFlag = true;
		},
		onHoverEnd: () => {
			hoveringFlag = false;
			if (pendingDismissFlag && !dismissRequestedFlag) {
				pendingDismissFlag = false;
				requestDismiss();
			}
		},
	};

	const { destroy } = CoreToaster.connect(el, callbacks, currentItem);
	return destroy;
});
</script>

{#snippet iconFor(state: FluixToastState)}
	{#if state === "success"}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<polyline points="20 6 9 17 4 12" />
		</svg>
	{:else if state === "error"}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</svg>
	{:else if state === "warning"}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
			<line x1="12" y1="9" x2="12" y2="13" />
			<line x1="12" y1="17" x2="12.01" y2="17" />
		</svg>
	{:else if state === "info"}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="12" cy="12" r="10" />
			<line x1="12" y1="16" x2="12" y2="12" />
			<line x1="12" y1="8" x2="12.01" y2="8" />
		</svg>
	{:else if state === "loading"}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-fluix-icon="spin">
			<line x1="12" y1="2" x2="12" y2="6" />
			<line x1="12" y1="18" x2="12" y2="22" />
			<line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
			<line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
			<line x1="2" y1="12" x2="6" y2="12" />
			<line x1="18" y1="12" x2="22" y2="12" />
			<line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
			<line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
		</svg>
	{:else if state === "action"}
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<circle cx="12" cy="12" r="10" />
			<polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
		</svg>
	{/if}
{/snippet}

<button
	bind:this={rootEl}
	type="button"
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
					fill={item.fill ?? "#FFFFFF"}
				/>
				<rect
					data-fluix-body=""
					x={0} y={HEIGHT}
					width={WIDTH} height={0}
					rx={0} ry={0}
					fill={item.fill ?? "#FFFFFF"}
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
					{#if item.icon != null}
						{#if typeof item.icon === "string"}
							<span aria-hidden="true">{item.icon}</span>
						{/if}
					{:else}
						{@render iconFor(item.state)}
					{/if}
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
</button>
