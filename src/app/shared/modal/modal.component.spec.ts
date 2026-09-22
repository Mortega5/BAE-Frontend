import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalComponent } from './modal.component';

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
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

  it('should emit closed when the backdrop is clicked', () => {
    spyOn(component.closed, 'emit');
    component.visible = true;
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.fixed').dispatchEvent(new MouseEvent('click'));

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

  it('Escape key should be ignored when closeOnEscape is false', () => {
    spyOn(component.closed, 'emit');
    component.visible = true;
    component.closeOnEscape = false;

    component.onEscape();

    expect(component.closed.emit).not.toHaveBeenCalled();
  });
});
