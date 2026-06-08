import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import moment from 'moment';
import { Subject } from 'rxjs';
import { FormField, TableColumn } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { jsonValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
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
  templateUrl: './blueprint-product-form.component.html',
})
export class BlueprintProductFormComponent implements OnInit, OnDestroy {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() blueprintConfig?: Omit<BlueprintProductFormValue, 'valid'>;
  @Input() blueprintId: string
  @Output() formChange = new EventEmitter<BlueprintProductFormValue>();

  get isValid(): boolean { return this.orchestrationSteps.length > 0; }

  // Product spec picker pagination
  PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;
  partyId = '';
  prodSpecPage = 0;
  prodSpecPageCheck = false;
  loadingProdSpec = false;
  loadingProdSpec_more = false;
  prodSpecs: any[] = [];
  nextProdSpecs: any[] = [];

  // — Orchestration plan —
  orchestrationSteps: OrchestrationStep[] = [];
  editingIndex: number | null = null;
  showStepForm = false;
  cycleError: string[] | null = null;

  stepForm = new FormGroup({
    id: new FormControl(''),
    componentProductSpec: new FormControl<any>(null, [Validators.required]),
    dependsOn: new FormControl<OrchestrationStep[]>([]),
    waitForHealthy: new FormControl(true),
    timeoutSeconds: new FormControl<number | string>(1),
    onFailure: new FormControl<string>('abort'),
    helmValuesOverride: new FormControl('', [jsonValidator]),
  });

  get stepFormFields(): FormField[] {
    const usedProducts = new Set(
      this.orchestrationSteps
        .filter((_, i) => i !== this.editingIndex)
        .map(s => s.componentProductSpec)
    );
    const availableSpecs = this.prodSpecs.filter(item => !usedProducts.has(item.id) && item.id !== this.blueprintId);

    const dependsOnItems = this.orchestrationSteps.filter((_, i) => i !== this.editingIndex);

    return [
      {
        type: 'table', name: 'componentProductSpec', label: 'BLUEPRINT_PROD._step_service',
        required: true, multiple: false, colSpan: 6,
        items: availableSpecs,
        columns: [
          { header: 'Name', getValue: (item: any) => item.name ?? '-' },
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
      { type: 'textarea', name: 'helmValuesOverride', label: 'BLUEPRINT_PROD._helm_values_override', colSpan: 6, rows: 5, placeholder: '{\n  "key": "value"\n}' },
    ];
  }

  get stepsTableColumns(): TableColumn[] {
    return [
      { header: 'Product', getValue: (s: OrchestrationStep) => this.findSpec(s.componentProductSpec)?.name ?? s.componentProductSpec },
      { header: 'Depends On', getValue: (s: OrchestrationStep) => (s.dependsOn ?? []).map(d => d.id).join(', ') },
    ];
  }

  private destroy$ = new Subject<void>();

  constructor(
    private prodSpecService: ProductSpecServiceService,
    private paginationService: PaginationService,
    private localStorage: LocalStorageService,
  ) { }

  ngOnInit(): void {
    this.initPartyInfo();
    if (this.blueprintConfig) {
      this.loadProdData();
    }
    this.getProdSpecs(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) !== '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if (aux.logged_as === aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((o: { id: any }) => o.id === aux.logged_as);
        this.partyId = loggedOrg?.partyId ?? '';
      }
    }
  }

  async getProdSpecs(next: boolean) {
    if (!next) this.loadingProdSpec = true;
    else this.loadingProdSpec_more = true;
    const options = { filters: ['Active', 'Launched'], partyId: this.partyId };
    this.paginationService.getItemsPaginated(
      this.prodSpecPage, this.PROD_SPEC_LIMIT, next,
      this.prodSpecs, this.nextProdSpecs, options,
      this.prodSpecService.getProdSpecByUser.bind(this.prodSpecService)
    ).then(data => {
      this.prodSpecPageCheck = data.page_check;
      this.prodSpecs = data.items;
      this.nextProdSpecs = data.nextItems;
      this.prodSpecPage = data.page;
      this.loadingProdSpec = false;
      this.loadingProdSpec_more = false;
    });
  }

  async nextProdSpecsPage() {
    await this.getProdSpecs(true);
  }

  private findSpec(id: string): any {
    return this.prodSpecs.find(s => s.id === id)
      ?? this.blueprintConfig?.selectedItems?.find((s: any) => s.id === id);
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
    const raw = this.stepForm.value as unknown as OrchestrationStep & { helmValuesOverride: string; componentProductSpec: any };
    const step: OrchestrationStep = {
      ...raw,
      componentProductSpec: raw.componentProductSpec?.id ?? raw.componentProductSpec ?? '',
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
      componentProductSpec: this.findSpec(step.componentProductSpec) ?? null,
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
    this.stepForm.reset({ id: '', componentProductSpec: null, dependsOn: [], waitForHealthy: true, timeoutSeconds: 1, onFailure: 'abort', helmValuesOverride: '' });
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
      orchestrationSteps: this.orchestrationSteps.map(s => ({
        ...s,
        dependsOn: s.dependsOn.map(d => d.id),
        helmValuesOverride: s.helmValuesOverride || {}
      })),
      valid: this.isValid
    });
  }
}
