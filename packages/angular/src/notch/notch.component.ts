import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	NgZone,
	OnDestroy,
	ViewChild,
	effect,
	inject,
	input,
	output,
	signal,
} from "@angular/core";
import {
	createNotchMachine,
	getNotchAttrs,
	FLUIX_SPRING,
	NOTCH_DEFAULTS,
	type NotchMachine,
	type NotchPosition,
	type NotchTrigger,
	type NotchTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import { FluixAttrsDirective } from "../attrs.directive";
import {
	type HighlightState,
	createHighlightState,
	animateHighlightEnter,
	animateHighlightLeave,
	resetHighlightImmediate,
} from "./notch-highlight";
import {
	type NotchAnimState,
	createNotchAnimState,
	initSvgRect,
	animateNotchRect,
} from "./notch-animation";

@Component({
	selector: "fluix-notch",
	standalone: true,
	imports: [FluixAttrsDirective],
	template: `
		<div data-fluix-notch-measure #measureContentEl></div>
		<div
			#rootEl
			[fluixAttrs]="attrs().root"
			[style.width.px]="rootW()"
			[style.height.px]="rootH()"
			role="button"
			[attr.tabindex]="0"
			[attr.aria-expanded]="isOpen()"
			[attr.aria-label]="ariaLabel()"
			(mouseenter)="onMouseEnter()"
			(mouseleave)="onMouseLeave()"
			(mouseover)="onItemEnter($event)"
			(click)="onClick()"
			(keydown)="onKeydown($event)"
		>
			<div [fluixAttrs]="attrs().canvas">
				<svg xmlns="http://www.w3.org/2000/svg"
					[attr.width]="rootW()" [attr.height]="rootH()"
					[attr.viewBox]="'0 0 ' + rootW() + ' ' + rootH()" aria-hidden="true">
					<defs>
						<filter id="fluix-notch-goo" x="-20%" y="-20%" width="140%" height="140%"
							color-interpolation-filters="sRGB">
							<feGaussianBlur in="SourceGraphic" [attr.stdDeviation]="blurVal()" result="blur" />
							<feColorMatrix in="blur" type="matrix"
								values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo" />
							<feComposite in="SourceGraphic" in2="goo" operator="atop" />
						</filter>
					</defs>
					<g filter="url(#fluix-notch-goo)">
						<rect #svgRectEl
							[attr.x]="(rootW() - collapsedW()) / 2" [attr.y]="(rootH() - collapsedH()) / 2"
							[attr.width]="collapsedW()" [attr.height]="collapsedH()"
							[attr.rx]="collapsedW() / 2" [attr.ry]="collapsedH() / 2"
							[attr.fill]="fill() || 'var(--fluix-notch-bg)'" />
						<rect #hoverBlobEl
							[attr.x]="(rootW() - collapsedW()) / 2" [attr.y]="(rootH() - collapsedH()) / 2"
							width="0" height="0" rx="0" ry="0" opacity="0"
							[attr.fill]="fill() || 'var(--fluix-notch-bg)'" />
					</g>
				</svg>
			</div>
			<div [fluixAttrs]="attrs().pill" [style.width.px]="dotSize()" [style.height.px]="dotSize()">
				<ng-content select="[notch-pill]" />
			</div>
			<div #contentEl [fluixAttrs]="attrs().content">
				<ng-content select="[notch-content]" />
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixNotchComponent implements AfterViewInit, OnDestroy {
	readonly trigger = input<NotchTrigger>("click");
	readonly position = input<NotchPosition>("top-center");
	readonly spring = input<SpringConfig | undefined>(undefined);
	readonly dotSize = input(36);
	readonly roundness = input(NOTCH_DEFAULTS.roundness);
	readonly theme = input<NotchTheme>("dark");
	readonly fill = input<string | undefined>(undefined);
	readonly open = input<boolean | undefined>(undefined);
	readonly ariaLabel = input("Toggle notch");
	readonly openChange = output<boolean>();

	@ViewChild("rootEl") rootElRef!: ElementRef<HTMLDivElement>;
	@ViewChild("measureContentEl") measureContentElRef!: ElementRef<HTMLDivElement>;
	@ViewChild("contentEl") contentElRef!: ElementRef<HTMLDivElement>;
	@ViewChild("svgRectEl") svgRectElRef!: ElementRef<SVGRectElement>;
	@ViewChild("hoverBlobEl") hoverBlobElRef!: ElementRef<SVGRectElement>;

	private ngZone = inject(NgZone);
	private machine!: NotchMachine;
	private unsubscribe?: () => void;

	readonly isOpen = signal(false);
	readonly attrs = signal(getNotchAttrs({ open: false, position: "top-center", theme: "dark" }));
	readonly contentSize = signal({ w: 200, h: 44 });

	readonly springConfig = () => this.spring() ?? FLUIX_SPRING;
	readonly blurVal = () => Math.min(10, Math.max(6, this.roundness() * 0.45));
	readonly collapsedW = () => this.dotSize();
	readonly collapsedH = () => this.dotSize();
	private readonly hlPad = 12;
	readonly expandedW = () => this.contentSize().w + this.hlPad * 2;
	readonly expandedH = () => Math.max(this.contentSize().h + this.hlPad, this.dotSize());
	readonly targetW = () => (this.isOpen() ? this.expandedW() : this.collapsedW());
	readonly targetH = () => (this.isOpen() ? this.expandedH() : this.collapsedH());
	readonly rootW = () => Math.max(this.expandedW(), this.collapsedW());
	readonly rootH = () => Math.max(this.expandedH(), this.collapsedH());

	private animState: NotchAnimState = createNotchAnimState();
	private currentAnim: Animation | null = null;
	private highlightAnim: Animation | null = null;
	private hlPrev: HighlightState = createHighlightState();
	private prevOpenVal: boolean | undefined;
	private measureObs?: ResizeObserver;
	private measureRaf = 0;

	constructor() {
		this.machine = createNotchMachine({
			position: this.position(), trigger: this.trigger(),
			roundness: this.roundness(), fill: this.fill(), spring: this.spring(),
		});

		effect(() => {
			this.machine.configure({
				position: this.position(), trigger: this.trigger(),
				roundness: this.roundness(), fill: this.fill(), spring: this.spring(),
			});
		});

		effect(() => {
			const openVal = this.open();
			if (openVal === undefined) return;
			const snap = this.machine.store.getSnapshot();
			if (openVal && !snap.open) this.machine.open();
			else if (!openVal && snap.open) this.machine.close();
		});

		effect(() => {
			this.attrs.set(getNotchAttrs({ open: this.isOpen(), position: this.position(), theme: this.theme() }));
		});
	}

	ngAfterViewInit(): void {
		this.unsubscribe = this.machine.store.subscribe(() => {
			this.ngZone.run(() => {
				const snap = this.machine.store.getSnapshot();
				const wasOpen = this.isOpen();
				this.isOpen.set(snap.open);
				this.attrs.set(getNotchAttrs({ open: snap.open, position: this.position(), theme: this.theme() }));

				if (this.prevOpenVal !== undefined && this.prevOpenVal !== snap.open) this.openChange.emit(snap.open);
				this.prevOpenVal = snap.open;

				const rect = this.svgRectElRef?.nativeElement;
				if (rect) {
					this.currentAnim = animateNotchRect(rect, this.animState, this.currentAnim, {
						targetW: this.targetW(), targetH: this.targetH(),
						rootW: this.rootW(), rootH: this.rootH(),
						collapsedW: this.collapsedW(), collapsedH: this.collapsedH(),
						roundness: this.roundness(), spring: this.springConfig(),
					});
				}

				if (wasOpen && !snap.open) this.doResetHighlight();
				document.documentElement.style.setProperty("--fluix-notch-offset", `${this.rootH()}px`);
			});
		});

		const snap = this.machine.store.getSnapshot();
		this.isOpen.set(snap.open);
		this.prevOpenVal = snap.open;
		this.attrs.set(getNotchAttrs({ open: snap.open, position: this.position(), theme: this.theme() }));

		const rect = this.svgRectElRef?.nativeElement;
		if (rect) initSvgRect(rect, this.animState, this.collapsedW(), this.collapsedH(), this.rootW(), this.rootH());
		this.setupMeasureObserver();
		document.documentElement.style.setProperty("--fluix-notch-offset", `${this.rootH()}px`);
	}

	ngOnDestroy(): void {
		this.unsubscribe?.();
		this.currentAnim?.cancel();
		this.highlightAnim?.cancel();
		cancelAnimationFrame(this.measureRaf);
		this.measureObs?.disconnect();
		this.machine.destroy();
		document.documentElement.style.removeProperty("--fluix-notch-offset");
	}

	onMouseEnter(): void { if (this.trigger() === "hover") this.handleOpen(); }
	onMouseLeave(): void {
		if (this.trigger() === "hover") { this.handleClose(); this.doResetHighlight(); return; }
		this.onItemLeave();
	}
	onClick(): void { if (this.trigger() === "click") this.handleToggle(); }

	onKeydown(e: KeyboardEvent): void {
		if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.handleToggle(); }
		if (e.key === "Escape" && this.isOpen()) { e.preventDefault(); this.handleClose(); }
	}

	onItemEnter(e: MouseEvent): void {
		const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
		const rect = this.hoverBlobElRef?.nativeElement;
		const root = this.rootElRef?.nativeElement;
		if (!target || !rect || !root || !this.isOpen()) return;

		const rootRect = root.getBoundingClientRect();
		const itemRect = target.getBoundingClientRect();
		const padX = 8, padY = 4;
		const blobOvershoot = Math.max(6, this.roundness() * 0.35);
		const toW = target.offsetWidth + padX * 2;
		const toH = Math.max(target.offsetHeight + padY * 2, rootRect.height + blobOvershoot * 2);
		const toX = itemRect.left + itemRect.width / 2 - rootRect.left - toW / 2;
		const toY = itemRect.top + itemRect.height / 2 - rootRect.top - toH / 2;

		if (this.highlightAnim) { this.highlightAnim.cancel(); this.highlightAnim = null; }
		this.highlightAnim = animateHighlightEnter(rect, this.hlPrev, { x: toX, y: toY, w: toW, h: toH, rx: toH / 2 }, this.springConfig());
	}

	private handleOpen(): void { if (this.open() === undefined) this.machine.open(); else this.openChange.emit(true); }
	private handleClose(): void { if (this.open() === undefined) this.machine.close(); else this.openChange.emit(false); }
	private handleToggle(): void { if (this.open() === undefined) this.machine.toggle(); else this.openChange.emit(!this.machine.store.getSnapshot().open); }

	private doResetHighlight(): void {
		const rect = this.hoverBlobElRef?.nativeElement;
		if (!rect) return;
		if (this.highlightAnim) { this.highlightAnim.cancel(); this.highlightAnim = null; }
		resetHighlightImmediate(rect, this.hlPrev, this.rootW() / 2, this.rootH() / 2);
	}

	private onItemLeave(): void {
		const rect = this.hoverBlobElRef?.nativeElement;
		if (!rect) return;
		if (this.highlightAnim) { this.highlightAnim.cancel(); this.highlightAnim = null; }
		this.highlightAnim = animateHighlightLeave(rect, this.hlPrev, this.springConfig());
	}

	private setupMeasureObserver(): void {
		const el = this.measureContentElRef?.nativeElement;
		if (!el) return;
		const contentEl = this.contentElRef?.nativeElement;
		if (contentEl) el.innerHTML = contentEl.innerHTML;

		const measure = () => {
			const r = el.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) {
				const s = { w: Math.ceil(r.width), h: Math.ceil(r.height) };
				const c = this.contentSize();
				if (s.w !== c.w || s.h !== c.h) this.contentSize.set(s);
			}
		};
		measure();
		this.measureObs = new ResizeObserver(() => {
			cancelAnimationFrame(this.measureRaf);
			this.measureRaf = requestAnimationFrame(() => this.ngZone.run(() => measure()));
		});
		this.measureObs.observe(el);
	}
}
