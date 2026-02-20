import { Component, computed, inject, signal } from '@angular/core';
import { FluixToasterComponent, FluixToastService } from '@fluix-ui/angular';
import type { FluixPosition, FluixToasterConfig } from '@fluix-ui/core';

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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FluixToasterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly fluix = inject(FluixToastService);

  readonly theme = signal<'light' | 'dark'>('dark');
  readonly position = signal<FluixPosition>('top-right');
  readonly layout = signal<LayoutMode>('stack');

  readonly toastTheme = computed<'light' | 'dark'>(() =>
    this.theme() === 'light' ? 'dark' : 'light'
  );

  readonly toasterConfig = computed<FluixToasterConfig>(() => ({
    position: this.position(),
    layout: this.layout(),
    offset: 24,
    defaults: { theme: this.toastTheme() },
  }));

  readonly positions = POSITIONS;
  readonly layouts = LAYOUTS;

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
    const promise = new Promise<{
      airline: string;
      from: string;
      to: string;
      pnr: string;
      bookingId: string;
    }>((resolve) => {
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
        description: `${data.airline} ${data.from} → ${data.to}. PNR ${data.pnr}. Booking ID ${data.bookingId}`,
        button: {
          title: 'View Details',
          onClick: () =>
            this.fluix.info({
              title: 'Trip details opened',
              description: `Reservation ${data.bookingId} ready.`,
            }),
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
}
