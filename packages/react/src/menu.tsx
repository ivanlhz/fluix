import {
	FLUIX_SPRING,
	MENU_DEFAULTS,
	connectMenu,
	createMenuMachine,
	getMenuAttrs,
	type MenuMachine,
	type MenuMachineState,
	type MenuOrientation,
	type MenuVariant,
	type MenuTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import {
	type MouseEventHandler,
	type ReactNode,
	createContext,
	memo,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";

const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

const EMPTY_STATE: MenuMachineState = {
	activeId: null,
	config: {},
};

function getServerSnapshot(): MenuMachineState {
	return EMPTY_STATE;
}

export interface MenuRootProps {
	orientation?: MenuOrientation;
	variant?: MenuVariant;
	theme?: MenuTheme;
	activeId?: string | null;
	defaultActiveId?: string | null;
	onActiveChange?(id: string): void;
	spring?: SpringConfig;
	roundness?: number;
	blur?: number;
	fill?: string;
	className?: string;
	children: ReactNode;
}

export interface MenuItemProps {
	id: string;
	disabled?: boolean;
	className?: string;
	children: ReactNode;
	onClick?: MouseEventHandler<HTMLButtonElement>;
}

export interface MenuIndicatorProps {
	fill?: string;
	blur?: number;
	className?: string;
}

interface MenuContextValue {
	activeId: string | null;
	setActive(id: string): void;
	registerIndicator(node: SVGRectElement | SVGPathElement | null): void;
	rootRef: React.RefObject<HTMLElement | null>;
	attrs: ReturnType<typeof getMenuAttrs>;
	filterId: string;
	fill?: string;
	blur: number;
	size: { width: number; height: number };
	variant: MenuVariant;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(): MenuContextValue {
	const context = useContext(MenuContext);
	if (!context) {
		throw new Error("Menu components must be used inside <Menu.Root>.");
	}
	return context;
}

function Root({
	orientation = MENU_DEFAULTS.orientation,
	variant = "pill",
	theme = "dark",
	activeId: controlledActiveId,
	defaultActiveId = null,
	onActiveChange,
	spring,
	roundness = MENU_DEFAULTS.roundness,
	blur,
	fill,
	className,
	children,
}: MenuRootProps) {
	const machineRef = useRef<MenuMachine | null>(null);
	if (machineRef.current === null) {
		machineRef.current = createMenuMachine({
			orientation,
			variant,
			spring,
			roundness,
			blur,
			fill,
			initialActiveId: controlledActiveId ?? defaultActiveId,
		});
	}
	const machine = machineRef.current;

	const subscribe = useCallback((cb: () => void) => machine.store.subscribe(cb), [machine]);
	const getSnapshot = useCallback(() => machine.store.getSnapshot(), [machine]);
	const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	const rootRef = useRef<HTMLElement | null>(null);
	const [indicatorNode, setIndicatorNode] = useState<SVGRectElement | SVGPathElement | null>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });
	const activeIdRef = useRef<string | null>(snapshot.activeId);
	activeIdRef.current = snapshot.activeId;

	const connectionRef = useRef<ReturnType<typeof connectMenu> | null>(null);
	const lastActiveNotifiedRef = useRef<string | null>(snapshot.activeId);
	const controlledActiveIdRef = useRef(controlledActiveId);
	controlledActiveIdRef.current = controlledActiveId;
	const onActiveChangeRef = useRef(onActiveChange);
	onActiveChangeRef.current = onActiveChange;

	const reactFilterId = useId().replace(/:/g, "-");
	const filterId = `fluix-menu-goo-${reactFilterId}`;
	const attrs = useMemo(() => getMenuAttrs({ orientation, theme, variant }), [orientation, theme, variant]);
	const resolvedBlur = blur ?? Math.min(10, Math.max(6, roundness * 0.45));
	const springConfig = spring ?? FLUIX_SPRING;

	useEffect(() => {
		machine.configure({ orientation, variant, spring, roundness, blur, fill });
	}, [machine, orientation, variant, spring, roundness, blur, fill]);

	useEffect(() => {
		if (controlledActiveId !== undefined) {
			machine.setActive(controlledActiveId ?? null);
		}
	}, [controlledActiveId, machine]);

	useEffect(() => {
		const nextActiveId = snapshot.activeId;
		if (
			nextActiveId &&
			lastActiveNotifiedRef.current !== nextActiveId
		) {
			onActiveChangeRef.current?.(nextActiveId);
		}
		lastActiveNotifiedRef.current = nextActiveId;
	}, [snapshot.activeId]);

	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		const measure = () => {
			const rect = root.getBoundingClientRect();
			const width = Math.ceil(rect.width);
			const height = Math.ceil(rect.height);
			setSize((prev) => {
				if (prev.width === width && prev.height === height) return prev;
				return { width, height };
			});
		};

		measure();
		let raf = 0;
		const observer = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(measure);
		});
		observer.observe(root);

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		const root = rootRef.current;
		if (!root || !indicatorNode) return;

		const connection = connectMenu({
			root,
			indicator: indicatorNode,
			getActiveId: () => activeIdRef.current,
			onSelect(id) {
				if (controlledActiveIdRef.current === undefined) {
					machine.setActive(id);
				} else {
					onActiveChangeRef.current?.(id);
				}
			},
			spring: springConfig,
			variant,
			orientation,
		});

		connectionRef.current = connection;
		return () => {
			connection.destroy();
			connectionRef.current = null;
		};
	}, [indicatorNode, machine, springConfig, variant, orientation]);

	useEffect(() => {
		connectionRef.current?.sync(false);
	}, [snapshot.activeId, size.width, size.height]);

	useEffect(() => {
		return () => machine.destroy();
	}, [machine]);

	const setActive = useCallback(
		(id: string) => {
			if (controlledActiveIdRef.current === undefined) {
				machine.setActive(id);
			} else {
				onActiveChangeRef.current?.(id);
			}
		},
		[machine],
	);

	const registerIndicator = useCallback((node: SVGRectElement | SVGPathElement | null) => {
		setIndicatorNode(node);
	}, []);

	const contextValue = useMemo<MenuContextValue>(
		() => ({
			activeId: snapshot.activeId,
			setActive,
			registerIndicator,
			rootRef,
			attrs,
			filterId,
			fill,
			blur: resolvedBlur,
			size,
			variant,
		}),
		[
			snapshot.activeId,
			setActive,
			registerIndicator,
			attrs,
			filterId,
			fill,
			resolvedBlur,
			size,
			variant,
		],
	);

	return (
		<MenuContext.Provider value={contextValue}>
			<nav
				ref={rootRef}
				{...attrs.root}
				className={className}
				aria-label="Fluix menu"
			>
				<Indicator />
				<div {...attrs.list}>{children}</div>
			</nav>
		</MenuContext.Provider>
	);
}

