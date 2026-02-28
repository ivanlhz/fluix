import { animateSpring, FLUIX_SPRING } from "@fluix-ui/core";

const HEIGHT = 40;

export interface PillAnimState {
	prevPill: { x: number; width: number; height: number };
	pillFirst: boolean;
	pillAnim: Animation | null;
}

export function createPillAnimState(): PillAnimState {
	return {
		prevPill: { x: 0, width: HEIGHT, height: HEIGHT },
		pillFirst: true,
		pillAnim: null,
	};
}

export function runPillAnimation(
	el: SVGRectElement,
	state: PillAnimState,
	next: { x: number; width: number; height: number },
): void {
	if (
		state.prevPill.x === next.x &&
		state.prevPill.width === next.width &&
		state.prevPill.height === next.height
	) {
		return;
	}

	state.pillAnim?.cancel();

	if (state.pillFirst) {
		state.pillFirst = false;
		el.setAttribute("x", String(next.x));
		el.setAttribute("width", String(next.width));
		el.setAttribute("height", String(next.height));
		state.prevPill = { ...next };
		return;
	}

	const anim = animateSpring(
		el,
		{
			x: { from: state.prevPill.x, to: next.x, unit: "px" },
			width: { from: state.prevPill.width, to: next.width, unit: "px" },
			height: { from: state.prevPill.height, to: next.height, unit: "px" },
		},
		FLUIX_SPRING,
	);
	state.pillAnim = anim;
	state.prevPill = { ...next };
}
