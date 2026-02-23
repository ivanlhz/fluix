import type { Snippet } from "svelte";
export interface MenuItemProps {
    id: string;
    disabled?: boolean;
    className?: string;
    children: Snippet;
}
declare const MenuItem: import("svelte").Component<MenuItemProps, {}, "">;
type MenuItem = ReturnType<typeof MenuItem>;
export default MenuItem;
//# sourceMappingURL=MenuItem.svelte.d.ts.map