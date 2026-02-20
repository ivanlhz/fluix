import {
	Toaster as CoreToaster,
	type FluixPosition,
	type FluixToastItem,
	type FluixToasterConfig,
	TOAST_DEFAULTS,
	type ToastMachine,
} from "@fluix-ui/core";
import {
	type CSSProperties,
	Fragment,
	type PropType,
	type VNode,
	computed,
	defineComponent,
	h,
	isVNode,
	nextTick,
	onMounted,
	onUnmounted,
	ref,
	shallowRef,
	watch,
	watchEffect,
} from "vue";

const WIDTH = 350;
const HEIGHT = 40;
const PILL_CONTENT_PADDING = 16;
const HEADER_HORIZONTAL_PADDING_PX = 12;
const MIN_EXPAND_RATIO = 2.25;
const BODY_MERGE_OVERLAP = 6;
const DISMISS_STAGE_DELAY_MS = 260;

type ToastLocalState = Record<string, { ready: boolean; expanded: boolean }>;

export interface ToasterProps {
	config?: FluixToasterConfig;
}

function resolveOffsetValue(value: number | string): string {
	return typeof value === "number" ? `${value}px` : value;
}

function getViewportOffsetStyle(
	offset: FluixToasterConfig["offset"],
	position: FluixPosition,
): CSSProperties {
	if (offset == null) return {};

	let top: string | undefined;
	let right: string | undefined;
	let bottom: string | undefined;
	let left: string | undefined;

	if (typeof offset === "number" || typeof offset === "string") {
		const resolved = resolveOffsetValue(offset);
		top = resolved;
		right = resolved;
		bottom = resolved;
		left = resolved;
	} else {
		if (offset.top != null) top = resolveOffsetValue(offset.top);
		if (offset.right != null) right = resolveOffsetValue(offset.right);
		if (offset.bottom != null) bottom = resolveOffsetValue(offset.bottom);
		if (offset.left != null) left = resolveOffsetValue(offset.left);
	}

	const style: CSSProperties = {};
	if (position.startsWith("top") && top) style.top = top;
	if (position.startsWith("bottom") && bottom) style.bottom = bottom;
	if (position.endsWith("right") && right) style.right = right;
	if (position.endsWith("left") && left) style.left = left;
	if (position.endsWith("center")) {
		if (left) style.paddingLeft = left;
		if (right) style.paddingRight = right;
	}
	return style;
}

function getPillAlign(position: FluixPosition): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

function renderIcon(icon: unknown, state: FluixToastItem["state"]): VNode | null {
	if (icon != null) {
		if (isVNode(icon)) return icon;
		return h("span", { "aria-hidden": "true" }, String(icon));
	}

	switch (state) {
		case "success":
			return h(
				"svg",
				{
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					"aria-hidden": "true",
				},
				[h("polyline", { points: "20 6 9 17 4 12" })],
			);
		case "error":
			return h(
				"svg",
				{
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					"aria-hidden": "true",
				},
				[
					h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
					h("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
				],
			);
		case "warning":
			return h(
				"svg",
				{
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					"aria-hidden": "true",
				},
				[
					h("path", {
						d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
					}),
					h("line", { x1: "12", y1: "9", x2: "12", y2: "13" }),
					h("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" }),
				],
			);
		case "info":
			return h(
				"svg",
				{
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					"aria-hidden": "true",
				},
				[
					h("circle", { cx: "12", cy: "12", r: "10" }),
					h("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
					h("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" }),
				],
			);
		case "loading":
			return h(
				"svg",
				{
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					"aria-hidden": "true",
					"data-fluix-icon": "spin",
				},
				[
					h("line", { x1: "12", y1: "2", x2: "12", y2: "6" }),
					h("line", { x1: "12", y1: "18", x2: "12", y2: "22" }),
					h("line", { x1: "4.93", y1: "4.93", x2: "7.76", y2: "7.76" }),
					h("line", { x1: "16.24", y1: "16.24", x2: "19.07", y2: "19.07" }),
					h("line", { x1: "2", y1: "12", x2: "6", y2: "12" }),
					h("line", { x1: "18", y1: "12", x2: "22", y2: "12" }),
					h("line", { x1: "4.93", y1: "19.07", x2: "7.76", y2: "16.24" }),
					h("line", { x1: "16.24", y1: "7.76", x2: "19.07", y2: "4.93" }),
				],
			);
		case "action":
			return h(
				"svg",
				{
					width: "14",
					height: "14",
					viewBox: "0 0 24 24",
					fill: "none",
					stroke: "currentColor",
					"stroke-width": "2.5",
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					"aria-hidden": "true",
				},
				[
					h("circle", { cx: "12", cy: "12", r: "10" }),
					h("polygon", {
						points: "10 8 16 12 10 16 10 8",
						fill: "currentColor",
						stroke: "none",
					}),
				],
			);
		default:
			return null;
	}
}

