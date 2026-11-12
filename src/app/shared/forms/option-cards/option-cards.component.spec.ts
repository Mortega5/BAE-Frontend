import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { OptionCardOption } from 'src/app/models/formFields/form-field.model';
import { OptionCardsComponent } from './option-cards.component';

@Component({
  standalone: true,
  imports: [OptionCardsComponent, ReactiveFormsModule],
  template: `<app-option-cards [formControl]="control" [options]="options" dataCy="group" />`,
})
class HostComponent {
  control = new FormControl('a');
  options: OptionCardOption[] = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B', disabled: true, note: 'why not' },
    { value: 'c', label: 'C', dataCy: 'custom-c' },
  ];
}

describe('OptionCardsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const cards = () => Array.from(fixture.nativeElement.querySelectorAll('[role=radio]')) as HTMLButtonElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marks the card of the control value as checked, and only that one is a tab stop', () => {
    expect(cards().map(c => c.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(cards().map(c => c.tabIndex)).toEqual([0, -1, -1]);
  });

  it('writes the clicked card to the control', () => {
    cards()[2].click();
    expect(host.control.value).toBe('c');
  });

  it('does not select a disabled card, and points at its note', () => {
    cards()[1].click();
    expect(host.control.value).toBe('a');
    expect(cards()[1].getAttribute('aria-disabled')).toBe('true');
    expect(fixture.nativeElement.querySelector('#' + cards()[1].getAttribute('aria-describedby'))).not.toBeNull();
  });

  it('moves the selection with the arrow keys, skipping disabled cards and wrapping around', () => {
    cards()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(host.control.value).toBe('c');
    cards()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(host.control.value).toBe('a');
  });

  it('names the cards from the group, or from their own data-cy', () => {
    expect(cards().map(c => c.getAttribute('data-cy'))).toEqual(['group-a', 'group-b', 'custom-c']);
  });

  it('does not change a readonly group', () => {
    host.control.disable();
    fixture.detectChanges();
    cards()[2].click();
    expect(host.control.value).toBe('a');
  });
});
