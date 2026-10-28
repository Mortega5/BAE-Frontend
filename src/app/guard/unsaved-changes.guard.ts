import { CanDeactivateFn } from '@angular/router';

/** A routed form that may ask before it's left (typically through app-unsaved-changes-modal). */
export interface LeaveConfirmable {
  confirmLeave(): boolean | Promise<boolean>;
}

/** Asks the routed form before navigating away, whether the navigation comes from its own
 * cancel/back button, the header, the side nav or the browser's back button. */
export const unsavedChangesGuard: CanDeactivateFn<LeaveConfirmable> =
  component => component?.confirmLeave?.() ?? true;
