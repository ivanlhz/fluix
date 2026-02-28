/**
 * Angular Toaster — subscribes to core store, groups toasts by position,
 * renders viewports and FluixToastItemComponent per toast.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, NgZone, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import {
	Toaster as CoreToaster,
	type FluixPosition,
	type FluixToastItem,
	type FluixToasterConfig,
	type ToastMachineState,
} from "@fluix-ui/core";
import { getToastState$ } from "./toast-state";
import { getViewportOffsetStyle } from "./viewport-offset";
import { FluixToastItemComponent } from "./toast-item.component";

@Component({
	selector: "fluix-toaster",
	standalone: true,
	imports: [CommonModule, FluixToastItemComponent],
	template: `
		@if (snapshot(); as s) {
			@for (position of positionKeys(s); track position) {
				<section
					[attr.data-fluix-viewport]="''"
					[attr.data-position]="position"
					[attr.data-layout]="resolvedLayout(s)"
					[attr.aria-live]="'polite'"
					[attr.role]="'region'"
					[ngStyle]="getViewportOffsetStyle(resolvedOffset(s), position)"
				>
					@for (item of getToastsForPosition(s, position); track item?.instanceId ?? $index) {
						@if (item) {
							<fluix-toast-item
								[item]="item"
								[localState]="getLocalState(item.id)"
								(localStateChange)="setToastLocal(item.id, $event)"
							/>
						}
					}
				</section>
			}
		}
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixToasterComponent {
	/** Default position and viewport config. Applied on mount and when changed. */
	readonly config = input<FluixToasterConfig | undefined>(undefined);

	readonly snapshot = signal<ToastMachineState | null>(null);
	readonly snapshot$ = getToastState$();

	private localState = new Map<string, { ready: boolean; expanded: boolean }>();
	private machine = CoreToaster.getMachine();
	private destroyRef = inject(DestroyRef);
	private ngZone = inject(NgZone);

	constructor() {
		// Set initial snapshot so viewport structure can render as soon as toasts exist
		const initial = this.machine.store.getSnapshot();
		this.snapshot.set(initial);

		this.snapshot$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((s) => {
				this.ngZone.run(() => {
					const ids = new Set(s.toasts.map((t) => t.id));
					const next = new Map<string, { ready: boolean; expanded: boolean }>();
					for (const id of ids) {
						next.set(id, this.localState.get(id) ?? { ready: false, expanded: false });
					}
					this.localState = next;
					this.snapshot.set(s);
				});
			});

		effect(() => {
			const cfg = this.config();
			if (cfg) this.machine.configure(cfg);
		});
	}

	positionKeys(s: ToastMachineState): FluixPosition[] {
		const set = new Set<FluixPosition>();
		for (const t of s.toasts) set.add(t.position);
		return Array.from(set);
	}

	getToastsForPosition(s: ToastMachineState, position: FluixPosition): FluixToastItem[] {
		return s.toasts.filter((t) => t.position === position);
	}

	resolvedLayout(s: ToastMachineState): "stack" | "notch" {
		return s.config?.layout ?? "stack";
	}

	resolvedOffset(s: ToastMachineState): FluixToasterConfig["offset"] {
		return s.config?.offset;
	}

	getViewportOffsetStyle = getViewportOffsetStyle;

	getLocalState(id: string): { ready: boolean; expanded: boolean } {
		return this.localState.get(id) ?? { ready: false, expanded: false };
	}

	setToastLocal(id: string, patch: Partial<{ ready: boolean; expanded: boolean }>): void {
		const cur = this.localState.get(id) ?? { ready: false, expanded: false };
		this.localState.set(id, { ...cur, ...patch });
		this.snapshot.update((s) => (s ? { ...s } : s));
	}
}
