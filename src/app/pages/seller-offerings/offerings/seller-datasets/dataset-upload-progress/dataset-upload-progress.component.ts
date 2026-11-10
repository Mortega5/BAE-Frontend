import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/** The progress bar shown while a dataset file is being uploaded. */
@Component({
  selector: 'app-dataset-upload-progress',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="w-full" data-cy="datasetUploadProgress">
      <div class="flex justify-between text-sm text-content-muted mb-1">
        <span>{{ 'DATASETS._uploading' | translate }}</span>
        <span>{{ progress }}%</span>
      </div>
      <div class="w-full h-2 rounded-full bg-skeleton overflow-hidden">
        <div class="h-full bg-primary-100 transition-all" [style.width.%]="progress"></div>
      </div>
    </div>
  `,
})
export class DatasetUploadProgressComponent {
  @Input() progress = 0;
}
