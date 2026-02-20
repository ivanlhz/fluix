/**
 * Public types for the Toast component.
 */

export type FluixToastState = "success" | "loading" | "error" | "warning" | "info" | "action";
export type FluixTheme = "light" | "dark" | (string & {});
export type FluixVariant = "solid";
export type FluixToastLayout = "stack" | "notch";

export const FLUIX_POSITIONS = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
] as const;

export type FluixPosition = (typeof FLUIX_POSITIONS)[number];

export interface FluixToastStyles {
	title?: string;
	description?: string;
	badge?: string;
	button?: string;
}

export interface FluixToastButton {
	title: string;
	onClick: () => void;
}

export interface FluixToastOptions {
	/** Unique ID. If omitted, a default shared ID is used (replaces previous toast). */
	id?: string;
	/** Toast headline. */
	title?: string;
	/** Body content. Adapters decide how to render (string, ReactNode, etc.) */
	description?: unknown;
	/** Viewport position. Overrides the Toaster default. */
	position?: FluixPosition;
	/** Auto-dismiss delay in ms. `null` = persistent. Default: 6000 */
	duration?: number | null;
	/** Custom icon. `null` uses the default state icon. */
	icon?: unknown;
	/** CSS class overrides for sub-elements. */
	styles?: FluixToastStyles;
	/** Toast background color. If omitted, derived from CSS `--fluix-surface-contrast`. */
	fill?: string;
	/** Border radius / gooey blur factor. Default: 16 */
	roundness?: number;
	/** Visual mode for background/text defaults. Default: "light" */
	theme?: FluixTheme;
	/** Auto expand/collapse behavior. `false` disables. */
	autopilot?: boolean | { expand?: number; collapse?: number };
	/** Action button configuration. */
	button?: FluixToastButton;
}

export interface FluixToastPromiseOptions<T = unknown> {
	loading: Pick<FluixToastOptions, "title" | "icon">;
	success: FluixToastOptions | ((data: T) => FluixToastOptions);
	error: FluixToastOptions | ((err: unknown) => FluixToastOptions);
	action?: FluixToastOptions | ((data: T) => FluixToastOptions);
	position?: FluixPosition;
}

/** Internal toast item with resolved fields */
export interface FluixToastItem extends FluixToastOptions {
	id: string;
	/** Unique per-instance key. Changes when toast content is swapped. */
	instanceId: string;
	state: FluixToastState;
	theme: FluixTheme;
	position: FluixPosition;
	/** Resolved auto-dismiss delay in ms. `null` = persistent. */
	duration: number | null;
	exiting: boolean;
	autoExpandDelayMs?: number;
	autoCollapseDelayMs?: number;
}

export type FluixOffsetValue = number | string;
export type FluixOffsetConfig = Partial<
	Record<"top" | "right" | "bottom" | "left", FluixOffsetValue>
>;

export interface FluixToasterConfig {
	/** Default position for all toasts. Default: "top-right" */
	position?: FluixPosition;
	/** Toast viewport layout mode. "stack" keeps vertical list, "notch" compacts in one island. */
	layout?: FluixToastLayout;
	/** Viewport offset. Number (px), string ("1rem"), or per-side object. */
	offset?: FluixOffsetValue | FluixOffsetConfig;
	/** Default options merged into every toast. */
	defaults?: Partial<FluixToastOptions>;
}
