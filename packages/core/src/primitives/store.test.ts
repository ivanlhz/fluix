import { describe, expect, it, vi } from "vitest";
import { createStore } from "./store";

describe("createStore", () => {
	it("returns initial state from getSnapshot", () => {
		const store = createStore({ count: 0 });
		expect(store.getSnapshot()).toEqual({ count: 0 });
	});

	it("getServerSnapshot returns initial state (SSR)", () => {
		const store = createStore({ count: 0 });
		store.update((s) => ({ ...s, count: 10 }));
		expect(store.getServerSnapshot()).toEqual({ count: 0 });
	});

	it("update applies function and notifies listeners", () => {
		const store = createStore(0);
		const listener = vi.fn();
		store.subscribe(listener);

		store.update((n) => n + 1);
		expect(store.getSnapshot()).toBe(1);
		expect(listener).toHaveBeenCalledTimes(1);

		store.update((n) => n + 1);
		expect(store.getSnapshot()).toBe(2);
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("set updates state and notifies listeners", () => {
		const store = createStore(0);
		const listener = vi.fn();
		store.subscribe(listener);

		store.set(42);
		expect(store.getSnapshot()).toBe(42);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("no-op update (same reference) does not notify listeners", () => {
		const state = { count: 0 };
		const store = createStore(state);
		const listener = vi.fn();
		store.subscribe(listener);

		store.update((prev) => prev);
		expect(store.getSnapshot()).toBe(state);
		expect(listener).not.toHaveBeenCalled();
	});

	it("unsubscribe stops notifications", () => {
		const store = createStore(0);
		const listener = vi.fn();
		const unsub = store.subscribe(listener);

		store.update((n) => n + 1);
		expect(listener).toHaveBeenCalledTimes(1);

		unsub();
		store.update((n) => n + 1);
		expect(store.getSnapshot()).toBe(2);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("multiple listeners all receive updates", () => {
		const store = createStore(0);
		const a = vi.fn();
		const b = vi.fn();
		store.subscribe(a);
		store.subscribe(b);

		store.update((n) => n + 1);
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
	});
});
