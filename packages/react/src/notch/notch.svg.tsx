import { memo } from "react";

const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

export const NotchSvg = memo(function NotchSvg({
	rootW,
	rootH,
	blur,
	collapsedW,
	collapsedH,
	fill,
	svgRectRef,
	hoverBlobRef,
}: {
	rootW: number;
	rootH: number;
	blur: number;
	collapsedW: number;
	collapsedH: number;
	fill: string | undefined;
	svgRectRef: React.RefObject<SVGRectElement | null>;
	hoverBlobRef: React.RefObject<SVGRectElement | null>;
}) {
	const resolvedFill = fill ?? "var(--fluix-notch-bg)";
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={rootW}
			height={rootH}
			viewBox={`0 0 ${rootW} ${rootH}`}
			aria-hidden="true"
		>
			<defs>
				<filter
					id="fluix-notch-goo"
					x="-20%"
					y="-20%"
					width="140%"
					height="140%"
					colorInterpolationFilters="sRGB"
				>
					<feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
					<feColorMatrix
						in="blur"
						type="matrix"
						values={GOO_MATRIX}
						result="goo"
					/>
					<feComposite in="SourceGraphic" in2="goo" operator="atop" />
				</filter>
			</defs>
			<g filter="url(#fluix-notch-goo)">
				<rect
					ref={svgRectRef}
					x={(rootW - collapsedW) / 2}
					y={(rootH - collapsedH) / 2}
					width={collapsedW}
					height={collapsedH}
					rx={collapsedW / 2}
					ry={collapsedH / 2}
					fill={resolvedFill}
				/>
				<rect
					ref={hoverBlobRef}
					x={(rootW - collapsedW) / 2}
					y={(rootH - collapsedH) / 2}
					width="0"
					height="0"
					rx="0"
					ry="0"
					opacity="0"
					fill={resolvedFill}
				/>
			</g>
		</svg>
	);
});
