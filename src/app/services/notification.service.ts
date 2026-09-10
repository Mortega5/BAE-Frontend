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

  /** Removes a single notification (e.g. its own auto-dismiss timer, or its close button) without affecting any others currently stacked. */
  dismiss(id: number) {
    this.pauseTimer(id);
    this.notificationsSubject.next(this.notificationsSubject.value.filter(n => n.id !== id));
  }

  /** Clears every currently stacked notification. */
  clear() {
    this.notificationsSubject.value.forEach(n => this.pauseTimer(n.id));
    this.notificationsSubject.next([]);
  }
}
