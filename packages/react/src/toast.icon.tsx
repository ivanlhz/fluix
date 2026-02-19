import type { FluixToastItem } from "@fluix-ui/core";
import type { ReactElement, ReactNode } from "react";

function DefaultIcon({ state }: { state: FluixToastItem["state"] }) {
	switch (state) {
		case "success":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
				>
					<polyline points="20 6 9 17 4 12" />
				</svg>
			);
		case "error":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			);
		case "warning":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
				>
					<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
					<line x1="12" y1="9" x2="12" y2="13" />
					<line x1="12" y1="17" x2="12.01" y2="17" />
				</svg>
			);
		case "info":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="16" x2="12" y2="12" />
					<line x1="12" y1="8" x2="12.01" y2="8" />
				</svg>
			);
		case "loading":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
					data-fluix-icon="spin"
				>
					<line x1="12" y1="2" x2="12" y2="6" />
					<line x1="12" y1="18" x2="12" y2="22" />
					<line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
					<line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
					<line x1="2" y1="12" x2="6" y2="12" />
					<line x1="18" y1="12" x2="22" y2="12" />
					<line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
					<line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
				</svg>
			);
		case "action":
			return (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden
				>
					<circle cx="12" cy="12" r="10" />
					<polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
				</svg>
			);
		default:
			return null;
	}
}

export function renderToastIcon(icon: unknown, state: FluixToastItem["state"]): ReactNode {
	if (icon != null) {
		if (typeof icon === "object" && icon !== null && "type" in icon) {
			return icon as ReactElement;
		}
		return <span aria-hidden>{String(icon)}</span>;
	}

	return <DefaultIcon state={state} />;
}
