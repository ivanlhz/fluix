import { describe, expect, it, vi } from "vitest";
import { createMenuMachine } from "./menu.machine";

describe("createMenuMachine", () => {
	it("initial state has null activeId", () => {
		const machine = createMenuMachine();
		expect(machine.store.getSnapshot().activeId).toBeNull();
		machine.destroy();
	});

	it("initialActiveId sets the initial active item", () => {
		const machine = createMenuMachine({ initialActiveId: "tab-1" });
		expect(machine.store.getSnapshot().activeId).toBe("tab-1");
		machine.destroy();
	});

	it("setActive changes the active id", () => {
		const machine = createMenuMachine();
		machine.setActive("tab-2");
		expect(machine.store.getSnapshot().activeId).toBe("tab-2");
		machine.destroy();
	});

	it("setActive to null clears the active id", () => {
		const machine = createMenuMachine({ initialActiveId: "tab-1" });
		machine.setActive(null);
		expect(machine.store.getSnapshot().activeId).toBeNull();
		machine.destroy();
	});

	it("setActive with same id does not notify listeners (no-op)", () => {
		const machine = createMenuMachine({ initialActiveId: "tab-1" });
		const listener = vi.fn();
		machine.store.subscribe(listener);

		machine.setActive("tab-1");
		expect(listener).not.toHaveBeenCalled();
		machine.destroy();
	});

	it("setActive with different id notifies listeners", () => {
		const machine = createMenuMachine({ initialActiveId: "tab-1" });
		const listener = vi.fn();
		machine.store.subscribe(listener);

		machine.setActive("tab-2");
		expect(listener).toHaveBeenCalledTimes(1);
		expect(machine.store.getSnapshot().activeId).toBe("tab-2");
		machine.destroy();
	});

	it("configure updates machine config", () => {
		const machine = createMenuMachine({ orientation: "horizontal" });
		machine.configure({ variant: "pill", roundness: 8 });

		const { config } = machine.store.getSnapshot();
		expect(config.variant).toBe("pill");
		expect(config.roundness).toBe(8);
		expect(config.orientation).toBe("horizontal");
		machine.destroy();
	});

	it("configure with same values does not notify (no-op)", () => {
		const machine = createMenuMachine({ orientation: "horizontal", variant: "pill" });
		const listener = vi.fn();
		machine.store.subscribe(listener);

		machine.configure({ orientation: "horizontal", variant: "pill" });
		expect(listener).not.toHaveBeenCalled();
		machine.destroy();
	});

	it("configure merges with existing config", () => {
		const machine = createMenuMachine({ orientation: "horizontal", roundness: 16 });
		machine.configure({ roundness: 8 });

		const { config } = machine.store.getSnapshot();
		expect(config.orientation).toBe("horizontal");
		expect(config.roundness).toBe(8);
		machine.destroy();
	});
});
