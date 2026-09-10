import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { Router } from '@angular/router';
import { TranslateModule } from "@ngx-translate/core";
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from "src/app/services/event-message.service";
import { UsageServiceService } from 'src/app/services/usage-service.service';
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
    StepperComponent,
    StepperStepDirective
  ],
  templateUrl: './usage-spec.component.html',
  styleUrl: './usage-spec.component.css'
})
export class UsageSpecComponent implements OnInit, OnDestroy {

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

  constructor(private api: ApiServiceService,
    private eventMessage: EventMessageService,
    private fb: FormBuilder,
    private usageSpecService: UsageServiceService,
    private notificationService: NotificationService,
    private router: Router) {

    this.usageSpecForm = this.fb.group({
      generalInfo: this.fb.group({}),
      metrics: new FormControl([])
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

  get canAdvance(): boolean {
    if (this.formType === 'update') {
      return this.usageSpecForm.get('generalInfo')?.valid ?? false;
    }
    return this.validateCurrentStep();
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId!;
  }

  validateCurrentStep(): boolean {
    switch (this.currentStepId) {
      case 'generalInfo':
        return this.usageSpecForm.get('generalInfo')?.valid || false;
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
      // Lógica de creación existente
      this.createUsageSpec();
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

  async createUsageSpec() {

    const formValue = this.usageSpecForm.value;
    const generalInfo = formValue.generalInfo;
    const metrics = formValue.metrics.map(({ id, ...rest }: any) => rest);

    const usageSpec: any = {
      name: generalInfo.name,
      description: generalInfo.description || '',
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
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating the usageSpec!', error);
        this.notificationService.showError('USAGE_SPECS._create_error');
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
      this.notificationService.showError('USAGE_SPECS._update_error');
    }
  }


  goBack() {
    this.router.navigate([SellerOfferingsPaths.usageSpecs.list()]);
  }

}
