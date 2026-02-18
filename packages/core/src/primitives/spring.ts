/**
 * Spring physics solver.
 *
 * Provides three levels of spring animation:
 * 1. CSS linear() easing — best performance (compositor thread), generated once
 * 2. Web Animations API — programmatic, pre-computed keyframes
 * 3. requestAnimationFrame — manual fallback (not implemented yet, reserved)
 *
 * The spring model is a damped harmonic oscillator:
 *   x'' = -stiffness * (x - target) - damping * x'
 */

export interface SpringConfig {
	/** Spring stiffness. Higher = faster. Default: 100 */
	stiffness?: number;
	/** Damping coefficient. Higher = less oscillation. Default: 10 */
	damping?: number;
	/** Mass of the object. Higher = more inertia. Default: 1 */
	mass?: number;
}

interface SpringState {
	position: number;
	velocity: number;
}

const DEFAULT_CONFIG: Required<SpringConfig> = {
	stiffness: 100,
	damping: 10,
	mass: 1,
};

const SOLVER_STEP = 1 / 120; // 120Hz simulation step (ms precision)
const SETTLE_THRESHOLD = 0.001; // Position + velocity threshold to consider settled
const MAX_DURATION_S = 3; // Safety cap

function resolveConfig(config?: SpringConfig): Required<SpringConfig> {
	return { ...DEFAULT_CONFIG, ...config };
}

/**
 * Simulate spring from 0 to 1 and return an array of [time, value] samples.
 * Used internally by both linearEasing and keyframes generators.
 */
function simulateSpring(config?: SpringConfig): Array<[time: number, value: number]> {
	const { stiffness, damping, mass } = resolveConfig(config);
	const samples: Array<[number, number]> = [];

	let state: SpringState = { position: 0, velocity: 0 };
	let t = 0;

	samples.push([0, 0]);

	while (t < MAX_DURATION_S) {
		// RK4-lite: two half-steps for better accuracy without full RK4 cost
		const dt = SOLVER_STEP;
		const acceleration = (-stiffness * (state.position - 1) - damping * state.velocity) / mass;
		const midVelocity = state.velocity + acceleration * (dt / 2);
		const midPosition = state.position + state.velocity * (dt / 2);
		const midAcceleration = (-stiffness * (midPosition - 1) - damping * midVelocity) / mass;

		state = {
			velocity: state.velocity + midAcceleration * dt,
			position: state.position + midVelocity * dt,
		};
		t += dt;

		samples.push([t, state.position]);

		// Check if settled
		if (
			Math.abs(state.position - 1) < SETTLE_THRESHOLD &&
			Math.abs(state.velocity) < SETTLE_THRESHOLD
		) {
			break;
		}
	}

	// Ensure we end exactly at 1
	samples.push([t, 1]);
	return samples;
}

/**
 * Generate a CSS `linear()` easing string from spring parameters.
 *
 * CSS `linear()` defines an easing as a series of points.
 * We simulate the spring and downsample to ~40-60 points
 * which is enough for smooth visual fidelity.
 *
 * Returns: { easing: string, durationMs: number }
 */
export function springToCSS(config?: SpringConfig): { easing: string; durationMs: number } {
	const samples = simulateSpring(config);
	const totalTime = samples[samples.length - 1][0];
	const durationMs = Math.round(totalTime * 1000);

	// Downsample to ~50 points for reasonable CSS size
	const targetPoints = 50;
	const step = Math.max(1, Math.floor(samples.length / targetPoints));
	const points: string[] = [];

	for (let i = 0; i < samples.length; i += step) {
		const [t, value] = samples[i];
		const pct = (t / totalTime) * 100;
		points.push(`${round(value)} ${round(pct)}%`);
	}

	// Always include the final point
	const last = samples[samples.length - 1];
	const lastPct = (last[0] / totalTime) * 100;
	const lastEntry = `${round(last[1])} ${round(lastPct)}%`;
	if (points[points.length - 1] !== lastEntry) {
		points.push(lastEntry);
	}

	return {
		easing: `linear(${points.join(", ")})`,
		durationMs,
	};
}

/**
 * Generate WAAPI keyframes for animating a property from `from` to `to`
 * with spring physics.
 */
export function springKeyframes(
	from: number,
	to: number,
	config?: SpringConfig,
): { keyframes: Keyframe[]; durationMs: number } {
	const samples = simulateSpring(config);
	const totalTime = samples[samples.length - 1][0];
	const range = to - from;

	// Downsample for WAAPI (fewer frames needed than CSS linear)
	const targetFrames = 30;
	const step = Math.max(1, Math.floor(samples.length / targetFrames));
	const keyframes: Keyframe[] = [];

	for (let i = 0; i < samples.length; i += step) {
		const [t, value] = samples[i];
		keyframes.push({
			offset: t / totalTime,
			// We store the normalized value; caller maps to actual property
			_value: from + value * range,
		} as Keyframe & { _value: number });
	}

	return { keyframes, durationMs: Math.round(totalTime * 1000) };
}

/**
 * Animate an element's CSS properties with spring physics using WAAPI.
 * Returns the Animation object for control (cancel, finish, etc.)
 */
export function animateSpring(
	el: Element,
	properties: Record<string, { from: number; to: number; unit?: string }>,
	config?: SpringConfig,
): Animation | null {
	const samples = simulateSpring(config);
	const totalTime = samples[samples.length - 1][0];
	const durationMs = Math.round(totalTime * 1000);

	// Downsample
	const targetFrames = 40;
	const step = Math.max(1, Math.floor(samples.length / targetFrames));
	const keyframes: Keyframe[] = [];

	for (let i = 0; i < samples.length; i += step) {
		const [t, value] = samples[i];
		const frame: Keyframe = { offset: t / totalTime };
		for (const [prop, { from, to, unit }] of Object.entries(properties)) {
			const v = from + value * (to - from);
			frame[prop] = unit ? `${round(v)}${unit}` : round(v);
		}
		keyframes.push(frame);
	}

	try {
		return el.animate(keyframes, {
			duration: durationMs,
			fill: "forwards",
			easing: "linear", // Easing is baked into the keyframes
		});
	} catch {
		// WAAPI not supported or element not in DOM
		return null;
	}
}

/** Round to 3 decimal places to keep CSS compact */
function round(n: number): number {
	return Math.round(n * 1000) / 1000;
}

/**
 * Pre-computed default spring easing for Fluix.
 * Matches the feel of Sileo's spring (bounce: 0.25, duration: 0.6s).
 */
export const FLUIX_SPRING: Required<SpringConfig> = {
	stiffness: 170,
	damping: 18,
	mass: 1,
};

/** Cached default CSS spring — generated once, reused everywhere */
let cachedDefaultCSS: { easing: string; durationMs: number } | null = null;

export function getDefaultSpringCSS(): { easing: string; durationMs: number } {
	if (!cachedDefaultCSS) {
		cachedDefaultCSS = springToCSS(FLUIX_SPRING);
	}
	return cachedDefaultCSS;
}
