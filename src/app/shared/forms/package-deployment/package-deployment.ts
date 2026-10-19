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
  { value: 'helm', label: 'PACKAGE_DEPLOYMENT._type_helm' },
  { value: 'docker', label: 'PACKAGE_DEPLOYMENT._type_docker' },
];

const TOP_FIELDS: FormField[] = [
  { type: 'select', name: 'type', label: 'PACKAGE_DEPLOYMENT._type', required: true, options: DEPLOYMENT_TYPE_OPTIONS, defaultValue: 'helm', colSpan: 1 },
  { type: 'string', name: 'version', label: 'PACKAGE_DEPLOYMENT._schema_version', required: true, colSpan: 1 },
];

/** The provider has two value channels and they sit at opposite ends of the merge: `values` is applied
 * below everything the consumer sets, `enforcedValues` above it. A key belongs to exactly one of them —
 * writing it in both means the default can never take effect. Release identity is deliberately absent:
 * it is chosen per deployment, not per artifact. */
const HELM_FIELDS: FormField[] = [
  { type: 'string', name: 'repository', label: 'PACKAGE_DEPLOYMENT._repository_url', required: true },
  { type: 'string', name: 'chart', label: 'PACKAGE_DEPLOYMENT._chart_name', required: true, colSpan: 2 },
  { type: 'string', name: 'version', label: 'PACKAGE_DEPLOYMENT._chart_version', required: true, colSpan: 2 },
  {
    type: 'code', language: 'yaml', name: 'values',
    label: 'PACKAGE_DEPLOYMENT._default_helm_values',
    hint: 'PACKAGE_DEPLOYMENT._default_helm_values_hint',
    placeholder: 'replicaCount: 1', validators: [yamlValidator],
  },
  {
    type: 'code', language: 'yaml', name: 'enforcedValues',
    label: 'PACKAGE_DEPLOYMENT._enforced_helm_values',
    hint: 'PACKAGE_DEPLOYMENT._enforced_helm_values_hint',
    placeholder: 'image:\n  tag: 1.16.0', validators: [yamlValidator],
  },
];

const DOCKER_FIELDS: FormField[] = [
  { type: 'string', name: 'image', label: 'PACKAGE_DEPLOYMENT._docker_image', required: true, colSpan: 3 },
  { type: 'string', name: 'tag', label: 'PACKAGE_DEPLOYMENT._image_tag', defaultValue: 'latest', colSpan: 1 },
  { type: 'code', language: 'yaml', name: 'composeFile', label: 'PACKAGE_DEPLOYMENT._compose_file', validators: [yamlValidator] },
  { type: 'textarea', name: 'envFile', label: 'PACKAGE_DEPLOYMENT._env_file' },
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
      if (type === 'helm') {
        // The broker round-trips a single YAML string as a one-element array; both channels need unwrapping.
        const helmProps = this.initialValue.properties;
        if (Array.isArray(helmProps.values)) helmProps.values = helmProps.values[0];
        if (Array.isArray(helmProps.enforcedValues)) helmProps.enforcedValues = helmProps.enforcedValues[0];
      }
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
