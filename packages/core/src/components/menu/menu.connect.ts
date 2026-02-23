import { FLUIX_SPRING, animateSpring, type SpringConfig } from "../../primitives/spring";
import type { MenuVariant } from "./menu.types";

export interface MenuConnectOptions {
	root: HTMLElement;
	indicator: SVGRectElement | SVGPathElement;
	getActiveId(): string | null;
	onSelect?(id: string): void;
	spring?: SpringConfig;
	padding?: number;
	variant?: MenuVariant;
}

interface IndicatorFrame {
	x: number;
	y: number;
	width: number;
	height: number;
	radius: number;
	visible: boolean;
}

/** Minimal animation handle shared by WAAPI and RAF-based animations. */
interface AnimationHandle {
	cancel(): void;
	onfinish: (() => void) | null;
}

const ITEM_SELECTOR = "[data-fluix-menu-item]";
const TAB_CURVE_RADIUS = 14;

function readItemFrame(
	root: HTMLElement,
	activeId: string,
	padding: number,
	variant?: MenuVariant,
): IndicatorFrame | null {
	const activeItem = root.querySelector<HTMLElement>(
		`${ITEM_SELECTOR}[data-menu-id="${CSS.escape(activeId)}"]`,
	);
	if (!activeItem) return null;

	const rootRect = root.getBoundingClientRect();
	const itemRect = activeItem.getBoundingClientRect();
	const width = Math.max(0, itemRect.width + padding * 2);
	const height = Math.max(0, itemRect.height + padding * 2);
	const x = itemRect.left - rootRect.left - padding;
	const y = itemRect.top - rootRect.top - padding;

	if (variant === "tab") {
		const extendedWidth = rootRect.width - x;
		return {
			x,
			y,
			width: extendedWidth,
			height,
			radius: height / 2,
			visible: width > 0 && height > 0,
		};
	}

	return {
		x,
		y,
		width,
		height,
		radius: height / 2,
		visible: width > 0 && height > 0,
	};
}

/**
 * Generate an SVG path for the tab shape:
 * - Rounded left side (pill)
 * - Flat right edge
 * - Concave curves at top-right and bottom-right corners
 */
function generateTabPath(frame: IndicatorFrame, cr: number): string {
	const { x, y, width, height } = frame;
	// Clamp radii so the shape stays valid even at very small widths
	const r = Math.min(frame.radius, height / 2, width / 2);
	const rw = x + width; // right edge

	const concaveR = Math.min(cr, height / 2, Math.max(0, width / 2 - r));

	return [
		`M ${x + r} ${y}`,
		`L ${rw - concaveR} ${y}`,
		`Q ${rw} ${y} ${rw} ${y - concaveR}`,
		`L ${rw} ${y + height + concaveR}`,
		`Q ${rw} ${y + height} ${rw - concaveR} ${y + height}`,
		`L ${x + r} ${y + height}`,
		`A ${r} ${r} 0 0 1 ${x} ${y + height - r}`,
		`L ${x} ${y + r}`,
		`A ${r} ${r} 0 0 1 ${x + r} ${y}`,
		"Z",
	].join(" ");
}

function applyFrame(indicator: SVGRectElement | SVGPathElement, frame: IndicatorFrame, variant?: MenuVariant) {
	if (variant === "tab") {
		const path = indicator as SVGPathElement;
		path.setAttribute("d", generateTabPath(frame, TAB_CURVE_RADIUS));
		path.setAttribute("opacity", frame.visible ? "1" : "0");
	} else {
		const rect = indicator as SVGRectElement;
		rect.setAttribute("x", String(frame.x));
		rect.setAttribute("y", String(frame.y));
		rect.setAttribute("width", String(frame.width));
		rect.setAttribute("height", String(frame.height));
		rect.setAttribute("rx", String(frame.radius));
		rect.setAttribute("ry", String(frame.radius));
		rect.setAttribute("opacity", frame.visible ? "1" : "0");
	}
}

function frameEquals(a: IndicatorFrame | null, b: IndicatorFrame | null): boolean {
	if (!a || !b) return false;
	return (
		a.x === b.x &&
		a.y === b.y &&
		a.width === b.width &&
		a.height === b.height &&
		a.radius === b.radius &&
		a.visible === b.visible
	);
}

/**
 * Simulate a spring from 0→1 and return normalized sample values.
 */
