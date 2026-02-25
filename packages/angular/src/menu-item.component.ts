import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	EventEmitter,
	inject,
	Input,
	Output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FluixAttrsDirective } from "./attrs.directive";

@Component({
	selector: "fluix-menu-item",
	standalone: true,
	imports: [CommonModule, FluixAttrsDirective],
	styles: [`:host { display: contents; }`],
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
	@Input() set itemAttrs(value: Record<string, string>) {
		this._itemAttrs = value ?? {};
		this.cdr.markForCheck();
	}
	get itemAttrs(): Record<string, string> {
		return this._itemAttrs;
	}
	_itemAttrs: Record<string, string> = {};

	@Output() select = new EventEmitter<string>();

	private cdr = inject(ChangeDetectorRef);

	handleClick(): void {
		if (this.disabled) return;
		this.select.emit(this.menuId);
	}
}
