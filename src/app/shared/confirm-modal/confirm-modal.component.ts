import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent, ButtonVariant } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';

/** Small confirm/cancel modal, stacked above whatever else is open (e.g. an edit
 * modal asking "discard unsaved changes?" before it lets itself be closed). */
@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, ContentCardComponent],
  templateUrl: './confirm-modal.component.html',
})
export class ConfirmModalComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = 'CONFIRM_MODAL._confirm';
  @Input() cancelLabel = 'CONFIRM_MODAL._cancel';
  @Input() confirmVariant: ButtonVariant = 'danger';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) this.cancelled.emit();
  }
}
