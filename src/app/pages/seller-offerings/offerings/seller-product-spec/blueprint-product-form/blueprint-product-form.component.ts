import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { faEdit, faTrash } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';
import { yamlValidator } from 'src/app/validators/validators';
import { v4 as uuidv4 } from 'uuid';
import { components } from '../../../../../models/product-catalog';
import * as yaml from 'js-yaml';

/** A TMF Characteristic as the orchestration plan carries it. The `name` discriminates the deployment
 * type, the same convention installedSoftwareTemplate.resourceCharacteristic uses, so a docker step
 * would carry `dockerEnv` here instead of `helmValuesOverride`. */
export interface StepCharacteristic {
  name: string;
  valueType: string;
  value: Record<string, any>;
}

export interface OrchestrationStep {
  id: string;
  componentProductSpec: string;
  dependsOn: OrchestrationStep[];
  waitForHealthy: boolean;
  timeoutSeconds: number | string;
  onFailure: 'abort' | 'nothing' | '';
  /** Curated defaults for this component in this composition. The consumer may override them. */
  installedSoftwareTemplate?: { '@type': string; '@baseType': string; resourceCharacteristic: StepCharacteristic[] } | null;
  /** Locks. Applied after everything the consumer sets, and below the component provider's own
   * enforcedValues, which have the last word. This is where the wiring lives. */
  enforcedCharacteristic?: StepCharacteristic[] | null;
}

export type ProductSpecificationRelationship = components["schemas"]["ProductSpecificationRelationship"]
export type OrchestrationStepEmit = Omit<OrchestrationStep, 'dependsOn'> & { dependsOn: string[] };

export interface BlueprintProductFormValue {
  selectedItems: any[];
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
  standalone: true,
  imports: [TranslateModule, ButtonComponent, DynamicFormComponent, TableInputComponent],
  templateUrl: './blueprint-product-form.component.html',
})
export class BlueprintProductFormComponent implements OnInit, OnDestroy {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() blueprintConfig?: Omit<BlueprintProductFormValue, 'valid'>;
  @Input() blueprintId: string
  @Output() formChange = new EventEmitter<BlueprintProductFormValue>();

  get isValid(): boolean { return this.orchestrationSteps.length > 0; }

  partyId = '';
  // Every product spec ever seen (initial config + fetched pages), so ids can be resolved to
  // a full object for display even when they're not on the currently loaded page.
  private specsCache = new Map<string, any>();

  // — Orchestration plan —
  orchestrationSteps: OrchestrationStep[] = [];
  editingIndex: number | null = null;
  showStepForm = false;
  cycleError: string[] | null = null;
  referenceError: string | null = null;

  stepForm = new FormGroup({
    id: new FormControl(''),
    componentProductSpec: new FormControl<any>(null, [Validators.required]),
    dependsOn: new FormControl<OrchestrationStep[]>([]),
    waitForHealthy: new FormControl(true),
    timeoutSeconds: new FormControl<number | string>(1),
    onFailure: new FormControl<string>('abort'),
    defaultValues: new FormControl('', [yamlValidator]),
    enforcedValues: new FormControl('', [yamlValidator]),
  });

  get stepFormFields(): FormField[] {
    const dependsOnItems = this.orchestrationSteps.filter((_, i) => i !== this.editingIndex);

    return [
      {
        type: 'paginatedTable', name: 'componentProductSpec', label: 'BLUEPRINT_PROD._step_service',
        required: true, multiple: false, colSpan: 6,
        fetchPage: this.fetchProdSpecsPaged,
        isSelectable: this.isProdSpecSelectable,
        defaultSort: { key: 'name', direction: 'asc' },
        columns: [
          { header: 'Name', getValue: (item: any) => item.name ?? '-', sortKey: 'name' },
          { header: 'Type', getValue: (item: any) => item.isBundle ? 'Bundle' : 'Simple', width: 'w-28' },
        ],
      } as FormField,
      {
        type: 'table', name: 'dependsOn', label: 'BLUEPRINT_PROD._step_depends_on', multiple: true, colSpan: 6,
        columns: [
          { header: 'ID', getValue: (s: OrchestrationStep) => s.id, width: 'w-1/3' },
          { header: 'Product', getValue: (s: OrchestrationStep) => this.findSpec(s.componentProductSpec)?.name ?? s.componentProductSpec },
        ],
        items: dependsOnItems,
      },
      { type: 'boolean', name: 'waitForHealthy', label: 'BLUEPRINT_PROD._step_wait_healthy', colSpan: 2 },
      { type: 'number', name: 'timeoutSeconds', label: 'BLUEPRINT_PROD._step_timeout', min: 1, max: 600, colSpan: 2 },
      { type: 'select', name: 'onFailure', label: 'BLUEPRINT_PROD._step_on_failure', options: ON_FAILURE_OPTIONS, colSpan: 2 },
      {
        type: 'code', language: 'yaml', name: 'defaultValues',
        label: 'BLUEPRINT_PROD._step_default_values', hint: 'BLUEPRINT_PROD._step_default_values_hint',
        colSpan: 6, placeholder: 'replicaCount: 2',
      },
      {
        type: 'code', language: 'yaml', name: 'enforcedValues',
        label: 'BLUEPRINT_PROD._step_enforced_values', hint: 'BLUEPRINT_PROD._step_enforced_values_hint',
        colSpan: 6, placeholder: 'redis:\n  host: <<steps.step-cache.service.host>>',
      },
    ];
  }

