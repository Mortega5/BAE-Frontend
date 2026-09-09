import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  type: NotificationType;
  message: string;
}

/** Shared with notification.component.scss's auto-dismiss progress bar, which is
 * timed via an inline style binding off this constant so the two can't drift apart. */
export const NOTIFICATION_DURATION_MS = 3000;

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<Notification | null>(null);
  notification$ = this.notificationSubject.asObservable();

  showSuccess(message: string) {
    this.show({ type: 'success', message });
  }

  showError(message: string) {
    this.show({ type: 'error', message });
  }

  showWarning(message: string) {
    this.show({ type: 'warning', message });
  }

  showInfo(message: string) {
    this.show({ type: 'info', message });
  }

  private show(notification: Notification) {
    this.notificationSubject.next(notification);
    setTimeout(() => this.clear(), NOTIFICATION_DURATION_MS);
  }

  clear() {
    this.notificationSubject.next(null);
  }
}
