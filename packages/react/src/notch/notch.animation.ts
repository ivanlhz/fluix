import { animateSpring, type SpringConfig } from "@fluix-ui/core";
import { useLayoutEffect } from "react";

interface NotchTransient {
	prevW: number;
	prevH: number;
	initialized: boolean;
	currentAnim: Animation | null;
}

export function useNotchAnimation({
	svgRectRef,
	t,
	targetW,
	targetH,
	rootW,
	rootH,
	collapsedW,
	collapsedH,
	roundness,
	springConfig,
}: {
	svgRectRef: React.RefObject<SVGRectElement | null>;
	t: NotchTransient;
	targetW: number;
	targetH: number;
	rootW: number;
	rootH: number;
	collapsedW: number;
	collapsedH: number;
	roundness: number;
	springConfig: SpringConfig;
}) {
	// Init SVG rect to collapsed size
	useLayoutEffect(() => {
		const rect = svgRectRef.current;
		if (!rect || t.initialized) return;

		t.prevW = collapsedW;
		t.prevH = collapsedH;
		t.initialized = true;

		const cx = (rootW - collapsedW) / 2;
		const cy = (rootH - collapsedH) / 2;
		rect.setAttribute("width", String(collapsedW));
		rect.setAttribute("height", String(collapsedH));
		rect.setAttribute("x", String(cx));
		rect.setAttribute("y", String(cy));
		rect.setAttribute("rx", String(collapsedW / 2));
		rect.setAttribute("ry", String(collapsedH / 2));
	}, [collapsedW, collapsedH, rootW, rootH, t, svgRectRef]);

	// Animate SVG rect
	useLayoutEffect(() => {
		const rect = svgRectRef.current;
		if (!rect || !t.initialized) return;

		const tw = targetW;
		const th = targetH;

		if (tw === t.prevW && th === t.prevH) return;

		if (t.currentAnim) {
			t.currentAnim.cancel();
			t.currentAnim = null;
		}

		const fromW = t.prevW;
		const fromH = t.prevH;
		const fromX = (rootW - fromW) / 2;
		const fromY = (rootH - fromH) / 2;
		const toX = (rootW - tw) / 2;
		const toY = (rootH - th) / 2;

		t.prevW = tw;
		t.prevH = th;

		const isCollapsing = tw === collapsedW && th === collapsedH;
		const wasCollapsed = fromW === collapsedW && fromH === collapsedH;
		const fromRx = wasCollapsed ? collapsedW / 2 : roundness;
		const toRx = isCollapsing ? collapsedW / 2 : roundness;

		const a = animateSpring(rect, {
			width: { from: fromW, to: tw, unit: "px" },
			height: { from: fromH, to: th, unit: "px" },
			x: { from: fromX, to: toX, unit: "px" },
			y: { from: fromY, to: toY, unit: "px" },
			rx: { from: fromRx, to: toRx, unit: "px" },
			ry: { from: fromRx, to: toRx, unit: "px" },
		}, springConfig);

		if (a) {
			t.currentAnim = a;
			a.onfinish = () => {
				t.currentAnim = null;
				rect.setAttribute("width", String(tw));
				rect.setAttribute("height", String(th));
				rect.setAttribute("x", String(toX));
				rect.setAttribute("y", String(toY));
				rect.setAttribute("rx", String(toRx));
				rect.setAttribute("ry", String(toRx));
			};
		} else {
			rect.setAttribute("width", String(tw));
			rect.setAttribute("height", String(th));
			rect.setAttribute("x", String(toX));
			rect.setAttribute("y", String(toY));
			rect.setAttribute("rx", String(toRx));
			rect.setAttribute("ry", String(toRx));
		}
	}, [targetW, targetH, rootW, rootH, collapsedW, collapsedH, roundness, springConfig, t, svgRectRef]);
}
