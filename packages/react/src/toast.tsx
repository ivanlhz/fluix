/**
 * React Toaster — thin adapter that uses the Toaster API from core.
 *
 * Subscribes to the core store, applies attrs from core, and wires DOM via Toaster.connect.
 * SVG pill/body rects are animated with WAAPI spring physics via animateSpring.
 */

import {
	useSyncExternalStore,
	useRef,
	useEffect,
	useLayoutEffect,
	useCallback,
	useMemo,
	useState,
	type CSSProperties,
	type ReactNode,
	type ReactElement,
} from "react";
import {
	Toaster as CoreToaster,
	animateSpring,
	FLUIX_SPRING,
	TOAST_DEFAULTS,
	type ToastMachine,
	type ToastMachineState,
	type FluixToastItem,
	type FluixToasterConfig,
	type FluixPosition,
} from "@fluix/core";

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

/* ----------------------------- Default icons (minimal SVG per state) ----------------------------- */

function DefaultIcon({ state }: { state: FluixToastItem["state"] }) {
	switch (state) {
		case "success":
			return (
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<polyline points="20 6 9 17 4 12" />
				</svg>
			);
		case "error":
			return (
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			);
		case "warning":
			return (
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
					<line x1="12" y1="9" x2="12" y2="13" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
			);
		case "info":
			return (
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="16" x2="12" y2="12" />
					<line x1="12" y1="8" x2="12.01" y2="8" />
				</svg>
			);
		case "loading":
			return (
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden data-fluix-icon="spin">
					<line x1="12" y1="2" x2="12" y2="6" />
					<line x1="12" y1="18" x2="12" y2="22" />
					<line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
					<line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
					<line x1="2" y1="12" x2="6" y2="12" />
					<line x1="18" y1="12" x2="22" y2="12" />
					<line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
					<line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
				</svg>
			);
		case "action":
			return (
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
					<circle cx="12" cy="12" r="10" />
					<polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
				</svg>
			);
		default:
			return null;
	}
}

/* ----------------------------- Viewport offset style ----------------------------- */

function resolveOffsetValue(v: number | string): string {
	return typeof v === "number" ? `${v}px` : v;
}

function getViewportOffsetStyle(offset: FluixToasterConfig["offset"], position: FluixPosition): CSSProperties {
	if (offset == null) return {};

	// Resolve per-side values
	let top: string | undefined;
	let right: string | undefined;
	let bottom: string | undefined;
	let left: string | undefined;

	if (typeof offset === "number" || typeof offset === "string") {
		const v = resolveOffsetValue(offset as number | string);
		top = v; right = v; bottom = v; left = v;
	} else {
		if (offset.top != null) top = resolveOffsetValue(offset.top);
		if (offset.right != null) right = resolveOffsetValue(offset.right);
		if (offset.bottom != null) bottom = resolveOffsetValue(offset.bottom);
		if (offset.left != null) left = resolveOffsetValue(offset.left);
	}

	// Only apply offset to the sides relevant to this position
	const s: CSSProperties = {};
	if (position.startsWith("top") && top) s.top = top;
	if (position.startsWith("bottom") && bottom) s.bottom = bottom;
	if (position.endsWith("right") && right) s.right = right;
	if (position.endsWith("left") && left) s.left = left;
	if (position.endsWith("center")) {
		// For center positions, apply both left/right as padding
		if (left) s.paddingLeft = left;
		if (right) s.paddingRight = right;
	}
	return s;
}

/* ----------------------------- Pill align from position ----------------------------- */

function getPillAlign(position: FluixPosition): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

/* ----------------------------- Render icon helper ----------------------------- */

