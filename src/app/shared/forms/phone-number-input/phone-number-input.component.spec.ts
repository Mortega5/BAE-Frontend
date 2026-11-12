import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhoneNumberInputComponent } from './phone-number-input.component';

describe('PhoneNumberInputComponent', () => {
  let fixture: ComponentFixture<PhoneNumberInputComponent>;
  const numberBox = () => fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PhoneNumberInputComponent] }).compileComponents();
    fixture = TestBed.createComponent(PhoneNumberInputComponent);
  });

  it('shows the hint in the number box while it is empty', () => {
    fixture.componentInstance.placeholder = 'Enter the phone number';
    fixture.detectChanges();

    expect(numberBox().getAttribute('placeholder')).toBe('Enter the phone number');
  });

  it('has no placeholder attribute when none is given', () => {
    fixture.detectChanges();

    expect(numberBox().hasAttribute('placeholder')).toBeFalse();
  });
});
