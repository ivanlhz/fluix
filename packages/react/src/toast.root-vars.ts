type ToastEdge = "top" | "bottom";

interface RootVarsInput {
	open: boolean;
	expanded: number;
	height: number;
	resolvedPillWidth: number;
	pillX: number;
	edge: ToastEdge;
	expandedContent: number;
	bodyMergeOverlap: number;
}

export function getToastRootVars(input: RootVarsInput): Record<string, string> {
	return {
		"--_h": `${input.open ? input.expanded : input.height}px`,
		"--_pw": `${input.resolvedPillWidth}px`,
		"--_px": `${input.pillX}px`,
		"--_ht": `translateY(${input.open ? (input.edge === "bottom" ? 3 : -3) : 0}px) scale(${input.open ? 0.9 : 1})`,
		"--_co": `${input.open ? 1 : 0}`,
		"--_cy": `${input.open ? 0 : -14}px`,
		"--_cm": `${input.open ? input.expandedContent : 0}px`,
		"--_by": `${input.open ? input.height - input.bodyMergeOverlap : input.height}px`,
		"--_bh": `${input.open ? input.expandedContent : 0}px`,
		"--_bo": `${input.open ? 1 : 0}`,
	};
}
