/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Menu } from "../menu";

beforeAll(() => {
	if (typeof globalThis.ResizeObserver === "undefined") {
		globalThis.ResizeObserver = class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as any;
	}
});

afterEach(cleanup);

describe("Menu React adapter", () => {
	it("renders a nav with data-fluix-menu attribute", () => {
		const { container } = render(
			<Menu.Root>
				<Menu.Item id="a">A</Menu.Item>
			</Menu.Root>,
		);
		const nav = container.querySelector("[data-fluix-menu]");
		expect(nav).not.toBeNull();
		expect(nav?.tagName).toBe("NAV");
	});

	it("renders items with correct data attributes", () => {
		render(
			<Menu.Root defaultActiveId="a">
				<Menu.Item id="a">A</Menu.Item>
				<Menu.Item id="b">B</Menu.Item>
			</Menu.Root>,
		);

		const btnA = screen.getByText("A");
		const btnB = screen.getByText("B");

		expect(btnA.getAttribute("data-fluix-menu-item")).toBe("");
		expect(btnA.getAttribute("data-menu-id")).toBe("a");
		expect(btnA.getAttribute("data-state")).toBe("active");

		expect(btnB.getAttribute("data-state")).toBe("inactive");
	});

	it("clicking an item changes active state", () => {
		const onChange = vi.fn();
		render(
			<Menu.Root defaultActiveId="a" onActiveChange={onChange}>
				<Menu.Item id="a">A</Menu.Item>
				<Menu.Item id="b">B</Menu.Item>
			</Menu.Root>,
		);

		fireEvent.click(screen.getByText("B"));
		expect(onChange).toHaveBeenCalledWith("b");
	});

	it("renders SVG with indicator rect for pill variant", () => {
		const { container } = render(
			<Menu.Root variant="pill" defaultActiveId="a">
				<Menu.Item id="a">A</Menu.Item>
				<Menu.Indicator />
			</Menu.Root>,
		);

		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();

		// Should have two rects inside the gooey group: ghost + main indicator
		const rects = svg?.querySelectorAll("rect");
		expect(rects?.length).toBeGreaterThanOrEqual(2);
	});

	it("renders SVG with path for tab variant", () => {
		const { container } = render(
			<Menu.Root variant="tab" defaultActiveId="a">
				<Menu.Item id="a">A</Menu.Item>
				<Menu.Indicator />
			</Menu.Root>,
		);

		const svg = container.querySelector("svg");
		const path = svg?.querySelector("path");
		expect(path).not.toBeNull();
	});

	it("disabled item has data-disabled attribute", () => {
		render(
			<Menu.Root>
				<Menu.Item id="a" disabled>A</Menu.Item>
			</Menu.Root>,
		);

		const btn = screen.getByText("A");
		expect(btn.getAttribute("data-disabled")).toBe("true");
		expect((btn as HTMLButtonElement).disabled).toBe(true);
	});

	it("sets orientation data attribute", () => {
		const { container } = render(
			<Menu.Root orientation="horizontal">
				<Menu.Item id="a">A</Menu.Item>
			</Menu.Root>,
		);

		const nav = container.querySelector("[data-fluix-menu]");
		expect(nav?.getAttribute("data-orientation")).toBe("horizontal");
	});
});