const Item = memo(function Item({ id, disabled = false, className, children, onClick }: MenuItemProps) {
	const { activeId, setActive, attrs } = useMenuContext();
	const active = activeId === id;
	const itemAttrs = attrs.item({ id, active, disabled });

	const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
		(event) => {
			if (disabled) return;
			onClick?.(event);
			if (event.defaultPrevented) return;
			setActive(id);
		},
		[setActive, id, disabled, onClick],
	);

	return (
		<button
			type="button"
			{...itemAttrs}
			disabled={disabled}
			className={className}
			onClick={handleClick}
		>
			{children}
		</button>
	);
});

const Indicator = memo(function Indicator({ fill, blur, className }: MenuIndicatorProps) {
	const context = useMenuContext();
	const width = Math.max(1, context.size.width);
	const height = Math.max(1, context.size.height);
	const effectiveFill = fill ?? context.fill ?? "var(--fluix-menu-indicator)";
	const effectiveBlur = blur ?? context.blur;
	const isTab = context.variant === "tab";

	return (
		<div {...context.attrs.canvas} className={className}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={width}
				height={height}
				viewBox={`0 0 ${width} ${height}`}
				aria-hidden="true"
			>
				{!isTab && (
					<defs>
						<filter
							id={context.filterId}
							x="-20%"
							y="-20%"
							width="140%"
							height="140%"
							colorInterpolationFilters="sRGB"
						>
							<feGaussianBlur in="SourceGraphic" stdDeviation={effectiveBlur} result="blur" />
							<feColorMatrix in="blur" type="matrix" values={GOO_MATRIX} result="goo" />
							<feComposite in="SourceGraphic" in2="goo" operator="atop" />
						</filter>
					</defs>
				)}
				{isTab ? (
					<path
						ref={context.registerIndicator}
						{...context.attrs.indicator}
						d=""
						opacity={0}
						style={{ fill: effectiveFill }}
					/>
				) : (
					<g filter={`url(#${context.filterId})`}>
						<rect
							ref={context.registerIndicator}
							{...context.attrs.indicator}
							x={0}
							y={0}
							width={0}
							height={0}
							rx={0}
							ry={0}
							opacity={0}
							style={{ fill: effectiveFill }}
						/>
					</g>
				)}
			</svg>
		</div>
	);
});

export const Menu = {
	Root,
	Item,
	Indicator,
};
