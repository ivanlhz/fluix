import { h, type VNode } from "vue";

const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

export interface IndicatorSvgOpts {
	isTab: boolean;
	filterId: string;
	resolvedBlur: number;
	effectiveFill: string;
	width: number;
	height: number;
	indicatorAttrs: Record<string, unknown>;
	registerIndicator: (el: SVGRectElement | SVGPathElement | null) => void;
	registerGhostIndicator: (el: SVGRectElement | null) => void;
	canvasAttrs: Record<string, unknown>;
}

export function renderIndicatorSvg(opts: IndicatorSvgOpts): VNode {
	const svgChildren: VNode[] = [];

	if (!opts.isTab) {
		svgChildren.push(
			h("defs", [
				h(
					"filter",
					{
						id: opts.filterId,
						x: "-20%",
						y: "-20%",
						width: "140%",
						height: "140%",
						"color-interpolation-filters": "sRGB",
					},
					[
						h("feGaussianBlur", {
							in: "SourceGraphic",
							stdDeviation: opts.resolvedBlur,
							result: "blur",
						}),
						h("feColorMatrix", {
							in: "blur",
							type: "matrix",
							values: GOO_MATRIX,
							result: "goo",
						}),
						h("feComposite", {
							in: "SourceGraphic",
							in2: "goo",
							operator: "atop",
						}),
					],
				),
			]),
		);
	}

	if (opts.isTab) {
		svgChildren.push(
			h("path", {
				ref: (el: any) => opts.registerIndicator(el),
				...opts.indicatorAttrs,
				d: "",
				opacity: 0,
				style: { fill: opts.effectiveFill },
			}),
		);
	} else {
		svgChildren.push(
			h("g", { filter: `url(#${opts.filterId})` }, [
				h("rect", {
					ref: (el: any) => opts.registerGhostIndicator(el),
					x: 0, y: 0, width: 0, height: 0, rx: 0, ry: 0, opacity: 0,
					style: { fill: opts.effectiveFill },
				}),
				h("rect", {
					ref: (el: any) => opts.registerIndicator(el),
					...opts.indicatorAttrs,
					x: 0, y: 0, width: 0, height: 0, rx: 0, ry: 0, opacity: 0,
					style: { fill: opts.effectiveFill },
				}),
			]),
		);
	}

	return h("div", opts.canvasAttrs, [
		h("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			width: opts.width,
			height: opts.height,
			viewBox: `0 0 ${opts.width} ${opts.height}`,
			"aria-hidden": "true",
		}, svgChildren),
	]);
}
