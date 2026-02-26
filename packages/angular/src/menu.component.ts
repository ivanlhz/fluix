import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChildren,
	ElementRef,
	EventEmitter,
	Input,
	NgZone,
	OnChanges,
	OnDestroy,
	OnInit,
	Output,
	QueryList,
	SimpleChanges,
	ViewChild,
	inject,
	signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
	FLUIX_SPRING,
	MENU_DEFAULTS,
	connectMenu,
	createMenuMachine,
	getMenuAttrs,
	type MenuMachine,
	type MenuMachineState,
	type MenuOrientation,
	type MenuVariant,
	type MenuTheme,
	type SpringConfig,
} from "@fluix-ui/core";
import { FluixAttrsDirective } from "./attrs.directive";
import { FluixMenuItemComponent } from "./menu-item.component";

const GOO_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10";

@Component({
	selector: "fluix-menu",
	standalone: true,
	imports: [CommonModule, FluixAttrsDirective],
	styles: [`:host { display: contents; }`],
	template: `
		<nav
			#rootEl
			[fluixAttrs]="attrs().root"
			aria-label="Fluix menu"
		>
			<div [fluixAttrs]="attrs().canvas">
				<svg
					#svgEl
					xmlns="http://www.w3.org/2000/svg"
					width="1"
					height="1"
					viewBox="0 0 1 1"
					aria-hidden="true"
				>
					@if (!isTab()) {
						<defs>
							<filter
								[attr.id]="filterId"
								x="-20%" y="-20%" width="140%" height="140%"
								color-interpolation-filters="sRGB"
							>
								<feGaussianBlur in="SourceGraphic" [attr.stdDeviation]="resolvedBlur()" result="blur" />
								<feColorMatrix
									in="blur" type="matrix"
									[attr.values]="gooMatrix"
									result="goo"
								/>
								<feComposite in="SourceGraphic" in2="goo" operator="atop" />
							</filter>
						</defs>
					}
					@if (isTab()) {
						<path
							#indicatorEl
							[attr.data-fluix-menu-indicator]="''"
							d=""
							opacity="0"
							[style.fill]="effectiveFill()"
						/>
					} @else {
						<g [attr.filter]="'url(#' + filterId + ')'">
							<rect
								#indicatorEl
								[attr.data-fluix-menu-indicator]="''"
								x="0"
								y="0"
								width="0"
								height="0"
								rx="0"
								ry="0"
								opacity="0"
								[style.fill]="effectiveFill()"
							/>
						</g>
					}
				</svg>
			</div>
			<div [fluixAttrs]="attrs().list">
				<ng-content />
			</div>
		</nav>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluixMenuComponent implements AfterViewInit, OnChanges, OnDestroy, OnInit {
	@Input() orientation: MenuOrientation = MENU_DEFAULTS.orientation;
	@Input() variant: MenuVariant = "pill";
	@Input() theme: MenuTheme = "dark";
	@Input() activeId?: string | null;
	@Input() defaultActiveId?: string | null;
	@Input() spring?: SpringConfig;
	@Input() roundness: number = MENU_DEFAULTS.roundness;
	@Input() blur?: number;
	@Input() fill?: string;
	@Output() activeIdChange = new EventEmitter<string>();

	@ViewChild("rootEl") rootElRef!: ElementRef<HTMLElement>;
	@ViewChild("svgEl") svgElRef!: ElementRef<SVGSVGElement>;
	@ViewChild("indicatorEl") indicatorElRef!: ElementRef<SVGRectElement | SVGPathElement>;
	@ContentChildren(FluixMenuItemComponent) menuItems!: QueryList<FluixMenuItemComponent>;

	private ngZone = inject(NgZone);
	private cdr = inject(ChangeDetectorRef);

	private machine!: MenuMachine;
	private unsubscribe?: () => void;
	private connection?: ReturnType<typeof connectMenu>;
	private resizeObs?: ResizeObserver;
	private measureRaf = 0;
	private lastActiveNotified: string | null = null;
	private size = { width: 0, height: 0 };

	readonly gooMatrix = GOO_MATRIX;
	readonly filterId = `fluix-menu-goo-${Math.random().toString(36).slice(2, 8)}`;

	readonly attrs = signal(getMenuAttrs({ orientation: MENU_DEFAULTS.orientation, theme: "dark", variant: "pill" }));
	readonly snapshot = signal<MenuMachineState>({ activeId: null, config: {} });

	readonly isTab = () => this.variant === "tab";
	readonly resolvedBlur = () => this.blur ?? Math.min(10, Math.max(6, this.roundness * 0.45));
	readonly effectiveFill = () => this.fill ?? "var(--fluix-menu-indicator)";

	constructor() {
		this.machine = createMenuMachine({
			orientation: this.orientation,
			variant: this.variant,
			spring: this.spring,
			roundness: this.roundness,
			blur: this.blur,
			fill: this.fill,
			initialActiveId: this.activeId ?? this.defaultActiveId ?? null,
		});
	}

	ngOnInit(): void {
		// Sync initial activeId (constructor runs before inputs are set)
		this.machine.setActive(this.activeId ?? this.defaultActiveId ?? null);
	}

	ngAfterViewInit(): void {
		this.attrs.set(getMenuAttrs({ orientation: this.orientation, theme: this.theme, variant: this.variant }));

		// Subscribe to machine store
		this.unsubscribe = this.machine.store.subscribe(() => {
			this.ngZone.run(() => {
				const snap = this.machine.store.getSnapshot();
				this.snapshot.set(snap);

				// Fire activeIdChange callback
				if (snap.activeId && this.lastActiveNotified !== snap.activeId) {
					this.activeIdChange.emit(snap.activeId);
				}
				this.lastActiveNotified = snap.activeId;

				// Update item components
				this.updateItemStates(snap.activeId);

				this.connection?.sync(false);
				this.cdr.markForCheck();
			});
		});

		// Setup items (attrs set on content children); run CD so they render with correct data-* on first paint
		this.setupItems();
		this.cdr.detectChanges();
		this.menuItems.changes.subscribe(() => this.setupItems());

		// ResizeObserver
		const root = this.rootElRef.nativeElement;
		const measure = () => {
			const rect = root.getBoundingClientRect();
			const w = Math.ceil(rect.width);
			const h = Math.ceil(rect.height);
			if (this.size.width !== w || this.size.height !== h) {
				this.size = { width: w, height: h };
				this.updateSvgSize();
				this.connection?.sync(false);
			}
		};

		this.resizeObs = new ResizeObserver(() => {
			cancelAnimationFrame(this.measureRaf);
			this.measureRaf = requestAnimationFrame(() => {
				this.ngZone.run(() => measure());
			});
		});
		this.resizeObs.observe(root);

		// Connect menu after first measure so SVG viewBox matches root size.
		requestAnimationFrame(() => {
			measure();
			this.connectIndicator();
		});
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (!this.machine) return;

		if (
			changes["orientation"] ||
			changes["variant"] ||
			changes["spring"] ||
			changes["roundness"] ||
			changes["blur"] ||
			changes["fill"]
		) {
			this.machine.configure({
				orientation: this.orientation,
				variant: this.variant,
				spring: this.spring,
				roundness: this.roundness,
				blur: this.blur,
				fill: this.fill,
			});
		}

		if (changes["activeId"] && this.activeId !== undefined) {
			this.machine.setActive(this.activeId ?? null);
		}

		if (changes["orientation"] || changes["theme"] || changes["variant"]) {
			this.attrs.set(getMenuAttrs({ orientation: this.orientation, theme: this.theme, variant: this.variant }));
		}

		// Reconnect if variant/orientation/spring changed
		if (changes["variant"] || changes["orientation"] || changes["spring"]) {
			this.reconnectIndicator();
		}
	}

	ngOnDestroy(): void {
		this.unsubscribe?.();
		this.connection?.destroy();
		cancelAnimationFrame(this.measureRaf);
		this.resizeObs?.disconnect();
		this.machine.destroy();
	}

	private setupItems(): void {
		if (!this.menuItems) return;
		const snap = this.machine.store.getSnapshot();
		const a = this.attrs();
		this.menuItems.forEach((item) => {
			const active = snap.activeId === item.menuId;
			item.active = active;
			item.itemAttrs = a.item({ id: item.menuId, active, disabled: item.disabled });
			item.select.subscribe((id: string) => {
				if (this.activeId === undefined) {
					this.machine.setActive(id);
				} else {
					this.activeIdChange.emit(id);
				}
			});
		});
	}

	private updateItemStates(activeId: string | null): void {
		if (!this.menuItems) return;
		const a = this.attrs();
		this.menuItems.forEach((item) => {
			const active = activeId === item.menuId;
			item.active = active;
			item.itemAttrs = a.item({ id: item.menuId, active, disabled: item.disabled });
		});
	}

	private connectIndicator(): void {
		const root = this.rootElRef?.nativeElement;
		const indicator = this.indicatorElRef?.nativeElement;
		if (!root || !indicator) return;

		this.connection = connectMenu({
			root,
			indicator,
			getActiveId: () => this.machine.store.getSnapshot().activeId,
			onSelect: (id) => {
				if (this.activeId === undefined) {
					this.machine.setActive(id);
				} else {
					this.activeIdChange.emit(id);
				}
			},
			spring: this.spring ?? FLUIX_SPRING,
			variant: this.variant,
			orientation: this.orientation,
		});

		this.connection.sync(false);
	}

	private reconnectIndicator(): void {
		if (!this.rootElRef?.nativeElement) return;
		this.connection?.destroy();
		this.connectIndicator();
	}

	private updateSvgSize(): void {
		const svg = this.svgElRef?.nativeElement;
		if (!svg) return;
		const w = Math.max(1, this.size.width);
		const h = Math.max(1, this.size.height);
		svg.setAttribute("width", String(w));
		svg.setAttribute("height", String(h));
		svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
	}
}
