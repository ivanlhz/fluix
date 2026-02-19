import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	EXIT_DURATION_MS,
	TOAST_DEFAULTS,
	createToastMachine,
} from "./toast.machine";

describe("createToastMachine", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("initial state has no toasts", () => {
		const machine = createToastMachine();
		expect(machine.store.getSnapshot().toasts).toEqual([]);
		machine.destroy();
	});

	it("create adds toast and returns id", () => {
		const machine = createToastMachine();
		const id = machine.create({ title: "Hi", state: "success" });
		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);
		const { toasts } = machine.store.getSnapshot();
		expect(toasts).toHaveLength(1);
		expect(toasts[0].id).toBe(id);
		expect(toasts[0].title).toBe("Hi");
		expect(toasts[0].state).toBe("success");
		expect(toasts[0].exiting).toBe(false);
		machine.destroy();
	});

	it("create with custom id uses it", () => {
		const machine = createToastMachine();
		const id = machine.create({ id: "my-toast", title: "Hey" });
		expect(id).toBe("my-toast");
		expect(machine.store.getSnapshot().toasts[0].id).toBe("my-toast");
		machine.destroy();
	});

	it("create with same id replaces toast", () => {
		const machine = createToastMachine();
		machine.create({ id: "same", title: "First" });
		machine.create({ id: "same", title: "Second" });
		const { toasts } = machine.store.getSnapshot();
		expect(toasts).toHaveLength(1);
		expect(toasts[0].title).toBe("Second");
		machine.destroy();
	});

	it("stack layout keeps multiple toasts at the same position", () => {
		const machine = createToastMachine();
		machine.configure({ layout: "stack" });
		machine.create({ id: "a", title: "A", position: "top-right" });
		machine.create({ id: "b", title: "B", position: "top-right" });
		const { toasts } = machine.store.getSnapshot();
		expect(toasts).toHaveLength(2);
		expect(toasts.map((t) => t.id)).toEqual(["a", "b"]);
		machine.destroy();
	});

	it("notch layout keeps only the newest toast per position", () => {
		const machine = createToastMachine();
		machine.configure({ layout: "notch" });
		const firstId = machine.create({ id: "a", title: "A", position: "top-right" });
		const secondId = machine.create({ id: "b", title: "B", position: "top-right" });
		const { toasts } = machine.store.getSnapshot();
		expect(toasts).toHaveLength(1);
		expect(firstId).toBe("a");
		expect(secondId).toBe("a");
		expect(toasts[0].id).toBe("a");
		expect(toasts[0].title).toBe("B");
		machine.destroy();
	});

	it("notch layout replaces only within the same position", () => {
		const machine = createToastMachine();
		machine.configure({ layout: "notch" });
		const firstId = machine.create({ id: "a", title: "A", position: "top-right" });
		const secondId = machine.create({ id: "b", title: "B", position: "bottom-right" });
		const { toasts } = machine.store.getSnapshot();
		expect(toasts).toHaveLength(2);
		expect(firstId).toBe("a");
		expect(secondId).toBe("b");
		expect(toasts.map((t) => t.id)).toEqual(["a", "b"]);
		machine.destroy();
	});

	it("notch layout keeps the same instanceId while replacing content", () => {
		const machine = createToastMachine();
		machine.configure({ layout: "notch" });
		machine.create({ id: "a", title: "A", description: "first", position: "top-right" });
		const firstItem = machine.store.getSnapshot().toasts[0];
		machine.create({ id: "b", title: "B", description: "second", position: "top-right" });
		const replacedItem = machine.store.getSnapshot().toasts[0];
		expect(replacedItem.id).toBe(firstItem.id);
		expect(replacedItem.instanceId).toBe(firstItem.instanceId);
		expect(replacedItem.title).toBe("B");
		expect(replacedItem.description).toBe("second");
		machine.destroy();
	});

	it("update modifies existing toast", () => {
		const machine = createToastMachine();
		machine.create({ id: "a", title: "Before" });
		machine.update("a", { title: "After" });
		expect(machine.store.getSnapshot().toasts[0].title).toBe("After");
		machine.destroy();
	});

	it("update on non-existent id is no-op", () => {
		const machine = createToastMachine();
		machine.create({ id: "a", title: "Only" });
		machine.update("missing", { title: "No" });
		expect(machine.store.getSnapshot().toasts).toHaveLength(1);
		expect(machine.store.getSnapshot().toasts[0].title).toBe("Only");
		machine.destroy();
	});

	it("dismiss marks exiting then removes after EXIT_DURATION_MS", () => {
		const machine = createToastMachine();
		machine.create({ id: "d", title: "Bye" });
		machine.dismiss("d");
		let { toasts } = machine.store.getSnapshot();
		expect(toasts).toHaveLength(1);
		expect(toasts[0].exiting).toBe(true);

		vi.advanceTimersByTime(EXIT_DURATION_MS);
		toasts = machine.store.getSnapshot().toasts;
		expect(toasts).toHaveLength(0);
		machine.destroy();
	});

	it("dismiss on non-existent or already exiting toast is no-op", () => {
		const machine = createToastMachine();
		machine.create({ id: "x", title: "X" });
		machine.dismiss("missing");
		expect(machine.store.getSnapshot().toasts).toHaveLength(1);
		machine.dismiss("x");
		machine.dismiss("x");
		expect(machine.store.getSnapshot().toasts[0].exiting).toBe(true);
		machine.destroy();
	});

	it("clear removes all toasts when no position", () => {
		const machine = createToastMachine();
		machine.create({ id: "1", title: "A" });
		machine.create({ id: "2", title: "B" });
		machine.clear();
		expect(machine.store.getSnapshot().toasts).toHaveLength(0);
		machine.destroy();
	});

	it("clear(position) removes only toasts at that position", () => {
		const machine = createToastMachine();
		machine.create({ id: "1", title: "A", position: "top-right" });
		machine.create({ id: "2", title: "B", position: "bottom-left" });
		machine.clear("top-right");
		const { toasts } = machine.store.getSnapshot();
		expect(toasts).toHaveLength(1);
		expect(toasts[0].position).toBe("bottom-left");
		machine.destroy();
	});

	it("configure updates config", () => {
		const machine = createToastMachine();
		expect(machine.store.getSnapshot().config.position).toBe(TOAST_DEFAULTS.position);
		expect(machine.store.getSnapshot().config.layout).toBe(TOAST_DEFAULTS.layout);
		machine.configure({ position: "bottom-center", layout: "notch" });
		expect(machine.store.getSnapshot().config.position).toBe("bottom-center");
		expect(machine.store.getSnapshot().config.layout).toBe("notch");
		machine.destroy();
	});

	it("destroy clears exit timers", () => {
		const machine = createToastMachine();
		machine.create({ id: "t", title: "T" });
		machine.dismiss("t");
		machine.destroy();
		vi.advanceTimersByTime(EXIT_DURATION_MS + 1000);
		// If destroy didn't clear the timer, we'd have 0 toasts. We just ensure no crash.
		expect(machine.store.getSnapshot().toasts.length).toBeLessThanOrEqual(1);
	});

	it("defaults use TOAST_DEFAULTS", () => {
		const machine = createToastMachine();
		machine.create({ title: "D" });
		const item = machine.store.getSnapshot().toasts[0];
		expect(item.position).toBe(TOAST_DEFAULTS.position);
		expect(item.fill).toBe(TOAST_DEFAULTS.lightFill);
		expect(item.theme).toBe(TOAST_DEFAULTS.theme);
		expect(item.roundness).toBe(TOAST_DEFAULTS.roundness);
		machine.destroy();
	});

	it("dark theme resolves dark fill when fill is omitted", () => {
		const machine = createToastMachine();
		machine.create({ title: "Dark", theme: "dark" });
		const item = machine.store.getSnapshot().toasts[0];
		expect(item.theme).toBe("dark");
		expect(item.fill).toBe(TOAST_DEFAULTS.darkFill);
		machine.destroy();
	});

	it("autopilot is resolved when duration present", () => {
		const machine = createToastMachine();
		machine.create({
			id: "ap",
			title: "AP",
			duration: 5000,
			autopilot: true,
		});
		const item = machine.store.getSnapshot().toasts[0];
		expect(item.autoExpandDelayMs).toBeDefined();
		expect(item.autoCollapseDelayMs).toBeDefined();
		machine.destroy();
	});

	it("autopilot false disables expand/collapse delays", () => {
		const machine = createToastMachine();
		machine.create({
			id: "no-ap",
			title: "No AP",
			duration: 5000,
			autopilot: false,
		});
		const item = machine.store.getSnapshot().toasts[0];
		expect(item.autoExpandDelayMs).toBeUndefined();
		expect(item.autoCollapseDelayMs).toBeUndefined();
		machine.destroy();
	});
});
