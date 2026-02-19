import { describe, expect, it } from "vitest";
import { FLUIX_SPRING, getDefaultSpringCSS, springKeyframes, springToCSS } from "./spring";

describe("springToCSS", () => {
	it("returns easing string and durationMs", () => {
		const result = springToCSS();
		expect(result).toHaveProperty("easing");
		expect(result).toHaveProperty("durationMs");
		expect(typeof result.easing).toBe("string");
		expect(typeof result.durationMs).toBe("number");
	});

	it("easing starts with linear(", () => {
		const { easing } = springToCSS();
		expect(easing.startsWith("linear(")).toBe(true);
		expect(easing.endsWith(")")).toBe(true);
	});

	it("durationMs is positive and reasonable", () => {
		const { durationMs } = springToCSS();
		expect(durationMs).toBeGreaterThan(0);
		expect(durationMs).toBeLessThanOrEqual(3000);
	});

	it("accepts custom config", () => {
		const result = springToCSS({ stiffness: 200, damping: 20, mass: 1 });
		expect(result.easing).toBeDefined();
		expect(result.durationMs).toBeGreaterThan(0);
	});

	it("stiffer spring yields shorter duration", () => {
		const soft = springToCSS({ stiffness: 50, damping: 10 });
		const stiff = springToCSS({ stiffness: 200, damping: 10 });
		expect(stiff.durationMs).toBeLessThan(soft.durationMs);
	});
});

describe("springKeyframes", () => {
	it("returns keyframes and durationMs", () => {
		const result = springKeyframes(0, 100);
		expect(result).toHaveProperty("keyframes");
		expect(result).toHaveProperty("durationMs");
		expect(Array.isArray(result.keyframes)).toBe(true);
		expect(result.keyframes.length).toBeGreaterThan(1);
	});

	it("first keyframe offset is 0, last is near 1 (downsampling may not include exact 1)", () => {
		const { keyframes } = springKeyframes(0, 100);
		expect(keyframes[0].offset).toBe(0);
		expect(keyframes[keyframes.length - 1].offset).toBeGreaterThanOrEqual(0.9);
	});

	it("keyframes structure and duration", () => {
		const result = springKeyframes(10, 90);
		const { keyframes, durationMs } = result;
		expect(keyframes[0].offset).toBe(0);
		expect(keyframes[keyframes.length - 1].offset).toBeGreaterThanOrEqual(0.9);
		expect(durationMs).toBeGreaterThan(0);
	});

	it("durationMs is positive", () => {
		const { durationMs } = springKeyframes(0, 1);
		expect(durationMs).toBeGreaterThan(0);
	});
});

describe("FLUIX_SPRING", () => {
	it("has stiffness, damping, mass", () => {
		expect(FLUIX_SPRING.stiffness).toBe(170);
		expect(FLUIX_SPRING.damping).toBe(18);
		expect(FLUIX_SPRING.mass).toBe(1);
	});
});

describe("getDefaultSpringCSS", () => {
	it("returns same shape as springToCSS", () => {
		const result = getDefaultSpringCSS();
		expect(result).toHaveProperty("easing");
		expect(result).toHaveProperty("durationMs");
		expect(result.easing.startsWith("linear(")).toBe(true);
	});

	it("is cached (same reference on repeated calls)", () => {
		const a = getDefaultSpringCSS();
		const b = getDefaultSpringCSS();
		expect(a).toBe(b);
	});
});
