import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { components } from 'src/app/models/resource-catalog';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { DatasetUploadProgressComponent } from '../../seller-datasets/dataset-upload-progress/dataset-upload-progress.component';
import { DatasetUploadTracker } from '../../seller-datasets/dataset-upload-tracker';
import { DATASET_VISIBILITY_FIELD, datasetVisibilityHint } from '../../seller-datasets/dataset-visibility';
import { datasetVisibility } from '../../seller-datasets/dataset-table';
import { Dataset, DATASET_ACCEPT_ATTR, DATASET_MAX_SIZE_BYTES, datasetFormat, datasetSize, DatasetService, DatasetSource, DatasetVisibility } from 'src/app/services/dataset.service';
import { NotificationService } from 'src/app/services/notification.service';
import { belongsToParty } from 'src/app/shared/session-ownership.util';
import { ResourceSpecServiceService, ResourceSpecType } from 'src/app/services/resource-spec-service.service';
import { BadgeComponent, BadgeStatus, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { UnsavedChangesModalComponent } from 'src/app/shared/unsaved-changes-modal/unsaved-changes-modal.component';
import { LeaveConfirmable } from 'src/app/guard/unsaved-changes.guard';
import { NotFoundStateComponent } from 'src/app/shared/not-found-state/not-found-state.component';
import { CharacteristicItem, CharacteristicsEditorComponent } from 'src/app/shared/forms/characteristics-editor/characteristics-editor.component';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { PackageDeploymentComponent } from 'src/app/shared/forms/package-deployment/package-deployment';
import { StepperComponent, StepChangedEvent } from 'src/app/shared/stepper/stepper.component';
import { StepperStepDirective } from 'src/app/shared/stepper/stepper-step.directive';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';
import { buildResourceConfigUpdate, buildResourceConfiguration } from '../../../../../models/formFields/software-resource-fields';
import { SoftwareCharacteristic, SoftwareDeploymentDefinition, SoftwareSpecification } from '../../../../../models/software.model';
import { CharValueType } from '../../../../../shared/forms/characteristic-value-spec/characteristic-value-spec-form.component';

type ResourceSpecification_Create = components['schemas']['ResourceSpecification_Create'];
type ResourceSpecification_Update = components['schemas']['ResourceSpecification_Update'];
type CharacteristicValueSpecification = components['schemas']['ResourceSpecificationCharacteristicValue'];
type ResourceSpecificationCharacteristic = components['schemas']['ResourceSpecificationCharacteristic'];

const BASE_TEMPLATE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'SoftwareSpecification', label: 'Software Specification' },
  // Software Support Packages are now authored inline via the "Package Deployment" step
  // when creating a SoftwareSpecification, not as their own resource spec type.
  // { value: 'SoftwareSupportPackageSpecification', label: 'Software Support Package Specification' },
];

/** Not a TMF @type: it only switches the form to dataset mode (a dataset is a ResourceSpecification with category "dataset"). */
export const DATASET_TEMPLATE = 'dataset';
const DATASET_CATEGORY = 'dataset';

const DATASET_CREATE_FIELDS: FormField[] = [
  DATASET_VISIBILITY_FIELD,
  { type: 'attachment', name: 'file', label: 'DATASETS._file', required: true, deferUpload: true, accept: DATASET_ACCEPT_ATTR, maxFileSize: DATASET_MAX_SIZE_BYTES, hint: 'DATASETS._file_hint', dataCy: 'datasetFile' },
];

const DATASET_REPLACE_FIELDS: FormField[] = [
  { type: 'attachment', name: 'file', label: 'DATASETS._file', required: true, deferUpload: true, accept: DATASET_ACCEPT_ATTR, maxFileSize: DATASET_MAX_SIZE_BYTES, hint: 'DATASETS._file_hint', dataCy: 'datasetReplaceFile' },
];

