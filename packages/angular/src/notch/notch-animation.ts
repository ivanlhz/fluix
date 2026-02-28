import { animateSpring, type SpringConfig } from "@fluix-ui/core";

export interface NotchAnimState {
	w: number;
	h: number;
	initialized: boolean;
}

export function createNotchAnimState(): NotchAnimState {
	return { w: 0, h: 0, initialized: false };
}

export function initSvgRect(
	rect: SVGRectElement,
	state: NotchAnimState,
	collapsedW: number,
	collapsedH: number,
	rootW: number,
	rootH: number,
): void {
	if (state.initialized) return;

	state.w = collapsedW;
	state.h = collapsedH;
	state.initialized = true;

	rect.setAttribute("width", String(collapsedW));
	rect.setAttribute("height", String(collapsedH));
	rect.setAttribute("x", String((rootW - collapsedW) / 2));
	rect.setAttribute("y", String((rootH - collapsedH) / 2));
	rect.setAttribute("rx", String(collapsedW / 2));
	rect.setAttribute("ry", String(collapsedH / 2));
}

export function animateNotchRect(
	rect: SVGRectElement,
	state: NotchAnimState,
	currentAnim: Animation | null,
	opts: {
		targetW: number;
		targetH: number;
		rootW: number;
		rootH: number;
		collapsedW: number;
		collapsedH: number;
		roundness: number;
		spring: SpringConfig;
	},
): Animation | null {
	if (!state.initialized) return currentAnim;

	const { targetW: tw, targetH: th, rootW: rw, rootH: rh, collapsedW: cw, collapsedH: ch, roundness, spring } = opts;

	if (tw === state.w && th === state.h) return currentAnim;

	currentAnim?.cancel();

	const fromW = state.w;
	const fromH = state.h;
	const fromX = (rw - fromW) / 2;
	const fromY = (rh - fromH) / 2;
	const toX = (rw - tw) / 2;
	const toY = (rh - th) / 2;

	state.w = tw;
	state.h = th;

	const isCollapsing = tw === cw && th === ch;
	const wasCollapsed = fromW === cw && fromH === ch;
	const fromRx = wasCollapsed ? cw / 2 : roundness;
	const toRx = isCollapsing ? cw / 2 : roundness;

	const a = animateSpring(rect, {
		width: { from: fromW, to: tw, unit: "px" },
		height: { from: fromH, to: th, unit: "px" },
		x: { from: fromX, to: toX, unit: "px" },
		y: { from: fromY, to: toY, unit: "px" },
		rx: { from: fromRx, to: toRx, unit: "px" },
		ry: { from: fromRx, to: toRx, unit: "px" },
	}, spring);

	if (a) {
		a.onfinish = () => {
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

	return a;
}
