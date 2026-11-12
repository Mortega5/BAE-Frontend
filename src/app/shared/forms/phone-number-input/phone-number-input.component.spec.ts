import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PhoneNumberInputComponent } from './phone-number-input.component';

describe('PhoneNumberInputComponent', () => {
  let fixture: ComponentFixture<PhoneNumberInputComponent>;
  let component: PhoneNumberInputComponent;
  const numberBox = () => fixture.nativeElement.querySelector('input[type="number"]') as HTMLInputElement;
  const prefixButton = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const searchBox = () => fixture.nativeElement.querySelector('[data-cy="phonePrefixSearch"]') as HTMLInputElement | null;
  const options = () => Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLButtonElement[];
  const type = (text: string) => {
    const box = searchBox()!;
    box.value = text;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const open = () => {
    prefixButton().click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PhoneNumberInputComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(PhoneNumberInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('placeholder', () => {
    it('shows the hint in the number box while it is empty', () => {
      component.placeholder = 'Enter the phone number';
      fixture.detectChanges();

      expect(numberBox().getAttribute('placeholder')).toBe('Enter the phone number');
    });

    it('has no placeholder attribute when none is given', () => {
      expect(numberBox().hasAttribute('placeholder')).toBeFalse();
    });
  });

  describe('searching the prefixes', () => {
    it('opens the menu with a search box and every prefix', () => {
      expect(searchBox()).toBeNull();
      open();

      expect(searchBox()).not.toBeNull();
      expect(options().length).toBe(component.prefixes.length);
    });

    it('filters by the name of the country, ignoring case and accents', () => {
      open();
      type('SPAIN');

      expect(options().length).toBeGreaterThan(0);
      expect(options().every(option => /spain/i.test(option.textContent!))).toBeTrue();
    });

    it('filters by the call code, with or without the plus', () => {
      open();
      type('+34');
      const withPlus = options().map(option => option.textContent!.trim());
      type('34');

      expect(withPlus.length).toBeGreaterThan(0);
      expect(options().map(option => option.textContent!.trim())).toEqual(withPlus);
      expect(withPlus.every(text => /\+34/.test(text))).toBeTrue();
    });

    it('also finds a country by its name in the language of the app', () => {
      TestBed.inject(TranslateService).use('es');
      open();
      type('espana');
      expect(options().map(option => option.textContent!.replace(/\s+/g, ' ').trim())).toEqual(['🇪🇸 +34 Spain']);

      type('alemania');
      expect(options().map(option => option.textContent!.replace(/\s+/g, ' ').trim())).toEqual(['🇩🇪 +49 Germany']);
    });

    it('needs every word typed to match', () => {
      open();
      type('spain 34');
      expect(options().length).toBe(1);

      type('spain 1');
      expect(fixture.nativeElement.querySelector('[data-cy="phonePrefixNoResults"]')).not.toBeNull();
      expect(options().length).toBe(0);
    });

    it('chooses the prefix that is clicked, closes the menu and forgets what was typed', () => {
      const emitted: string[] = [];
      component.registerOnChange(value => emitted.push(value));
      numberBox().value = '612345678';
      numberBox().dispatchEvent(new Event('input'));
      open();
      type('spain');
      options()[0].click();
      fixture.detectChanges();

      expect(searchBox()).toBeNull();
      expect(component.prefixQuery).toBe('');
      expect(component.prefix.country).toBe('ES');
      expect(emitted[emitted.length - 1]).toBe('+34612345678');
    });

    it('closes the menu with a click anywhere else, and with Escape', () => {
      open();
      document.body.click();
      fixture.detectChanges();
      expect(searchBox()).toBeNull();

      open();
      searchBox()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(searchBox()).toBeNull();
    });
  });
});