const GENERAL_FORM_FIELDS_CREATE: FormField[] = [
  { type: 'string', name: 'name', label: 'CREATE_RES_SPEC._name', required: true, maxLength: 100, dataCy: 'resSpecName', placeholder: 'CREATE_RES_SPEC._name_placeholder' },
  { type: 'select', name: 'baseTemplate', label: 'CREATE_RES_SPEC._base_template', options: BASE_TEMPLATE_OPTIONS },
  { type: 'markdownTextarea', name: 'description', label: 'CREATE_RES_SPEC._description', placeholder: 'CREATE_RES_SPEC._description_placeholder' },
];

const GENERAL_FORM_FIELDS_UPDATE: FormField[] = [
  { type: 'string', name: 'name', label: 'UPDATE_RES_SPEC._name', required: true, maxLength: 100, dataCy: 'resSpecName', placeholder: 'CREATE_RES_SPEC._name_placeholder' },
  { type: 'select', name: 'baseTemplate', label: 'CREATE_RES_SPEC._base_template', readonly: true, options: BASE_TEMPLATE_OPTIONS },
  { type: 'markdownTextarea', name: 'description', label: 'UPDATE_RES_SPEC._description', placeholder: 'CREATE_RES_SPEC._description_placeholder' },
];

@Component({
  selector: 'app-resource-spec-form',
  standalone: true,
  imports: [
    TranslateModule,
    ButtonComponent,
    BadgeComponent,
    NotFoundStateComponent,
    StepperComponent,
    StepperStepDirective,
    DynamicFormComponent,
    CharacteristicsEditorComponent,
    PackageDeploymentComponent,
    ConfirmModalComponent,
    UnsavedChangesModalComponent,
    LoadingSpinnerComponent,
    DatasetUploadProgressComponent,
  ],
  templateUrl: './resource-spec-form.component.html',

})
export class ResourceSpecFormComponent implements OnInit, OnDestroy, LeaveConfirmable {
  /** True when embedded inside another flow (e.g. the product spec form's resource picker)
   * instead of routed to as its own page — swaps navigating away for emitting `created`. */
  @Input() embedded = false;
  @Output() created = new EventEmitter<any>();
  /** Only emitted in embedded mode, when the seller backs out instead of creating one. */
  @Output() cancelled = new EventEmitter<void>();

  mode: 'create' | 'update' = 'create';
  res?: any;

  get isUpdate(): boolean { return this.mode === 'update'; }
  get i18nPrefix(): string { return this.isUpdate ? 'UPDATE_RES_SPEC' : 'CREATE_RES_SPEC'; }
  /** Updating: the spec is still being fetched, so nothing is rendered yet (a create-shaped form would flash). */
  loadingRes = false;
  get notFound(): boolean { return this.isUpdate && !this.loadingRes && !this.res; }
  get isDraft(): boolean { return this.res?.lifecycleStatus === 'Active'; }

  partyId: any = '';

  resourceData: ResourceSpecification_Create | ResourceSpecification_Update | undefined;

  currentStep = 0;
  currentStepId = 'general'
  get generalFormFields(): FormField[] {
    const fields = this.isUpdate ? GENERAL_FORM_FIELDS_UPDATE : GENERAL_FORM_FIELDS_CREATE;
    const options = this.templateOptions;
    const key = `${this.isUpdate}|${options.length}`;
    if (this.generalFieldsKey !== key) {
      this.generalFieldsKey = key;
      this.generalFieldsCache = fields.map(field => field.name === 'baseTemplate' ? { ...field, options } as FormField : field);
    }
    return this.generalFieldsCache;
  }

  private generalFieldsKey = '';
  private generalFieldsCache: FormField[] = [];

  /** How the datasets of the seller are made: the ones that upload them (this form) are the ones without a contract management of
   * their own, the others serve them from their DSP (in the service form). Null until the proxy says. */
  datasetSource: DatasetSource | null = null;

