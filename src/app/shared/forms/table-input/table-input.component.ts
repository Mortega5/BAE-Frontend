import { CommonModule } from '@angular/common';
import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TableColumn } from 'src/app/models/formFields/form-field.model';

@Component({
  selector: 'app-table-input',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './table-input.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TableInputComponent),
      multi: true,
    },
  ],
})
export class TableInputComponent implements ControlValueAccessor {
  @Input() columns: TableColumn[] = [];
  @Input() items: any[] = [];
  @Input() multiple: boolean = false;
  @Input() readonly: boolean = false;
  @Input() selectable: boolean = true;
  @Input() clickable: boolean = false;
  @Output() rowClick = new EventEmitter<any>();

  selected: any[] = [];
  private isDisabled: boolean = false;

  get isReadonly(): boolean {
    return this.readonly || this.isDisabled;
  }

  private onChange = (_: any) => { };
  private onTouched = () => { };

  writeValue(value: any): void {
    if (this.multiple) {
      this.selected = Array.isArray(value) ? value : [];
    } else {
      this.selected = value != null ? [value] : [];
    }
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

  isSelected(item: any): boolean {
    return this.selected.some(s => s === item || (s?.id != null && s.id === item?.id));
  }

  toggle(item: any): void {
    if (this.isReadonly || !this.selectable) return;
    if (this.multiple) {
      const exists = this.isSelected(item);
      this.selected = exists
        ? this.selected.filter(s => s !== item && s?.id !== item?.id)
        : [...this.selected, item];
      this.onChange(this.selected);
    } else {
      const alreadySelected = this.isSelected(item);
      this.selected = alreadySelected ? [] : [item];
      this.onChange(alreadySelected ? null : item);
    }
    this.onTouched();
  }

  onRowClick(item: any): void {
    if (this.isReadonly) return;
    this.toggle(item);
    if (this.clickable) {
      this.rowClick.emit(item);
    }
  }

  getCellClass(column: TableColumn, item: any): string {
    if (!column.cellClass) return '';
    return typeof column.cellClass === 'function' ? column.cellClass(item) : column.cellClass;
  }

  getCellValue(column: TableColumn, item: any): string {
    const value = column.getValue(item);
    return value == null ? '' : String(value);
  }

}