const ToastItem = defineComponent({
	name: "FluixToastItem",
	props: {
		item: {
			type: Object as PropType<FluixToastItem>,
			required: true,
		},
		machine: {
			type: Object as PropType<ToastMachine>,
			required: true,
		},
		localState: {
			type: Object as PropType<{ ready: boolean; expanded: boolean }>,
			required: true,
		},
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

		const hovering = ref(false);
		const pendingDismiss = ref(false);
		const dismissRequested = ref(false);
		const dismissTimer = ref<ReturnType<typeof setTimeout> | null>(null);

		const attrs = computed(() => CoreToaster.getAttrs(props.item, props.localState));
		const hasDescription = computed(
			() => Boolean(props.item.description) || Boolean(props.item.button),
		);
		const isLoading = computed(() => props.item.state === "loading");
		const open = computed(
			() => hasDescription.value && props.localState.expanded && !isLoading.value,
		);
		const edge = computed(() => (props.item.position.startsWith("top") ? "bottom" : "top"));
		const pillAlign = computed(() => getPillAlign(props.item.position));
		const filterId = computed(() => `fluix-gooey-${props.item.id.replace(/[^a-z0-9-]/gi, "-")}`);
		const roundness = computed(() => props.item.roundness ?? TOAST_DEFAULTS.roundness);
		const blur = computed(() => Math.min(10, Math.max(6, roundness.value * 0.45)));
		const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
		const frozenExpanded = ref(minExpanded);
		const rawExpanded = computed(() =>
			hasDescription.value ? Math.max(minExpanded, HEIGHT + contentHeight.value) : minExpanded,
		);

		watch(
			() => open.value,
			(isOpen) => {
				if (isOpen) frozenExpanded.value = rawExpanded.value;
			},
			{ immediate: true },
		);
		watch(rawExpanded, (val) => {
			if (open.value) frozenExpanded.value = val;
		});

		const expanded = computed(() => (open.value ? rawExpanded.value : frozenExpanded.value));
		const expandedContent = computed(() => Math.max(0, expanded.value - HEIGHT));
		const expandedHeight = computed(() =>
			hasDescription.value ? Math.max(expanded.value, minExpanded) : HEIGHT,
		);
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

		const clearDismissTimer = () => {
			if (dismissTimer.value) {
				clearTimeout(dismissTimer.value);
				dismissTimer.value = null;
			}
		};

		const measureContentHeight = () => {
			const element = contentRef.value;
			if (!element) return;
			contentHeight.value = element.scrollHeight;
		};

		const requestDismiss = () => {
			if (dismissRequested.value) return;
			dismissRequested.value = true;
			hovering.value = false;
			pendingDismiss.value = false;
			// Stage 1: collapse description area first.
			emit("localStateChange", { expanded: false });
			// Stage 2: trigger exiting state after a short delay.
			clearDismissTimer();
			dismissTimer.value = setTimeout(
				() => {
					props.machine.dismiss(props.item.id);
					dismissTimer.value = null;
				},
				hasDescription.value ? DISMISS_STAGE_DELAY_MS : 0,
			);
		};

		watchEffect((onCleanup) => {
			const headerElement = headerRef.value;
			const headerInner = headerInnerRef.value;
			if (!headerElement || !headerInner) return;

			let frame = 0;
			const measure = () => {
				const cs = getComputedStyle(headerElement);
				const horizontalPadding =
					Number.parseFloat(cs.paddingLeft || "0") + Number.parseFloat(cs.paddingRight || "0");
				const intrinsicWidth = headerInner.getBoundingClientRect().width;
				pillWidth.value = intrinsicWidth + horizontalPadding + PILL_CONTENT_PADDING;
			};

			// Wait one frame so initial layout is ready before measuring.
			frame = requestAnimationFrame(measure);

			const observer = new ResizeObserver(measure);
			observer.observe(headerInner);

			onCleanup(() => {
				cancelAnimationFrame(frame);
				observer.disconnect();
			});
		});

		onMounted(() => {
			const readyTimer = setTimeout(() => {
				emit("localStateChange", { ready: true });
			}, 32);
			return () => clearTimeout(readyTimer);
		});

		watchEffect(
			(onCleanup) => {
				if (!hasDescription.value) {
					contentHeight.value = 0;
					return;
				}
				const element = contentRef.value;
				if (!element) return;

				measureContentHeight();

				let rafId = 0;
				const observer = new ResizeObserver(() => {
					cancelAnimationFrame(rafId);
					rafId = requestAnimationFrame(measureContentHeight);
				});
				observer.observe(element);

				onCleanup(() => {
					cancelAnimationFrame(rafId);
					observer.disconnect();
				});
			},
			{ flush: "post" },
		);

		watch(
			() =>
				[
					props.item.instanceId,
					props.item.description,
					props.item.button?.title,
					props.localState.expanded,
				] as const,
			() => {
				void nextTick(() => {
					requestAnimationFrame(() => {
						measureContentHeight();
					});
				});
			},
			{ immediate: true },
		);

		watch(
			() => [props.item.id, props.item.instanceId, props.item.duration] as const,
			(_next, _prev, onCleanup) => {
				if (props.item.duration == null || props.item.duration <= 0) return;
				const timer = setTimeout(() => {
					if (hovering.value) {
						pendingDismiss.value = true;
						return;
					}
					pendingDismiss.value = false;
					requestDismiss();
				}, props.item.duration);

				onCleanup(() => clearTimeout(timer));
			},
			{ immediate: true },
		);

		watch(
			() =>
				[
					props.item.id,
					props.item.instanceId,
					props.item.autoExpandDelayMs,
					props.item.autoCollapseDelayMs,
					props.localState.ready,
				] as const,
			(_next, _prev, onCleanup) => {
				if (!props.localState.ready) return;

				const timers: Array<ReturnType<typeof setTimeout>> = [];
				if (props.item.autoExpandDelayMs != null && props.item.autoExpandDelayMs > 0) {
					timers.push(
						setTimeout(() => {
							if (dismissRequested.value) return;
							if (!hovering.value) emit("localStateChange", { expanded: true });
						}, props.item.autoExpandDelayMs),
					);
				}
				if (props.item.autoCollapseDelayMs != null && props.item.autoCollapseDelayMs > 0) {
					timers.push(
						setTimeout(() => {
							if (dismissRequested.value) return;
							if (!hovering.value) emit("localStateChange", { expanded: false });
						}, props.item.autoCollapseDelayMs),
					);
				}

				onCleanup(() => {
					for (const timer of timers) clearTimeout(timer);
				});
			},
			{ immediate: true },
		);

		watch(
			() => props.item.instanceId,
			() => {
				hovering.value = false;
				pendingDismiss.value = false;
				dismissRequested.value = false;
				clearDismissTimer();
			},
			{ immediate: true },
		);

		onUnmounted(() => {
			clearDismissTimer();
		});

		watchEffect((onCleanup) => {
			const element = rootRef.value;
			if (!element) return;

			const callbacks = {
				onExpand: () => {
					if (props.item.exiting || dismissRequested.value) return;
					emit("localStateChange", { expanded: true });
				},
				onCollapse: () => {
					if (props.item.exiting || dismissRequested.value) return;
					if (props.item.autopilot !== false) return;
					emit("localStateChange", { expanded: false });
				},
				onDismiss: () => {
					requestDismiss();
				},
				onHoverStart: () => {
					hovering.value = true;
				},
				onHoverEnd: () => {
					hovering.value = false;
					if (pendingDismiss.value && !dismissRequested.value) {
						pendingDismiss.value = false;
						requestDismiss();
					}
				},
			};

			const { destroy } = CoreToaster.connect(element, callbacks, props.item);
			onCleanup(() => destroy());
		});

		return () => {
			const item = props.item;
			const toastAttrs = attrs.value;
			const descriptionChildren: Array<string | VNode> = [];

			if (typeof item.description === "string" || typeof item.description === "number") {
				descriptionChildren.push(String(item.description));
			} else if (isVNode(item.description)) {
				descriptionChildren.push(item.description);
			}

			if (item.button) {
				descriptionChildren.push(
					h(
						"button",
						{
							...toastAttrs.button,
							type: "button",
							class: item.styles?.button,
							onClick: (event: MouseEvent) => {
								event.stopPropagation();
								item.button?.onClick();
							},
						},
						item.button.title,
					),
				);
			}

			const children: VNode[] = [
				h("div", toastAttrs.canvas, [
					h(
						"svg",
						{
							xmlns: "http://www.w3.org/2000/svg",
							"data-fluix-svg": "",
							width: WIDTH,
							height: expandedHeight.value,
							viewBox: `0 0 ${WIDTH} ${expandedHeight.value}`,
							style: {
								position: "absolute",
								left: "0px",
								top: "0px",
								overflow: "visible",
							},
							"aria-hidden": "true",
						},
						[
							h("defs", [
								h(
									"filter",
									{
										id: filterId.value,
										x: "-20%",
										y: "-20%",
										width: "140%",
										height: "140%",
										colorInterpolationFilters: "sRGB",
									},
									[
										h("feGaussianBlur", {
											in: "SourceGraphic",
											stdDeviation: blur.value,
											result: "blur",
										}),
										h("feColorMatrix", {
											in: "blur",
											type: "matrix",
											values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10",
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
							h("g", { filter: `url(#${filterId.value})` }, [
								h("rect", {
									"data-fluix-pill": "",
									x: pillX.value,
									y: 0,
									width: resolvedPillWidth.value,
									height: HEIGHT,
									rx: roundness.value,
									ry: roundness.value,
									fill: item.fill ?? "var(--fluix-surface-contrast)",
								}),
								h("rect", {
									"data-fluix-body": "",
									x: 0,
									y: HEIGHT,
									width: WIDTH,
									height: 0,
									rx: 0,
									ry: 0,
									fill: item.fill ?? "var(--fluix-surface-contrast)",
									opacity: 0,
								}),
							]),
						],
					),
				]),
				h(
					"div",
					{
						ref: headerRef,
						...toastAttrs.header,
						style: {
							paddingLeft: `${HEADER_HORIZONTAL_PADDING_PX}px`,
							paddingRight: `${HEADER_HORIZONTAL_PADDING_PX}px`,
						},
					},
					[
						h("div", { "data-fluix-header-stack": "" }, [
							h(
								"div",
								{
									ref: headerInnerRef,
									"data-fluix-header-inner": "",
									"data-layer": "current",
								},
								[
									h(
										"div",
										{
											...toastAttrs.badge,
											class: item.styles?.badge,
										},
										[renderIcon(item.icon, item.state)],
									),
									h(
										"span",
										{
											...toastAttrs.title,
											class: item.styles?.title,
										},
										item.title ?? item.state,
									),
								],
							),
						]),
					],
				),
			];

			if (hasDescription.value) {
				children.push(
					h("div", toastAttrs.content, [
						h(
							"div",
							{
								ref: contentRef,
								...toastAttrs.description,
								class: item.styles?.description,
							},
							descriptionChildren,
						),
					]),
				);
			}

			return h(
				"button",
				{
					ref: rootRef,
					type: "button",
					...toastAttrs.root,
					style: rootStyle.value,
				},
				children,
			);
		};
	},
});

export function useFluixToasts() {
	const machine = CoreToaster.getMachine();
	const snapshot = shallowRef(machine.store.getSnapshot());

	onMounted(() => {
		const unsubscribe = machine.store.subscribe(() => {
			snapshot.value = machine.store.getSnapshot();
		});
		onUnmounted(() => unsubscribe());
	});

	const toasts = computed(() => snapshot.value.toasts);
	const config = computed(() => snapshot.value.config);

	return {
		machine,
		snapshot,
		toasts,
		config,
	};
}

export const Toaster = defineComponent({
	name: "FluixToaster",
	props: {
		config: {
			type: Object as PropType<FluixToasterConfig>,
			required: false,
		},
	},
	setup(props) {
		const { machine, snapshot } = useFluixToasts();
		const localState = ref<ToastLocalState>({});

		watch(
			() => props.config,
			(nextConfig) => {
				if (nextConfig) machine.configure(nextConfig);
			},
			{ deep: true, immediate: true },
		);

		watch(
			() => snapshot.value.toasts,
			(toasts) => {
				const ids = new Set(toasts.map((toast) => toast.id));
				const next: ToastLocalState = {};

				for (const id of ids) {
					next[id] = localState.value[id] ?? { ready: false, expanded: false };
				}
				localState.value = next;
			},
			{ immediate: true },
		);

		const byPosition = computed(() => {
			const grouped = new Map<FluixPosition, FluixToastItem[]>();
			for (const toast of snapshot.value.toasts) {
				const current = grouped.get(toast.position) ?? [];
				current.push(toast);
				grouped.set(toast.position, current);
			}
			return grouped;
		});

		const resolvedOffset = computed(() => snapshot.value.config?.offset ?? props.config?.offset);
		const resolvedLayout = computed(
			() => snapshot.value.config?.layout ?? props.config?.layout ?? "stack",
		);

		const setToastLocal = (id: string, patch: Partial<{ ready: boolean; expanded: boolean }>) => {
			localState.value = {
				...localState.value,
				[id]: {
					ready: localState.value[id]?.ready ?? false,
					expanded: localState.value[id]?.expanded ?? false,
					...patch,
				},
			};
		};

		return () =>
			h(
				Fragment,
				null,
				Array.from(byPosition.value.entries()).map(([position, toasts]) =>
					h(
						"section",
						{
							key: position,
							...CoreToaster.getViewportAttrs(position, resolvedLayout.value),
							style: getViewportOffsetStyle(resolvedOffset.value, position),
						},
						toasts.map((item) =>
							h(ToastItem, {
								key: item.instanceId,
								item,
								machine,
								localState: localState.value[item.id] ?? {
									ready: false,
									expanded: false,
								},
								onLocalStateChange: (patch: Partial<{ ready: boolean; expanded: boolean }>) =>
									setToastLocal(item.id, patch),
							}),
						),
					),
				),
			);
	},
});
