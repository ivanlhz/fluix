export function createDismissState() {
    return {
        hovering: false,
        pendingDismiss: false,
        dismissRequested: false,
        dismissTimer: null,
    };
}
export function resetDismissState(s) {
    s.hovering = false;
    s.pendingDismiss = false;
    s.dismissRequested = false;
    clearDismissTimer(s);
}
export function clearDismissTimer(s) {
    if (s.dismissTimer) {
        clearTimeout(s.dismissTimer);
        s.dismissTimer = null;
    }
}
export function requestDismiss(s, machine, id, hasDescription, onLocalStateChange) {
    if (s.dismissRequested)
        return;
    s.dismissRequested = true;
    s.hovering = false;
    s.pendingDismiss = false;
    onLocalStateChange({ expanded: false });
    clearDismissTimer(s);
    const DISMISS_STAGE_DELAY_MS = 260;
    const delay = hasDescription ? DISMISS_STAGE_DELAY_MS : 0;
    s.dismissTimer = setTimeout(() => {
        machine.dismiss(id);
        s.dismissTimer = null;
    }, delay);
}
