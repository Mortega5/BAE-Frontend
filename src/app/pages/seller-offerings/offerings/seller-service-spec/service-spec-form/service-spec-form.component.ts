import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
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

const GENERAL_FORM_FIELDS_CREATE: FormField[] = [
  { type: 'string', name: 'name', label: 'CREATE_SERV_SPEC._name', required: true, maxLength: 100, dataCy: 'servSpecName', placeholder: 'CREATE_SERV_SPEC._name_placeholder' },
  { type: 'markdownTextarea', name: 'description', label: 'CREATE_SERV_SPEC._description', placeholder: 'CREATE_SERV_SPEC._description_placeholder' },
];

const GENERAL_FORM_FIELDS_UPDATE: FormField[] = [
  { type: 'string', name: 'name', label: 'UPDATE_SERV_SPEC._name', required: true, maxLength: 100, dataCy: 'servSpecName', placeholder: 'CREATE_SERV_SPEC._name_placeholder' },
  { type: 'markdownTextarea', name: 'description', label: 'UPDATE_SERV_SPEC._description', placeholder: 'CREATE_SERV_SPEC._description_placeholder' },
];

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

  get generalFormFields(): FormField[] {
    return this.isUpdate ? GENERAL_FORM_FIELDS_UPDATE : GENERAL_FORM_FIELDS_CREATE;
  }

  partyId: any = '';
  serviceData: ServiceSpecification_Create | ServiceSpecification_Update | undefined;
  currentStepId = 'general';
  loading = false;

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    lifecycleStatus: new FormControl('Active'),
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
    if (this.isUpdate) {
      this.loading = true;
      const id = this.route.snapshot.paramMap.get('id')!;
      try {
        this.serv = await this.servSpecService.getServSpecById(id);
        this.populateServInfo();
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
    return true;
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
    this.prodChars = this.serv.specCharacteristic;
    this.characteristicItems = this.buildCharacteristicItems();
    this.loadedCharsSnapshot = JSON.stringify(this.prodChars ?? []);
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
    this.servSpecService.deleteServSpec(this.serv.id).subscribe({
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
