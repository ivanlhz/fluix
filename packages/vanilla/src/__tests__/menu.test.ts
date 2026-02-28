/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createMenu } from "../menu";

beforeAll(() => {
	// jsdom doesn't include ResizeObserver or MutationObserver fully
	if (typeof globalThis.ResizeObserver === "undefined") {
		globalThis.ResizeObserver = class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as any;
	}
});

describe("createMenu (Vanilla)", () => {
	let container: HTMLDivElement;

	afterEach(() => {
		container?.remove();
	});

	function setup(opts?: Parameters<typeof createMenu>[1]) {
		container = document.createElement("div");
		document.body.appendChild(container);
		return createMenu(container, {
			items: [
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
				{ id: "c", label: "C" },
			],
			...opts,
		});
	}

	it("creates nav element with data-fluix-menu", () => {
		const menu = setup();
		const nav = container.querySelector("[data-fluix-menu]");
		expect(nav).not.toBeNull();
		expect(nav?.tagName).toBe("NAV");
		menu.destroy();
	});

	it("creates item buttons with correct data attributes", () => {
		const menu = setup({ activeId: "a" });
		const items = container.querySelectorAll("[data-fluix-menu-item]");
		expect(items).toHaveLength(3);

		const first = items[0] as HTMLButtonElement;
		expect(first.getAttribute("data-menu-id")).toBe("a");
		expect(first.getAttribute("data-state")).toBe("active");
		expect(first.textContent).toBe("A");

		const second = items[1] as HTMLButtonElement;
		expect(second.getAttribute("data-state")).toBe("inactive");
		menu.destroy();
	});

	it("creates SVG with two rects for pill variant (ghost + indicator)", () => {
		const menu = setup({ variant: "pill" });
		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();

		const gGroup = svg?.querySelector("g[filter]");
		expect(gGroup).not.toBeNull();

		const rects = gGroup?.querySelectorAll("rect");
		expect(rects?.length).toBe(2);
		menu.destroy();
	});

	it("creates SVG with path for tab variant", () => {
		const menu = setup({ variant: "tab" });
		const svg = container.querySelector("svg");
		const path = svg?.querySelector("path");
		expect(path).not.toBeNull();

		// Tab variant should not have a gooey filter group
		const gGroup = svg?.querySelector("g[filter]");
		expect(gGroup).toBeNull();
		menu.destroy();
	});

	it("setActive updates item data-state attributes", () => {
		const menu = setup({ activeId: "a" });
		menu.setActive("b");

		const items = container.querySelectorAll("[data-fluix-menu-item]");
		expect((items[0] as HTMLElement).getAttribute("data-state")).toBe("inactive");
		expect((items[1] as HTMLElement).getAttribute("data-state")).toBe("active");
		menu.destroy();
	});

	it("destroy removes the nav from the DOM", () => {
		const menu = setup();
		expect(container.querySelector("nav")).not.toBeNull();
		menu.destroy();
		expect(container.querySelector("nav")).toBeNull();
	});

	it("fires onActiveChange when clicking an item", () => {
		const onChange = vi.fn();
		const menu = setup({ onActiveChange: onChange });

		const items = container.querySelectorAll("[data-fluix-menu-item]");
		(items[1] as HTMLButtonElement).click();

		expect(onChange).toHaveBeenCalledWith("b");
		menu.destroy();
	});

	it("sets orientation data attribute", () => {
		const menu = setup({ orientation: "horizontal" });
		const nav = container.querySelector("[data-fluix-menu]");
		expect(nav?.getAttribute("data-orientation")).toBe("horizontal");
		menu.destroy();
	});

	it("creates gooey SVG filter for pill variant", () => {
		const menu = setup({ variant: "pill" });
		const filter = container.querySelector("filter");
		expect(filter).not.toBeNull();
		expect(filter?.querySelector("feGaussianBlur")).not.toBeNull();
		expect(filter?.querySelector("feColorMatrix")).not.toBeNull();
		expect(filter?.querySelector("feComposite")).not.toBeNull();
		menu.destroy();
	});
});
