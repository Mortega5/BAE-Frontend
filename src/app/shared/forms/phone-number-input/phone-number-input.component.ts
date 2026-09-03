import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { parsePhoneNumber } from 'libphonenumber-js/max';
import { phoneNumbers } from 'src/app/models/country.const';

type PhonePrefix = typeof phoneNumbers[number];

@Component({
  selector: 'app-phone-number-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phone-number-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneNumberInputComponent),
      multi: true,
    },
  ],
})
export class PhoneNumberInputComponent implements ControlValueAccessor {
  @Input() isReadonly: boolean = false;

  readonly prefixes: PhonePrefix[] = phoneNumbers;

  prefix: PhonePrefix = phoneNumbers[0];
  nationalNumber: string = '';
  prefixMenuOpen = false;

  private onChange = (_: string) => { };
  private onTouched = () => { };

  /** Combined value is a single dialable string (prefix + national number, e.g. "+34612345678") —
   * the same shape callers already built by hand (`phonePrefix.code + telephoneNumber`). */
  writeValue(value: string | null): void {
    this.prefix = phoneNumbers[0];
    this.nationalNumber = '';
    if (!value) return;

    try {
      const parsed = parsePhoneNumber(value);
      if (!parsed) return;
      const match = this.prefixes.find(p => p.code === '+' + parsed.countryCallingCode);
      if (match) this.prefix = match;
      this.nationalNumber = parsed.nationalNumber;
    } catch {
      // Malformed stored value — keep the defaults rather than crash the field.
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isReadonly = isDisabled;
  }

  selectPrefix(pref: PhonePrefix): void {
    this.prefixMenuOpen = false;
    this.prefix = pref;
    this.emit();
  }

  onNumberInput(value: string): void {
    this.nationalNumber = value;
    this.emit();
  }

  private emit(): void {
    this.onChange(this.nationalNumber ? this.prefix.code + this.nationalNumber : '');
    this.onTouched();
  }
}
