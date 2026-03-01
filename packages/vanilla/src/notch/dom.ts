/** Notch DOM building helpers. */

import { getNotchAttrs, type NotchPosition, type NotchTheme, type SpringConfig } from "@fluix-ui/core";
import { SVG_NS, applyAttrs, createGooeyFilter } from "../shared";
import { createHighlightTracker, type HighlightTracker } from "./highlight";

function resolveContent(source: HTMLElement | string): HTMLElement {
	if (source instanceof HTMLElement) return source;
	const span = document.createElement("span");
	span.textContent = source;
	return span;
}

export { resolveContent };

export function buildNotchSvg(rW: number, rH: number, collW: number, collH: number, blurVal: number, fill: string | undefined) {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	for (const [k, v] of Object.entries({ width: String(rW), height: String(rH), viewBox: `0 0 ${rW} ${rH}`, "aria-hidden": "true" })) svg.setAttribute(k, v);

	const { g, defs, feBlur } = createGooeyFilter("fluix-notch-goo", blurVal);
	svg.appendChild(defs);

	const effectiveFill = fill ?? "var(--fluix-notch-bg)";

	const svgRectEl = document.createElementNS(SVG_NS, "rect");
	const cx = (rW - collW) / 2, cy = (rH - collH) / 2;
	for (const [k, v] of Object.entries({ x: cx, y: cy, width: collW, height: collH, rx: collW / 2, ry: collH / 2 })) svgRectEl.setAttribute(k, String(v));
	svgRectEl.setAttribute("fill", effectiveFill);
	g.appendChild(svgRectEl);

	const hoverBlobEl = document.createElementNS(SVG_NS, "rect");
	for (const [k, v] of Object.entries({ x: cx, y: cy, width: 0, height: 0, rx: 0, ry: 0, opacity: "0" })) hoverBlobEl.setAttribute(k, String(v));
	hoverBlobEl.setAttribute("fill", effectiveFill);
	g.appendChild(hoverBlobEl);

	svg.appendChild(g);
	return { svg, svgRectEl, hoverBlobEl, feBlur };
}

export interface NotchDOMConfig {
	snapshot: { open: boolean };
	position: NotchPosition;
	theme: NotchTheme;
	dotSize: number;
	fill: string | undefined;
	contentSize: { w: number; h: number };
	roundness: number;
	spring: SpringConfig | undefined;
}

export interface NotchDOMRefs {
	rootEl: HTMLElement;
	svg: SVGSVGElement;
	svgRectEl: SVGRectElement;
	hoverBlobEl: SVGRectElement;
	feBlur: SVGElement;
	pillDiv: HTMLElement;
	contentDiv: HTMLElement;
	measureEl: HTMLElement;
	highlight: HighlightTracker;
}

const HL_PAD = 12;

function computeDims(cfg: NotchDOMConfig) {
	const collW = cfg.dotSize, collH = cfg.dotSize;
	const expW = cfg.contentSize.w + HL_PAD * 2;
	const expH = Math.max(cfg.contentSize.h + HL_PAD, cfg.dotSize);
	const rW = Math.max(expW, collW);
	const rH = Math.max(expH, collH);
	return { collW, collH, rW, rH };
}

function computeBlur(roundness: number) { return Math.min(10, Math.max(6, roundness * 0.45)); }

export function buildNotchDOM(
	cfg: NotchDOMConfig,
	pill: HTMLElement | string,
	content: HTMLElement | string,
	container: HTMLElement,
	springCfg: () => SpringConfig,
): NotchDOMRefs {
	const measureEl = document.createElement("div");
	measureEl.setAttribute("data-fluix-notch-measure", "");
	measureEl.appendChild(resolveContent(content).cloneNode(true));
	container.appendChild(measureEl);

	const d = computeDims(cfg);
	const rootEl = document.createElement("div");
	const attrs = getNotchAttrs({ open: cfg.snapshot.open, position: cfg.position, theme: cfg.theme });
	applyAttrs(rootEl, attrs.root);
	rootEl.style.width = `${d.rW}px`;
	rootEl.style.height = `${d.rH}px`;

	const canvasDiv = document.createElement("div");
	applyAttrs(canvasDiv, attrs.canvas);
	canvasDiv.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:visible;";

	const svgRefs = buildNotchSvg(d.rW, d.rH, d.collW, d.collH, computeBlur(cfg.roundness), cfg.fill);
	canvasDiv.appendChild(svgRefs.svg);
	rootEl.appendChild(canvasDiv);

	const highlight = createHighlightTracker(svgRefs.hoverBlobEl, springCfg);

	const pillDiv = document.createElement("div");
	applyAttrs(pillDiv, attrs.pill);
	pillDiv.style.cssText = `position:absolute;z-index:10;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;pointer-events:none;width:${cfg.dotSize}px;height:${cfg.dotSize}px;color:var(--fluix-notch-color);`;
	pillDiv.appendChild(resolveContent(pill));
	rootEl.appendChild(pillDiv);

	const contentDiv = document.createElement("div");
	applyAttrs(contentDiv, attrs.content);
	contentDiv.style.cssText = "position:absolute;z-index:10;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;color:var(--fluix-notch-color);";
	contentDiv.appendChild(resolveContent(content));
	rootEl.appendChild(contentDiv);

	container.appendChild(rootEl);
	rootEl.setAttribute("role", "button");
	rootEl.setAttribute("tabindex", "0");
	rootEl.setAttribute("aria-expanded", String(cfg.snapshot.open));

	return { rootEl, measureEl, pillDiv, contentDiv, highlight, ...svgRefs };
}
