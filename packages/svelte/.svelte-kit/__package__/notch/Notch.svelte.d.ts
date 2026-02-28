import { type NotchPosition, type NotchTrigger, type NotchTheme, type SpringConfig } from "@fluix-ui/core";
import type { Snippet } from "svelte";
export interface NotchProps {
    trigger?: NotchTrigger;
    position?: NotchPosition;
    spring?: SpringConfig;
    /** Collapsed dot size in px. Default: 36 */
    dotSize?: number;
    roundness?: number;
    /** Visual theme. Default: "dark" */
    theme?: NotchTheme;
    fill?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Icon/content shown in the collapsed dot */
    pill: Snippet;
    /** Content shown when expanded */
    content: Snippet;
}
declare const Notch: import("svelte").Component<NotchProps, {}, "">;
type Notch = ReturnType<typeof Notch>;
export default Notch;
//# sourceMappingURL=Notch.svelte.d.ts.map