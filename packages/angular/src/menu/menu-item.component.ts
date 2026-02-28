import {
	ChangeDetectionStrategy,
	Component,
	input,
	output,
	signal,
} from "@angular/core";
import { FluixAttrsDirective } from "../attrs.directive";

@Component({
	selector: "fluix-menu-item",
	standalone: true,
	imports: [FluixAttrsDirective],
	styles: [`:host { display: contents; }`],
	template: `
		<button
			type="button"
			[fluixAttrs]="itemAttrs()"
			[disabled]="disabled()"
			(click)="handleClick()"
		>
			<ng-content />
		</button>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixMenuItemComponent {
	readonly menuId = input.required<string>();
	readonly disabled = input(false);

	/** Managed imperatively by FluixMenuComponent via @ContentChildren */
	readonly active = signal(false);
	readonly itemAttrs = signal<Record<string, string>>({});

	readonly select = output<string>();

	handleClick(): void {
		if (this.disabled()) return;
		this.select.emit(this.menuId());
	}
}
