import { Directive, ElementRef, effect, inject, input } from "@angular/core";

/**
 * Sets HTML attributes on the host from a record.
 * Used to apply data-fluix-* and other attrs from core's attr helpers.
 *
 * Tracks previously applied keys so stale attributes are removed when
 * the record changes (e.g. data-open going from "true" to being absent).
 */
@Directive({ selector: "[fluixAttrs]", standalone: true })
export class FluixAttrsDirective {
	readonly fluixAttrs = input<Record<string, string>>({});

	private el = inject(ElementRef<HTMLElement>);
	private previousKeys = new Set<string>();

	constructor() {
		effect(() => {
			const host = this.el.nativeElement;
			const attrs = this.fluixAttrs();
			const currentKeys = new Set<string>();

			for (const key of Object.keys(attrs)) {
				host.setAttribute(key, attrs[key]);
				currentKeys.add(key);
			}

			// Remove attributes that were present before but are no longer in the record
			for (const key of this.previousKeys) {
				if (!currentKeys.has(key)) {
					host.removeAttribute(key);
				}
			}

			this.previousKeys = currentKeys;
		});
	}
}
