import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { OfferComponent } from './offer.component';
import { searchCategoriesConfig } from 'src/app/data/availableFilters';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { environment } from 'src/environments/environment';

describe('OfferComponent', () => {
  let component: OfferComponent;
  let fixture: ComponentFixture<OfferComponent>;
  let api: ApiServiceService;
  let accountService: AccountServiceService;
  let eventMessage: EventMessageService;
  let localStorage: LocalStorageService;
  let router: Router;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    searchCategoriesConfig.primaryCategoriesMode = 'catalogFirstLevel';
    searchCategoriesConfig.primaryRootName = '';

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [OfferComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(OfferComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(ApiServiceService);
    accountService = TestBed.inject(AccountServiceService);
    eventMessage = TestBed.inject(EventMessageService);
    localStorage = TestBed.inject(LocalStorageService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    searchCategoriesConfig.primaryCategoriesMode = 'catalogFirstLevel';
    searchCategoriesConfig.primaryRootName = '';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isFormValid', () => {
    it('should become true once general info, procurement mode and EDC contract fields are all valid', async () => {
      (component.productOfferForm.get('generalInfo') as FormGroup).addControl(
        'name', new FormControl('', Validators.required)
      );

      expect(component.isFormValid).toBeFalse();

      component.productOfferForm.get('generalInfo')?.patchValue({ name: 'Offer name' });
      await flushPromises();

      expect(component.isFormValid).toBeTrue();
    });

    it('should become false again when general info becomes invalid', async () => {
      (component.productOfferForm.get('generalInfo') as FormGroup).addControl(
        'name', new FormControl('Offer name', Validators.required)
      );
      component.productOfferForm.get('generalInfo')?.updateValueAndValidity();
      await flushPromises();
      expect(component.isFormValid).toBeTrue();

      component.productOfferForm.get('generalInfo')?.patchValue({ name: '' });
      await flushPromises();

      expect(component.isFormValid).toBeFalse();
    });
  });

  describe('handleSubformChange (via eventMessage)', () => {
    it('should record a subform change and mark the form as having changes', () => {
      eventMessage.emitSubformChange({
        subformType: 'generalInfo',
        isDirty: true,
        dirtyFields: ['name'],
        originalValue: { name: 'Old name' },
        currentValue: { name: 'New name' }
      });

      expect(component.hasChanges).toBeTrue();
    });

    it('should ignore messages that are not subform changes', () => {
      eventMessage.emitUpdateOffer(true);

      expect(component.hasChanges).toBeFalse();
    });
  });

  describe('canAdvance', () => {
    it('should defer to isFormValid in update mode', () => {
      component.formType = 'update';
      (component as any).isFormValid = true;
      expect(component.canAdvance).toBeTrue();

      (component as any).isFormValid = false;
      expect(component.canAdvance).toBeFalse();
    });

    it('should defer to validateCurrentStep in create mode', () => {
      component.formType = 'create';
      component.currentStepId = 'price';

      expect(component.canAdvance).toBeTrue();
    });
  });

  describe('onStepChanged', () => {
    it('should update the current step id', () => {
      component.onStepChanged({ stepId: 'license' } as any);

      expect(component.currentStepId).toBe('license');
    });

    it('should show the contract definition step when leaving an EDC-compatible product spec with DSP enabled', () => {
      environment.DSP_ENABLED = true;
      environment.DATA_SPACE_ENABLED = true;
      component.currentStepId = 'productSpec';
      component.productOfferForm.patchValue({ prodSpec: { id: 'spec-1', externalId: 'edc-1' } });

      component.onStepChanged({ stepId: 'license' } as any);

      expect(component.showContractDefinitionStep).toBeTrue();

      environment.DSP_ENABLED = false;
      environment.DATA_SPACE_ENABLED = false;
    });

    it('should hide the contract definition step when the product spec is not EDC-compatible', () => {
      component.currentStepId = 'productSpec';
      component.productOfferForm.patchValue({ prodSpec: { id: 'spec-1' } });

      component.onStepChanged({ stepId: 'license' } as any);

      expect(component.showContractDefinitionStep).toBeFalse();
    });

    it('should leave showContractDefinitionStep untouched when leaving a step other than productSpec', () => {
      component.currentStepId = 'general';
      component.showContractDefinitionStep = true;

      component.onStepChanged({ stepId: 'category' } as any);

      expect(component.showContractDefinitionStep).toBeTrue();
    });
  });

  describe('validateCurrentStep', () => {
    it('should require valid general info, and a catalogue when catalog selection is required', () => {
      component.currentStepId = 'general';
      component.catalogManagementEnabled = true;
      component.formType = 'create';

      expect(component.validateCurrentStep()).toBeFalse();

      component.productOfferForm.patchValue({ catalogue: { id: 'cat-1' } });

      expect(component.validateCurrentStep()).toBeTrue();
    });

    it('should not require a catalogue on the general step when catalog management is disabled', () => {
      component.currentStepId = 'general';
      component.catalogManagementEnabled = false;

      expect(component.validateCurrentStep()).toBeTrue();
    });

    it('should require a selected product specification', () => {
      component.currentStepId = 'productSpec';
      expect(component.validateCurrentStep()).toBeFalse();

      component.productOfferForm.patchValue({ prodSpec: { id: 'spec-1' } });
      expect(component.validateCurrentStep()).toBeTrue();
    });

    it('should require a selected root category', () => {
      component.currentStepId = 'category';
      expect(component.validateCurrentStep()).toBeFalse();

      component.selectedRootCategoryId = 'root-1';
      expect(component.validateCurrentStep()).toBeTrue();
    });

    it('should require a valid license group', () => {
      component.currentStepId = 'license';
      (component.productOfferForm.get('license') as FormGroup).addControl(
        'description', new FormControl('', Validators.required)
      );
      expect(component.validateCurrentStep()).toBeFalse();

      component.productOfferForm.get('license')?.patchValue({ description: 'Terms' });
      expect(component.validateCurrentStep()).toBeTrue();
    });

    it('should require a valid contract definition group', () => {
      component.currentStepId = 'contractDefinition';
      (component.productOfferForm.get('edcContractDefinition') as FormGroup).addControl(
        'name', new FormControl('', Validators.required)
      );
      expect(component.validateCurrentStep()).toBeFalse();

      component.productOfferForm.get('edcContractDefinition')?.patchValue({ name: 'edc:contractDefinition' });
      expect(component.validateCurrentStep()).toBeTrue();
    });

    it('should always allow advancing past the price step', () => {
      component.currentStepId = 'price';
      expect(component.validateCurrentStep()).toBeTrue();
    });

    it('should require a valid procurement mode group', () => {
      component.currentStepId = 'procurement';
      (component.productOfferForm.get('procurementMode') as FormGroup).addControl(
        'mode', new FormControl('', Validators.required)
      );
      expect(component.validateCurrentStep()).toBeFalse();

      component.productOfferForm.get('procurementMode')?.patchValue({ mode: 'manual' });
      expect(component.validateCurrentStep()).toBeTrue();
    });

    it('should allow advancing past any other step', () => {
      component.currentStepId = 'summary';
      expect(component.validateCurrentStep()).toBeTrue();
    });
  });

  describe('submitForm', () => {
    it('should create the offer in create mode', () => {
      const createSpy = spyOn(component, 'createOffer');

      component.formType = 'create';
      component.submitForm();

      expect(createSpy).toHaveBeenCalled();
    });

    it('should emit UpdateOffer and update the offer in update mode', () => {
      const updateSpy = spyOn(component, 'updateOffer');
      const emitSpy = spyOn(eventMessage, 'emitUpdateOffer');

      component.formType = 'update';
      component.submitForm();

      expect(emitSpy).toHaveBeenCalledWith(true);
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnInit', () => {
    it('should load categories and the offer data in update mode', async () => {
      component.formType = 'update';
      component.offer = { id: 'offer-1', category: [] };
      const loadCategoriesSpy = spyOn(component, 'loadCategories').and.returnValue(Promise.resolve());
      const loadOfferDataSpy = spyOn(component, 'loadOfferData').and.returnValue(Promise.resolve());

      await component.ngOnInit();

      expect(loadCategoriesSpy).toHaveBeenCalled();
      expect(loadOfferDataSpy).toHaveBeenCalled();
      expect(component.loadingData).toBeFalse();
    });

    it('should load categories and open the manual catalog selector when catalog management is enabled', async () => {
      component.formType = 'create';
      component.catalogManagementEnabled = true;
      const loadCategoriesSpy = spyOn(component, 'loadCategories').and.returnValue(Promise.resolve());
      const loadAvailableCatalogsSpy = spyOn(component, 'loadAvailableCatalogs').and.returnValue(Promise.resolve());
      const ensureCatalogueSpy = spyOn(component, 'ensureCatalogue');

      await component.ngOnInit();

      expect(loadCategoriesSpy).toHaveBeenCalled();
      expect(loadAvailableCatalogsSpy).toHaveBeenCalled();
      expect(ensureCatalogueSpy).not.toHaveBeenCalled();
    });

    it('should auto-assign a catalogue when catalog management is disabled', async () => {
      component.formType = 'create';
      component.catalogManagementEnabled = false;
      spyOn(component, 'loadCategories').and.returnValue(Promise.resolve());
      const loadAvailableCatalogsSpy = spyOn(component, 'loadAvailableCatalogs');
      const ensureCatalogueSpy = spyOn(component, 'ensureCatalogue');

      await component.ngOnInit();

      expect(ensureCatalogueSpy).toHaveBeenCalled();
      expect(loadAvailableCatalogsSpy).not.toHaveBeenCalled();
    });
  });

  describe('catalogSelectionRequired', () => {
    it('should require manual selection only when catalog management is enabled and creating an offer', () => {
      component.catalogManagementEnabled = true;
      component.formType = 'create';
      expect(component.catalogSelectionRequired()).toBeTrue();

      component.formType = 'update';
      expect(component.catalogSelectionRequired()).toBeFalse();

      component.formType = 'create';
      component.catalogManagementEnabled = false;
      expect(component.catalogSelectionRequired()).toBeFalse();
    });
  });

  describe('loadAvailableCatalogs', () => {
    it('should do nothing without a resolved partyId', async () => {
      component.partyId = undefined;
      const spy = spyOn(api, 'getCatalogsByUser');

      await component.loadAvailableCatalogs();

      expect(spy).not.toHaveBeenCalled();
      expect(component.availableCatalogs).toEqual([]);
    });

    it('should load a single short page without paging further', async () => {
      component.partyId = 'party-1';
      const spy = spyOn(api, 'getCatalogsByUser').and.returnValue(Promise.resolve([{ id: 'cat-1' }]));

      await component.loadAvailableCatalogs();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(0, undefined, ['Active', 'Launched'], 'party-1');
      expect(component.availableCatalogs).toEqual([{ id: 'cat-1' }]);
      expect(component.loadingCatalogs).toBeFalse();
    });

    it('should keep paging while a full page keeps coming back', async () => {
      component.partyId = 'party-1';
      const fullPage = Array.from({ length: environment.CATALOG_LIMIT }, (_, i) => ({ id: `cat-${i}` }));
      const spy = spyOn(api, 'getCatalogsByUser').and.callFake((offset: any) =>
        offset === 0 ? Promise.resolve(fullPage) : Promise.resolve([{ id: 'cat-last' }])
      );

      await component.loadAvailableCatalogs();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(component.availableCatalogs.length).toBe(fullPage.length + 1);
    });

    it('should reset availableCatalogs and surface the error when the request fails', async () => {
      component.partyId = 'party-1';
      spyOn(api, 'getCatalogsByUser').and.returnValue(Promise.reject(new Error('boom')));
      spyOn(console, 'error');

      await component.loadAvailableCatalogs();

      expect(component.availableCatalogs).toEqual([]);
      expect(component.loadingCatalogs).toBeFalse();
    });
  });

  describe('onCatalogChange', () => {
    it('should select the matching catalogue and patch the form', () => {
      component.availableCatalogs = [{ id: 'cat-1', name: 'Catalog 1' }, { id: 'cat-2', name: 'Catalog 2' }];

      component.onCatalogChange({ target: { value: 'cat-2' } } as unknown as Event);

      expect(component.selectedCatalogId).toBe('cat-2');
      expect(component.productOfferForm.get('catalogue')?.value).toEqual({ id: 'cat-2', name: 'Catalog 2' });
    });

    it('should clear the catalogue when the empty option is selected', () => {
      component.availableCatalogs = [{ id: 'cat-1', name: 'Catalog 1' }];
      component.productOfferForm.patchValue({ catalogue: { id: 'cat-1' } });

      component.onCatalogChange({ target: { value: '' } } as unknown as Event);

      expect(component.selectedCatalogId).toBe('');
      expect(component.productOfferForm.get('catalogue')?.value).toBeNull();
    });
  });

  describe('ensureCatalogue', () => {
    it('should return the memoized catalogue without calling the API again', async () => {
      (component as any).autoCatalogue = { id: 'cached-cat' };
      const spy = spyOn(api, 'getCatalogsByUser');

      const result = await component.ensureCatalogue();

      expect(result).toEqual({ id: 'cached-cat' });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should do nothing without a resolved partyId', async () => {
      component.partyId = undefined;
      const result = await component.ensureCatalogue();

      expect(result).toBeNull();
    });

    it('should reuse the first existing catalogue for the party', async () => {
      component.partyId = 'party-1';
      spyOn(api, 'getCatalogsByUser').and.returnValue(Promise.resolve([{ id: 'existing-cat' }]));

      const result = await component.ensureCatalogue();

      expect(result).toEqual({ id: 'existing-cat' });
      expect(component.productOfferForm.get('catalogue')?.value).toEqual({ id: 'existing-cat' });
    });

    it('should create a default catalogue named after the logged-in user when none exist', async () => {
      component.partyId = 'party-1';
      spyOn(api, 'getCatalogsByUser').and.returnValue(Promise.resolve([]));
      spyOn(localStorage, 'getObject').and.returnValue({ id: 'party-1', logged_as: 'party-1', user: 'Jane Doe' });
      const postCatalogSpy = spyOn(api, 'postCatalog').and.returnValue(of({ id: 'created-cat', name: 'Jane Doe' }));

      const result = await component.ensureCatalogue();

      expect(postCatalogSpy).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Jane Doe' }));
      expect(result).toEqual({ id: 'created-cat', name: 'Jane Doe' });
    });

    it('should return null when no catalogue name can be resolved', async () => {
      component.partyId = 'party-1';
      spyOn(api, 'getCatalogsByUser').and.returnValue(Promise.resolve([]));
      spyOn(localStorage, 'getObject').and.returnValue({});
      spyOn(accountService, 'getUserInfo').and.returnValue(Promise.resolve({}));
      const postCatalogSpy = spyOn(api, 'postCatalog');

      const result = await component.ensureCatalogue();

      expect(result).toBeNull();
      expect(postCatalogSpy).not.toHaveBeenCalled();
    });
  });

  describe('loadCategories', () => {
    it('should use default catalog categories directly when primary categories mode is catalogFirstLevel', async () => {
      searchCategoriesConfig.primaryCategoriesMode = 'catalogFirstLevel';
      const categories = [{ id: 'cat-1', name: 'Category 1' }, { id: 'cat-2', name: 'Category 2' }];
      spyOn(api, 'getDefaultCategories').and.returnValue(Promise.resolve(categories));
      const getCategoriesByParentIdSpy = spyOn(api, 'getCategoriesByParentId');

      await component.loadCategories();

      expect(component.availableRootCategories).toEqual(categories);
      expect(getCategoriesByParentIdSpy).not.toHaveBeenCalled();
    });

    it('should use the configured primary root when primary categories mode is rooted', async () => {
      searchCategoriesConfig.primaryCategoriesMode = 'rooted';
      searchCategoriesConfig.primaryRootName = 'Service Categories';
      spyOn(api, 'getDefaultCategories').and.returnValue(Promise.resolve([
        { id: 'root-1', name: 'Service Categories' },
        { id: 'root-2', name: 'Other Root' }
      ]));
      spyOn(api, 'getCategoriesByParentId').and.returnValue(Promise.resolve([{ id: 'compute', name: 'Compute' }]));

      await component.loadCategories();

      expect(api.getCategoriesByParentId).toHaveBeenCalledOnceWith('root-1');
      expect(component.availableRootCategories).toEqual([{ id: 'compute', name: 'Compute' }]);
    });

    it('should reset the root categories when loading fails', async () => {
      spyOn(api, 'getDefaultCategories').and.returnValue(Promise.reject(new Error('boom')));
      spyOn(console, 'error');

      await component.loadCategories();

      expect(component.availableRootCategories).toEqual([]);
      expect(component.loadingCategories).toBeFalse();
    });
  });

  describe('onRootCategoryChange / onSubcategoryChange', () => {
    beforeEach(() => {
      component.availableRootCategories = [{ id: 'root-1', name: 'Root 1' }, { id: 'root-2', name: 'Root 2' }];
    });

    it('should patch the selected root category and load its subcategories', async () => {
      spyOn(api, 'getCategoriesByParentId').and.returnValue(Promise.resolve([{ id: 'sub-1', name: 'Sub 1' }]));

      await component.onRootCategoryChange({ target: { value: 'root-1' } } as unknown as Event);

      expect(component.selectedRootCategoryId).toBe('root-1');
      expect(component.availableSubcategories).toEqual([{ id: 'sub-1', name: 'Sub 1' }]);
      expect(component.productOfferForm.get('category')?.value).toEqual([{ id: 'root-1', name: 'Root 1' }]);
    });

    it('should replay the category change through handleSubformChange in update mode', async () => {
      component.formType = 'update';
      spyOn(api, 'getCategoriesByParentId').and.returnValue(Promise.resolve([]));

      await component.onRootCategoryChange({ target: { value: 'root-1' } } as unknown as Event);

      expect(component.hasChanges).toBeTrue();
    });

    it('should replace the selected subcategory while keeping the root category', () => {
      component.availableSubcategories = [{ id: 'sub-1', name: 'Sub 1' }, { id: 'sub-2', name: 'Sub 2' }];
      component.productOfferForm.patchValue({ category: [{ id: 'root-1', name: 'Root 1' }, { id: 'sub-1', name: 'Sub 1' }] });

      component.onSubcategoryChange({ target: { value: 'sub-2' } } as unknown as Event);

      expect(component.selectedSubcategoryId).toBe('sub-2');
      expect(component.productOfferForm.get('category')?.value).toEqual([
        { id: 'root-1', name: 'Root 1' },
        { id: 'sub-2', name: 'Sub 2' }
      ]);
    });
  });

  describe('loadOfferData', () => {
    it('should load the product specification into the form', async () => {
      component.offer = { productSpecification: { id: 'spec-1' } };
      spyOn(api, 'getProductSpecification').and.returnValue(Promise.resolve({ id: 'spec-1', name: 'Spec 1' }));

      await component.loadOfferData();

      expect(component.selectedProdSpec).toEqual({ id: 'spec-1', name: 'Spec 1' });
      expect(component.productOfferForm.get('prodSpec')?.value).toEqual({ id: 'spec-1', name: 'Spec 1' });
    });

    it('should snapshot the original category value and patch the form', async () => {
      const categories = [{ id: 'cat-1', name: 'Cat 1' }];
      component.offer = { category: categories };

      await component.loadOfferData();

      expect(component.productOfferForm.get('category')?.value).toEqual(categories);
      expect((component as any).originalCategoryValue).toEqual(categories);
      expect((component as any).originalCategoryValue).not.toBe(categories);
    });

    it('should load the license description when a License term is present', async () => {
      component.offer = { productOfferingTerm: [{ name: 'License', description: 'Terms text' }] };

      await component.loadOfferData();

      expect(component.productOfferForm.get('license')?.value).toEqual({ treatment: 'License', description: 'Terms text' });
    });

    it('should default to an empty license description when no License term is present', async () => {
      component.offer = { productOfferingTerm: [{ name: 'procurement', description: 'manual' }] };

      await component.loadOfferData();

      expect(component.productOfferForm.get('license')?.value).toEqual({ treatment: 'License', description: '' });
    });

    it('should load the procurement mode when a procurement term is present', async () => {
      component.offer = { productOfferingTerm: [{ name: 'procurement', description: 'automatic' }] };

      await component.loadOfferData();

      expect(component.productOfferForm.get('procurementMode')?.value).toEqual({ id: 'automatic', name: 'automatic' });
    });

    it('should default to manual procurement when no procurement term is present', async () => {
      component.offer = { productOfferingTerm: [{ name: 'License', description: '' }] };

      await component.loadOfferData();

      expect(component.productOfferForm.get('procurementMode')?.value).toEqual({ id: 'manual', name: 'Manual' });
    });

    it('should load bundled price plans from the API', async () => {
      component.offer = { productOfferingPrice: [{ id: 'plan-1' }] };
      spyOn(api, 'getOfferingPrice').and.callFake((id: any) => {
        if (id === 'plan-1') {
          return Promise.resolve({
            id: 'plan-1',
            name: 'Flex plan',
            description: 'A plan',
            lifecycleStatus: 'Active',
            bundledPopRelationship: [{ id: 'comp-1' }]
          });
        }
        return Promise.resolve({
          id: 'comp-1',
          name: 'Base price',
          priceType: 'one time',
          price: { unit: 'EUR', value: 10 }
        });
      });

      await component.loadOfferData();

      expect(component.pricePlans.length).toBe(1);
      expect(component.pricePlans[0]).toEqual(jasmine.objectContaining({ id: 'plan-1', name: 'Flex plan' }));
      expect(component.pricePlans[0].priceComponents).toEqual([jasmine.objectContaining({ id: 'comp-1', name: 'Base price', price: 10 })]);
      expect(component.productOfferForm.get('pricePlans')?.value).toEqual(component.pricePlans);
    });
  });

  describe('saveOfferInfo', () => {
    function fillMinimalForm() {
      component.productOfferForm.patchValue({
        generalInfo: { name: 'Offer name', version: '1.0.0' },
        category: [{ id: 'cat-1' }],
        license: { description: 'Terms' },
        procurementMode: { mode: 'manual' },
        pricePlans: []
      });
    }

    it('should block creation without an available catalogue', () => {
      fillMinimalForm();
      component.formType = 'create';
      component.autoCatalogue = null;

      component.saveOfferInfo();

      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toContain('No catalogue available');
    });

    it('should create the offer against the resolved catalogue and go back on success', () => {
      fillMinimalForm();
      component.formType = 'create';
      component.autoCatalogue = { id: 'cat-1' };
      const postSpy = spyOn(api, 'postProductOffering').and.returnValue(of({ id: 'offer-1' }));
      const navigateSpy = spyOn(router, 'navigate');

      component.saveOfferInfo();

      expect(postSpy).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Offer name', version: '1.0.0' }), 'cat-1');
      expect(navigateSpy).toHaveBeenCalledWith([SellerOfferingsPaths.offers.list()]);
      expect(component.loading).toBeFalse();
    });

    it('should update the offer in update mode', () => {
      fillMinimalForm();
      component.formType = 'update';
      component.offer = { id: 'offer-1' };
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({ id: 'offer-1' }));

      component.saveOfferInfo();

      expect(updateSpy).toHaveBeenCalledWith(jasmine.any(Object), 'offer-1');
    });

    it('should deduplicate repeated category ids', () => {
      component.productOfferForm.patchValue({
        generalInfo: { name: 'Offer name', version: '1.0.0' },
        category: [{ id: 'cat-1' }, { id: 'cat-1' }, { id: 'cat-2' }],
        license: { description: '' },
        procurementMode: { mode: 'manual' },
        pricePlans: []
      });
      component.formType = 'create';
      component.autoCatalogue = { id: 'cat-1' };
      spyOn(api, 'postProductOffering').and.returnValue(of({ id: 'offer-1' }));

      component.saveOfferInfo();

      expect(component.offerToCreate?.category).toEqual([{ id: 'cat-1', href: 'cat-1' }, { id: 'cat-2', href: 'cat-2' }]);
    });

    it('should surface an error message when the request fails', () => {
      fillMinimalForm();
      component.formType = 'create';
      component.autoCatalogue = { id: 'cat-1' };
      spyOn(api, 'postProductOffering').and.returnValue(throwError(() => ({ error: { error: 'Bad request' } })));

      component.saveOfferInfo();

      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toBe('Error: Bad request');
      expect(component.loading).toBeFalse();
    });
  });

  describe('createOffer', () => {
    it('should save the offer info directly when there are no price plans', async () => {
      component.productOfferForm.patchValue({ pricePlans: [] });
      const saveSpy = spyOn(component, 'saveOfferInfo');

      await component.createOffer();

      expect(saveSpy).toHaveBeenCalled();
      expect(component.loading).toBeTrue();
    });

    it('should create every price component, bundle them and save once the last plan is processed', async () => {
      component.productOfferForm.patchValue({
        pricePlans: [{
          currency: 'EUR',
          name: 'Flex plan',
          priceComponents: [{ name: 'Base price', priceType: 'one time', price: 10 }]
        }]
      });
      spyOn(api, 'postOfferingPrice').and.returnValues(
        of({ id: 'created-component', name: 'Base price' }),
        of({ id: 'created-plan', name: 'Flex plan' })
      );
      const saveSpy = spyOn(component, 'saveOfferInfo');

      await component.createOffer();

      expect(saveSpy).toHaveBeenCalled();
      expect(component.productOfferForm.value.pricePlans[0].id).toBe('created-plan');
    });

    it('should report an API error without blocking the remaining plans', async () => {
      component.productOfferForm.patchValue({
        pricePlans: [{ currency: 'EUR', name: 'Broken plan', priceComponents: [{ name: 'Base', priceType: 'one time', price: 5 }] }]
      });
      spyOn(api, 'postOfferingPrice').and.returnValue(throwError(() => ({ error: { error: 'Boom' } })));
      const saveSpy = spyOn(component, 'saveOfferInfo');

      await component.createOffer();

      expect(component.showError).toBeTrue();
      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('goBack', () => {
    it('should navigate to the offers list', () => {
      const navigateSpy = spyOn(router, 'navigate');

      component.goBack();

      expect(navigateSpy).toHaveBeenCalledWith([SellerOfferingsPaths.offers.list()]);
    });
  });

  describe('addToISOString', () => {
    it('should add the given duration to the current time for known units', () => {
      const iso = component.addToISOString(1, 'month');
      expect(new Date(iso).getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw for an unrecognized unit', () => {
      expect(() => component.addToISOString(1, 'decade')).toThrowError(/Invalid unit/);
    });
  });

  describe('calculateDiscountDuration', () => {
    it('should compute the difference between two dates in the given unit', () => {
      const duration = component.calculateDiscountDuration(
        { startDateTime: '2026-01-01T00:00:00.000Z', endDateTime: '2026-01-31T00:00:00.000Z' },
        'days'
      );

      expect(duration).toBe(30);
    });
  });

  describe('updateOffer', () => {
    function baseOffer() {
      return {
        id: 'offer-1',
        name: 'Old name',
        description: 'Old description',
        lifecycleStatus: 'Active',
        version: '1.0.0',
        category: [{ id: 'cat-1', href: 'cat-1' }],
        productOfferingPrice: [{ id: 'plan-1', href: 'plan-1' }],
        validFor: { startDateTime: '2026-01-01T00:00:00.000Z' },
        productOfferingTerm: [{ name: 'License', description: 'Old terms' }]
      };
    }

    it('should send the offer unchanged when no subform reported a change', async () => {
      component.offer = baseOffer();
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Old name' }), 'offer-1');
    });

    it('should apply a general info change', async () => {
      component.offer = baseOffer();
      eventMessage.emitSubformChange({
        subformType: 'generalInfo',
        isDirty: true,
        dirtyFields: ['name'],
        originalValue: {},
        currentValue: { name: 'New name', description: 'New description', version: '2.0.0', status: 'Launched' }
      });
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      expect(updateSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        name: 'New name', description: 'New description', version: '2.0.0', lifecycleStatus: 'Launched'
      }), 'offer-1');
    });

    it('should apply a license change onto the existing License term', async () => {
      component.offer = baseOffer();
      eventMessage.emitSubformChange({
        subformType: 'license', isDirty: true, dirtyFields: ['description'],
        originalValue: { description: 'Old terms' }, currentValue: { description: 'New terms' }
      });
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      const payload = updateSpy.calls.mostRecent().args[0];
      expect(payload.productOfferingTerm).toContain(jasmine.objectContaining({ name: 'License', description: 'New terms' }));
    });

    it('should add a License term when none previously existed', async () => {
      component.offer = { ...baseOffer(), productOfferingTerm: [{ name: 'procurement', description: 'manual' }] };
      eventMessage.emitSubformChange({
        subformType: 'license', isDirty: true, dirtyFields: ['description'],
        originalValue: { description: '' }, currentValue: { description: 'New terms' }
      });
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      const payload = updateSpy.calls.mostRecent().args[0];
      expect(payload.productOfferingTerm[0]).toEqual({ name: 'License', description: 'New terms' });
    });

    it('should apply a procurement mode change and add pricing algorithm when external billing is enabled', async () => {
      component.offer = baseOffer();
      eventMessage.emitSubformChange({
        subformType: 'procurement', isDirty: true, dirtyFields: ['mode'],
        originalValue: { extBillingEnabled: false },
        currentValue: { id: 'automatic', extBillingEnabled: true, plaSpecId: 'pla-1' }
      });
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      const payload = updateSpy.calls.mostRecent().args[0];
      expect(payload.productOfferingTerm).toContain(jasmine.objectContaining({ name: 'procurement', description: 'automatic' }));
      expect(payload.pricingLogicAlgorithm).toEqual([{ name: 'external billing', plaSpecId: 'pla-1' }]);
    });

    it('should apply a category change', async () => {
      component.offer = baseOffer();
      eventMessage.emitSubformChange({
        subformType: 'category', isDirty: true, dirtyFields: ['category'],
        originalValue: [], currentValue: [{ id: 'cat-2' }]
      });
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      const payload = updateSpy.calls.mostRecent().args[0];
      expect(payload.category).toEqual([{ id: 'cat-2', href: 'cat-2' }]);
    });

    it('should add an EDC contract definition term when the contract becomes DSP compatible', async () => {
      component.offer = baseOffer();
      eventMessage.emitSubformChange({
        subformType: 'contractDefinition', isDirty: true, dirtyFields: ['dspCompatible'],
        originalValue: {}, currentValue: { dspCompatible: true, name: 'edc:contractDefinition', contractPolicy: '{}', accessPolicy: '{}' }
      });
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      const payload = updateSpy.calls.mostRecent().args[0];
      expect(payload.productOfferingTerm.some((term: any) => term.name === 'edc:contractDefinition')).toBeTrue();
    });

    it('should remove the EDC contract definition term when the contract stops being DSP compatible', async () => {
      component.offer = {
        ...baseOffer(),
        productOfferingTerm: [...baseOffer().productOfferingTerm, { name: 'edc:contractDefinition', accessPolicy: {}, contractPolicy: {} }]
      };
      eventMessage.emitSubformChange({
        subformType: 'contractDefinition', isDirty: true, dirtyFields: ['dspCompatible'],
        originalValue: { dspCompatible: true }, currentValue: { dspCompatible: false }
      });
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      const payload = updateSpy.calls.mostRecent().args[0];
      expect(payload.productOfferingTerm.some((term: any) => term.name === 'edc:contractDefinition')).toBeFalse();
    });

    it('should patch an existing price plan when only its metadata changed', async () => {
      component.offer = baseOffer();
      eventMessage.emitSubformChange({
        subformType: 'pricePlans', isDirty: true, dirtyFields: ['pricePlans'],
        originalValue: [], currentValue: [{ id: 'plan-1' }],
        priceComponentsChanged: false, profileChanged: false,
        modifiedPricePlans: [{
          id: 'plan-1',
          isNew: false,
          newValue: { name: 'Renamed plan', currency: 'EUR' },
          modifiedFields: ['name'],
          priceComponents: { added: [], modified: [] }
        }]
      } as any);
      const updatePlanSpy = spyOn(component, 'updatePricePlan').and.returnValue(Promise.resolve({ id: 'plan-1' } as any));
      const updateSpy = spyOn(api, 'updateProductOffering').and.returnValue(of({}));

      await component.updateOffer();

      expect(updatePlanSpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should navigate back on success', async () => {
      component.offer = baseOffer();
      spyOn(api, 'updateProductOffering').and.returnValue(of({}));
      const navigateSpy = spyOn(router, 'navigate');

      await component.updateOffer();

      expect(navigateSpy).toHaveBeenCalledWith([SellerOfferingsPaths.offers.list()]);
      expect(component.loading).toBeFalse();
    });

    it('should surface an error message when the update request fails', async () => {
      component.offer = baseOffer();
      spyOn(api, 'updateProductOffering').and.returnValue(throwError(() => ({ error: { error: 'Boom' } })));

      await component.updateOffer();

      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toBe('Error: Boom');
      expect(component.loading).toBeFalse();
    });
  });
});
