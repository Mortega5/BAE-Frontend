import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SelectOption } from 'src/app/models/formFields/form-field.model';

/** Single/multi-select with a text input that filters `options` by label as the user types.
 * Selected values, in multi mode, are shown as removable chips above the input — same pattern
 * as `MultipleSelectComponent`, minus the always-open dropdown. */
@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './search-select.component.html',
  styleUrl: './search-select.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchSelectComponent),
      multi: true,
    },
  ],
})
export class SearchSelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() multiple: boolean = false;
  @Input() readonly: boolean = false;
  @Input() placeholder: string = '';
  @Input() id?: string;
  @Input() dataCy?: string;
  @Output() selectionChange = new EventEmitter<any>();

  /** Shows a "Create '<query>'" row when no option matches what the user typed. */
  @Input() allowCreate: boolean = false;
  /** The field-configured creation handler — resolves to the option to select, or rejects
   * with the error to surface via `createFailed`. */
  @Input() createHandler?: (query: string) => Promise<SelectOption>;
  @Output() createRequested = new EventEmitter<string>();
  @Output() createFailed = new EventEmitter<{ query: string; error: any }>();

  isCreating = false;

  /** Plain, forms-independent binding — for consumers that manage selection state directly
   * instead of via `formControlName`/`ngModel` (mirrors `app-paginated-table`'s `[selected]`). */
  @Input()
  set selected(value: any) {
    this.selectedValues = this.normalize(value);
  }

  isOpen = false;
  query = '';
  selectedValues: any[] = [];

  private isDisabled: boolean = false;
  private onChange: (value: any) => void = () => { };
  private onTouched: () => void = () => { };

  get isReadonly(): boolean {
    return this.readonly || this.isDisabled;
  }

  get filteredOptions(): SelectOption[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter(opt => (opt.label ?? '').toLowerCase().includes(q));
  }

  get selectedOptions(): SelectOption[] {
    return this.options.filter(opt => this.selectedValues.some(v => this.matches(v, opt.value)));
  }

  get showCreateOption(): boolean {
    if (!this.allowCreate || this.isCreating) return false;
    const q = this.query.trim();
    if (!q) return false;
    return !this.options.some(opt => (opt.label ?? '').toLowerCase() === q.toLowerCase());
  }

  /** What the text input shows: the live search query while open, otherwise the single
   * selection's label (multi mode always shows the query — its selections are the chips). */
  get displayValue(): string {
    if (this.isOpen || this.multiple) return this.query;
    return this.selectedOptions[0]?.label ?? '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-select-root')) {
      this.isOpen = false;
      this.query = '';
    }
  }

  onFocus(): void {
    if (this.isReadonly) return;
    this.isOpen = true;
    this.query = '';
  }

  onQueryChange(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.isOpen = true;
  }

  /** Matches by reference, falling back to `.id` — options re-fetched from the server are
   * new object instances that still represent the same selected entity. */
  private matches(a: any, b: any): boolean {
    return a === b || (a?.id != null && a.id === b?.id);
  }

  isSelected(option: SelectOption): boolean {
    return this.selectedValues.some(v => this.matches(v, option.value));
  }

  selectOption(option: SelectOption): void {
    if (this.isReadonly) return;
    if (this.multiple) {
      this.selectedValues = this.isSelected(option)
        ? this.selectedValues.filter(v => !this.matches(v, option.value))
        : [...this.selectedValues, option.value];
      this.query = '';
    } else {
      this.selectedValues = [option.value];
      this.isOpen = false;
      this.query = '';
    }
    this.emitChange();
  }

  async requestCreate(): Promise<void> {
    if (this.isReadonly || !this.allowCreate || this.isCreating) return;
    const query = this.query.trim();
    if (!query) return;

    this.createRequested.emit(query);
    if (!this.createHandler) return;

    this.isCreating = true;
    try {
      const created = await this.createHandler(query);
      this.options = [...this.options, created];
      this.selectOption(created);
    } catch (error) {
      this.isOpen = true;
      this.createFailed.emit({ query, error });
    } finally {
      this.isCreating = false;
    }
  }

  removeItem(option: SelectOption, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isReadonly) return;
    this.selectedValues = this.selectedValues.filter(v => !this.matches(v, option.value));
    this.emitChange();
  }

  clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isReadonly) return;
    this.selectedValues = [];
    this.query = '';
    this.emitChange();
  }

  private emitChange(): void {
    const value = this.multiple ? this.selectedValues : (this.selectedValues[0] ?? null);
    this.onChange(value);
    this.onTouched();
    this.selectionChange.emit(value);
  }

  writeValue(value: any): void {
    this.selectedValues = this.normalize(value);
  }

  private normalize(value: any): any[] {
    return this.multiple
      ? (Array.isArray(value) ? value : [])
      : (value != null ? [value] : []);
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
