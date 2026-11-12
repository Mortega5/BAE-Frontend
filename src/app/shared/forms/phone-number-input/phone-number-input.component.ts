import { CommonModule } from '@angular/common';
import { Component, ElementRef, forwardRef, HostListener, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { parsePhoneNumber } from 'libphonenumber-js/max';
import { phoneNumbers } from 'src/app/models/country.const';

type PhonePrefix = typeof phoneNumbers[number];

/** Lowercase and without accents, so that "espana" finds "España". */
const normalize = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

@Component({
  selector: 'app-phone-number-input',
  standalone: true,
  imports: [CommonModule, TranslateModule],
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
  /** Already translated hint for the number box while it is empty. */
  @Input() placeholder: string = '';

  readonly prefixes: PhonePrefix[] = phoneNumbers;

  prefix: PhonePrefix = phoneNumbers[0];
  nationalNumber: string = '';
  prefixMenuOpen = false;
  /** What was typed in the search box of the prefixes. */
  prefixQuery = '';

  @ViewChild('prefixSearch') private prefixSearch?: ElementRef<HTMLInputElement>;

  /** The names of the countries in the language of the app, to find them by the name the user knows. */
  private regionNames: { of(code: string): string | undefined } | null = null;
  private regionNamesLanguage?: string;

  constructor(private host: ElementRef<HTMLElement>, private translate: TranslateService) {}

  private localizedCountry(code: string): string {
    const language = this.translate.currentLang || this.translate.defaultLang;
    if (!language) return '';
    if (this.regionNamesLanguage !== language) {
      this.regionNamesLanguage = language;
      try {
        this.regionNames = new (Intl as any).DisplayNames([language], { type: 'region' });
      } catch {
        this.regionNames = null; // an old browser: only the names of the list are searched
      }
    }
    try {
      return this.regionNames?.of(code) ?? '';
    } catch {
      return '';
    }
  }

  /** The prefixes that match every word typed: a number must be the start of the call code ("34", "+34") and a word,
   * part of the name of the country, in English or in the language of the app, or its country code ("spain", "españa", "es"). */
  get filteredPrefixes(): PhonePrefix[] {
    const words = normalize(this.prefixQuery).replace(/\+/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length === 0) return this.prefixes;
    return this.prefixes.filter(pref => {
      const digits = pref.code.replace('+', '');
      // The text of a prefix is its flag, its code and its country: the name is what is left
      const name = normalize(`${pref.text.replace(/^\S+\s+\+\d+\s*/, '')} ${this.localizedCountry(pref.country)} ${pref.country}`);
      return words.every(word => /^\d+$/.test(word) ? digits.startsWith(word) : name.includes(word));
    });
  }

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

  togglePrefixMenu(): void {
    if (this.prefixMenuOpen) {
      this.closePrefixMenu();
      return;
    }
    this.prefixMenuOpen = true;
    // The box is rendered with the menu: the typing starts there
    setTimeout(() => this.prefixSearch?.nativeElement.focus());
  }

  closePrefixMenu(): void {
    this.prefixMenuOpen = false;
    this.prefixQuery = '';
  }

  /** A click anywhere else closes the menu. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.prefixMenuOpen && !this.host.nativeElement.contains(event.target as Node)) {
      this.closePrefixMenu();
    }
  }

  selectPrefix(pref: PhonePrefix): void {
    this.closePrefixMenu();
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
