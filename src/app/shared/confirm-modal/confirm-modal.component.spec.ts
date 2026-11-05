import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { ConfirmModalComponent } from './confirm-modal.component';

describe('ConfirmModalComponent', () => {
  let component: ConfirmModalComponent;
  let fixture: ComponentFixture<ConfirmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmModalComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing when not visible', () => {
    component.visible = false;
    fixture.detectChanges();

    expect(document.querySelector('.cdk-overlay-container app-card')).toBeNull();
  });

  it('should render the card when visible', () => {
    component.visible = true;
    fixture.detectChanges();

    expect(document.querySelector('.cdk-overlay-container app-card')).toBeTruthy();
  });

  it('should emit resolved(true) when confirm is clicked', () => {
    spyOn(component.resolved, 'emit');
    component.visible = true;
    fixture.detectChanges();

    // buttons order: close (X), cancel, confirm
    const buttons = document.querySelectorAll('.cdk-overlay-container app-button');
    buttons[2].dispatchEvent(new MouseEvent('click'));

    expect(component.resolved.emit).toHaveBeenCalledWith(true);
  });

  it('should emit resolved(false) when cancel is clicked', () => {
    spyOn(component.resolved, 'emit');
    component.visible = true;
    fixture.detectChanges();

    const buttons = document.querySelectorAll('.cdk-overlay-container app-button');
    buttons[1].dispatchEvent(new MouseEvent('click'));

    expect(component.resolved.emit).toHaveBeenCalledWith(false);
  });

  it('should emit closed when the close (X) button is clicked', () => {
    spyOn(component.closed, 'emit');
    component.visible = true;
    fixture.detectChanges();

    const buttons = document.querySelectorAll('.cdk-overlay-container app-button');
    buttons[0].dispatchEvent(new MouseEvent('click'));

    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('should render a dismiss button that emits closed when dismissLabel is set', () => {
    spyOn(component.closed, 'emit');
    component.visible = true;
    component.dismissLabel = 'Keep editing';
    fixture.detectChanges();

    // buttons order: close (X), cancel (pushed left), dismiss, confirm
    const buttons = document.querySelectorAll('.cdk-overlay-container app-button');
    expect(buttons.length).toBe(4);
    expect(buttons[1].classList).toContain('mr-auto');
    buttons[2].dispatchEvent(new MouseEvent('click'));

    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('should disable the confirm button when confirmDisabled is set', () => {
    component.visible = true;
    component.confirmDisabled = true;
    fixture.detectChanges();

    const buttons = document.querySelectorAll<HTMLButtonElement>('.cdk-overlay-container app-button button');
    expect(buttons[buttons.length - 1].disabled).toBeTrue();
  });

  it('Escape key should emit closed only when visible', () => {
    spyOn(component.closed, 'emit');
    component.visible = false;
    fixture.detectChanges();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.closed.emit).not.toHaveBeenCalled();

    component.visible = true;
    fixture.detectChanges();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('should emit closed when the backdrop is clicked', () => {
    spyOn(component.closed, 'emit');
    component.visible = true;
    fixture.detectChanges();

    (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();

    expect(component.closed.emit).toHaveBeenCalled();
  });
});
