import { animateSpring } from "@fluix-ui/core";
export function createNotchAnimation() {
    const prev = { w: 0, h: 0, initialized: false };
    let currentAnim = null;
    function init(rect, collapsedW, collapsedH, rootW, rootH) {
        if (prev.initialized)
            return;
        prev.w = collapsedW;
        prev.h = collapsedH;
        prev.initialized = true;
        const cx = (rootW - collapsedW) / 2;
        const cy = (rootH - collapsedH) / 2;
        rect.setAttribute("width", String(collapsedW));
        rect.setAttribute("height", String(collapsedH));
        rect.setAttribute("x", String(cx));
        rect.setAttribute("y", String(cy));
        rect.setAttribute("rx", String(collapsedW / 2));
        rect.setAttribute("ry", String(collapsedH / 2));
    }
    function animate(rect, opts) {
        if (!prev.initialized)
            return;
        const { targetW: tw, targetH: th, rootW, rootH, collapsedW, collapsedH, roundness, springConfig } = opts;
        if (tw === prev.w && th === prev.h)
            return;
        if (currentAnim) {
            currentAnim.cancel();
            currentAnim = null;
        }
        const fromW = prev.w;
        const fromH = prev.h;
        const fromX = (rootW - fromW) / 2;
        const fromY = (rootH - fromH) / 2;
        const toX = (rootW - tw) / 2;
        const toY = (rootH - th) / 2;
        prev.w = tw;
        prev.h = th;
        const isCollapsing = tw === collapsedW && th === collapsedH;
        const wasCollapsed = fromW === collapsedW && fromH === collapsedH;
        const fromRx = wasCollapsed ? collapsedW / 2 : roundness;
        const toRx = isCollapsing ? collapsedW / 2 : roundness;
        const a = animateSpring(rect, {
            width: { from: fromW, to: tw, unit: "px" },
            height: { from: fromH, to: th, unit: "px" },
            x: { from: fromX, to: toX, unit: "px" },
            y: { from: fromY, to: toY, unit: "px" },
            rx: { from: fromRx, to: toRx, unit: "px" },
            ry: { from: fromRx, to: toRx, unit: "px" },
        }, springConfig);
        if (a) {
            currentAnim = a;
            a.onfinish = () => {
                currentAnim = null;
                rect.setAttribute("width", String(tw));
                rect.setAttribute("height", String(th));
                rect.setAttribute("x", String(toX));
                rect.setAttribute("y", String(toY));
                rect.setAttribute("rx", String(toRx));
                rect.setAttribute("ry", String(toRx));
            };
        }
        else {
            rect.setAttribute("width", String(tw));
            rect.setAttribute("height", String(th));
            rect.setAttribute("x", String(toX));
            rect.setAttribute("y", String(toY));
            rect.setAttribute("rx", String(toRx));
            rect.setAttribute("ry", String(toRx));
        }
    }
    return { prev, init, animate };
}
