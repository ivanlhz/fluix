/**
 * Toast DOM event wiring.
 *
 * Connects a toast DOM element to the machine.
 * Handles: hover (expand/collapse), swipe-to-dismiss, pointer events.
 *
 * Used directly by the vanilla adapter and as reference implementation
 * for framework adapters that may inline these handlers.
 */

import type { FluixToastItem } from "./toast.types";

export interface ToastConnectCallbacks {
	onExpand(): void;
	onCollapse(): void;
	onDismiss(): void;
	onHoverStart(): void;
	onHoverEnd(): void;
}

const SWIPE_DISMISS_THRESHOLD = 30; // px
const SWIPE_MAX_VISUAL = 20; // px (visual clamp during drag)

export function connectToast(
	element: HTMLElement,
	callbacks: ToastConnectCallbacks,
	item: FluixToastItem,
): { destroy(): void } {
	const cleanups: Array<() => void> = [];
	let pointerStartY: number | null = null;
	const hasDescription = Boolean(item.description) || Boolean(item.button);

	/* ----------------------------- Hover ----------------------------- */

	const handleMouseEnter = () => {
		callbacks.onHoverStart();
		if (hasDescription && item.state !== "loading") {
			callbacks.onExpand();
		}
	};

	const handleMouseLeave = () => {
		callbacks.onHoverEnd();
		callbacks.onCollapse();
	};

	element.addEventListener("mouseenter", handleMouseEnter);
	element.addEventListener("mouseleave", handleMouseLeave);
	cleanups.push(() => {
		element.removeEventListener("mouseenter", handleMouseEnter);
		element.removeEventListener("mouseleave", handleMouseLeave);
	});

	/* ----------------------------- Swipe ----------------------------- */

	const handlePointerMove = (e: PointerEvent) => {
		if (pointerStartY === null) return;
		const dy = e.clientY - pointerStartY;
		const sign = dy > 0 ? 1 : -1;
		const clamped = Math.min(Math.abs(dy), SWIPE_MAX_VISUAL) * sign;
		element.style.transform = `translateY(${clamped}px)`;
	};

	const handlePointerUp = (e: PointerEvent) => {
		if (pointerStartY === null) return;
		const dy = e.clientY - pointerStartY;
		pointerStartY = null;
		element.style.transform = "";

		element.removeEventListener("pointermove", handlePointerMove);
		element.removeEventListener("pointerup", handlePointerUp);

		if (Math.abs(dy) > SWIPE_DISMISS_THRESHOLD) {
			callbacks.onDismiss();
		}
	};

	const handlePointerDown = (e: PointerEvent) => {
		if (item.exiting) return;

		// Don't capture swipe if clicking the action button
		const target = e.target as HTMLElement;
		if (target.closest("[data-fluix-button]")) return;

		pointerStartY = e.clientY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

		element.addEventListener("pointermove", handlePointerMove, { passive: true });
		element.addEventListener("pointerup", handlePointerUp, { passive: true });
	};

	element.addEventListener("pointerdown", handlePointerDown);
	cleanups.push(() => {
		element.removeEventListener("pointerdown", handlePointerDown);
		element.removeEventListener("pointermove", handlePointerMove);
		element.removeEventListener("pointerup", handlePointerUp);
	});

	return {
		destroy() {
			for (const cleanup of cleanups) cleanup();
			cleanups.length = 0;
		},
	};
}
