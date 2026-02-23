import { type MenuOrientation, type MenuVariant, type MenuTheme, type SpringConfig } from "@fluix-ui/core";
import type { Snippet } from "svelte";
export interface MenuProps {
    orientation?: MenuOrientation;
    variant?: MenuVariant;
    theme?: MenuTheme;
    activeId?: string | null;
    defaultActiveId?: string | null;
    onActiveChange?: (id: string) => void;
    spring?: SpringConfig;
    roundness?: number;
    blur?: number;
    fill?: string;
    className?: string;
    children: Snippet;
}
declare const Menu: import("svelte").Component<MenuProps, {}, "">;
type Menu = ReturnType<typeof Menu>;
export default Menu;
//# sourceMappingURL=Menu.svelte.d.ts.map