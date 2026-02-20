/**
 * React Toaster — thin adapter that uses the Toaster API from core.
 *
 * Subscribes to the core store, applies attrs from core, and wires DOM via Toaster.connect.
 * SVG pill/body rects are animated with WAAPI spring physics via animateSpring.
 */

import {
	Toaster as CoreToaster,
	FLUIX_SPRING,
	type FluixPosition,
	type FluixToastItem,
	type FluixToasterConfig,
	TOAST_DEFAULTS,
	type ToastMachine,
	type ToastMachineState,
	animateSpring,
} from "@fluix-ui/core";
import {
	type ReactNode,
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { renderToastIcon } from "./toast.icon";
import { getToastRootVars } from "./toast.root-vars";
import { getViewportOffsetStyle } from "./toast.viewport-offset";

/* ----------------------------- Constants ----------------------------- */

const WIDTH = 350;
const HEIGHT = 40;
const PILL_PADDING = 10;
const MIN_EXPAND_RATIO = 2.25;
const HEADER_EXIT_MS = 600 * 0.7;
const BODY_MERGE_OVERLAP = 6;

// Rule 5.4 (rerender-memo-with-default-value): Extract non-primitive defaults
// outside component body to prevent new object allocation on every render.
const DEFAULT_LOCAL: { ready: boolean; expanded: boolean } = { ready: false, expanded: false };
const DEFAULT_FILL = "var(--fluix-surface-contrast)";
const FILTER_ID_REGEX = /[^a-z0-9-]/gi;

/* ----------------------------- Types ----------------------------- */

export interface ToasterProps {
	config?: FluixToasterConfig;
}

type ToastLocalState = Record<string, { ready: boolean; expanded: boolean }>;

interface HeaderLayerView {
	state: FluixToastItem["state"];
	title: string;
	icon: unknown;
	styles?: FluixToastItem["styles"];
}

interface HeaderLayerState {
	current: { key: string; view: HeaderLayerView };
	prev: { key: string; view: HeaderLayerView } | null;
}

/* ----------------------------- Pill align from position ----------------------------- */

function getPillAlign(position: FluixPosition): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

/* ----------------------------- Grouped refs for transient state ----------------------------- */

// Rule 5.12 (rerender-use-ref-transient-values): Group related transient
// values into a single ref object to reduce ref count and improve readability.
interface ToastTransientState {
	hovering: boolean;
	pendingDismiss: boolean;
	dismissRequested: boolean;
	forcedDismissTimer: ReturnType<typeof setTimeout> | null;
	headerPad: number | null;
	pillObserved: Element | null;
	pillRafId: number;
	headerExitTimer: ReturnType<typeof setTimeout> | null;
	pillAnim: Animation | null;
	pillFirstRender: boolean;
	prevPill: { x: number; width: number; height: number };
}

function createTransientState(): ToastTransientState {
	return {
		hovering: false,
		pendingDismiss: false,
		dismissRequested: false,
		forcedDismissTimer: null,
		headerPad: null,
		pillObserved: null,
		pillRafId: 0,
		headerExitTimer: null,
		pillAnim: null,
		pillFirstRender: true,
		prevPill: { x: 0, width: HEIGHT, height: HEIGHT },
	};
}

/* ----------------------------- Header crossfade hook ----------------------------- */

// Rule 5.1 (rerender-derived-state-no-effect): Derive header layer during
// render instead of useLayoutEffect + useState to eliminate an extra render cycle.
function useHeaderCrossfade(item: FluixToastItem) {
	const headerKey = `${item.state}-${item.title ?? item.state}`;
	const prevKeyRef = useRef(headerKey);
	const layerRef = useRef<HeaderLayerState>({
		current: {
			key: headerKey,
			view: { state: item.state, title: item.title ?? item.state, icon: item.icon, styles: item.styles },
		},
		prev: null,
	});

	// Derive during render phase — no useState/useLayoutEffect needed
	const currentView: HeaderLayerView = {
		state: item.state,
		title: item.title ?? item.state,
		icon: item.icon,
		styles: item.styles,
	};

	if (prevKeyRef.current !== headerKey) {
		// Key changed: swap current → prev
		layerRef.current = {
			prev: layerRef.current.current,
			current: { key: headerKey, view: currentView },
		};
		prevKeyRef.current = headerKey;
	} else {
		// Same key: update view in place
		layerRef.current = { ...layerRef.current, current: { key: headerKey, view: currentView } };
	}

	// Timer to clear prev layer after exit animation
	const [, forceRender] = useState(0);
	useEffect(() => {
		if (!layerRef.current.prev) return;

		const timer = setTimeout(() => {
			layerRef.current = { ...layerRef.current, prev: null };
			forceRender((n) => n + 1);
		}, HEADER_EXIT_MS);

		return () => clearTimeout(timer);
	}, [layerRef.current.prev?.key]);

	return { headerKey, headerLayer: layerRef.current };
}

/* ----------------------------- Pill measurement hook ----------------------------- */

function usePillMeasurement(
	headerRef: React.RefObject<HTMLDivElement | null>,
	innerRef: React.RefObject<HTMLDivElement | null>,
	transient: React.RefObject<ToastTransientState>,
	headerKey: string,
) {
	const [pillWidth, setPillWidth] = useState(0);
	const pillRoRef = useRef<ResizeObserver | null>(null);

	useLayoutEffect(() => {
		const el = innerRef.current;
		const header = headerRef.current;
		const t = transient.current;
		if (!el || !header || !t) return;

		if (t.headerPad === null) {
			const cs = getComputedStyle(header);
			t.headerPad = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight);
		}

		const measure = () => {
			const inner = innerRef.current;
			const pad = transient.current?.headerPad ?? 0;
			if (!inner) return;
			const w = inner.scrollWidth + pad + PILL_PADDING;
			// Rule 5.9 (rerender-functional-setstate): functional update avoids stale closure
			if (w >= PILL_PADDING) {
				setPillWidth((prev) => (prev === w ? prev : w));
			}
		};

		const rafId = requestAnimationFrame(() => {
			requestAnimationFrame(measure);
		});

		if (!pillRoRef.current) {
			pillRoRef.current = new ResizeObserver(() => {
				cancelAnimationFrame(t.pillRafId);
				t.pillRafId = requestAnimationFrame(measure);
			});
		}

		if (t.pillObserved !== el) {
			if (t.pillObserved) pillRoRef.current.unobserve(t.pillObserved);
			pillRoRef.current.observe(el);
			t.pillObserved = el;
		}

		return () => cancelAnimationFrame(rafId);
	}, [headerKey, headerRef, innerRef, transient]);

	// Cleanup on unmount
	useEffect(() => {
		const t = transient.current;
		return () => {
			pillRoRef.current?.disconnect();
			if (t) cancelAnimationFrame(t.pillRafId);
		};
	}, [transient]);

	return pillWidth;
}

