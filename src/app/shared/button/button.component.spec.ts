import { ComponentFixture, TestBed } from '@angular/core/testing';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;
  });

  const buttonEl = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should default to the primary variant and medium size', () => {
    fixture.detectChanges();
    const button = buttonEl();
    expect(button.getAttribute('data-variant')).toBe('primary');
    expect(button.getAttribute('data-size')).toBe('md');
  });

  it('should reflect the variant and size inputs as attributes', () => {
    component.variant = 'secondary';
    component.size = 'sm';
    fixture.detectChanges();

    const button = buttonEl();
    expect(button.getAttribute('data-variant')).toBe('secondary');
    expect(button.getAttribute('data-size')).toBe('sm');
  });

  it('should apply the type, disabled and data-cy attributes to the native button', () => {
    component.type = 'submit';
    component.disabled = true;
    component.dataCy = 'submitBtn';
    fixture.detectChanges();

    const button = buttonEl();
    expect(button.type).toBe('submit');
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('data-cy')).toBe('submitBtn');
  });

  it('should render an icon before the content by default when an icon is set', () => {
    component.icon = faCheck;
    fixture.detectChanges();

    const button = buttonEl();
    const icon = button.querySelector('fa-icon');
    expect(icon).toBeTruthy();
    expect(button.firstElementChild?.tagName.toLowerCase()).toBe('fa-icon');
  });

  it('should render the icon after the content when iconPosition is suffix', () => {
    component.icon = faCheck;
    component.iconPosition = 'suffix';
    fixture.detectChanges();

    const button = buttonEl();
    expect(button.lastElementChild?.tagName.toLowerCase()).toBe('fa-icon');
  });

  it('should render no icon when none is provided', () => {
    fixture.detectChanges();
    expect(buttonEl().querySelector('fa-icon')).toBeNull();
  });
});
