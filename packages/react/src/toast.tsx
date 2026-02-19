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
} from "@fluix/core";
import {
	type ReactNode,
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

/* ----------------------------- Types ----------------------------- */

export interface ToasterProps {
	/** Default position and viewport config. Applied on mount and when changed. */
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
	onLocalStateChange: (patch: Partial<{ ready: boolean; expanded: boolean }>) => void;
}) {
	const rootRef = useRef<HTMLButtonElement>(null);
	const headerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const pillRef = useRef<SVGRectElement>(null);
	const connectCleanupRef = useRef<(() => void) | null>(null);
	const hoveringRef = useRef(false);
	const pendingDismissRef = useRef(false);
	const dismissRequestedRef = useRef(false);
	const forcedDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const headerPadRef = useRef<number | null>(null);
	const pillRoRef = useRef<ResizeObserver | null>(null);
	const pillRafRef = useRef(0);
	const pillObservedRef = useRef<Element | null>(null);
	const headerExitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const onLocalStateChangeRef = useRef(onLocalStateChange);
	onLocalStateChangeRef.current = onLocalStateChange;

	// Animation refs
	const pillAnimRef = useRef<Animation | null>(null);
	const pillFirstRef = useRef(true);
	const prevPillRef = useRef({ x: 0, width: HEIGHT, height: HEIGHT });

	// Local measurements
	const [pillWidth, setPillWidth] = useState(0);
	const [contentHeight, setContentHeight] = useState(0);

	// Header crossfade state
	const headerKey = `${item.state}-${item.title ?? item.state}`;
	const [headerLayer, setHeaderLayer] = useState<HeaderLayerState>(() => ({
		current: {
			key: headerKey,
			view: {
				state: item.state,
				title: item.title ?? item.state,
				icon: item.icon,
				styles: item.styles,
			},
		},
		prev: null,
	}));

	// Derived layout
	const { ready, expanded: isExpanded } = localState;
	const roundness = item.roundness ?? TOAST_DEFAULTS.roundness;
	// Keep gooey merge subtle; large blur distorts corners during expansion.
	const blur = Math.min(10, Math.max(6, roundness * 0.45));
	const filterId = `fluix-gooey-${item.id.replace(/[^a-z0-9-]/gi, "-")}`;
	const hasDesc = Boolean(item.description) || Boolean(item.button);
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

	const attrs = useMemo(
		() => CoreToaster.getAttrs(item, { ready, expanded: isExpanded }),
		[item, ready, isExpanded],
	);

	// Root style with CSS custom properties for CSS selectors
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
		for (const [key, value] of Object.entries(rootVars)) {
			el.style.setProperty(key, value);
		}
	}, [rootVars]);

	// ----------------------------- Header crossfade -----------------------------
	useLayoutEffect(() => {
		setHeaderLayer((state) => {
			if (state.current.key === headerKey) {
				// Same key, just update view in place
				const newView = {
					state: item.state,
					title: item.title ?? item.state,
					icon: item.icon,
					styles: item.styles,
				};
				if (state.current.view === newView) return state;
				return { ...state, current: { key: headerKey, view: newView } };
			}
			// New key: swap current → prev
			return {
				prev: state.current,
				current: {
					key: headerKey,
					view: {
						state: item.state,
						title: item.title ?? item.state,
						icon: item.icon,
						styles: item.styles,
					},
				},
			};
		});
	}, [headerKey, item.state, item.title, item.icon, item.styles]);

	// Clean prev layer after exit animation
	useEffect(() => {
		if (!headerLayer.prev) return;
		if (headerExitRef.current) clearTimeout(headerExitRef.current);
		headerExitRef.current = setTimeout(() => {
			setHeaderLayer((s) => (s.prev ? { ...s, prev: null } : s));
			headerExitRef.current = null;
		}, HEADER_EXIT_MS);
		return () => {
			if (headerExitRef.current) clearTimeout(headerExitRef.current);
		};
	}, [headerLayer.prev]);

	// ----------------------------- Measure pill width (ResizeObserver) -----------------------------
	useLayoutEffect(() => {
		const el = innerRef.current;
		const header = headerRef.current;
		if (!el || !header) return;

		if (headerPadRef.current === null) {
			const cs = getComputedStyle(header);
			headerPadRef.current = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight);
		}
		const px = headerPadRef.current;

		const measure = () => {
			const w = el.scrollWidth + px + PILL_PADDING;
			if (w > PILL_PADDING) {
				setPillWidth((prev) => (prev === w ? prev : w));
			}
		};
		measure();

		if (!pillRoRef.current) {
			pillRoRef.current = new ResizeObserver(() => {
				cancelAnimationFrame(pillRafRef.current);
				pillRafRef.current = requestAnimationFrame(() => {
					const inner = innerRef.current;
					const pad = headerPadRef.current ?? 0;
					if (!inner) return;
					const w = inner.scrollWidth + pad + PILL_PADDING;
					if (w > PILL_PADDING) {
						setPillWidth((prev) => (prev === w ? prev : w));
					}
				});
			});
		}

		if (pillObservedRef.current !== el) {
			if (pillObservedRef.current) {
				pillRoRef.current.unobserve(pillObservedRef.current);
			}
			pillRoRef.current.observe(el);
			pillObservedRef.current = el;
		}
	}, []);

	// ----------------------------- Measure content height (ResizeObserver) -----------------------------
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
	}, [hasDesc]);

	// ----------------------------- Mark ready after mount -----------------------------
	useEffect(() => {
		const timer = setTimeout(() => {
			onLocalStateChangeRef.current({ ready: true });
		}, 32);
		return () => clearTimeout(timer);
	}, []);

	// Reset transient hover/dismiss flags for each new toast instance payload.
	useEffect(() => {
		hoveringRef.current = false;
		pendingDismissRef.current = false;
		dismissRequestedRef.current = false;
		if (forcedDismissTimerRef.current) {
			clearTimeout(forcedDismissTimerRef.current);
			forcedDismissTimerRef.current = null;
		}
	}, []);

	// ----------------------------- WAAPI: animate pill rect -----------------------------
	useEffect(() => {
		const el = pillRef.current;
		if (!el || !ready) return;

		const prev = prevPillRef.current;
		const next = { x: pillX, width: resolvedPillWidth, height: open ? pillHeight : HEIGHT };

		// Skip if no meaningful change
		if (prev.x === next.x && prev.width === next.width && prev.height === next.height) return;

		// Cancel previous animation
		pillAnimRef.current?.cancel();

		// On first render, set values directly (no animation from default size)
		if (pillFirstRef.current) {
			pillFirstRef.current = false;
			el.setAttribute("x", String(next.x));
			el.setAttribute("width", String(next.width));
			el.setAttribute("height", String(next.height));
			prevPillRef.current = next;
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

		pillAnimRef.current = anim;
		prevPillRef.current = next;

		return () => {
			anim?.cancel();
		};
	}, [ready, pillX, resolvedPillWidth, open, pillHeight]);

	// ----------------------------- Auto-dismiss timer -----------------------------
	useEffect(() => {
		const duration = item.duration;
		if (duration == null || duration <= 0) return;

		const timer = setTimeout(() => {
			if (hoveringRef.current) {
				pendingDismissRef.current = true;
				// Safety net: if hover state gets stuck, force dismiss shortly after.
				forcedDismissTimerRef.current = setTimeout(() => {
					if (dismissRequestedRef.current) return;
					dismissRequestedRef.current = true;
					pendingDismissRef.current = false;
					machine.dismiss(item.id);
				}, 1200);
				return;
			}
			pendingDismissRef.current = false;
			dismissRequestedRef.current = true;
			machine.dismiss(item.id);
		}, duration);
		return () => {
			clearTimeout(timer);
			if (forcedDismissTimerRef.current) {
				clearTimeout(forcedDismissTimerRef.current);
				forcedDismissTimerRef.current = null;
			}
		};
	}, [item.id, item.duration, machine]);

	// ----------------------------- Autopilot: auto-expand then auto-collapse -----------------------------
	useEffect(() => {
		if (!ready) return;
		const timers: ReturnType<typeof setTimeout>[] = [];

		if (item.autoExpandDelayMs != null && item.autoExpandDelayMs > 0) {
			timers.push(
				setTimeout(() => {
					if (!hoveringRef.current) onLocalStateChangeRef.current({ expanded: true });
				}, item.autoExpandDelayMs),
			);
		}

		if (item.autoCollapseDelayMs != null && item.autoCollapseDelayMs > 0) {
			timers.push(
				setTimeout(() => {
					if (!hoveringRef.current) onLocalStateChangeRef.current({ expanded: false });
				}, item.autoCollapseDelayMs),
			);
		}

		return () => timers.forEach(clearTimeout);
	}, [item.autoExpandDelayMs, item.autoCollapseDelayMs, ready]);

	// ----------------------------- Wire DOM events via connectToast -----------------------------
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;

		const callbacks = {
			onExpand: () => {
				if (item.exiting || dismissRequestedRef.current) return;
				onLocalStateChangeRef.current({ expanded: true });
			},
			onCollapse: () => {
				if (item.exiting || dismissRequestedRef.current) return;
				// With autopilot enabled, avoid collapsing immediately on mouseleave.
				// Let the configured collapse timer drive this to prevent early compact state.
				if (item.autopilot !== false) return;
				onLocalStateChangeRef.current({ expanded: false });
			},
			onDismiss: () => {
				if (dismissRequestedRef.current) return;
				dismissRequestedRef.current = true;
				machine.dismiss(item.id);
			},
			onHoverStart: () => {
				hoveringRef.current = true;
			},
			onHoverEnd: () => {
				hoveringRef.current = false;
				if (pendingDismissRef.current) {
					pendingDismissRef.current = false;
					if (dismissRequestedRef.current) return;
					dismissRequestedRef.current = true;
					machine.dismiss(item.id);
				}
			},
		};

		const { destroy } = CoreToaster.connect(el, callbacks, item);
		connectCleanupRef.current = destroy;
		return () => {
			destroy();
			connectCleanupRef.current = null;
		};
	}, [item, machine]);

	// ----------------------------- Cleanup ResizeObserver on unmount -----------------------------
	useEffect(() => {
		return () => {
			pillRoRef.current?.disconnect();
			cancelAnimationFrame(pillRafRef.current);
		};
	}, []);

	return (
		<button ref={rootRef} type="button" {...attrs.root}>
			<div {...attrs.canvas}>
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
							<feColorMatrix
								in="blur"
								type="matrix"
								values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
								result="goo"
							/>
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
							fill={item.fill ?? "#FFFFFF"}
						/>
						<rect
							data-fluix-body
							x={0}
							y={HEIGHT}
							width={WIDTH}
							height={0}
							rx={roundness}
							ry={roundness}
							fill={item.fill ?? "#FFFFFF"}
							opacity={0}
						/>
					</g>
				</svg>
			</div>

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
		// Clear previous offset props before applying the next resolved style.
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

	// Apply config when provided
	useEffect(() => {
		if (config) machine.configure(config);
	}, [machine, config]);

	// Per-toast local state: ready, expanded
	const [localState, setLocalState] = useState<ToastLocalState>(() => ({}));

	const setToastLocal = useCallback(
		(id: string, patch: Partial<{ ready: boolean; expanded: boolean }>) => {
			setLocalState((prev) => {
				const next = { ...prev };
				if (!next[id]) next[id] = { ready: false, expanded: false };
				next[id] = { ...next[id]!, ...patch };
				return next;
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
				next[id] = prev[id] ?? { ready: false, expanded: false };
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
							localState={localState[item.id] ?? { ready: false, expanded: false }}
							onLocalStateChange={(patch) => setToastLocal(item.id, patch)}
						/>
					))}
				</ViewportGroup>
			))}
		</>
	);
}
