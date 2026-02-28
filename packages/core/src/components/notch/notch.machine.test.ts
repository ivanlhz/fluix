import { describe, expect, it, vi } from "vitest";
import { NOTCH_DEFAULTS, createNotchMachine } from "./notch.machine";

describe("createNotchMachine", () => {
	it("initial state is closed with default sizes", () => {
		const machine = createNotchMachine();
		const snap = machine.store.getSnapshot();
		expect(snap.open).toBe(false);
		expect(snap.contentSize).toEqual({ w: 0, h: 0 });
		expect(snap.baseSize).toEqual({ w: NOTCH_DEFAULTS.pillMinWidth, h: NOTCH_DEFAULTS.pillHeight });
		machine.destroy();
	});

	it("open() sets open to true", () => {
		const machine = createNotchMachine();
		machine.open();
		expect(machine.store.getSnapshot().open).toBe(true);
		machine.destroy();
	});

	it("open() when already open is a no-op", () => {
		const machine = createNotchMachine();
		machine.open();
		const listener = vi.fn();
		machine.store.subscribe(listener);

		machine.open();
		expect(listener).not.toHaveBeenCalled();
		machine.destroy();
	});

	it("close() sets open to false", () => {
		const machine = createNotchMachine();
		machine.open();
		machine.close();
		expect(machine.store.getSnapshot().open).toBe(false);
		machine.destroy();
	});

	it("close() when already closed is a no-op", () => {
		const machine = createNotchMachine();
		const listener = vi.fn();
		machine.store.subscribe(listener);

		machine.close();
		expect(listener).not.toHaveBeenCalled();
		machine.destroy();
	});

	it("toggle() flips open state", () => {
		const machine = createNotchMachine();
		machine.toggle();
		expect(machine.store.getSnapshot().open).toBe(true);
		machine.toggle();
		expect(machine.store.getSnapshot().open).toBe(false);
		machine.destroy();
	});

	it("setContentSize updates content dimensions", () => {
		const machine = createNotchMachine();
		machine.setContentSize({ w: 300, h: 200 });
		expect(machine.store.getSnapshot().contentSize).toEqual({ w: 300, h: 200 });
		machine.destroy();
	});

	it("setContentSize with same values is a no-op", () => {
		const machine = createNotchMachine();
		machine.setContentSize({ w: 300, h: 200 });
		const listener = vi.fn();
		machine.store.subscribe(listener);

		machine.setContentSize({ w: 300, h: 200 });
		expect(listener).not.toHaveBeenCalled();
		machine.destroy();
	});

	it("setBaseSize updates base pill dimensions", () => {
		const machine = createNotchMachine();
		machine.setBaseSize({ w: 100, h: 50 });
		expect(machine.store.getSnapshot().baseSize).toEqual({ w: 100, h: 50 });
		machine.destroy();
	});

	it("setBaseSize with same values is a no-op", () => {
		const machine = createNotchMachine();
		const defaultBase = machine.store.getSnapshot().baseSize;
		const listener = vi.fn();
		machine.store.subscribe(listener);

		machine.setBaseSize(defaultBase);
		expect(listener).not.toHaveBeenCalled();
		machine.destroy();
	});

	it("configure updates config", () => {
		const machine = createNotchMachine({ position: "top-center" });
		machine.configure({ roundness: 10, trigger: "hover" });

		const { config } = machine.store.getSnapshot();
		expect(config.roundness).toBe(10);
		expect(config.trigger).toBe("hover");
		expect(config.position).toBe("top-center");
		machine.destroy();
	});

	it("configure with same values is a no-op", () => {
		const machine = createNotchMachine({ position: "top-center" });
		const listener = vi.fn();
		machine.store.subscribe(listener);

		machine.configure({ position: "top-center" });
		expect(listener).not.toHaveBeenCalled();
		machine.destroy();
	});
});
