import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface MultipleSelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'multiple-select',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './multiple-select.component.html',
  styleUrl: './multiple-select.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultipleSelectComponent),
      multi: true,
    },
  ],
})
export class MultipleSelectComponent implements ControlValueAccessor {
  @Input() options: (MultipleSelectOption | string)[] = [];
  @Input() id?: string;
  @Input() dataCy?: string;
  @Input() readonly: boolean = false;
  @Output() selectedItemsChange = new EventEmitter<any[]>();

  isOpen = false;
  selectedValues: any[] = [];
  private isDisabled: boolean = false;
  private onChange: (value: any[]) => void = () => { };
  private onTouched: () => void = () => { };

  get isReadonly(): boolean {
    return this.readonly || this.isDisabled;
  }

  get normalizedOptions(): MultipleSelectOption[] {
    return this.options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt);
  }

  get selectedLabels(): MultipleSelectOption[] {
    return this.normalizedOptions.filter(opt => this.selectedValues.includes(opt.value));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.isOpen = false;
    }
  }

  toggleDropdown(): void {
    if (this.isReadonly) return;
    this.isOpen = !this.isOpen;
  }

  isSelected(option: MultipleSelectOption): boolean {
    return this.selectedValues.includes(option.value);
  }

  toggleSelection(option: MultipleSelectOption): void {
    if (this.isReadonly) return;
    this.selectedValues = this.isSelected(option)
      ? this.selectedValues.filter(v => v !== option.value)
      : [...this.selectedValues, option.value];
    this.emitChange();
  }

  removeItem(option: MultipleSelectOption, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isReadonly) return;
    this.selectedValues = this.selectedValues.filter(v => v !== option.value);
    this.emitChange();
  }

  private emitChange(): void {
    this.onChange(this.selectedValues);
    this.onTouched();
    this.selectedItemsChange.emit(this.selectedValues);
  }

  writeValue(value: any[]): void {
    this.selectedValues = Array.isArray(value) ? value : [];
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
