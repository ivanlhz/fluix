import { FLUIX_SPRING, type SpringConfig } from "../../primitives/spring";
import type { MenuOrientation, MenuVariant } from "./menu.types";

export interface MenuConnectOptions {
	root: HTMLElement;
	indicator: SVGRectElement | SVGPathElement;
	getActiveId(): string | null;
	onSelect?(id: string): void;
	spring?: SpringConfig;
	padding?: number;
	variant?: MenuVariant;
	orientation?: MenuOrientation;
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
	orientation?: MenuOrientation,
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
		if (orientation === "horizontal") {
			// Horizontal tab: extend height downward to the root bottom edge.
			// The root's padding-bottom controls how far below the items
			// the indicator reaches (and where it meets the content area).
			const extendedHeight = rootRect.height - y + 1; // +1 to avoid sub-pixel gap
			return {
				x,
				y,
				width,
				height: extendedHeight,
				radius: height / 2, // use original item height for top pill arc
				visible: width > 0 && height > 0,
			};
		}
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

/**
 * Generate an SVG path for the horizontal tab shape (rotated 90° from vertical):
 * - Rounded top (pill arc at top-left, top-right)
 * - Flat bottom edge (flush with content boundary)
 * - Concave curves at bottom-left and bottom-right corners
 */
function generateHorizontalTabPath(frame: IndicatorFrame, cr: number): string {
	const { x, y, width, height } = frame;
	const r = Math.min(frame.radius, width / 2, height / 2);
	const bottom = y + height; // bottom edge

	// Allow concave curves as long as there's enough vertical space below the top arcs
	const concaveR = Math.min(cr, width / 2, Math.max(0, height - r));

	return [
		// Start at top-left, after the rounded corner
		`M ${x} ${y + r}`,
		// Arc from left edge to top edge (top-left rounded corner)
		`A ${r} ${r} 0 0 1 ${x + r} ${y}`,
		// Top edge to top-right corner
		`L ${x + width - r} ${y}`,
		// Arc from top edge to right edge (top-right rounded corner)
		`A ${r} ${r} 0 0 1 ${x + width} ${y + r}`,
		// Right edge down to bottom-right concave
		`L ${x + width} ${bottom - concaveR}`,
		// Concave curve at bottom-right (curves outward)
		`Q ${x + width} ${bottom} ${x + width + concaveR} ${bottom}`,
		// Flat bottom edge (off to the right, then back to the left)
		`L ${x - concaveR} ${bottom}`,
		// Concave curve at bottom-left (curves outward)
		`Q ${x} ${bottom} ${x} ${bottom - concaveR}`,
		// Left edge back up
		`L ${x} ${y + r}`,
		"Z",
	].join(" ");
}

function applyFrame(indicator: SVGRectElement | SVGPathElement, frame: IndicatorFrame, variant?: MenuVariant, orientation?: MenuOrientation) {
	if (variant === "tab") {
		const path = indicator as SVGPathElement;
		const generator = orientation === "horizontal" ? generateHorizontalTabPath : generateTabPath;
		path.setAttribute("d", generator(frame, TAB_CURVE_RADIUS));
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
 * Enter-only animation: expands the tab from the right edge to the target position.
 * Used for the initial appearance (invisible → visible).
 */
function animateTabEnter(
	path: SVGPathElement,
	from: IndicatorFrame,
	to: IndicatorFrame,
	cr: number,
	spring: Required<SpringConfig>,
): AnimationHandle {
	const rightEdge = from.x + from.width;
	const samples = simulateSpringValues(spring);
	const count = samples.length;
	const durationMs = (count / 120) * 1000;
	const startTime = performance.now();
	let cancelled = false;

	const handle: AnimationHandle = {
		onfinish: null,
		cancel() { cancelled = true; },
	};

	function tick() {
		if (cancelled) return;
		const elapsed = performance.now() - startTime;
		const progress = Math.min(elapsed / durationMs, 1);
		const idx = Math.min(Math.floor(progress * (count - 1)), count - 1);
		const t = samples[idx];

		const frame: IndicatorFrame = {
			x: lerp(rightEdge, to.x, t),
			y: to.y,
			width: lerp(0, to.width, t),
			height: to.height,
			radius: to.radius,
			visible: true,
		};

		path.setAttribute("d", generateTabPath(frame, cr));

		if (progress < 1) {
			requestAnimationFrame(tick);
		} else {
			handle.onfinish?.();
		}
	}

	requestAnimationFrame(tick);
	return handle;
}

/**
 * Enter-only animation for horizontal tab: expands upward from the bottom edge.
 */
function animateHorizontalTabEnter(
	path: SVGPathElement,
	from: IndicatorFrame,
	to: IndicatorFrame,
	cr: number,
	spring: Required<SpringConfig>,
): AnimationHandle {
	const bottomEdge = from.y + from.height;
	const samples = simulateSpringValues(spring);
	const count = samples.length;
	const durationMs = (count / 120) * 1000;
	const startTime = performance.now();
	let cancelled = false;

	const handle: AnimationHandle = {
		onfinish: null,
		cancel() { cancelled = true; },
	};

	function tick() {
		if (cancelled) return;
		const elapsed = performance.now() - startTime;
		const progress = Math.min(elapsed / durationMs, 1);
		const idx = Math.min(Math.floor(progress * (count - 1)), count - 1);
		const t = samples[idx];

		const frame: IndicatorFrame = {
			x: to.x,
			y: lerp(bottomEdge, to.y, t),
			width: to.width,
			height: lerp(0, to.height, t),
			radius: to.radius,
			visible: true,
		};

		path.setAttribute("d", generateHorizontalTabPath(frame, cr));

		if (progress < 1) {
			requestAnimationFrame(tick);
		} else {
			handle.onfinish?.();
		}
	}

	requestAnimationFrame(tick);
	return handle;
}

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

/**
 * Two-phase horizontal tab animation:
 *
 * Phase 1 (exit  ~130 ms):  Collapse downward to the bottom edge.
 * Phase 2 (enter ~spring):  Expand upward from the bottom at the new X.
 */
function animateHorizontalTabIndicator(
	path: SVGPathElement,
	from: IndicatorFrame,
	to: IndicatorFrame,
	cr: number,
	spring: Required<SpringConfig>,
	onEnterStart?: () => void,
): AnimationHandle {
	const bottomEdge = from.y + from.height;

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
			// ── Phase 1: exit (collapse downward to bottom edge) ──
			const t = easeOutCubic(elapsed / EXIT_MS);
			frame = {
				x: from.x,
				y: lerp(from.y, bottomEdge, t),
				width: from.width,
				height: lerp(from.height, 0, t),
				radius: from.radius,
				visible: true,
			};
		} else {
			if (!enteredPhase2) {
				enteredPhase2 = true;
				onEnterStart?.();
			}
			// ── Phase 2: enter (expand upward from bottom at new X) ──
			const phaseElapsed = elapsed - EXIT_MS;
			const phaseProgress = Math.min(phaseElapsed / enterMs, 1);
			const idx = Math.min(
				Math.floor(phaseProgress * (enterCount - 1)),
				enterCount - 1,
			);
			const t = enterSamples[idx];
			frame = {
				x: to.x,
				y: lerp(bottomEdge, to.y, t),
				width: to.width,
				height: lerp(0, to.height, t),
				radius: to.radius,
				visible: true,
			};
		}

		path.setAttribute("d", generateHorizontalTabPath(frame, cr));

		if (elapsed < totalMs) {
			requestAnimationFrame(tick);
		} else {
			handle.onfinish?.();
		}
	}

	requestAnimationFrame(tick);
	return handle;
}

const STRETCH_MS = 150;

/**
 * Pill morph animation — single rect, two phases:
 *
 * Phase 1 (stretch ~150ms easeOut): rect expands to cover both old and new positions.
 * Phase 2 (contract ~spring):       rect contracts from the stretched shape to the new position.
 */
function animatePillMorph(
	rect: SVGRectElement,
	from: IndicatorFrame,
	to: IndicatorFrame,
	spring: Required<SpringConfig>,
): AnimationHandle {
	const stretchedX = Math.min(from.x, to.x);
	const stretchedRight = Math.max(from.x + from.width, to.x + to.width);
	const stretchedWidth = stretchedRight - stretchedX;

	const contractSamples = simulateSpringValues({
		stiffness: spring.stiffness * 2.5,
		damping: spring.damping * 1.6,
		mass: spring.mass,
	});
	const contractCount = contractSamples.length;
	const contractMs = (contractCount / 120) * 1000;
	const totalMs = STRETCH_MS + contractMs;

	const startTime = performance.now();
	let cancelled = false;

	const handle: AnimationHandle = {
		onfinish: null,
		cancel() { cancelled = true; },
	};

	function applyRect(x: number, y: number, w: number, h: number, r: number) {
		rect.setAttribute("x", String(x));
		rect.setAttribute("y", String(y));
		rect.setAttribute("width", String(w));
		rect.setAttribute("height", String(h));
		rect.setAttribute("rx", String(r));
		rect.setAttribute("ry", String(r));
	}

	function tick() {
		if (cancelled) return;
		const elapsed = performance.now() - startTime;

		if (elapsed < STRETCH_MS) {
			const t = easeOutCubic(elapsed / STRETCH_MS);
			applyRect(
				lerp(from.x, stretchedX, t),
				lerp(from.y, to.y, t),
				lerp(from.width, stretchedWidth, t),
				lerp(from.height, to.height, t),
				lerp(from.radius, to.radius, t),
			);
		} else {
			const phaseElapsed = elapsed - STRETCH_MS;
			const phaseProgress = Math.min(phaseElapsed / contractMs, 1);
			const idx = Math.min(Math.floor(phaseProgress * (contractCount - 1)), contractCount - 1);
			const t = contractSamples[idx];
			applyRect(
				lerp(stretchedX, to.x, t),
				to.y,
				lerp(stretchedWidth, to.width, t),
				to.height,
				to.radius,
			);
		}

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
	const orientation = options.orientation;
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
		if (el && el.dataset["state"] !== state) {
			el.dataset["state"] = state;
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

	function apply(frame: IndicatorFrame) {
		applyFrame(options.indicator, frame, variant, orientation);
	}

	const updateIndicator = (immediate = false) => {
		const activeId = options.getActiveId();
		const nextFrame = activeId ? readItemFrame(options.root, activeId, padding, variant, orientation) : null;
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
			apply(fallbackFrame);
			return;
		}
		if (frameEquals(lastFrame, fallbackFrame)) return;

		if (currentAnimation) {
			currentAnimation.cancel();
			currentAnimation = null;
			clearAnimState();
		}

		// For tab variant, first appearance (invisible→visible) plays the enter animation
		if (variant === "tab" && !immediate && fallbackFrame.visible && !lastFrame.visible) {
			const to = fallbackFrame;
			lastFrame = to;
			previousActiveId = activeId;
			const isHorizontal = orientation === "horizontal";

			// Build a collapsed frame at the edge to animate from
			const collapsedFrom: IndicatorFrame = isHorizontal
				? {
					x: to.x,
					y: to.y + to.height, // bottom edge
					width: to.width,
					height: 0,
					radius: to.radius,
					visible: true,
				}
				: {
					x: to.x + to.width, // right edge
					y: to.y,
					width: 0,
					height: to.height,
					radius: to.radius,
					visible: true,
				};

			// First appearance — no old item to manage, let React handle data-state naturally
			(options.indicator as SVGPathElement).setAttribute("opacity", "1");

			const springConfig = { stiffness: spring.stiffness ?? 170, damping: spring.damping ?? 18, mass: spring.mass ?? 1 };
			const enterAnim = isHorizontal
				? animateHorizontalTabEnter(
					options.indicator as SVGPathElement,
					collapsedFrom,
					to,
					TAB_CURVE_RADIUS,
					springConfig,
				)
				: animateTabEnter(
					options.indicator as SVGPathElement,
					collapsedFrom,
					to,
					TAB_CURVE_RADIUS,
					springConfig,
				);

			currentAnimation = enterAnim;
			enterAnim.onfinish = () => {
				currentAnimation = null;
				// Re-read frame to absorb any font-weight layout shifts
				const settledId = options.getActiveId();
				const settled = settledId ? readItemFrame(options.root, settledId, padding, variant, orientation) : null;
				if (settled) {
					lastFrame = settled;
					apply(settled);
				} else {
					apply(to);
				}
			};
			return;
		}

		if (immediate || !fallbackFrame.visible || !lastFrame.visible) {
			lastFrame = fallbackFrame;
			previousActiveId = activeId;
			apply(fallbackFrame);
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

			const springConfig = { stiffness: spring.stiffness ?? 170, damping: spring.damping ?? 18, mass: spring.mass ?? 1 };
			const onEnterStart = () => {
				// Enter phase started — flip data-state
				animPhase = "enter";
				enforceAnimStates();
			};

			animation = orientation === "horizontal"
				? animateHorizontalTabIndicator(
					options.indicator as SVGPathElement,
					from,
					to,
					TAB_CURVE_RADIUS,
					springConfig,
					onEnterStart,
				)
				: animateTabIndicator(
					options.indicator as SVGPathElement,
					from,
					to,
					TAB_CURVE_RADIUS,
					springConfig,
					onEnterStart,
				);
		} else {
			animation = animatePillMorph(
				options.indicator as SVGRectElement,
				from,
				to,
				{ stiffness: spring.stiffness ?? 170, damping: spring.damping ?? 18, mass: spring.mass ?? 1 },
			);
		}

		if (!animation) {
			apply(to);
			return;
		}

		currentAnimation = animation;
		animation.onfinish = () => {
			currentAnimation = null;
			// Ensure final data-state is correct and release control
			if (variant === "tab") {
				if (newActiveId) setItemState(newActiveId, "active");
				if (oldActiveId && oldActiveId !== newActiveId) setItemState(oldActiveId, "inactive");
				clearAnimState();
			}
			// Re-read frame after data-state change to absorb font-weight layout shifts.
			// Without this, the width change from font-weight 500→650 causes readItemFrame
			// to return a different frame, triggering an infinite animation loop.
			const settledId = options.getActiveId();
			const settled = settledId ? readItemFrame(options.root, settledId, padding, variant, orientation) : null;
			if (settled) {
				lastFrame = settled;
				apply(settled);
			} else {
				apply(to);
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
		if (!item || item.dataset["disabled"] === "true") return;
		const id = item.dataset["menuId"];
		if (!id) return;
		options.onSelect(id);
	};

	options.root.addEventListener("click", handleClick);
	cleanups.push(() => options.root.removeEventListener("click", handleClick));

	const scheduleSync = () => {
		// During tab animation, font-weight changes cause item resize which would
		// cancel the running animation and restart it in an infinite loop.
		// Skip resize-triggered syncs while animating — onfinish re-reads the frame.
		if (animPhase) return;
		sync(false);
	};
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
