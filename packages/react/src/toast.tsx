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
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { ToastHeader } from "./toast.header";
import { useContentMeasurement, useHeaderCrossfade, usePillMeasurement } from "./toast.hooks";
import { getToastRootVars } from "./toast.root-vars";
import { ToastSvg } from "./toast.svg";
import {
	BODY_MERGE_OVERLAP,
	DEFAULT_FILL,
	DEFAULT_LOCAL,
	FILTER_ID_REGEX,
	HEIGHT,
	MIN_EXPAND_RATIO,
	WIDTH,
	createTransientState,
	type ToastLocalState,
	type ToasterProps,
	type ToastTransientState,
} from "./toast.types";
export type { ToasterProps } from "./toast.types";
import { getViewportOffsetStyle } from "./toast.viewport-offset";

/* ----------------------------- Helpers ----------------------------- */

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
	onLocalStateChange: (id: string, patch: Partial<{ ready: boolean; expanded: boolean }>) => void;
}) {
	const rootRef = useRef<HTMLButtonElement>(null);
	const headerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const pillRef = useRef<SVGRectElement>(null);

	const transientRef = useRef<ToastTransientState | null>(null);
	if (transientRef.current === null) {
		transientRef.current = createTransientState();
	}
	const t = transientRef.current;

	const onLocalStateChangeRef = useRef(onLocalStateChange);
	onLocalStateChangeRef.current = onLocalStateChange;

	const { headerKey, headerLayer } = useHeaderCrossfade(item);
	const hasDesc = Boolean(item.description) || Boolean(item.button);
	const pillWidth = usePillMeasurement(headerRef, innerRef, transientRef as React.RefObject<ToastTransientState>, headerKey);
	const contentHeight = useContentMeasurement(contentRef, hasDesc);

	// Derived layout
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
		const vars = Object.entries(rootVars)
			.map(([key, value]) => `${key}:${value}`)
			.join(";");
		el.style.cssText += `;${vars}`;
	}, [rootVars]);

	// Consolidated mount effect
	useEffect(() => {
		t.hovering = false;
		t.pendingDismiss = false;
		t.dismissRequested = false;
		if (t.forcedDismissTimer) {
			clearTimeout(t.forcedDismissTimer);
			t.forcedDismissTimer = null;
		}

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

		if (prev.x === next.x && prev.width === next.width && prev.height === next.height) return;

		t.pillAnim?.cancel();

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