  /** The dataset template is not offered when embedded: a product that is not a dataset one must not sell datasets. */
  private get templateOptions() {
    return (environment.DATASETS_ENABLED && !this.embedded && this.datasetSource === 'file') || this.datasetMode
      ? [...BASE_TEMPLATE_OPTIONS, { value: DATASET_TEMPLATE, label: 'Dataset' }]
      : BASE_TEMPLATE_OPTIONS;
  }

  get datasetMode(): boolean {
    if (this.isUpdate) return this.res?.category === DATASET_CATEGORY;
    return environment.DATASETS_ENABLED && this.generalForm.value.baseTemplate === DATASET_TEMPLATE;
  }

  //DATASET mode:
  readonly datasetCreateFields = DATASET_CREATE_FIELDS;
  readonly datasetReplaceFields = DATASET_REPLACE_FIELDS;
  datasetForm: FormGroup = buildFormGroup(DATASET_CREATE_FIELDS);
  replaceForm: FormGroup = buildFormGroup(DATASET_REPLACE_FIELDS);
  /** The file service's view of the dataset being updated (format, size, checksum...). */
  dataset?: Dataset;
  readonly upload: DatasetUploadTracker;

  /** Chosen on create; fixed once the dataset exists, so on update this is the stored one. */
  get datasetVisibilityValue(): DatasetVisibility {
    return this.isUpdate && this.dataset ? datasetVisibility(this.dataset) : this.datasetForm.value.visibility;
  }
  get datasetVisibilityHintKey(): string { return datasetVisibilityHint(this.datasetVisibilityValue); }
  get datasetVisibilityLabelKey(): string { return `DATASETS._visibility_${this.datasetVisibilityValue}`; }
  get datasetFormatLabel(): string { return this.dataset ? datasetFormat(this.dataset) : '-'; }
  get datasetSizeLabel(): string { return this.dataset ? datasetSize(this.dataset) : '-'; }
  get datasetFileName(): string { return this.dataset?.originalName || this.dataset?.filename || '-'; }

  get generalValid(): boolean {
    return this.generalForm.valid;
  }

  templateConfigFields: FormField[] = [];
  templateConfigColumnCount = 1;
  templateConfigForm: FormGroup = new FormGroup({});
  advancedConfigOpen = false;

  deploymentForm: FormGroup | null = null;
  deploymentInitialValue?: SoftwareDeploymentDefinition;
  private originalDeploymentChar: SoftwareCharacteristic | null = null;

  get requiresPackageDeployment(): boolean {
    const type = this.isUpdate ? this.res?.['@type'] : this.generalForm.value.baseTemplate;
    return type === 'SoftwareSpecification';
  }

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    baseTemplate: new FormControl(''),
    lifecycleStatus: new FormControl('Active'),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  prodChars: ResourceSpecificationCharacteristic[] = [];
  characteristicItems: CharacteristicItem[] = [];

  showPublishDraftModal = false;
  @ViewChild(UnsavedChangesModalComponent) private unsavedChangesModal?: UnsavedChangesModalComponent;
  /** Set once the spec is saved, so the navigation back to the list isn't asked about. */
  private leaveAllowed = false;
  /** Characteristics as loaded, to tell an edit apart from an untouched spec. */
  private loadedCharsSnapshot = '[]';
  showDeleteConfirm = false;
  showPublishConfirm = false;
  loading = false;

