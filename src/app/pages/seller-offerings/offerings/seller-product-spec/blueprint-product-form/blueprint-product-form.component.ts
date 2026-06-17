import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField, TableColumn } from 'src/app/models/formFields/form-field.model';
import { jsonValidator } from 'src/app/validators/validators';
import { components } from '../../../../../models/product-catalog';


export interface OrchestrationStep {
  id: string;
  componentProductSpec: string;
  dependsOn: OrchestrationStep[];
  waitForHealthy: boolean;
  timeoutSeconds: number | string;
  onFailure: 'abort' | 'nothing' | '';
  helmValuesOverride?: Record<string, any> | null;
}

export type ProductSpecificationRelationship = components["schemas"]["ProductSpecificationRelationship"]
export type OrchestrationStepEmit = Omit<OrchestrationStep, 'dependsOn'> & { dependsOn: string[] };

export interface BlueprintProductFormValue {
  selectedItems: ProductSpecificationRelationship[];
  orchestrationSteps: OrchestrationStepEmit[];
  valid: boolean;
}

const ON_FAILURE_OPTIONS = [
  { value: 'abort', label: 'BLUEPRINT_PROD._on_failure_abort' },
  { value: 'continue', label: 'BLUEPRINT_PROD._on_failure_continue' },
  { value: 'retry', label: 'BLUEPRINT_PROD._on_failure_retry' },
];

@Component({
  selector: 'app-blueprint-product-form',
  templateUrl: './blueprint-product-form.component.html',
})
export class BlueprintProductFormComponent implements OnInit, OnDestroy {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() blueprintConfig?: Omit<BlueprintProductFormValue, 'valid'>;
  @Input() relationships: any[] = [];
  @Output() formChange = new EventEmitter<BlueprintProductFormValue>();

  get isValid(): boolean { return this.form.valid && this.orchestrationSteps.length > 0; }


  readonly itemTableColumns: TableColumn[] = [
    { header: 'Name', getValue: item => item.name, width: 'w-1/3' },
    { header: 'Description', getValue: item => item.description },
  ];

  form = new FormGroup({
    selectedItems: new FormControl<any[]>([], { nonNullable: true }),
  });

  // — Orchestration plan —
  orchestrationSteps: OrchestrationStep[] = [];
  editingIndex: number | null = null;
  showStepForm = false;
  cycleError: string[] | null = null;

  stepForm = new FormGroup({
    id: new FormControl('', [Validators.required]),
    componentProductSpec: new FormControl('', [Validators.required]),
    dependsOn: new FormControl<OrchestrationStep[]>([]),
    waitForHealthy: new FormControl(true),
    timeoutSeconds: new FormControl<number | string>(1),
    onFailure: new FormControl<string>('abort'),
    helmValuesOverride: new FormControl('', [jsonValidator]),
  });

  get stepFormFields(): FormField[] {
    const selectedItems: any[] = this.relationships;

    const usedProducts = new Set(
      this.orchestrationSteps
        .filter((_, i) => i !== this.editingIndex)
        .map(s => s.componentProductSpec)
    );
    const productOptions = selectedItems
      .filter((item: any) => !usedProducts.has(item.id))
      .map((item: any) => ({ value: item.id, label: item.productSpec.name }));

    const currentId = this.stepForm.controls.id.value;

    const dependsOnItems = this.orchestrationSteps.filter((_, i) => i !== this.editingIndex);

    return [
      { type: 'string', name: 'id', label: 'BLUEPRINT_PROD._step_id', required: true, colSpan: 3 },
      { type: 'select', name: 'componentProductSpec', label: 'BLUEPRINT_PROD._step_service', options: productOptions, colSpan: 3, required: true },
      {
        type: 'table', name: 'dependsOn', label: 'BLUEPRINT_PROD._step_depends_on', multiple: true, colSpan: 6,
        columns: [
          { header: 'ID', getValue: (s: OrchestrationStep) => s.id, width: 'w-1/3' },
          { header: 'Product', getValue: (s: OrchestrationStep) => this.relationships.find((i: any) => i.id === s.componentProductSpec)?.productSpec?.name ?? s.componentProductSpec },
        ],
        items: dependsOnItems,
      },
      { type: 'boolean', name: 'waitForHealthy', label: 'BLUEPRINT_PROD._step_wait_healthy', colSpan: 2 },
      { type: 'number', name: 'timeoutSeconds', label: 'BLUEPRINT_PROD._step_timeout', min: 1, max: 600, colSpan: 2 },
      { type: 'select', name: 'onFailure', label: 'BLUEPRINT_PROD._step_on_failure', options: ON_FAILURE_OPTIONS, colSpan: 2 },
      { type: 'textarea', name: 'helmValuesOverride', label: 'BLUEPRINT_PROD._helm_values_override', colSpan: 6, rows: 5, placeholder: '{\n  "key": "value"\n}' },
    ];
  }

