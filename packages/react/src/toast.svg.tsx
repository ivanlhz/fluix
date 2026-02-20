import { memo } from "react";
import { GOO_MATRIX, HEIGHT, WIDTH } from "./toast.types";

export const ToastSvg = memo(function ToastSvg({
	pillRef,
	filterId,
	blur,
	roundness,
	fill,
	svgHeight,
	viewBox,
	pillX,
	resolvedPillWidth,
}: {
	pillRef: React.RefObject<SVGRectElement | null>;
	filterId: string;
	blur: number;
	roundness: number;
	fill: string;
	svgHeight: number;
	viewBox: string;
	pillX: number;
	resolvedPillWidth: number;
}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			data-fluix-svg
			width={WIDTH}
			height={svgHeight}
			viewBox={viewBox}
			aria-hidden
		>
			<defs>
				<filter
					id={filterId}
					x="-20%"
					y="-20%"
					width="140%"
					height="140%"
					colorInterpolationFilters="sRGB"
				>
					<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
					<feColorMatrix in="blur" type="matrix" values={GOO_MATRIX} result="goo" />
					<feComposite in="SourceGraphic" in2="goo" operator="atop" />
				</filter>
			</defs>
			<g filter={`url(#${filterId})`}>
				<rect
					ref={pillRef}
					data-fluix-pill
					x={pillX}
					y={0}
					width={resolvedPillWidth}
					height={HEIGHT}
					rx={roundness}
					ry={roundness}
					fill={fill}
				/>
				<rect
					data-fluix-body
					x={0}
					y={HEIGHT}
					width={WIDTH}
					height={0}
					rx={roundness}
					ry={roundness}
					fill={fill}
					opacity={0}
				/>
			</g>
		</svg>
	);
});
