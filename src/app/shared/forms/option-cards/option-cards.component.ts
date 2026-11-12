import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { findButtonIcon } from 'src/app/config/popular-icons';
import { OptionCardOption } from 'src/app/models/formFields/form-field.model';

/** Single-choice selector shown as a row of cards, each with an icon, a title, an optional badge and description, and a
 * radio mark in the corner. For a choice between a few options that are really different things, where a dropdown would
 * hide what each one means. A control value accessor, so it binds with `formControlName`. It behaves as a radio group:
 * one tab stop, and the arrow keys move the selection. */
let nextId = 0;

@Component({
  selector: 'app-option-cards',
  standalone: true,
  imports: [FaIconComponent, TranslateModule],
  templateUrl: './option-cards.component.html',
  styleUrl: './option-cards.component.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => OptionCardsComponent), multi: true }],
})
export class OptionCardsComponent implements ControlValueAccessor {
  @Input() options: OptionCardOption[] = [];
  /** How many cards go side by side from the small breakpoint up; one column below it. */
  @Input() columns: 1 | 2 | 3 = 2;
  /** Already translated: names the group for assistive technology. */
  @Input() label = '';
  @Input() dataCy?: string;
  @Input() isReadonly = false;
  /** Without a form control: the chosen value, and `selectedChange` with the new one (so `[(selected)]` works). */
  @Input() set selected(value: unknown) {
    this.value = value;
  }
  @Output() selectedChange = new EventEmitter<unknown>();

  @ViewChildren('card') private cards!: QueryList<ElementRef<HTMLButtonElement>>;

  value: unknown = null;
  disabled = false;

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: unknown): void {
    this.value = value;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  get inactive(): boolean {
    return this.disabled || this.isReadonly;
  }

  isSelected(option: OptionCardOption): boolean {
    return this.value === option.value;
  }

  /** Where the notes of the cards are, so a card can point at its own. */
  readonly id = `option-cards-${nextId++}`;

  /** The one card that can be reached with Tab: the selected one, or the first that can be chosen while none is. */
  tabIndexOf(option: OptionCardOption, index: number): number {
    const selected = this.options.findIndex(opt => this.isSelected(opt));
    const stop = selected === -1 ? this.options.findIndex(opt => !opt.disabled) : selected;
    return stop === index ? 0 : -1;
  }

  iconOf(option: OptionCardOption) {
    return option.icon ? findButtonIcon(option.icon) : undefined;
  }

  select(option: OptionCardOption): void {
    if (this.inactive || option.disabled || this.isSelected(option)) return;
    this.value = option.value;
    this.onChange(option.value);
    this.selectedChange.emit(option.value);
  }

  touched(): void {
    this.onTouched();
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    const step = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0;
    if (step === 0 || this.options.length === 0) return;
    event.preventDefault();
    // Arrow keys skip the cards that cannot be chosen
    let next = index;
    for (let tried = 0; tried < this.options.length; tried++) {
      next = (next + step + this.options.length) % this.options.length;
      if (!this.options[next].disabled) {
        this.select(this.options[next]);
        this.cards.get(next)?.nativeElement.focus();
        return;
      }
    }
  }
}
