/**
 * Notch DOM event wiring.
 *
 * Connects a notch DOM element to the machine based on trigger mode.
 */

import type { NotchTrigger } from "./notch.types";

export interface NotchConnectCallbacks {
	onOpen(): void;
	onClose(): void;
	onToggle(): void;
}

export function connectNotch(
	element: HTMLElement,
	callbacks: NotchConnectCallbacks,
	trigger: NotchTrigger,
): { destroy(): void } {
	const cleanups: Array<() => void> = [];

	if (trigger === "hover" || trigger === "click") {
		if (trigger === "hover") {
			const handleMouseEnter = () => callbacks.onOpen();
			const handleMouseLeave = () => callbacks.onClose();

			element.addEventListener("mouseenter", handleMouseEnter);
			element.addEventListener("mouseleave", handleMouseLeave);
			cleanups.push(() => {
				element.removeEventListener("mouseenter", handleMouseEnter);
				element.removeEventListener("mouseleave", handleMouseLeave);
			});
		}

		if (trigger === "click") {
			const handleClick = () => callbacks.onToggle();
			element.addEventListener("click", handleClick);
			cleanups.push(() => element.removeEventListener("click", handleClick));
		}
	}

	// "manual" mode — no DOM events, controlled entirely via API

	return {
		destroy() {
			for (const cleanup of cleanups) cleanup();
			cleanups.length = 0;
		},
	};
}
