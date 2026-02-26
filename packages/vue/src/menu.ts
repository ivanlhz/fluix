import {
	FLUIX_SPRING,
	MENU_DEFAULTS,
	connectMenu,
	createMenuMachine,
	getMenuAttrs,
	type MenuMachineState,
	type MenuOrientation,
	type MenuVariant,
	type MenuTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import {
	type InjectionKey,
	type PropType,
	computed,
	defineComponent,
	h,
	inject,
	onMounted,
	onUnmounted,
	provide,
	ref,
	shallowRef,
	watch,
	watchEffect,
} from "vue";

const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

interface MenuContextValue {
	activeId: () => string | null;
	setActive: (id: string) => void;
	attrs: () => ReturnType<typeof getMenuAttrs>;
	variant: () => MenuVariant;
	filterId: string;
	fill: () => string | undefined;
	blur: () => number;
	size: () => { width: number; height: number };
	registerIndicator: (node: SVGRectElement | SVGPathElement | null) => void;
	rootEl: () => HTMLElement | null;
}

const MENU_CONTEXT_KEY: InjectionKey<MenuContextValue> = Symbol("fluix-menu");

function useMenuContext(): MenuContextValue {
	const context = inject(MENU_CONTEXT_KEY);
	if (!context) {
		throw new Error("Menu components must be used inside <MenuRoot>.");
	}
	return context;
}

export const MenuRoot = defineComponent({
	name: "FluixMenuRoot",
	props: {
		orientation: {
			type: String as PropType<MenuOrientation>,
			default: MENU_DEFAULTS.orientation,
		},
		variant: {
			type: String as PropType<MenuVariant>,
			default: "pill",
		},
		theme: {
			type: String as PropType<MenuTheme>,
			default: "dark",
		},
		activeId: {
			type: String as PropType<string | null | undefined>,
			default: undefined,
		},
		defaultActiveId: {
			type: String as PropType<string | null>,
			default: null,
		},
		onActiveChange: {
			type: Function as PropType<(id: string) => void>,
			required: false,
		},
		spring: {
			type: Object as PropType<SpringConfig>,
			required: false,
		},
		roundness: {
			type: Number,
			default: MENU_DEFAULTS.roundness,
		},
		blur: {
			type: Number as PropType<number | undefined>,
			default: undefined,
		},
		fill: {
			type: String as PropType<string>,
			required: false,
		},
		className: {
			type: String,
			required: false,
		},
	},
	setup(props, { slots }) {
		const machine = createMenuMachine({
			orientation: props.orientation,
			variant: props.variant,
			spring: props.spring,
			roundness: props.roundness,
			blur: props.blur,
			fill: props.fill,
			initialActiveId: props.activeId ?? props.defaultActiveId,
		});

		const snapshot = shallowRef<MenuMachineState>(machine.store.getSnapshot());

		const rootEl = ref<HTMLElement | null>(null);
		const indicatorNode = ref<SVGRectElement | SVGPathElement | null>(null);
		const size = ref({ width: 0, height: 0 });

		const activeIdRef = { current: snapshot.value.activeId };
		const lastActiveNotifiedRef = { current: snapshot.value.activeId };
		const connectionRef = { current: null as ReturnType<typeof connectMenu> | null };

		let filterId = `fluix-menu-goo-${Math.random().toString(36).slice(2, 8)}`;

		const attrs = computed(() =>
			getMenuAttrs({ orientation: props.orientation!, theme: props.theme, variant: props.variant }),
		);
		const resolvedBlur = computed(() =>
			props.blur ?? Math.min(10, Math.max(6, props.roundness * 0.45)),
		);
		const springConfig = computed(() => props.spring ?? FLUIX_SPRING);

		// Subscribe to machine store
		onMounted(() => {
			const unsubscribe = machine.store.subscribe(() => {
				snapshot.value = machine.store.getSnapshot();
			});
			onUnmounted(() => unsubscribe());
		});

		// Keep activeIdRef in sync
		watch(
			() => snapshot.value.activeId,
			(id) => {
				activeIdRef.current = id;
			},
		);

		// Reconfigure machine when props change
		watch(
			() => [props.orientation, props.variant, props.spring, props.roundness, props.blur, props.fill] as const,
			([orientation, variant, spring, roundness, blur, fill]) => {
				machine.configure({ orientation, variant, spring, roundness, blur, fill });
			},
		);

		// Sync controlled activeId
		watch(
			() => props.activeId,
			(controlledActiveId) => {
				if (controlledActiveId !== undefined) {
					machine.setActive(controlledActiveId ?? null);
				}
			},
		);

		// Notify parent of active changes
		watch(
			() => snapshot.value.activeId,
			(nextActiveId) => {
				if (
					nextActiveId &&
					lastActiveNotifiedRef.current !== nextActiveId &&
					props.onActiveChange
				) {
					props.onActiveChange(nextActiveId);
				}
				lastActiveNotifiedRef.current = nextActiveId;
			},
		);

		// ResizeObserver for root element
		watchEffect((onCleanup) => {
			const root = rootEl.value;
			if (!root) return;

			const measure = () => {
				const rect = root.getBoundingClientRect();
				const width = Math.ceil(rect.width);
				const height = Math.ceil(rect.height);
				const prev = size.value;
				if (prev.width !== width || prev.height !== height) {
					size.value = { width, height };
				}
			};

			measure();
			let raf = 0;
			const observer = new ResizeObserver(() => {
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(measure);
			});
			observer.observe(root);

			onCleanup(() => {
				cancelAnimationFrame(raf);
				observer.disconnect();
			});
		});

		// Connect menu indicator
		watchEffect((onCleanup) => {
			const root = rootEl.value;
			const indicator = indicatorNode.value;
			if (!root || !indicator) return;

			const connection = connectMenu({
				root,
				indicator,
				getActiveId: () => activeIdRef.current,
				onSelect(id) {
					if (props.activeId === undefined) {
						machine.setActive(id);
					} else {
						props.onActiveChange?.(id);
					}
				},
				spring: springConfig.value,
				variant: props.variant,
				orientation: props.orientation,
			});

			connectionRef.current = connection;

			onCleanup(() => {
				connection.destroy();
				connectionRef.current = null;
			});
		});

		// Sync indicator when active id or size changes
		watch(
			() => [snapshot.value.activeId, size.value.width, size.value.height] as const,
			() => {
				connectionRef.current?.sync(false);
			},
		);

		// Cleanup machine on unmount
		onUnmounted(() => {
			machine.destroy();
		});

		// Context
		const setActive = (id: string) => {
			if (props.activeId === undefined) {
				machine.setActive(id);
			} else {
				props.onActiveChange?.(id);
			}
		};

		const registerIndicator = (node: SVGRectElement | SVGPathElement | null) => {
			indicatorNode.value = node;
		};

		provide(MENU_CONTEXT_KEY, {
			activeId: () => snapshot.value.activeId,
			setActive,
			attrs: () => attrs.value,
			variant: () => props.variant!,
			filterId,
			fill: () => props.fill,
			blur: () => resolvedBlur.value,
			size: () => size.value,
			registerIndicator,
			rootEl: () => rootEl.value,
		});

		// Render
		return () => {
			const a = attrs.value;
			const w = Math.max(1, size.value.width);
			const ht = Math.max(1, size.value.height);
			const effectiveFill = props.fill ?? "var(--fluix-menu-indicator)";
			const isTab = props.variant === "tab";

			const svgChildren: any[] = [];

			if (!isTab) {
				svgChildren.push(
					h("defs", [
						h(
							"filter",
							{
								id: filterId,
								x: "-20%",
								y: "-20%",
								width: "140%",
								height: "140%",
								"color-interpolation-filters": "sRGB",
							},
							[
								h("feGaussianBlur", {
									in: "SourceGraphic",
									stdDeviation: resolvedBlur.value,
									result: "blur",
								}),
								h("feColorMatrix", {
									in: "blur",
									type: "matrix",
									values: GOO_MATRIX,
									result: "goo",
								}),
								h("feComposite", {
									in: "SourceGraphic",
									in2: "goo",
									operator: "atop",
								}),
							],
						),
					]),
				);
			}

			if (isTab) {
				svgChildren.push(
					h("path", {
						ref: (el: any) => registerIndicator(el),
						...a.indicator,
						d: "",
						opacity: 0,
						style: { fill: effectiveFill },
					}),
				);
			} else {
				svgChildren.push(
					h("g", { filter: `url(#${filterId})` }, [
						h("rect", {
							ref: (el: any) => registerIndicator(el),
							...a.indicator,
							x: 0,
							y: 0,
							width: 0,
							height: 0,
							rx: 0,
							ry: 0,
							opacity: 0,
							style: { fill: effectiveFill },
						}),
					]),
				);
			}

			const indicatorSvg = h("div", a.canvas, [
				h(
					"svg",
					{
						xmlns: "http://www.w3.org/2000/svg",
						width: w,
						height: ht,
						viewBox: `0 0 ${w} ${ht}`,
						"aria-hidden": "true",
					},
					svgChildren,
				),
			]);

			return h(
				"nav",
				{
					ref: rootEl,
					...a.root,
					class: props.className,
					"aria-label": "Fluix menu",
				},
				[indicatorSvg, h("div", a.list, slots.default?.())],
			);
		};
	},
});

export const MenuItem = defineComponent({
	name: "FluixMenuItem",
	props: {
		id: {
			type: String,
			required: true,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		className: {
			type: String,
			required: false,
		},
	},
	setup(props, { slots }) {
		const context = useMenuContext();

		return () => {
			const active = context.activeId() === props.id;
			const itemAttrs = context.attrs().item({ id: props.id, active, disabled: props.disabled });

			const handleClick = () => {
				if (props.disabled) return;
				context.setActive(props.id);
			};

			return h(
				"button",
				{
					type: "button",
					...itemAttrs,
					disabled: props.disabled,
					class: props.className,
					onClick: handleClick,
				},
				slots.default?.(),
			);
		};
	},
});