  get stepsTableColumns(): TableColumn[] {
    return [
      { header: 'ID', getValue: (s: OrchestrationStep) => s.id, width: 'w-32' },
      { header: 'Product', getValue: (s: OrchestrationStep) => this.relationships.find((i: any) => i.id === s.componentProductSpec)?.productSpec?.name ?? s.componentProductSpec },
      { header: 'Depends On', getValue: (s: OrchestrationStep) => (s.dependsOn ?? []).map(d => d.id).join(', ') },
    ];
  }

  private destroy$ = new Subject<void>();

  ngOnInit(): void {

    if (this.blueprintConfig) {
      this.loadProdData();
    }

    this.form.controls.selectedItems.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.emitFormChange());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProdData(): void {
    if (!this.blueprintConfig) return;
    this.form.patchValue({ selectedItems: this.blueprintConfig.selectedItems ?? [] });
    const emitted = this.blueprintConfig.orchestrationSteps ?? [];
    const stepMap = new Map<string, OrchestrationStep>(
      emitted.map(s => [s.id, { ...s, dependsOn: [] }])
    );
    emitted.forEach(s => {
      stepMap.get(s.id)!.dependsOn = s.dependsOn
        .map(id => stepMap.get(id))
        .filter((d): d is OrchestrationStep => d !== undefined);
    });
    this.orchestrationSteps = [...stepMap.values()];
  }

  addOrUpdateStep(): void {
    if (this.stepForm.invalid) return;

    const raw = this.stepForm.value as unknown as OrchestrationStep & { helmValuesOverride: string };
    const step: OrchestrationStep = {
      ...raw,
      helmValuesOverride: raw.helmValuesOverride?.trim() ? JSON.parse(raw.helmValuesOverride) : null,
    };

    const candidate = this.editingIndex !== null
      ? this.orchestrationSteps.map((s, i) => i === this.editingIndex ? step : s)
      : [...this.orchestrationSteps, step];

    const cycle = this.hasCyclicDependency(candidate);
    if (cycle) {
      this.cycleError = cycle;
      return;
    }

    this.cycleError = null;
    this.orchestrationSteps = candidate;
    this.editingIndex = null;
    this.showStepForm = false;
    this.resetStepForm();
    this.emitFormChange();
  }

  hasCyclicDependency(steps: OrchestrationStep[]): string[] | null {
    const adj = new Map<string, string[]>(
      steps.map(s => [s.id, (s.dependsOn ?? []).map(d => d.id)])
    );
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: string[] = [];

    const dfs = (id: string): string[] | null => {
      visited.add(id);
      inStack.add(id);
      path.push(id);
      for (const neighbor of (adj.get(id) ?? [])) {
        if (inStack.has(neighbor)) {
          return [...path.slice(path.indexOf(neighbor)), neighbor];
        }
        if (!visited.has(neighbor)) {
          const result = dfs(neighbor);
          if (result) return result;
        }
      }
      path.pop();
      inStack.delete(id);
      return null;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        const cycle = dfs(step.id);
        if (cycle) return cycle;
      }
    }
    return null;
  }

  editStep(index: number): void {
    this.editingIndex = index;
    this.showStepForm = true;
    const step = this.orchestrationSteps[index];
    this.stepForm.patchValue({
      ...step,
      helmValuesOverride: step.helmValuesOverride
        ? JSON.stringify(step.helmValuesOverride, null, 2)
        : '',
    });
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.showStepForm = false;
    this.cycleError = null;
    this.resetStepForm();
  }

  private resetStepForm(): void {
    this.stepForm.reset({ id: '', componentProductSpec: '', dependsOn: [], waitForHealthy: true, timeoutSeconds: 1, onFailure: 'abort', helmValuesOverride: '' });
  }

  deleteStep(index: number): void {
    this.orchestrationSteps = this.orchestrationSteps.filter((_, i) => i !== index);
    if (this.editingIndex === index) this.cancelEdit();
    this.emitFormChange();
  }

  private emitFormChange(): void {
    this.formChange.emit({
      selectedItems: this.form.controls.selectedItems.value.map(item => ({
        '@type': 'ProductSpecificationRelationship',
        id: item.id,
        relationshipType: 'dependency'
      })),
      orchestrationSteps: this.orchestrationSteps.map(s => ({
        ...s,
        dependsOn: s.dependsOn.map(d => d.id),
        helmValuesOverride: s.helmValuesOverride || {}
      })),
      valid: this.isValid
    });
  }
}
