import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface UnitValueEntry {
  value: number;
  unit: string;
}

@Component({
  selector: 'app-unit-value-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './unit-value-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UnitValueInputComponent),
      multi: true,
    },
  ],
})
export class UnitValueInputComponent implements ControlValueAccessor {
  @Input() addLabel: string = '_add';
  @Input() valuePlaceholder: string = '';
  @Input() unitPlaceholder: string = '';
  @Input() isReadonly: boolean = false;

  entries: UnitValueEntry[] = [];
  inputValue: number | string = '';
  inputUnit: string = '';

  private onChange = (_: UnitValueEntry[]) => {};
  private onTouched = () => {};

  get canAdd(): boolean {
    return this.inputValue !== '' && this.inputValue != null && !isNaN(Number(this.inputValue)) && this.inputUnit.trim() !== '';
  }

  writeValue(value: UnitValueEntry[]): void {
    this.entries = Array.isArray(value) ? value : [];
  }

  registerOnChange(fn: (value: UnitValueEntry[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isReadonly = isDisabled;
  }

  add(): void {
    if (!this.canAdd) return;
    this.entries = [...this.entries, { value: Number(this.inputValue), unit: this.inputUnit.trim() }];
    this.inputValue = '';
    this.inputUnit = '';
    this.emit();
  }

  remove(index: number): void {
    const updated = [...this.entries];
    updated.splice(index, 1);
    this.entries = updated;
    this.emit();
  }

  private emit(): void {
    this.onChange(this.entries);
    this.onTouched();
  }
}
