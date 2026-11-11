import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { components } from "src/app/models/product-catalog";
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from "src/app/services/event-message.service";
import { NotificationService } from "src/app/services/notification.service";
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { UnsavedChangesModalComponent } from 'src/app/shared/unsaved-changes-modal/unsaved-changes-modal.component';
import { LeaveConfirmable } from 'src/app/guard/unsaved-changes.guard';
import { NotFoundStateComponent } from 'src/app/shared/not-found-state/not-found-state.component';
import { StepperStepDirective } from 'src/app/shared/stepper/stepper-step.directive';
import { StepChangedEvent, StepperComponent } from 'src/app/shared/stepper/stepper.component';
import { environment } from 'src/environments/environment';
import { ApiServiceService } from "../../../../services/product-service.service";
import { PricePlansComponent } from "../price-plans/price-plans.component";
import { ProcurementModeComponent } from "../procurement-mode/procurement-mode.component";
import { RelatedPartyIdComponent } from "../related-party-id/related-party-id.component";

type ProductOffering_Create = components["schemas"]["ProductOffering_Create"];
type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"]

import { previewPricesFromPlans } from '../offer-preview.util';
@Component({
  selector: 'app-custom-offer',
  standalone: true,
  imports: [
    TranslateModule,
    ReactiveFormsModule,
    PricePlansComponent,
    ProcurementModeComponent,
    RelatedPartyIdComponent,
    LoadingSpinnerComponent,
    NotFoundStateComponent,
    StepperComponent,
    StepperStepDirective,
    UnsavedChangesModalComponent
  ],
  templateUrl: './custom-offer.component.html',
  styleUrl: './custom-offer.component.css'
})
export class CustomOfferComponent implements OnInit, LeaveConfirmable {
  /** Submitting first shows the preview; the host calls publish()/saveDraft() once it's confirmed there. */
  @Output() submitPreviewRequested = new EventEmitter<any>();
  @ViewChild(UnsavedChangesModalComponent) private unsavedChangesModal?: UnsavedChangesModalComponent;
  /** Set once the offer is created, so the navigation back to the list isn't asked about. */
  private leaveAllowed = false;
  offer: any;
  partyId: any | undefined;

  get notFound(): boolean {
    return !this.loadingData && !this.offer;
  }

  productOfferForm: FormGroup;
  currentStep = 0;
  isFormValid = false;
  pricePlans: any = [];
  loading: boolean = false;
  loadingData: boolean = false;
  bundleChecked: boolean = false;
  offersBundle: any[] = [];


  offerToCreate: ProductOffering_Create | undefined;


  constructor(private api: ApiServiceService,
    private eventMessage: EventMessageService,
    private fb: FormBuilder, private quoteService: QuoteService,
    private route: ActivatedRoute, private router: Router,
    private notificationService: NotificationService) {

    this.productOfferForm = this.fb.group({
      prodSpec: new FormControl(null, [Validators.required]),
      partyInfo: new FormControl(null, [Validators.required]),
      pricePlans: new FormControl([]),
      procurementMode: this.fb.group({})
    });

  }

  async ngOnInit() {
    this.loadingData = true;
    this.partyId = this.route.snapshot.queryParamMap.get('partyId') ?? undefined;
    const offerId = this.route.snapshot.queryParamMap.get('offerId');
    if (offerId) {
      try {
        this.offer = await this.api.getProductById(offerId);
        await this.loadOfferData();
      } catch (error) {
        console.error('Error loading offer for custom offer creation', error);
        this.offer = undefined;
      }
    }
    this.loadingData = false;
  }

  async loadOfferData() {
    console.log('Loading offer into form...', this.offer);

    if (this.offer.productOfferingTerm) {
      console.log('Found productOfferingTerm:', this.offer.productOfferingTerm);

      //PROCUREMENT
      const procurementTerm = this.offer.productOfferingTerm.find(
        (element: { name: string; }) => element.name === 'procurement'
      );
      if (procurementTerm) {
        const procurementValue = {
          id: procurementTerm.description,
          name: procurementTerm.description
        };
        console.log('Setting procurement value:', procurementValue);
        this.productOfferForm.patchValue({
          procurementMode: procurementValue
        });
      } else {
        this.productOfferForm.patchValue({
          procurementMode: {
            id: 'manual',
            name: 'Manual'
          }
        });
      }
    }

    // Product Specification
    if (this.offer.productSpecification) {
      await this.api.getProductSpecification(this.offer.productSpecification.id).then(async data => {
        this.productOfferForm.patchValue({
          prodSpec: data || null // Cargar si existe, o dejar en null
        });
      })
    }

  }

  /** Like every other offer: preview it first, then publish it right away or keep it as a draft. */
  askPublishOrDraft() {
    this.submitPreviewRequested.emit(this.buildPreviewProductOff());
  }

