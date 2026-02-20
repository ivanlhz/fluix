import type { FluixPosition, FluixToasterConfig } from "@fluix-ui/core";

function resolveOffsetValue(value: number | string): string {
	return typeof value === "number" ? `${value}px` : value;
}

function resolveSides(offset: FluixToasterConfig["offset"]) {
	if (offset == null) return {} as Record<string, string>;

	if (typeof offset === "number" || typeof offset === "string") {
		const value = resolveOffsetValue(offset);
		return { top: value, right: value, bottom: value, left: value };
	}

	const top = offset.top != null ? resolveOffsetValue(offset.top) : undefined;
	const right = offset.right != null ? resolveOffsetValue(offset.right) : undefined;
	const bottom = offset.bottom != null ? resolveOffsetValue(offset.bottom) : undefined;
	const left = offset.left != null ? resolveOffsetValue(offset.left) : undefined;

	return { top, right, bottom, left } as Record<string, string>;
}

export function getViewportOffsetStyle(
	offset: FluixToasterConfig["offset"],
	position: FluixPosition,
): Record<string, string> {
	const sides = resolveSides(offset);
	const style: Record<string, string> = {};

	if (position.startsWith("top") && sides["top"]) style["top"] = sides["top"];
	if (position.startsWith("bottom") && sides["bottom"]) style["bottom"] = sides["bottom"];
	if (position.endsWith("right") && sides["right"]) style["right"] = sides["right"];
	if (position.endsWith("left") && sides["left"]) style["left"] = sides["left"];

	if (position.endsWith("center")) {
		if (sides["left"]) style["paddingLeft"] = sides["left"];
		if (sides["right"]) style["paddingRight"] = sides["right"];
	}

	return style;
}
