import { animateSpring, type SpringConfig } from "@fluix-ui/core";

interface HighlightPrev {
	x: number;
	y: number;
	w: number;
	h: number;
	visible: boolean;
}

export function createNotchHighlight() {
	let highlightAnim: Animation | null = null;
	const hlPrev: HighlightPrev = { x: 0, y: 0, w: 0, h: 0, visible: false };

	function onItemEnter(
		e: MouseEvent,
		opts: {
			hoverBlobEl: SVGRectElement | null;
			rootEl: HTMLDivElement | null;
			isOpen: boolean;
			roundness: number;
			springConfig: SpringConfig;
		},
	) {
		const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
		const rect = opts.hoverBlobEl;
		const root = opts.rootEl;
		if (!target || !rect || !root || !opts.isOpen) return;

		const rootRect = root.getBoundingClientRect();
		const itemW = target.offsetWidth;
		const itemH = target.offsetHeight;
		const itemRect = target.getBoundingClientRect();
		const itemCenterX = itemRect.left + itemRect.width / 2;
		const itemCenterY = itemRect.top + itemRect.height / 2;

		const padX = 8;
		const padY = 4;
		const blobOvershoot = Math.max(6, opts.roundness * 0.35);
		const toW = itemW + padX * 2;
		const toH = Math.max(itemH + padY * 2, rootRect.height + blobOvershoot * 2);
		const toX = itemCenterX - rootRect.left - toW / 2;
		const toY = itemCenterY - rootRect.top - toH / 2;
		const toRx = toH / 2;

		const fromX = hlPrev.visible ? hlPrev.x : toX + toW / 2;
		const fromY = hlPrev.visible ? hlPrev.y : toY + toH / 2;
		const fromW = hlPrev.visible ? hlPrev.w : 0;
		const fromH = hlPrev.visible ? hlPrev.h : 0;
		const fromR = hlPrev.visible ? hlPrev.h / 2 : 0;

		if (highlightAnim) {
			highlightAnim.cancel();
			highlightAnim = null;
		}

		const sc = opts.springConfig;
		const a = animateSpring(rect, {
			x: { from: fromX, to: toX, unit: "px" },
			y: { from: fromY, to: toY, unit: "px" },
			width: { from: fromW, to: toW, unit: "px" },
			height: { from: fromH, to: toH, unit: "px" },
			rx: { from: fromR, to: toRx, unit: "px" },
			ry: { from: fromR, to: toRx, unit: "px" },
		}, { ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 });

		hlPrev.x = toX;
		hlPrev.y = toY;
		hlPrev.w = toW;
		hlPrev.h = toH;

		if (a) {
			highlightAnim = a;
			a.onfinish = () => {
				highlightAnim = null;
				rect.setAttribute("x", String(toX));
				rect.setAttribute("y", String(toY));
				rect.setAttribute("width", String(toW));
				rect.setAttribute("height", String(toH));
				rect.setAttribute("rx", String(toRx));
				rect.setAttribute("ry", String(toRx));
				rect.setAttribute("opacity", "1");
			};
		} else {
			rect.setAttribute("x", String(toX));
			rect.setAttribute("y", String(toY));
			rect.setAttribute("width", String(toW));
			rect.setAttribute("height", String(toH));
			rect.setAttribute("rx", String(toRx));
			rect.setAttribute("ry", String(toRx));
			rect.setAttribute("opacity", "1");
		}
		rect.setAttribute("opacity", "1");
		hlPrev.visible = true;
	}

	function resetImmediate(
		hoverBlobEl: SVGRectElement | null,
		rootW: number,
		rootH: number,
	) {
		const rect = hoverBlobEl;
		if (!rect) return;
		if (highlightAnim) {
			highlightAnim.cancel();
			highlightAnim = null;
		}
		rect.setAttribute("x", String(rootW / 2));
		rect.setAttribute("y", String(rootH / 2));
		rect.setAttribute("width", "0");
		rect.setAttribute("height", "0");
		rect.setAttribute("rx", "0");
		rect.setAttribute("ry", "0");
		rect.setAttribute("opacity", "0");
		hlPrev.visible = false;
	}

	function onItemLeave(
		hoverBlobEl: SVGRectElement | null,
		springConfig: SpringConfig,
	) {
		const rect = hoverBlobEl;
		if (!rect) return;
		if (highlightAnim) {
			highlightAnim.cancel();
			highlightAnim = null;
		}
		if (!hlPrev.visible) return;

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

		if (a) {
			highlightAnim = a;
			a.onfinish = () => {
				highlightAnim = null;
				rect.setAttribute("x", String(cx));
				rect.setAttribute("y", String(cy));
				rect.setAttribute("width", "0");
				rect.setAttribute("height", "0");
				rect.setAttribute("rx", "0");
				rect.setAttribute("ry", "0");
				rect.setAttribute("opacity", "0");
			};
		} else {
			rect.setAttribute("x", String(cx));
			rect.setAttribute("y", String(cy));
			rect.setAttribute("width", "0");
			rect.setAttribute("height", "0");
			rect.setAttribute("rx", "0");
			rect.setAttribute("ry", "0");
			rect.setAttribute("opacity", "0");
		}
		hlPrev.visible = false;
	}

	return { onItemEnter, onItemLeave, resetImmediate };
}
