import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { LeaveConfirmable, unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const run = (component: any) =>
    unsavedChangesGuard(component, {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot, {} as RouterStateSnapshot);

  it('should ask the component whether it can be left', async () => {
    const component: LeaveConfirmable = { confirmLeave: () => Promise.resolve(false) };
    expect(await run(component)).toBeFalse();
  });

  it('should allow leaving a component that does not ask', () => {
    expect(run({})).toBeTrue();
    expect(run(null)).toBeTrue();
  });
});
