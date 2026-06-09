import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-multi-value-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './multi-value-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiValueInputComponent),
      multi: true,
    },
  ],
})
export class MultiValueInputComponent implements ControlValueAccessor {
  @Input() placeholder: string = '';
  @Input() addLabel: string = '_add';
  @Input() maxLength: number = 524288;
  @Input() isReadonly: boolean = false;

  values: string[] = [];
  inputValue: string = '';

  private onChange = (_: string[]) => {};
  private onTouched = () => {};

  writeValue(value: string[]): void {
    this.values = Array.isArray(value) ? value : [];
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isReadonly = isDisabled;
  }

  add(): void {
    const v = this.inputValue.trim();
    if (!v) return;
    this.values = [...this.values, v];
    this.inputValue = '';
    this.emit();
  }

  remove(index: number): void {
    const updated = [...this.values];
    updated.splice(index, 1);
    this.values = updated;
    this.emit();
  }

  private emit(): void {
    this.onChange(this.values);
    this.onTouched();
  }
}