/* ----------------------------- Content measurement hook ----------------------------- */

function useContentMeasurement(
	contentRef: React.RefObject<HTMLDivElement | null>,
	hasDesc: boolean,
) {
	const [contentHeight, setContentHeight] = useState(0);

	useLayoutEffect(() => {
		if (!hasDesc) {
			setContentHeight(0);
			return;
		}
		const el = contentRef.current;
		if (!el) return;

		const measure = () => {
			const h = el.scrollHeight;
			setContentHeight((prev) => (prev === h ? prev : h));
		};
		measure();

		let rafId = 0;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(measure);
		});
		ro.observe(el);
		return () => {
			cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	}, [hasDesc, contentRef]);

	return contentHeight;
}

/* ----------------------------- ToastHeader sub-component ----------------------------- */

// Rule 5.2 (rerender-defer-reads): Extract into a sub-component so that
// header crossfade re-renders do not trigger the entire ToastItem tree.
const ToastHeader = memo(function ToastHeader({
	innerRef,
	headerRef,
	headerLayer,
	attrs,
}: {
	innerRef: React.RefObject<HTMLDivElement | null>;
	headerRef: React.RefObject<HTMLDivElement | null>;
	headerLayer: HeaderLayerState;
	attrs: ReturnType<typeof CoreToaster.getAttrs>;
}) {
	return (
		<div ref={headerRef} {...attrs.header}>
			<div data-fluix-header-stack>
				<div
					ref={innerRef}
					key={headerLayer.current.key}
					data-fluix-header-inner
					data-layer="current"
				>
					<div
						{...attrs.badge}
						data-state={headerLayer.current.view.state}
						className={headerLayer.current.view.styles?.badge}
					>
						{renderToastIcon(headerLayer.current.view.icon, headerLayer.current.view.state)}
					</div>
					<span
						{...attrs.title}
						data-state={headerLayer.current.view.state}
						className={headerLayer.current.view.styles?.title}
					>
						{headerLayer.current.view.title}
					</span>
				</div>
				{headerLayer.prev && (
					<div
						key={headerLayer.prev.key}
						data-fluix-header-inner
						data-layer="prev"
						data-exiting="true"
					>
						<div
							data-fluix-badge
							data-state={headerLayer.prev.view.state}
							className={headerLayer.prev.view.styles?.badge}
						>
							{renderToastIcon(headerLayer.prev.view.icon, headerLayer.prev.view.state)}
						</div>
						<span
							data-fluix-title
							data-state={headerLayer.prev.view.state}
							className={headerLayer.prev.view.styles?.title}
						>
							{headerLayer.prev.view.title}
						</span>
					</div>
				)}
			</div>
		</div>
	);
});

