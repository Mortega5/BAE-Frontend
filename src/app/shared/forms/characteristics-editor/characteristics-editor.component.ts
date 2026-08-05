import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faPlus, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { TableColumn } from 'src/app/models/table-column.model';
import { TruncateValuePipe } from '../../pipes/truncate-value.pipe';
import { CharValueType } from '../characteristic-value-spec/characteristic-value-spec-form.component';
import { CharacteristicFormValue, SpecificationCharacteristicFormComponent } from '../specification-characteristic/specification-characteristic-form.component';
import { TableInputComponent } from '../table-input/table-input.component';

export interface CharacteristicItem extends CharacteristicFormValue {
  id?: string;
}

@Component({
  selector: 'app-characteristics-editor',
  standalone: true,
  imports: [CommonModule, TranslateModule, FaIconComponent, TableInputComponent, SpecificationCharacteristicFormComponent],
  templateUrl: './characteristics-editor.component.html',
})
export class CharacteristicsEditorComponent {
  @Input() characteristics: CharacteristicItem[] = [];
  @Input() supportedTypes: CharValueType[] = [];
  @Input() readonly: boolean = false;
  @Output() characteristicsChange = new EventEmitter<CharacteristicItem[]>();

  protected readonly faCircleInfo = faCircleInfo;
  protected readonly faPlus = faPlus;

  showForm = false;
  editingChar: CharacteristicItem | null = null;
  currentChar: CharacteristicFormValue | null = null;
  errorMessage = '';
  showError = false;

  private readonly truncateValuePipe = new TruncateValuePipe();

  get canSave(): boolean {
    return !!this.currentChar?.name?.trim() && (this.currentChar?.values?.length ?? 0) > 0;
  }

  get columns(): TableColumn[] {
    const cols: TableColumn[] = [
      {
        header: 'CHAR_SPEC._char_name', getValue: (c: CharacteristicItem) => c.name,
        cellClass: (c: CharacteristicItem) => this.hasLongWord(c.name, 20) ? 'break-all' : 'break-words',
      },
      {
        header: 'CHAR_SPEC._description', getValue: (c: CharacteristicItem) => c.description,
        cellClass: (c: CharacteristicItem) => this.hasLongWord(c.description, 20) ? 'break-all' : 'break-words',
        hideOnMobile: true,
      },
      {
        header: 'CHAR_SPEC._values', getValue: (c: CharacteristicItem) => this.formatValues(c),
        cellClass: () => 'break-all',
      },
      {
        header: 'CHAR_SPEC._configurable', type: 'badge', width: 'w-32',
        getValue: (c: CharacteristicItem) => c.configurable ? '_yes' : '_no',
        cellClass: (c: CharacteristicItem) => c.configurable ? 'text-green-500' : 'text-red-500',
      },
    ];
    if (!this.readonly) {
      cols.push({
        header: 'CHAR_SPEC._actions', type: 'actions', width: 'w-24',
        actions: [{
          icon: faXmark, tooltip: '_delete', dataCy: 'deleteChar',
          buttonClass: '!w-7 !h-7 bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
          onClick: (c: CharacteristicItem) => this.deleteChar(c),
        }],
      });
    }
    return cols;
  }

  onRowClick(item: CharacteristicItem): void {
    if (this.readonly) return;
    this.editingChar = item;
    this.showForm = true;
  }

  onFormChange(value: CharacteristicFormValue): void {
    this.currentChar = value;
  }

  save(): void {
    if (!this.currentChar?.name) return;
    const duplicate = this.characteristics.find(c => c.name === this.currentChar!.name && c !== this.editingChar);
    if (duplicate) {
      this.errorMessage = 'Cannot save duplicated name in characteristics';
      this.showError = true;
      setTimeout(() => { this.showError = false; }, 3000);
      return;
    }

    const item: CharacteristicItem = {
      id: this.editingChar?.id,
      name: this.currentChar.name,
      description: this.currentChar.description ?? '',
      configurable: this.currentChar.configurable,
      valueType: this.currentChar.valueType,
      values: this.currentChar.values,
    };

    let updated: CharacteristicItem[];
    if (this.editingChar != null) {
      const index = this.characteristics.indexOf(this.editingChar);
      updated = [...this.characteristics];
      if (index !== -1) updated[index] = item;
    } else {
      updated = [...this.characteristics, item];
    }
    this.characteristicsChange.emit(updated);
    this.cancel();
  }

  deleteChar(item: CharacteristicItem): void {
    if (this.editingChar === item) this.cancel();
    this.characteristicsChange.emit(this.characteristics.filter(c => c !== item));
  }

  cancel(): void {
    this.currentChar = null;
    this.editingChar = null;
    this.showForm = false;
  }

  private formatValues(c: CharacteristicItem): string {
    return (c.values ?? [])
      .map((v: any) => {
        if (v.value !== undefined && v.value !== null) {
          return v.unitOfMeasure ? `${this.truncateValuePipe.transform(v.value)} (${v.unitOfMeasure})` : this.truncateValuePipe.transform(v.value);
        }
        return `${v.valueFrom} - ${v.valueTo} (${v.unitOfMeasure})`;
      })
      .join(', ');
  }

  private hasLongWord(str: string | undefined, threshold = 20): boolean {
    return str ? str.split(/\s+/).some(word => word.length > threshold) : false;
  }
}
