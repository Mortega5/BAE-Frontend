import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpEventType } from '@angular/common/http';
import { lastValueFrom, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { Dataset, DatasetService, DatasetSource, DatasetVisibility, isDatasetServiceSpec } from 'src/app/services/dataset.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { DATASET_REPLACE_FIELDS, DATASET_URL_FIELD, DatasetFilePanelComponent, datasetReplacement, showStoredDataset } from '../../seller-datasets/dataset-file-panel/dataset-file-panel.component';
import { DATASET_SOLD_VISIBILITY_FIELD, datasetVisibilityHint } from '../../seller-datasets/dataset-visibility';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { belongsToParty } from 'src/app/shared/session-ownership.util';
import { BadgeComponent, BadgeStatus, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { UnsavedChangesModalComponent } from 'src/app/shared/unsaved-changes-modal/unsaved-changes-modal.component';
import { LeaveConfirmable } from 'src/app/guard/unsaved-changes.guard';
import { NotFoundStateComponent } from 'src/app/shared/not-found-state/not-found-state.component';
import { CharValueType } from 'src/app/shared/forms/characteristic-value-spec/characteristic-value-spec-form.component';
import { CharacteristicItem, CharacteristicsEditorComponent } from 'src/app/shared/forms/characteristics-editor/characteristics-editor.component';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { StepperComponent, StepChangedEvent } from '../../../../../shared/stepper/stepper.component';
import { StepperStepDirective } from '../../../../../shared/stepper/stepper-step.directive';

import { components } from 'src/app/models/service-catalog';
import { environment } from 'src/environments/environment';

type ServiceSpecification_Create = components['schemas']['ServiceSpecification_Create'];
type ServiceSpecification_Update = components['schemas']['ServiceSpecification_Update'];
type CharacteristicValueSpecification = components['schemas']['CharacteristicValueSpecification'];
type ServiceSpecificationCharacteristic = components['schemas']['CharacteristicSpecification'];

/** Not a TMF @type: it only switches the form to dataset mode (a dataset served by the seller is a service specification with the address of the data). */
export const DATASET_TEMPLATE = 'dataset';
const SERVICE_TEMPLATE = '';

const TEMPLATE_OPTIONS = [
  { value: SERVICE_TEMPLATE, label: 'CREATE_SERV_SPEC._template_none' },
  { value: DATASET_TEMPLATE, label: 'Dataset' },
];

const GENERAL_FORM_FIELDS_CREATE: FormField[] = [
  { type: 'string', name: 'name', label: 'CREATE_SERV_SPEC._name', required: true, maxLength: 100, dataCy: 'servSpecName', placeholder: 'CREATE_SERV_SPEC._name_placeholder' },
  { type: 'select', name: 'baseTemplate', label: 'CREATE_SERV_SPEC._base_template', options: TEMPLATE_OPTIONS, dataCy: 'servSpecTemplate' },
  { type: 'markdownTextarea', name: 'description', label: 'CREATE_SERV_SPEC._description', placeholder: 'CREATE_SERV_SPEC._description_placeholder' },
];

const GENERAL_FORM_FIELDS_UPDATE: FormField[] = [
  { type: 'string', name: 'name', label: 'UPDATE_SERV_SPEC._name', required: true, maxLength: 100, dataCy: 'servSpecName', placeholder: 'CREATE_SERV_SPEC._name_placeholder' },
  { type: 'select', name: 'baseTemplate', label: 'CREATE_SERV_SPEC._base_template', options: TEMPLATE_OPTIONS, readonly: true, dataCy: 'servSpecTemplate' },
  { type: 'markdownTextarea', name: 'description', label: 'UPDATE_SERV_SPEC._description', placeholder: 'CREATE_SERV_SPEC._description_placeholder' },
];

/** What a dataset served by the seller asks: who can read it and where the data is. */
const DATASET_FIELDS: FormField[] = [DATASET_SOLD_VISIBILITY_FIELD, DATASET_URL_FIELD];

@Component({
  selector: 'app-service-spec-form',
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
    DatasetFilePanelComponent,
    ConfirmModalComponent,
    UnsavedChangesModalComponent,
  ],
  templateUrl: './service-spec-form.component.html',
})
export class ServiceSpecFormComponent implements OnInit, OnDestroy, LeaveConfirmable {
  /** True when embedded inside another flow (e.g. the product spec form's service picker)
   * instead of routed to as its own page — swaps navigating away for emitting `created`. */
  @Input() embedded = false;
  @Output() created = new EventEmitter<any>();
  /** Only emitted in embedded mode, when the seller backs out instead of creating one. */
  @Output() cancelled = new EventEmitter<void>();

  mode: 'create' | 'update' = 'create';
  serv?: any;

  get isUpdate(): boolean { return this.mode === 'update'; }
  get i18nPrefix(): string { return this.isUpdate ? 'UPDATE_SERV_SPEC' : 'CREATE_SERV_SPEC'; }
  get notFound(): boolean { return this.isUpdate && !this.loading && !this.serv; }
  get isDraft(): boolean { return this.serv?.lifecycleStatus === 'Active'; }

  /** The template is not offered when embedded, nor when datasets are off: a product that is not a dataset one must not sell datasets. */
  private get templateAvailable(): boolean {
    return (environment.DATASETS_ENABLED && !this.embedded && this.datasetSource === 'url') || this.datasetMode;
  }

  /** How the datasets of the seller are made: a dataset served by the seller (this form) is only for the ones that serve it from
   * their own DSP, the others upload it (in the resource form). Null until the proxy says. */
  datasetSource: DatasetSource | null = null;

  get generalFormFields(): FormField[] {
    const fields = this.isUpdate ? GENERAL_FORM_FIELDS_UPDATE : GENERAL_FORM_FIELDS_CREATE;
    const key = `${this.isUpdate}|${this.templateAvailable}`;  // the template is only there for the sellers that serve their datasets
    if (this.generalFieldsKey !== key) {
      this.generalFieldsKey = key;
      this.generalFieldsCache = this.templateAvailable ? fields : fields.filter(field => field.name !== 'baseTemplate');
    }
    return this.generalFieldsCache;
  }

  private generalFieldsKey = '';
  private generalFieldsCache: FormField[] = [];

  /** A dataset served by the seller: chosen as the template on create, and fixed once it exists, so on update it is what the
   * service specification is. */
  get datasetMode(): boolean {
    if (this.isUpdate) return isDatasetServiceSpec(this.serv);
    return environment.DATASETS_ENABLED && this.generalForm.value.baseTemplate === DATASET_TEMPLATE;
  }

  //DATASET mode:
  readonly datasetFields = DATASET_FIELDS;
  readonly datasetForm: FormGroup = buildFormGroup(DATASET_FIELDS);
  /** The address of the dataset being updated, to change it. */
  readonly replaceForm: FormGroup = buildFormGroup(DATASET_REPLACE_FIELDS);
  /** The dataset as the dataset API sees it (address, visibility), when updating one. */
  dataset?: Dataset;

  get datasetVisibilityHint(): string {
    return datasetVisibilityHint(this.datasetForm.value.visibility as DatasetVisibility);
  }

  /** A newly typed address (the stored one is just shown). */
  private get urlReplacement() {
    return datasetReplacement(this.replaceForm, this.dataset);
  }

  partyId: any = '';
  serviceData: ServiceSpecification_Create | ServiceSpecification_Update | undefined;
  currentStepId = 'general';
  loading = false;

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    lifecycleStatus: new FormControl('Active'),
    baseTemplate: new FormControl(SERVICE_TEMPLATE),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  prodChars: ServiceSpecificationCharacteristic[] = [];
  characteristicItems: CharacteristicItem[] = [];
  allowedChars: CharValueType[] = ['string', 'number', 'range', 'object'];

  showPublishDraftModal = false;
  @ViewChild(UnsavedChangesModalComponent) private unsavedChangesModal?: UnsavedChangesModalComponent;
  /** Set once the spec is saved, so the navigation back to the list isn't asked about. */
  private leaveAllowed = false;
  /** Characteristics as loaded, to tell an edit apart from an untouched spec. */
  private loadedCharsSnapshot = '[]';
  showDeleteConfirm = false;
  showPublishConfirm = false;

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private servSpecService: ServiceSpecServiceService,
    private datasetService: DatasetService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
    private translate: TranslateService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
          if (!belongsToParty(this.serv, this.partyId)) {
            this.notificationService.showInfo(this.translate.instant('UPDATE_SERV_SPEC._wrong_org_notice'));
            this.leaveAllowed = true;
            this.goBack();
          }
        }
      });
  }

  async ngOnInit(): Promise<void> {
    this.mode = this.route.snapshot.data['mode'] ?? 'create';
    this.initPartyInfo();
    if (!this.isUpdate && environment.DATASETS_ENABLED && !this.embedded) {
      this.datasetService.source().pipe(takeUntil(this.destroy$)).subscribe({
        next: source => this.datasetSource = source,
        // Without knowing it the template is not offered: nothing breaks for the rest of the services
        error: error => console.error('Could not know how the datasets are made', error),
      });
    }
    if (this.isUpdate) {
      this.loading = true;
      const id = this.route.snapshot.paramMap.get('id')!;
      try {
        this.serv = await this.servSpecService.getServSpecById(id);
        this.populateServInfo();
        if (this.datasetMode) await this.loadDataset(id);
      } catch (error) {
        console.error('Error loading service spec', error);
      } finally {
        this.loading = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canAdvance(): boolean {
    if (this.currentStepId === 'general') return this.generalForm?.valid ?? false;
    if (this.currentStepId === 'dataset' && !this.isUpdate) return this.datasetForm.valid;
    return true;
  }

  /** What is needed to save: on create a dataset asks for its visibility and address, which are in a step of their own. */
  get submittable(): boolean {
    return this.generalForm.valid && (!this.datasetMode || this.isUpdate || this.datasetForm.valid);
  }

  private initPartyInfo(): void {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as === aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((element: { id: any }) => element.id === aux.logged_as);
        if (!loggedOrg) return;
        this.partyId = loggedOrg.partyId;
      }
    }
  }

  private populateServInfo(): void {
    this.generalForm.patchValue({
      name: this.serv.name,
      lifecycleStatus: this.serv.lifecycleStatus,
      description: this.serv.description,
    });
    this.generalForm.patchValue({ baseTemplate: this.datasetMode ? DATASET_TEMPLATE : SERVICE_TEMPLATE });
    this.prodChars = this.serv.specCharacteristic;
    this.characteristicItems = this.buildCharacteristicItems();
    this.loadedCharsSnapshot = JSON.stringify(this.prodChars ?? []);
  }

  /** The dataset API knows its address and visibility; the address is shown in the form to change it. */
  private async loadDataset(id: string): Promise<void> {
    try {
      this.dataset = await lastValueFrom(this.datasetService.get(id));
      showStoredDataset(this.replaceForm, this.dataset);
    } catch (error) {
      const { key, message } = DatasetService.toError(error);
      this.notificationService.showError(key, { details: message });
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
      } else {
        this.setServiceData();
        this.saveDraft();
      }
    }) ?? true;
  }

  hasUnsavedChanges(): boolean {
    if (this.datasetMode) {
      return this.generalForm.dirty || (this.isUpdate ? !!this.urlReplacement : this.datasetForm.dirty);
    }
    if (this.isUpdate) {
      return this.generalForm.dirty || JSON.stringify(this.prodChars ?? []) !== this.loadedCharsSnapshot;
    }
    return this.generalForm.dirty || this.prodChars.length > 0;
  }

  get canSaveDraft(): boolean {
    return !this.loading && this.generalForm.valid;
  }

  goBack(): void {
    if (this.embedded) {
      this.cancelled.emit();
      return;
    }
    this.router.navigate([SellerOfferingsPaths.serviceSpecs.list()]);
  }

  private buildCharacteristicItems(): CharacteristicItem[] {
    return this.prodChars.map(c => ({
      id: c.id,
      name: c.name ?? '',
      description: c.description ?? '',
      configurable: c.configurable ?? false,
      valueType: c.valueType as CharValueType,
      values: (c.characteristicValueSpecification ?? []) as CharacteristicValueSpecification[],
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
      characteristicValueSpecification: item.values as CharacteristicValueSpecification[],
    }));
  }

  private setServiceData(): void {
    if (!this.generalForm.value.name) return;
    this.serviceData = {
      name: this.generalForm.value.name,
      description: this.generalForm.value.description ?? '',
      lifecycleStatus: this.generalForm.value.lifecycleStatus ?? 'Active',
      specCharacteristic: this.prodChars,
      ...(!this.isUpdate && {
        relatedParty: [{ id: this.partyId, role: environment.SELLER_ROLE, '@referredType': '' }],
      }),
    };
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId!;
    if (event.isLastStep) this.setServiceData();
  }

  save(): void {
    if (this.datasetMode) {
      this.isUpdate ? this.updateDataset() : this.createDataset();
      return;
    }
    this.setServiceData();
    if (this.isUpdate) {
      this.loading = true;
      this.servSpecService.updateServSpec(this.serviceData as ServiceSpecification_Update, this.serv.id).subscribe({
        next: () => {
          this.loading = false;
          this.notificationService.showSuccess('CREATE_SERV_SPEC._update_success');
          this.leaveAllowed = true;
          this.goBack();
        },
        error: e => this.handleError(e),
      });
    } else {
      this.showPublishDraftModal = true;
    }
  }

  /** A dataset is made through the dataset API, which writes the service specification: always Launched, with no draft to choose. */
  private createDataset(): void {
    if (!this.submittable || this.loading) return;
    const { visibility, url } = this.datasetForm.value;
    this.loading = true;
    this.datasetService.create({
      name: (this.generalForm.value.name ?? '').trim(),
      description: this.generalForm.value.description ?? '',
      visibility,
      url: (url ?? '').trim(),
    }).subscribe({
      next: event => {
        if (event.type !== HttpEventType.Response) return;
        this.loading = false;
        this.notificationService.showSuccess('CREATE_SERV_SPEC._create_success');
        if (this.embedded) {
          this.created.emit(event.body);
        } else {
          this.leaveAllowed = true;
          this.goBack();
        }
      },
      error: e => this.handleDatasetError(e),
    });
  }

  /** The address goes first, through the dataset API that checks it: if it is refused nothing else is saved. Then the name and
   * description, the only things the service specification is patched with (its characteristics are the dataset's). */
  private updateDataset(): void {
    if (this.loading) return;
    this.loading = true;
    const replacement = this.urlReplacement;
    const body = { name: (this.generalForm.value.name ?? '').trim(), description: this.generalForm.value.description ?? '' };
    const patchNames = () => this.servSpecService.updateServSpec(body as ServiceSpecification_Update, this.serv.id);
    (replacement?.url ? this.datasetService.updateUrl(this.serv.id, replacement.url).pipe(switchMap(() => patchNames())) : patchNames()).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('CREATE_SERV_SPEC._update_success');
        this.leaveAllowed = true;
        this.goBack();
      },
      error: e => this.handleDatasetError(e),
    });
  }

  private handleDatasetError(error: any): void {
    console.error('There was an error while saving the dataset!', error);
    const { key, message } = DatasetService.toError(error);
    this.notificationService.showError(key, { details: message });
    this.loading = false;
  }

  saveDraft(): void {
    this.createService('Active');
  }

  publish(): void {
    this.createService('Launched');
  }

  private createService(lifecycleStatus: 'Active' | 'Launched'): void {
    if (!this.serviceData) return;
    (this.serviceData as any).lifecycleStatus = lifecycleStatus;
    this.loading = true;
    this.servSpecService.postServSpec(this.serviceData as ServiceSpecification_Create).subscribe({
      next: created => {
        this.loading = false;
        this.showPublishDraftModal = false;
        this.notificationService.showSuccess('CREATE_SERV_SPEC._create_success');
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
    console.error(`There was an error while ${this.isUpdate ? 'updating' : 'creating'} the service specification!`, error);
    const key = this.isUpdate ? 'CREATE_SERV_SPEC._update_error' : 'CREATE_SERV_SPEC._create_error';
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
      this.deleteService();
    }
  }

  onPublishResolved(confirmed: boolean): void {
    this.showPublishConfirm = false;
    if (confirmed) {
      this.publishService();
    }
  }

  private deleteService(): void {
    this.loading = true;
    // A dataset is deleted through the dataset API, which refuses it while a product still sells it
    (this.datasetMode ? this.datasetService.remove(this.serv.id) : this.servSpecService.deleteServSpec(this.serv.id)).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('UPDATE_SERV_SPEC._delete_success');
        this.leaveAllowed = true;
        this.goBack();
      },
      error: (error: any) => {
        console.error('There was an error while deleting the service specification!', error);
        this.loading = false;
        this.notificationService.showError('UPDATE_SERV_SPEC._delete_error', { details: error?.error?.error || error?.error?.message || error?.message });
      },
    });
  }

  private publishService(): void {
    this.loading = true;
    this.servSpecService.updateServSpec({ lifecycleStatus: 'Launched' }, this.serv.id).subscribe({
      next: () => {
        this.loading = false;
        this.serv.lifecycleStatus = 'Launched';
        this.generalForm.patchValue({ lifecycleStatus: 'Launched' });
        this.notificationService.showSuccess('UPDATE_SERV_SPEC._publish_success');
      },
      error: (error: any) => {
        console.error('There was an error while publishing the service specification!', error);
        this.loading = false;
        this.notificationService.showError('UPDATE_SERV_SPEC._publish_error', { details: error?.error?.error || error?.error?.message || error?.message });
      },
    });
  }

}
