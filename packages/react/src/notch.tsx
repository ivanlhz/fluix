/**
 * React Notch — thin adapter that uses the Notch API from core.
 *
 * Subscribes to the core store, applies attrs from core, and animates
 * SVG rects with WAAPI spring physics via animateSpring.
 */

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
	type NotchMachine,
	type NotchMachineState,
} from "@fluix-ui/core";
import {
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useRef,
	useMemo,
	useState,
	useSyncExternalStore,
	useEffect,
} from "react";

/* ----------------------------- Types ----------------------------- */

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
	pill: ReactNode;
	/** Content shown when expanded */
	content: ReactNode;
}

/* ----------------------------- Constants ----------------------------- */

const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

const EMPTY_STATE: NotchMachineState = {
	open: false,
	config: {},
	contentSize: { w: 0, h: 0 },
	baseSize: { w: NOTCH_DEFAULTS.pillMinWidth, h: NOTCH_DEFAULTS.pillHeight },
};

function getServerSnapshot(): NotchMachineState {
	return EMPTY_STATE;
}

/* ----------------------------- Transient state ----------------------------- */

interface NotchTransient {
	prevW: number;
	prevH: number;
	initialized: boolean;
	currentAnim: Animation | null;
	highlightAnim: Animation | null;
	hlPrev: { x: number; y: number; w: number; h: number; visible: boolean };
}

function createTransient(): NotchTransient {
	return {
		prevW: 0,
		prevH: 0,
		initialized: false,
		currentAnim: null,
		highlightAnim: null,
		hlPrev: { x: 0, y: 0, w: 0, h: 0, visible: false },
	};
}

/* ----------------------------- Component ----------------------------- */