function simulateSpringValues(config: Required<SpringConfig>): number[] {
	const { stiffness, damping, mass } = config;
	const dt = 1 / 120;
	const maxDuration = 3;
	const samples: number[] = [0];

	let position = 0;
	let velocity = 0;
	let t = 0;

	while (t < maxDuration) {
		const acceleration = (-stiffness * (position - 1) - damping * velocity) / mass;
		const midVelocity = velocity + acceleration * (dt / 2);
		const midPosition = position + velocity * (dt / 2);
		const midAcceleration = (-stiffness * (midPosition - 1) - damping * midVelocity) / mass;

		velocity = velocity + midAcceleration * dt;
		position = position + midVelocity * dt;
		t += dt;
		samples.push(position);

		if (Math.abs(position - 1) < 0.001 && Math.abs(velocity) < 0.001) break;
	}

	samples.push(1);
	return samples;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/** Fast ease-out curve: 1 − (1−t)³ */
function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

const EXIT_MS = 130;

/**
 * Two-phase tab animation driven by requestAnimationFrame:
 *
 * Phase 1 (exit  ~130 ms):  Quick ease-out collapse to the right.
 * Phase 2 (enter ~280 ms):  Spring expansion from the right at the new Y.
 *
 * `onEnterStart` fires when phase 2 begins — used to flip `data-state`
 * only after the indicator has left the old position.
 */
function animateTabIndicator(
	path: SVGPathElement,
	from: IndicatorFrame,
	to: IndicatorFrame,
	cr: number,
	spring: Required<SpringConfig>,
	onEnterStart?: () => void,
): AnimationHandle {
	const rightEdge = from.x + from.width;

	// Stiff spring for enter phase — fast with a subtle bounce
	const enterSamples = simulateSpringValues({
		stiffness: spring.stiffness * 3,
		damping: spring.damping * 1.8,
		mass: spring.mass,
	});
	const enterCount = enterSamples.length;
	const enterMs = (enterCount / 120) * 1000;
	const totalMs = EXIT_MS + enterMs;

	const startTime = performance.now();
	let cancelled = false;
	let enteredPhase2 = false;

	const handle: AnimationHandle = {
		onfinish: null,
		cancel() { cancelled = true; },
	};

	function tick() {
		if (cancelled) return;

		const elapsed = performance.now() - startTime;
		let frame: IndicatorFrame;

		if (elapsed < EXIT_MS) {
			// ── Phase 1: exit (collapse to the right) ──
			const t = easeOutCubic(elapsed / EXIT_MS);
			frame = {
				x: lerp(from.x, rightEdge, t),
				y: from.y,
				width: lerp(from.width, 0, t),
				height: from.height,
				radius: from.radius,
				visible: true,
			};
		} else {
			if (!enteredPhase2) {
				enteredPhase2 = true;
				onEnterStart?.();
			}
			// ── Phase 2: enter (expand from the right at new Y) ──
			const phaseElapsed = elapsed - EXIT_MS;
			const phaseProgress = Math.min(phaseElapsed / enterMs, 1);
			const idx = Math.min(
				Math.floor(phaseProgress * (enterCount - 1)),
				enterCount - 1,
			);
			const t = enterSamples[idx];
			frame = {
				x: lerp(rightEdge, to.x, t),
				y: to.y,
				width: lerp(0, to.width, t),
				height: to.height,
				radius: to.radius,
				visible: true,
			};
		}

		path.setAttribute("d", generateTabPath(frame, cr));

		if (elapsed < totalMs) {
			requestAnimationFrame(tick);
		} else {
			handle.onfinish?.();
		}
	}

	requestAnimationFrame(tick);
	return handle;
}

export function connectMenu(options: MenuConnectOptions): {
	sync(immediate?: boolean): void;
	destroy(): void;
} {
	const spring = options.spring ?? FLUIX_SPRING;
	const padding = options.padding ?? 6;
	const variant = options.variant;
	const cleanups: Array<() => void> = [];
	let currentAnimation: AnimationHandle | null = null;
	let lastFrame: IndicatorFrame | null = null;
	let rafId = 0;
	let resizeObserver: ResizeObserver | null = null;
	let mutationObserver: MutationObserver | null = null;

	/** Track previous active ID so we can manage data-state during tab animation */
	let previousActiveId: string | null = null;
	/** IDs whose data-state we're controlling during tab animation */
	let animOldId: string | null = null;
	let animNewId: string | null = null;
	let animPhase: "exit" | "enter" | null = null;

	function setItemState(id: string, state: "active" | "inactive") {
		const el = options.root.querySelector<HTMLElement>(
			`${ITEM_SELECTOR}[data-menu-id="${CSS.escape(id)}"]`,
		);
		if (el && el.dataset.state !== state) {
			el.dataset.state = state;
		}
	}

	/** Re-enforce the correct data-state for managed items (fights React re-renders) */
	function enforceAnimStates() {
		if (!animPhase) return;
		if (animPhase === "exit") {
			if (animOldId) setItemState(animOldId, "active");
			if (animNewId) setItemState(animNewId, "inactive");
		} else {
			if (animOldId) setItemState(animOldId, "inactive");
			if (animNewId) setItemState(animNewId, "active");
		}
	}

	function clearAnimState() {
		animOldId = null;
		animNewId = null;
		animPhase = null;
	}

	const updateIndicator = (immediate = false) => {
		const activeId = options.getActiveId();
		const nextFrame = activeId ? readItemFrame(options.root, activeId, padding, variant) : null;
		const fallbackFrame: IndicatorFrame =
			nextFrame ??
			lastFrame ?? {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				radius: 0,
				visible: false,
			};

		if (!lastFrame) {
			lastFrame = fallbackFrame;
			previousActiveId = activeId;
			applyFrame(options.indicator, fallbackFrame, variant);
			return;
		}
		if (frameEquals(lastFrame, fallbackFrame)) return;

		if (currentAnimation) {
			currentAnimation.cancel();
			currentAnimation = null;
			clearAnimState();
		}

		if (immediate || !fallbackFrame.visible || !lastFrame.visible) {
			lastFrame = fallbackFrame;
			previousActiveId = activeId;
			applyFrame(options.indicator, fallbackFrame, variant);
			return;
		}

		const from = lastFrame;
		const to = fallbackFrame;
		const oldActiveId = previousActiveId;
		const newActiveId = activeId;
		lastFrame = to;
		previousActiveId = activeId;

		let animation: AnimationHandle | null = null;

		if (variant === "tab") {
			// Start managing data-state: keep old active during exit
			animOldId = oldActiveId;
			animNewId = newActiveId;
			animPhase = "exit";
			enforceAnimStates();

			animation = animateTabIndicator(
				options.indicator as SVGPathElement,
				from,
				to,
				TAB_CURVE_RADIUS,
				{ stiffness: spring.stiffness ?? 170, damping: spring.damping ?? 18, mass: spring.mass ?? 1 },
				() => {
					// Enter phase started — flip data-state
					animPhase = "enter";
					enforceAnimStates();
				},
			);
		} else {
			const waapi = animateSpring(
				options.indicator,
				{
					x: { from: from.x, to: to.x, unit: "px" },
					y: { from: from.y, to: to.y, unit: "px" },
					width: { from: from.width, to: to.width, unit: "px" },
					height: { from: from.height, to: to.height, unit: "px" },
					rx: { from: from.radius, to: to.radius, unit: "px" },
					ry: { from: from.radius, to: to.radius, unit: "px" },
				},
				spring,
			);
			if (waapi) {
				const wrapped: AnimationHandle = {
					onfinish: null,
					cancel() { waapi.cancel(); },
				};
				waapi.onfinish = () => wrapped.onfinish?.();
				animation = wrapped;
			}
		}

		if (!animation) {
			applyFrame(options.indicator, to, variant);
			return;
		}

		currentAnimation = animation;
		animation.onfinish = () => {
			currentAnimation = null;
			applyFrame(options.indicator, to, variant);
			// Ensure final data-state is correct and release control
			if (variant === "tab") {
				if (newActiveId) setItemState(newActiveId, "active");
				if (oldActiveId && oldActiveId !== newActiveId) setItemState(oldActiveId, "inactive");
				clearAnimState();
			}
		};
	};

	const sync = (immediate = false) => {
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => updateIndicator(immediate));
	};

	const handleClick = (event: Event) => {
		if (!options.onSelect) return;
		const target = event.target as HTMLElement | null;
		if (!target) return;
		const item = target.closest<HTMLElement>(ITEM_SELECTOR);
		if (!item || item.dataset.disabled === "true") return;
		const id = item.dataset.menuId;
		if (!id) return;
		options.onSelect(id);
	};

	options.root.addEventListener("click", handleClick);
	cleanups.push(() => options.root.removeEventListener("click", handleClick));

	const scheduleSync = () => sync(false);
	resizeObserver = new ResizeObserver(scheduleSync);
	resizeObserver.observe(options.root);
	for (const item of options.root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) {
		resizeObserver.observe(item);
	}
	cleanups.push(() => {
		resizeObserver?.disconnect();
		resizeObserver = null;
	});

	mutationObserver = new MutationObserver(() => {
		// During tab animation, React may re-render and reset data-state — override it
		if (animPhase) {
			enforceAnimStates();
			return;
		}
		if (!resizeObserver) return;
		resizeObserver.disconnect();
		resizeObserver.observe(options.root);
		for (const item of options.root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) {
			resizeObserver.observe(item);
		}
		sync(false);
	});
	mutationObserver.observe(options.root, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ["data-menu-id", "data-state"],
	});
	cleanups.push(() => {
		mutationObserver?.disconnect();
		mutationObserver = null;
	});

	sync(true);

	return {
		sync,
		destroy() {
			cancelAnimationFrame(rafId);
			if (currentAnimation) {
				currentAnimation.cancel();
				currentAnimation = null;
			}
			for (const cleanup of cleanups) cleanup();
			cleanups.length = 0;
		},
	};
}
