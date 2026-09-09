import { Component } from '@angular/core';

/** Shared floating panel for dropdown/context menus (theme selector, user avatar
 * menu, row action menus, filter/search popovers...). Consolidates what used to be
 * ~14 different ad-hoc `bg-white dark:bg-*` boxes — some, like the header's old
 * `.dropdown-glass`, had no dark-mode rule at all — into one CSS-var-driven surface,
 * the same `--card-bg`/`--card-border` tokens `app-card` already uses (a dropdown
 * panel is visually just a small elevated card).
 *
 * This only standardizes the look: the caller still owns positioning (wrap in a
 * `relative` parent, position this `absolute`) and open/close state / click-outside
 * handling, same as before.
 */
@Component({
  selector: 'app-dropdown-panel',
  standalone: true,
  templateUrl: './dropdown-panel.component.html',
  styleUrl: './dropdown-panel.component.scss',
})
export class DropdownPanelComponent {}