function renderIcon(icon: unknown, state: FluixToastItem["state"]) {
	if (icon != null) {
		if (typeof icon === "object" && icon !== null && "type" in icon) {
			return icon as ReactElement;
		}
		return <span aria-hidden>{String(icon)}</span>;
	}
	return <DefaultIcon state={state} />;
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
			view: { state: item.state, title: item.title ?? item.state, icon: item.icon, styles: item.styles },
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
	const pillX = position === "right"
		? WIDTH - resolvedPillWidth
		: position === "center"
			? (WIDTH - resolvedPillWidth) / 2
			: 0;

	const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
	const rawExpanded = hasDesc
		? Math.max(minExpanded, HEIGHT + contentHeight)
		: minExpanded;
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
		() => ({
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
				const newView = { state: item.state, title: item.title ?? item.state, icon: item.icon, styles: item.styles };
				if (state.current.view === newView) return state;
				return { ...state, current: { key: headerKey, view: newView } };
			}
			// New key: swap current → prev
			return {
				prev: state.current,
				current: {
					key: headerKey,
					view: { state: item.state, title: item.title ?? item.state, icon: item.icon, styles: item.styles },
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
	}, [headerLayer.prev?.key]);

	// ----------------------------- Measure pill width (ResizeObserver) -----------------------------
	useLayoutEffect(() => {
		const el = innerRef.current;
		const header = headerRef.current;
		if (!el || !header) return;

		if (headerPadRef.current === null) {
			const cs = getComputedStyle(header);
			headerPadRef.current = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
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
	}, [headerLayer.current.key]);

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
	}, [item.id]);

	// Reset transient hover/dismiss flags for each new toast instance payload.
	useEffect(() => {
		hoveringRef.current = false;
		pendingDismissRef.current = false;
		dismissRequestedRef.current = false;
		if (forcedDismissTimerRef.current) {
			clearTimeout(forcedDismissTimerRef.current);
			forcedDismissTimerRef.current = null;
		}
	}, [item.instanceId]);

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

		const anim = animateSpring(el, {
			x: { from: prev.x, to: next.x, unit: "px" },
			width: { from: prev.width, to: next.width, unit: "px" },
			height: { from: prev.height, to: next.height, unit: "px" },
		}, FLUIX_SPRING);

		pillAnimRef.current = anim;
		prevPillRef.current = next;

		return () => { anim?.cancel(); };
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
	}, [item.id, item.instanceId, item.duration, machine]);

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
	}, [item.id, item.instanceId, item.autoExpandDelayMs, item.autoCollapseDelayMs, ready]);

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
		<button
			ref={rootRef}
			type="button"
			{...attrs.root}
		>
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
						<filter id={filterId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
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
						<div {...attrs.badge} data-state={headerLayer.current.view.state} className={headerLayer.current.view.styles?.badge}>
							{renderIcon(headerLayer.current.view.icon, headerLayer.current.view.state)}
						</div>
						<span {...attrs.title} data-state={headerLayer.current.view.state} className={headerLayer.current.view.styles?.title}>
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
							<div data-fluix-badge data-state={headerLayer.prev.view.state} className={headerLayer.prev.view.styles?.badge}>
								{renderIcon(headerLayer.prev.view.icon, headerLayer.prev.view.state)}
							</div>
							<span data-fluix-title data-state={headerLayer.prev.view.state} className={headerLayer.prev.view.styles?.title}>
								{headerLayer.prev.view.title}
							</span>
						</div>
					)}
				</div>
			</div>

			{hasDesc && (
				<div {...attrs.content}>
					<div ref={contentRef} {...attrs.description} className={item.styles?.description}>
						{typeof item.description === "string" ? item.description : (item.description as ReactNode)}
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
	const offsetStyle = useMemo(
		() => getViewportOffsetStyle(offset, position),
		[offset, position],
	);

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
		<section
			ref={sectionRef}
			{...CoreToaster.getViewportAttrs(position, layout)}
		>
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

	const setToastLocal = useCallback((id: string, patch: Partial<{ ready: boolean; expanded: boolean }>) => {
		setLocalState((prev) => {
			const next = { ...prev };
			if (!next[id]) next[id] = { ready: false, expanded: false };
			next[id] = { ...next[id]!, ...patch };
			return next;
		});
	}, []);

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
