import { Component, computed, inject, signal, TemplateRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FluixMenuComponent, FluixMenuItemComponent, FluixNotchComponent, FluixToasterComponent, FluixToastService } from '@fluix-ui/angular';
import type { FluixPosition, FluixToasterConfig, NotchTrigger, MenuOrientation } from '@fluix-ui/core';

export interface FlightBookingData {
  airline: string;
  from: string;
  to: string;
  pnr: string;
  bookingId: string;
}

const POSITIONS: FluixPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const LAYOUTS = ['stack', 'notch'] as const;
type LayoutMode = (typeof LAYOUTS)[number];

const MENU_ITEMS = [
  { id: 'profile', label: 'Perfil', hash: '#profile', subtitle: 'Resumen de usuario y actividad.' },
  { id: 'courses', label: 'Mis cursos', hash: '#courses', subtitle: 'Cursos activos, completados y progreso.' },
  { id: 'calendar', label: 'Calendario', hash: '#calendar', subtitle: 'Eventos, clases y entregas de la semana.' },
  { id: 'messages', label: 'Mensajes', hash: '#messages', subtitle: 'Notificaciones y conversaciones recientes.' },
] as const;

type MenuRouteId = (typeof MENU_ITEMS)[number]['id'];

function getMenuRouteFromHash(hash: string): MenuRouteId {
  const route = MENU_ITEMS.find((item) => item.hash === hash);
  return route?.id ?? MENU_ITEMS[0].id;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FluixToasterComponent, FluixNotchComponent, FluixMenuComponent, FluixMenuItemComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements AfterViewInit, OnDestroy {
  readonly fluix = inject(FluixToastService);

  @ViewChild('flightCard') flightCardRef!: TemplateRef<FlightBookingData>;

  readonly theme = signal<'light' | 'dark'>('dark');
  readonly position = signal<FluixPosition>('top-right');
  readonly layout = signal<LayoutMode>('stack');
  readonly route = signal<MenuRouteId>(getMenuRouteFromHash(window.location.hash));
  readonly layoutEntered = signal(false);
  readonly menuReady = signal(false);
  readonly isMobile = signal(window.matchMedia('(max-width: 760px)').matches);

  readonly toastTheme = computed<'light' | 'dark'>(() =>
    this.theme() === 'light' ? 'dark' : 'light'
  );

  readonly toasterConfig = computed<FluixToasterConfig>(() => ({
    position: this.position(),
    layout: this.layout(),
    offset: 24,
    defaults: { theme: this.toastTheme() },
  }));

  readonly menuOrientation = computed<MenuOrientation>(() =>
    this.isMobile() ? 'horizontal' : 'vertical'
  );

  readonly menuActiveId = computed<string | null>(() =>
    this.menuReady() ? this.route() : null
  );

  readonly activeRoute = computed(() =>
    MENU_ITEMS.find((item) => item.id === this.route()) ?? MENU_ITEMS[0]
  );

  readonly positions = POSITIONS;
  readonly layouts = LAYOUTS;
  readonly menuItems = MENU_ITEMS;
  readonly notchTriggers: NotchTrigger[] = ['hover', 'click', 'manual'];
  readonly notchTrigger = signal<NotchTrigger>('hover');
  readonly notchOpen = signal(false);

  private handleHashChange = () => {
    this.route.set(getMenuRouteFromHash(window.location.hash));
  };
  private mql?: MediaQueryList;
  private mqlHandler = (e: MediaQueryListEvent) => { this.isMobile.set(e.matches); };
  private menuReadyTimer = 0;

  ngAfterViewInit(): void {
    window.addEventListener('hashchange', this.handleHashChange);
    this.handleHashChange();

    requestAnimationFrame(() => { this.layoutEntered.set(true); });
    this.menuReadyTimer = window.setTimeout(() => { this.menuReady.set(true); }, 700);

    this.mql = window.matchMedia('(max-width: 760px)');
    this.mql.addEventListener('change', this.mqlHandler);
  }

  ngOnDestroy(): void {
    clearTimeout(this.menuReadyTimer);
    window.removeEventListener('hashchange', this.handleHashChange);
    this.mql?.removeEventListener('change', this.mqlHandler);
  }

  handleRouteChange(id: string): void {
    const nextRoute = MENU_ITEMS.find((item) => item.id === id);
    if (!nextRoute) return;
    this.route.set(nextRoute.id);
    window.history.replaceState(null, '', nextRoute.hash);
  }

  setTheme(value: 'light' | 'dark'): void {
    this.theme.set(value);
  }

  setPosition(value: FluixPosition): void {
    this.position.set(value);
  }

  setLayout(value: LayoutMode): void {
    this.layout.set(value);
  }

  showSuccess(): void {
    this.fluix.success({
      title: 'Saved!',
      description: 'Your changes have been saved.',
    });
  }

  showError(): void {
    this.fluix.error({
      title: 'Error',
      description: 'Something went wrong.',
    });
  }

  showWarning(): void {
    this.fluix.warning({
      title: 'Warning',
      description: 'Please check this.',
    });
  }

  showInfo(): void {
    this.fluix.info({
      title: 'Info',
      description: 'Just so you know.',
    });
  }

  showAction(): void {
    this.fluix.action({
      title: 'Action',
      description: 'Confirm or dismiss.',
      button: {
        title: 'Undo',
        onClick: () => this.fluix.info({ title: 'Undone!' }),
      },
    });
  }

  showIcon(): void {
    this.fluix.success({
      title: 'Custom Icon',
      description: 'You can pass your own icon.',
      icon: '✨',
    });
  }

  showPromise(): void {
    const promise = new Promise<FlightBookingData>((resolve) => {
      setTimeout(
        () =>
          resolve({
            airline: 'United',
            from: 'DEL',
            to: 'SFO',
            pnr: 'EC2QW4',
            bookingId: 'UA-920114',
          }),
        1800
      );
    });
    this.fluix.promise(promise, {
      loading: { title: 'Confirming booking...', icon: '✈' },
      success: (data) => ({
        title: 'Booking Confirmed',
        state: 'success',
        roundness: 20,
        description: this.flightCardRef
          ? { templateRef: this.flightCardRef, context: data }
          : `${data.airline} ${data.from} → ${data.to}. PNR ${data.pnr}. Booking ID ${data.bookingId}`,
        button: {
          title: 'View Details',
          onClick: () =>
            this.fluix.info({
              title: 'Trip details opened',
              description: `Reservation ${data.bookingId} ready.`,
            }),
        },
        styles: {
          button: 'flight-card-button',
        },
      }),
      error: () => ({
        title: 'Booking failed',
        description:
          'We could not complete your reservation. Try again in a few minutes.',
      }),
    });
  }

  clear(): void {
    this.fluix.clear();
  }

  setNotchTrigger(t: NotchTrigger): void {
    this.notchTrigger.set(t);
    this.notchOpen.set(false);
  }

  toggleNotchOpen(): void {
    this.notchOpen.set(!this.notchOpen());
  }

  onNotchOpenChange(open: boolean): void {
    this.notchOpen.set(open);
  }
}
