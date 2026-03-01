/** SVG icon builders for toast states. */

import type { FluixToastItem } from "@fluix-ui/core";
import { SVG_NS } from "../shared";

type SvgChild = { tag: string; attrs: Record<string, string> };

function el(tag: string, attrs: Record<string, string>): SvgChild { return { tag, attrs }; }
function line(x1: string, y1: string, x2: string, y2: string) { return el("line", { x1, y1, x2, y2 }); }

const ICON_DEFS: Record<string, { spin?: boolean; children: SvgChild[] }> = {
	success: { children: [el("polyline", { points: "20 6 9 17 4 12" })] },
	error: { children: [line("18", "6", "6", "18"), line("6", "6", "18", "18")] },
	warning: { children: [
		el("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }),
		line("12", "9", "12", "13"), line("12", "17", "12.01", "17"),
	] },
	info: { children: [
		el("circle", { cx: "12", cy: "12", r: "10" }),
		line("12", "16", "12", "12"), line("12", "8", "12.01", "8"),
	] },
	loading: { spin: true, children: [
		line("12", "2", "12", "6"), line("12", "18", "12", "22"),
		line("4.93", "4.93", "7.76", "7.76"), line("16.24", "16.24", "19.07", "19.07"),
		line("2", "12", "6", "12"), line("18", "12", "22", "12"),
		line("4.93", "19.07", "7.76", "16.24"), line("16.24", "7.76", "19.07", "4.93"),
	] },
	action: { children: [
		el("circle", { cx: "12", cy: "12", r: "10" }),
		el("polygon", { points: "10 8 16 12 10 16 10 8", fill: "currentColor", stroke: "none" }),
	] },
};

function createSvgIcon(state: FluixToastItem["state"]): SVGSVGElement | null {
	const def = ICON_DEFS[state];
	if (!def) return null;

	const svg = document.createElementNS(SVG_NS, "svg");
	for (const [k, v] of Object.entries({ width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) {
		svg.setAttribute(k, v);
	}
	if (def.spin) svg.setAttribute("data-fluix-icon", "spin");

	for (const child of def.children) {
		const node = document.createElementNS(SVG_NS, child.tag);
		for (const [k, v] of Object.entries(child.attrs)) node.setAttribute(k, v);
		svg.appendChild(node);
	}
	return svg;
}

export function renderIconInto(container: HTMLElement, icon: unknown, state: FluixToastItem["state"]) {
	container.textContent = "";
	if (icon != null) {
		if (icon instanceof HTMLElement || icon instanceof SVGElement) {
			container.appendChild(icon);
		} else {
			const span = document.createElement("span");
			span.setAttribute("aria-hidden", "true");
			span.textContent = String(icon);
			container.appendChild(span);
		}
		return;
	}
	const svgIcon = createSvgIcon(state);
	if (svgIcon) container.appendChild(svgIcon);
}
