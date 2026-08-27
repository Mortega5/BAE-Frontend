import {Component, Input, OnInit, OnDestroy, Output, EventEmitter} from '@angular/core';
import {MarkdownTextareaComponent} from "../../markdown-textarea/markdown-textarea.component";
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {EventMessageService} from "src/app/services/event-message.service";
import {StatusSelectorComponent} from "../../status-selector/status-selector.component";
import {TranslateModule} from "@ngx-translate/core";
import {FormChangeState} from "../../../../models/interfaces";
import {Subject} from "rxjs";
import { takeUntil } from 'rxjs/operators';
import { AttachmentUploadComponent } from '../../attachment-upload/attachment-upload.component';

interface License {
  treatment: string;
  description: string;
  termsFile: any;
}

const TERMS_FILE_TERM_NAME = 'terms-file';

@Component({
  selector: 'app-license-form',
  standalone: true,
    imports: [
        MarkdownTextareaComponent,
        AttachmentUploadComponent,
        ReactiveFormsModule,
        TranslateModule
    ],
  templateUrl: './license.component.html',
  styleUrl: './license.component.css'
})
export class LicenseComponent implements OnInit, OnDestroy {
  @Input() form!: AbstractControl;
  @Input() formType!: string;
  @Input() data: any;
  @Output() formChange = new EventEmitter<FormChangeState>();
  private destroy$ = new Subject<void>();

  constructor(
    private eventMessage: EventMessageService) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'UpdateOffer') {
        if (this.isEditMode && this.hasBeenModified && this.originalValue) {
          const currentValue = {
            treatment: 'License',
            description: this.descControl?.value || '',
            termsFile: this.termsFileControl?.value || null
          };
          
          const dirtyFields = this.getDirtyFields(currentValue);
          
          if (dirtyFields.length > 0) {
            const changeState: FormChangeState = {
              subformType: 'license',
              isDirty: true,
              dirtyFields,
              originalValue: this.originalValue,
              currentValue
            };
    
            console.log('🚀 Emitting final change state:', changeState);
            this.formChange.emit(changeState);
          } else {
            console.log('📝 No real changes detected, skipping emission');
          }
        }
      }
    })
  } 

  freeLicenseSelected: boolean = false;
  private originalValue: License | null = null;
  private hasBeenModified: boolean = false;
  private isEditMode: boolean = false;

  get formGroup(): FormGroup {
    return this.form as FormGroup;  // Lo convierte en FormGroup
  }

  get descControl(): FormControl | null {
    const control = this.formGroup.get('description');
    return control instanceof FormControl ? control : null;
  }

  get termsFileControl(): FormControl | null {
    const control = this.formGroup.get('termsFile');
    return control instanceof FormControl ? control : null;
  }

  ngOnInit() {
    console.log('🔄 Initializing LicenseComponent');
    console.log('📝 Initializing form in', this.formType, 'mode');
    this.isEditMode = this.formType === 'update';

    if (this.isEditMode && this.data) {
      console.log('📝 Data received:', this.data);
      //LICENSE
      const terms = Array.isArray(this.data.productOfferingTerm) ? this.data.productOfferingTerm : [];
      const license = terms.find((element: { name: any; }) => element.name == 'License');
      const termsFileTerm = terms.find((element: { name: any; }) => element.name === TERMS_FILE_TERM_NAME);
      const termsFileValue = termsFileTerm?.description
        ? { name: this.filenameFromTermsFileUrl(termsFileTerm.description), url: termsFileTerm.description, attachmentType: '' }
        : null;

      this.formGroup.addControl('treatment', new FormControl<string>('License'));
      this.formGroup.addControl('description', new FormControl<string>(license?.description ?? ''));
      this.formGroup.addControl('termsFile', new FormControl<any>(termsFileValue));

      if (license) {
        // Store original value only in edit mode
        this.originalValue = {
          treatment: license.name,
          description: license.description,
          termsFile: termsFileValue
        };
        console.log('📝 Original value stored:', this.originalValue);
      }
    } else {
      this.formGroup.addControl('treatment', new FormControl<string>('License'));
      this.formGroup.addControl('description', new FormControl<string>(''));
      this.formGroup.addControl('termsFile', new FormControl<any>(null));
    }

    // Subscribe to form changes only in edit mode
    if (this.isEditMode) {
      this.formGroup.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.hasBeenModified = true;
      });
    }
  }

  ngOnDestroy() {
    console.log('🗑️ Destroying LicenseComponent');
    
    // Solo emitir cambios si estamos en modo edición y hay cambios reales
    if (this.isEditMode && this.hasBeenModified && this.originalValue) {
      const currentValue = {
        treatment: 'License',
        description: this.descControl?.value || '',
        termsFile: this.termsFileControl?.value || null
      };

      const dirtyFields = this.getDirtyFields(currentValue);

      if (dirtyFields.length > 0) {
        const changeState: FormChangeState = {
          subformType: 'license',
          isDirty: true,
          dirtyFields,
          originalValue: this.originalValue,
          currentValue
        };

        console.log('🚀 Emitting final change state:', changeState);
        this.formChange.emit(changeState);
      } else {
        console.log('📝 No real changes detected, skipping emission');
      }
    } else if (!this.isEditMode) {
      console.log('📝 Not in edit mode, skipping change detection');
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getDirtyFields(currentValue: License): string[] {
    const dirtyFields: string[] = [];
    
    if (!this.originalValue) return dirtyFields;

    if (currentValue.treatment !== this.originalValue.treatment) {
      dirtyFields.push('treatment');
    }
    
    if (currentValue.description !== this.originalValue.description) {
      dirtyFields.push('description');
    }

    if ((currentValue.termsFile?.url || null) !== (this.originalValue.termsFile?.url || null)) {
      dirtyFields.push('termsFile');
    }

    return dirtyFields;
  }

  /** Recovers a display name from an uploaded terms-file URL (the URL's UUID prefix is stripped). */
  private filenameFromTermsFileUrl(url: string): string {
    const last = url.split('/').pop() || url;
    let decoded = last;
    try { decoded = decodeURIComponent(last); } catch { }
    const underscore = decoded.indexOf('_');
    return underscore > -1 ? decoded.slice(underscore + 1) : decoded;
  }
}
