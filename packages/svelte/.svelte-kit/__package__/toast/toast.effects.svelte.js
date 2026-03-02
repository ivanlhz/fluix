import { Toaster as CoreToaster } from "@fluix-ui/core";
const PILL_CONTENT_PADDING = 16;
export function applyCssProps(getRootEl, rootStyleObj) {
    const el = getRootEl();
    if (!el)
        return;
    for (const [key, value] of Object.entries(rootStyleObj)) {
        el.style.setProperty(key, value);
    }
}
export function observePillWidth(getHeaderEl, getHeaderInnerEl, setPillWidth) {
    const headerElement = getHeaderEl();
    const headerInner = getHeaderInnerEl();
    if (!headerElement || !headerInner)
        return;
    const measure = () => {
        const cs = getComputedStyle(headerElement);
        const horizontalPadding = Number.parseFloat(cs.paddingLeft || "0") + Number.parseFloat(cs.paddingRight || "0");
        const intrinsicWidth = headerInner.getBoundingClientRect().width;
        setPillWidth(intrinsicWidth + horizontalPadding + PILL_CONTENT_PADDING);
    };
    measure();
    let rafId = 0;
    const observer = new ResizeObserver(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(measure);
    });
    observer.observe(headerInner);
    return () => {
        cancelAnimationFrame(rafId);
        observer.disconnect();
    };
}
export function observeContentHeight(hasDescription, getContentEl, setContentHeight) {
    if (!hasDescription) {
        setContentHeight(0);
        return;
    }
    const el = getContentEl();
    if (!el)
        return;
    const measure = () => {
        setContentHeight(el.scrollHeight);
    };
    measure();
    let rafId = 0;
    const observer = new ResizeObserver(() => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(measure);
    });
    observer.observe(el);
    return () => {
        cancelAnimationFrame(rafId);
        observer.disconnect();
    };
}
export function setupAutoDismiss(item, dismiss, doDismiss) {
    const duration = item.duration;
    if (duration == null || duration <= 0)
        return;
    const timer = setTimeout(() => {
        if (dismiss.hovering) {
            dismiss.pendingDismiss = true;
            return;
        }
        dismiss.pendingDismiss = false;
        doDismiss();
    }, duration);
    return () => clearTimeout(timer);
}
export function setupAutopilot(item, dismiss, onLocalStateChange) {
    const timers = [];
    if (item.autoExpandDelayMs != null && item.autoExpandDelayMs > 0) {
        timers.push(setTimeout(() => {
            if (dismiss.dismissRequested)
                return;
            if (!dismiss.hovering)
                onLocalStateChange({ expanded: true });
        }, item.autoExpandDelayMs));
    }
    if (item.autoCollapseDelayMs != null && item.autoCollapseDelayMs > 0) {
        timers.push(setTimeout(() => {
            if (dismiss.dismissRequested)
                return;
            if (!dismiss.hovering)
                onLocalStateChange({ expanded: false });
        }, item.autoCollapseDelayMs));
    }
    if (timers.length === 0)
        return;
    return () => {
        for (const t of timers)
            clearTimeout(t);
    };
}
export function connectDomEvents(getRootEl, item, dismiss, onLocalStateChange, doDismiss) {
    const el = getRootEl();
    if (!el)
        return;
    const callbacks = {
        onExpand: () => {
            if (item.exiting || dismiss.dismissRequested)
                return;
            onLocalStateChange({ expanded: true });
        },
        onCollapse: () => {
            if (item.exiting || dismiss.dismissRequested)
                return;
            if (item.autopilot !== false)
                return;
            onLocalStateChange({ expanded: false });
        },
        onDismiss: () => doDismiss(),
        onHoverStart: () => {
            dismiss.hovering = true;
        },
        onHoverEnd: () => {
            dismiss.hovering = false;
            if (dismiss.pendingDismiss && !dismiss.dismissRequested) {
                dismiss.pendingDismiss = false;
                doDismiss();
            }
        },
    };
    const { destroy } = CoreToaster.connect(el, callbacks, item);
    return destroy;
}
