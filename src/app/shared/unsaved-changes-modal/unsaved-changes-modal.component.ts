import { Component, HostListener, Input } from '@angular/core';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';

/** "Leave without saving?" prompt for create forms: stay, discard, or save a draft first.
 * The host form calls `confirm()` from its `confirmLeave()` (see unsavedChangesGuard). */
@Component({
  selector: 'app-unsaved-changes-modal',
  standalone: true,
  imports: [ConfirmModalComponent],
  templateUrl: './unsaved-changes-modal.component.html',
})
export class UnsavedChangesModalComponent {
  /** Whether the form is complete enough to be saved as a draft. */
  @Input() canSaveDraft = false;
  /** Also warn on reload/tab close. The browser only allows its own generic dialog there. */
  @Input() blockUnload = false;

  visible = false;
  private resolveChoice?: (leave: boolean) => void;
  private saveDraft?: () => void;

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.blockUnload) return;
    event.preventDefault();
    event.returnValue = '';
  }

  /** Resolves true when the seller discards their changes and the navigation may go on.
   * Saving a draft resolves false: the form navigates away itself once the draft is saved. */
  confirm(saveDraft: () => void): Promise<boolean> {
    this.saveDraft = saveDraft;
    this.visible = true;
    return new Promise(resolve => this.resolveChoice = resolve);
  }

  onResolved(save: boolean): void {
    const saveDraft = this.saveDraft;
    this.finish(!save);
    if (save) saveDraft?.();
  }

  onClosed(): void {
    this.finish(false);
  }

  private finish(leave: boolean): void {
    this.visible = false;
    this.resolveChoice?.(leave);
    this.resolveChoice = undefined;
    this.saveDraft = undefined;
  }
}
