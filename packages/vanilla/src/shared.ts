/** Shared constants and helpers for vanilla adapters. */

export const SVG_NS = "http://www.w3.org/2000/svg";
const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

export function applyAttrs(el: Element, attrs: Record<string, string>) {
	for (const [key, value] of Object.entries(attrs)) {
		el.setAttribute(key, value);
	}
}

export function clearChildren(el: Element) {
	while (el.firstChild) el.removeChild(el.firstChild);
}

/** Creates an SVG gooey filter group. Returns the `<g>` and `<defs>` elements. */
export function createGooeyFilter(filterId: string, blur: number) {
	const defs = document.createElementNS(SVG_NS, "defs");
	const filter = document.createElementNS(SVG_NS, "filter");
	filter.setAttribute("id", filterId);
	for (const [k, v] of Object.entries({ x: "-50%", y: "-50%", width: "200%", height: "200%" })) {
		filter.setAttribute(k, v);
	}
	filter.setAttribute("color-interpolation-filters", "sRGB");

	const feBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
	feBlur.setAttribute("in", "SourceGraphic");
	feBlur.setAttribute("stdDeviation", String(blur));
	feBlur.setAttribute("result", "blur");

	const feCM = document.createElementNS(SVG_NS, "feColorMatrix");
	feCM.setAttribute("in", "blur");
	feCM.setAttribute("type", "matrix");
	feCM.setAttribute("values", GOO_MATRIX);
	feCM.setAttribute("result", "goo");

	const feComp = document.createElementNS(SVG_NS, "feComposite");
	feComp.setAttribute("in", "SourceGraphic");
	feComp.setAttribute("in2", "goo");
	feComp.setAttribute("operator", "atop");

	filter.appendChild(feBlur);
	filter.appendChild(feCM);
	filter.appendChild(feComp);
	defs.appendChild(filter);

	const g = document.createElementNS(SVG_NS, "g");
	g.setAttribute("filter", `url(#${filterId})`);

	return { g, defs, feBlur };
}

/** Initialize a set of SVG rect attributes to zero. */
export function zeroRect(el: SVGElement) {
	for (const attr of ["x", "y", "width", "height", "rx", "ry"]) {
		el.setAttribute(attr, "0");
	}
}