export function Notch({
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
}: NotchProps) {
	// --- Machine ---
	const machineRef = useRef<NotchMachine | null>(null);
	if (machineRef.current === null) {
		machineRef.current = createNotchMachine({ position, trigger, roundness, fill, spring });
	}
	const machine = machineRef.current;

	// Subscribe to store
	const subscribe = useCallback(
		(cb: () => void) => machine.store.subscribe(cb),
		[machine],
	);
	const getSnapshot = useCallback(
		() => machine.store.getSnapshot(),
		[machine],
	);
	const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	// --- Refs ---
	const rootRef = useRef<HTMLDivElement>(null);
	const measureContentRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const svgRectRef = useRef<SVGRectElement>(null);
	const highlightRectRef = useRef<SVGRectElement>(null);
	const transientRef = useRef<NotchTransient | null>(null);
	if (transientRef.current === null) {
		transientRef.current = createTransient();
	}
	const t = transientRef.current;

	// Stable refs for callbacks
	const controlledOpenRef = useRef(controlledOpen);
	controlledOpenRef.current = controlledOpen;
	const onOpenChangeRef = useRef(onOpenChange);
	onOpenChangeRef.current = onOpenChange;
	const triggerRef = useRef(trigger);
	triggerRef.current = trigger;

	// --- Derived values ---
	const isOpen = snapshot.open;
	const attrs = useMemo(
		() => getNotchAttrs({ open: isOpen, position, theme }),
		[isOpen, position, theme],
	);
	const springConfig = spring ?? FLUIX_SPRING;
	const blur = Math.min(10, Math.max(6, roundness * 0.45));

	const collapsedW = dotSize;
	const collapsedH = dotSize;

	// Content measurement state
	const contentSizeRef = useRef({ w: 200, h: 44 });

	// We need to re-derive when snapshot changes, so track contentSize in state
	// But to avoid extra re-renders, we use a simple approach: measure into ref
	// and force update only when dimensions actually change.
	const [contentSize, setContentSize] = useState({ w: 200, h: 44 });

	const hlPad = 12;
	const expandedW = contentSize.w + hlPad * 2;
	const expandedH = Math.max(contentSize.h + hlPad, dotSize);

	const targetW = isOpen ? expandedW : collapsedW;
	const targetH = isOpen ? expandedH : collapsedH;

	const rootW = Math.max(expandedW, collapsedW);
	const rootH = Math.max(expandedH, collapsedH);

	// --- Controlled open sync ---
	useEffect(() => {
		if (controlledOpen !== undefined) {
			const snap = machine.store.getSnapshot();
			if (controlledOpen && !snap.open) machine.open();
			else if (!controlledOpen && snap.open) machine.close();
		}
	}, [controlledOpen, machine]);

	// --- Notify onOpenChange ---
	const prevOpenRef = useRef<boolean | undefined>(undefined);
	useEffect(() => {
		const o = snapshot.open;
		if (prevOpenRef.current !== undefined && prevOpenRef.current !== o) {
			onOpenChangeRef.current?.(o);
		}
		prevOpenRef.current = o;
	}, [snapshot.open]);

	// --- Configure machine on prop changes ---
	useEffect(() => {
		machine.configure({ position, trigger, roundness, fill, spring });
	}, [machine, position, trigger, roundness, fill, spring]);

	// --- Measure expanded content ---
	useLayoutEffect(() => {
		const el = measureContentRef.current;
		if (!el) return;

		const measure = () => {
			const r = el.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) {
				const w = Math.ceil(r.width);
				const h = Math.ceil(r.height);
				if (w !== contentSizeRef.current.w || h !== contentSizeRef.current.h) {
					contentSizeRef.current = { w, h };
					setContentSize({ w, h });
				}
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
	}, []);

	// --- Init SVG rect to collapsed size ---
	useLayoutEffect(() => {
		const rect = svgRectRef.current;
		if (!rect || t.initialized) return;

		t.prevW = collapsedW;
		t.prevH = collapsedH;
		t.initialized = true;

		const cx = (rootW - collapsedW) / 2;
		const cy = (rootH - collapsedH) / 2;
		rect.setAttribute("width", String(collapsedW));
		rect.setAttribute("height", String(collapsedH));
		rect.setAttribute("x", String(cx));
		rect.setAttribute("y", String(cy));
		rect.setAttribute("rx", String(collapsedW / 2));
		rect.setAttribute("ry", String(collapsedH / 2));
	}, [collapsedW, collapsedH, rootW, rootH, t]);

	// --- Animate SVG rect ---
	useLayoutEffect(() => {
		const rect = svgRectRef.current;
		if (!rect || !t.initialized) return;

		const tw = targetW;
		const th = targetH;

		if (tw === t.prevW && th === t.prevH) return;

		if (t.currentAnim) {
			t.currentAnim.cancel();
			t.currentAnim = null;
		}

		const fromW = t.prevW;
		const fromH = t.prevH;
		const fromX = (rootW - fromW) / 2;
		const fromY = (rootH - fromH) / 2;
		const toX = (rootW - tw) / 2;
		const toY = (rootH - th) / 2;

		t.prevW = tw;
		t.prevH = th;

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
			t.currentAnim = a;
			a.onfinish = () => {
				t.currentAnim = null;
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
	}, [targetW, targetH, rootW, rootH, collapsedW, collapsedH, roundness, springConfig, t]);

	// --- Reset highlight when closing ---
	useEffect(() => {
		if (!isOpen) {
			onItemLeave();
		}
	}, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

	// --- Expose CSS variable for toast collision avoidance ---
	useEffect(() => {
		document.documentElement.style.setProperty("--fluix-notch-offset", `${rootH}px`);
		return () => {
			document.documentElement.style.removeProperty("--fluix-notch-offset");
		};
	}, [rootH]);

	// --- Cleanup machine on unmount ---
	useEffect(() => {
		return () => machine.destroy();
	}, [machine]);

	// --- Highlight item tracking ---
	const onItemEnter = useCallback((e: React.MouseEvent) => {
		const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
		const rect = highlightRectRef.current;
		const root = rootRef.current;
		const snap = machine.store.getSnapshot();
		if (!target || !rect || !root || !snap.open) return;

		const rootRect = root.getBoundingClientRect();
		const itemW = target.offsetWidth;
		const itemH = target.offsetHeight;
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

		const hl = t.hlPrev;

		if (!hl.visible) {
			rect.setAttribute("x", String(toX));
			rect.setAttribute("y", String(toY));
			rect.setAttribute("width", String(toW));
			rect.setAttribute("height", String(toH));
			rect.setAttribute("rx", String(toRx));
			rect.setAttribute("ry", String(toRx));
			rect.setAttribute("opacity", "1");
			hl.x = toX;
			hl.y = toY;
			hl.w = toW;
			hl.h = toH;
			hl.visible = true;
			return;
		}

		if (t.highlightAnim) {
			t.highlightAnim.cancel();
			t.highlightAnim = null;
		}

		const sc = spring ?? FLUIX_SPRING;
		const a = animateSpring(rect, {
			x: { from: hl.x, to: toX, unit: "px" },
			y: { from: hl.y, to: toY, unit: "px" },
			width: { from: hl.w, to: toW, unit: "px" },
			height: { from: hl.h, to: toH, unit: "px" },
			rx: { from: hl.h / 2, to: toRx, unit: "px" },
			ry: { from: hl.h / 2, to: toRx, unit: "px" },
		}, { ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 });

		hl.x = toX;
		hl.y = toY;
		hl.w = toW;
		hl.h = toH;

		if (a) {
			t.highlightAnim = a;
			a.onfinish = () => {
				t.highlightAnim = null;
				rect.setAttribute("x", String(toX));
				rect.setAttribute("y", String(toY));
				rect.setAttribute("width", String(toW));
				rect.setAttribute("height", String(toH));
				rect.setAttribute("rx", String(toRx));
				rect.setAttribute("ry", String(toRx));
			};
		}
	}, [machine, spring, t]);

	const onItemLeave = useCallback(() => {
		const rect = highlightRectRef.current;
		if (!rect) return;
		rect.setAttribute("opacity", "0");
		t.hlPrev.visible = false;
		if (t.highlightAnim) {
			t.highlightAnim.cancel();
			t.highlightAnim = null;
		}
	}, [t]);

	// --- Event handlers ---
	const handleOpen = useCallback(() => {
		if (controlledOpenRef.current === undefined) machine.open();
		else onOpenChangeRef.current?.(true);
	}, [machine]);

	const handleClose = useCallback(() => {
		if (controlledOpenRef.current === undefined) machine.close();
		else onOpenChangeRef.current?.(false);
	}, [machine]);

	const handleToggle = useCallback(() => {
		if (controlledOpenRef.current === undefined) machine.toggle();
		else onOpenChangeRef.current?.(!machine.store.getSnapshot().open);
	}, [machine]);

	const onMouseEnter = useCallback(() => {
		if (triggerRef.current === "hover") handleOpen();
	}, [handleOpen]);

	const onMouseLeave = useCallback(() => {
		if (triggerRef.current === "hover") handleClose();
		onItemLeave();
	}, [handleClose, onItemLeave]);

	const onClick = useCallback(() => {
		if (triggerRef.current === "click") handleToggle();
	}, [handleToggle]);

	// --- Render ---
	return (
		<>
			{/* Hidden content measurer */}
			<div data-fluix-notch-measure ref={measureContentRef}>
				{content}
			</div>

			{/* Visible notch */}
			<div
				ref={rootRef}
				{...attrs.root}
				style={{ width: rootW, height: rootH }}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onMouseOver={onItemEnter}
				onClick={onClick}
			>
				{/* SVG gooey background */}
				<div {...attrs.canvas}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width={rootW}
						height={rootH}
						viewBox={`0 0 ${rootW} ${rootH}`}
						aria-hidden="true"
					>
						<defs>
							<filter
								id="fluix-notch-goo"
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
									values={GOO_MATRIX}
									result="goo"
								/>
								<feComposite in="SourceGraphic" in2="goo" operator="atop" />
							</filter>
						</defs>
						<g filter="url(#fluix-notch-goo)">
							<rect
								ref={svgRectRef}
								x={(rootW - collapsedW) / 2}
								y={(rootH - collapsedH) / 2}
								width={collapsedW}
								height={collapsedH}
								rx={collapsedW / 2}
								ry={collapsedH / 2}
								fill={fill ?? "var(--fluix-notch-bg)"}
							/>
						</g>
						{/* Highlight blob: independent rect (no gooey), sits on top of bg */}
						<rect
							ref={highlightRectRef}
							x="0"
							y="0"
							width="0"
							height="0"
							rx="0"
							ry="0"
							opacity="0"
							fill="var(--fluix-notch-hl)"
						/>
					</svg>
				</div>

				{/* Pill dot (collapsed icon) -- centered */}
				<div {...attrs.pill} style={{ width: dotSize, height: dotSize }}>
					{pill}
				</div>

				{/* Expanded content -- centered */}
				<div ref={contentRef} {...attrs.content}>
					{content}
				</div>
			</div>
		</>
	);
}
