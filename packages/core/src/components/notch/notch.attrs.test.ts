import { describe, expect, it } from "vitest";
import { getNotchAttrs } from "./notch.attrs";

describe("getNotchAttrs", () => {
	it("root attrs when closed", () => {
		const attrs = getNotchAttrs({ open: false, position: "top-center" });
		expect(attrs.root["data-fluix-notch"]).toBe("");
		expect(attrs.root["data-open"]).toBe("false");
		expect(attrs.root["data-position"]).toBe("top-center");
	});

	it("root attrs when open", () => {
		const attrs = getNotchAttrs({ open: true, position: "top-center" });
		expect(attrs.root["data-open"]).toBe("true");
	});

	it("root attrs include theme when provided", () => {
		const attrs = getNotchAttrs({ open: false, position: "top-center", theme: "dark" });
		expect(attrs.root["data-theme"]).toBe("dark");
	});

	it("root attrs omit theme when not provided", () => {
		const attrs = getNotchAttrs({ open: false, position: "top-center" });
		expect(attrs.root["data-theme"]).toBeUndefined();
	});

	it("canvas attrs are static", () => {
		const attrs = getNotchAttrs({ open: false, position: "top-center" });
		expect(attrs.canvas).toEqual({ "data-fluix-notch-canvas": "" });
	});

	it("pill attrs are static", () => {
		const attrs = getNotchAttrs({ open: false, position: "top-center" });
		expect(attrs.pill).toEqual({ "data-fluix-notch-pill": "" });
	});

	it("content attrs reflect open state", () => {
		const closed = getNotchAttrs({ open: false, position: "top-center" });
		expect(closed.content["data-fluix-notch-content"]).toBe("");
		expect(closed.content["data-open"]).toBe("false");

		const opened = getNotchAttrs({ open: true, position: "top-center" });
		expect(opened.content["data-open"]).toBe("true");
	});

	it("different positions are reflected", () => {
		const attrs = getNotchAttrs({ open: false, position: "bottom-center" });
		expect(attrs.root["data-position"]).toBe("bottom-center");
	});
});
