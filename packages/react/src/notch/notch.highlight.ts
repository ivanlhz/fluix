import {
	animateSpring,
	FLUIX_SPRING,
	type NotchMachine,
	type SpringConfig,
} from "@fluix-ui/core";
import { useCallback, useEffect } from "react";

interface HighlightPrev {
	x: number;
	y: number;
	w: number;
	h: number;
	visible: boolean;
}

export interface NotchHighlightTransient {
	highlightAnim: Animation | null;
	hlPrev: HighlightPrev;
}

export function createHighlightTransient(): NotchHighlightTransient {
	return {
		highlightAnim: null,
		hlPrev: { x: 0, y: 0, w: 0, h: 0, visible: false },
	};
}

export function useNotchHighlight({
	rootRef,
	hoverBlobRef,
	machine,
	spring,
	roundness,
	rootW,
	rootH,
	isOpen,
	t,
}: {
	rootRef: React.RefObject<HTMLDivElement | null>;
	hoverBlobRef: React.RefObject<SVGRectElement | null>;
	machine: NotchMachine;
	spring: SpringConfig | undefined;
	roundness: number;
	rootW: number;
	rootH: number;
	isOpen: boolean;
	t: NotchHighlightTransient;
}) {
	const resetHoverBlobImmediate = useCallback(() => {
		const rect = hoverBlobRef.current;
		if (!rect) return;
		if (t.highlightAnim) {
			t.highlightAnim.cancel();
			t.highlightAnim = null;
		}
		rect.setAttribute("x", String(rootW / 2));
		rect.setAttribute("y", String(rootH / 2));
		rect.setAttribute("width", "0");
		rect.setAttribute("height", "0");
		rect.setAttribute("rx", "0");
		rect.setAttribute("ry", "0");
		rect.setAttribute("opacity", "0");
		t.hlPrev.visible = false;
	}, [rootW, rootH, t, hoverBlobRef]);

	const onItemEnter = useCallback((e: React.MouseEvent) => {
		const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
		const rect = hoverBlobRef.current;
		const root = rootRef.current;
		const snap = machine.store.getSnapshot();
		if (!target || !rect || !root || !snap.open) return;

		const rootRect = root.getBoundingClientRect();
		const itemW = target.offsetWidth;
		const itemH = target.offsetHeight;
		const itemRect = target.getBoundingClientRect();
		const itemCenterX = itemRect.left + itemRect.width / 2;
		const itemCenterY = itemRect.top + itemRect.height / 2;

		const padX = 8;
		const padY = 4;
		const blobOvershoot = Math.max(6, roundness * 0.35);
		const toW = itemW + padX * 2;
		const toH = Math.max(itemH + padY * 2, rootRect.height + blobOvershoot * 2);
		const toX = itemCenterX - rootRect.left - toW / 2;
		const toY = itemCenterY - rootRect.top - toH / 2;
		const toRx = toH / 2;

		const hl = t.hlPrev;
		const fromX = hl.visible ? hl.x : toX + toW / 2;
		const fromY = hl.visible ? hl.y : toY + toH / 2;
		const fromW = hl.visible ? hl.w : 0;
		const fromH = hl.visible ? hl.h : 0;
		const fromR = hl.visible ? hl.h / 2 : 0;

		if (t.highlightAnim) {
			t.highlightAnim.cancel();
			t.highlightAnim = null;
		}

		const sc = spring ?? FLUIX_SPRING;
		const a = animateSpring(rect, {
			x: { from: fromX, to: toX, unit: "px" },
			y: { from: fromY, to: toY, unit: "px" },
			width: { from: fromW, to: toW, unit: "px" },
			height: { from: fromH, to: toH, unit: "px" },
			rx: { from: fromR, to: toRx, unit: "px" },
			ry: { from: fromR, to: toRx, unit: "px" },
		}, { ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 });

		hl.x = toX;
		hl.y = toY;
		hl.w = toW;
		hl.h = toH;

		if (a) {
			t.highlightAnim = a;
			a.onfinish = () => {
				t.highlightAnim = null;
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
		hl.visible = true;
	}, [machine, spring, t, roundness, rootRef, hoverBlobRef]);

	const onItemLeave = useCallback(() => {
		const rect = hoverBlobRef.current;
		if (!rect) return;
		const hl = t.hlPrev;
		if (t.highlightAnim) {
			t.highlightAnim.cancel();
			t.highlightAnim = null;
		}
		if (!hl.visible) return;
		const cx = hl.x + hl.w / 2;
		const cy = hl.y + hl.h / 2;
		const sc = spring ?? FLUIX_SPRING;
		const a = animateSpring(rect, {
			x: { from: hl.x, to: cx, unit: "px" },
			y: { from: hl.y, to: cy, unit: "px" },
			width: { from: hl.w, to: 0, unit: "px" },
			height: { from: hl.h, to: 0, unit: "px" },
			rx: { from: hl.h / 2, to: 0, unit: "px" },
			ry: { from: hl.h / 2, to: 0, unit: "px" },
		}, { ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 });
		if (a) {
			t.highlightAnim = a;
			a.onfinish = () => {
				t.highlightAnim = null;
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
		hl.visible = false;
	}, [spring, t, hoverBlobRef]);

	useEffect(() => {
		if (!isOpen) {
			resetHoverBlobImmediate();
		}
	}, [isOpen, resetHoverBlobImmediate]);

	return { onItemEnter, onItemLeave, resetHoverBlobImmediate };
}
