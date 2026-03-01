/** Hover blob highlight tracking for the Notch component. */

import { animateSpring, type SpringConfig } from "@fluix-ui/core";

export interface HighlightTracker {
	onItemEnter(e: MouseEvent, rootEl: HTMLElement, isOpen: boolean, roundness: number): void;
	onItemLeave(): void;
	reset(rootW: number, rootH: number): void;
	cancelAnim(): void;
}

function setBlobAttrs(el: SVGRectElement, x: number, y: number, w: number, h: number, rx: number, opacity: string) {
	el.setAttribute("x", String(x));
	el.setAttribute("y", String(y));
	el.setAttribute("width", String(w));
	el.setAttribute("height", String(h));
	el.setAttribute("rx", String(rx));
	el.setAttribute("ry", String(rx));
	el.setAttribute("opacity", opacity);
}

function springBlob(
	el: SVGRectElement,
	from: { x: number; y: number; w: number; h: number; rx: number },
	to: { x: number; y: number; w: number; h: number; rx: number },
	sc: SpringConfig,
) {
	return animateSpring(el, {
		x: { from: from.x, to: to.x, unit: "px" },
		y: { from: from.y, to: to.y, unit: "px" },
		width: { from: from.w, to: to.w, unit: "px" },
		height: { from: from.h, to: to.h, unit: "px" },
		rx: { from: from.rx, to: to.rx, unit: "px" },
		ry: { from: from.rx, to: to.rx, unit: "px" },
	}, { ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 });
}

export function createHighlightTracker(el: SVGRectElement, springConfig: () => SpringConfig): HighlightTracker {
	let anim: Animation | null = null;
	const prev = { x: 0, y: 0, w: 0, h: 0, visible: false };

	function finish(a: Animation | null, x: number, y: number, w: number, h: number, rx: number, opacity: string) {
		if (a) { anim = a; a.onfinish = () => { anim = null; setBlobAttrs(el, x, y, w, h, rx, opacity); }; }
		else { setBlobAttrs(el, x, y, w, h, rx, opacity); }
	}

	return {
		onItemEnter(e, rootEl, isOpen, roundness) {
			const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
			if (!target || !isOpen) return;

			const rootRect = rootEl.getBoundingClientRect();
			const itemRect = target.getBoundingClientRect();
			const padX = 8, padY = 4;
			const overshoot = Math.max(6, roundness * 0.35);
			const toW = target.offsetWidth + padX * 2;
			const toH = Math.max(target.offsetHeight + padY * 2, rootRect.height + overshoot * 2);
			const toX = itemRect.left + itemRect.width / 2 - rootRect.left - toW / 2;
			const toY = itemRect.top + itemRect.height / 2 - rootRect.top - toH / 2;

			if (anim) { anim.cancel(); anim = null; }

			const from = {
				x: prev.visible ? prev.x : toX + toW / 2, y: prev.visible ? prev.y : toY + toH / 2,
				w: prev.visible ? prev.w : 0, h: prev.visible ? prev.h : 0,
				rx: prev.visible ? prev.h / 2 : 0,
			};
			finish(springBlob(el, from, { x: toX, y: toY, w: toW, h: toH, rx: toH / 2 }, springConfig()), toX, toY, toW, toH, toH / 2, "1");
			el.setAttribute("opacity", "1");
			prev.x = toX; prev.y = toY; prev.w = toW; prev.h = toH; prev.visible = true;
		},

		onItemLeave() {
			if (!prev.visible) return;
			const cx = prev.x + prev.w / 2, cy = prev.y + prev.h / 2;
			finish(springBlob(el, { x: prev.x, y: prev.y, w: prev.w, h: prev.h, rx: prev.h / 2 }, { x: cx, y: cy, w: 0, h: 0, rx: 0 }, springConfig()), cx, cy, 0, 0, 0, "0");
			prev.visible = false;
		},

		reset(rootW, rootH) {
			if (anim) { anim.cancel(); anim = null; }
			setBlobAttrs(el, rootW / 2, rootH / 2, 0, 0, 0, "0");
			prev.visible = false;
		},

		cancelAnim() { anim?.cancel(); },
	};
}
