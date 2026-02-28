import {
	createNotchMachine,
	getNotchAttrs,
	FLUIX_SPRING,
	NOTCH_DEFAULTS,
	type NotchPosition,
	type NotchTrigger,
	type NotchTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import {
	type PropType,
	computed,
	defineComponent,
	h,
	onMounted,
	onUnmounted,
	ref,
	shallowRef,
	watch,
	watchEffect,
} from "vue";
import { createNotchHighlight } from "./notch-highlight";
import { createNotchAnimation } from "./notch-animation";

export const Notch = defineComponent({
	name: "FluixNotch",
	props: {
		trigger: { type: String as PropType<NotchTrigger>, default: "click" },
		position: { type: String as PropType<NotchPosition>, default: "top-center" },
		spring: { type: Object as PropType<SpringConfig>, required: false },
		dotSize: { type: Number, default: 36 },
		roundness: { type: Number, default: NOTCH_DEFAULTS.roundness },
		theme: { type: String as PropType<NotchTheme>, default: "dark" },
		fill: { type: String as PropType<string>, required: false },
		open: { type: Boolean as PropType<boolean | undefined>, default: undefined },
		onOpenChange: { type: Function as PropType<(open: boolean) => void>, required: false },
	},
	setup(props, { slots }) {
		const machine = createNotchMachine({
			position: props.position,
			trigger: props.trigger,
			roundness: props.roundness,
			fill: props.fill,
			spring: props.spring,
		});

		const snapshot = shallowRef(machine.store.getSnapshot());
		const rootEl = ref<HTMLDivElement | null>(null);
		const measureContentEl = ref<HTMLDivElement | null>(null);
		const contentEl = ref<HTMLDivElement | null>(null);
		const svgRectEl = ref<SVGRectElement | null>(null);
		const hoverBlobEl = ref<SVGRectElement | null>(null);
		const contentSize = ref({ w: 200, h: 44 });

		const highlight = createNotchHighlight();
		const anim = createNotchAnimation();

		const isOpen = computed(() => snapshot.value.open);
		const attrs = computed(() => getNotchAttrs({ open: isOpen.value, position: props.position, theme: props.theme }));
		const springConfig = computed(() => props.spring ?? FLUIX_SPRING);
		const blur = computed(() => Math.min(10, Math.max(6, props.roundness * 0.45)));

		const collapsedW = computed(() => props.dotSize);
		const collapsedH = computed(() => props.dotSize);
		const hlPad = 12;
		const expandedW = computed(() => contentSize.value.w + hlPad * 2);
		const expandedH = computed(() => Math.max(contentSize.value.h + hlPad, props.dotSize));
		const targetW = computed(() => (isOpen.value ? expandedW.value : collapsedW.value));
		const targetH = computed(() => (isOpen.value ? expandedH.value : collapsedH.value));
		const rootW = computed(() => Math.max(expandedW.value, collapsedW.value));
		const rootH = computed(() => Math.max(expandedH.value, collapsedH.value));

		// Subscribe to machine store
		onMounted(() => {
			const unsubscribe = machine.store.subscribe(() => { snapshot.value = machine.store.getSnapshot(); });
			onUnmounted(() => unsubscribe());
		});

		watch(
			() => [props.open, snapshot.value.open] as const,
			([controlledOpen, snapshotOpen]) => {
				if (controlledOpen !== undefined) {
					if (controlledOpen && !snapshotOpen) machine.open();
					else if (!controlledOpen && snapshotOpen) machine.close();
				}
			},
			{ immediate: true },
		);

		let prevOpenVal: boolean | undefined;
		watch(() => snapshot.value.open, (o) => {
			if (prevOpenVal !== undefined && prevOpenVal !== o) props.onOpenChange?.(o);
			prevOpenVal = o;
		});

		watch(
			() => [props.position, props.trigger, props.roundness, props.fill, props.spring] as const,
			([position, trigger, roundness, fill, spring]) => {
				machine.configure({ position, trigger, roundness, fill, spring });
			},
		);

		watchEffect((onCleanup) => {
			const el = measureContentEl.value;
			if (!el) return;
			const measure = () => {
				const r = el.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) contentSize.value = { w: Math.ceil(r.width), h: Math.ceil(r.height) };
			};
			measure();
			let raf = 0;
			const obs = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
			obs.observe(el);
			onCleanup(() => { cancelAnimationFrame(raf); obs.disconnect(); });
		});

		watchEffect(() => {
			const rect = svgRectEl.value;
			if (!rect) return;
			anim.init(rect, collapsedW.value, collapsedH.value, rootW.value, rootH.value);
		});

		watch(
			() => [targetW.value, targetH.value] as const,
			([tw, th]) => {
				const rect = svgRectEl.value;
				if (!rect) return;
				anim.animate(rect, {
					targetW: tw, targetH: th, rootW: rootW.value, rootH: rootH.value,
					collapsedW: collapsedW.value, collapsedH: collapsedH.value,
					roundness: props.roundness, springConfig: springConfig.value,
				});
			},
		);

		watchEffect((onCleanup) => {
			const ht = rootH.value;
			document.documentElement.style.setProperty("--fluix-notch-offset", `${ht}px`);
			onCleanup(() => document.documentElement.style.removeProperty("--fluix-notch-offset"));
		});

		onUnmounted(() => machine.destroy());

		// Highlight wrappers
		function onItemEnter(e: MouseEvent) {
			highlight.onItemEnter(e, {
				hoverBlobEl: hoverBlobEl.value, rootEl: rootEl.value,
				isOpen: isOpen.value, roundness: props.roundness, springConfig: springConfig.value,
			});
		}
		function resetHoverBlobImmediate() { highlight.resetImmediate(hoverBlobEl.value, rootW.value, rootH.value); }
		function onItemLeave() { highlight.onItemLeave(hoverBlobEl.value, springConfig.value); }

		// Event handlers
		function handleOpen() { if (props.open === undefined) machine.open(); else props.onOpenChange?.(true); }
		function handleClose() { if (props.open === undefined) machine.close(); else props.onOpenChange?.(false); }
		function handleToggle() { if (props.open === undefined) machine.toggle(); else props.onOpenChange?.(!snapshot.value.open); }
		function onMouseEnter() { if (props.trigger === "hover") handleOpen(); }
		function onMouseLeave() {
			if (props.trigger === "hover") { handleClose(); resetHoverBlobImmediate(); return; }
			onItemLeave();
		}
		function onClick() { if (props.trigger === "click") handleToggle(); }

		watch(isOpen, (open) => { if (!open) resetHoverBlobImmediate(); });

		return () => {
			const rw = rootW.value;
			const rh = rootH.value;
			const cw = collapsedW.value;
			const ch = collapsedH.value;
			const a = attrs.value;
			const fillVal = props.fill ?? "var(--fluix-notch-bg)";

			return h("div", null, [
				h("div", { "data-fluix-notch-measure": "", ref: measureContentEl }, slots.content?.()),
				h(
					"div",
					{
						ref: rootEl, ...a.root,
						role: "button", tabindex: 0, "aria-expanded": isOpen.value,
						style: `width:${rw}px;height:${rh}px;`,
						onMouseenter: onMouseEnter, onMouseleave: onMouseLeave,
						onMouseover: onItemEnter, onClick,
						onKeydown: (e: KeyboardEvent) => {
							if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
						},
					},
					[
						h("div", a.canvas, [
							h("svg", {
								xmlns: "http://www.w3.org/2000/svg", width: rw, height: rh,
								viewBox: `0 0 ${rw} ${rh}`, "aria-hidden": "true",
							}, [
								h("defs", [
									h("filter", {
										id: "fluix-notch-goo", x: "-20%", y: "-20%", width: "140%", height: "140%",
										"color-interpolation-filters": "sRGB",
									}, [
										h("feGaussianBlur", { in: "SourceGraphic", stdDeviation: blur.value, result: "blur" }),
										h("feColorMatrix", { in: "blur", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10", result: "goo" }),
										h("feComposite", { in: "SourceGraphic", in2: "goo", operator: "atop" }),
									]),
								]),
								h("g", { filter: "url(#fluix-notch-goo)" }, [
									h("rect", { ref: svgRectEl, x: (rw - cw) / 2, y: (rh - ch) / 2, width: cw, height: ch, rx: cw / 2, ry: ch / 2, fill: fillVal }),
									h("rect", { ref: hoverBlobEl, x: (rw - cw) / 2, y: (rh - ch) / 2, width: "0", height: "0", rx: "0", ry: "0", opacity: "0", fill: fillVal }),
								]),
							]),
						]),
						h("div", { ...a.pill, style: `width:${props.dotSize}px;height:${props.dotSize}px;` }, slots.pill?.()),
						h("div", { ref: contentEl, ...a.content }, slots.content?.()),
					],
				),
			]);
		};
	},
});
