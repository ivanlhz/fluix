/**
 * Dismiss detection.
 *
 * Detects user intent to dismiss a component via:
 * - Escape key
 * - Click outside the container
 * - Scroll outside the container (optional)
 *
 * Returns a destroy function to clean up listeners.
 */

export interface DismissOptions {
	/** Listen for Escape key. Default: true */
	escape?: boolean;
	/** Listen for clicks outside the container. Default: true */
	clickOutside?: boolean | { ignore?: (Element | string)[] };
	/** Listen for scroll outside the container. Default: false */
	scrollOutside?: boolean;
}

export function createDismiss(
	/** Function that returns the container element (lazy, may not exist yet) */
	getContainer: () => Element | null,
	/** Called when dismiss is detected */
	onDismiss: () => void,
	options: DismissOptions = {},
): { destroy(): void } {
	const { escape: escapeKey = true, clickOutside = true, scrollOutside = false } = options;
	const cleanups: Array<() => void> = [];

	if (escapeKey) {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onDismiss();
			}
		};
		document.addEventListener("keydown", handler, { capture: true });
		cleanups.push(() => document.removeEventListener("keydown", handler, { capture: true }));
	}

	if (clickOutside) {
		const ignoreSelectors =
			typeof clickOutside === "object" && clickOutside.ignore ? clickOutside.ignore : [];

		const handler = (e: MouseEvent) => {
			const container = getContainer();
			if (!container) return;
			const target = e.target as Element;
			if (!target) return;

			// Check if click is inside container
			if (container.contains(target)) return;

			// Check ignore list
			for (const selector of ignoreSelectors) {
				if (selector instanceof Element) {
					if (selector.contains(target)) return;
				} else if (target.closest(selector)) {
					return;
				}
			}

			onDismiss();
		};

		// Use pointerdown for better mobile support
		document.addEventListener("pointerdown", handler);
		cleanups.push(() => document.removeEventListener("pointerdown", handler));
	}

	if (scrollOutside) {
		const handler = (e: Event) => {
			const container = getContainer();
			if (!container) return;
			const target = e.target as Element;
			if (target && !container.contains(target)) {
				onDismiss();
			}
		};
		document.addEventListener("scroll", handler, { capture: true, passive: true });
		cleanups.push(() =>
			document.removeEventListener("scroll", handler, { capture: true } as EventListenerOptions),
		);
	}

	return {
		destroy() {
			for (const cleanup of cleanups) cleanup();
			cleanups.length = 0;
		},
	};
}
