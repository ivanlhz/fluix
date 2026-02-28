import { animateSpring, type SpringConfig } from "@fluix-ui/core";

export interface HighlightState {
	x: number;
	y: number;
	w: number;
	h: number;
	visible: boolean;
}

export function createHighlightState(): HighlightState {
	return { x: 0, y: 0, w: 0, h: 0, visible: false };
}

export function animateHighlightEnter(
	rect: SVGRectElement,
	hlPrev: HighlightState,
	target: { x: number; y: number; w: number; h: number; rx: number },
	springConfig: SpringConfig,
): Animation | null {
	const fromX = hlPrev.visible ? hlPrev.x : target.x + target.w / 2;
	const fromY = hlPrev.visible ? hlPrev.y : target.y + target.h / 2;
	const fromW = hlPrev.visible ? hlPrev.w : 0;
	const fromH = hlPrev.visible ? hlPrev.h : 0;
	const fromR = hlPrev.visible ? hlPrev.h / 2 : 0;

	const sc = springConfig;
	const a = animateSpring(rect, {
		x: { from: fromX, to: target.x, unit: "px" },
		y: { from: fromY, to: target.y, unit: "px" },
		width: { from: fromW, to: target.w, unit: "px" },
		height: { from: fromH, to: target.h, unit: "px" },
		rx: { from: fromR, to: target.rx, unit: "px" },
		ry: { from: fromR, to: target.rx, unit: "px" },
	}, { ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 });

	hlPrev.x = target.x;
	hlPrev.y = target.y;
	hlPrev.w = target.w;
	hlPrev.h = target.h;
	hlPrev.visible = true;

	if (a) {
		a.onfinish = () => {
			setRectAttrs(rect, target.x, target.y, target.w, target.h, target.rx, 1);
		};
	} else {
		setRectAttrs(rect, target.x, target.y, target.w, target.h, target.rx, 1);
	}

	rect.setAttribute("opacity", "1");
	return a;
}

export function animateHighlightLeave(
	rect: SVGRectElement,
	hlPrev: HighlightState,
	springConfig: SpringConfig,
): Animation | null {
	if (!hlPrev.visible) return null;

	const cx = hlPrev.x + hlPrev.w / 2;
	const cy = hlPrev.y + hlPrev.h / 2;
	const sc = springConfig;

	const a = animateSpring(rect, {
		x: { from: hlPrev.x, to: cx, unit: "px" },
		y: { from: hlPrev.y, to: cy, unit: "px" },
		width: { from: hlPrev.w, to: 0, unit: "px" },
		height: { from: hlPrev.h, to: 0, unit: "px" },
		rx: { from: hlPrev.h / 2, to: 0, unit: "px" },
		ry: { from: hlPrev.h / 2, to: 0, unit: "px" },
	}, { ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 });

	hlPrev.visible = false;

	if (a) {
		a.onfinish = () => {
			setRectAttrs(rect, cx, cy, 0, 0, 0, 0);
		};
	} else {
		setRectAttrs(rect, cx, cy, 0, 0, 0, 0);
	}
	return a;
}

export function resetHighlightImmediate(
	rect: SVGRectElement,
	hlPrev: HighlightState,
	centerX: number,
	centerY: number,
): void {
	rect.setAttribute("x", String(centerX));
	rect.setAttribute("y", String(centerY));
	rect.setAttribute("width", "0");
	rect.setAttribute("height", "0");
	rect.setAttribute("rx", "0");
	rect.setAttribute("ry", "0");
	rect.setAttribute("opacity", "0");
	hlPrev.visible = false;
}

function setRectAttrs(rect: SVGRectElement, x: number, y: number, w: number, h: number, rx: number, opacity: number): void {
	rect.setAttribute("x", String(x));
	rect.setAttribute("y", String(y));
	rect.setAttribute("width", String(w));
	rect.setAttribute("height", String(h));
	rect.setAttribute("rx", String(rx));
	rect.setAttribute("ry", String(rx));
	rect.setAttribute("opacity", String(opacity));
}
