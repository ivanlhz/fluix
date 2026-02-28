import { h, isVNode, type VNode } from "vue";
import type { FluixToastItem } from "@fluix-ui/core";

const ICON_ATTRS = {
	width: "14",
	height: "14",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": "2.5",
	"stroke-linecap": "round",
	"stroke-linejoin": "round",
	"aria-hidden": "true",
};

export function renderIcon(icon: unknown, state: FluixToastItem["state"]): VNode | null {
	if (icon != null) {
		if (isVNode(icon)) return icon;
		return h("span", { "aria-hidden": "true" }, String(icon));
	}

	switch (state) {
		case "success":
			return h("svg", ICON_ATTRS, [h("polyline", { points: "20 6 9 17 4 12" })]);
		case "error":
			return h("svg", ICON_ATTRS, [
				h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
				h("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
			]);
		case "warning":
			return h("svg", ICON_ATTRS, [
				h("path", {
					d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
				}),
				h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
				h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" }),
			]);
		case "info":
			return h("svg", ICON_ATTRS, [
				h("circle", { cx: "12", cy: "12", r: "10" }),
				h("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
				h("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" }),
			]);
		case "loading":
			return h("svg", { ...ICON_ATTRS, "data-fluix-icon": "spin" }, [
				h("line", { x1: "12", y1: "2", x2: "12", y2: "6" }),
				h("line", { x1: "12", y1: "18", x2: "12", y2: "22" }),
				h("line", { x1: "4.93", y1: "4.93", x2: "7.76", y2: "7.76" }),
				h("line", { x1: "16.24", y1: "16.24", x2: "19.07", y2: "19.07" }),
				h("line", { x1: "2", y1: "12", x2: "6", y2: "12" }),
				h("line", { x1: "18", y1: "12", x2: "22", y2: "12" }),
				h("line", { x1: "4.93", y1: "19.07", x2: "7.76", y2: "16.24" }),
				h("line", { x1: "16.24", y1: "7.76", x2: "19.07", y2: "4.93" }),
			]);
		case "action":
			return h("svg", ICON_ATTRS, [
				h("circle", { cx: "12", cy: "12", r: "10" }),
				h("polygon", { points: "10 8 16 12 10 16 10 8", fill: "currentColor", stroke: "none" }),
			]);
		default:
			return null;
	}
}
