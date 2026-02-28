/**
 * React Notch — thin adapter that uses the Notch API from core.
 *
 * Subscribes to the core store, applies attrs from core, and animates
 * SVG rects with WAAPI spring physics via animateSpring.
 */

import {
	createNotchMachine,
	getNotchAttrs,
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
import { useNotchAnimation } from "./notch.animation";
import { NotchSvg } from "./notch.svg";
import { createHighlightTransient, useNotchHighlight } from "./notch.highlight";

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
}

function createTransient(): NotchTransient {
	return {
		prevW: 0,
		prevH: 0,
		initialized: false,
		currentAnim: null,
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
	const hoverBlobRef = useRef<SVGRectElement>(null);
	const transientRef = useRef<NotchTransient | null>(null);
	if (transientRef.current === null) {
		transientRef.current = createTransient();
	}
	const t = transientRef.current;

	const hlTransientRef = useRef(createHighlightTransient());

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

	// --- SVG rect init + spring animation ---
	useNotchAnimation({
		svgRectRef, t, targetW, targetH,
		rootW, rootH, collapsedW, collapsedH,
		roundness, springConfig,
	});

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

	// --- Highlight item tracking (extracted hook) ---
	const { onItemEnter, onItemLeave, resetHoverBlobImmediate } = useNotchHighlight({
		rootRef,
		hoverBlobRef,
		machine,
		spring,
		roundness,
		rootW,
		rootH,
		isOpen,
		t: hlTransientRef.current,
	});

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
		if (triggerRef.current === "hover") {
			handleClose();
			resetHoverBlobImmediate();
			return;
		}
		onItemLeave();
	}, [handleClose, onItemLeave, resetHoverBlobImmediate]);

	const onClick = useCallback(() => {
		if (triggerRef.current === "click") handleToggle();
	}, [handleToggle]);

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onClick();
			}
		},
		[onClick],
	);

	// --- Render ---
	return (
		<NotchView
			measureContentRef={measureContentRef}
			rootRef={rootRef}
			contentRef={contentRef}
			svgRectRef={svgRectRef}
			hoverBlobRef={hoverBlobRef}
			attrs={attrs}
			rootW={rootW}
			rootH={rootH}
			blur={blur}
			collapsedW={collapsedW}
			collapsedH={collapsedH}
			dotSize={dotSize}
			fill={fill}
			isOpen={isOpen}
			pill={pill}
			content={content}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			onMouseOver={onItemEnter}
			onClick={onClick}
			onKeyDown={onKeyDown}
		/>
	);
}

/* ----------------------------- View ----------------------------- */

interface NotchViewProps {
	measureContentRef: React.RefObject<HTMLDivElement | null>;
	rootRef: React.RefObject<HTMLDivElement | null>;
	contentRef: React.RefObject<HTMLDivElement | null>;
	svgRectRef: React.RefObject<SVGRectElement | null>;
	hoverBlobRef: React.RefObject<SVGRectElement | null>;
	attrs: ReturnType<typeof getNotchAttrs>;
	rootW: number;
	rootH: number;
	blur: number;
	collapsedW: number;
	collapsedH: number;
	dotSize: number;
	fill: string | undefined;
	isOpen: boolean;
	pill: ReactNode;
	content: ReactNode;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
	onMouseOver: (e: React.MouseEvent) => void;
	onClick: () => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
}

function NotchView({
	measureContentRef,
	rootRef,
	contentRef,
	svgRectRef,
	hoverBlobRef,
	attrs,
	rootW,
	rootH,
	blur,
	collapsedW,
	collapsedH,
	dotSize,
	fill,
	isOpen,
	pill,
	content,
	onMouseEnter,
	onMouseLeave,
	onMouseOver,
	onClick,
	onKeyDown,
}: NotchViewProps) {
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
				role="button"
				tabIndex={0}
				aria-expanded={isOpen}
				style={{ width: rootW, height: rootH }}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				onMouseOver={onMouseOver}
				onClick={onClick}
				onKeyDown={onKeyDown}
			>
				{/* SVG gooey background */}
				<div {...attrs.canvas}>
					<NotchSvg
						rootW={rootW}
						rootH={rootH}
						blur={blur}
						collapsedW={collapsedW}
						collapsedH={collapsedH}
						fill={fill}
						svgRectRef={svgRectRef}
						hoverBlobRef={hoverBlobRef}
					/>
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
