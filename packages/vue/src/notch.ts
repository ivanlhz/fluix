import {
	createNotchMachine,
	getNotchAttrs,
	animateSpring,
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

export const Notch = defineComponent({
	name: "FluixNotch",
	props: {
		trigger: {
			type: String as PropType<NotchTrigger>,
			default: "click",
		},
		position: {
			type: String as PropType<NotchPosition>,
			default: "top-center",
		},
		spring: {
			type: Object as PropType<SpringConfig>,
			required: false,
		},
		dotSize: {
			type: Number,
			default: 36,
		},
		roundness: {
			type: Number,
			default: NOTCH_DEFAULTS.roundness,
		},
		theme: {
			type: String as PropType<NotchTheme>,
			default: "dark",
		},
		fill: {
			type: String as PropType<string>,
			required: false,
		},
		open: {
			type: Boolean as PropType<boolean | undefined>,
			default: undefined,
		},
		onOpenChange: {
			type: Function as PropType<(open: boolean) => void>,
			required: false,
		},
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

		// Element refs
		const rootEl = ref<HTMLDivElement | null>(null);
		const measureContentEl = ref<HTMLDivElement | null>(null);
		const contentEl = ref<HTMLDivElement | null>(null);
		const svgRectEl = ref<SVGRectElement | null>(null);
		const highlightRectEl = ref<SVGRectElement | null>(null);

		// Content measurement
		const contentSize = ref({ w: 200, h: 44 });

		// Animation tracking (mutable, non-reactive)
		const prev = { w: 0, h: 0, initialized: false };
		let currentAnim: Animation | null = null;
		let highlightAnim: Animation | null = null;
		const hlPrev = { x: 0, y: 0, w: 0, h: 0, visible: false };

		// Derived state
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
			const unsubscribe = machine.store.subscribe(() => {
				snapshot.value = machine.store.getSnapshot();
			});
			onUnmounted(() => unsubscribe());
		});

		// Sync controlled open prop
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

		// Notify parent of open changes
		let prevOpenVal: boolean | undefined;
		watch(
			() => snapshot.value.open,
			(o) => {
				if (prevOpenVal !== undefined && prevOpenVal !== o) props.onOpenChange?.(o);
				prevOpenVal = o;
			},
		);

		// Reconfigure machine when props change
		watch(
			() => [props.position, props.trigger, props.roundness, props.fill, props.spring] as const,
			([position, trigger, roundness, fill, spring]) => {
				machine.configure({ position, trigger, roundness, fill, spring });
			},
		);

		// Measure hidden content with ResizeObserver
		watchEffect((onCleanup) => {
			const el = measureContentEl.value;
			if (!el) return;
			const measure = () => {
				const r = el.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) {
					contentSize.value = { w: Math.ceil(r.width), h: Math.ceil(r.height) };
				}
			};
			measure();
			let raf = 0;
			const obs = new ResizeObserver(() => {
				cancelAnimationFrame(raf);
				raf = requestAnimationFrame(measure);
			});
			obs.observe(el);
			onCleanup(() => {
				cancelAnimationFrame(raf);
				obs.disconnect();
			});
		});

		// Init SVG rect to collapsed size
		watchEffect(() => {
			const rect = svgRectEl.value;
			if (!rect || prev.initialized) return;
			prev.w = collapsedW.value;
			prev.h = collapsedH.value;
			prev.initialized = true;

			const cx = (rootW.value - collapsedW.value) / 2;
			const cy = (rootH.value - collapsedH.value) / 2;
			rect.setAttribute("width", String(collapsedW.value));
			rect.setAttribute("height", String(collapsedH.value));
			rect.setAttribute("x", String(cx));
			rect.setAttribute("y", String(cy));
			rect.setAttribute("rx", String(collapsedW.value / 2));
			rect.setAttribute("ry", String(collapsedH.value / 2));
		});

		// Animate SVG rect on open/close
		watch(
			() => [targetW.value, targetH.value] as const,
			([tw, th]) => {
				const rect = svgRectEl.value;
				if (!rect || !prev.initialized) return;

				if (tw === prev.w && th === prev.h) return;

				if (currentAnim) {
					currentAnim.cancel();
					currentAnim = null;
				}

				const fromW = prev.w;
				const fromH = prev.h;
				const rw = rootW.value;
				const rh = rootH.value;
				const fromX = (rw - fromW) / 2;
				const fromY = (rh - fromH) / 2;
				const toX = (rw - tw) / 2;
				const toY = (rh - th) / 2;

				prev.w = tw;
				prev.h = th;

				const cw = collapsedW.value;
				const ch = collapsedH.value;
				const isCollapsing = tw === cw && th === ch;
				const wasCollapsed = fromW === cw && fromH === ch;
				const fromRx = wasCollapsed ? cw / 2 : props.roundness;
				const toRx = isCollapsing ? cw / 2 : props.roundness;

				const a = animateSpring(
					rect,
					{
						width: { from: fromW, to: tw, unit: "px" },
						height: { from: fromH, to: th, unit: "px" },
						x: { from: fromX, to: toX, unit: "px" },
						y: { from: fromY, to: toY, unit: "px" },
						rx: { from: fromRx, to: toRx, unit: "px" },
						ry: { from: fromRx, to: toRx, unit: "px" },
					},
					springConfig.value,
				);

				if (a) {
					currentAnim = a;
					a.onfinish = () => {
						currentAnim = null;
						rect.setAttribute("width", String(tw));
						rect.setAttribute("height", String(th));
						rect.setAttribute("x", String(toX));
						rect.setAttribute("y", String(toY));
						rect.setAttribute("rx", String(toRx));
						rect.setAttribute("ry", String(toRx));
					};
				} else {
					rect.setAttribute("width", String(tw));
					rect.setAttribute("height", String(th));
					rect.setAttribute("x", String(toX));
					rect.setAttribute("y", String(toY));
					rect.setAttribute("rx", String(toRx));
					rect.setAttribute("ry", String(toRx));
				}
			},
		);

		// Reset highlight when closing
		watch(isOpen, (open) => {
			if (!open) onItemLeave();
		});

		// Expose notch height as CSS variable for toast collision avoidance
		watchEffect((onCleanup) => {
			const h = rootH.value;
			document.documentElement.style.setProperty("--fluix-notch-offset", `${h}px`);
			onCleanup(() => {
				document.documentElement.style.removeProperty("--fluix-notch-offset");
			});
		});

		// Cleanup machine on unmount
		onUnmounted(() => {
			machine.destroy();
		});

		// --- Highlight blob ---
		function onItemEnter(e: MouseEvent) {
			const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
			const rect = highlightRectEl.value;
			const root = rootEl.value;
			if (!target || !rect || !root || !isOpen.value) return;

			const rootRect = root.getBoundingClientRect();
			const itemW = target.offsetWidth;
			const itemH = target.offsetHeight;
			const itemRect = target.getBoundingClientRect();
			const itemCenterX = itemRect.left + itemRect.width / 2;
			const itemCenterY = itemRect.top + itemRect.height / 2;

			const padX = 8;
			const padY = 4;
			const toW = itemW + padX * 2;
			const toH = itemH + padY * 2;
			const toX = itemCenterX - rootRect.left - toW / 2;
			const toY = itemCenterY - rootRect.top - toH / 2;
			const toRx = toH / 2;

			if (!hlPrev.visible) {
				rect.setAttribute("x", String(toX));
				rect.setAttribute("y", String(toY));
				rect.setAttribute("width", String(toW));
				rect.setAttribute("height", String(toH));
				rect.setAttribute("rx", String(toRx));
				rect.setAttribute("ry", String(toRx));
				rect.setAttribute("opacity", "1");
				hlPrev.x = toX;
				hlPrev.y = toY;
				hlPrev.w = toW;
				hlPrev.h = toH;
				hlPrev.visible = true;
				return;
			}

			if (highlightAnim) {
				highlightAnim.cancel();
				highlightAnim = null;
			}

			const sc = springConfig.value;
			const a = animateSpring(
				rect,
				{
					x: { from: hlPrev.x, to: toX, unit: "px" },
					y: { from: hlPrev.y, to: toY, unit: "px" },
					width: { from: hlPrev.w, to: toW, unit: "px" },
					height: { from: hlPrev.h, to: toH, unit: "px" },
					rx: { from: hlPrev.h / 2, to: toRx, unit: "px" },
					ry: { from: hlPrev.h / 2, to: toRx, unit: "px" },
				},
				{ ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 },
			);

			hlPrev.x = toX;
			hlPrev.y = toY;
			hlPrev.w = toW;
			hlPrev.h = toH;

			if (a) {
				highlightAnim = a;
				a.onfinish = () => {
					highlightAnim = null;
					rect.setAttribute("x", String(toX));
					rect.setAttribute("y", String(toY));
					rect.setAttribute("width", String(toW));
					rect.setAttribute("height", String(toH));
					rect.setAttribute("rx", String(toRx));
					rect.setAttribute("ry", String(toRx));
				};
			}
		}

		function onItemLeave() {
			const rect = highlightRectEl.value;
			if (!rect) return;
			rect.setAttribute("opacity", "0");
			hlPrev.visible = false;
			if (highlightAnim) {
				highlightAnim.cancel();
				highlightAnim = null;
			}
		}

		// --- Event handlers ---
		function handleOpen() {
			if (props.open === undefined) machine.open();
			else props.onOpenChange?.(true);
		}
		function handleClose() {
			if (props.open === undefined) machine.close();
			else props.onOpenChange?.(false);
		}
		function handleToggle() {
			if (props.open === undefined) machine.toggle();
			else props.onOpenChange?.(!snapshot.value.open);
		}
		function onMouseEnter() {
			if (props.trigger === "hover") handleOpen();
		}
		function onMouseLeave() {
			if (props.trigger === "hover") handleClose();
			onItemLeave();
		}
		function onClick() {
			if (props.trigger === "click") handleToggle();
		}

		// --- Render ---
		return () => {
			const rw = rootW.value;
			const rh = rootH.value;
			const cw = collapsedW.value;
			const ch = collapsedH.value;
			const a = attrs.value;
			const fillVal = props.fill ?? "var(--fluix-notch-bg)";

			return h("div", null, [
				// Hidden content measurer
				h(
					"div",
					{
						"data-fluix-notch-measure": "",
						ref: measureContentEl,
					},
					slots.content?.(),
				),
				// Visible notch
				h(
					"div",
					{
						ref: rootEl,
						...a.root,
						style: `width:${rw}px;height:${rh}px;`,
						onMouseenter: onMouseEnter,
						onMouseleave: onMouseLeave,
						onMouseover: onItemEnter,
						onClick: onClick,
					},
					[
						// SVG gooey background
						h("div", a.canvas, [
							h(
								"svg",
								{
									xmlns: "http://www.w3.org/2000/svg",
									width: rw,
									height: rh,
									viewBox: `0 0 ${rw} ${rh}`,
									"aria-hidden": "true",
								},
								[
									h("defs", [
										h(
											"filter",
											{
												id: "fluix-notch-goo",
												x: "-20%",
												y: "-20%",
												width: "140%",
												height: "140%",
												"color-interpolation-filters": "sRGB",
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
									h("g", { filter: "url(#fluix-notch-goo)" }, [
										h("rect", {
											ref: svgRectEl,
											x: (rw - cw) / 2,
											y: (rh - ch) / 2,
											width: cw,
											height: ch,
											rx: cw / 2,
											ry: ch / 2,
											fill: fillVal,
										}),
									]),
									// Highlight blob
									h("rect", {
										ref: highlightRectEl,
										x: "0",
										y: "0",
										width: "0",
										height: "0",
										rx: "0",
										ry: "0",
										opacity: "0",
										fill: "var(--fluix-notch-hl)",
									}),
								],
							),
						]),
						// Pill dot (collapsed icon)
						h(
							"div",
							{
								...a.pill,
								style: `width:${props.dotSize}px;height:${props.dotSize}px;`,
							},
							slots.pill?.(),
						),
						// Expanded content
						h(
							"div",
							{
								ref: contentEl,
								...a.content,
							},
							slots.content?.(),
						),
					],
				),
			]);
		};
	},
});