/* ----------------------------- ToastSvg sub-component ----------------------------- */

// Rule 6.3 (rendering-hoist-jsx): The gooey color matrix values are static — hoisted.
const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

const ToastSvg = memo(function ToastSvg({
	pillRef,
	filterId,
	blur,
	roundness,
	fill,
	svgHeight,
	viewBox,
	pillX,
	resolvedPillWidth,
}: {
	pillRef: React.RefObject<SVGRectElement | null>;
	filterId: string;
	blur: number;
	roundness: number;
	fill: string;
	svgHeight: number;
	viewBox: string;
	pillX: number;
	resolvedPillWidth: number;
}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			data-fluix-svg
			width={WIDTH}
			height={svgHeight}
			viewBox={viewBox}
			aria-hidden
		>
			<defs>
				<filter
					id={filterId}
					x="-20%"
					y="-20%"
					width="140%"
					height="140%"
					colorInterpolationFilters="sRGB"
				>
					<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
					<feColorMatrix in="blur" type="matrix" values={GOO_MATRIX} result="goo" />
					<feComposite in="SourceGraphic" in2="goo" operator="atop" />
				</filter>
			</defs>
			<g filter={`url(#${filterId})`}>
				<rect
					ref={pillRef}
					data-fluix-pill
					x={pillX}
					y={0}
					width={resolvedPillWidth}
					height={HEIGHT}
					rx={roundness}
					ry={roundness}
					fill={fill}
				/>
				<rect
					data-fluix-body
					x={0}
					y={HEIGHT}
					width={WIDTH}
					height={0}
					rx={roundness}
					ry={roundness}
					fill={fill}
					opacity={0}
				/>
			</g>
		</svg>
	);
});

/* ----------------------------- Single toast item (internal) ----------------------------- */

