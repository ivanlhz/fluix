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
	type PropType,
	computed,
	defineComponent,
	h,
	onMounted,
	onUnmounted,
	provide,
	ref,
	shallowRef,
	watch,
	watchEffect,
} from "vue";
import { MENU_CONTEXT_KEY } from "./menu-context";
import { renderIndicatorSvg } from "./menu-indicator";

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
		const ghostIndicatorNode = ref<SVGRectElement | null>(null);
		const size = ref({ width: 0, height: 0 });

		const activeIdRef = { current: snapshot.value.activeId };
		const lastActiveNotifiedRef = { current: snapshot.value.activeId };
		const connectionRef = { current: null as ReturnType<typeof connectMenu> | null };
		const filterId = `fluix-menu-goo-${Math.random().toString(36).slice(2, 8)}`;

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

		watch(() => snapshot.value.activeId, (id) => { activeIdRef.current = id; });

		watch(
			() => [props.orientation, props.variant, props.spring, props.roundness, props.blur, props.fill] as const,
			([orientation, variant, spring, roundness, blur, fill]) => {
				machine.configure({ orientation, variant, spring, roundness, blur, fill });
			},
		);

		watch(() => props.activeId, (controlledActiveId) => {
			if (controlledActiveId !== undefined) machine.setActive(controlledActiveId ?? null);
		});

		watch(() => snapshot.value.activeId, (nextActiveId) => {
			if (nextActiveId && lastActiveNotifiedRef.current !== nextActiveId && props.onActiveChange) {
				props.onActiveChange(nextActiveId);
			}
			lastActiveNotifiedRef.current = nextActiveId;
		});

		watchEffect((onCleanup) => {
			const root = rootEl.value;
			if (!root) return;
			const measure = () => {
				const rect = root.getBoundingClientRect();
				const w = Math.ceil(rect.width);
				const ht = Math.ceil(rect.height);
				if (size.value.width !== w || size.value.height !== ht) size.value = { width: w, height: ht };
			};
			measure();
			let raf = 0;
			const observer = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
			observer.observe(root);
			onCleanup(() => { cancelAnimationFrame(raf); observer.disconnect(); });
		});

		watchEffect((onCleanup) => {
			const root = rootEl.value;
			const indicator = indicatorNode.value;
			if (!root || !indicator) return;
			const connection = connectMenu({
				root, indicator, ghostIndicator: ghostIndicatorNode.value,
				getActiveId: () => activeIdRef.current,
				onSelect(id) {
					if (props.activeId === undefined) machine.setActive(id);
					else props.onActiveChange?.(id);
				},
				spring: springConfig.value, variant: props.variant, orientation: props.orientation,
			});
			connectionRef.current = connection;
			onCleanup(() => { connection.destroy(); connectionRef.current = null; });
		});

		watch(
			() => [snapshot.value.activeId, size.value.width, size.value.height] as const,
			() => { connectionRef.current?.sync(false); },
		);

		onUnmounted(() => machine.destroy());

		const setActive = (id: string) => {
			if (props.activeId === undefined) machine.setActive(id);
			else props.onActiveChange?.(id);
		};
		const registerIndicator = (node: SVGRectElement | SVGPathElement | null) => { indicatorNode.value = node; };
		const registerGhostIndicator = (node: SVGRectElement | null) => { ghostIndicatorNode.value = node; };

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
			registerGhostIndicator,
			rootEl: () => rootEl.value,
		});

		return () => {
			const a = attrs.value;
			const w = Math.max(1, size.value.width);
			const ht = Math.max(1, size.value.height);

			const indicatorSvg = renderIndicatorSvg({
				isTab: props.variant === "tab",
				filterId,
				resolvedBlur: resolvedBlur.value,
				effectiveFill: props.fill ?? "var(--fluix-menu-indicator)",
				width: w,
				height: ht,
				indicatorAttrs: a.indicator,
				registerIndicator,
				registerGhostIndicator,
				canvasAttrs: a.canvas,
			});

			return h(
				"nav",
				{ ref: rootEl, ...a.root, class: props.className, "aria-label": "Fluix menu" },
				[indicatorSvg, h("div", a.list, slots.default?.())],
			);
		};
	},
});
