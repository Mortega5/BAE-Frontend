import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCircleCheck, faCircleInfo, faCircleXmark, faTriangleExclamation, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { NotificationService, NotificationType, NOTIFICATION_DURATION_MS } from '../../services/notification.service';

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
  protected readonly durationMs = NOTIFICATION_DURATION_MS;

  constructor(public notificationService: NotificationService) {}

  protected icon(type: NotificationType): IconDefinition {
    return NOTIFICATION_ICONS[type];
  }
}
