import {
	Toaster as CoreToaster,
	type FluixPosition,
	type FluixToastItem,
	type FluixToasterConfig,
} from "@fluix-ui/core";
import {
	type CSSProperties,
	Fragment,
	type PropType,
	computed,
	defineComponent,
	h,
	onMounted,
	onUnmounted,
	ref,
	shallowRef,
	watch,
} from "vue";
import { ToastItem } from "./toast-item";

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
		top = resolved; right = resolved; bottom = resolved; left = resolved;
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

	return { machine, snapshot, toasts, config };
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

		watch(() => props.config, (nextConfig) => {
			if (nextConfig) machine.configure(nextConfig);
		}, { deep: true, immediate: true });

		watch(() => snapshot.value.toasts, (toasts) => {
			const ids = new Set(toasts.map((toast) => toast.id));
			const next: ToastLocalState = {};
			for (const id of ids) {
				next[id] = localState.value[id] ?? { ready: false, expanded: false };
			}
			localState.value = next;
		}, { immediate: true });

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
		const resolvedLayout = computed(() => snapshot.value.config?.layout ?? props.config?.layout ?? "stack");

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
								localState: localState.value[item.id] ?? { ready: false, expanded: false },
								onLocalStateChange: (patch: Partial<{ ready: boolean; expanded: boolean }>) =>
									setToastLocal(item.id, patch),
							}),
						),
					),
				),
			);
	},
});
