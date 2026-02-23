import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FluixAttrsDirective } from "./attrs.directive";

@Component({
	selector: "fluix-menu-item",
	standalone: true,
	imports: [CommonModule, FluixAttrsDirective],
	template: `
		<button
			type="button"
			[fluixAttrs]="itemAttrs"
			[disabled]="disabled"
			(click)="handleClick()"
		>
			<ng-content />
		</button>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixMenuItemComponent {
	@Input({ required: true }) menuId!: string;
	@Input() disabled = false;
	@Input() active = false;
	@Input() itemAttrs: Record<string, string> = {};
	@Output() select = new EventEmitter<string>();

	handleClick(): void {
		if (this.disabled) return;
		this.select.emit(this.menuId);
	}
}
