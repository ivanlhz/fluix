/**
 * Single toast item: applies attrs from core, SVG gooey, connectToast, WAAPI pill animation.
 */
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	NO_ERRORS_SCHEMA,
	OnDestroy,
	ViewChild,
	effect,
	input,
	output,
	signal,
} from "@angular/core";
import { NgStyle } from "@angular/common";
import {
	Toaster as CoreToaster,
	type FluixToastItem,
	type ToastAttrs,
	TOAST_DEFAULTS,
} from "@fluix-ui/core";
import { getToastRootVars } from "./toast-root-vars";
import { FluixAttrsDirective } from "../attrs.directive";
import { FluixToastIconComponent } from "./toast-icon.component";
import { FluixToastSvgComponent } from "./toast-svg.component";
import { FluixToastContentComponent } from "./toast-content.component";
import { type PillAnimState, createPillAnimState, runPillAnimation } from "./toast-pill-anim";

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
	imports: [NgStyle, FluixAttrsDirective, FluixToastIconComponent, FluixToastSvgComponent, FluixToastContentComponent],
	schemas: [NO_ERRORS_SCHEMA],
	template: `
		<button type="button" #rootEl [fluixAttrs]="attrs.root" [ngStyle]="rootVars">
			<div [fluixAttrs]="attrs.canvas">
				<fluix-toast-svg [width]="WIDTH" [svgHeight]="svgHeight" [viewBox]="viewBox"
					[filterId]="filterId" [blur]="blur">
					<rect #pillRef data-fluix-pill [attr.x]="pillX" y="0"
						[attr.width]="resolvedPillWidth" [attr.height]="HEIGHT"
						[attr.rx]="roundness" [attr.ry]="roundness"
						[attr.fill]="item().fill ?? 'var(--fluix-surface-contrast)'" />
					<rect data-fluix-body x="0" [attr.y]="HEIGHT" [attr.width]="WIDTH"
						height="0" [attr.rx]="roundness" [attr.ry]="roundness"
						[attr.fill]="item().fill ?? 'var(--fluix-surface-contrast)'" opacity="0" />
				</fluix-toast-svg>
			</div>
			<div #headerRef data-fluix-header [fluixAttrs]="attrs.header">
				<div data-fluix-header-stack>
					<div data-fluix-header-inner data-layer="current">
						<div [fluixAttrs]="attrs.badge" [class]="item().styles?.badge ?? ''">
							<fluix-toast-icon [state]="item().state" [icon]="item().icon" />
						</div>
						<span [fluixAttrs]="attrs.title" [class]="item().styles?.title ?? ''">
							{{ item().title ?? item().state }}
						</span>
					</div>
				</div>
			</div>
			@if (hasDesc) {
				<fluix-toast-content [item]="item()" [attrs]="attrs"
					(buttonClick)="item().button?.onClick()" />
			}
		</button>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixToastItemComponent implements AfterViewInit, OnDestroy {
	@ViewChild("rootEl") rootEl!: ElementRef<HTMLButtonElement>;
	@ViewChild("pillRef") pillRef!: ElementRef<SVGRectElement>;
	@ViewChild("headerRef") headerRef!: ElementRef<HTMLDivElement>;

	readonly item = input.required<FluixToastItem>();
	readonly localState = input.required<{ ready: boolean; expanded: boolean }>();
	readonly localStateChange = output<Partial<{ ready: boolean; expanded: boolean }>>();

	readonly WIDTH = WIDTH;
	readonly HEIGHT = HEIGHT;
	readonly pillWidth = signal(0);
	readonly contentHeight = signal(0);

	private connectDestroy: (() => void) | null = null;
	private pillRo: ResizeObserver | null = null;
	private contentRo: ResizeObserver | null = null;
	private pillAnimState: PillAnimState = createPillAnimState();
	private hovering = false;
	private pendingDismiss = false;
	private dismissRequested = false;
	private timers: ReturnType<typeof setTimeout>[] = [];
	private machine = CoreToaster.getMachine();

	constructor() {
		effect(() => { this.localState(); queueMicrotask(() => this.doPillAnimation()); });
	}

	get attrs(): ToastAttrs { return CoreToaster.getAttrs(this.item(), this.localState()); }
	get roundness(): number { return this.item().roundness ?? TOAST_DEFAULTS.roundness; }
	get hasDesc(): boolean { return Boolean(this.item().description) || Boolean(this.item().button); }
	get edge(): "top" | "bottom" { return this.item().position.startsWith("top") ? "bottom" : "top"; }
	get open(): boolean { return this.hasDesc && this.localState().expanded && this.item().state !== "loading"; }
	get minExpanded(): number { return HEIGHT * MIN_EXPAND_RATIO; }
	get rawExpanded(): number { return this.hasDesc ? Math.max(this.minExpanded, HEIGHT + this.contentHeight()) : this.minExpanded; }
	frozenExpanded = this.minExpanded;
	get expanded(): number { if (this.open) this.frozenExpanded = this.rawExpanded; return this.open ? this.rawExpanded : this.frozenExpanded; }
	get expandedContent(): number { return Math.max(0, this.expanded - HEIGHT); }
	get svgHeight(): number { return this.hasDesc ? Math.max(this.expanded, this.minExpanded) : HEIGHT; }
	get viewBox(): string { return `0 0 ${WIDTH} ${this.svgHeight}`; }
	get blur(): number { return Math.min(10, Math.max(6, this.roundness * 0.45)); }
	get filterId(): string { return `fluix-gooey-${this.item().id.replace(/[^a-z0-9-]/gi, "-")}`; }
	get position(): "left" | "center" | "right" { return getPillAlign(this.item().position); }
	get resolvedPillWidth(): number { return Math.max(this.pillWidth() || HEIGHT, HEIGHT); }
	get pillHeight(): number { return HEIGHT + this.blur * 3; }
	get pillX(): number { const w = this.resolvedPillWidth; if (this.position === "right") return WIDTH - w; if (this.position === "center") return (WIDTH - w) / 2; return 0; }

	get rootVars(): Record<string, string> {
		return getToastRootVars({
			open: this.open, expanded: this.expanded, height: HEIGHT,
			resolvedPillWidth: this.resolvedPillWidth, pillX: this.pillX,
			edge: this.edge, expandedContent: this.expandedContent, bodyMergeOverlap: BODY_MERGE_OVERLAP,
		});
	}

	ngAfterViewInit(): void {
		const el = this.rootEl?.nativeElement;
		if (!el) return;

		this.connectDestroy = CoreToaster.connect(el, {
			onExpand: () => { if (!this.item().exiting && !this.dismissRequested) this.localStateChange.emit({ expanded: true }); },
			onCollapse: () => { if (!this.item().exiting && !this.dismissRequested && this.item().autopilot === false) this.localStateChange.emit({ expanded: false }); },
			onDismiss: () => { if (!this.dismissRequested) { this.dismissRequested = true; this.machine.dismiss(this.item().id); } },
			onHoverStart: () => { this.hovering = true; },
			onHoverEnd: () => {
				this.hovering = false;
				if (this.pendingDismiss && !this.dismissRequested) { this.pendingDismiss = false; this.dismissRequested = true; this.machine.dismiss(this.item().id); }
			},
		}, this.item()).destroy;

		this.timers.push(setTimeout(() => this.localStateChange.emit({ ready: true }), 32));
		this.setupPillObserver();
		this.setupContentObserver();
		this.setupAutoDismiss();
		this.setupAutopilot();
		queueMicrotask(() => this.doPillAnimation());
	}

	ngOnDestroy(): void {
		this.connectDestroy?.();
		this.pillRo?.disconnect();
		this.contentRo?.disconnect();
		this.pillAnimState.pillAnim?.cancel();
		this.timers.forEach(clearTimeout);
		this.timers = [];
	}

	private doPillAnimation(): void {
		const el = this.pillRef?.nativeElement;
		if (!el || !this.localState().ready) return;
		runPillAnimation(el, this.pillAnimState, { x: this.pillX, width: this.resolvedPillWidth, height: this.open ? this.pillHeight : HEIGHT });
	}

	private setupPillObserver(): void {
		const inner = this.headerRef?.nativeElement?.querySelector("[data-fluix-header-inner]");
		if (!inner) return;
		const measure = () => { const w = (inner as HTMLElement).scrollWidth + 24 + PILL_PADDING; if (w > PILL_PADDING) { this.pillWidth.set(w); queueMicrotask(() => this.doPillAnimation()); } };
		measure();
		this.pillRo = new ResizeObserver(() => measure());
		this.pillRo.observe(inner);
	}

	private setupContentObserver(): void {
		if (!this.hasDesc) return;
		// Content is rendered in FluixToastContentComponent; observe its contentRef after a tick
		queueMicrotask(() => {
			const contentEl = this.rootEl?.nativeElement?.querySelector("[data-fluix-description]") as HTMLElement | null;
			if (!contentEl) return;
			const measure = () => { this.contentHeight.set(contentEl.scrollHeight); queueMicrotask(() => this.doPillAnimation()); };
			measure();
			this.contentRo = new ResizeObserver(() => measure());
			this.contentRo.observe(contentEl);
		});
	}

	private setupAutoDismiss(): void {
		const duration = this.item().duration;
		if (duration == null || duration <= 0) return;
		this.timers.push(setTimeout(() => {
			if (this.hovering) {
				this.pendingDismiss = true;
				this.timers.push(setTimeout(() => { if (!this.dismissRequested) { this.dismissRequested = true; this.pendingDismiss = false; this.machine.dismiss(this.item().id); } }, 1200));
				return;
			}
			this.dismissRequested = true; this.machine.dismiss(this.item().id);
		}, duration));
	}

	private setupAutopilot(): void {
		const i = this.item();
		if (i.autoExpandDelayMs != null && i.autoExpandDelayMs > 0)
			this.timers.push(setTimeout(() => { if (!this.hovering) this.localStateChange.emit({ expanded: true }); }, i.autoExpandDelayMs));
		if (i.autoCollapseDelayMs != null && i.autoCollapseDelayMs > 0)
			this.timers.push(setTimeout(() => { if (!this.hovering) this.localStateChange.emit({ expanded: false }); }, i.autoCollapseDelayMs));
	}
}