  allowedChars: CharValueType[] = ['string', 'number', 'range', 'object'];

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private resSpecService: ResourceSpecServiceService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private datasetService: DatasetService,
  ) {
    this.upload = new DatasetUploadTracker(notificationService);
    // Known before the first render, so an update never shows the create form while loading
    this.mode = this.route.snapshot.data?.['mode'] ?? 'create';
    this.loadingRes = this.isUpdate;
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
          if (!belongsToParty(this.res, this.partyId)) {
            this.notificationService.showInfo(this.translate.instant('UPDATE_RES_SPEC._wrong_org_notice'));
            this.leaveAllowed = true;
            this.goBack();
          }
        }
      });
  }

  async ngOnInit(): Promise<void> {
    this.initPartyInfo();
    this.mode = this.route.snapshot.data['mode'] ?? 'create';
    if (this.isUpdate) {
      const id = this.route.snapshot.paramMap.get('id')!;
      try {
        this.res = await this.fetchResSpecById(id);
        this.generalForm.get('baseTemplate')!.disable();
        this.populateResInfo();
        if (this.datasetMode) this.loadDataset(id);
        initFlowbite();
      } catch (error) {
        console.error('Error loading resource spec', error);
      } finally {
        this.loadingRes = false;
      }
    } else {
      if (environment.DATASETS_ENABLED && !this.embedded) {
        this.datasetService.source().pipe(takeUntil(this.destroy$)).subscribe({
          next: source => this.datasetSource = source,
          // Without knowing it the template is not offered: nothing breaks for the rest of the resources
          error: error => console.error('Could not know how the datasets are made', error),
        });
      }
      this.generalForm.get('baseTemplate')!.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((value: string | null) => {
          const configs = buildResourceConfiguration({ partyId: this.partyId, resSpecService: this.resSpecService });
          const config = value ? configs[value as ResourceSpecType] : undefined;
          this.templateConfigFields = config ? [...config.fields] : [];
          this.templateConfigForm = buildFormGroup(this.templateConfigFields);
        });
    }

    this.datasetForm.get('file')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.suggestNameFromFile(value?.file));
  }

  private static nameOf(file: File): string {
    return file.name.replace(/\.[^./\\]+$/, '').slice(0, 100);
  }

  /** An empty name is read from the file as soon as it is chosen; one the seller typed in General is kept. */
  private suggestNameFromFile(file?: File): void {
    const name = this.generalForm.controls['name'];
    if (!file || name.dirty) return;
    name.setValue(ResourceSpecFormComponent.nameOf(file));
  }

  private loadDataset(id: string): void {
    this.datasetService.get(id).subscribe({
      next: dataset => this.setDataset(dataset),
      error: err => {
        const { key, message } = DatasetService.toError(err);
        this.notificationService.showError(key, { details: message });
      },
    });
  }

  ngOnDestroy(): void {
    this.upload.cancel();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async fetchResSpecById(id: string): Promise<any> {
    const primaryType: ResourceSpecType = id.startsWith('urn:ngsi-ld:software-') ? 'SoftwareSpecification' : 'ResourceSpecification';
    const fallbackType: ResourceSpecType = primaryType === 'ResourceSpecification' ? 'SoftwareSpecification' : 'ResourceSpecification';
    try {
      return await this.resSpecService.getResSpecById(id, primaryType);
    } catch {
      return await this.resSpecService.getResSpecById(id, fallbackType);
    }
  }

  private initPartyInfo(): void {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((element: { id: any }) => element.id == aux.logged_as);
        if (!loggedOrg) return;
        this.partyId = loggedOrg.partyId;
      }
    }
  }

  private populateResInfo(): void {
    const type = (this.res['@baseType'] ? this.res['@type'] : '') as ResourceSpecType;
    this.generalForm.controls['name'].setValue(this.res.name);
    this.generalForm.controls['description'].setValue(this.res.description);
    this.generalForm.controls['baseTemplate'].setValue(this.datasetMode ? DATASET_TEMPLATE : this.res['@baseType'] ? this.res['@type'] : '');
    this.generalForm.controls['lifecycleStatus'].setValue(this.res.lifecycleStatus);
    this.prodChars = this.res.resourceSpecCharacteristic ?? [];
    this.characteristicItems = this.buildCharacteristicItems();
    this.loadedCharsSnapshot = JSON.stringify(this.prodChars ?? []);

    const configs = type ? buildResourceConfigUpdate({ partyId: this.partyId, resSpecService: this.resSpecService }) : undefined;
    const templateConfig = configs && type ? configs[type] : undefined;
    this.templateConfigFields = templateConfig ? templateConfig.fields : [];
    this.templateConfigColumnCount = templateConfig ? templateConfig.columnCount : 1;
    this.templateConfigForm = buildFormGroup(this.templateConfigFields);
    this.templateConfigForm.patchValue(this.res);

    if (type === 'SoftwareSpecification') {
      const packageId = (this.res as SoftwareSpecification).softwareSupportPackage?.id;
      if (packageId) {
        this.resSpecService.getSoftwareSupportPackage(packageId)
          .subscribe(pkg => {
            const pkgChars = (pkg.resourceCharacteristic ?? []) as SoftwareCharacteristic[];
            const found = pkgChars.find(c => c.valueType?.toLowerCase() === 'deployment');
            // The broker may round-trip the value as a one-element array.
            const raw = (found as any)?.value;
            const value = Array.isArray(raw) ? raw[0] : raw;
            this.originalDeploymentChar = found ? { ...found, value } as SoftwareCharacteristic : null;
            this.deploymentInitialValue = value as SoftwareDeploymentDefinition | undefined;
          });
      }
    }
  }

  get leaveNeedsConfirmation(): boolean {
    return !(this.embedded || this.leaveAllowed || !this.hasUnsavedChanges());
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.leaveNeedsConfirmation) return true;
    return this.unsavedChangesModal?.confirm(() => {
      if (this.isUpdate) {
        this.save();
      } else if (this.datasetMode) {
        this.createDataset();
      } else {
        this.prepareData();
        this.saveDraft();
      }
    }) ?? true;
  }

  hasUnsavedChanges(): boolean {
    if (this.datasetMode && !this.isUpdate) return this.generalForm.dirty || this.datasetForm.dirty || !!this.datasetForm.value.file;
    if (this.isUpdate) {
      return this.canReplace || this.generalForm.dirty || this.templateConfigForm.dirty || !!this.deploymentForm?.dirty
      || JSON.stringify(this.prodChars ?? []) !== this.loadedCharsSnapshot;
    }
    return this.generalForm.dirty || this.templateConfigForm.dirty || !!this.deploymentForm?.dirty
      || this.prodChars.length > 0;
  }

  get canSaveDraft(): boolean {
    return !this.loading && this.generalValid && !this.datasetMode
      && (!this.requiresPackageDeployment || !!this.deploymentForm?.valid)
      && (this.templateConfigFields.length === 0 || this.templateConfigForm.valid);
  }

  goBack(): void {
    if (this.embedded) {
      this.cancelled.emit();
      return;
    }
    this.router.navigate([SellerOfferingsPaths.resourceSpecs.list()]);
  }

  private buildCharacteristicItems(): CharacteristicItem[] {
    return this.prodChars.map(c => ({
      id: c.id,
      name: c.name ?? '',
      description: c.description ?? '',
      configurable: c.configurable ?? false,
      valueType: c.valueType as CharValueType,
      values: (c.resourceSpecCharacteristicValue ?? []) as CharacteristicValueSpecification[],
    }));
  }

  onCharacteristicsChange(items: CharacteristicItem[]): void {
    this.characteristicItems = items;
    this.prodChars = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      configurable: item.configurable,
      valueType: item.valueType,
      resourceSpecCharacteristicValue: item.values as CharacteristicValueSpecification[],
    }));
  }

  onDeploymentFormReady(form: FormGroup): void {
    this.deploymentForm = form;
    // The step is destroyed when the user moves away, so keep the latest value to re-seed the next instance.
    form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.deploymentForm === form) this.deploymentInitialValue = structuredClone(form.getRawValue());
    });
    if (form.pristine && this.deploymentInitialValue && !this.isUpdate) form.markAsDirty();
  }

  private getArtifactType(deployment: SoftwareDeploymentDefinition): string {
    switch (deployment.type) {
      case 'helm':
        return 'HelmChart';
      case 'docker':
        return deployment.properties?.composeFile ? 'DockerCompose' : 'DockerImage';
    }
  }

  /**
   * Drops the release identity from a stored deploymentDefinition. Packages published before the
   * identity moved to the InstalledSoftware still carry `releaseName` and `namespace` under
   * `properties`, and the API now rejects a deploymentDefinition that declares either. The original
   * characteristic is left untouched — only the copy sent to the API is migrated.
   */
  private stripReleaseIdentity(char: SoftwareCharacteristic): any {
    const definition = (char as any).value as SoftwareDeploymentDefinition | undefined;
    const properties = definition?.properties as Record<string, any> | undefined;
    if (!properties || !('releaseName' in properties || 'namespace' in properties)) return char;

    const { releaseName, namespace, ...rest } = properties;
    return {
      ...(char as any),
      value: { ...definition, properties: rest },
      // The stored pin still points at the gist revision that required releaseName; the migrated
      // value only validates against the current one.
      '@schemaLocation': environment.DEPLOYMENT_SCHEMA_LOCATION,
    };
  }

  /** "Package Deployment" step characteristics — deploymentDefinition + artifactType.
   * These go under `resourceCharacteristic` (the Resource-instance field), not the
   * spec's own `resourceSpecCharacteristic`: the proxy moves them onto the software
   * support package resource automatically, for both create and update. */
  private buildDeploymentCharacteristics(): any[] {
    if (!this.requiresPackageDeployment) return [];

    const chars: any[] = [];
    let deployValue: SoftwareDeploymentDefinition | undefined;

    if (this.deploymentForm) {
      // The package describes WHAT is deployed, never WHERE or under WHICH NAME: the release identity
      // (deploymentName, namespace) is chosen per deployment and lives on the InstalledSoftware.
      deployValue = this.deploymentForm.value;
      chars.push({
        name: 'deploymentDefinition',
        valueType: 'deployment',
        value: deployValue,
        '@schemaLocation': environment.DEPLOYMENT_SCHEMA_LOCATION,
      });
    } else if (this.originalDeploymentChar) {
      // The deployment step renders lazily, so editing a spec without opening it leaves no form to
      // read. Resend what was stored — migrated, or the save fails on a field the user never saw.
      const migrated = this.stripReleaseIdentity(this.originalDeploymentChar);
      deployValue = migrated.value as SoftwareDeploymentDefinition;
      chars.push(migrated);
    }

    if (deployValue) {
      chars.push({
        name: 'artifactType',
        valueType: 'string',
        value: this.getArtifactType(deployValue),
      });
    }

    return chars;
  }

  private prepareData(): void {
    if (this.datasetMode || !this.generalForm.value.name) return;

    const deploymentChars = this.buildDeploymentCharacteristics();

    this.resourceData = Object.assign({}, {
      name: this.generalForm.value.name,
      description: this.generalForm.value.description ?? '',
      lifecycleStatus: this.generalForm.value.lifecycleStatus ?? 'Active',
      resourceSpecCharacteristic: this.prodChars,
      ...(deploymentChars.length > 0 && { resourceCharacteristic: deploymentChars }),
      ...(!this.isUpdate && {
        relatedParty: [{ id: this.partyId, role: environment.SELLER_ROLE, '@referredType': '' }],
      }),
    }, this.templateConfigForm.value);

    const type = this.isUpdate
      ? this.res?.['@type']
      : this.generalForm.value.baseTemplate;

    const baseType = this.isUpdate
      ? this.res?.['@baseType']
      : type ? 'ResourceSpecification' : undefined;

    if (type) (this.resourceData as any)['@type'] = type;
    if (baseType) (this.resourceData as any)['@baseType'] = baseType;

    // Add targetResourceSchema if create and SoftwareSpecification
    if (type === 'SoftwareSpecification' && !this.isUpdate) {
      (this.resourceData as ResourceSpecification_Create).targetResourceSchema = {
        '@type': 'InstalledSoftware',
        '@schemaLocation': ''
      };
    }
  }

  save(): void {
    if (this.datasetMode) {
      this.isUpdate ? this.updateDataset() : this.createDataset();
      return;
    }
    this.prepareData();
    if (this.isUpdate) {
      this.loading = true;
      this.resSpecService.updateResSpec(this.resourceData as ResourceSpecification_Update, this.res.id, this.res?.['@type'] as ResourceSpecType)
        .subscribe({
          next: () => {
            this.loading = false;
            this.notificationService.showSuccess('CREATE_RES_SPEC._update_success');
            this.leaveAllowed = true;
            this.goBack();
          },
          error: e => this.handleError(e),
        });
    } else {
      this.showPublishDraftModal = true;
    }
  }

  /** A dataset is created together with its file and is always Launched: there is no draft to choose. */
  private createDataset(): void {
    if (this.datasetForm.invalid || this.upload.uploading) return;
    const { file, visibility } = this.datasetForm.value;
    const name = (this.generalForm.value.name ?? '').trim() || ResourceSpecFormComponent.nameOf(file.file);

    this.upload.start(this.datasetService.create({ name, description: this.generalForm.value.description ?? '', visibility }, file.file), dataset => {
      this.notificationService.showSuccess('DATASETS._upload_success');
      if (this.embedded) {
        this.created.emit(dataset);
      } else {
        this.leaveAllowed = true;
        this.goBack();
      }
    });
  }

  /** A newly picked file is uploaded first and the name and description are patched after it: if the file
   * is refused nothing else is saved. */
  private updateDataset(): void {
    if (this.upload.uploading) return;
    if (this.canReplace) {
      this.replaceDatasetFile(() => this.patchDataset());
    } else {
      this.patchDataset();
    }
  }

  /** Only the name and description can be patched: anything else is refused for a dataset. */
  private patchDataset(): void {
    this.loading = true;
    const body = { name: this.generalForm.value.name!.trim(), description: this.generalForm.value.description ?? '' };
    this.resSpecService.updateResSpec(body as ResourceSpecification_Update, this.res.id)
      .subscribe({
        next: () => {
          this.loading = false;
          this.notificationService.showSuccess('CREATE_RES_SPEC._update_success');
          this.leaveAllowed = true;
          this.goBack();
        },
        error: e => this.handleError(e),
      });
  }

  /** The id and the buyers' access stay, the content is the new one. */
  private replaceDatasetFile(onReplaced: () => void): void {
    this.upload.start(this.datasetService.replaceFile(this.res.id, this.replaceForm.value.file.file), dataset => {
      this.setDataset(dataset);
      this.notificationService.showSuccess('DATASETS._replace_success');
      onReplaced();
    });
  }

  /** The stored file is shown in the drop zone like an uploaded one: removing it frees the zone for a new file. */
  private setDataset(dataset: Dataset): void {
    this.dataset = dataset;
    this.replaceForm.get('file')!.reset({
      name: this.datasetFileName,
      url: '',
      attachmentType: dataset.mimeType ?? '',
    });
  }

  /** Only a newly picked file (it carries the File itself) can be sent: the stored one is just displayed. */
  get canReplace(): boolean {
    return !!this.replaceForm.value.file?.file;
  }

  private handleDatasetError(err: unknown): void {
    this.upload.fail(err);
  }

  saveDraft(): void {
    this.createResource('Active');
  }

  publish(): void {
    this.createResource('Launched');
  }

  private createResource(lifecycleStatus: 'Active' | 'Launched'): void {
    if (!this.resourceData) return;
    (this.resourceData as any).lifecycleStatus = lifecycleStatus;
    this.loading = true;
    this.resSpecService.postResSpec(this.resourceData as ResourceSpecification_Create, (this.resourceData as any)?.['@type'] as ResourceSpecType)
      .subscribe({
        next: created => {
          this.loading = false;
          this.showPublishDraftModal = false;
          this.notificationService.showSuccess('CREATE_RES_SPEC._create_success');
          if (this.embedded) {
            this.created.emit(created);
          } else {
            this.leaveAllowed = true;
            this.goBack();
          }
        },
        error: e => this.handleError(e),
      });
  }

  private handleError(error: any): void {
    console.error(`There was an error while ${this.isUpdate ? 'updating' : 'creating'} the resource specification!`, error);
    const key = this.isUpdate ? 'CREATE_RES_SPEC._update_error' : 'CREATE_RES_SPEC._create_error';
    this.notificationService.showError(key, { details: error?.error?.error || error?.error?.message || error?.message });
    this.loading = false;
    this.showPublishDraftModal = false;
  }

  statusBadgeVariant(status: string): BadgeStatus {
    return lifecycleStatusBadgeVariant(status);
  }

  statusLabel(status: string): string {
    return lifecycleStatusLabel(status);
  }

  onDeleteResolved(confirmed: boolean): void {
    this.showDeleteConfirm = false;
    if (confirmed) {
      this.deleteResource();
    }
  }

  onPublishResolved(confirmed: boolean): void {
    this.showPublishConfirm = false;
    if (confirmed) {
      this.publishResource();
    }
  }

  private deleteResource(): void {
    this.loading = true;
    if (this.datasetMode) {
      this.datasetService.remove(this.res.id).subscribe({
        next: () => {
          this.loading = false;
          this.notificationService.showSuccess('UPDATE_RES_SPEC._delete_success');
          this.leaveAllowed = true;
          this.goBack();
        },
        error: err => {
          this.loading = false;
          this.handleDatasetError(err);
        },
      });
      return;
    }
    this.resSpecService.deleteResSpec(this.res.id, this.res?.['@type'] as ResourceSpecType).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('UPDATE_RES_SPEC._delete_success');
        this.leaveAllowed = true;
        this.goBack();
      },
      error: (error: any) => {
        console.error('There was an error while deleting the resource specification!', error);
        this.loading = false;
        this.notificationService.showError('UPDATE_RES_SPEC._delete_error', { details: error?.error?.error || error?.error?.message || error?.message });
      },
    });
  }

  private publishResource(): void {
    this.loading = true;
    this.resSpecService.updateResSpec({ lifecycleStatus: 'Launched' }, this.res.id, this.res?.['@type'] as ResourceSpecType).subscribe({
      next: () => {
        this.loading = false;
        this.res.lifecycleStatus = 'Launched';
        this.generalForm.patchValue({ lifecycleStatus: 'Launched' });
        this.notificationService.showSuccess('UPDATE_RES_SPEC._publish_success');
      },
      error: (error: any) => {
        console.error('There was an error while publishing the resource specification!', error);
        this.loading = false;
        this.notificationService.showError('UPDATE_RES_SPEC._publish_error', { details: error?.error?.error || error?.error?.message || error?.message });
      },
    });
  }

  get canAdvance(): boolean {
    if (this.currentStepId === 'general') return this.generalValid;
    if (this.currentStepId === 'dataset') return this.isUpdate || this.datasetForm.valid;
    if (this.currentStepId === 'packageDeployment') {
      return !this.requiresPackageDeployment || (this.deploymentForm?.valid ?? false);
    }
    if (this.currentStepId === 'configuration') return this.templateConfigFields.length === 0 || this.templateConfigForm.valid;
    return true;
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStep = event.step;
    this.currentStepId = event.stepId ?? 'general';
    if (this.currentStepId === 'characteristics' && this.isUpdate) setTimeout(() => initFlowbite(), 100);
    if (event.isLastStep) this.prepareData();
  }
}
