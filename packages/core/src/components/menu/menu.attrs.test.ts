import { describe, expect, it } from "vitest";
import { getMenuAttrs } from "./menu.attrs";

describe("getMenuAttrs", () => {
	it("root attrs include orientation", () => {
		const attrs = getMenuAttrs({ orientation: "horizontal" });
		expect(attrs.root["data-fluix-menu"]).toBe("");
		expect(attrs.root["data-orientation"]).toBe("horizontal");
	});

	it("root attrs include theme when provided", () => {
		const attrs = getMenuAttrs({ orientation: "vertical", theme: "dark" });
		expect(attrs.root["data-theme"]).toBe("dark");
	});

	it("root attrs omit theme when not provided", () => {
		const attrs = getMenuAttrs({ orientation: "vertical" });
		expect(attrs.root["data-theme"]).toBeUndefined();
	});

	it("root attrs include variant when provided", () => {
		const attrs = getMenuAttrs({ orientation: "horizontal", variant: "pill" });
		expect(attrs.root["data-variant"]).toBe("pill");
	});

	it("list attrs are static", () => {
		const attrs = getMenuAttrs({ orientation: "vertical" });
		expect(attrs.list).toEqual({ "data-fluix-menu-list": "" });
	});

	it("canvas attrs are static", () => {
		const attrs = getMenuAttrs({ orientation: "vertical" });
		expect(attrs.canvas).toEqual({ "data-fluix-menu-canvas": "" });
	});

	it("indicator attrs are static", () => {
		const attrs = getMenuAttrs({ orientation: "vertical" });
		expect(attrs.indicator).toEqual({ "data-fluix-menu-indicator": "" });
	});

	it("item attrs for active item", () => {
		const attrs = getMenuAttrs({ orientation: "vertical" });
		const item = attrs.item({ id: "tab-1", active: true });
		expect(item["data-fluix-menu-item"]).toBe("");
		expect(item["data-menu-id"]).toBe("tab-1");
		expect(item["data-state"]).toBe("active");
		expect(item["data-disabled"]).toBeUndefined();
	});

	it("item attrs for inactive item", () => {
		const attrs = getMenuAttrs({ orientation: "vertical" });
		const item = attrs.item({ id: "tab-2", active: false });
		expect(item["data-state"]).toBe("inactive");
	});

	it("item attrs for disabled item", () => {
		const attrs = getMenuAttrs({ orientation: "vertical" });
		const item = attrs.item({ id: "tab-3", active: false, disabled: true });
		expect(item["data-disabled"]).toBe("true");
	});
});
