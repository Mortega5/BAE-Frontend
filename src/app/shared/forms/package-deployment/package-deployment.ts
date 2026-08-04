import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField, SelectOption } from '../../../models/formFields/form-field.model';
import { yamlValidator } from '../../../validators/validators';
import { buildFormGroup } from '../dynamic-form/build-form-group.util';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';

type DeploymentType = 'helm' | 'docker';

const DEPLOYMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'helm', label: 'Helm' },
  { value: 'docker', label: 'Docker' },
];

const TOP_FIELDS: FormField[] = [
  { type: 'select', name: 'type', label: 'Type', required: true, options: DEPLOYMENT_TYPE_OPTIONS, defaultValue: 'helm', colSpan: 1 },
  { type: 'string', name: 'version', label: 'Schema version', required: true, colSpan: 1 },
];

const HELM_FIELDS: FormField[] = [
  { type: 'string', name: 'repository', label: 'Repository URL', required: true },
  { type: 'string', name: 'chart', label: 'Chart name', required: true },
  { type: 'string', name: 'releaseName', label: 'Release name', required: true },
  { type: 'string', name: 'version', label: 'Chart version', required: true, colSpan: 2 },
  { type: 'string', name: 'namespace', label: 'Namespace', defaultValue: 'default', colSpan: 2 },
  { type: 'code', language: 'yaml', name: 'values', label: 'Values (YAML)', validators: [yamlValidator] },
];

const DOCKER_FIELDS: FormField[] = [
  { type: 'string', name: 'image', label: 'Docker image', required: true, colSpan: 3 },
  { type: 'string', name: 'tag', label: 'Image tag', defaultValue: 'latest', colSpan: 1 },
  { type: 'code', language: 'yaml', name: 'composeFile', label: 'Compose file (YAML)', validators: [yamlValidator] },
  { type: 'textarea', name: 'envFile', label: 'Env file' },
];

@Component({
  selector: 'app-package-deployment',
  templateUrl: './package-deployment.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, DynamicFormComponent],
})
export class PackageDeploymentComponent implements OnInit, OnDestroy {

  /** Existing deployment value to edit, shaped like this component's own form.value (`{type, version, properties}`). */
  @Input() initialValue: any;

  @Output() formReady = new EventEmitter<FormGroup>();

  readonly topFields = TOP_FIELDS;
  propertiesFields: FormField[] = HELM_FIELDS;

  form = new FormGroup({
    ...buildFormGroup(TOP_FIELDS).controls,
    properties: buildFormGroup(HELM_FIELDS),
  });

  get propertiesForm(): FormGroup {
    return this.form.get('properties') as FormGroup;
  }

  private destroy$ = new Subject<void>();

  ngOnInit() {
    if (this.initialValue) {
      const type: DeploymentType = this.initialValue.type === 'docker' ? 'docker' : 'helm';
      this.propertiesFields = type === 'docker' ? DOCKER_FIELDS : HELM_FIELDS;
      this.form.setControl('properties', buildFormGroup(this.propertiesFields));
      this.form.patchValue(this.initialValue);
    }

    this.form.get('type')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => this.onTypeChange(type as DeploymentType));

    this.formReady.emit(this.form);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private onTypeChange(type: DeploymentType) {
    this.propertiesFields = type === 'docker' ? DOCKER_FIELDS : HELM_FIELDS;
    this.form.setControl('properties', buildFormGroup(this.propertiesFields));
  }
}
