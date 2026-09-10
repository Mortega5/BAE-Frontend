import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCircleCheck, faCircleInfo, faCircleXmark, faTriangleExclamation, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { NotificationService, NotificationType } from '../../services/notification.service';

const NOTIFICATION_ICONS: Record<NotificationType, IconDefinition> = {
  success: faCircleCheck,
  info: faCircleInfo,
  warning: faTriangleExclamation,
  error: faCircleXmark,
};

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, TranslateModule, FaIconComponent],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.scss',
})
export class NotificationComponent {
  protected readonly faXmark = faXmark;

  /** Ids of notifications whose error details are currently expanded. Purely
   * view state (not part of NotificationService's model) — expanding one also
   * pauses its auto-dismiss timer via notificationService.pauseTimer(). */
  private expandedIds = new Set<number>();

  constructor(public notificationService: NotificationService) {}

  protected icon(type: NotificationType): IconDefinition {
    return NOTIFICATION_ICONS[type];
  }

  protected isExpanded(id: number): boolean {
    return this.expandedIds.has(id);
  }

  protected toggleDetails(id: number): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
      this.notificationService.pauseTimer(id);
    }
  }
}
