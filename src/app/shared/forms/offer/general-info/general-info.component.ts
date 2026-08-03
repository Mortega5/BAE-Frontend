import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from "@angular/forms";
import { Subject } from "rxjs";
import { debounceTime, takeUntil } from "rxjs/operators";
import { buildLifecycleStatusOptions, FormField } from 'src/app/models/formFields/form-field.model';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';
import { EventMessageService } from "../../../../services/event-message.service";
import { ApiServiceService } from "../../../../services/product-service.service";

interface GeneralInfo {
  name: string;
  status: string;
  description: string;
  version: string;
}

@Component({
  selector: 'app-general-info-form',
  standalone: true,
  imports: [DynamicFormComponent],
  templateUrl: './general-info.component.html',
  styleUrl: './general-info.component.css'
})
export class GeneralInfoComponent implements OnInit, OnDestroy {
  @Input() form!: AbstractControl;
  @Input() formType!: string;
  @Input() data: any;

  fields: FormField[] = [];

  private originalValue!: GeneralInfo;
  private isEditMode = false;
  private disabledStatuses: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private eventMessage: EventMessageService,
    private apiService: ApiServiceService,
  ) { }

  get formGroup(): FormGroup {
    return this.form as FormGroup;
  }

  ngOnInit() {
    this.isEditMode = this.formType === 'update';

    if (this.isEditMode) {
      this.originalValue = {
        name: this.data.name,
        status: this.data.lifecycleStatus,
        description: this.data.description,
        version: this.data.version,
      };

      if (environment.LAUNCH_VALIDATION_ENABLED && this.data?.id) {
        this.apiService.checkOfferingLaunch(this.data.id).then((result) => {
          if (!result.canBeLaunched) {
            this.disabledStatuses = ['Launched'];
            this.buildFields();
          }
        }).catch(() => {
          this.disabledStatuses = ['Launched'];
          this.buildFields();
        });
      }

      this.formGroup.valueChanges.pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      ).subscribe((newValue) => {
        const dirtyFields = this.getDirtyFields(newValue);
        if (dirtyFields.length > 0) {
          this.eventMessage.emitSubformChange({
            subformType: 'generalInfo',
            isDirty: true,
            dirtyFields,
            originalValue: this.originalValue,
            currentValue: newValue,
          });
        }
      });
    }

    // Deferred: addControl() changes this shared FormGroup's validity synchronously,
    // which can land mid change-detection pass (the stepper above already read
    // canAdvance off this same group in this pass) and trigger NG0100. buildFields()
    // (which is what makes <app-dynamic-form> render its formControlName bindings)
    // is deferred together with it so the template never sees fields without controls.
    Promise.resolve().then(() => {
      this.formGroup.addControl('name', new FormControl<string>(this.data?.name ?? '', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]));
      this.formGroup.addControl('status', new FormControl<string>(this.data?.lifecycleStatus ?? 'Active'));
      this.formGroup.addControl('description', new FormControl<string>(this.data?.description ?? '', Validators.maxLength(100000)));
      this.formGroup.addControl('version', new FormControl<string>(this.data?.version ?? '0.1', [Validators.required, Validators.pattern('^-?[0-9]\\d*(\\.\\d*(\\.\\d*)?)?$'), noWhitespaceValidator]));
      this.buildFields();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildFields(): void {
    const statusOptions = buildLifecycleStatusOptions('offerStatus', this.disabledStatuses);

    this.fields = [
      { type: 'string', name: 'name', label: 'CREATE_OFFER._name', required: true, maxLength: 100, colSpan: 1, dataCy: 'offerName' },
      { type: 'string', name: 'version', label: 'CREATE_OFFER._version', required: true, colSpan: 1, dataCy: 'offerVersion' },
      ...(this.isEditMode ? [{ type: 'statusPicker' as const, name: 'status', label: 'CREATE_OFFER._status', options: statusOptions }] : []),
      { type: 'markdownTextarea', name: 'description', label: 'CREATE_OFFER._description' },
    ];
  }

  private getDirtyFields(currentValue: GeneralInfo): string[] {
    return Object.keys(currentValue).filter(key => {
      return JSON.stringify(currentValue[key as keyof GeneralInfo]) !== JSON.stringify(this.originalValue[key as keyof GeneralInfo]);
    });
  }
}
