import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from "@angular/forms";
import { Subject } from "rxjs";
import { debounceTime, takeUntil } from "rxjs/operators";
import { FormField, SelectOption } from 'src/app/models/formFields/form-field.model';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { EventMessageService } from "../../../../services/event-message.service";

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
export class GeneralInfoComponent implements OnInit, OnChanges, OnDestroy {
  @Input() form!: AbstractControl;
  @Input() formType!: string;
  @Input() data: any;
  /** Only shown/added as a control in create mode when the org has catalog management enabled. */
  @Input() catalogSelectionRequired = false;
  @Input() availableCatalogs: SelectOption[] = [];

  fields: FormField[] = [];
  descriptionFields: FormField[] = [];

  private originalValue!: GeneralInfo;
  private isEditMode = false;
  private controlsReady = false;
  private destroy$ = new Subject<void>();

  constructor(
    private eventMessage: EventMessageService,
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
      if (this.catalogSelectionRequired) {
        this.formGroup.addControl('catalogue', new FormControl<any>(this.data?.catalogue ?? null, Validators.required));
      }
      this.formGroup.addControl('description', new FormControl<string>(this.data?.description ?? '', Validators.maxLength(100000)));
      this.formGroup.addControl('version', new FormControl<string>(this.data?.version ?? '0.1', [Validators.required, Validators.pattern('^-?[0-9]\\d*(\\.\\d*(\\.\\d*)?)?$'), noWhitespaceValidator]));
      this.controlsReady = true;
      this.buildFields();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    // availableCatalogs loads asynchronously in the parent, after this component has
    // already built its fields — rebuild so the catalogue field picks up the real options.
    if (changes['availableCatalogs'] && this.controlsReady) {
      this.buildFields();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildFields(): void {
    this.fields = [
      { type: 'string', name: 'name', label: 'CREATE_OFFER._name', required: true, maxLength: 100, colSpan: 1, dataCy: 'offerName', placeholder: 'CREATE_OFFER._name_placeholder' },
      { type: 'string', name: 'version', label: 'CREATE_OFFER._version', required: true, colSpan: 1, dataCy: 'offerVersion' },
      ...(this.catalogSelectionRequired ? [{
        type: 'select' as const,
        name: 'catalogue',
        label: 'CREATE_OFFER._catalog',
        required: true,
        searchable: true,
        colSpan: 2,
        options: this.availableCatalogs,
        placeholder: 'CREATE_OFFER._select',
        dataCy: 'offerCatalogSelect',
      }] : []),
    ];
    this.descriptionFields = [
      { type: 'markdownTextarea', name: 'description', label: 'CREATE_OFFER._description', placeholder: 'CREATE_OFFER._overview_placeholder' },
    ];
  }

  private getDirtyFields(currentValue: GeneralInfo): string[] {
    return Object.keys(currentValue).filter(key => {
      return JSON.stringify(currentValue[key as keyof GeneralInfo]) !== JSON.stringify(this.originalValue[key as keyof GeneralInfo]);
    });
  }
}
