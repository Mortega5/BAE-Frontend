import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { findButtonIcon } from 'src/app/config/popular-icons';
import { ButtonComponent, ButtonSize, ButtonVariant } from '../button/button.component';
import { DropdownPanelComponent } from '../dropdown-panel/dropdown-panel.component';

export interface SplitButtonAction {
  /** Emitted through (actionSelected) when the entry is picked. */
  id: string;
  /** i18n key of the entry label. */
  label: string;
  icon?: IconName;
  dataCy?: string;
}

/** Button with a main action plus a chevron that opens a menu of alternative actions
 * (GitHub-style). The projected content is the main button's label; `(mainClick)` fires
 * for it and `(actionSelected)` fires with the picked entry's id. */
@Component({
  selector: 'app-split-button',
  standalone: true,
  imports: [ButtonComponent, DropdownPanelComponent, FaIconComponent, TranslateModule],
  templateUrl: './split-button.component.html',
  styleUrl: './split-button.component.scss',
})
export class SplitButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() prefixIcon?: IconName;
  @Input() dataCy?: string;
  @Input() actions: SplitButtonAction[] = [];
  /** Accessible name of the chevron button (i18n key). */
  @Input() menuLabel = 'COMMON._more_actions';

  @Output() mainClick = new EventEmitter<void>();
  @Output() actionSelected = new EventEmitter<string>();

  protected open = false;
  private readonly host = inject(ElementRef<HTMLElement>);

  protected icon(name?: IconName) {
    return name ? findButtonIcon(name) : undefined;
  }

  protected toggle(): void {
    this.open = !this.open;
  }

  protected select(action: SplitButtonAction): void {
    this.open = false;
    this.actionSelected.emit(action.id);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (this.open && !this.host.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  @HostListener('keydown.escape')
  protected onEscape(): void {
    this.open = false;
  }
}