function ToastItem({
	item,
	machine,
	localState,
	onLocalStateChange,
}: {
	item: FluixToastItem;
	machine: ToastMachine;
	localState: { ready: boolean; expanded: boolean };
	onLocalStateChange: (id: string, patch: Partial<{ ready: boolean; expanded: boolean }>) => void;
}) {
	const rootRef = useRef<HTMLButtonElement>(null);
	const headerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const pillRef = useRef<SVGRectElement>(null);

	// Rule 5.12: Group transient non-rendering values in a single ref
	const transientRef = useRef<ToastTransientState | null>(null);
	if (transientRef.current === null) {
		transientRef.current = createTransientState();
	}
	const t = transientRef.current;

	// Rule 8.2 (advanced-event-handler-refs): Store callback in ref for stable reference
	const onLocalStateChangeRef = useRef(onLocalStateChange);
	onLocalStateChangeRef.current = onLocalStateChange;

	// Rule 5.1: Derive header crossfade during render (no extra useState + useLayoutEffect)
	const { headerKey, headerLayer } = useHeaderCrossfade(item);

	// Derived values needed by hooks must come before hook calls
	const hasDesc = Boolean(item.description) || Boolean(item.button);

	// Hooks must be called before derived values that use them
	const pillWidth = usePillMeasurement(headerRef, innerRef, transientRef as React.RefObject<ToastTransientState>, headerKey);
	const contentHeight = useContentMeasurement(contentRef, hasDesc);

	// Derived layout — Rule 5.3: simple primitive expressions, no useMemo needed
	const { ready, expanded: isExpanded } = localState;
	const roundness = item.roundness ?? TOAST_DEFAULTS.roundness;
	const blur = Math.min(10, Math.max(6, roundness * 0.45));
	const filterId = `fluix-gooey-${item.id.replace(FILTER_ID_REGEX, "-")}`;
	const isLoading = item.state === "loading";
	const open = hasDesc && isExpanded && !isLoading;
	const position = getPillAlign(item.position);
	const edge = item.position.startsWith("top") ? "bottom" : "top";

	const resolvedPillWidth = Math.max(pillWidth || HEIGHT, HEIGHT);
	const pillHeight = HEIGHT + blur * 3;
	const pillX =
		position === "right"
			? WIDTH - resolvedPillWidth
			: position === "center"
				? (WIDTH - resolvedPillWidth) / 2
				: 0;

	const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
	const rawExpanded = hasDesc ? Math.max(minExpanded, HEIGHT + contentHeight) : minExpanded;
	const frozenExpandedRef = useRef(rawExpanded);
	if (open) {
		frozenExpandedRef.current = rawExpanded;
	}
	const expanded = open ? rawExpanded : frozenExpandedRef.current;
	const expandedContent = Math.max(0, expanded - HEIGHT);
	const svgHeight = hasDesc ? Math.max(expanded, minExpanded) : HEIGHT;
	const viewBox = `0 0 ${WIDTH} ${svgHeight}`;
	const fill = item.fill ?? DEFAULT_FILL;

	const attrs = useMemo(
		() => CoreToaster.getAttrs(item, { ready, expanded: isExpanded }),
		[item, ready, isExpanded],
	);

	// Rule 7.1 (js-batch-dom-css): Batch CSS custom property writes via cssText
	const rootVars = useMemo<Record<string, string>>(
		() =>
			getToastRootVars({
				open,
				expanded,
				height: HEIGHT,
				resolvedPillWidth,
				pillX,
				edge,
				expandedContent,
				bodyMergeOverlap: BODY_MERGE_OVERLAP,
			}),
		[open, expanded, resolvedPillWidth, pillX, edge, expandedContent],
	);

	useLayoutEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		// Batch: set all CSS vars at once via cssText append
		const vars = Object.entries(rootVars)
			.map(([key, value]) => `${key}:${value}`)
			.join(";");
		el.style.cssText += `;${vars}`;
	}, [rootVars]);

	// Consolidated mount effect — Rule: reduce hook count by merging empty-dep effects
	useEffect(() => {
		// Reset transient flags on mount
		t.hovering = false;
		t.pendingDismiss = false;
		t.dismissRequested = false;
		if (t.forcedDismissTimer) {
			clearTimeout(t.forcedDismissTimer);
			t.forcedDismissTimer = null;
		}

		// Mark ready after brief delay
		const timer = setTimeout(() => {
			onLocalStateChangeRef.current(item.id, { ready: true });
		}, 32);

		return () => clearTimeout(timer);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// WAAPI: animate pill rect
	useEffect(() => {
		const el = pillRef.current;
		if (!el || !ready) return;

		const prev = t.prevPill;
		const next = { x: pillX, width: resolvedPillWidth, height: open ? pillHeight : HEIGHT };

		// Rule 7.8 (js-early-exit): Return early if no change
		if (prev.x === next.x && prev.width === next.width && prev.height === next.height) return;

		t.pillAnim?.cancel();

		// On first render, set values directly (no animation from default size)
		if (t.pillFirstRender) {
			t.pillFirstRender = false;
			el.setAttribute("x", String(next.x));
			el.setAttribute("width", String(next.width));
			el.setAttribute("height", String(next.height));
			t.prevPill = next;
			return;
		}

		const anim = animateSpring(
			el,
			{
				x: { from: prev.x, to: next.x, unit: "px" },
				width: { from: prev.width, to: next.width, unit: "px" },
				height: { from: prev.height, to: next.height, unit: "px" },
			},
			FLUIX_SPRING,
		);

		t.pillAnim = anim;
		t.prevPill = next;

		return () => {
			anim?.cancel();
		};
	}, [ready, pillX, resolvedPillWidth, open, pillHeight, t]);

	// Auto-dismiss timer
	useEffect(() => {
		const duration = item.duration;
		if (duration == null || duration <= 0) return;

		const timer = setTimeout(() => {
			if (t.hovering) {
				t.pendingDismiss = true;
				t.forcedDismissTimer = setTimeout(() => {
					if (t.dismissRequested) return;
					t.dismissRequested = true;
					t.pendingDismiss = false;
					machine.dismiss(item.id);
				}, 1200);
				return;
			}
			t.pendingDismiss = false;
			t.dismissRequested = true;
			machine.dismiss(item.id);
		}, duration);
		return () => {
			clearTimeout(timer);
			if (t.forcedDismissTimer) {
				clearTimeout(t.forcedDismissTimer);
				t.forcedDismissTimer = null;
			}
		};
	}, [item.id, item.duration, machine, t]);

	// Autopilot: auto-expand then auto-collapse
	useEffect(() => {
		if (!ready) return;
		const timers: ReturnType<typeof setTimeout>[] = [];

		if (item.autoExpandDelayMs != null && item.autoExpandDelayMs > 0) {
			timers.push(
				setTimeout(() => {
					if (!t.hovering) onLocalStateChangeRef.current(item.id, { expanded: true });
				}, item.autoExpandDelayMs),
			);
		}

		if (item.autoCollapseDelayMs != null && item.autoCollapseDelayMs > 0) {
			timers.push(
				setTimeout(() => {
					if (!t.hovering) onLocalStateChangeRef.current(item.id, { expanded: false });
				}, item.autoCollapseDelayMs),
			);
		}

		return () => timers.forEach(clearTimeout);
	}, [item.id, item.autoExpandDelayMs, item.autoCollapseDelayMs, ready, t]);

	// Wire DOM events via connectToast
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;

		const callbacks = {
			onExpand: () => {
				if (item.exiting || t.dismissRequested) return;
				onLocalStateChangeRef.current(item.id, { expanded: true });
			},
			onCollapse: () => {
				if (item.exiting || t.dismissRequested) return;
				if (item.autopilot !== false) return;
				onLocalStateChangeRef.current(item.id, { expanded: false });
			},
			onDismiss: () => {
				if (t.dismissRequested) return;
				t.dismissRequested = true;
				machine.dismiss(item.id);
			},
			onHoverStart: () => {
				t.hovering = true;
			},
			onHoverEnd: () => {
				t.hovering = false;
				if (t.pendingDismiss) {
					t.pendingDismiss = false;
					if (t.dismissRequested) return;
					t.dismissRequested = true;
					machine.dismiss(item.id);
				}
			},
		};

		const { destroy } = CoreToaster.connect(el, callbacks, item);
		return destroy;
	}, [item, machine, t]);

	return (
		<button ref={rootRef} type="button" {...attrs.root}>
			<div {...attrs.canvas}>
				<ToastSvg
					pillRef={pillRef}
					filterId={filterId}
					blur={blur}
					roundness={roundness}
					fill={fill}
					svgHeight={svgHeight}
					viewBox={viewBox}
					pillX={pillX}
					resolvedPillWidth={resolvedPillWidth}
				/>
			</div>

			<ToastHeader
				innerRef={innerRef}
				headerRef={headerRef}
				headerLayer={headerLayer}
				attrs={attrs}
			/>

			{hasDesc && (
				<div {...attrs.content}>
					<div ref={contentRef} {...attrs.description} className={item.styles?.description}>
						{typeof item.description === "string"
							? item.description
							: (item.description as ReactNode)}
						{item.button && (
							<button
								{...attrs.button}
								type="button"
								className={item.styles?.button}
								onClick={(e) => {
									e.stopPropagation();
									item.button?.onClick();
								}}
							>
								{item.button.title}
							</button>
						)}
					</div>
				</div>
			)}
		</button>
	);
}

