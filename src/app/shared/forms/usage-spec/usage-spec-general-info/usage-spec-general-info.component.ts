import {Component, Input, OnInit, OnDestroy, Output, EventEmitter} from '@angular/core';
import {AbstractControl, FormControl, FormGroup} from "@angular/forms";
import {EventMessageService} from "../../../../services/event-message.service";
import {FormChangeState} from "../../../../models/interfaces";
import {Subject} from "rxjs";
import {debounceTime, takeUntil} from "rxjs/operators";
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';

interface GeneralInfo {
  name: string;
  description: string;
}

@Component({
  selector: 'usage-spec-general-info',
  standalone: true,
  imports: [
    DynamicFormComponent
  ],
  templateUrl: './usage-spec-general-info.component.html',
  styleUrl: './usage-spec-general-info.component.css'
})
export class UsageSpecGeneralInfoComponent implements OnInit, OnDestroy {
  @Input() form!: AbstractControl;
  @Input() formType!: string;
  @Input() data: any;
  @Output() formChange = new EventEmitter<FormChangeState>();

  fields: FormField[] = [];

  private originalValue!: GeneralInfo;
  private isEditMode = false;
  private destroy$ = new Subject<void>();

  constructor(private eventMessage: EventMessageService) {
  }

  get formGroup(): FormGroup {
    return this.form as FormGroup;
  }

  ngOnInit() {
    this.isEditMode = this.formType === 'update';

    if (this.isEditMode && this.data) {
      this.originalValue = {
        name: this.data.name,
        description: this.data.description
      };

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
            currentValue: newValue
          });
        }
      });
    }

    // Deferred: addControl() changes this shared FormGroup's validity synchronously,
    // which can land mid change-detection pass (the parent stepper above already read
    // canNavigate/validateCurrentStep off this same group in this pass) and trigger
    // NG0100. buildFields() (which is what makes <app-dynamic-form> render its
    // formControlName bindings) is deferred together with it so the template never
    // sees fields without controls.
    Promise.resolve().then(() => {
      this.formGroup.addControl('name', new FormControl<string>(this.data?.name ?? '', [noWhitespaceValidator]));
      this.formGroup.addControl('description', new FormControl<string>(this.data?.description ?? ''));
      this.buildFields();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildFields(): void {
    this.fields = [
      { type: 'string', name: 'name', label: 'USAGE_SPECS._name', required: true, maxLength: 100, dataCy: 'usageSpecName' },
      { type: 'markdownTextarea', name: 'description', label: 'USAGE_SPECS._description', maxLength: 100000 },
    ];
  }

  private getDirtyFields(currentValue: GeneralInfo): string[] {
    return Object.keys(currentValue).filter(key => {
      const currentFieldValue = currentValue[key as keyof GeneralInfo];
      const originalFieldValue = this.originalValue[key as keyof GeneralInfo];
      return JSON.stringify(currentFieldValue) !== JSON.stringify(originalFieldValue);
    });
  }
}
