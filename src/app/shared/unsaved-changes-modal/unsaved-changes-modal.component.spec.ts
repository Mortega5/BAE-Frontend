import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { UnsavedChangesModalComponent } from './unsaved-changes-modal.component';

describe('UnsavedChangesModalComponent', () => {
  let component: UnsavedChangesModalComponent;
  let fixture: ComponentFixture<UnsavedChangesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnsavedChangesModalComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(UnsavedChangesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show itself while waiting for an answer', () => {
    component.confirm(() => {});
    expect(component.visible).toBeTrue();
  });

  it('should let the navigation go on when the changes are discarded', async () => {
    const saveDraft = jasmine.createSpy('saveDraft');
    const answer = component.confirm(saveDraft);

    component.onResolved(false);

    expect(await answer).toBeTrue();
    expect(saveDraft).not.toHaveBeenCalled();
    expect(component.visible).toBeFalse();
  });

  it('should cancel the navigation and save a draft when asked to', async () => {
    const saveDraft = jasmine.createSpy('saveDraft');
    const answer = component.confirm(saveDraft);

    component.onResolved(true);

    expect(await answer).toBeFalse();
    expect(saveDraft).toHaveBeenCalled();
  });

  it('should cancel the navigation when the seller keeps editing', async () => {
    const saveDraft = jasmine.createSpy('saveDraft');
    const answer = component.confirm(saveDraft);

    component.onClosed();

    expect(await answer).toBeFalse();
    expect(saveDraft).not.toHaveBeenCalled();
  });
});