/* ----------------------------- Toaster ----------------------------- */

const EMPTY_STATE: ToastMachineState = { toasts: [], config: { position: "top-right" } };

function getServerSnapshot(): ToastMachineState {
	return EMPTY_STATE;
}

function ViewportGroup({
	position,
	layout,
	offset,
	children,
}: {
	position: FluixPosition;
	layout: "stack" | "notch";
	offset: FluixToasterConfig["offset"];
	children: ReactNode;
}) {
	const sectionRef = useRef<HTMLElement>(null);
	const offsetStyle = useMemo(() => getViewportOffsetStyle(offset, position), [offset, position]);

	useLayoutEffect(() => {
		const el = sectionRef.current;
		if (!el) return;
		el.style.top = "";
		el.style.right = "";
		el.style.bottom = "";
		el.style.left = "";
		el.style.paddingLeft = "";
		el.style.paddingRight = "";
		Object.assign(el.style, offsetStyle);
	}, [offsetStyle]);

	return (
		<section ref={sectionRef} {...CoreToaster.getViewportAttrs(position, layout)}>
			{children}
		</section>
	);
}

export function Toaster({ config }: ToasterProps = {}) {
	const machine = useMemo(() => CoreToaster.getMachine(), []);
	const snapshot = useSyncExternalStore(
		machine.store.subscribe,
		machine.store.getSnapshot,
		getServerSnapshot,
	);

	useEffect(() => {
		if (config) machine.configure(config);
	}, [machine, config]);

	const [localState, setLocalState] = useState<ToastLocalState>(() => ({}));

	// Rule 8.2 + 5.4: Stable callback that receives id as argument instead
	// of creating a new closure per toast in the render loop.
	const setToastLocal = useCallback(
		(id: string, patch: Partial<{ ready: boolean; expanded: boolean }>) => {
			setLocalState((prev) => {
				const current = prev[id] ?? DEFAULT_LOCAL;
				const next = { ...current, ...patch };
				return { ...prev, [id]: next };
			});
		},
		[],
	);

	// Initialize local state for new toasts; prune removed
	useEffect(() => {
		const ids = new Set(snapshot.toasts.map((t) => t.id));
		setLocalState((prev) => {
			const next: ToastLocalState = {};
			for (const id of ids) {
				next[id] = prev[id] ?? DEFAULT_LOCAL;
			}
			return Object.keys(next).length ? next : prev;
		});
	}, [snapshot.toasts]);

	// Group toasts by position
	const byPosition = useMemo(() => {
		const map = new Map<FluixPosition, FluixToastItem[]>();
		for (const item of snapshot.toasts) {
			const list = map.get(item.position) ?? [];
			list.push(item);
			map.set(item.position, list);
		}
		return map;
	}, [snapshot.toasts]);

	const resolvedOffset = snapshot.config?.offset ?? config?.offset;
	const resolvedLayout = snapshot.config?.layout ?? config?.layout ?? "stack";

	return (
		<>
			{Array.from(byPosition.entries()).map(([position, toasts]) => (
				<ViewportGroup
					key={position}
					position={position}
					layout={resolvedLayout}
					offset={resolvedOffset}
				>
					{toasts.map((item) => (
						<ToastItem
							key={item.instanceId}
							item={item}
							machine={machine}
							localState={localState[item.id] ?? DEFAULT_LOCAL}
							onLocalStateChange={setToastLocal}
						/>
					))}
				</ViewportGroup>
			))}
		</>
	);
}
