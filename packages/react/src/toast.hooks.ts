import type { FluixToastItem } from "@fluix-ui/core";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
	HEADER_EXIT_MS,
	PILL_PADDING,
	type HeaderLayerState,
	type HeaderLayerView,
	type ToastTransientState,
} from "./toast.types";

/* ----------------------------- useHeaderCrossfade ----------------------------- */

export function useHeaderCrossfade(item: FluixToastItem) {
	const headerKey = `${item.state}-${item.title ?? item.state}`;
	const prevKeyRef = useRef(headerKey);
	const layerRef = useRef<HeaderLayerState>({
		current: {
			key: headerKey,
			view: { state: item.state, title: item.title ?? item.state, icon: item.icon, styles: item.styles },
		},
		prev: null,
	});

	const currentView: HeaderLayerView = {
		state: item.state,
		title: item.title ?? item.state,
		icon: item.icon,
		styles: item.styles,
	};

	if (prevKeyRef.current !== headerKey) {
		layerRef.current = {
			prev: layerRef.current.current,
			current: { key: headerKey, view: currentView },
		};
		prevKeyRef.current = headerKey;
	} else {
		layerRef.current = { ...layerRef.current, current: { key: headerKey, view: currentView } };
	}

	const [, forceRender] = useState(0);
	useEffect(() => {
		if (!layerRef.current.prev) return;

		const timer = setTimeout(() => {
			layerRef.current = { ...layerRef.current, prev: null };
			forceRender((n) => n + 1);
		}, HEADER_EXIT_MS);

		return () => clearTimeout(timer);
	}, [layerRef.current.prev?.key]);

	return { headerKey, headerLayer: layerRef.current };
}

/* ----------------------------- usePillMeasurement ----------------------------- */

export function usePillMeasurement(
	headerRef: React.RefObject<HTMLDivElement | null>,
	innerRef: React.RefObject<HTMLDivElement | null>,
	transient: React.RefObject<ToastTransientState>,
	headerKey: string,
) {
	const [pillWidth, setPillWidth] = useState(0);
	const pillRoRef = useRef<ResizeObserver | null>(null);

	useLayoutEffect(() => {
		const el = innerRef.current;
		const header = headerRef.current;
		const t = transient.current;
		if (!el || !header || !t) return;

		if (t.headerPad === null) {
			const cs = getComputedStyle(header);
			t.headerPad = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight);
		}

		const measure = () => {
			const inner = innerRef.current;
			const pad = transient.current?.headerPad ?? 0;
			if (!inner) return;
			const w = inner.scrollWidth + pad + PILL_PADDING;
			if (w >= PILL_PADDING) {
				setPillWidth((prev) => (prev === w ? prev : w));
			}
		};

		const rafId = requestAnimationFrame(() => {
			requestAnimationFrame(measure);
		});

		if (!pillRoRef.current) {
			pillRoRef.current = new ResizeObserver(() => {
				cancelAnimationFrame(t.pillRafId);
				t.pillRafId = requestAnimationFrame(measure);
			});
		}

		if (t.pillObserved !== el) {
			if (t.pillObserved) pillRoRef.current.unobserve(t.pillObserved);
			pillRoRef.current.observe(el);
			t.pillObserved = el;
		}

		return () => cancelAnimationFrame(rafId);
	}, [headerKey, headerRef, innerRef, transient]);

	useEffect(() => {
		const t = transient.current;
		return () => {
			pillRoRef.current?.disconnect();
			if (t) cancelAnimationFrame(t.pillRafId);
		};
	}, [transient]);

	return pillWidth;
}

/* ----------------------------- useContentMeasurement ----------------------------- */

export function useContentMeasurement(
	contentRef: React.RefObject<HTMLDivElement | null>,
	hasDesc: boolean,
) {
	const [contentHeight, setContentHeight] = useState(0);

	useLayoutEffect(() => {
		if (!hasDesc) {
			setContentHeight(0);
			return;
		}
		const el = contentRef.current;
		if (!el) return;

		const measure = () => {
			const h = el.scrollHeight;
			setContentHeight((prev) => (prev === h ? prev : h));
		};
		measure();

		let rafId = 0;
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(measure);
		});
		ro.observe(el);
		return () => {
			cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	}, [hasDesc, contentRef]);

	return contentHeight;
}
