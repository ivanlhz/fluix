/**
 * Wraps the core toast store in an RxJS Observable for Angular.
 */

import { getToastMachine } from "@fluix-ui/core";
import type { ToastMachineState } from "@fluix-ui/core";
import { Observable } from "rxjs";

/**
 * Returns an Observable that emits the current toast machine state
 * and on every update. Unsubscribe to stop listening.
 */
export function getToastState$(): Observable<ToastMachineState> {
	const machine = getToastMachine();
	return new Observable<ToastMachineState>((subscriber) => {
		subscriber.next(machine.store.getSnapshot());
		const unsubscribe = machine.store.subscribe(() => {
			subscriber.next(machine.store.getSnapshot());
		});
		return unsubscribe;
	});
}
