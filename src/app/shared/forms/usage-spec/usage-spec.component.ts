import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from "@angular/forms";
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from "src/app/services/event-message.service";
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { BadgeComponent, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { UnsavedChangesModalComponent } from 'src/app/shared/unsaved-changes-modal/unsaved-changes-modal.component';
import { LeaveConfirmable } from 'src/app/guard/unsaved-changes.guard';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { StepperStepDirective } from 'src/app/shared/stepper/stepper-step.directive';
import { StepChangedEvent, StepperComponent } from 'src/app/shared/stepper/stepper.component';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { FormChangeState } from "../../../models/interfaces";
import { NotificationService } from '../../../services/notification.service';
import { ApiServiceService } from "../../../services/product-service.service";
import { UsageSpecGeneralInfoComponent } from './usage-spec-general-info/usage-spec-general-info.component';
import { UsageSpecMetricsComponent } from './usage-spec-metrics/usage-spec-metrics.component';
import { UsageSpecSummaryComponent } from './usage-spec-summary/usage-spec-summary.component';

function atLeastOneMetricValidator(control: AbstractControl): ValidationErrors | null {
  return Array.isArray(control.value) && control.value.length > 0 ? null : { metricsRequired: true };
}

const DELETED_STATUSES = ['Retired', 'Obsolete'];

@Component({
  selector: 'usage-spec-form',
  standalone: true,
  imports: [
    UsageSpecGeneralInfoComponent,
    UsageSpecMetricsComponent,
    UsageSpecSummaryComponent,
    TranslateModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmModalComponent,
    UnsavedChangesModalComponent,
    StepperComponent,
    StepperStepDirective
  ],
  templateUrl: './usage-spec.component.html',
  styleUrl: './usage-spec.component.css'
})
export class UsageSpecComponent implements OnInit, OnDestroy, OnChanges, LeaveConfirmable {

  @Input() formType: 'create' | 'update' = 'create';
  @Input() usageSpec: any = {};
  @Input() partyId: any;

  usageSpecForm: FormGroup;
  currentStepId = 'generalInfo';
  isFormValid = false;
  loadingData: boolean = false;

  private formChanges: { [key: string]: FormChangeState } = {};
  private formSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  hasChanges: boolean = false;

  /** Names of the provider's other usage specs, which this one's name must not repeat. */
  existingNames: string[] = [];
  private namesLoadedForParty: any = null;

  actionLoading = false;
  showPublishConfirm = false;
  showDeleteConfirm = false;
  showPublishDraftModal = false;
  @ViewChild(UnsavedChangesModalComponent) private unsavedChangesModal?: UnsavedChangesModalComponent;
  /** Set once the metric is saved, so the navigation back to the list isn't asked about. */
  private leaveAllowed = false;
  /** Offerings still selling a price metered by this spec; it can't be deleted while there are any. */
  deleteCheck: 'checking' | 'error' | 'blocked' | 'ok' = 'checking';
  private blockingOfferNames = '';

  constructor(private api: ApiServiceService,
    private eventMessage: EventMessageService,
    private fb: FormBuilder,
    private usageSpecService: UsageServiceService,
    private notificationService: NotificationService,
    private translate: TranslateService,
    private router: Router) {

    this.usageSpecForm = this.fb.group({
      generalInfo: this.fb.group({}),
      metrics: new FormControl([], [atLeastOneMetricValidator])
    });

    // Subscribe to form validation changes
    this.usageSpecForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.isFormValid = status === 'VALID';
      });

    // Subscribe to subform changes
    this.formSubscription = this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        if (message.type === 'SubformChange') {
          const changeState = message.value as FormChangeState;
          console.log('Received subform change:', changeState);
          this.handleSubformChange(changeState);
        }
      });
  }

  handleSubformChange(change: FormChangeState) {
    console.log('📝 Subform change received:', change);
    this.formChanges[change.subformType] = change;
    this.hasChanges = Object.keys(this.formChanges).length > 0;
    console.log('📝 Has changes:', this.hasChanges);
    console.log(this.formChanges[change.subformType])
  }

  ngOnDestroy() {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partyId'] && this.partyId) this.loadExistingNames();
  }

  get canAdvance(): boolean {
    return this.validateCurrentStep();
  }

  get leaveNeedsConfirmation(): boolean {
    return !this.isUpdate && !this.leaveAllowed && this.usageSpecForm.dirty;
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.leaveNeedsConfirmation) return true;
    return this.unsavedChangesModal?.confirm(() => this.saveDraft()) ?? true;
  }

  get isUpdate(): boolean {
    return this.formType === 'update';
  }

  /** Specs created before lifecycle management have no status; they behave as drafts. */
  get isDraft(): boolean {
    return !this.usageSpec?.lifecycleStatus || this.usageSpec.lifecycleStatus === 'Active';
  }

  get isDeleted(): boolean {
    return DELETED_STATUSES.includes(this.usageSpec?.lifecycleStatus);
  }

  get statusBadgeVariant() {
    return lifecycleStatusBadgeVariant(this.usageSpec?.lifecycleStatus || 'Active');
  }

  get statusLabel(): string {
    return lifecycleStatusLabel(this.usageSpec?.lifecycleStatus || 'Active');
  }

  get deleteConfirmMessage(): string {
    switch (this.deleteCheck) {
      case 'checking': return 'USAGE_SPECS._delete_checking';
      case 'error': return 'USAGE_SPECS._delete_check_error';
      case 'blocked': return this.translate.instant('USAGE_SPECS._delete_blocked', { offers: this.blockingOfferNames });
      default: return this.translate.instant('USAGE_SPECS._delete_confirm_message', { name: this.usageSpec?.name ?? '' });
    }
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId!;
  }

  validateCurrentStep(): boolean {
    switch (this.currentStepId) {
      case 'generalInfo':
        return this.usageSpecForm.get('generalInfo')?.valid || false;
      case 'metrics':
        return this.usageSpecForm.get('metrics')?.valid || false;
      default:
        return true;
    }
  }

  submitForm() {
    if (this.formType === 'update') {
      console.log('🔄 Starting offer update process...');
      console.log('📝 Current form changes:', this.formChanges);

      // Aquí irá la lógica de actualización
      // Por ahora solo mostramos los cambios
      this.updateUsageSpec();
    } else {
      this.showPublishDraftModal = true;
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.formType === 'update' && this.usageSpec) {
      this.loadingData = true;
      await this.loadUsageSpecData();
      this.loadingData = false;
    }
  }

  loadUsageSpecData() {
    if (this.usageSpec) {
      const metrics = this.usageSpec.specCharacteristic = this.usageSpec.specCharacteristic.map((item: any) => ({
        ...item,
        id: uuidv4()
      }));
      this.usageSpecForm.patchValue({
        generalInfo: {
          name: this.usageSpec.name,
          description: this.usageSpec.description
        },
        metrics: metrics
      });
    }
  }

  saveDraft() {
    this.createUsageSpec('Active');
  }

  publish() {
    this.createUsageSpec('Launched');
  }

  async createUsageSpec(lifecycleStatus: 'Active' | 'Launched' = 'Active') {
    this.showPublishDraftModal = false;

    const formValue = this.usageSpecForm.value;
    const generalInfo = formValue.generalInfo;
    const metrics = formValue.metrics.map(({ id, ...rest }: any) => rest);

    const usageSpec: any = {
      name: generalInfo.name,
      description: generalInfo.description || '',
      lifecycleStatus,
      specCharacteristic: metrics,
      relatedParty: [
        {
          id: this.partyId,
          href: this.partyId,
          role: environment.SELLER_ROLE
        }
      ],
    }
    console.log(usageSpec)

    this.usageSpecService.postUsageSpec(usageSpec).subscribe({
      next: data => {
        console.log('usageSpec created:')
        console.log(data)
        this.notificationService.showSuccess('USAGE_SPECS._create_success');
        this.leaveAllowed = true;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating the usageSpec!', error);
        this.notificationService.showError('USAGE_SPECS._create_error', { details: error?.error?.error || error?.error?.message || error?.message });
      }
    });

  }

  async updateUsageSpec() {
    console.log('🔄 Starting offer update process...');
    console.log('📝 Current form changes:', this.formChanges);

    // Preparar el payload base con los datos que no han cambiado
    const basePayload: any = {
      name: this.usageSpec.name,
      description: this.usageSpec.description,
      specCharacteristic: this.usageSpec.specCharacteristic
    };

    // Procesar cada cambio emitido por los subformularios
    for (const [subformType, change] of Object.entries(this.formChanges)) {
      console.log(`📝 Processing changes for ${subformType}:`, change);

      switch (subformType) {
        case 'generalInfo':
          // Actualizar información general
          basePayload.name = change.currentValue.name;
          basePayload.description = change.currentValue.description;
          break;
        case 'metrics':
          // Actualizar metricas
          const metrics = change.currentValue.map((metric: any) => ({
            name: metric.name,
            description: metric.description,
            valueType: 'number'
          }));
          basePayload.specCharacteristic = metrics
          console.log('------ here')
          console.log(metrics)
          break;
      }
    }
    console.log('📝 Final update payload:', basePayload);

    try {
      // Llamar a la API para actualizar la oferta
      await lastValueFrom(this.usageSpecService.updateUsageSpec(basePayload, this.usageSpec.id));
      console.log('✅ Usage Spec updated successfully');
      this.notificationService.showSuccess('USAGE_SPECS._update_success');
      this.goBack();
    } catch (error: any) {
      console.error('❌ Error updating Usage Spec:', error);
      this.notificationService.showError('USAGE_SPECS._update_error', { details: error?.error?.error || error?.error?.message || error?.message });
    }
  }


  private async loadExistingNames(): Promise<void> {
    if (this.namesLoadedForParty === this.partyId) return;
    this.namesLoadedForParty = this.partyId;
    try {
      const specs = await this.usageSpecService.getAllUsageSpecsOfParty(this.partyId);
      this.existingNames = specs
        .filter(spec => spec?.id !== this.usageSpec?.id && !DELETED_STATUSES.includes(spec?.lifecycleStatus))
        .map(spec => spec?.name)
        .filter(name => !!name);
    } catch (error) {
      console.error('Could not load usage spec names for the uniqueness check', error);
      this.namesLoadedForParty = null;
      this.existingNames = [];
    }
  }

  openDeleteConfirm(): void {
    this.showDeleteConfirm = true;
    this.checkDeletable();
  }

  private async checkDeletable(): Promise<void> {
    this.deleteCheck = 'checking';
    try {
      const offers = await this.api.getOfferingsUsingUsageSpec(this.usageSpec.id);
      const blocking = offers.filter(offer => !DELETED_STATUSES.includes(offer?.lifecycleStatus));
      this.blockingOfferNames = blocking.map(offer => offer.name || offer.id).join(', ');
      this.deleteCheck = blocking.length > 0 ? 'blocked' : 'ok';
    } catch (error) {
      console.error('Could not check which offerings use this usage spec', error);
      this.deleteCheck = 'error';
    }
  }

  onDeleteResolved(confirmed: boolean): void {
    this.showDeleteConfirm = false;
    if (!confirmed || this.deleteCheck !== 'ok') return;
    // Usage specs are never removed: prices may still reference them, so they're retired instead.
    const lifecycleStatus = this.usageSpec.lifecycleStatus === 'Launched' ? 'Retired' : 'Obsolete';
    this.changeLifecycleStatus(lifecycleStatus, 'USAGE_SPECS._delete_success', 'USAGE_SPECS._delete_error', true);
  }

  onPublishResolved(confirmed: boolean): void {
    this.showPublishConfirm = false;
    if (confirmed) {
      this.changeLifecycleStatus('Launched', 'USAGE_SPECS._publish_success', 'USAGE_SPECS._publish_error', false);
    }
  }

  private changeLifecycleStatus(lifecycleStatus: string, successKey: string, errorKey: string, leave: boolean): void {
    this.actionLoading = true;
    this.usageSpecService.updateUsageSpec({ lifecycleStatus }, this.usageSpec.id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.usageSpec.lifecycleStatus = lifecycleStatus;
        this.notificationService.showSuccess(successKey);
        if (leave) this.goBack();
      },
      error: error => {
        this.actionLoading = false;
        this.notificationService.showError(errorKey, { details: error?.error?.error || error?.error?.message || error?.message });
      }
    });
  }

  goBack() {
    this.router.navigate([SellerOfferingsPaths.usageSpecs.list()]);
  }

}
