import { Component, Input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faInbox } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';

/** Friendly placeholder for a list with nothing to show: an icon, a title, an optional
 * description and optional actions (projected content, e.g. an app-button). For "this
 * record doesn't exist" use app-not-found-state instead. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [FontAwesomeModule, TranslateModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input() icon: IconDefinition = faInbox;
  /** i18n key. */
  @Input({ required: true }) heading!: string;
  /** i18n key. */
  @Input() description?: string;
}
