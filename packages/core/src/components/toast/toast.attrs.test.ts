import { describe, expect, it } from "vitest";
import { getToastAttrs, getViewportAttrs } from "./toast.attrs";
import type { FluixToastItem } from "./toast.types";

function makeItem(overrides: Partial<FluixToastItem> = {}): FluixToastItem {
	return {
		id: "test-1",
		instanceId: "inst-1",
		title: "Test",
		state: "success",
		theme: "light",
		position: "top-right",
		duration: 6000,
		exiting: false,
		fill: undefined,
		roundness: 16,
		...overrides,
	};
}

describe("getViewportAttrs", () => {
	it("returns data-fluix-viewport and position", () => {
		const attrs = getViewportAttrs("top-right");
		expect(attrs["data-fluix-viewport"]).toBe("");
		expect(attrs["data-position"]).toBe("top-right");
		expect(attrs["data-layout"]).toBe("stack");
		expect(attrs["aria-live"]).toBe("polite");
		expect(attrs.role).toBe("region");
	});

	it("accepts any FluixPosition", () => {
		expect(getViewportAttrs("bottom-left")["data-position"]).toBe("bottom-left");
		expect(getViewportAttrs("top-center")["data-position"]).toBe("top-center");
	});

	it("supports explicit notch layout", () => {
		expect(getViewportAttrs("top-center", "notch")["data-layout"]).toBe("notch");
	});
});

describe("getToastAttrs", () => {
	it("returns all required attr objects", () => {
		const item = makeItem();
		const attrs = getToastAttrs(item, { ready: true, expanded: false });
		expect(attrs.viewport).toBeDefined();
		expect(attrs.root).toBeDefined();
		expect(attrs.canvas).toBeDefined();
		expect(attrs.header).toBeDefined();
		expect(attrs.badge).toBeDefined();
		expect(attrs.title).toBeDefined();
		expect(attrs.content).toBeDefined();
		expect(attrs.description).toBeDefined();
		expect(attrs.button).toBeDefined();
	});

	it("root has data-state, data-ready, data-expanded, data-exiting, data-edge", () => {
		const item = makeItem({ state: "error", exiting: true });
		const attrs = getToastAttrs(item, { ready: true, expanded: true });
		expect(attrs.root["data-fluix-toast"]).toBe("");
		expect(attrs.root["data-state"]).toBe("error");
		expect(attrs.root["data-ready"]).toBe("true");
		expect(attrs.root["data-expanded"]).toBe("true");
		expect(attrs.root["data-exiting"]).toBe("true");
		expect(attrs.root["data-edge"]).toBeDefined();
		expect(attrs.root["data-position"]).toBeDefined();
	});

	it("top position gives edge bottom", () => {
		const item = makeItem({ position: "top-right" });
		const attrs = getToastAttrs(item, { ready: true, expanded: false });
		expect(attrs.root["data-edge"]).toBe("bottom");
	});

	it("bottom position gives edge top", () => {
		const item = makeItem({ position: "bottom-left" });
		const attrs = getToastAttrs(item, { ready: true, expanded: false });
		expect(attrs.root["data-edge"]).toBe("top");
	});

	it("right position gives data-position right for pill align", () => {
		const item = makeItem({ position: "top-right" });
		const attrs = getToastAttrs(item, { ready: true, expanded: false });
		expect(attrs.root["data-position"]).toBe("right");
	});

	it("left position gives data-position left", () => {
		const item = makeItem({ position: "bottom-left" });
		const attrs = getToastAttrs(item, { ready: true, expanded: false });
		expect(attrs.root["data-position"]).toBe("left");
	});

	it("content data-visible reflects expanded context", () => {
		const item = makeItem();
		const collapsed = getToastAttrs(item, { ready: true, expanded: false });
		const expanded = getToastAttrs(item, { ready: true, expanded: true });
		expect(collapsed.content["data-visible"]).toBe("false");
		expect(expanded.content["data-visible"]).toBe("true");
	});

	it("badge and title carry data-state", () => {
		const item = makeItem({ state: "warning" });
		const attrs = getToastAttrs(item, { ready: true, expanded: false });
		expect(attrs.badge["data-state"]).toBe("warning");
		expect(attrs.title["data-state"]).toBe("warning");
	});
});
