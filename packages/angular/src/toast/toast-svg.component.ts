import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	selector: "fluix-toast-svg",
	standalone: true,
	template: `
		<svg [attr.xmlns]="'http://www.w3.org/2000/svg'" data-fluix-svg
			[attr.width]="width()" [attr.height]="svgHeight()" [attr.viewBox]="viewBox()" aria-hidden>
			<defs>
				<filter [id]="filterId()" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
					<feGaussianBlur in="SourceGraphic" [attr.stdDeviation]="blur()" result="blur" />
					<feColorMatrix in="blur" type="matrix"
						values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
					<feComposite in="SourceGraphic" in2="goo" operator="atop" />
				</filter>
			</defs>
			<g [attr.filter]="'url(#' + filterId() + ')'">
				<ng-content />
			</g>
		</svg>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixToastSvgComponent {
	readonly width = input.required<number>();
	readonly svgHeight = input.required<number>();
	readonly viewBox = input.required<string>();
	readonly filterId = input.required<string>();
	readonly blur = input.required<number>();
}
