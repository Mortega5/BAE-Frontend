import { Directive, Input, TemplateRef } from '@angular/core';
import { IconName } from '@fortawesome/fontawesome-svg-core';

/** One tab of an `app-tabs`. The template's content is the tab body, rendered only
 * while the tab is active; it can be left empty when every tab shares the same body
 * (projected into `app-tabs` itself). */
@Directive({
  selector: '[appTab]',
  standalone: true,
})
export class TabDirective {
  /** i18n key for the tab label. */
  @Input() appTab = '';
  @Input() tabId = '';
  /** Resolved via findButtonIcon, same registry app-button uses. */
  @Input() tabIcon?: IconName;
  /** Hides the tab (e.g. a role the session doesn't have) without removing the template. */
  @Input() tabHidden = false;
  @Input() dataCy?: string;

  constructor(public templateRef: TemplateRef<void>) {}
}
