import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";
import moment from 'moment';
import { lastValueFrom, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { components } from "src/app/models/product-catalog";
import { searchCategoriesConfig } from 'src/app/data/availableFilters';
import { fetchAllPages } from 'src/app/models/pagination.model';
import { SelectOption } from 'src/app/models/formFields/form-field.model';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { SearchSelectComponent } from 'src/app/shared/search-select/search-select.component';
import { StepperStepDirective } from 'src/app/shared/stepper/stepper-step.directive';
import { StepChangedEvent, StepperComponent } from 'src/app/shared/stepper/stepper.component';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../../../../environments/environment';
import { FormChangeState, LoginInfo, PricePlanChangeState } from "../../../models/interfaces";
import { ApiServiceService } from "../../../services/product-service.service";
import { EdcContractDefinitionComponent } from "./edc-contract-definition/edc-contract-definition.component";
import { GeneralInfoComponent } from "./general-info/general-info.component";
import { LicenseComponent } from "./license/license.component";
import { OfferSummaryComponent } from "./offer-summary/offer-summary.component";
import { PricePlansComponent } from "./price-plans/price-plans.component";
import { ProcurementModeComponent } from "./procurement-mode/procurement-mode.component";
import { ProdSpecComponent } from "./prod-spec/prod-spec.component";

type ProductOffering_Create = components["schemas"]["ProductOffering_Create"];
type ProductOfferingPrice = components["schemas"]["ProductOfferingPrice"]

@Component({
  selector: 'app-offer-form',
  standalone: true,
  imports: [
    GeneralInfoComponent,
    TranslateModule,
    ProdSpecComponent,
    ReactiveFormsModule,
    LicenseComponent,
    PricePlansComponent,
    ProcurementModeComponent,
    OfferSummaryComponent,
    EdcContractDefinitionComponent,
    LoadingSpinnerComponent,
    SearchSelectComponent,
    StepperComponent,
    StepperStepDirective,
  ],
  templateUrl: './offer.component.html',
  styleUrl: './offer.component.css'
})
export class OfferComponent implements OnInit, OnDestroy {

  @Input() formType: 'create' | 'update' = 'create';
  @Input() offer: any = {};
  @Input() partyId: any;
  @Output() previewRequested = new EventEmitter<any>();

  productOfferForm: FormGroup;
  currentStepId = 'general';
  showContractDefinitionStep = false;
  isFormValid = false;
  selectedProdSpec: any;
  pricePlans: any = [];
  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;
  bundleChecked: boolean = false;
  offersBundle: any[] = [];
  loadingData: boolean = false;

  // Auto-catalogue: the seller no longer picks a catalogue manually — we reuse
  // their existing one or create a default one on the fly (see ensureCatalogue()).
  autoCatalogue: any = null;

  // Manual catalogue selection: only shown when the org has catalog management enabled.
  // Loaded in full (fetchAllPages) so it can be filtered client-side via app-search-select.
  catalogManagementEnabled: boolean = environment.CATALOG_MANAGEMENT_ENABLED;
  availableCatalogs: SelectOption[] = [];
  loadingCatalogs: boolean = false;

  // Category: single root + subcategory pick, each rendered as a search-select.
  availableRootCategories: any[] = [];
  availableSubcategories: any[] = [];
  loadingCategories: boolean = false;
  selectedRootCategory: any = null;
  selectedSubcategory: any = null;
  private originalCategoryValue: any[] = [];

  get rootCategoryOptions(): SelectOption[] {
    return this.availableRootCategories.map(c => ({ value: c, label: c.name, subtitle: c.description || '-' }));
  }

  get subcategoryOptions(): SelectOption[] {
    return this.availableSubcategories.map(c => ({ value: c, label: c.name, subtitle: c.description || '-' }));
  }

  get isUpdate() {
    return this.formType === 'update';
  }
  offerToCreate: ProductOffering_Create | undefined;

  private formChanges: { [key: string]: FormChangeState } = {};
  private formSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  hasChanges: boolean = false;

  get dspEnable(): boolean {
    return environment.DSP_ENABLED && environment.DATA_SPACE_ENABLED
  }

  constructor(private api: ApiServiceService,
    private eventMessage: EventMessageService,
    private fb: FormBuilder,
    private router: Router,
    private accountService: AccountServiceService,
    private localStorage: LocalStorageService) {

    this.productOfferForm = this.fb.group({
      generalInfo: this.fb.group({}),
      prodSpec: new FormControl(null, [Validators.required]),
      catalogue: new FormControl(null),
      category: new FormControl([]),
      license: this.fb.group({}),
      edcContractDefinition: this.fb.group({}),
      pricePlans: new FormControl([]),
      procurementMode: this.fb.group({}),
      replicationMode: this.fb.group({})
    });

    // Subscribe to form validation changes
    this.productOfferForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        const valid = this.productOfferForm.controls['generalInfo'].valid
          && (this.productOfferForm.get('procurementMode')?.valid ?? true)
          && (this.productOfferForm.get('edcContractDefinition')?.valid ?? true);
        // Deferred: statusChanges can fire synchronously while a nested subform is
        // still registering its own controls (during that child's ngOnInit), which
        // happens mid change-detection pass and would otherwise trigger NG0100.
        Promise.resolve().then(() => { this.isFormValid = valid; });
      });

    // Recompute contract definition step visibility as soon as the product spec changes,
    // instead of waiting for the next step navigation.
    this.productOfferForm.get('prodSpec')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.showContractDefinitionStep = this.isdEdcCompatible() && this.dspEnable;
      });

    // Subscribe to subform changes
    this.formSubscription = this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('subform changed-----')
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
      return this.isFormValid;
    }
    return this.validateCurrentStep();
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId!;
  }

  validateCurrentStep(): boolean {
    switch (this.currentStepId) {
      case 'general':
        return (this.productOfferForm.get('generalInfo')?.valid || false)
          && (!this.catalogSelectionRequired() || !!this.productOfferForm.get('catalogue')?.value?.id);
      case 'productSpec':
        return !!this.productOfferForm.get('prodSpec')?.value;
      case 'category':
        return !!this.selectedRootCategory?.id;
      case 'license':
        return this.productOfferForm.get('license')?.valid || false;
      case 'contractDefinition':
        return this.productOfferForm.get('edcContractDefinition')?.valid || false;
      case 'price':
        return true;
      case 'procurement': // Procurement Mode
        return this.productOfferForm.get('procurementMode')?.valid || false;
      // case 'replication':
      //   return this.productOfferForm.get('replicationMode')?.valid || false;
      default:
        return true;
    }
  }

  submitForm() {
    if (this.formType === 'update') {
      this.eventMessage.emitUpdateOffer(true);
      console.log('🔄 Starting offer update process...');
      console.log('📝 Current form changes:', this.formChanges);

      // Aquí irá la lógica de actualización
      // Por ahora solo mostramos los cambios
      this.updateOffer();
    } else {
      // Lógica de creación existente
      this.createOffer();
    }
  }

  async ngOnInit() {
    if (this.formType === 'update' && this.offer) {
      this.loadingData = true;
      await this.loadCategories();
      await this.loadOfferData();
      await this.initSelectedCategoriesFromOffer();
      this.loadingData = false;
    } else {
      this.loadCategories();
      if (this.catalogManagementEnabled) {
        this.loadAvailableCatalogs();
      } else {
        this.ensureCatalogue();
      }
    }
  }

  catalogSelectionRequired(): boolean {
    return this.catalogManagementEnabled && this.formType === 'create';
  }

  /** Auto-assigns the seller's catalogue: reuses an existing one, or creates a default one. */
  async ensureCatalogue(): Promise<any> {
    if (this.autoCatalogue) return this.autoCatalogue;
    if (!this.partyId) return null;
    try {
      const existing = await this.api.getCatalogsByUser(0, undefined, [], this.partyId);
      if (Array.isArray(existing) && existing.length > 0) {
        this.autoCatalogue = existing[0];
        this.productOfferForm.patchValue({ catalogue: this.autoCatalogue });
        return this.autoCatalogue;
      }
      const catalogueName = await this.getDefaultCatalogueName();
      if (!catalogueName) return null;
      const created = await lastValueFrom(this.api.postCatalog({
        name: catalogueName,
        description: '',
        lifecycleStatus: 'Launched',
        relatedParty: [{ id: this.partyId, role: environment.SELLER_ROLE, '@referredType': '' }]
      }));
      if (created?.id) {
        this.autoCatalogue = created;
        this.productOfferForm.patchValue({ catalogue: created });
      }
      return this.autoCatalogue;
    } catch (err) {
      console.error('Failed to ensure provider catalogue', err);
      return null;
    }
  }

  private async getDefaultCatalogueName(): Promise<string> {
    let catalogueName = this.getCachedLoggedPartyName();

    if (!catalogueName) {
      try {
        const party = this.isOrganizationParty()
          ? await this.accountService.getOrgInfo(this.partyId)
          : await this.accountService.getUserInfo(this.partyId);
        catalogueName = this.isOrganizationParty()
          ? this.pickOrganizationPartyName(party)
          : this.pickIndividualPartyName(party);
      } catch (err) {
        console.error('Failed to resolve default catalogue name', err);
      }
    }

    return catalogueName;
  }

  private getCachedLoggedPartyName(): string {
    const loginInfo = this.localStorage.getObject('login_items') as LoginInfo;
    if (!loginInfo || JSON.stringify(loginInfo) === '{}') return '';

    if (loginInfo.logged_as && loginInfo.id && loginInfo.logged_as !== loginInfo.id) {
      const loggedOrg = loginInfo.organizations?.find((org: any) => org.id === loginInfo.logged_as || org.partyId === this.partyId);
      return this.pickOrganizationPartyName(loggedOrg);
    }

    return this.normalizeCatalogueName(loginInfo.user);
  }

  private pickOrganizationPartyName(party: any): string {
    const value = party?.tradingName ?? party?.name;
    return this.normalizeCatalogueName(value);
  }

  private pickIndividualPartyName(party: any): string {
    return [party?.givenName, party?.familyName]
      .filter((value: any) => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .trim()
      .slice(0, 100);
  }

  private normalizeCatalogueName(value: any): string {
    return typeof value === 'string' ? value.trim().slice(0, 100) : '';
  }

  private isOrganizationParty(): boolean {
    return String(this.partyId || '').toLowerCase().includes('organization');
  }

  async loadCategories(): Promise<void> {
    this.loadingCategories = true;
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];

      if (searchCategoriesConfig.primaryCategoriesMode === 'catalogFirstLevel') {
        this.availableRootCategories = list;
        return;
      }

      const configuredRootName = searchCategoriesConfig.primaryRootName;
      const primaryCategoryRoot = configuredRootName
        ? list.find((c: any) => c?.name === configuredRootName)
        : null;

      if (primaryCategoryRoot?.id) {
        const children = await this.api.getCategoriesByParentId(primaryCategoryRoot.id);
        this.availableRootCategories = Array.isArray(children) ? children : [];
      } else {
        this.availableRootCategories = [];
      }
    } catch (err) {
      console.error('Failed to load categories', err);
      this.availableRootCategories = [];
    } finally {
      this.loadingCategories = false;
    }
  }

  /** Loads every catalogue the seller can publish to, for the search-select catalogue picker. */
  async loadAvailableCatalogs(): Promise<void> {
    if (!this.partyId) { this.availableCatalogs = []; return; }
    this.loadingCatalogs = true;
    try {
      const catalogs = await fetchAllPages(params =>
        this.api.getCatalogsByUserPaged(params, undefined, ['Active', 'Launched'], this.partyId));
      this.availableCatalogs = catalogs.map(c => ({ value: c, label: c.name, subtitle: c.description || '-' }));
    } catch (err) {
      console.error('Failed to load catalogs for selector', err);
      this.availableCatalogs = [];
    } finally {
      this.loadingCatalogs = false;
    }
  }

  /** Update mode: once the offer's category array is loaded, figure out which root/subcategory it matches. */
  private async initSelectedCategoriesFromOffer(): Promise<void> {
    const offerCategories = this.offer?.category || [];
    const rootIds = new Set(this.availableRootCategories.map((c: any) => c.id));
    const existingRoot = offerCategories.find((c: any) => rootIds.has(c?.id));
    if (!existingRoot) return;

    this.selectedRootCategory = this.availableRootCategories.find((c: any) => c.id === existingRoot.id) ?? existingRoot;
    try {
      const children = await this.api.getCategoriesByParentId(existingRoot.id);
      this.availableSubcategories = Array.isArray(children) ? children : [];
    } catch (err) {
      console.error('Failed to load subcategories', err);
      this.availableSubcategories = [];
    }
    const subIds = new Set(this.availableSubcategories.map((c: any) => c.id));
    const existingSub = offerCategories.find((c: any) => subIds.has(c?.id));
    if (existingSub) this.selectedSubcategory = this.availableSubcategories.find((c: any) => c.id === existingSub.id) ?? existingSub;
  }

  async onRootCategoryChange(category: any): Promise<void> {
    this.selectedRootCategory = category;
    this.selectedSubcategory = null;
    this.availableSubcategories = [];

    const rootIds = new Set(this.availableRootCategories.map(c => c.id));
    const current = this.productOfferForm.get('category')?.value || [];
    const preserved = (Array.isArray(current) ? current : []).filter((c: any) => {
      if (!c?.id) return true;
      if (rootIds.has(c.id)) return false;
      if (c?.parentId && rootIds.has(c.parentId)) return false;
      return true;
    });
    const next = category ? [...preserved, category] : preserved;
    this.patchCategoryValue(next);

    if (category?.id) {
      try {
        const children = await this.api.getCategoriesByParentId(category.id);
        if (this.selectedRootCategory?.id === category.id) {
          this.availableSubcategories = Array.isArray(children) ? children : [];
        }
      } catch (err) {
        console.error('Failed to load subcategories', err);
        this.availableSubcategories = [];
      }
    }
  }

  onSubcategoryChange(category: any): void {
    this.selectedSubcategory = category;
    const subIds = new Set(this.availableSubcategories.map(c => c.id));
    const current = this.productOfferForm.get('category')?.value || [];
    const withoutPriorSub = (Array.isArray(current) ? current : []).filter((c: any) => !subIds.has(c?.id));
    const next = category ? [...withoutPriorSub, category] : withoutPriorSub;
    this.patchCategoryValue(next);
  }

  /** Patches the category control and, in update mode, replays the change through the same
   * subform-change tracking `app-category-form` used to use, so updateOffer() still picks it up. */
  private patchCategoryValue(next: any[]): void {
    this.productOfferForm.patchValue({ category: next });
    if (this.formType === 'update') {
      this.handleSubformChange({
        subformType: 'category',
        isDirty: true,
        dirtyFields: ['category'],
        originalValue: this.originalCategoryValue,
        currentValue: next
      });
    }
  }
  async loadOfferData() {
    console.log('Loading offer into form...', this.offer);

    // Product Specification
    if (this.offer.productSpecification) {
      await this.api.getProductSpecification(this.offer.productSpecification.id).then(async data => {
        this.selectedProdSpec = data;
      })
      this.productOfferForm.patchValue({
        prodSpec: this.selectedProdSpec || null // Cargar si existe, o dejar en null
      });
    }

    //CATEGORIES
    if (this.offer.category) {
      this.originalCategoryValue = JSON.parse(JSON.stringify(this.offer.category));
      this.productOfferForm.patchValue({
        category: this.offer.category || null // Cargar si existe, o dejar en null
      });
    }

    //LICENSE
    if (this.offer.productOfferingTerm) {
      console.log('Found productOfferingTerm:', this.offer.productOfferingTerm);

      // Mantener el primer término (licencia) incluso si está vacío
      //const licenseTerm = this.offer.productOfferingTerm[0];
      const licenseTerm = this.offer.productOfferingTerm.find(
        (element: { name: string; }) => element.name === 'License'
      );

      // Filtrar el resto de términos

      /*const otherTerms = this.offer.productOfferingTerm.filter(
        (term: any) => term.name !== 'License'
      ) ?? [];


      // Reconstruir el array con el término de licencia en la posición 0
      this.offer.productOfferingTerm = [licenseTerm, ...otherTerms];*/

      if (licenseTerm) {
        this.productOfferForm.patchValue({
          license: {
            treatment: 'License',
            description: licenseTerm.description
          }
        });
      } else {
        this.productOfferForm.patchValue({
          license: {
            treatment: 'License',
            description: ''
          }
        });
      }

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

      // EDC Contract Definition
      if (environment.DSP_ENABLED) {
        const contractDefinition = this.offer.productOfferingTerm.find(
          (element: { name: string; }) => element.name === 'edc:contractDefinition'
        ) || { name: 'edc:contractDefinition' };
        this.productOfferForm.patchValue(({
          contractDefinition: {
            name: contractDefinition.name,
            accessPolicy: contractDefinition.accessPolicy ? JSON.stringify(contractDefinition.accessPolicy) : '',
            contractPolicy: contractDefinition.contractPolicy ? JSON.stringify(contractDefinition.contractPolicy) : ''
          }
        }))
      }
      /*console.log('Checking procurement terms...');
      this.offer.productOfferingTerm.forEach((term: any) => {
        console.log('Checking term:', term);
        if(term.name == 'procurement') {
          console.log('Found procurement term:', term);
          const procurementValue = {
            id: term.description,
            name: term.description
          };
          console.log('Setting procurement value:', procurementValue);
          this.productOfferForm.patchValue({
            procurementMode: procurementValue
          });
          console.log('Form value after patch:', this.productOfferForm.value);
        }
      })*/
    }

    // Price Plans
    if (Array.isArray(this.offer.productOfferingPrice) && this.offer.productOfferingPrice.length > 0) {
      for (let pop of this.offer.productOfferingPrice) {
        let relatedPrices: any[] = [];
        const pricePlan = await this.api.getOfferingPrice(pop.id);
        console.log('-- price plan ----')
        console.log(pricePlan)
        let configProfileCheck = false;
        if (pricePlan?.prodSpecCharValueUse && pricePlan?.prodSpecCharValueUse.length > 0) {
          configProfileCheck = true
        } else {
          configProfileCheck = false
        }

        let priceInfo: any = {
          id: pricePlan.id,
          name: pricePlan.name,
          description: pricePlan.description,
          lifecycleStatus: pricePlan.lifecycleStatus,
          paymentOnline: pricePlan?.paymentOnline ?? !!pricePlan?.bundledPopRelationship,
          productProfile: configProfileCheck ? this.mapProductProfile(pricePlan?.prodSpecCharValueUse || []) : [],
        }

        //Now every pricePlan is set as bundle even with only one price component
        if (pricePlan.bundledPopRelationship) {
          for (let i = 0; i < pricePlan.bundledPopRelationship.length; i++) {
            let data = await this.api.getOfferingPrice(pricePlan.bundledPopRelationship[i].id)
            let priceComp: any = {
              id: data.id,
              href: data.href,
              name: data?.name,
              description: data?.description,
              isBundle: data?.isBundle,
              priceType: data?.priceType,
              lastUpdate: data?.lastUpdate,
              lifecycleStatus: data?.lifecycleStatus,
              paymentOnline: data?.paymentOnline ?? !!data?.bundledPopRelationship,
              selectedCharacteristic: data?.prodSpecCharValueUse || null,
              currency: data?.price?.unit || 'EUR',
              usageUnit: data?.unitOfMeasure?.units || null,
              usageSpecId: data?.usageSpecId,
              recurringPeriod: data?.recurringChargePeriodType || 'month',
              price: data?.price?.value,
              validFor: data?.validFor || null,
            }

            if (data?.price?.unit) {
              priceComp.currency = data?.price?.unit
            }

            if (data?.popRelationship) {
              let alter = await this.api.getOfferingPrice(data?.popRelationship[0].id)
              console.log('----- alter')
              console.log(alter)
              if (alter.percentage) {
                priceComp.discountValue = alter?.percentage
                priceComp.discountUnit = 'percentage'
              } else {
                priceComp.discountValue = alter?.price?.value
                priceComp.discountUnit = 'fixed'
              }
              priceComp.discountDuration = alter?.unitOfMeasure?.amount
              priceComp.discountDurationUnit = alter?.unitOfMeasure?.units
              //priceComp.discountDurationUnit=alter?.
              //priceComp.discountDuration=this.calculateDiscountDuration(alter?.validFor,alter?.)
            }
            relatedPrices.push(priceComp)
          }
        }

        priceInfo.priceComponents = relatedPrices;
        console.log(priceInfo)
        //}

        this.pricePlans.push(priceInfo);
        console.log(this.pricePlans)
      }
      console.log('Price Plans existentes: ', this.pricePlans);

      this.productOfferForm.patchValue({
        pricePlans: this.pricePlans // Cargar si existe, o dejar en null
      });
    }

    if (this.offer.externalId && this.isdEdcCompatible() && this.dspEnable) {
      this.showContractDefinitionStep = true;
    }
  }

  private mapProductProfile(prodSpecCharValueUse: any[]): FormGroup {
    return this.fb.group({
      selectedValues: this.fb.array(
        prodSpecCharValueUse.map(spec =>
          this.fb.group({
            id: [spec.id],
            name: [spec.name],
            selectedValue: [
              spec.productSpecCharacteristicValue.find((v: { isDefault: boolean }) => v.isDefault)?.value || null,
              Validators.required
            ]
          })
        )
      )
    });
  }

  private handleApiError(error: any): void {
    console.error('Error while creating offer price!', error);
    this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'Error creating offer price!';
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }

  private async createPriceAlteration(component: any, currency: string): Promise<any> {
    const priceAlter: ProductOfferingPrice = {
      name: 'discount',
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

  private async updatePriceComponent(component: any, currency: string): Promise<any> {
    console.log('update function')
    console.log(component)
    console.log(currency)
    console.log('------')
    let priceComp: ProductOfferingPrice = {
      name: component.newValue.name,
      isBundle: false,
      description: component.newValue.description,
      lifecycleStatus: component.newValue.lifecycleStatus,
      priceType: component.newValue.priceType,
      price: { unit: currency, value: component.newValue.price }
    };

    if (['recurring', 'recurring-prepaid'].includes(component.newValue.priceType)) {
      priceComp.recurringChargePeriodType = component.newValue.recurringPeriod;
      priceComp.recurringChargePeriodLength = 1;
    }

    if (component.newValue.priceType === 'usage') {
      console.log(component.newValue)
      priceComp.unitOfMeasure = {
        amount: 1,
        units: component.newValue.usageUnit
      };

      (priceComp as any).usageSpecId = component.newValue.usageSpecId;

      console.log('----- here')
      console.log(priceComp)
    }

    if (component.newValue.selectedCharacteristic) {
      priceComp.prodSpecCharValueUse = component.newValue.selectedCharacteristic;
    }

    if (component.newValue.unitOfMeasure) {
      priceComp.unitOfMeasure = component.newValue.usageUnit;
    }

    if (component.newValue.discountValue != null) {
      let discountMock: any = {
        discountValue: component.newValue.discountValue
      }
      if (component.newValue.discountUnit) {
        discountMock.discountUnit = component.newValue.discountUnit
      }
      if (component.newValue.discountDuration) {
        discountMock.discountDuration = component.newValue.discountDuration
      }
      if (component.newValue.discountDurationUnit) {
        discountMock.discountDurationUnit = component.newValue.discountDurationUnit
      }
      const discount = await this.createPriceAlteration(discountMock, currency);
      priceComp.popRelationship = [{ id: discount.id, href: discount.id, name: discount.name }];
    }
    console.log('update price comp')
    console.log(priceComp)
    const updated = await lastValueFrom(this.api.updateOfferingPrice(priceComp, component.id));
    return { id: updated.id, href: updated.id, name: updated.name };
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
    } else if (plan?.newValue?.priceType) {
      if (plan?.newValue?.priceType == 'custom') {
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

  async updatePricePlan(plan: any, compRel: any[], modifiedFields: string[]): Promise<ProductOfferingPrice> {

    console.log('plan info')
    console.log(plan)
    console.log(plan.id)
    console.log(compRel)
    let price: ProductOfferingPrice = {
      name: plan.newValue.name,
      isBundle: true,
      bundledPopRelationship: compRel
    }
    if (modifiedFields.includes('description')) {
      price.description = plan.newValue.description
    }
    if (modifiedFields.includes('prodSpecCharValueUse') && plan.newValue.prodSpecCharValueUse != null) {
      price.prodSpecCharValueUse = plan.newValue.prodSpecCharValueUse.map((item: any) => ({
        ...item,
        productSpecCharacteristicValue: item.productSpecCharacteristicValue.filter((v: any) => v.isDefault)
      }));
    }
    let updatedPrice = await lastValueFrom(this.api.updateOfferingPrice(price, plan.id))
    return updatedPrice;
  }

  async createOffer() {
    this.loading = true;
    const plans = this.productOfferForm.value.pricePlans;

    if (plans.length === 0) {
      this.saveOfferInfo();
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
          this.saveOfferInfo();
        }
      } catch (error: any) {
        this.handleApiError(error);
      }
    }
  }

  saveOfferInfo(): void {
    const formValue = this.productOfferForm.value;

    const seenCategoryIds = new Set<string>();
    const categories = formValue.category
      .filter((cat: any) => {
        if (!cat?.id || seenCategoryIds.has(cat.id)) return false;
        seenCategoryIds.add(cat.id);
        return true;
      })
      .map((cat: any) => ({
        id: cat.id,
        href: cat.id
      }));

    const prices = formValue.pricePlans.map((plan: any) => ({
      id: plan.id,
      href: plan.id
    }));

    const generalInfo = formValue.generalInfo;
    const lifecycleStatus = this.formType === 'update' ? generalInfo.status : 'Active';

    const offer: any = {
      name: generalInfo.name,
      description: generalInfo.description || '',
      lifecycleStatus,
      isBundle: this.bundleChecked,
      bundledProductOffering: this.offersBundle,
      place: [],
      version: generalInfo.version,
      ...(formValue.procurementMode.extBillingEnabled && formValue.procurementMode.plaSpecId ? {
        pricingLogicAlgorithm: [{ name: 'external billing', plaSpecId: formValue.procurementMode.plaSpecId }]
      } : {}),

      category: categories,
      productOfferingPrice: prices,
      validFor: {
        startDateTime: new Date().toISOString()
      },
      productOfferingTerm: [
        {
          name: 'License',
          description: formValue.license.description || ''
        },
        ...(formValue.license.termsFile?.url ? [{
          name: 'terms-file',
          description: formValue.license.termsFile.url
        }] : []),
        {
          name: 'procurement',
          description: formValue.procurementMode.mode
        }
      ]
    };

    if (this.dspEnable && this.isdEdcCompatible() && formValue.edcContractDefinition?.dspCompatible) {
      const contractDefinition = formValue.edcContractDefinition;
      offer.productOfferingTerm.push({
        name: contractDefinition.name,
        contractPolicy: contractDefinition.contractPolicy ? JSON.parse(contractDefinition.contractPolicy) : '',
        accessPolicy: contractDefinition.accessPolicy ? JSON.parse(contractDefinition.accessPolicy) : '',
        '@schemaLocation': environment.DSP_CONTRACT_DEFINITION_SCHEMA
      })
      offer.externalId = uuidv4()
      offer['@schemaLocation'] = environment.DSP_SCHEMA
    }
    if (!this.bundleChecked && this.formType === 'create') {
      offer.productSpecification = {
        id: formValue.prodSpec.id,
        href: formValue.prodSpec.href
      };
    }

    this.offerToCreate = offer;

    const catalogueId = this.catalogManagementEnabled
      ? formValue.catalogue?.id
      : formValue.catalogue?.id || this.autoCatalogue?.id;
    if (this.formType === 'create' && !catalogueId) {
      this.errorMessage = 'No catalogue available for this user. Please create one first.';
      this.loading = false;
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
      return;
    }

    const request$ = this.formType === 'create'
      ? this.api.postProductOffering(offer, catalogueId)
      : this.api.updateProductOffering(offer, this.offer.id);

    request$.subscribe({
      next: (data) => {
        console.log('product offer created:');
        console.log(data);
        this.loading = false;
        this.goBack();
      },
      error: (error) => {
        console.error('Error during offer save/update:', error);
        this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while saving the offer!';
        this.loading = false;
        this.showError = true;
        setTimeout(() => (this.showError = false), 3000);
      }
    });
  }

  goBack() {
    this.router.navigate([SellerOfferingsPaths.offers.list()]);
  }

  addToISOString(duration: number, unit: string): string {
    // Mapping between custom units and Moment.js valid units
    const unitMapping: { [key: string]: moment.unitOfTime.DurationConstructor } = {
      day: 'days',
      week: 'weeks',
      month: 'months',
      year: 'years',
    };

    // Validate the unit and map to Moment.js DurationConstructor
    const validUnit = unitMapping[unit.toLowerCase()];

    if (validUnit) {
      return moment().add(duration, validUnit).toISOString();
    } else {
      throw new Error(`Invalid unit: ${unit}. Must be one of day, week, month, or year.`);
    }
  }

  calculateDiscountDuration(validFor: { startDateTime: string, endDateTime: string }, unit: 'days' | 'hours' | 'months') {
    const start = moment(validFor.startDateTime);
    const end = moment(validFor.endDateTime);

    // Calculate the difference based on the given unit
    const discountDuration = end.diff(start, unit);

    return discountDuration;
  }

  async updateOffer() {
    this.loading = true;
    console.log('🔄 Starting offer update process...');
    console.log('📝 Current form changes:', this.formChanges);

    // Preparar el payload base con los datos que no han cambiado
    const basePayload: any = {
      name: this.offer.name,
      description: this.offer.description,
      lifecycleStatus: this.offer.lifecycleStatus,
      version: this.offer.version,
      category: this.offer.category,
      productOfferingPrice: this.offer.productOfferingPrice.map((price: any) => {
        return { // WORKARROUND ISSUE WITH THE PRICE PLAN TO BE INCLUDED IN THE REF
          id: price.id,
          href: price.href
        }
      }),
      validFor: this.offer.validFor,
      productOfferingTerm: this.offer.productOfferingTerm
    };

    // Procesar cada cambio emitido por los subformularios
    for (const [subformType, change] of Object.entries(this.formChanges)) {
      console.log(`📝 Processing changes for ${subformType}:`, change);

      switch (subformType) {
        case 'generalInfo':
          // Actualizar información general
          basePayload.name = change.currentValue.name;
          basePayload.description = change.currentValue.description;
          basePayload.version = change.currentValue.version;
          basePayload.lifecycleStatus = change.currentValue.status;
          break;

        case 'productSpecification':
          // Actualizar especificación del producto
          basePayload.productSpecification = {
            id: change.currentValue.id,
            href: change.currentValue.id
          };
          break;

        case 'category':
          // Actualizar categorías
          basePayload.category = change.currentValue.map((cat: any) => ({
            id: cat.id,
            href: cat.id
          }));
          break;

        case 'license':
          // Actualizar términos de licencia
          const licenseTerm = basePayload.productOfferingTerm.find((term: any) => term.name === 'License');
          if (licenseTerm) {
            licenseTerm.description = change.currentValue.description;
          } else {
            // Añadir el término de licencia al principio del array
            basePayload.productOfferingTerm.unshift({
              name: 'License',
              description: change.currentValue.description
            });
          }

          // Actualizar el fichero de términos y condiciones (una entrada 'terms-file' aparte,
          // ya que ProductOfferingTerm no tiene un campo propio para adjuntos).
          basePayload.productOfferingTerm = basePayload.productOfferingTerm.filter(
            (term: any) => term.name !== 'terms-file'
          );
          if (change.currentValue.termsFile?.url) {
            basePayload.productOfferingTerm.push({
              name: 'terms-file',
              description: change.currentValue.termsFile.url
            });
          }
          break;

        case 'pricePlans':
          // Actualizar planes de precios
          basePayload.productOfferingPrice = change.currentValue.map((plan: any) => ({
            id: plan.id,
            href: plan.id
          }));
          console.log('Cambio en el plan de precios')
          console.log(basePayload.productOfferingPrice)
          console.log((change as PricePlanChangeState).modifiedPricePlans)
          let pricePlanChangeInfo = (change as PricePlanChangeState).modifiedPricePlans;
          for (let i = 0; i < pricePlanChangeInfo.length; i++) {
            let finalPriceComps: any[] = [];
            if (pricePlanChangeInfo[i].priceComponents.added.length > 0) {
              //Crear price comp
              for (let j = 0; j < pricePlanChangeInfo[i].priceComponents.added.length; j++) {
                //finalPriceComps.push(this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.added[j],change.currentValue.currency))
                let compCreated = await this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.added[j], pricePlanChangeInfo[i]?.newValue.currency)
                finalPriceComps.push(compCreated)
              }
              console.log('The following price comps has been created:')
              console.log(finalPriceComps)
            }
            if (pricePlanChangeInfo[i].priceComponents.modified.length > 0) {
              //Modificar price comp
              for (let j = 0; j < pricePlanChangeInfo[i].priceComponents.modified.length; j++) {
                //Revisar que en el caso de actualizar un componente que tenga el mismo id que el price plan (que antes no fuese bundle) ahora hay que crear el componente
                console.log('antes del check')
                console.log(pricePlanChangeInfo[i])
                console.log(pricePlanChangeInfo[i]?.oldValue.isBundle)
                console.log((!pricePlanChangeInfo[i]?.oldValue.isBundle && pricePlanChangeInfo[i].priceComponents.added.length > 0))
                console.log(pricePlanChangeInfo[i].priceComponents.modified[j].id == pricePlanChangeInfo[i].id)
                if ((pricePlanChangeInfo[i].priceComponents.modified[j].id == pricePlanChangeInfo[i].id) && (!pricePlanChangeInfo[i]?.oldValue.isBundle && pricePlanChangeInfo[i].priceComponents.added.length > 0)) {
                  console.log('Si entra en el check')
                  let compUpdated = await this.createPriceComponent(pricePlanChangeInfo[i].priceComponents.modified[j], pricePlanChangeInfo[i]?.newValue.currency)
                  finalPriceComps.push(compUpdated)
                } else if (pricePlanChangeInfo[i].priceComponents.modified[j].id != pricePlanChangeInfo[i].id) {
                  let compUpdated = await this.updatePriceComponent(pricePlanChangeInfo[i].priceComponents.modified[j], pricePlanChangeInfo[i]?.newValue.currency)
                  finalPriceComps.push(compUpdated)
                }

                console.log('The following price comp has been updated:')
                console.log(pricePlanChangeInfo[i].priceComponents.modified[j])
              }
            }
            //Modificar el plan
            if (!pricePlanChangeInfo[i].id.startsWith('temp-id')) {
              let updatedPricePlan = await this.updatePricePlan(pricePlanChangeInfo[i], finalPriceComps, pricePlanChangeInfo[i].modifiedFields);

              console.log('Modified price plan')
              console.log(updatedPricePlan)
            } else {
              let createdPricePlan = await this.createBundledPricePlan(pricePlanChangeInfo[i], finalPriceComps);
              const created = await lastValueFrom(this.api.postOfferingPrice(createdPricePlan));
              let index = basePayload.productOfferingPrice.findIndex(
                (plan: any) => plan.id === pricePlanChangeInfo[i].id
              );
              basePayload.productOfferingPrice[index].id = created.id;
              basePayload.productOfferingPrice[index].href = created.id;
              console.log('New price plan')
              console.log(createdPricePlan)
            }
          }
          break;

        case 'procurement':
          // Actualizar modo de adquisición
          const procurementTerm = basePayload.productOfferingTerm.find((term: any) => term.name === 'procurement');
          if (procurementTerm) {
            procurementTerm.description = change.currentValue.id;
          } else {
            basePayload.productOfferingTerm.push({
              name: 'procurement',
              description: change.currentValue.id
            });
          }
          if (change.currentValue.extBillingEnabled && change.currentValue.plaSpecId) {
            basePayload.pricingLogicAlgorithm = [{ name: 'external billing', plaSpecId: change.currentValue.plaSpecId }];
          } else if (change.originalValue.extBillingEnabled && !change.currentValue.extBillingEnabled) {
            basePayload.pricingLogicAlgorithm = [];
          }
          break;

        case 'contractDefinition': {
          if (change.currentValue.dspCompatible) {
            const edcTerm = basePayload.productOfferingTerm.find((term: any) => term.name === 'edc:contractDefinition');
            if (edcTerm) {
              edcTerm.accessPolicy = JSON.parse(change.currentValue.accessPolicy);
              edcTerm.contractPolicy = JSON.parse(change.currentValue.contractPolicy);
            } else {
              basePayload.productOfferingTerm.push({
                name: change.currentValue.name,
                contractPolicy: change.currentValue.contractPolicy ? JSON.parse(change.currentValue.contractPolicy) : '',
                accessPolicy: change.currentValue.accessPolicy ? JSON.parse(change.currentValue.accessPolicy) : '',
                '@schemaLocation': environment.DSP_CONTRACT_DEFINITION_SCHEMA
              })
            }
          } else {
            basePayload.productOfferingTerm = basePayload.productOfferingTerm.filter(
              (term: any) => term.name !== 'edc:contractDefinition'
            );
          }
          break;
        }

        case 'replication':
          // Actualizar configuración de replicación
          // TODO: Implementar cuando se tenga la estructura de replicación
          break;
      }
    }

    // Eliminar campos undefined o null
    Object.keys(basePayload).forEach(key => {
      if (basePayload[key] === undefined || basePayload[key] === null) {
        delete basePayload[key];
      }
    });

    // Limpiar términos vacíos en productOfferingTerm
    /*if (basePayload.productOfferingTerm) {
      // Mantener el primer término (licencia) incluso si está vacío
      //const licenseTerm = basePayload.productOfferingTerm[0];
      let licenseTerm = basePayload.productOfferingTerm.find((element: { name: any; }) => element.name == 'License')
      if(!licenseTerm){
        licenseTerm={
          name: 'License',
          description: basePayload.productOfferingTerm[0].description
        }
      }

      // Filtrar el resto de términos
      const otherTerms = this.offer.productOfferingTerm.filter(
        (term: any) => term.name !== 'License'
      ) ?? [];

      // Reconstruir el array con el término de licencia en la posición 0
      basePayload.productOfferingTerm = [licenseTerm, ...otherTerms];
    }*/

    console.log('📝 Final update payload:', basePayload);

    try {
      // Llamar a la API para actualizar la oferta
      await lastValueFrom(this.api.updateProductOffering(basePayload, this.offer.id));
      console.log('✅ Offer updated successfully');
      this.loading = false;
      this.goBack();
    } catch (error: any) {
      console.error('❌ Error updating offer:', error);
      this.errorMessage = error?.error?.error ? 'Error: ' + error.error.error : 'An error occurred while updating the offer!';
      this.loading = false;
      this.showError = true;
      setTimeout(() => (this.showError = false), 3000);
    }
  }

  private isdEdcCompatible() {

    const prodSpec = this.productOfferForm.controls['prodSpec'].value
    return prodSpec && (prodSpec as any).externalId;
  }

  emitPreview(): void {
    this.previewRequested.emit(this.buildPreviewProductOff());
  }

  /** Client-side only: maps the current form values into a fake ProductOffering-shaped
   * object so the seller can preview it (details page + card) before actually saving. */
  private buildPreviewProductOff(): any {
    const formValue = this.productOfferForm.value;
    const generalInfo = formValue.generalInfo || {};
    const prodSpec = formValue.prodSpec || null;

    const terms: any[] = [];
    if (formValue.license?.description) {
      terms.push({ name: 'License', description: formValue.license.description });
    }
    if (formValue.license?.termsFile?.url) {
      terms.push({ name: 'terms-file', description: formValue.license.termsFile.url });
    }
    if (formValue.procurementMode?.mode) {
      terms.push({ name: 'procurement', description: formValue.procurementMode.mode });
    }
    if (this.dspEnable && this.isdEdcCompatible() && formValue.edcContractDefinition?.dspCompatible) {
      const contractDefinition = formValue.edcContractDefinition;
      terms.push({
        name: contractDefinition.name,
        contractPolicy: contractDefinition.contractPolicy ? JSON.parse(contractDefinition.contractPolicy) : '',
        accessPolicy: contractDefinition.accessPolicy ? JSON.parse(contractDefinition.accessPolicy) : '',
        '@schemaLocation': environment.DSP_CONTRACT_DEFINITION_SCHEMA
      });
    }

    // Flatten every plan's price components into top-level prices (no bundledPopRelationship
    // refs to resolve) so the details page's usage-metrics lookup works on this data as-is.
    const prices: any[] = [];
    for (const plan of (formValue.pricePlans || [])) {
      for (const component of (plan.priceComponents || [])) {
        prices.push({
          id: component.id,
          href: component.id,
          name: component.name || plan.name,
          description: component.description || plan.description,
          priceType: component.priceType,
          price: component.price != null ? { value: component.price, unit: plan.currency || component.currency || 'EUR' } : undefined,
          recurringChargePeriodType: component.recurringPeriod,
          usageSpecId: component.usageSpecId,
          unitOfMeasure: component.usageUnit
        });
      }
    }

    return {
      id: this.formType === 'update' && this.offer?.id ? this.offer.id : 'preview',
      name: generalInfo.name || '',
      description: generalInfo.description || '',
      version: generalInfo.version || '',
      lifecycleStatus: this.formType === 'update' ? (generalInfo.status || 'Active') : 'Active',
      category: Array.isArray(formValue.category) ? formValue.category : [],
      productSpecification: prodSpec || undefined,
      attachment: (prodSpec as any)?.attachment || [],
      productOfferingTerm: terms,
      productOfferingPrice: prices,
      lastUpdate: new Date().toISOString()
    };
  }
}
