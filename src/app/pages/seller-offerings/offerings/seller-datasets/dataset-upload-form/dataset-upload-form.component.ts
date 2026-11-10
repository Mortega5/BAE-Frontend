import { Component, EventEmitter, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { Dataset, DATASET_ACCEPT_ATTR, DATASET_MAX_SIZE_BYTES, DatasetService, DatasetVisibility } from 'src/app/services/dataset.service';
import { NotificationService } from 'src/app/services/notification.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { DatasetUploadProgressComponent } from '../dataset-upload-progress/dataset-upload-progress.component';
import { DatasetUploadTracker } from '../dataset-upload-tracker';
import { DATASET_VISIBILITY_FIELD, datasetVisibilityHint } from '../dataset-visibility';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';

/** Uploads a new dataset (name and the file) with upload progress. Meant to be
 * embedded in a modal or a page: it emits `created` with the new dataset, or `cancelled`. */
@Component({
  selector: 'app-dataset-upload-form',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, DynamicFormComponent, DatasetUploadProgressComponent],
  templateUrl: './dataset-upload-form.component.html',
})
export class DatasetUploadFormComponent {
  @Output() created = new EventEmitter<Dataset>();
  @Output() cancelled = new EventEmitter<void>();

  readonly fields: FormField[] = [
    { type: 'string', name: 'name', label: 'DATASETS._name', required: true, maxLength: 100, dataCy: 'datasetName', placeholder: 'DATASETS._name_placeholder', validators: [noWhitespaceValidator] },
    DATASET_VISIBILITY_FIELD,
    {
      type: 'attachment', name: 'file', label: 'DATASETS._file', required: true, deferUpload: true,
      accept: DATASET_ACCEPT_ATTR, maxFileSize: DATASET_MAX_SIZE_BYTES, hint: 'DATASETS._file_hint', dataCy: 'datasetFile'
    },
  ];
  readonly form: FormGroup = buildFormGroup(this.fields);

  readonly upload: DatasetUploadTracker;

  get visibilityHint(): string {
    return datasetVisibilityHint(this.form.value.visibility as DatasetVisibility);
  }

  constructor(private datasetService: DatasetService, private notificationService: NotificationService) {
    this.upload = new DatasetUploadTracker(notificationService);
  }

  submit(): void {
    if (this.form.invalid || this.upload.uploading) return;
    const { name, file, visibility } = this.form.value;

    this.upload.start(this.datasetService.create({ name: name.trim(), visibility }, file.file), dataset => {
      this.notificationService.showSuccess('DATASETS._upload_success');
      this.created.emit(dataset);
    });
  }

  cancel(): void {
    this.upload.cancel();
    this.cancelled.emit();
  }
}
