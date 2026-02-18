/**
 * React Toaster — renders the toast viewport(s) and subscribes to the core store.
 *
 * - useSyncExternalStore for the singleton toast machine store
 * - getToastAttrs / getViewportAttrs for data-attributes
 * - connectToast for hover, swipe, expand/collapse
 * - Local state per toast: ready (after mount), expanded (hover/autopilot)
 */

import {
	useSyncExternalStore,
	useRef,
	useEffect,
	useCallback,
	useMemo,
	useState,
	type CSSProperties,
	type ReactNode,
	type ReactElement,
} from "react";
import {
	getToastMachine,
	getToastAttrs,
	getViewportAttrs,
	connectToast,
	type ToastMachineState,
	type FluixToastItem,
	type FluixToasterConfig,
	type FluixPosition,
} from "@fluix/core";

/* ----------------------------- Types ----------------------------- */

export interface ToasterProps {
	/** Default position and viewport config. Applied on mount and when changed. */
	config?: FluixToasterConfig;
}

type ToastLocalState = Record<string, { ready: boolean; expanded: boolean }>;

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

function getViewportOffsetStyle(offset: FluixToasterConfig["offset"]): CSSProperties {
	if (offset == null) return {};
	if (typeof offset === "number" || typeof offset === "string") {
		const v = typeof offset === "number" ? `${offset}px` : offset;
		return { top: v, right: v, bottom: v, left: v };
	}
	const s: CSSProperties = {};
	if (offset.top != null) s.top = typeof offset.top === "number" ? `${offset.top}px` : offset.top;
	if (offset.right != null) s.right = typeof offset.right === "number" ? `${offset.right}px` : offset.right;
	if (offset.bottom != null) s.bottom = typeof offset.bottom === "number" ? `${offset.bottom}px` : offset.bottom;
	if (offset.left != null) s.left = typeof offset.left === "number" ? `${offset.left}px` : offset.left;
	return s;
}

/* ----------------------------- Single toast item (internal) ----------------------------- */

function ToastItem({
	item,
	machine,
	localState,
	onLocalStateChange,
}: {
	item: FluixToastItem;
	machine: ReturnType<typeof getToastMachine>;
	localState: { ready: boolean; expanded: boolean };
	onLocalStateChange: (patch: Partial<{ ready: boolean; expanded: boolean }>) => void;
}) {
	const rootRef = useRef<HTMLButtonElement>(null);
	const connectCleanupRef = useRef<(() => void) | null>(null);

	const attrs = useMemo(
		() => getToastAttrs(item, { ready: localState.ready, expanded: localState.expanded }),
		[item, localState.ready, localState.expanded],
	);

	// Mark ready after mount so entry animation runs
	useEffect(() => {
		const t = requestAnimationFrame(() => {
			requestAnimationFrame(() => onLocalStateChange({ ready: true }));
		});
		return () => cancelAnimationFrame(t);
	}, [item.id, onLocalStateChange]);

	// Wire DOM events via connectToast
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;

		const callbacks = {
			onExpand: () => onLocalStateChange({ expanded: true }),
			onCollapse: () => onLocalStateChange({ expanded: false }),
			onDismiss: () => machine.dismiss(item.id),
			onHoverStart: () => {},
			onHoverEnd: () => {},
		};

		const { destroy } = connectToast(el, callbacks, item);
		connectCleanupRef.current = destroy;
		return () => {
			destroy();
			connectCleanupRef.current = null;
		};
	}, [item, machine, onLocalStateChange]);

	const blur = Math.min(24, Math.max(4, item.roundness ?? 16));
	const filterId = `fluix-gooey-${item.id.replace(/[^a-z0-9-]/gi, "-")}`;

	return (
		<button
			ref={rootRef}
			type="button"
			{...attrs.root}
			style={
				{
					"--fluix-width": "var(--fluix-width, 350px)",
					"--fluix-height": "var(--fluix-height, 40px)",
				} as CSSProperties
			}
		>
			<div {...attrs.canvas}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					data-fluix-svg
					style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}
					aria-hidden
				>
					<defs>
						<filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
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
							data-fluix-pill
							x={0}
							y={0}
							width="100%"
							height="100%"
							rx={item.roundness ?? 16}
							ry={item.roundness ?? 16}
							fill={item.fill ?? "#FFFFFF"}
						/>
						<rect
							data-fluix-body
							x={0}
							y={0}
							width="100%"
							height="100%"
							rx={item.roundness ?? 16}
							ry={item.roundness ?? 16}
							fill={item.fill ?? "#FFFFFF"}
						/>
					</g>
				</svg>
			</div>

			<div {...attrs.header}>
				<div data-fluix-header-stack>
					<div data-fluix-header-inner data-layer="current">
						<div {...attrs.badge} className={item.styles?.badge}>
							{item.icon != null ? (
								typeof item.icon === "object" && item.icon !== null && "type" in item.icon ? (
									(item.icon as ReactElement)
								) : (
									<span aria-hidden>{String(item.icon)}</span>
								)
							) : (
								<DefaultIcon state={item.state} />
							)}
						</div>
						<span {...attrs.title} className={item.styles?.title}>
							{item.title ?? item.state}
						</span>
					</div>
				</div>
			</div>

			<div {...attrs.content}>
				<div {...attrs.description} className={item.styles?.description}>
					{typeof item.description === "string" ? item.description : (item.description as ReactNode)}
				</div>
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
		</button>
	);
}

/* ----------------------------- Toaster ----------------------------- */

const EMPTY_STATE: ToastMachineState = { toasts: [], config: { position: "top-right" } };

function getServerSnapshot(): ToastMachineState {
	return EMPTY_STATE;
}

export function Toaster({ config }: ToasterProps = {}) {
	const machine = useMemo(() => getToastMachine(), []);
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

	const offsetStyle = useMemo(
		() => getViewportOffsetStyle(snapshot.config?.offset ?? config?.offset),
		[snapshot.config?.offset, config?.offset],
	);

	return (
		<>
			{Array.from(byPosition.entries()).map(([position, toasts]) => (
				<section
					key={position}
					{...getViewportAttrs(position)}
					style={offsetStyle}
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
				</section>
			))}
		</>
	);
}
