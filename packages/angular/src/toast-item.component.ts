/**
 * Single toast item: applies attrs from core, SVG gooey, connectToast, WAAPI pill animation.
 */

import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	Output,
	signal,
	SimpleChanges,
	ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { isDescriptionTemplate } from "./toast-description";
import {
	Toaster as CoreToaster,
	FLUIX_SPRING,
	type FluixToastItem,
	type ToastAttrs,
	TOAST_DEFAULTS,
	animateSpring,
} from "@fluix-ui/core";
import { getToastRootVars } from "./toast-root-vars";
import { FluixAttrsDirective } from "./attrs.directive";
import { FluixToastIconComponent } from "./toast-icon.component";

const WIDTH = 350;
const HEIGHT = 40;
const PILL_PADDING = 10;
const MIN_EXPAND_RATIO = 2.25;
const BODY_MERGE_OVERLAP = 6;

function getPillAlign(position: FluixToastItem["position"]): "left" | "center" | "right" {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

@Component({
	selector: "fluix-toast-item",
	standalone: true,
	imports: [CommonModule, FluixAttrsDirective, FluixToastIconComponent],
	template: `
		<button
			type="button"
			#rootEl
			[fluixAttrs]="attrs.root"
			[ngStyle]="rootVars"
		>
			<div [fluixAttrs]="attrs.canvas">
				<svg
					[attr.xmlns]="'http://www.w3.org/2000/svg'"
					data-fluix-svg
					[attr.width]="WIDTH"
					[attr.height]="svgHeight"
					[attr.viewBox]="viewBox"
					aria-hidden
				>
					<defs>
						<filter
							[id]="filterId"
							x="-20%"
							y="-20%"
							width="140%"
							height="140%"
							colorInterpolationFilters="sRGB"
						>
							<feGaussianBlur in="SourceGraphic" [attr.stdDeviation]="blur" result="blur" />
							<feColorMatrix
								in="blur"
								type="matrix"
								values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
								result="goo"
							/>
							<feComposite in="SourceGraphic" in2="goo" operator="atop" />
						</filter>
					</defs>
					<g [attr.filter]="'url(#' + filterId + ')'">
						<rect
							#pillRef
							data-fluix-pill
							[attr.x]="pillX"
							y="0"
							[attr.width]="resolvedPillWidth"
							[attr.height]="HEIGHT"
							[attr.rx]="roundness"
							[attr.ry]="roundness"
							[attr.fill]="item.fill ?? 'var(--fluix-surface-contrast)'"
						/>
						<rect
							data-fluix-body
							x="0"
							[attr.y]="HEIGHT"
							[attr.width]="WIDTH"
							height="0"
							[attr.rx]="roundness"
							[attr.ry]="roundness"
							[attr.fill]="item.fill ?? 'var(--fluix-surface-contrast)'"
							opacity="0"
						/>
					</g>
				</svg>
			</div>

			<div #headerRef data-fluix-header [fluixAttrs]="attrs.header">
				<div data-fluix-header-stack>
					<div data-fluix-header-inner data-layer="current">
						<div [fluixAttrs]="attrs.badge" [attr.data-state]="item.state" [class]="item.styles?.badge ?? ''">
							<fluix-toast-icon [state]="item.state" [icon]="item.icon" />
						</div>
						<span [fluixAttrs]="attrs.title" [attr.data-state]="item.state" [class]="item.styles?.title ?? ''">
							{{ item.title ?? item.state }}
						</span>
					</div>
				</div>
			</div>

			@if (hasDesc) {
				<div [fluixAttrs]="attrs.content">
					<div #contentRef [fluixAttrs]="attrs.description" [class]="item.styles?.description ?? ''">
						@if (isDescriptionTemplate(item.description)) {
							<ng-container *ngTemplateOutlet="item.description.templateRef; context: { $implicit: item.description.context }" />
						} @else if (typeof item.description === 'string') {
							{{ item.description }}
						}
						@if (item.button) {
							<button
								type="button"
								[fluixAttrs]="attrs.button"
								[class]="item.styles?.button ?? ''"
								(click)="onButtonClick($event)"
							>
								{{ item.button.title }}
							</button>
						}
					</div>
				</div>
			}
		</button>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixToastItemComponent implements AfterViewInit, OnChanges, OnDestroy {
	@ViewChild("rootEl") rootEl!: ElementRef<HTMLButtonElement>;
	@ViewChild("pillRef") pillRef!: ElementRef<SVGRectElement>;
	@ViewChild("contentRef") contentRef!: ElementRef<HTMLDivElement> | null;
	@ViewChild("headerRef") headerRef!: ElementRef<HTMLDivElement>;

	@Input({ required: true }) item!: FluixToastItem;
	@Input({ required: true }) localState!: { ready: boolean; expanded: boolean };
	@Output() localStateChange = new EventEmitter<Partial<{ ready: boolean; expanded: boolean }>>();

	readonly WIDTH = WIDTH;
	readonly HEIGHT = HEIGHT;

	readonly pillWidth = signal(0);
	readonly contentHeight = signal(0);

	private connectDestroy: (() => void) | null = null;
	private pillRo: ResizeObserver | null = null;
	private contentRo: ResizeObserver | null = null;
	private pillAnim: Animation | null = null;
	private pillFirst = true;
	private prevPill = { x: 0, width: HEIGHT, height: HEIGHT };
	private hovering = false;
	private pendingDismiss = false;
	private dismissRequested = false;
	private timers: ReturnType<typeof setTimeout>[] = [];
	private machine = CoreToaster.getMachine();

	ngOnChanges(changes: SimpleChanges): void {
		if (changes["localState"] && this.rootEl?.nativeElement) {
			queueMicrotask(() => this.runPillAnimation());
		}
	}

	get attrs(): ToastAttrs {
		return CoreToaster.getAttrs(this.item, this.localState);
	}

	get roundness(): number {
		return this.item.roundness ?? TOAST_DEFAULTS.roundness;
	}

	get hasDesc(): boolean {
		return Boolean(this.item.description) || Boolean(this.item.button);
	}

	/** Used in template to render description as string or NgTemplateOutlet. */
	readonly isDescriptionTemplate = isDescriptionTemplate;

	get edge(): "top" | "bottom" {
		return this.item.position.startsWith("top") ? "bottom" : "top";
	}

	get open(): boolean {
		return this.hasDesc && this.localState.expanded && this.item.state !== "loading";
	}

	get minExpanded(): number {
		return HEIGHT * MIN_EXPAND_RATIO;
	}

	get rawExpanded(): number {
		return this.hasDesc
			? Math.max(this.minExpanded, HEIGHT + this.contentHeight())
			: this.minExpanded;
	}

	frozenExpanded = this.minExpanded;

	get expanded(): number {
		if (this.open) {
			this.frozenExpanded = this.rawExpanded;
		}
		return this.open ? this.rawExpanded : this.frozenExpanded;
	}

	get expandedContent(): number {
		return Math.max(0, this.expanded - HEIGHT);
	}

	get svgHeight(): number {
		return this.hasDesc ? Math.max(this.expanded, this.minExpanded) : HEIGHT;
	}

	get viewBox(): string {
		return `0 0 ${WIDTH} ${this.svgHeight}`;
	}

	get blur(): number {
		return Math.min(10, Math.max(6, this.roundness * 0.45));
	}

	get filterId(): string {
		return `fluix-gooey-${this.item.id.replace(/[^a-z0-9-]/gi, "-")}`;
	}

	get position(): "left" | "center" | "right" {
		return getPillAlign(this.item.position);
	}

	get resolvedPillWidth(): number {
		return Math.max(this.pillWidth() || HEIGHT, HEIGHT);
	}

	get pillHeight(): number {
		return HEIGHT + this.blur * 3;
	}

	get pillX(): number {
		const w = this.resolvedPillWidth;
		if (this.position === "right") return WIDTH - w;
		if (this.position === "center") return (WIDTH - w) / 2;
		return 0;
	}

	get rootVars(): Record<string, string> {
		return getToastRootVars({
			open: this.open,
			expanded: this.expanded,
			height: HEIGHT,
			resolvedPillWidth: this.resolvedPillWidth,
			pillX: this.pillX,
			edge: this.edge,
			expandedContent: this.expandedContent,
			bodyMergeOverlap: BODY_MERGE_OVERLAP,
		});
	}

	ngAfterViewInit(): void {
		const el = this.rootEl?.nativeElement;
		if (!el) return;

		const callbacks = {
			onExpand: () => {
				if (this.item.exiting || this.dismissRequested) return;
				this.localStateChange.emit({ expanded: true });
			},
			onCollapse: () => {
				if (this.item.exiting || this.dismissRequested) return;
				if (this.item.autopilot !== false) return;
				this.localStateChange.emit({ expanded: false });
			},
			onDismiss: () => {
				if (this.dismissRequested) return;
				this.dismissRequested = true;
				this.machine.dismiss(this.item.id);
			},
			onHoverStart: () => {
				this.hovering = true;
			},
			onHoverEnd: () => {
				this.hovering = false;
				if (this.pendingDismiss) {
					this.pendingDismiss = false;
					if (!this.dismissRequested) {
						this.dismissRequested = true;
						this.machine.dismiss(this.item.id);
					}
				}
			},
		};

		const conn = CoreToaster.connect(el, callbacks, this.item);
		this.connectDestroy = conn.destroy;

		// Mark ready after mount
		this.timers.push(
			setTimeout(() => {
				this.localStateChange.emit({ ready: true });
			}, 32),
		);

		// Measure pill (header inner width)
		const headerEl = this.headerRef?.nativeElement;
		const inner = headerEl?.querySelector("[data-fluix-header-inner]");
		if (inner) {
			const measurePill = () => {
				const pad = 12 + 12;
				const w = (inner as HTMLElement).scrollWidth + pad + PILL_PADDING;
				if (w > PILL_PADDING) {
					this.pillWidth.set(w);
					queueMicrotask(() => this.runPillAnimation());
				}
			};
			measurePill();
			this.pillRo = new ResizeObserver(() => measurePill());
			this.pillRo.observe(inner);
		}

		if (this.hasDesc && this.contentRef?.nativeElement) {
			const contentEl = this.contentRef.nativeElement;
			const measureContent = () => {
				this.contentHeight.set(contentEl.scrollHeight);
				queueMicrotask(() => this.runPillAnimation());
			};
			measureContent();
			this.contentRo = new ResizeObserver(() => measureContent());
			this.contentRo.observe(contentEl);
		}

		// Auto-dismiss
		const duration = this.item.duration;
		if (duration != null && duration > 0) {
			this.timers.push(
				setTimeout(() => {
					if (this.hovering) {
						this.pendingDismiss = true;
						this.timers.push(
							setTimeout(() => {
								if (!this.dismissRequested) {
									this.dismissRequested = true;
									this.pendingDismiss = false;
									this.machine.dismiss(this.item.id);
								}
							}, 1200),
						);
						return;
					}
					this.dismissRequested = true;
					this.machine.dismiss(this.item.id);
				}, duration),
			);
		}

		// Autopilot expand/collapse
		if (this.item.autoExpandDelayMs != null && this.item.autoExpandDelayMs > 0) {
			this.timers.push(
				setTimeout(() => {
					if (!this.hovering) this.localStateChange.emit({ expanded: true });
				}, this.item.autoExpandDelayMs),
			);
		}
		if (this.item.autoCollapseDelayMs != null && this.item.autoCollapseDelayMs > 0) {
			this.timers.push(
				setTimeout(() => {
					if (!this.hovering) this.localStateChange.emit({ expanded: false });
				}, this.item.autoCollapseDelayMs),
			);
		}

		// Pill WAAPI animation runs in a microtask after view so pillRef is set
		queueMicrotask(() => this.runPillAnimation());
	}

	ngOnDestroy(): void {
		this.connectDestroy?.();
		this.pillRo?.disconnect();
		this.contentRo?.disconnect();
		this.pillAnim?.cancel();
		this.timers.forEach(clearTimeout);
		this.timers = [];
	}

	private runPillAnimation(): void {
		const el = this.pillRef?.nativeElement;
		if (!el || !this.localState.ready) return;

		const next = {
			x: this.pillX,
			width: this.resolvedPillWidth,
			height: this.open ? this.pillHeight : HEIGHT,
		};

		if (
			this.prevPill.x === next.x &&
			this.prevPill.width === next.width &&
			this.prevPill.height === next.height
		) {
			return;
		}

		this.pillAnim?.cancel();

		if (this.pillFirst) {
			this.pillFirst = false;
			el.setAttribute("x", String(next.x));
			el.setAttribute("width", String(next.width));
			el.setAttribute("height", String(next.height));
			this.prevPill = next;
			return;
		}

		const anim = animateSpring(
			el,
			{
				x: { from: this.prevPill.x, to: next.x, unit: "px" },
				width: { from: this.prevPill.width, to: next.width, unit: "px" },
				height: { from: this.prevPill.height, to: next.height, unit: "px" },
			},
			FLUIX_SPRING,
		);
		this.pillAnim = anim;
		this.prevPill = next;
	}

	onButtonClick(e: Event): void {
		e.stopPropagation();
		this.item.button?.onClick();
	}
}
