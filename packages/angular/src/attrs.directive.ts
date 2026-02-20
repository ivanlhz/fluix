import {
	Directive,
	ElementRef,
	Input,
	OnChanges,
	SimpleChanges,
} from "@angular/core";

/**
 * Sets HTML attributes on the host from a record.
 * Used to apply data-fluix-* and other attrs from core's getToastAttrs.
 */
@Directive({ selector: "[fluixAttrs]", standalone: true })
export class FluixAttrsDirective implements OnChanges {
	@Input() fluixAttrs: Record<string, string> = {};

	constructor(private el: ElementRef<HTMLElement>) {}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes["fluixAttrs"]) {
			this.apply();
		}
	}

	private apply(): void {
		const host = this.el.nativeElement;
		const attrs = this.fluixAttrs;
		for (const key of Object.keys(attrs)) {
			host.setAttribute(key, attrs[key]);
		}
	}
}
