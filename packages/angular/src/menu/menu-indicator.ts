import { FLUIX_SPRING, connectMenu, type MenuOrientation, type MenuVariant, type SpringConfig } from "@fluix-ui/core";

export interface MenuIndicatorConnection {
	connection: ReturnType<typeof connectMenu> | undefined;
	reconnectRaf: number;
}

export function createMenuIndicatorState(): MenuIndicatorConnection {
	return { connection: undefined, reconnectRaf: 0 };
}

export function connectIndicator(
	state: MenuIndicatorConnection,
	opts: {
		root: HTMLElement;
		indicator: SVGRectElement | SVGPathElement;
		ghostIndicator: SVGRectElement | null;
		getActiveId: () => string | null;
		onSelect: (id: string) => void;
		spring: SpringConfig | undefined;
		variant: MenuVariant;
		orientation: MenuOrientation;
	},
): void {
	state.connection = connectMenu({
		root: opts.root,
		indicator: opts.indicator,
		ghostIndicator: opts.ghostIndicator,
		getActiveId: opts.getActiveId,
		onSelect: opts.onSelect,
		spring: opts.spring ?? FLUIX_SPRING,
		variant: opts.variant,
		orientation: opts.orientation,
	});
	state.connection.sync(false);
}

export function reconnectIndicator(
	state: MenuIndicatorConnection,
	root: HTMLElement | undefined,
	connectFn: () => void,
): void {
	if (!root) return;
	state.connection?.destroy();
	cancelAnimationFrame(state.reconnectRaf);
	state.reconnectRaf = requestAnimationFrame(() => connectFn());
}

export function destroyIndicator(state: MenuIndicatorConnection): void {
	state.connection?.destroy();
	cancelAnimationFrame(state.reconnectRaf);
}
