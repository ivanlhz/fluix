import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChildren,
	ElementRef,
	NgZone,
	OnDestroy,
	QueryList,
	ViewChild,
	effect,
	inject,
	input,
	output,
	signal,
} from "@angular/core";
import {
	MENU_DEFAULTS,
	createMenuMachine,
	getMenuAttrs,
	type MenuMachine,
	type MenuMachineState,
	type MenuOrientation,
	type MenuVariant,
	type MenuTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import { FluixAttrsDirective } from "../attrs.directive";
import { FluixMenuItemComponent } from "./menu-item.component";
import { type MenuIndicatorConnection, createMenuIndicatorState, connectIndicator, reconnectIndicator, destroyIndicator } from "./menu-indicator";

const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

@Component({
	selector: "fluix-menu",
	standalone: true,
	imports: [FluixAttrsDirective],
	styles: [`:host { display: contents; }`],
	template: `
		<nav #rootEl [fluixAttrs]="attrs().root" aria-label="Fluix menu">
			<div [fluixAttrs]="attrs().canvas">
				<svg #svgEl xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1" aria-hidden="true">
					@if (!isTab()) {
						<defs>
							<filter [attr.id]="filterId" x="-20%" y="-20%" width="140%" height="140%"
								color-interpolation-filters="sRGB">
								<feGaussianBlur in="SourceGraphic" [attr.stdDeviation]="resolvedBlur()" result="blur" />
								<feColorMatrix in="blur" type="matrix" [attr.values]="gooMatrix" result="goo" />
								<feComposite in="SourceGraphic" in2="goo" operator="atop" />
							</filter>
						</defs>
					}
					@if (isTab()) {
						<path #indicatorEl [attr.data-fluix-menu-indicator]="''" d="" opacity="0" [style.fill]="effectiveFill()" />
					} @else {
						<g [attr.filter]="'url(#' + filterId + ')'">
							<rect #ghostIndicatorEl x="0" y="0" width="0" height="0" rx="0" ry="0" opacity="0" [style.fill]="effectiveFill()" />
							<rect #indicatorEl [attr.data-fluix-menu-indicator]="''" x="0" y="0" width="0" height="0" rx="0" ry="0" opacity="0" [style.fill]="effectiveFill()" />
						</g>
					}
				</svg>
			</div>
			<div [fluixAttrs]="attrs().list"><ng-content /></div>
		</nav>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixMenuComponent implements AfterViewInit, OnDestroy {
	readonly orientation = input<MenuOrientation>(MENU_DEFAULTS.orientation);
	readonly variant = input<MenuVariant>("pill");
	readonly theme = input<MenuTheme>("dark");
	readonly activeId = input<string | null | undefined>(undefined);
	readonly defaultActiveId = input<string | null | undefined>(undefined);
	readonly spring = input<SpringConfig | undefined>(undefined);
	readonly roundness = input(MENU_DEFAULTS.roundness);
	readonly blur = input<number | undefined>(undefined);
	readonly fill = input<string | undefined>(undefined);
	readonly activeIdChange = output<string>();

	@ViewChild("rootEl") rootElRef!: ElementRef<HTMLElement>;
	@ViewChild("svgEl") svgElRef!: ElementRef<SVGSVGElement>;
	@ViewChild("indicatorEl") indicatorElRef!: ElementRef<SVGRectElement | SVGPathElement>;
	@ViewChild("ghostIndicatorEl") ghostIndicatorElRef?: ElementRef<SVGRectElement>;
	@ContentChildren(FluixMenuItemComponent) menuItems!: QueryList<FluixMenuItemComponent>;

	private ngZone = inject(NgZone);
	private cdr = inject(ChangeDetectorRef);

	private machine!: MenuMachine;
	private unsubscribe?: () => void;
	private indicatorState: MenuIndicatorConnection = createMenuIndicatorState();
	private resizeObs?: ResizeObserver;
	private measureRaf = 0;
	private initRaf = 0;
	private itemsSub?: { unsubscribe(): void };
	private lastActiveNotified: string | null = null;
	private size = { width: 0, height: 0 };
	private itemSelectSubs: { unsubscribe(): void }[] = [];

	readonly gooMatrix = GOO_MATRIX;
	readonly filterId = `fluix-menu-goo-${Math.random().toString(36).slice(2, 8)}`;
	readonly attrs = signal(getMenuAttrs({ orientation: MENU_DEFAULTS.orientation, theme: "dark", variant: "pill" }));
	readonly snapshot = signal<MenuMachineState>({ activeId: null, config: {} });
	readonly isTab = () => this.variant() === "tab";
	readonly resolvedBlur = () => this.blur() ?? Math.min(10, Math.max(6, this.roundness() * 0.45));
	readonly effectiveFill = () => this.fill() ?? "var(--fluix-menu-indicator)";

	constructor() {
		this.machine = createMenuMachine({
			orientation: this.orientation(), variant: this.variant(), spring: this.spring(),
			roundness: this.roundness(), blur: this.blur(), fill: this.fill(),
			initialActiveId: this.activeId() ?? this.defaultActiveId() ?? null,
		});

		effect(() => {
			this.machine.configure({
				orientation: this.orientation(), variant: this.variant(), spring: this.spring(),
				roundness: this.roundness(), blur: this.blur(), fill: this.fill(),
			});
		});
		effect(() => { const aid = this.activeId(); if (aid !== undefined) this.machine.setActive(aid ?? null); });
		effect(() => { this.attrs.set(getMenuAttrs({ orientation: this.orientation(), theme: this.theme(), variant: this.variant() })); });
		effect(() => { this.variant(); this.orientation(); this.spring(); this.doReconnect(); });
	}

	ngAfterViewInit(): void {
		this.unsubscribe = this.machine.store.subscribe(() => {
			this.ngZone.run(() => {
				const snap = this.machine.store.getSnapshot();
				this.snapshot.set(snap);
				if (snap.activeId && this.lastActiveNotified !== snap.activeId) this.activeIdChange.emit(snap.activeId);
				this.lastActiveNotified = snap.activeId;
				this.updateItemStates(snap.activeId);
				this.indicatorState.connection?.sync(false);
				this.cdr.markForCheck();
			});
		});

		this.setupItems();
		this.cdr.detectChanges();
		this.itemsSub = this.menuItems.changes.subscribe(() => this.setupItems());

		const root = this.rootElRef.nativeElement;
		const measure = () => {
			const rect = root.getBoundingClientRect();
			const w = Math.ceil(rect.width), h = Math.ceil(rect.height);
			if (this.size.width !== w || this.size.height !== h) {
				this.size = { width: w, height: h };
				this.updateSvgSize();
				this.indicatorState.connection?.sync(false);
			}
		};

		this.resizeObs = new ResizeObserver(() => {
			cancelAnimationFrame(this.measureRaf);
			this.measureRaf = requestAnimationFrame(() => this.ngZone.run(() => measure()));
		});
		this.resizeObs.observe(root);
		this.initRaf = requestAnimationFrame(() => { measure(); this.doConnect(); });
	}

	ngOnDestroy(): void {
		this.unsubscribe?.();
		this.itemsSub?.unsubscribe();
		this.itemSelectSubs.forEach((s) => s.unsubscribe());
		destroyIndicator(this.indicatorState);
		cancelAnimationFrame(this.measureRaf);
		cancelAnimationFrame(this.initRaf);
		this.resizeObs?.disconnect();
		this.machine.destroy();
	}

	private onSelect = (id: string) => {
		if (this.activeId() === undefined) this.machine.setActive(id);
		else this.activeIdChange.emit(id);
	};

	private setupItems(): void {
		if (!this.menuItems) return;
		this.itemSelectSubs.forEach((s) => s.unsubscribe());
		this.itemSelectSubs = [];
		const snap = this.machine.store.getSnapshot();
		const a = this.attrs();
		this.menuItems.forEach((item) => {
			const active = snap.activeId === item.menuId();
			item.active.set(active);
			item.itemAttrs.set(a.item({ id: item.menuId(), active, disabled: item.disabled() }));
			this.itemSelectSubs.push(item.select.subscribe((id: string) => this.onSelect(id)));
		});
	}

	private updateItemStates(activeId: string | null): void {
		if (!this.menuItems) return;
		const a = this.attrs();
		this.menuItems.forEach((item) => {
			const active = activeId === item.menuId();
			item.active.set(active);
			item.itemAttrs.set(a.item({ id: item.menuId(), active, disabled: item.disabled() }));
		});
	}

	private doConnect(): void {
		const root = this.rootElRef?.nativeElement;
		const indicator = this.indicatorElRef?.nativeElement;
		if (!root || !indicator) return;
		connectIndicator(this.indicatorState, {
			root, indicator, ghostIndicator: this.ghostIndicatorElRef?.nativeElement ?? null,
			getActiveId: () => this.machine.store.getSnapshot().activeId,
			onSelect: this.onSelect, spring: this.spring(), variant: this.variant(), orientation: this.orientation(),
		});
	}

	private doReconnect(): void {
		reconnectIndicator(this.indicatorState, this.rootElRef?.nativeElement, () => this.doConnect());
	}

	private updateSvgSize(): void {
		const svg = this.svgElRef?.nativeElement;
		if (!svg) return;
		const w = Math.max(1, this.size.width), h = Math.max(1, this.size.height);
		svg.setAttribute("width", String(w));
		svg.setAttribute("height", String(h));
		svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
	}
}
