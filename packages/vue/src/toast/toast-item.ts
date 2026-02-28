import {
	Toaster as CoreToaster,
	type FluixToastItem,
	TOAST_DEFAULTS,
	type ToastMachine,
} from "@fluix-ui/core";
import {
	type CSSProperties,
	type PropType,
	type VNode,
	computed,
	defineComponent,
	h,
	nextTick,
	onMounted,
	onUnmounted,
	ref,
	watch,
	watchEffect,
} from "vue";
import { renderIcon } from "./toast-icon";
import { useDismissState } from "./toast-dismiss";

const WIDTH = 350;
const HEIGHT = 40;
const PILL_CONTENT_PADDING = 16;
const HEADER_HORIZONTAL_PADDING_PX = 12;
const MIN_EXPAND_RATIO = 2.25;
const BODY_MERGE_OVERLAP = 6;

function getPillAlign(position: string): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

export const ToastItem = defineComponent({
	name: "FluixToastItem",
	props: {
		item: { type: Object as PropType<FluixToastItem>, required: true },
		machine: { type: Object as PropType<ToastMachine>, required: true },
		localState: { type: Object as PropType<{ ready: boolean; expanded: boolean }>, required: true },
	},
	emits: {
		localStateChange: (_patch: Partial<{ ready: boolean; expanded: boolean }>) => true,
	},
	setup(props, { emit }) {
		const rootRef = ref<HTMLElement | null>(null);
		const headerRef = ref<HTMLElement | null>(null);
		const headerInnerRef = ref<HTMLElement | null>(null);
		const contentRef = ref<HTMLElement | null>(null);
		const pillWidth = ref(HEIGHT);
		const contentHeight = ref(0);
		const frozenExpanded = ref(HEIGHT * MIN_EXPAND_RATIO);

		const dismiss = useDismissState();
		const doDismiss = () => {
			dismiss.requestDismiss(
				props.machine, props.item.id, hasDescription.value,
				() => emit("localStateChange", { expanded: false }),
			);
		};

		const attrs = computed(() => CoreToaster.getAttrs(props.item, props.localState));
		const hasDescription = computed(() => Boolean(props.item.description) || Boolean(props.item.button));
		const isLoading = computed(() => props.item.state === "loading");
		const open = computed(() => hasDescription.value && props.localState.expanded && !isLoading.value);
		const edge = computed(() => (props.item.position.startsWith("top") ? "bottom" : "top"));
		const pillAlign = computed(() => getPillAlign(props.item.position));
		const filterId = computed(() => `fluix-gooey-${props.item.id.replace(/[^a-z0-9-]/gi, "-")}`);
		const roundness = computed(() => props.item.roundness ?? TOAST_DEFAULTS.roundness);
		const blur = computed(() => Math.min(10, Math.max(6, roundness.value * 0.45)));
		const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
		const rawExpanded = computed(() =>
			hasDescription.value ? Math.max(minExpanded, HEIGHT + contentHeight.value) : minExpanded,
		);

		watch(() => open.value, (isOpen) => { if (isOpen) frozenExpanded.value = rawExpanded.value; }, { immediate: true });
		watch(rawExpanded, (val) => { if (open.value) frozenExpanded.value = val; });

		const expanded = computed(() => (open.value ? rawExpanded.value : frozenExpanded.value));
		const expandedContent = computed(() => Math.max(0, expanded.value - HEIGHT));
		const expandedHeight = computed(() => hasDescription.value ? Math.max(expanded.value, minExpanded) : HEIGHT);
		const resolvedPillWidth = computed(() => Math.max(HEIGHT, pillWidth.value));
		const pillX = computed(() => {
			if (pillAlign.value === "right") return WIDTH - resolvedPillWidth.value;
			if (pillAlign.value === "center") return (WIDTH - resolvedPillWidth.value) / 2;
			return 0;
		});

		const rootStyle = computed<CSSProperties>(() => ({
			"--_h": `${open.value ? expanded.value : HEIGHT}px`,
			"--_pw": `${resolvedPillWidth.value}px`,
			"--_px": `${pillX.value}px`,
			"--_ht": `translateY(${open.value ? (edge.value === "bottom" ? 3 : -3) : 0}px) scale(${open.value ? 0.9 : 1})`,
			"--_co": `${open.value ? 1 : 0}`,
			"--_cy": `${open.value ? 0 : -14}px`,
			"--_cm": `${open.value ? expandedContent.value : 0}px`,
			"--_by": `${open.value ? HEIGHT - BODY_MERGE_OVERLAP : HEIGHT}px`,
			"--_bh": `${open.value ? expandedContent.value : 0}px`,
			"--_bo": `${open.value ? 1 : 0}`,
		}));

		const measureContentHeight = () => {
			const element = contentRef.value;
			if (!element) return;
			contentHeight.value = element.scrollHeight;
		};

		// Measure pill width
		watchEffect((onCleanup) => {
			const headerElement = headerRef.value;
			const headerInner = headerInnerRef.value;
			if (!headerElement || !headerInner) return;
			let frame = 0;
			const measure = () => {
				const cs = getComputedStyle(headerElement);
				const hp = Number.parseFloat(cs.paddingLeft || "0") + Number.parseFloat(cs.paddingRight || "0");
				pillWidth.value = headerInner.getBoundingClientRect().width + hp + PILL_CONTENT_PADDING;
			};
			frame = requestAnimationFrame(measure);
			const observer = new ResizeObserver(measure);
			observer.observe(headerInner);
			onCleanup(() => { cancelAnimationFrame(frame); observer.disconnect(); });
		});

		// Ready timer
		onMounted(() => {
			const readyTimer = setTimeout(() => emit("localStateChange", { ready: true }), 32);
			onUnmounted(() => clearTimeout(readyTimer));
		});

		// Measure content height
		watchEffect((onCleanup) => {
			if (!hasDescription.value) { contentHeight.value = 0; return; }
			const element = contentRef.value;
			if (!element) return;
			measureContentHeight();
			let rafId = 0;
			const observer = new ResizeObserver(() => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(measureContentHeight); });
			observer.observe(element);
			onCleanup(() => { cancelAnimationFrame(rafId); observer.disconnect(); });
		}, { flush: "post" });

		watch(
			() => [props.item.instanceId, props.item.description, props.item.button?.title, props.localState.expanded] as const,
			() => { void nextTick(() => requestAnimationFrame(measureContentHeight)); },
			{ immediate: true },
		);

		// Auto-dismiss timer
		watch(
			() => [props.item.id, props.item.instanceId, props.item.duration] as const,
			(_next, _prev, onCleanup) => {
				if (props.item.duration == null || props.item.duration <= 0) return;
				const timer = setTimeout(() => {
					if (dismiss.hovering.value) { dismiss.pendingDismiss.value = true; return; }
					dismiss.pendingDismiss.value = false;
					doDismiss();
				}, props.item.duration);
				onCleanup(() => clearTimeout(timer));
			},
			{ immediate: true },
		);

		// Autopilot timers
		watch(
			() => [props.item.id, props.item.instanceId, props.item.autoExpandDelayMs, props.item.autoCollapseDelayMs, props.localState.ready] as const,
			(_next, _prev, onCleanup) => {
				if (!props.localState.ready) return;
				const timers: ReturnType<typeof setTimeout>[] = [];
				if (props.item.autoExpandDelayMs != null && props.item.autoExpandDelayMs > 0) {
					timers.push(setTimeout(() => {
						if (dismiss.dismissRequested.value) return;
						if (!dismiss.hovering.value) emit("localStateChange", { expanded: true });
					}, props.item.autoExpandDelayMs));
				}
				if (props.item.autoCollapseDelayMs != null && props.item.autoCollapseDelayMs > 0) {
					timers.push(setTimeout(() => {
						if (dismiss.dismissRequested.value) return;
						if (!dismiss.hovering.value) emit("localStateChange", { expanded: false });
					}, props.item.autoCollapseDelayMs));
				}
				onCleanup(() => { for (const t of timers) clearTimeout(t); });
			},
			{ immediate: true },
		);

		// Reset on instanceId change
		watch(() => props.item.instanceId, () => dismiss.reset(), { immediate: true });

		onUnmounted(() => dismiss.clearTimer());

		// Connect DOM events
		watchEffect((onCleanup) => {
			const element = rootRef.value;
			if (!element) return;
			const { destroy } = CoreToaster.connect(element, {
				onExpand: () => { if (props.item.exiting || dismiss.dismissRequested.value) return; emit("localStateChange", { expanded: true }); },
				onCollapse: () => { if (props.item.exiting || dismiss.dismissRequested.value) return; if (props.item.autopilot !== false) return; emit("localStateChange", { expanded: false }); },
				onDismiss: () => doDismiss(),
				onHoverStart: () => { dismiss.hovering.value = true; },
				onHoverEnd: () => {
					dismiss.hovering.value = false;
					if (dismiss.pendingDismiss.value && !dismiss.dismissRequested.value) { dismiss.pendingDismiss.value = false; doDismiss(); }
				},
			}, props.item);
			onCleanup(() => destroy());
		});

		return () => {
			const item = props.item;
			const toastAttrs = attrs.value;
			const descriptionChildren: (string | VNode)[] = [];

			if (typeof item.description === "string" || typeof item.description === "number") {
				descriptionChildren.push(String(item.description));
			}

			if (item.button) {
				descriptionChildren.push(
					h("button", {
						...toastAttrs.button, type: "button", class: item.styles?.button,
						onClick: (event: MouseEvent) => { event.stopPropagation(); item.button?.onClick(); },
					}, item.button.title),
				);
			}

			const children: VNode[] = [
				h("div", toastAttrs.canvas, [
					h("svg", {
						xmlns: "http://www.w3.org/2000/svg", "data-fluix-svg": "", width: WIDTH,
						height: expandedHeight.value, viewBox: `0 0 ${WIDTH} ${expandedHeight.value}`,
						style: { position: "absolute", left: "0px", top: "0px", overflow: "visible" },
						"aria-hidden": "true",
					}, [
						h("defs", [
							h("filter", {
								id: filterId.value, x: "-20%", y: "-20%", width: "140%", height: "140%",
								colorInterpolationFilters: "sRGB",
							}, [
								h("feGaussianBlur", { in: "SourceGraphic", stdDeviation: blur.value, result: "blur" }),
								h("feColorMatrix", { in: "blur", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10", result: "goo" }),
								h("feComposite", { in: "SourceGraphic", in2: "goo", operator: "atop" }),
							]),
						]),
						h("g", { filter: `url(#${filterId.value})` }, [
							h("rect", { "data-fluix-pill": "", x: pillX.value, y: 0, width: resolvedPillWidth.value, height: HEIGHT, rx: roundness.value, ry: roundness.value, fill: item.fill ?? "var(--fluix-surface-contrast)" }),
							h("rect", { "data-fluix-body": "", x: 0, y: HEIGHT, width: WIDTH, height: 0, rx: 0, ry: 0, fill: item.fill ?? "var(--fluix-surface-contrast)", opacity: 0 }),
						]),
					]),
				]),
				h("div", { ref: headerRef, ...toastAttrs.header, style: { paddingLeft: `${HEADER_HORIZONTAL_PADDING_PX}px`, paddingRight: `${HEADER_HORIZONTAL_PADDING_PX}px` } }, [
					h("div", { "data-fluix-header-stack": "" }, [
						h("div", { ref: headerInnerRef, "data-fluix-header-inner": "", "data-layer": "current" }, [
							h("div", { ...toastAttrs.badge, class: item.styles?.badge }, [renderIcon(item.icon, item.state)]),
							h("span", { ...toastAttrs.title, class: item.styles?.title }, item.title ?? item.state),
						]),
					]),
				]),
			];

			if (hasDescription.value) {
				children.push(
					h("div", toastAttrs.content, [
						h("div", { ref: contentRef, ...toastAttrs.description, class: item.styles?.description }, descriptionChildren),
					]),
				);
			}

			return h("button", { ref: rootRef, type: "button", ...toastAttrs.root, style: rootStyle.value }, children);
		};
	},
});
