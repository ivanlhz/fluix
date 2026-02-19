<script lang="ts">
import {
	Toaster as CoreToaster,
	type FluixPosition,
	type FluixToastItem,
	type FluixToasterConfig,
} from "@fluix/core";
import { untrack } from "svelte";
import { createFluixToasts } from "./toast.svelte.js";
import ToastItem from "./ToastItem.svelte";

export interface ToasterProps {
	config?: FluixToasterConfig;
}

let { config }: ToasterProps = $props();

const store = createFluixToasts();

type ToastLocalState = Record<string, { ready: boolean; expanded: boolean }>;
let localState: ToastLocalState = $state({});

// Apply config when provided
$effect(() => {
	if (config) store.machine.configure(config);
});

// Sync localState with toast list (untrack localState read to avoid infinite loop)
$effect(() => {
	const ids = new Set(store.toasts.map((t) => t.id));
	const prev = untrack(() => localState);
	const next: ToastLocalState = {};
	for (const id of ids) {
		next[id] = prev[id] ?? { ready: false, expanded: false };
	}
	localState = next;
});

// Group toasts by position
const byPosition = $derived.by(() => {
	const grouped = new Map<FluixPosition, FluixToastItem[]>();
	for (const toast of store.toasts) {
		const current = grouped.get(toast.position) ?? [];
		current.push(toast);
		grouped.set(toast.position, current);
	}
	return grouped;
});

const resolvedOffset = $derived(store.config?.offset ?? config?.offset);
const resolvedLayout = $derived(store.config?.layout ?? config?.layout ?? "stack");

function resolveOffsetValue(value: number | string): string {
	return typeof value === "number" ? `${value}px` : value;
}

function getViewportOffsetStyle(
	offset: FluixToasterConfig["offset"],
	position: FluixPosition,
): string {
	if (offset == null) return "";

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

	const parts: string[] = [];
	if (position.startsWith("top") && top) parts.push(`top:${top}`);
	if (position.startsWith("bottom") && bottom) parts.push(`bottom:${bottom}`);
	if (position.endsWith("right") && right) parts.push(`right:${right}`);
	if (position.endsWith("left") && left) parts.push(`left:${left}`);
	if (position.endsWith("center")) {
		if (left) parts.push(`padding-left:${left}`);
		if (right) parts.push(`padding-right:${right}`);
	}
	return parts.join(";");
}

function setToastLocal(id: string, patch: Partial<{ ready: boolean; expanded: boolean }>) {
	localState = {
		...localState,
		[id]: {
			ready: localState[id]?.ready ?? false,
			expanded: localState[id]?.expanded ?? false,
			...patch,
		},
	};
}
</script>

{#each [...byPosition] as [position, positionToasts] (position)}
	<section
		{...CoreToaster.getViewportAttrs(position, resolvedLayout)}
		style={getViewportOffsetStyle(resolvedOffset, position)}
	>
		{#each positionToasts as toastItem (toastItem.instanceId)}
			{#key toastItem.instanceId}
				<ToastItem
					item={toastItem}
					machine={store.machine}
					localState={localState[toastItem.id] ?? { ready: false, expanded: false }}
					onLocalStateChange={(patch) => setToastLocal(toastItem.id, patch)}
				/>
			{/key}
		{/each}
	</section>
{/each}
