import type { FluixToastItem, FluixToasterConfig } from "@fluix-ui/core";

/* ----------------------------- Constants ----------------------------- */

export const WIDTH = 350;
export const HEIGHT = 40;
export const PILL_PADDING = 10;
export const MIN_EXPAND_RATIO = 2.25;
export const HEADER_EXIT_MS = 600 * 0.7;
export const BODY_MERGE_OVERLAP = 6;

export const DEFAULT_LOCAL: { ready: boolean; expanded: boolean } = { ready: false, expanded: false };
export const DEFAULT_FILL = "var(--fluix-surface-contrast)";
export const FILTER_ID_REGEX = /[^a-z0-9-]/gi;
export const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

/* ----------------------------- Types ----------------------------- */

export interface ToasterProps {
	config?: FluixToasterConfig;
}

export type ToastLocalState = Record<string, { ready: boolean; expanded: boolean }>;

export interface HeaderLayerView {
	state: FluixToastItem["state"];
	title: string;
	icon: unknown;
	styles?: FluixToastItem["styles"];
}

export interface HeaderLayerState {
	current: { key: string; view: HeaderLayerView };
	prev: { key: string; view: HeaderLayerView } | null;
}

export interface ToastTransientState {
	hovering: boolean;
	pendingDismiss: boolean;
	dismissRequested: boolean;
	forcedDismissTimer: ReturnType<typeof setTimeout> | null;
	headerPad: number | null;
	pillObserved: Element | null;
	pillRafId: number;
	headerExitTimer: ReturnType<typeof setTimeout> | null;
	pillAnim: Animation | null;
	pillFirstRender: boolean;
	prevPill: { x: number; width: number; height: number };
}

export function createTransientState(): ToastTransientState {
	return {
		hovering: false,
		pendingDismiss: false,
		dismissRequested: false,
		forcedDismissTimer: null,
		headerPad: null,
		pillObserved: null,
		pillRafId: 0,
		headerExitTimer: null,
		pillAnim: null,
		pillFirstRender: true,
		prevPill: { x: 0, width: HEIGHT, height: HEIGHT },
	};
}