  get leaveNeedsConfirmation(): boolean {
    return !this.leaveAllowed && !!this.offer && this.productOfferForm.dirty;
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.leaveNeedsConfirmation) return true;
    return this.unsavedChangesModal?.confirm(() => this.saveDraft()) ?? true;
  }

  get canSaveDraft(): boolean {
    const partyInfo = this.productOfferForm.get('partyInfo')?.value;
    return !this.loading && !!partyInfo && Object.keys(partyInfo).length > 0
      && (this.productOfferForm.get('procurementMode')?.valid ?? false);
  }

  /** The base offer's name, suffixed with the buyer organization it is tailored for. */
  private customOfferName(): string {
    const tradingName = this.productOfferForm.get('partyInfo')?.value?.tradingName;
    return tradingName ? `${this.offer.name} - ${tradingName}` : this.offer.name;
  }

  private buildPreviewProductOff(): any {
    const formValue = this.productOfferForm.value;
    const license = this.offer?.productOfferingTerm?.find((t: { name: string; }) => t.name === 'License');
    const terms: any[] = [
      ...(license ? [{ name: 'License', description: license.description || '' }] : []),
      ...(formValue.procurementMode?.mode ? [{ name: 'procurement', description: formValue.procurementMode.mode }] : []),
    ];
    const prodSpec = formValue.prodSpec || this.offer?.productSpecification;
    return {
      id: 'preview',
      name: this.customOfferName(),
      description: this.offer?.description || '',
      version: this.offer?.version || '',
      lifecycleStatus: 'Active',
      category: this.offer?.category || [],
      productSpecification: prodSpec || undefined,
      attachment: prodSpec?.attachment || [],
      productOfferingTerm: terms,
      productOfferingPrice: previewPricesFromPlans(formValue.pricePlans),
      lastUpdate: new Date().toISOString()
    };
  }

  saveDraft() {
    this.createOffer('Active');
  }

  publish() {
    this.createOffer('Launched');
  }

  async createOffer(lifecycleStatus: 'Active' | 'Launched' = 'Active') {
    this.loading = true;
    const plans = this.productOfferForm.value.pricePlans;

    if (plans.length === 0) {
      this.saveOfferInfo(lifecycleStatus);
      return;
    }

    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const components = plan.priceComponents || [];

      try {
        let createdPriceId: string;

        const compRel = await Promise.all(
          components.map((comp: any) => this.createPriceComponent(comp, plan.currency))
        );
        const bundledPricePlan = this.createBundledPricePlan(plan, compRel);
        const created = await lastValueFrom(this.api.postOfferingPrice(bundledPricePlan));
        createdPriceId = created.id;

        this.productOfferForm.value.pricePlans[i].id = createdPriceId;

        if (i === plans.length - 1) {
          this.saveOfferInfo(lifecycleStatus);
        }
      } catch (error: any) {
        this.handleApiError(error);
        return;
      }
    }
  }

  saveOfferInfo(lifecycleStatus: 'Active' | 'Launched' = 'Active'): void {
    const formValue = this.productOfferForm.value;

    const prices = formValue.pricePlans.map((plan: any) => ({
      id: plan.id,
      href: plan.id
    }));

    const license = this.offer.productOfferingTerm.find((t: { name: string; }) => t.name === 'License');

    const offerName = this.customOfferName();

    const offer: any = {
      name: offerName,
      description: this.offer?.description || '',
      lifecycleStatus,
      isBundle: this.bundleChecked,
      isSellable: false, // Ad-Hoc offer cannot be generally purchased
      bundledProductOffering: this.offersBundle,
      place: [],
      version: this.offer.version,
      category: this.offer.category,
      productOfferingPrice: prices,
      validFor: {
        startDateTime: new Date().toISOString()
      },
      relatedParty: [
        {
          "role": environment.BUYER_ROLE,
          "href": this.productOfferForm.get('partyInfo')?.value.id,
          "id": this.productOfferForm.get('partyInfo')?.value.id
        }
      ],
      productOfferingTerm: [
        {
          name: 'License',
          description: license?.description || ''
        },
        {
          name: 'procurement',
          description: formValue.procurementMode.mode
        }
      ]
    };

    if (!this.bundleChecked) {
      offer.productSpecification = this.offer.productSpecification;
    }

    this.offerToCreate = offer;

    const request$ = this.api.postProductOffering(offer, null)

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('CREATE_OFFER._create_success');
        this.leaveAllowed = true;
        this.goBack();
      },
      error: (error) => {
        console.error('Error during offer save/update:', error);
        this.loading = false;
        this.notificationService.showError('CREATE_OFFER._save_error', {
          details: this.extractErrorDetail(error)
        });
      }
    });
  }

  private async createPriceComponent(component: any, currency: string): Promise<any> {
    console.log('component format')
    console.log(component)
    let priceComp: ProductOfferingPrice = {
      name: component.name,
      isBundle: false,
      description: component.description ?? component?.newValue.description,
      lifecycleStatus: component?.lifecycleStatus ?? component?.newValue?.lifecycleStatus ?? 'Active',
      priceType: component.priceType ?? component?.newValue?.priceType,
      price: { unit: currency, value: component?.price ?? component?.newValue.price },
      recurringChargePeriodType: undefined,
      recurringChargePeriodLength: undefined,
      unitOfMeasure: undefined,
      prodSpecCharValueUse: undefined
    };

    let priceType = component.priceType ?? component?.newValue?.priceType;

    if (['recurring', 'recurring-prepaid'].includes(priceType)) {
      priceComp.recurringChargePeriodType = component.recurringPeriod;
      priceComp.recurringChargePeriodLength = 1;
    }

    if (priceType === 'usage') {
      console.log(component.newValue)
      priceComp.unitOfMeasure = {
        amount: 1,
        units: component.usageUnit ?? component.newValue.usageUnit
      }
      priceComp['@baseType'] = "ProductOfferingPrice";
      priceComp['@schemaLocation'] = "https://raw.githubusercontent.com/laraminones/tmf-new-schemas/main/UsageSpecId.json";
      (priceComp as any).usageSpecId = component.usageSpecId ?? component?.newValue?.usageSpecId;


      console.log('-- here')
      console.log(priceComp)
    }

    if (component?.selectedCharacteristic || component?.newValue?.selectedCharacteristic) {
      priceComp.prodSpecCharValueUse = component.selectedCharacteristic ?? component.newValue.selectedCharacteristic;
    }

    if (component?.unitOfMeasure) {
      priceComp.unitOfMeasure = component.usageUnit;
    }

    if (component?.discountValue != null) {
      const discount = await this.createPriceAlteration(component, currency);
      priceComp.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }
    console.log('create price comp')
    console.log(priceComp)
    const created = await lastValueFrom(this.api.postOfferingPrice(priceComp));
    return { id: created.id, href: created.id, name: created.name };
  }

  private async createPriceAlteration(component: any, currency: string): Promise<any> {
    const priceAlter: ProductOfferingPrice = {
      name: 'discount',
      isBundle: false,
      priceType: 'discount',
      validFor: {
        startDateTime: moment().toISOString(),
        endDateTime: moment().add(Number(component.discountDuration), component.discountDurationUnit).toISOString()
      },
      unitOfMeasure: {
        amount: component.discountDuration,
        units: component.discountDurationUnit
      }
    };

    if (component.discountUnit === 'percentage') {
      priceAlter.percentage = component.discountValue;
    } else {
      priceAlter.price = { value: component.discountValue, unit: currency };
    }

    return await lastValueFrom(this.api.postOfferingPrice(priceAlter));
  }

  private createBundledPricePlan(plan: any, compRel: any[]): ProductOfferingPrice {
    const price: ProductOfferingPrice = {
      name: plan.name ?? plan?.newValue?.name,
      isBundle: true,
      description: plan.description ?? plan?.newValue?.description,
      lifecycleStatus: plan.lifecycleStatus ?? plan?.newValue?.lifecycleStatus,
      bundledPopRelationship: compRel
    };

    if (plan?.priceType) {
      if (plan?.priceType == 'custom') {
        price.priceType = 'custom'
      }
    }

    if (plan.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue
          .filter((v: any) => v.isDefault)
      }));
    }



    if (plan?.newValue?.prodSpecCharValueUse) {
      price.prodSpecCharValueUse = plan?.newValue?.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue
          .filter((v: any) => v.isDefault)
      }));
    }

    console.log(price.prodSpecCharValueUse)

    if (plan.usageUnit) {
      price.unitOfMeasure = plan.usageUnit;
    }

    if (plan?.newValue?.usageUnit) {
      price.unitOfMeasure = plan?.newValue?.usageUnit;
    }

    return price;
  }

  get canAdvance(): boolean {
    return this.validateCurrentStep();
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStep = event.step;
  }

  goBack() {
    this.router.navigate([SellerOfferingsPaths.offers.list()]);
  }

  private handleApiError(error: any): void {
    console.error('Error while creating offer price!', error);
    this.loading = false;
    this.notificationService.showError('CREATE_OFFER._price_create_error', {
      details: this.extractErrorDetail(error)
    });
  }

  /** Extracts a raw backend/exception detail string for the toast's "view details" toggle.
   * Never shown as the toast's translated `message` — see NotificationService.showError. */
  private extractErrorDetail(error: any): string | undefined {
    return error?.error?.error || error?.error?.message || error?.message || undefined;
  }

  validateCurrentStep(): boolean {
    console.log('--- party')
    console.log(this.productOfferForm.get('partyInfo')?.value)
    switch (this.currentStep) {
      case 0: // Party Info
        const value = this.productOfferForm.get('partyInfo')?.value;
        return value && Object.keys(value).length != 0;
      case 1: // Price Plans
        return true;
      case 2: // Procurement Mode
        return this.productOfferForm.get('procurementMode')?.valid || false;
      default:
        return true;
    }
  }

}
