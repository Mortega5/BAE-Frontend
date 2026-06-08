import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface RangeValueEntry {
  from: number;
  to: number;
  unit: string;
}

@Component({
  selector: 'app-range-value-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './range-value-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RangeValueInputComponent),
      multi: true,
    },
  ],
})
export class RangeValueInputComponent implements ControlValueAccessor {
  @Input() fromPlaceholder: string = '';
  @Input() toPlaceholder: string = '';
  @Input() unitPlaceholder: string = '';
  @Input() setLabel: string = '_set';
  @Input() isReadonly: boolean = false;

  current: RangeValueEntry | null = null;
  inputFrom: number | string = '';
  inputTo: number | string = '';
  inputUnit: string = '';

  private onChange = (_: RangeValueEntry | null) => {};
  private onTouched = () => {};

  get canSet(): boolean {
    return this.inputFrom !== '' && this.inputFrom != null && !isNaN(Number(this.inputFrom))
      && this.inputTo !== '' && this.inputTo != null && !isNaN(Number(this.inputTo))
      && this.inputUnit.trim() !== '';
  }

  writeValue(value: RangeValueEntry | null): void {
    this.current = value ?? null;
  }

  registerOnChange(fn: (value: RangeValueEntry | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isReadonly = isDisabled;
  }

  set(): void {
    if (!this.canSet) return;
    this.current = { from: Number(this.inputFrom), to: Number(this.inputTo), unit: this.inputUnit.trim() };
    this.inputFrom = '';
    this.inputTo = '';
    this.inputUnit = '';
    this.emit();
  }

  clear(): void {
    this.current = null;
    this.emit();
  }

  private emit(): void {
    this.onChange(this.current);
    this.onTouched();
  }
}
