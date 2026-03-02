<script lang="ts">
import { getContext } from "svelte";
import { getMenuAttrs } from "@fluix-ui/core";
import type { Snippet } from "svelte";

export interface MenuItemProps {
	id: string;
	disabled?: boolean;
	className?: string;
	children: Snippet;
}

const {
	id,
	disabled = false,
	className,
	children,
}: MenuItemProps = $props();

const context = getContext<{
	activeId: string | null;
	setActive: (id: string) => void;
	attrs: ReturnType<typeof getMenuAttrs>;
	variant: string;
}>("fluix-menu");

const active = $derived(context.activeId === id);
const itemAttrs = $derived(context.attrs.item({ id, active, disabled }));

function handleClick() {
	if (disabled) return;
	context.setActive(id);
}
</script>

<button
	type="button"
	{...itemAttrs}
	{disabled}
	class={className}
	onclick={handleClick}
>
	{@render children()}
</button>
