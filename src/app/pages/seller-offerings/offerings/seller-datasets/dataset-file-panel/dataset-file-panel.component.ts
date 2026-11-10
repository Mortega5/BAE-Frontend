import { Component, Input } from '@angular/core';
import { AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { Dataset, DATASET_ACCEPT_ATTR, DATASET_MAX_SIZE_BYTES, datasetFormat, DatasetReplacement, datasetSize, DatasetVisibility, isExternalDataset } from 'src/app/services/dataset.service';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { datasetVisibility } from '../dataset-table';

/** An address the browser can parse, with an http(s) scheme, a host and a path of its own (the access policy is restricted
 * to the path, so the root would grant the whole host). Empty is left to `required`. */
export function httpUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname && url.pathname !== '/' ? null : { url: true };
  } catch {
    return { url: true };
  }
}

/** The file of the dataset, only uploaded when the seller saves. */
export const DATASET_FILE_FIELD: FormField = {
  type: 'attachment', name: 'file', label: 'DATASETS._file', required: true, deferUpload: true,
  accept: DATASET_ACCEPT_ATTR, maxFileSize: DATASET_MAX_SIZE_BYTES, hint: 'DATASETS._file_hint', dataCy: 'datasetFile'
};

/** The address of the dataset, for one the seller serves from their own DSP. */
export const DATASET_URL_FIELD: FormField = {
  type: 'string', name: 'url', label: 'DATASETS._url', required: true, maxLength: 2000, hint: 'DATASETS._url_hint',
  placeholder: 'DATASETS._url_placeholder', dataCy: 'datasetUrl', validators: [httpUrlValidator], errorMessages: { url: 'DATASETS._url_invalid' },
};

/** What can be replaced: the file of an uploaded dataset, or the address of one that is not. Both controls exist in the
 * form; the panel shows the one that applies to the dataset. */
export const DATASET_REPLACE_FIELDS: FormField[] = [
  { ...DATASET_FILE_FIELD, dataCy: 'datasetReplaceFile' },
  { ...DATASET_URL_FIELD, dataCy: 'datasetReplaceUrl' },
];

const FILE_ONLY = DATASET_REPLACE_FIELDS.filter(field => field.name === 'file');
const URL_ONLY = DATASET_REPLACE_FIELDS.filter(field => field.name === 'url');

/** The stored value of the dataset in its form: the file shown in the drop zone like an uploaded one (removing it frees
 * the zone for a new file), or the address. */
export function showStoredDataset(form: FormGroup, dataset?: Dataset): void {
  form.reset();
  if (!dataset) return;
  if (isExternalDataset(dataset)) {
    form.get('url')!.setValue(dataset.url);
  } else {
    form.get('file')!.setValue({ name: datasetFileName(dataset), url: '', attachmentType: dataset.mimeType ?? '' });
  }
}

/** What the seller changed: a newly picked file (it carries the File itself, the stored one is just displayed), or an
 * address other than the stored one. Null when nothing changed. */
export function datasetReplacement(form: FormGroup, dataset?: Dataset): DatasetReplacement | null {
  if (!dataset) return null;
  if (isExternalDataset(dataset)) {
    const url = (form.value.url ?? '').trim();
    return form.get('url')!.valid && url && url !== dataset.url ? { url } : null;
  }
  return form.value.file?.file ? { file: form.value.file.file } : null;
}

/** Name the file had when it was uploaded, or the one it has now. */
export const datasetFileName = (dataset?: Dataset): string => dataset?.originalName || dataset?.filename || '-';

/** The stored file of a dataset and the way to replace it, shown where a product or an offer sells one. The parent owns
 * the form (`DATASET_REPLACE_FIELDS` built with buildFormGroup) and sends the new file when it saves. */
@Component({
  selector: 'app-dataset-file-panel',
  standalone: true,
  imports: [TranslateModule, DynamicFormComponent],
  template: `
    <dl data-cy="datasetFileInfo" class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      @if (external) {
      <div class="sm:col-span-2"><dt class="text-content-muted">{{ 'DATASETS._url' | translate }}</dt><dd class="text-content break-all">{{ dataset?.url }}</dd></div>
      } @else {
      <div><dt class="text-content-muted">{{ 'DATASETS._file' | translate }}</dt><dd class="text-content break-all">{{ fileName }}</dd></div>
      <div><dt class="text-content-muted">{{ 'DATASETS._format' | translate }}</dt><dd class="text-content">{{ format }}</dd></div>
      }
      <div><dt class="text-content-muted">{{ 'DATASETS._visibility' | translate }}</dt><dd data-cy="datasetVisibilityValue" class="text-content">{{ ('DATASETS._visibility_' + visibility) | translate }}</dd></div>
      @if (!external) {
      @if (!form.value.file?.file) {
      <div><dt class="text-content-muted">{{ 'DATASETS._size' | translate }}</dt><dd class="text-content">{{ size }}</dd></div>
      }
      <div><dt class="text-content-muted">{{ 'DATASETS._checksum' | translate }}</dt><dd class="text-content break-all">{{ dataset?.checksum || '-' }}</dd></div>
      }
    </dl>
    <p class="text-sm text-content-muted">{{ ('DATASETS._visibility_' + visibility + '_hint') | translate }} {{ 'DATASETS._visibility_fixed_hint' | translate }}</p>
    @if (dataset?.incomplete) {
    <p class="text-sm text-content-muted">{{ 'DATASETS._incomplete_hint' | translate }}</p>
    }
    <div class="flex flex-col gap-3 border-t border-line pt-5">
      <h3 class="text-lg font-semibold text-content">{{ (external ? 'DATASETS._change_url' : 'DATASETS._replace_file') | translate }}</h3>
      <p class="text-sm text-content-muted">{{ (external ? 'DATASETS._change_url_hint' : 'DATASETS._replace_hint') | translate }}</p>
      <app-dynamic-form class="block" [fields]="fields" [formGroup]="form" />
    </div>
  `,
  host: { class: 'flex flex-col gap-5' },
})
export class DatasetFilePanelComponent {
  @Input() dataset?: Dataset;
  @Input({ required: true }) form!: FormGroup;
  /** Only the field that applies to the dataset */
  get fields(): FormField[] {
    return this.external ? URL_ONLY : FILE_ONLY;
  }
  get external(): boolean { return !!this.dataset && isExternalDataset(this.dataset); }

  get visibility(): DatasetVisibility { return this.dataset ? datasetVisibility(this.dataset) : 'private'; }
  get fileName(): string { return datasetFileName(this.dataset); }
  get format(): string { return this.dataset ? datasetFormat(this.dataset) : '-'; }
  get size(): string { return this.dataset ? datasetSize(this.dataset) : '-'; }
}
