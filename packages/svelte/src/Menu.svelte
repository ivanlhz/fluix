<script lang="ts">
import {
	FLUIX_SPRING,
	MENU_DEFAULTS,
	connectMenu,
	createMenuMachine,
	getMenuAttrs,
	type MenuMachineState,
	type MenuOrientation,
	type MenuVariant,
	type MenuTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import { setContext } from "svelte";
import type { Snippet } from "svelte";

export interface MenuProps {
	orientation?: MenuOrientation;
	variant?: MenuVariant;
	theme?: MenuTheme;
	activeId?: string | null;
	defaultActiveId?: string | null;
	onActiveChange?: (id: string) => void;
	spring?: SpringConfig;
	roundness?: number;
	blur?: number;
	fill?: string;
	className?: string;
	children: Snippet;
}

const {
	orientation = MENU_DEFAULTS.orientation,
	variant = "pill",
	theme = "dark",
	activeId: controlledActiveId,
	defaultActiveId = null,
	onActiveChange,
	spring,
	roundness = MENU_DEFAULTS.roundness,
	blur: blurProp,
	fill,
	className,
	children,
}: MenuProps = $props();

const machine = createMenuMachine({
	orientation,
	variant,
	spring,
	roundness,
	blur: blurProp,
	fill,
	initialActiveId: controlledActiveId ?? defaultActiveId,
});

let snapshot = $state.raw<MenuMachineState>(machine.store.getSnapshot());

$effect(() => {
	return machine.store.subscribe(() => {
		snapshot = machine.store.getSnapshot();
	});
});

// Reconfigure machine when props change
$effect(() => {
	machine.configure({ orientation, variant, spring, roundness, blur: blurProp, fill });
});

// Sync controlled activeId
$effect(() => {
	if (controlledActiveId !== undefined) {
		machine.setActive(controlledActiveId ?? null);
	}
});

// Notify parent of active changes
let lastActiveNotified: string | null | undefined;
$effect(() => {
	const nextActiveId = snapshot.activeId;
	if (nextActiveId && lastActiveNotified !== nextActiveId && onActiveChange) {
		onActiveChange(nextActiveId);
	}
	lastActiveNotified = nextActiveId;
});

// Refs
let rootEl: HTMLElement | null = $state(null);
let indicatorEl: SVGRectElement | SVGPathElement | null = $state(null);
let size = $state({ width: 0, height: 0 });

const attrs = $derived(getMenuAttrs({ orientation, theme, variant }));
const springConfig = $derived(spring ?? FLUIX_SPRING);
const resolvedBlur = $derived(blurProp ?? Math.min(10, Math.max(6, roundness * 0.45)));
const isTab = $derived(variant === "tab");
const svgWidth = $derived(Math.max(1, size.width));
const svgHeight = $derived(Math.max(1, size.height));
const effectiveFill = $derived(fill ?? "var(--fluix-menu-indicator)");

const filterId = `fluix-menu-goo-${Math.random().toString(36).slice(2, 8)}`;

// Keep a mutable ref for activeId (non-reactive, for connectMenu callback)
let activeIdRef = snapshot.activeId;
$effect(() => {
	activeIdRef = snapshot.activeId;
});

// ResizeObserver for root
$effect(() => {
	const root = rootEl;
	if (!root) return;

	const measure = () => {
		const rect = root.getBoundingClientRect();
		const w = Math.ceil(rect.width);
		const h = Math.ceil(rect.height);
		if (size.width !== w || size.height !== h) {
			size = { width: w, height: h };
		}
	};

	measure();
	let raf = 0;
	const observer = new ResizeObserver(() => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(measure);
	});
	observer.observe(root);

	return () => {
		cancelAnimationFrame(raf);
		observer.disconnect();
	};
});

// Connect menu indicator
let connection: ReturnType<typeof connectMenu> | null = null;
$effect(() => {
	const root = rootEl;
	const indicator = indicatorEl;
	if (!root || !indicator) return;

	connection = connectMenu({
		root,
		indicator,
		getActiveId: () => activeIdRef,
		onSelect(id) {
			if (controlledActiveId === undefined) {
				machine.setActive(id);
			} else {
				onActiveChange?.(id);
			}
		},
		spring: springConfig,
		variant,
		orientation,
	});

	return () => {
		connection?.destroy();
		connection = null;
	};
});

// Sync indicator when activeId or size changes
$effect(() => {
	// Read dependencies
	snapshot.activeId;
	size.width;
	size.height;
	// Trigger sync
	connection?.sync(false);
});

// Cleanup machine
$effect(() => () => machine.destroy());

// Context for MenuItem
const setActive = (id: string) => {
	if (controlledActiveId === undefined) {
		machine.setActive(id);
	} else {
		onActiveChange?.(id);
	}
};

setContext("fluix-menu", {
	get activeId() { return snapshot.activeId; },
	setActive,
	get attrs() { return attrs; },
	get variant() { return variant; },
});
</script>

<nav
	bind:this={rootEl}
	{...attrs.root}
	class={className}
	aria-label="Fluix menu"
>
	<div {...attrs.canvas}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={svgWidth}
			height={svgHeight}
			viewBox="0 0 {svgWidth} {svgHeight}"
			aria-hidden="true"
		>
			{#if !isTab}
				<defs>
					<filter
						id={filterId}
						x="-20%" y="-20%" width="140%" height="140%"
						color-interpolation-filters="sRGB"
					>
						<feGaussianBlur in="SourceGraphic" stdDeviation={resolvedBlur} result="blur" />
						<feColorMatrix
							in="blur" type="matrix"
							values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
							result="goo"
						/>
						<feComposite in="SourceGraphic" in2="goo" operator="atop" />
					</filter>
				</defs>
			{/if}
			{#if isTab}
				<path
					bind:this={indicatorEl}
					{...attrs.indicator}
					d=""
					opacity={0}
					style:fill={effectiveFill}
				/>
			{:else}
				<g filter="url(#{filterId})">
					<rect
						bind:this={indicatorEl}
						{...attrs.indicator}
						x={0}
						y={0}
						width={0}
						height={0}
						rx={0}
						ry={0}
						opacity={0}
						style:fill={effectiveFill}
					/>
				</g>
			{/if}
		</svg>
	</div>
	<div {...attrs.list}>
		{@render children()}
	</div>
</nav>
