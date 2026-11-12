import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthGuard } from 'src/app/guard/auth.guard';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { slideIn } from 'src/app/shared/animations/slide-in.animation';
import { SegmentedToggleOption } from 'src/app/shared/segmented-toggle/segmented-toggle.component';

type OverviewView = 'seller' | 'buyer';

const VIEW_STORAGE_KEY = 'dashboard_overview_view';

/** Landing of the workspace. Who sells sees the overview of a seller, and the rest, the one of a buyer. Someone who does
 * both starts on the seller one and can switch from the toggle on the right of the title; the choice is remembered.
 * The roles are the configured ones, resolved by the guard. */
@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
  animations: [slideIn],
})
export class DashboardOverviewComponent implements OnDestroy {
  readonly viewOptions: SegmentedToggleOption[] = [
    { value: 'seller', label: 'WORKSPACE._view_as_seller', dataCy: 'viewAsSeller' },
    { value: 'buyer', label: 'WORKSPACE._view_as_buyer', dataCy: 'viewAsBuyer' },
  ];
  /** The views only animate when the user switches, not when the page opens (or for who prefers reduced motion). */
  switched = false;
  readonly reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  hasSellerRole = false;
  hasBuyerRole = false;
  /** What a user with both roles chose to look at. */
  private view: OverviewView = this.savedView();

  private destroy$ = new Subject<void>();

  constructor(
    private authGuard: AuthGuard,
    private eventMessage: EventMessageService,
    private localStorage: LocalStorageService,
  ) {
    this.readRoles();
    // The roles depend on the active session
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'ChangedSession') {
        this.readRoles();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Both roles: the user can choose. */
  get canSwitch(): boolean {
    return this.hasSellerRole && this.hasBuyerRole;
  }

  /** The seller overview for whoever sells, unless they chose the buyer one. */
  get showingSeller(): boolean {
    return this.hasSellerRole && (!this.hasBuyerRole || this.view !== 'buyer');
  }

  setView(view: OverviewView): void {
    this.switched = true;
    this.view = view;
    try {
      this.localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // The choice then lasts only the visit
    }
  }

  private readRoles(): void {
    this.hasSellerRole = this.authGuard.hasAnyRole(['seller']);
    this.hasBuyerRole = this.authGuard.hasAnyRole(['buyer']);
  }

  private savedView(): OverviewView {
    try {
      return this.localStorage.getItem(VIEW_STORAGE_KEY) === 'buyer' ? 'buyer' : 'seller';
    } catch {
      return 'seller';
    }
  }
}
