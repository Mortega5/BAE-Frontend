import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FileSystemFileEntry, NgxFileDropEntry, NgxFileDropModule } from 'ngx-file-drop';
import { v4 as uuidv4 } from 'uuid';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { environment } from 'src/environments/environment';
import { ButtonComponent } from 'src/app/shared/button/button.component';

export interface UploadedAttachment {
  name: string;
  url: string;
  attachmentType: string;
}

/** Drag-and-drop file upload, in the same visual language as the app's existing
 * attachment drop zones (create/update-product-spec). Single or multi-file, with a
 * configurable accept filter and drop/select label texts. */
@Component({
  selector: 'app-attachment-upload',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgxFileDropModule, ButtonComponent],
  templateUrl: './attachment-upload.component.html',
  styleUrl: './attachment-upload.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AttachmentUploadComponent),
      multi: true,
    },
  ],
})
export class AttachmentUploadComponent implements ControlValueAccessor {
  /** File type filter passed straight to the native picker/drop zone, e.g. 'image/*', '.pdf,.docx'. */
  @Input() accept: string = '*/*';
  @Input() multiple: boolean = false;
  @Input() readonly: boolean = false;
  @Input() maxFileSize: number = environment.MAX_FILE_SIZE;
  @Input() dropLabel: string = 'FORMS.ATTACHMENT._drop_label';
  @Input() selectLabel: string = 'FORMS.ATTACHMENT._select_label';
  @Input() dataCy?: string;
  @Output() filesChange = new EventEmitter<any>();

  /** Plain, forms-independent binding — mirrors app-search-select's `[selected]`. */
  @Input()
  set files(value: any) {
    this.attachments = this.normalize(value);
  }

  attachments: UploadedAttachment[] = [];
  uploading: boolean = false;
  uploadProgress: number | null = null;
  errorMessage: string | null = null;

  private isDisabled: boolean = false;
  private onChange: (value: any) => void = () => { };
  private onTouched: () => void = () => { };
  private errorTimeout: any;
  private readonly filenameRegex = /^[A-Za-z0-9_.-]+$/;

  constructor(private attachmentService: AttachmentServiceService) { }

  get isReadonly(): boolean {
    return this.readonly || this.isDisabled;
  }

  /** Hide the drop zone once a single-file field already has its one attachment. */
  get canAddMore(): boolean {
    return this.multiple || this.attachments.length === 0;
  }

  isImage(attachment: UploadedAttachment): boolean {
    return !!attachment.attachmentType?.startsWith('image/');
  }

  fileExtension(attachment: UploadedAttachment): string {
    const match = /\.([a-zA-Z0-9]+)$/.exec(attachment.name ?? '');
    return match ? match[1].toUpperCase() : '';
  }

  dropped(files: NgxFileDropEntry[]): void {
    if (this.isReadonly || this.uploading) return;
    for (const droppedFile of files) {
      if (!droppedFile.fileEntry.isFile) continue;
      const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
      fileEntry.file(file => this.handleFile(file));
    }
  }

  private handleFile(file: File): void {
    if (!this.isAcceptedType(file)) {
      this.showError('FORMS.ATTACHMENT._invalid_type');
      return;
    }
    if (file.size > this.maxFileSize) {
      this.showError('FORMS.ATTACHMENT._too_large');
      return;
    }
    const name = `${uuidv4()}_${file.name}`;
    if (!this.filenameRegex.test(name)) {
      this.showError('FORMS.ATTACHMENT._invalid_name');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64String: string = e.target.result.split(',')[1];
      const fileBody = {
        content: { name, data: base64String },
        contentType: file.type,
        isPublic: true,
      };
      this.uploading = true;
      this.uploadProgress = 0;
      this.attachmentService.uploadFileWithProgress(fileBody).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress = Math.round((100 * event.loaded) / event.total);
          } else if (event.type === HttpEventType.Response) {
            this.uploading = false;
            this.uploadProgress = null;
            const data = event.body;
            const uploaded: UploadedAttachment = { name: file.name, url: data.content, attachmentType: file.type };
            this.attachments = this.multiple ? [...this.attachments, uploaded] : [uploaded];
            this.emitChange();
          }
        },
        error: (error: any) => {
          this.uploading = false;
          this.uploadProgress = null;
          this.showError(error?.status === 413 ? 'FORMS.ATTACHMENT._too_large' : 'FORMS.ATTACHMENT._upload_error');
        },
      });
    };
    reader.readAsDataURL(file);
  }

  private isAcceptedType(file: File): boolean {
    const accept = (this.accept || '*/*').trim();
    if (!accept || accept === '*/*' || accept === '*') return true;
    return accept.split(',').map(a => a.trim()).some(pattern => {
      if (!pattern) return false;
      if (pattern.startsWith('.')) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
      if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1));
      return file.type === pattern;
    });
  }

  remove(attachment: UploadedAttachment): void {
    if (this.isReadonly) return;
    this.attachments = this.attachments.filter(a => a !== attachment);
    this.emitChange();
  }

  private showError(key: string): void {
    this.errorMessage = key;
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => { this.errorMessage = null; }, 3000);
  }

  private emitChange(): void {
    const value = this.multiple ? this.attachments : (this.attachments[0] ?? null);
    this.onChange(value);
    this.onTouched();
    this.filesChange.emit(value);
  }

  writeValue(value: any): void {
    this.attachments = this.normalize(value);
  }

  private normalize(value: any): UploadedAttachment[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
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