  get stepsTableColumns(): TableColumn[] {
    return [
      { header: 'Product', getValue: (s: OrchestrationStep) => this.findSpec(s.componentProductSpec)?.name ?? s.componentProductSpec },
      { header: 'Depends On', getValue: (s: OrchestrationStep) => (s.dependsOn ?? []).map(d => d.id).join(', ') },
      {
        header: 'BLUEPRINT_PROD._actions', type: 'actions', width: 'w-36 text-center',
        actions: [
          {
            icon: faEdit, tooltip: 'BLUEPRINT_PROD._edit_step', dataCy: 'editStep',
            buttonClass: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300',
            onClick: (s: OrchestrationStep) => this.editStep(this.orchestrationSteps.indexOf(s)),
          },
          {
            icon: faTrash, tooltip: 'BLUEPRINT_PROD._delete_step', dataCy: 'deleteStep',
            buttonClass: '!w-7 !h-7 bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
            onClick: (s: OrchestrationStep) => this.deleteStep(this.orchestrationSteps.indexOf(s)),
          },
        ],
      },
    ];
  }

  private destroy$ = new Subject<void>();

  constructor(
    private prodSpecService: ProductSpecServiceService,
    private localStorage: LocalStorageService,
  ) { }

  ngOnInit(): void {
    this.initPartyInfo();
    this.blueprintConfig?.selectedItems?.forEach(item => this.specsCache.set(item.id, item));
    if (this.blueprintConfig) {
      this.loadProdData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as === aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((o: { id: any }) => o.id === aux.logged_as);
        this.partyId = loggedOrg?.partyId ?? '';
      }
    }
  }

  fetchProdSpecsPaged = async (params: PageRequest): Promise<PageResult<any>> => {
    const result = await this.prodSpecService.getProdSpecByUserPaged(params, undefined, ['Active', 'Launched'], this.partyId, undefined);
    result.items.forEach(item => this.specsCache.set(item.id, item));
    return result;
  }

  // Disables (rather than filters out) specs already used by another step, so the paginated
  // list's page size/total stay consistent with what the backend reports.
  isProdSpecSelectable = (item: any): boolean => {
    const usedProducts = new Set(
      this.orchestrationSteps
        .filter((_, i) => i !== this.editingIndex)
        .map(s => s.componentProductSpec)
    );
    return !usedProducts.has(item.id) && item.id !== this.blueprintId;
  }

  private findSpec(id: string): any {
    return this.specsCache.get(id);
  }

  private loadProdData(): void {
    if (!this.blueprintConfig) return;
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
    if (!this.stepForm.value.id) {
      this.stepForm.controls['id'].setValue(uuidv4())
    }
    const raw = this.stepForm.value as any;
    const { defaultValues, enforcedValues, ...rest } = raw;
    const step: OrchestrationStep = {
      ...rest,
      componentProductSpec: raw.componentProductSpec?.id ?? raw.componentProductSpec ?? '',
      installedSoftwareTemplate: this.toTemplate(defaultValues),
      enforcedCharacteristic: this.toCharacteristics(enforcedValues),
    };

    const candidate = this.editingIndex !== null
      ? this.orchestrationSteps.map((s, i) => i === this.editingIndex ? step : s)
      : [...this.orchestrationSteps, step];

    const cycle = this.hasCyclicDependency(candidate);
    if (cycle) {
      this.cycleError = cycle;
      this.referenceError = null;
      return;
    }

    // Same rule the marketplace enforces at publish time, checked here so the author sees it in the
    // step form rather than as a rejected save.
    const badReference = this.findUnresolvableReference(step);
    if (badReference) {
      this.referenceError = badReference;
      this.cycleError = null;
      return;
    }

    this.referenceError = null;
    this.cycleError = null;
    this.orchestrationSteps = candidate;
    this.editingIndex = null;
    this.showStepForm = false;
    this.resetStepForm();
    this.emitFormChange();
  }

  /** Only `<<steps.` is reserved, so anything else in a value — a Go template, an Argo workflow
   * reference, a shell heredoc — passes through untouched and must not be flagged here. */
  private static readonly REFERENCE = /<<\s*steps\.([a-z0-9-]+)((?:\.[A-Za-z0-9_-]+)+)\s*>>/g;

  private toCharacteristics(value: string | null | undefined): StepCharacteristic[] | null {
    if (!value?.trim()) return null;
    return [{ name: 'helmValuesOverride', valueType: 'object', value: yaml.load(value) as Record<string, any> }];
  }

  private toTemplate(value: string | null | undefined): OrchestrationStep['installedSoftwareTemplate'] {
    const characteristics = this.toCharacteristics(value);
    if (!characteristics) return null;
    return { '@type': 'InstalledSoftware', '@baseType': 'Resource', resourceCharacteristic: characteristics };
  }

  private fromCharacteristics(characteristics: StepCharacteristic[] | null | undefined): string {
    const value = characteristics?.[0]?.value;
    return value ? yaml.dump(value) : '';
  }

  /**
   * A step may only reference a sibling it declares in dependsOn, and the edge must be direct. Without
   * the edge the referenced step may not have deployed when this one is rendered, so the wiring either
   * fails mid-DAG or resolves to nothing — and nothing about that is visible in the plan.
   * @returns the offending step id, or null when every reference is satisfied
   */
  private findUnresolvableReference(step: OrchestrationStep): string | null {
    const declared = new Set((step.dependsOn ?? []).map(d => d.id));
    const serialised = JSON.stringify(step.enforcedCharacteristic ?? []);

    BlueprintProductFormComponent.REFERENCE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BlueprintProductFormComponent.REFERENCE.exec(serialised)) !== null) {
      const target = match[1];
      if (target !== step.id && !declared.has(target)) {
        return target;
      }
    }
    return null;
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
      componentProductSpec: this.findSpec(step.componentProductSpec) ?? null,
      defaultValues: this.fromCharacteristics(step.installedSoftwareTemplate?.resourceCharacteristic),
      enforcedValues: this.fromCharacteristics(step.enforcedCharacteristic),
    } as any);
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.showStepForm = false;
    this.cycleError = null;
    this.referenceError = null;
    this.resetStepForm();
  }

  private resetStepForm(): void {
    this.stepForm.reset({ id: '', componentProductSpec: null, dependsOn: [], waitForHealthy: true, timeoutSeconds: 1, onFailure: 'abort', defaultValues: '', enforcedValues: '' });
  }

  deleteStep(index: number): void {
    this.orchestrationSteps = this.orchestrationSteps.filter((_, i) => i !== index);
    if (this.editingIndex === index) this.cancelEdit();
    this.emitFormChange();
  }

  private emitFormChange(): void {
    const selectedItems = this.orchestrationSteps
      .map(s => this.findSpec(s.componentProductSpec))
      .filter(Boolean);

    this.formChange.emit({
      selectedItems,
      // Both value channels are optional: a step that curates nothing and locks nothing should not
      // publish empty containers for them.
      orchestrationSteps: this.orchestrationSteps.map(s => {
        const { installedSoftwareTemplate, enforcedCharacteristic, ...rest } = s;
        return {
          ...rest,
          dependsOn: s.dependsOn.map(d => d.id),
          ...(installedSoftwareTemplate ? { installedSoftwareTemplate } : {}),
          ...(enforcedCharacteristic ? { enforcedCharacteristic } : {}),
        };
      }),
      valid: this.isValid
    });
  }
}
