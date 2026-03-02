<script lang="ts">
import { Toaster as CoreToaster } from "@fluix-ui/core";
import type { FluixPosition, FluixToastItem, FluixToasterConfig } from "@fluix-ui/core";
import { untrack } from "svelte";
import ToastItem from "./ToastItem.svelte";
import { createFluixToasts } from "./toast.svelte.js";

export interface ToasterProps {
	config?: FluixToasterConfig;
}

const { config }: ToasterProps = $props();

const store = createFluixToasts();

type ToastLocalState = Record<string, { ready: boolean; expanded: boolean }>;
const localState: ToastLocalState = $state({});

// Apply config when provided
$effect(() => {
	if (config) store.machine.configure(config);
});

// Sync localState with toast list (in-place add/delete to avoid invalidating all entries)
$effect(() => {
	const toasts = store.toasts;
	const ids = new Set(toasts.map((t) => t.id));
	const current = untrack(() => localState);
	// Add entries for new toasts
	for (const t of toasts) {
		if (!(t.id in current)) {
			localState[t.id] = { ready: false, expanded: false };
		}
	}
	// Remove entries for gone toasts
	for (const id in current) {
		if (!ids.has(id)) {
			delete localState[id];
		}
	}
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
	if (position.startsWith("top") && top) parts.push(`--fluix-viewport-top:${top}`);
	if (position.startsWith("bottom") && bottom) parts.push(`--fluix-viewport-bottom:${bottom}`);
	if (position.endsWith("right") && right) parts.push(`right:${right}`);
	if (position.endsWith("left") && left) parts.push(`left:${left}`);
	if (position.endsWith("center")) {
		if (left) parts.push(`padding-left:${left}`);
		if (right) parts.push(`padding-right:${right}`);
	}
	return parts.join(";");
}

function setToastLocal(id: string, patch: Partial<{ ready: boolean; expanded: boolean }>) {
	const entry = localState[id];
	if (entry) {
		if (patch.ready !== undefined) entry.ready = patch.ready;
		if (patch.expanded !== undefined) entry.expanded = patch.expanded;
	} else {
		localState[id] = {
			ready: patch.ready ?? false,
			expanded: patch.expanded ?? false,
		};
	}
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
					onLocalStateChange={(patch: Partial<{ ready: boolean; expanded: boolean }>) =>
						setToastLocal(toastItem.id, patch)}
				/>
			{/key}
		{/each}
	</section>
{/each}
