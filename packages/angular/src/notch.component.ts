/**
 * Angular Notch — standalone component wrapping core notch machine.
 *
 * Uses ViewChild refs for SVG rect manipulation and WAAPI spring animations.
 * Follows the same architecture as FluixToastItemComponent.
 */

import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	EventEmitter,
	Input,
	NgZone,
	OnChanges,
	OnDestroy,
	Output,
	SimpleChanges,
	ViewChild,
	inject,
	signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
	createNotchMachine,
	getNotchAttrs,
	animateSpring,
	FLUIX_SPRING,
	NOTCH_DEFAULTS,
	type NotchMachine,
	type NotchPosition,
	type NotchTrigger,
	type NotchTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import { FluixAttrsDirective } from "./attrs.directive";

@Component({
	selector: "fluix-notch",
	standalone: true,
	imports: [CommonModule, FluixAttrsDirective],
	template: `
		<!-- Hidden content measurer -->
		<div data-fluix-notch-measure #measureContentEl>
			<ng-content select="[notch-content]" />
		</div>

		<!-- Visible notch -->
		<div
			#rootEl
			[fluixAttrs]="attrs().root"
			[style.width.px]="rootW()"
			[style.height.px]="rootH()"
			(mouseenter)="onMouseEnter()"
			(mouseleave)="onMouseLeave()"
			(mouseover)="onItemEnter($event)"
			(click)="onClick()"
		>
			<!-- SVG gooey background -->
			<div [fluixAttrs]="attrs().canvas">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					[attr.width]="rootW()"
					[attr.height]="rootH()"
					[attr.viewBox]="'0 0 ' + rootW() + ' ' + rootH()"
					aria-hidden="true"
				>
					<defs>
						<filter
							id="fluix-notch-goo"
							x="-20%" y="-20%" width="140%" height="140%"
							color-interpolation-filters="sRGB"
						>
							<feGaussianBlur in="SourceGraphic" [attr.stdDeviation]="blur()" result="blur" />
							<feColorMatrix
								in="blur" type="matrix"
								values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
								result="goo"
							/>
							<feComposite in="SourceGraphic" in2="goo" operator="atop" />
						</filter>
					</defs>
					<g filter="url(#fluix-notch-goo)">
						<rect
							#svgRectEl
							[attr.x]="(rootW() - collapsedW()) / 2"
							[attr.y]="(rootH() - collapsedH()) / 2"
							[attr.width]="collapsedW()"
							[attr.height]="collapsedH()"
							[attr.rx]="collapsedW() / 2"
							[attr.ry]="collapsedH() / 2"
							[attr.fill]="fill || 'var(--fluix-notch-bg)'"
						/>
					</g>
					<!-- Highlight blob: independent rect (no gooey), sits on top of bg -->
					<rect
						#highlightRectEl
						x="0" y="0" width="0" height="0"
						rx="0" ry="0"
						opacity="0"
						fill="var(--fluix-notch-hl)"
					/>
				</svg>
			</div>

			<!-- Pill dot (collapsed icon) — centered -->
			<div [fluixAttrs]="attrs().pill" [style.width.px]="dotSize" [style.height.px]="dotSize">
				<ng-content select="[notch-pill]" />
			</div>

			<!-- Expanded content — centered -->
			<div #contentEl [fluixAttrs]="attrs().content">
				<ng-content select="[notch-content]" />
			</div>
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixNotchComponent implements AfterViewInit, OnChanges, OnDestroy {
	@Input() trigger: NotchTrigger = "click";
	@Input() position: NotchPosition = "top-center";
	@Input() spring?: SpringConfig;
	@Input() dotSize = 36;
	@Input() roundness = NOTCH_DEFAULTS.roundness;
	@Input() theme: NotchTheme = "dark";
	@Input() fill?: string;
	@Input() open?: boolean;
	@Output() openChange = new EventEmitter<boolean>();

	@ViewChild("rootEl") rootElRef!: ElementRef<HTMLDivElement>;
	@ViewChild("measureContentEl") measureContentElRef!: ElementRef<HTMLDivElement>;
	@ViewChild("contentEl") contentElRef!: ElementRef<HTMLDivElement>;
	@ViewChild("svgRectEl") svgRectElRef!: ElementRef<SVGRectElement>;
	@ViewChild("highlightRectEl") highlightRectElRef!: ElementRef<SVGRectElement>;

	private ngZone = inject(NgZone);

	private machine!: NotchMachine;
	private unsubscribe?: () => void;

	// Reactive signals for Angular OnPush
	readonly isOpen = signal(false);
	readonly attrs = signal(getNotchAttrs({ open: false, position: "top-center", theme: "dark" }));
	readonly contentSize = signal({ w: 200, h: 44 });

	// Derived signals
	readonly springConfig = () => this.spring ?? FLUIX_SPRING;
	readonly blur = () => Math.min(10, Math.max(6, this.roundness * 0.45));
	readonly collapsedW = () => this.dotSize;
	readonly collapsedH = () => this.dotSize;

	private readonly hlPad = 12;
	readonly expandedW = () => this.contentSize().w + this.hlPad * 2;
	readonly expandedH = () => Math.max(this.contentSize().h + this.hlPad, this.dotSize);

	readonly targetW = () => (this.isOpen() ? this.expandedW() : this.collapsedW());
	readonly targetH = () => (this.isOpen() ? this.expandedH() : this.collapsedH());

	readonly rootW = () => Math.max(this.expandedW(), this.collapsedW());
	readonly rootH = () => Math.max(this.expandedH(), this.collapsedH());

	// Mutable animation state
	private prev = { w: 0, h: 0, initialized: false };
	private currentAnim: Animation | null = null;
	private highlightAnim: Animation | null = null;
	private hlPrev = { x: 0, y: 0, w: 0, h: 0, visible: false };
	private prevOpenVal: boolean | undefined;
	private measureObs?: ResizeObserver;
	private measureRaf = 0;

	constructor() {
		this.machine = createNotchMachine({
			position: this.position,
			trigger: this.trigger,
			roundness: this.roundness,
			fill: this.fill,
			spring: this.spring,
		});
	}

	ngAfterViewInit(): void {
		// Subscribe to core store
		this.unsubscribe = this.machine.store.subscribe(() => {
			this.ngZone.run(() => {
				const snap = this.machine.store.getSnapshot();
				const wasOpen = this.isOpen();
				this.isOpen.set(snap.open);
				this.attrs.set(
					getNotchAttrs({ open: snap.open, position: this.position, theme: this.theme }),
				);

				// Notify parent on open change
				if (this.prevOpenVal !== undefined && this.prevOpenVal !== snap.open) {
					this.openChange.emit(snap.open);
				}
				this.prevOpenVal = snap.open;

				// Animate SVG rect
				this.animateRect();

				// Reset highlight when closing
				if (wasOpen && !snap.open) {
					this.onItemLeave();
				}

				// Expose CSS variable for toast collision avoidance
				document.documentElement.style.setProperty(
					"--fluix-notch-offset",
					`${this.rootH()}px`,
				);
			});
		});

		// Set initial state
		const snap = this.machine.store.getSnapshot();
		this.isOpen.set(snap.open);
		this.prevOpenVal = snap.open;
		this.attrs.set(
			getNotchAttrs({ open: snap.open, position: this.position, theme: this.theme }),
		);

		// Initialize SVG rect to collapsed size
		this.initSvgRect();

		// Measure hidden content
		this.setupMeasureObserver();

		// Initial CSS variable
		document.documentElement.style.setProperty(
			"--fluix-notch-offset",
			`${this.rootH()}px`,
		);
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (!this.machine) return;

		// Reconfigure machine when props change
		if (
			changes["position"] ||
			changes["trigger"] ||
			changes["roundness"] ||
			changes["fill"] ||
			changes["spring"]
		) {
			this.machine.configure({
				position: this.position,
				trigger: this.trigger,
				roundness: this.roundness,
				fill: this.fill,
				spring: this.spring,
			});
		}

		// Sync controlled open
		if (changes["open"] && this.open !== undefined) {
			const snap = this.machine.store.getSnapshot();
			if (this.open && !snap.open) this.machine.open();
			else if (!this.open && snap.open) this.machine.close();
		}

		// Update attrs when theme/position changes
		if (changes["theme"] || changes["position"]) {
			this.attrs.set(
				getNotchAttrs({ open: this.isOpen(), position: this.position, theme: this.theme }),
			);
		}
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

	/* ---- Event handlers ---- */

	onMouseEnter(): void {
		if (this.trigger === "hover") this.handleOpen();
	}

	onMouseLeave(): void {
		if (this.trigger === "hover") this.handleClose();
		this.onItemLeave();
	}

	onClick(): void {
		if (this.trigger === "click") this.handleToggle();
	}

	onItemEnter(e: MouseEvent): void {
		const target = (e.target as HTMLElement).closest("a, button") as HTMLElement | null;
		const rect = this.highlightRectElRef?.nativeElement;
		const root = this.rootElRef?.nativeElement;
		if (!target || !rect || !root || !this.isOpen()) return;

		const rootRect = root.getBoundingClientRect();
		const itemW = target.offsetWidth;
		const itemH = target.offsetHeight;
		const itemRect = target.getBoundingClientRect();
		const itemCenterX = itemRect.left + itemRect.width / 2;
		const itemCenterY = itemRect.top + itemRect.height / 2;

		const padX = 8;
		const padY = 4;
		const toW = itemW + padX * 2;
		const toH = itemH + padY * 2;
		const toX = itemCenterX - rootRect.left - toW / 2;
		const toY = itemCenterY - rootRect.top - toH / 2;
		const toRx = toH / 2;

		if (!this.hlPrev.visible) {
			// First hover — snap into place
			rect.setAttribute("x", String(toX));
			rect.setAttribute("y", String(toY));
			rect.setAttribute("width", String(toW));
			rect.setAttribute("height", String(toH));
			rect.setAttribute("rx", String(toRx));
			rect.setAttribute("ry", String(toRx));
			rect.setAttribute("opacity", "1");
			this.hlPrev.x = toX;
			this.hlPrev.y = toY;
			this.hlPrev.w = toW;
			this.hlPrev.h = toH;
			this.hlPrev.visible = true;
			return;
		}

		// Animate from previous position
		if (this.highlightAnim) {
			this.highlightAnim.cancel();
			this.highlightAnim = null;
		}

		const sc = this.springConfig();
		const a = animateSpring(rect, {
			x: { from: this.hlPrev.x, to: toX, unit: "px" },
			y: { from: this.hlPrev.y, to: toY, unit: "px" },
			width: { from: this.hlPrev.w, to: toW, unit: "px" },
			height: { from: this.hlPrev.h, to: toH, unit: "px" },
			rx: { from: this.hlPrev.h / 2, to: toRx, unit: "px" },
			ry: { from: this.hlPrev.h / 2, to: toRx, unit: "px" },
		}, { ...sc, stiffness: (sc.stiffness ?? 300) * 1.2 });

		this.hlPrev.x = toX;
		this.hlPrev.y = toY;
		this.hlPrev.w = toW;
		this.hlPrev.h = toH;

		if (a) {
			this.highlightAnim = a;
			a.onfinish = () => {
				this.highlightAnim = null;
				rect.setAttribute("x", String(toX));
				rect.setAttribute("y", String(toY));
				rect.setAttribute("width", String(toW));
				rect.setAttribute("height", String(toH));
				rect.setAttribute("rx", String(toRx));
				rect.setAttribute("ry", String(toRx));
			};
		}
	}

	/* ---- Private ---- */

	private handleOpen(): void {
		if (this.open === undefined) this.machine.open();
		else this.openChange.emit(true);
	}

	private handleClose(): void {
		if (this.open === undefined) this.machine.close();
		else this.openChange.emit(false);
	}

	private handleToggle(): void {
		if (this.open === undefined) this.machine.toggle();
		else this.openChange.emit(!this.machine.store.getSnapshot().open);
	}

	private onItemLeave(): void {
		const rect = this.highlightRectElRef?.nativeElement;
		if (!rect) return;
		rect.setAttribute("opacity", "0");
		this.hlPrev.visible = false;
		if (this.highlightAnim) {
			this.highlightAnim.cancel();
			this.highlightAnim = null;
		}
	}

	private initSvgRect(): void {
		const rect = this.svgRectElRef?.nativeElement;
		if (!rect || this.prev.initialized) return;

		const cw = this.collapsedW();
		const ch = this.collapsedH();
		this.prev.w = cw;
		this.prev.h = ch;
		this.prev.initialized = true;

		const cx = (this.rootW() - cw) / 2;
		const cy = (this.rootH() - ch) / 2;
		rect.setAttribute("width", String(cw));
		rect.setAttribute("height", String(ch));
		rect.setAttribute("x", String(cx));
		rect.setAttribute("y", String(cy));
		rect.setAttribute("rx", String(cw / 2));
		rect.setAttribute("ry", String(ch / 2));
	}

	private setupMeasureObserver(): void {
		const el = this.measureContentElRef?.nativeElement;
		if (!el) return;

		const measure = () => {
			const r = el.getBoundingClientRect();
			if (r.width > 0 && r.height > 0) {
				const newSize = { w: Math.ceil(r.width), h: Math.ceil(r.height) };
				const current = this.contentSize();
				if (newSize.w !== current.w || newSize.h !== current.h) {
					this.contentSize.set(newSize);
				}
			}
		};
		measure();

		this.measureObs = new ResizeObserver(() => {
			cancelAnimationFrame(this.measureRaf);
			this.measureRaf = requestAnimationFrame(() => {
				this.ngZone.run(() => measure());
			});
		});
		this.measureObs.observe(el);
	}

	private animateRect(): void {
		const rect = this.svgRectElRef?.nativeElement;
		if (!rect || !this.prev.initialized) return;

		const tw = this.targetW();
		const th = this.targetH();

		if (tw === this.prev.w && th === this.prev.h) return;

		if (this.currentAnim) {
			this.currentAnim.cancel();
			this.currentAnim = null;
		}

		const fromW = this.prev.w;
		const fromH = this.prev.h;
		const rw = this.rootW();
		const rh = this.rootH();
		const fromX = (rw - fromW) / 2;
		const fromY = (rh - fromH) / 2;
		const toX = (rw - tw) / 2;
		const toY = (rh - th) / 2;

		this.prev.w = tw;
		this.prev.h = th;

		const cw = this.collapsedW();
		const ch = this.collapsedH();
		const isCollapsing = tw === cw && th === ch;
		const wasCollapsed = fromW === cw && fromH === ch;
		const fromRx = wasCollapsed ? cw / 2 : this.roundness;
		const toRx = isCollapsing ? cw / 2 : this.roundness;

		const a = animateSpring(rect, {
			width: { from: fromW, to: tw, unit: "px" },
			height: { from: fromH, to: th, unit: "px" },
			x: { from: fromX, to: toX, unit: "px" },
			y: { from: fromY, to: toY, unit: "px" },
			rx: { from: fromRx, to: toRx, unit: "px" },
			ry: { from: fromRx, to: toRx, unit: "px" },
		}, this.springConfig());

		if (a) {
			this.currentAnim = a;
			a.onfinish = () => {
				this.currentAnim = null;
				rect.setAttribute("width", String(tw));
				rect.setAttribute("height", String(th));
				rect.setAttribute("x", String(toX));
				rect.setAttribute("y", String(toY));
				rect.setAttribute("rx", String(toRx));
				rect.setAttribute("ry", String(toRx));
			};
		} else {
			rect.setAttribute("width", String(tw));
			rect.setAttribute("height", String(th));
			rect.setAttribute("x", String(toX));
			rect.setAttribute("y", String(toY));
			rect.setAttribute("rx", String(toRx));
			rect.setAttribute("ry", String(toRx));
		}
	}
}
