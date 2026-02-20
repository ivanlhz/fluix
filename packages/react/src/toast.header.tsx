import { Toaster as CoreToaster } from "@fluix-ui/core";
import { memo } from "react";
import { renderToastIcon } from "./toast.icon";
import type { HeaderLayerState } from "./toast.types";

export const ToastHeader = memo(function ToastHeader({
	innerRef,
	headerRef,
	headerLayer,
	attrs,
}: {
	innerRef: React.RefObject<HTMLDivElement | null>;
	headerRef: React.RefObject<HTMLDivElement | null>;
	headerLayer: HeaderLayerState;
	attrs: ReturnType<typeof CoreToaster.getAttrs>;
}) {
	return (
		<div ref={headerRef} {...attrs.header}>
			<div data-fluix-header-stack>
				<div
					ref={innerRef}
					key={headerLayer.current.key}
					data-fluix-header-inner
					data-layer="current"
				>
					<div
						{...attrs.badge}
						data-state={headerLayer.current.view.state}
						className={headerLayer.current.view.styles?.badge}
					>
						{renderToastIcon(headerLayer.current.view.icon, headerLayer.current.view.state)}
					</div>
					<span
						{...attrs.title}
						data-state={headerLayer.current.view.state}
						className={headerLayer.current.view.styles?.title}
					>
						{headerLayer.current.view.title}
					</span>
				</div>
				{headerLayer.prev && (
					<div
						key={headerLayer.prev.key}
						data-fluix-header-inner
						data-layer="prev"
						data-exiting="true"
					>
						<div
							data-fluix-badge
							data-state={headerLayer.prev.view.state}
							className={headerLayer.prev.view.styles?.badge}
						>
							{renderToastIcon(headerLayer.prev.view.icon, headerLayer.prev.view.state)}
						</div>
						<span
							data-fluix-title
							data-state={headerLayer.prev.view.state}
							className={headerLayer.prev.view.styles?.title}
						>
							{headerLayer.prev.view.title}
						</span>
					</div>
				)}
			</div>
		</div>
	);
});
