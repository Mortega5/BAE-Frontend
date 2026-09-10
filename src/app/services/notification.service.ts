import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  /** Milliseconds before this notification auto-dismisses itself. Each notification
   * carries its own value (defaulting to NOTIFICATION_DURATION_MS) instead of a
   * single shared timer, so multiple stacked notifications with different
   * durations don't interfere with each other. */
  duration: number;
  /** Raw error/backend detail text, shown behind the toast's "view details" toggle
   * when present. Not translated — it's dynamic content from the server/exception,
   * not static UI copy. */
  details?: string;
  /** True once this notification is playing its exit animation. It's kept in the
   * array (rather than removed immediately) so notification.component's `@for`
   * doesn't destroy the DOM node before the CSS slide-out finishes — see
   * notification.component.scss's `--leaving` modifier. */
  leaving?: boolean;
}

export interface NotificationOptions {
  /** Milliseconds before auto-dismiss. Defaults to NOTIFICATION_DURATION_MS. */
  duration?: number;
  /** Raw error/backend detail text — see Notification.details. */
  details?: string;
}

/** Default auto-dismiss delay, and what notification.component.scss's progress bar
 * animates over when a call site doesn't pass its own `duration`. */
export const NOTIFICATION_DURATION_MS = 3000;

/** How long the slide-out plays — must match notification.component.scss's
 * `app-toast-out` animation duration. The stack's own reflow (the gap closing
 * once a toast leaves) is deliberately delayed until after this finishes, so the
 * toast isn't visibly squashed by its row shrinking while it's still sliding —
 * see `.app-toast-item`'s `transition-delay` in the same file. */
export const NOTIFICATION_SLIDE_MS = 250;

/** How long the stack's reflow (closing the gap a dismissed toast leaves behind)
 * takes, once it starts — must match `.app-toast-item`'s transition duration. */
export const NOTIFICATION_COLLAPSE_MS = 350;

/** Total time before a notification is actually removed from the list: the slide
 * finishes, then the gap it leaves behind collapses. */
export const NOTIFICATION_EXIT_MS = NOTIFICATION_SLIDE_MS + NOTIFICATION_COLLAPSE_MS;

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();
  private nextId = 0;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  showSuccess(message: string, options?: NotificationOptions) {
    this.show({ type: 'success', message, ...options });
  }

  showError(message: string, options?: NotificationOptions) {
    this.show({ type: 'error', message, ...options });
  }

  showWarning(message: string, options?: NotificationOptions) {
    this.show({ type: 'warning', message, ...options });
  }

  showInfo(message: string, options?: NotificationOptions) {
    this.show({ type: 'info', message, ...options });
  }

  private show(notification: { type: NotificationType; message: string } & NotificationOptions) {
    const id = this.nextId++;
    const duration = notification.duration ?? NOTIFICATION_DURATION_MS;
    this.notificationsSubject.next([
      ...this.notificationsSubject.value,
      { type: notification.type, message: notification.message, details: notification.details, id, duration }
    ]);
    this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
  }

  /** Cancels a notification's auto-dismiss timer without removing it — e.g. while
   * the user has its error details expanded and is still reading them. There's no
   * "resume": once paused, the notification stays until manually closed. */
  pauseTimer(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /** Starts a single notification's exit animation (its own auto-dismiss timer, or
   * its close button both go through here) without affecting any others currently
   * stacked. The actual removal from the list happens after NOTIFICATION_EXIT_MS,
   * once the slide-out animation has had time to play. */
  dismiss(id: number) {
    this.pauseTimer(id);
    const current = this.notificationsSubject.value;
    const target = current.find(n => n.id === id);
    if (!target || target.leaving) {
      return;
    }
    this.notificationsSubject.next(current.map(n => n.id === id ? { ...n, leaving: true } : n));
    setTimeout(() => {
      this.notificationsSubject.next(this.notificationsSubject.value.filter(n => n.id !== id));
    }, NOTIFICATION_EXIT_MS);
  }

  /** Clears every currently stacked notification (each still plays its exit animation). */
  clear() {
    this.notificationsSubject.value.forEach(n => this.dismiss(n.id));
  }
}
