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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing when not visible', () => {
    component.visible = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-card')).toBeNull();
  });

  it('should render the card when visible', () => {
    component.visible = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-card')).toBeTruthy();
  });

  it('should emit resolved(true) when confirm is clicked', () => {
    spyOn(component.resolved, 'emit');
    component.visible = true;
    fixture.detectChanges();

    // buttons order: close (X), cancel, confirm
    const buttons = fixture.nativeElement.querySelectorAll('app-button');
    buttons[2].dispatchEvent(new MouseEvent('click'));

    expect(component.resolved.emit).toHaveBeenCalledWith(true);
  });

  it('should emit resolved(false) when cancel is clicked', () => {
    spyOn(component.resolved, 'emit');
    component.visible = true;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('app-button');
    buttons[1].dispatchEvent(new MouseEvent('click'));

    expect(component.resolved.emit).toHaveBeenCalledWith(false);
  });

  it('should emit closed when the close (X) button is clicked', () => {
    spyOn(component.closed, 'emit');
    component.visible = true;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('app-button');
    buttons[0].dispatchEvent(new MouseEvent('click'));

    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('Escape key should emit closed only when visible', () => {
    spyOn(component.closed, 'emit');
    component.visible = false;

    component.onEscape();
    expect(component.closed.emit).not.toHaveBeenCalled();

    component.visible = true;
    component.onEscape();
    expect(component.closed.emit).toHaveBeenCalled();
  });
});
