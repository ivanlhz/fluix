/**
 * Angular-specific: description as a template + context (like React/Vue custom content).
 * Use with FluixToastService.promise() success callback or any toast option.
 *
 * @example
 * ```ts
 * // In component template:
 * <ng-template #flightCard let-data>
 *   <div class="flight-card">...</div>
 * </ng-template>
 *
 * // In component:
 * @ViewChild('flightCard') flightCardRef!: TemplateRef<FlightData>;
 * this.fluix.promise(promise, {
 *   success: (data) => ({
 *     title: 'Done',
 *     description: { templateRef: this.flightCardRef, context: data },
 *   }),
 * });
 * ```
 */

import type { TemplateRef } from "@angular/core";

export interface FluixDescriptionTemplate<T = unknown> {
	templateRef: TemplateRef<T>;
	context: T;
}

export function isDescriptionTemplate(
	desc: unknown,
): desc is FluixDescriptionTemplate {
	return (
		typeof desc === "object" &&
		desc !== null &&
		"templateRef" in desc &&
		"context" in desc
	);
}
