import { ChangeDetectionStrategy, Component, ElementRef, input, output, ViewChild } from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import type { FluixToastItem, ToastAttrs } from "@fluix-ui/core";
import { FluixAttrsDirective } from "../attrs.directive";
import { type FluixDescriptionTemplate, isDescriptionTemplate } from "./toast-description";

@Component({
	selector: "fluix-toast-content",
	standalone: true,
	imports: [NgTemplateOutlet, FluixAttrsDirective],
	template: `
		<div [fluixAttrs]="attrs().content">
			<div #contentRef [fluixAttrs]="attrs().description" [class]="item().styles?.description ?? ''">
				@if (descTemplate(); as desc) {
					<ng-container *ngTemplateOutlet="desc.templateRef; context: { $implicit: desc.context }" />
				} @else if (item().description) {
					{{ item().description }}
				}
				@if (item().button; as btn) {
					<button type="button" [fluixAttrs]="attrs().button" [class]="item().styles?.button ?? ''"
						(click)="onButtonClick($event)">{{ btn.title }}</button>
				}
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixToastContentComponent {
	readonly item = input.required<FluixToastItem>();
	readonly attrs = input.required<ToastAttrs>();
	readonly buttonClick = output<Event>();

	@ViewChild("contentRef") contentRef!: ElementRef<HTMLDivElement>;

	/** Description as template + context when applicable; null otherwise. */
	descTemplate(): FluixDescriptionTemplate | null {
		const d = this.item().description;
		return isDescriptionTemplate(d) ? d : null;
	}

	onButtonClick(e: Event): void {
		e.stopPropagation();
		this.buttonClick.emit(e);
	}
}
