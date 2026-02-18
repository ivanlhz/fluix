/**
 * Minimal observable store.
 *
 * Design decisions:
 * - Compatible with React's useSyncExternalStore out of the box
 * - Immutable updates (fn receives prev, must return next)
 * - Synchronous notifications (listeners called immediately on update)
 * - No batching — each update triggers all listeners. Adapters can batch if needed.
 */

export interface Store<T> {
	/** Get current state snapshot. */
	getSnapshot(): T;
	/** Subscribe to state changes. Returns unsubscribe function. */
	subscribe(listener: () => void): () => void;
	/** Update state with a pure function. */
	update(fn: (prev: T) => T): void;
	/** Set state directly (shorthand for update that ignores prev). */
	set(next: T): void;
	/** Server snapshot for SSR (React requirement). */
	getServerSnapshot(): T;
}

export function createStore<T>(initialState: T): Store<T> {
	let state = initialState;
	const listeners = new Set<() => void>();

	const store: Store<T> = {
		getSnapshot() {
			return state;
		},

		getServerSnapshot() {
			return initialState;
		},

		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		update(fn) {
			const next = fn(state);
			if (next === state) return; // Bail if reference-equal (no-op update)
			state = next;
			for (const listener of listeners) {
				listener();
			}
		},

		set(next) {
			store.update(() => next);
		},
	};

	return store;
}
