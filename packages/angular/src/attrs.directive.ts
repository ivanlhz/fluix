import { Directive, ElementRef, effect, inject, input } from "@angular/core";

/**
 * Sets HTML attributes on the host from a record.
 * Used to apply data-fluix-* and other attrs from core's getToastAttrs.
 */
@Directive({ selector: "[fluixAttrs]", standalone: true })
export class FluixAttrsDirective {
	readonly fluixAttrs = input<Record<string, string>>({});

	private el = inject(ElementRef<HTMLElement>);

	constructor() {
		effect(() => {
			const host = this.el.nativeElement;
			const attrs = this.fluixAttrs();
			for (const key of Object.keys(attrs)) {
				host.setAttribute(key, attrs[key]);
			}
		});
	}
}
