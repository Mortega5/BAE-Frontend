import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';

import { UpdateProductSpecComponent } from './update-product-spec.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { AttachmentServiceService } from 'src/app/services/attachment-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';

class SyncFileReaderMock {
  onload: ((event: any) => void) | null = null;

  readAsDataURL(_file: File): void {
    if (this.onload) {
      this.onload({ target: { result: 'data:text/plain;base64,Zm9v' } });
    }
  }
}

const asJwt = (payload: any): string => {
  const encode = (value: any) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
};

const mockDroppedFile = (file: any): any => {
  return {
    relativePath: file.name,
    fileEntry: {
      isFile: true,
      file: (cb: (f: any) => void) => cb(file)
    }
  };
};

describe('UpdateProductSpecComponent', () => {
  let component: UpdateProductSpecComponent;
  let fixture: ComponentFixture<UpdateProductSpecComponent>;

  let messages$: Subject<any>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let prodSpecServiceSpy: jasmine.SpyObj<ProductSpecServiceService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let attachmentServiceSpy: jasmine.SpyObj<AttachmentServiceService>;
  let servSpecServiceSpy: jasmine.SpyObj<ServiceSpecServiceService>;
  let resSpecServiceSpy: jasmine.SpyObj<ResourceSpecServiceService>;
  let paginationServiceSpy: jasmine.SpyObj<PaginationService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteStub: { snapshot: { paramMap: any } };
  let originalFileReader: any;

  const defaultPaginationData = {
    page_check: true,
    items: [{ id: 'item-1' }],
    nextItems: [{ id: 'item-2' }],
    page: 10
  };

  const baseProd = {
    id: 'prod-1',
    name: 'Product',
    description: 'Description',
    lifecycleStatus: 'Active',
    isBundle: false,
    brand: 'Brand',
    version: '1.0',
    productNumber: 'PN-1',
    productSpecCharacteristic: [],
    resourceSpecification: [],
    serviceSpecification: [],
    attachment: [],
    bundledProductSpecification: [],
    productSpecificationRelationship: []
  };

  beforeEach(async () => {
    messages$ = new Subject<any>();
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getProducts']);
    prodSpecServiceSpy = jasmine.createSpyObj<ProductSpecServiceService>('ProductSpecServiceService', [
      'getProdSpecByUser', 'getResSpecById', 'updateProdSpec'
    ]);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>(
      'EventMessageService',
      [],
      { messages$: messages$.asObservable() }
    );
    attachmentServiceSpy = jasmine.createSpyObj<AttachmentServiceService>('AttachmentServiceService', ['uploadFile']);
    servSpecServiceSpy = jasmine.createSpyObj<ServiceSpecServiceService>('ServiceSpecServiceService', ['getServiceSpecByUserPaged']);
    resSpecServiceSpy = jasmine.createSpyObj<ResourceSpecServiceService>('ResourceSpecServiceService', ['getResourceSpecByUserPaged']);
    paginationServiceSpy = jasmine.createSpyObj<PaginationService>('PaginationService', ['getItemsPaginated']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    activatedRouteStub = { snapshot: { paramMap: convertToParamMap({ id: 'prod-1' }) } };

    localStorageSpy.getObject.and.returnValue({});
    attachmentServiceSpy.uploadFile.and.returnValue(of({ content: 'https://uploaded.file' }));
    prodSpecServiceSpy.getResSpecById.and.resolveTo({ ...baseProd });
    prodSpecServiceSpy.updateProdSpec.and.returnValue(of({ id: 'updated' }));
    paginationServiceSpy.getItemsPaginated.and.resolveTo(defaultPaginationData);

    await TestBed.configureTestingModule({
      declarations: [UpdateProductSpecComponent],
      imports: [RouterTestingModule, TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        DatePipe,
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: ProductSpecServiceService, useValue: prodSpecServiceSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: AttachmentServiceService, useValue: attachmentServiceSpy },
        { provide: ServiceSpecServiceService, useValue: servSpecServiceSpy },
        { provide: ResourceSpecServiceService, useValue: resSpecServiceSpy },
        { provide: PaginationService, useValue: paginationServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ]
    })
    .overrideComponent(UpdateProductSpecComponent, {
      set: { template: '' },
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateProductSpecComponent);
    component = fixture.componentInstance;
    component.attachName = { nativeElement: { value: '' } } as any;
    component.imgURL = { nativeElement: { value: '' } } as any;
    component.certificationName = { nativeElement: { value: '' } } as any;
  });

  beforeEach(() => {
    component.steps = [{ label: 'General Info', id: 'general' }] as any;
    originalFileReader = (window as any).FileReader;
    (window as any).FileReader = SyncFileReaderMock as any;
  });

  afterEach(() => {
    (window as any).FileReader = originalFileReader;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load available ISOs in constructor and react to ChangedSession event', () => {
    expect(component.availableISOS.length).toBeGreaterThan(0);
    const initSpy = spyOn(component, 'initPartyInfo');
    messages$.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalled();
  });

  it('should stop reacting to events after ngOnDestroy', () => {
    const initSpy = spyOn(component, 'initPartyInfo');
    messages$.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
    messages$.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('onClick should hide the upload panel and trigger detectChanges when open', () => {
    component.showUploadFile = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.onClick();
    expect(component.showUploadFile).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('onClick should do nothing when the upload panel is already closed', () => {
    component.showUploadFile = false;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.onClick();
    expect(detectSpy).not.toHaveBeenCalled();
  });

  describe('ngOnInit', () => {
    it('should call initPartyInfo, load the product by route id and populate the form', async () => {
      const initSpy = spyOn(component, 'initPartyInfo');
      const populateSpy = spyOn(component, 'populateProductInfo');

      await component.ngOnInit();

      expect(initSpy).toHaveBeenCalled();
      expect(prodSpecServiceSpy.getResSpecById).toHaveBeenCalledWith('prod-1');
      expect(component.prod).toEqual(jasmine.objectContaining({ id: 'prod-1' }));
      expect(populateSpy).toHaveBeenCalled();
      expect(component.loading).toBeFalse();
      expect(component.notFound).toBeFalse();
    });

    it('should set loading false and leave prod undefined when the fetch fails', async () => {
      prodSpecServiceSpy.getResSpecById.and.rejectWith(new Error('not found'));
      spyOn(console, 'error');

      await component.ngOnInit();

      expect(component.prod).toBeUndefined();
      expect(component.loading).toBeFalse();
      expect(component.notFound).toBeTrue();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('notFound getter', () => {
    it('should be false while loading regardless of prod', () => {
      component.loading = true;
      component.prod = undefined;
      expect(component.notFound).toBeFalse();
      component.prod = { id: '1' };
      expect(component.notFound).toBeFalse();
    });

    it('should be true only when not loading and prod is missing', () => {
      component.loading = false;
      component.prod = undefined;
      expect(component.notFound).toBeTrue();
      component.prod = { id: '1' };
      expect(component.notFound).toBeFalse();
    });
  });

  it('goBack should navigate to the product specs list', () => {
    component.goBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.productSpecs.list()]);
  });

  describe('canAdvance', () => {
    it('should require a valid general form on the general step', () => {
      component.currentStepId = 'general';
      component.generalForm.reset();
      expect(component.canAdvance).toBeFalse();
      component.generalForm.patchValue({ name: 'N', brand: 'B', version: '1.0' });
      expect(component.canAdvance).toBeTrue();
    });

    it('should require at least 2 bundled products when bundle is checked', () => {
      component.currentStepId = 'bundle';
      component.bundleChecked = true;
      component.prodSpecsBundle = [{ id: '1' } as any];
      expect(component.canAdvance).toBeFalse();
      component.prodSpecsBundle = [{ id: '1' } as any, { id: '2' } as any];
      expect(component.canAdvance).toBeTrue();
    });

    it('should allow advancing on the bundle step when bundle is unchecked', () => {
      component.currentStepId = 'bundle';
      component.bundleChecked = false;
      component.prodSpecsBundle = [];
      expect(component.canAdvance).toBeTrue();
    });

    it('should require valid ISO urls on the compliance step', () => {
      component.currentStepId = 'compliance';
      component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
      expect(component.canAdvance).toBeFalse();
      component.selectedISOS = [{ name: 'Compliance:ISO-A', url: 'https://doc' }];
      expect(component.canAdvance).toBeTrue();
    });

    it('should allow advancing on other steps', () => {
      component.currentStepId = 'characteristics';
      expect(component.canAdvance).toBeTrue();
    });
  });

  describe('onStepChanged', () => {
    it('should update currentStepId and refresh characteristics', () => {
      const refreshSpy = spyOn(component, 'refreshChars');
      component.onStepChanged({ step: 1, isLastStep: false, label: 'Chars', stepId: 'characteristics' });
      expect(component.currentStepId).toBe('characteristics');
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should request relationships when entering the relationships step', () => {
      const getRelSpy = spyOn(component, 'getProdSpecsRel');
      component.onStepChanged({ step: 2, isLastStep: false, label: 'Rel', stepId: 'relationships' });
      expect(getRelSpy).toHaveBeenCalledWith(false);
    });

    it('should build the final product data on the last step', () => {
      const showFinishSpy = spyOn(component, 'showFinish');
      component.onStepChanged({ step: 3, isLastStep: true, label: 'Summary', stepId: 'summary' });
      expect(showFinishSpy).toHaveBeenCalled();
    });
  });

  describe('initPartyInfo', () => {
    it('should set partyId when logged in directly', () => {
      localStorageSpy.getObject.and.returnValue({
        expire: Math.floor(Date.now() / 1000) + 500,
        logged_as: 'user-1',
        id: 'user-1',
        partyId: 'party-direct',
        organizations: []
      });
      component.initPartyInfo();
      expect(component.partyId).toBe('party-direct');
    });

    it('should set partyId from the logged organization', () => {
      localStorageSpy.getObject.and.returnValue({
        expire: Math.floor(Date.now() / 1000) + 500,
        logged_as: 'org-1',
        id: 'user-1',
        partyId: 'party-direct',
        organizations: [{ id: 'org-1', partyId: 'party-org' }]
      });
      component.initPartyInfo();
      expect(component.partyId).toBe('party-org');
    });

    it('should ignore expired or empty sessions', () => {
      component.partyId = 'kept-party';
      localStorageSpy.getObject.and.returnValue({});
      component.initPartyInfo();
      expect(component.partyId).toBe('kept-party');
    });
  });

  describe('populateProductInfo', () => {
    it('should fill the general form from prod data', () => {
      component.prod = { ...baseProd };
      component.populateProductInfo();
      expect(component.generalForm.value.name).toBe('Product');
      expect(component.generalForm.value.brand).toBe('Brand');
      expect(component.generalForm.value.version).toBe('1.0');
      expect(component.generalForm.value.lifecycleStatus).toBe('Active');
    });

    it('should preserve existing characteristic ids', () => {
      component.prod = {
        ...baseProd,
        productSpecCharacteristic: [
          {
            id: 'urn:ngsi-ld:characteristic:platinum-id',
            name: 'platinum',
            description: 'desc',
            productSpecCharacteristicValue: [{ isDefault: true, value: true }]
          }
        ]
      };

      component.populateProductInfo();

      expect(component.prodChars.length).toBe(1);
      expect(component.prodChars[0].id).toBe('urn:ngsi-ld:characteristic:platinum-id');
    });

    it('should decode Compliance:VC and expose the compliance level', () => {
      const vcToken = asJwt({ vc: { credentialSubject: { 'gx:labelLevel': 'P' } } });
      component.prod = {
        ...baseProd,
        productSpecCharacteristic: [
          {
            id: 'urn:ngsi-ld:characteristic:vc-id',
            name: 'Compliance:VC',
            productSpecCharacteristicValue: [{ isDefault: true, value: vcToken }]
          }
        ]
      };

      component.populateProductInfo();

      expect(component.complianceVCId).toBe('urn:ngsi-ld:characteristic:vc-id');
      expect(component.complianceVC).toBe(vcToken);
      expect(component.complianceLevel).toBe('P');
    });

    it('should trigger bundle loading when prod is a bundle', () => {
      const toggleSpy = spyOn(component, 'toggleBundleCheck');
      component.prod = { ...baseProd, isBundle: true, bundledProductSpecification: [{ id: 'b1' }] };

      component.populateProductInfo();

      expect(toggleSpy).toHaveBeenCalled();
      expect(component.prodSpecsBundle).toEqual([{ id: 'b1' } as any]);
    });

    it('should populate resource, service and attachment selections', () => {
      component.prod = {
        ...baseProd,
        resourceSpecification: [{ id: 'res-1' }],
        serviceSpecification: [{ id: 'serv-1' }],
        attachment: [{ name: 'Profile Picture', url: 'https://img', attachmentType: 'image/png' }]
      };

      component.populateProductInfo();

      expect(component.selectedResourceSpecs).toEqual([{ id: 'res-1' }] as any);
      expect(component.selectedServiceSpecs).toEqual([{ id: 'serv-1' }] as any);
      expect(component.showImgPreview).toBeTrue();
      expect(component.imgPreview).toBe('https://img');
    });

    it('should build orchestration plan config when prod has an orchestrationPlan', () => {
      component.prod = { ...baseProd, orchestrationPlan: { steps: [{ id: 'step-1' }] } };

      component.populateProductInfo();

      expect(component.blueprintConfig).toEqual({
        selectedItems: [],
        orchestrationSteps: [{ id: 'step-1' }],
        valid: true
      } as any);
    });
  });

  describe('hasUnsavedComplianceProfileChanges', () => {
    it('should return false when the compliance profile matches persisted data', () => {
      component.prod = {
        ...baseProd,
        productSpecCharacteristic: [
          {
            id: 'urn:ngsi-ld:characteristic:self-att',
            name: 'Compliance:SelfAtt',
            productSpecCharacteristicValue: [{ isDefault: true, value: 'https://self-attestation.pdf' }]
          },
          {
            id: 'urn:ngsi-ld:characteristic:custom-cert',
            name: 'Compliance:CustomCert',
            productSpecCharacteristicValue: [{ isDefault: true, value: 'https://custom-cert.pdf' }]
          }
        ]
      };

      component.populateProductInfo();

      expect(component.hasUnsavedComplianceProfileChanges()).toBeFalse();
    });

    it('should return true after the compliance profile changes without saving', () => {
      component.prod = {
        ...baseProd,
        productSpecCharacteristic: [
          {
            id: 'urn:ngsi-ld:characteristic:self-att',
            name: 'Compliance:SelfAtt',
            productSpecCharacteristicValue: [{ isDefault: true, value: 'https://self-attestation.pdf' }]
          },
          {
            id: 'urn:ngsi-ld:characteristic:custom-cert',
            name: 'Compliance:CustomCert',
            productSpecCharacteristicValue: [{ isDefault: true, value: 'https://custom-cert.pdf' }]
          }
        ]
      };

      component.populateProductInfo();
      component.additionalISOS[0].url = 'https://custom-cert-updated.pdf';

      expect(component.hasUnsavedComplianceProfileChanges()).toBeTrue();
    });
  });

  describe('bundle handling', () => {
    it('toggleBundleCheck should load products when bundle is enabled', () => {
      const getSpy = spyOn(component, 'getProdSpecs');
      component.bundleChecked = false;
      component.toggleBundleCheck();
      expect(component.bundleChecked).toBeTrue();
      expect(component.loadingBundle).toBeTrue();
      expect(getSpy).toHaveBeenCalledWith(false);
    });

    it('toggleBundleCheck should clear selected bundled products when disabled', () => {
      component.bundleChecked = true;
      component.prodSpecsBundle = [{ id: '1' } as any];
      component.toggleBundleCheck();
      expect(component.bundleChecked).toBeFalse();
      expect(component.prodSpecsBundle).toEqual([]);
    });

    it('getProdSpecs should update bundle pagination state', async () => {
      await component.getProdSpecs(false);
      expect(paginationServiceSpy.getItemsPaginated).toHaveBeenCalled();
      expect(component.bundlePageCheck).toBeTrue();
      expect(component.prodSpecs.length).toBe(1);
      expect(component.nextProdSpecs.length).toBe(1);
      expect(component.bundlePage).toBe(10);
      expect(component.loadingBundle).toBeFalse();
    });

    it('nextBundle should request the next products page', async () => {
      const spy = spyOn(component, 'getProdSpecs').and.resolveTo();
      await component.nextBundle();
      expect(spy).toHaveBeenCalledWith(true);
    });

    it('addProdToBundle and isProdInBundle should toggle bundle products', () => {
      const detectSpy = spyOn((component as any).cdr, 'detectChanges');
      const prod = { id: 'p1', href: 'h', lifecycleStatus: 'Active', name: 'Prod' };
      component.addProdToBundle(prod);
      expect(component.isProdInBundle(prod)).toBeTrue();
      component.addProdToBundle(prod);
      expect(component.isProdInBundle(prod)).toBeFalse();
      expect(detectSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('compliance ISO handling', () => {
    it('addISO should move an item from available to selected', () => {
      const detectSpy = spyOn((component as any).cdr, 'detectChanges');
      component.buttonISOClicked = false;
      component.availableISOS = [{ name: 'ISO123', mandatory: true, domesupported: false }];
      component.selectedISOS = [];
      component.addISO({ name: 'ISO123', mandatory: true, domesupported: false });
      expect(component.availableISOS.length).toBe(0);
      expect(component.selectedISOS[0].name).toBe('Compliance:ISO123');
      expect(component.buttonISOClicked).toBeTrue();
      expect(detectSpy).toHaveBeenCalled();
    });

    it('removeISO should move an item back to available', () => {
      const detectSpy = spyOn((component as any).cdr, 'detectChanges');
      component.selectedISOS = [{ name: 'Compliance:ISO123', mandatory: false, domesupported: true }];
      component.availableISOS = [];
      component.removeISO(component.selectedISOS[0]);
      expect(component.selectedISOS.length).toBe(0);
      expect(component.availableISOS[0].name).toBe('ISO123');
      expect(detectSpy).toHaveBeenCalled();
    });

    it('removeCert should delete an additional certification', () => {
      component.additionalISOS = [{ name: 'Compliance:extra', url: 'u' }];
      component.removeCert({ name: 'Compliance:extra' });
      expect(component.additionalISOS.length).toBe(0);
    });

    it('removeSelfAtt should clear the self attestation and remove it from finishChars', () => {
      component.selfAtt = { name: 'Compliance:SelfAtt' };
      component.finishChars = [{ name: 'Compliance:SelfAtt' } as any, { name: 'Other' } as any];
      component.removeSelfAtt();
      expect(component.selfAtt).toBe('');
      expect(component.finishChars.length).toBe(1);
      expect(component.finishChars[0].name).toBe('Other');
    });

    it('checkValidISOS should detect missing urls', () => {
      component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
      expect(component.checkValidISOS()).toBeTrue();
      component.selectedISOS = [{ name: 'Compliance:ISO-A', url: 'https://doc' }];
      expect(component.checkValidISOS()).toBeFalse();
    });

    it('hasSelfAttestation should reflect the presence of a self attestation value', () => {
      component.selfAtt = undefined;
      expect(component.hasSelfAttestation()).toBeFalse();
      component.selfAtt = { productSpecCharacteristicValue: [{ value: '  ' }] };
      expect(component.hasSelfAttestation()).toBeFalse();
      component.selfAtt = { productSpecCharacteristicValue: [{ value: 'https://self.pdf' }] };
      expect(component.hasSelfAttestation()).toBeTrue();
    });

    it('saveAdditionalCert and clearAdditionalCert should manage the additional cert draft', () => {
      component.certificationName = { nativeElement: { value: 'CustomISO' } } as any;
      component.isoToCreate = 'https://cert.url';
      component.showCert = true;
      component.saveAdditionalCert();
      expect(component.additionalISOS.length).toBe(1);
      expect(component.additionalISOS[0].name).toBe('Compliance:CustomISO');
      expect(component.isoToCreate).toBe('');
      expect(component.showCert).toBeFalse();

      component.certificationName = { nativeElement: { value: 'keep' } } as any;
      component.isoToCreate = 'x';
      component.clearAdditionalCert(true);
      expect(component.certificationName.nativeElement.value).toBe('keep');
      expect(component.isoToCreate).toBe('');

      component.isoToCreate = 'y';
      component.clearAdditionalCert(false);
      expect(component.certificationName.nativeElement.value).toBe('');
    });
  });

  describe('attachments (light touch)', () => {
    it('isValidFilename should validate names against the configured regex', () => {
      expect(component.isValidFilename('valid-file_1.0.txt')).toBeTrue();
      expect(component.isValidFilename('invalid name.txt')).toBeFalse();
    });

    it('dropped should reject an invalid filename before uploading', () => {
      component.currentStepId = 'attachments';
      const badFile = { name: 'bad name.txt', type: 'text/plain', size: 10 };
      component.dropped([mockDroppedFile(badFile)], 'attachment');
      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toContain('File names can only include alphabetical characters');
      expect(attachmentServiceSpy.uploadFile).not.toHaveBeenCalled();
    });

    it('dropped should upload an image attachment and set the preview', () => {
      component.currentStepId = 'attachments';
      const file = { name: 'picture.png', type: 'image/png', size: 200 };
      component.dropped([mockDroppedFile(file)], 'img');
      expect(component.showImgPreview).toBeTrue();
      expect(component.imgPreview).toBe('https://uploaded.file');
      expect(component.prodAttachments.length).toBe(1);
    });

    it('dropped should ignore directory entries', () => {
      const directoryEntry = { relativePath: 'folder', fileEntry: { isFile: false } };
      component.dropped([directoryEntry as any], 'ignored');
      expect(component.files.length).toBe(1);
      expect(attachmentServiceSpy.uploadFile).not.toHaveBeenCalled();
    });

    it('removeImg should remove the profile image attachment and clear the preview', () => {
      component.showImgPreview = true;
      component.imgPreview = 'https://img';
      component.prodAttachments = [{ name: 'Profile Picture', url: 'https://img', attachmentType: 'Picture' } as any];
      component.removeImg();
      expect(component.showImgPreview).toBeFalse();
      expect(component.imgPreview).toBe('');
      expect(component.prodAttachments.length).toBe(0);
    });

    it('saveImgFromURL should create a profile picture attachment from the URL field', () => {
      component.imgURL = { nativeElement: { value: 'https://site/image.png' } } as any;
      component.saveImgFromURL();
      expect(component.showImgPreview).toBeTrue();
      expect(component.imgPreview).toBe('https://site/image.png');
      expect(component.prodAttachments[0].name).toBe('Profile Picture');
    });

    it('removeAtt should remove an attachment and clear the image preview when needed', () => {
      component.showImgPreview = true;
      component.imgPreview = 'https://img';
      component.prodAttachments = [
        { name: 'Profile Picture', url: 'https://img', attachmentType: 'Picture' } as any,
        { name: 'Manual', url: 'https://manual', attachmentType: 'application/pdf' } as any
      ];
      component.removeAtt({ url: 'https://img' });
      expect(component.showImgPreview).toBeFalse();
      expect(component.prodAttachments.length).toBe(1);
    });

    it('saveAtt and clearAtt should manage the attachment draft lifecycle', () => {
      component.attachName = { nativeElement: { value: 'Manual' } } as any;
      component.attachToCreate = { url: 'https://manual.pdf', attachmentType: 'application/pdf' };
      component.showNewAtt = true;
      component.saveAtt();
      expect(component.prodAttachments.length).toBe(1);
      expect(component.prodAttachments[0].name).toBe('Manual');
      expect(component.attachToCreate.url).toBe('');
      expect(component.showNewAtt).toBeFalse();

      component.attachToCreate = { url: 'x', attachmentType: 'y' };
      component.clearAtt();
      expect(component.attachToCreate).toEqual({ url: '', attachmentType: '' });
    });
  });

  describe('characteristics', () => {
    it('refreshChars should restore the default characteristic creation state', () => {
      component.stringValue = 'x';
      component.numberValue = '2';
      component.rangeUnit = 'ms';
      component.jsonValue = '{"a":1}';
      component.charTypeSelected = 'number';
      component.creatingChars = [{ isDefault: true } as any];
      component.refreshChars();
      expect(component.stringValue).toBe('');
      expect(component.numberValue).toBe('');
      expect(component.rangeUnit).toBe('');
      expect(component.jsonValue).toBe('');
      expect(component.charTypeSelected).toBe('string');
      expect(component.creatingChars).toEqual([]);
    });

    it('addCharValue should add string values and mark the first as default', () => {
      component.charTypeSelected = 'string';
      component.stringValue = 'A';
      component.addCharValue();
      component.stringValue = 'B';
      component.addCharValue();
      expect(component.creatingChars.length).toBe(2);
      expect(component.creatingChars[0].isDefault).toBeTrue();
      expect(component.creatingChars[1].isDefault).toBeFalse();
    });

    it('addCharValue should add number values with a unit', () => {
      component.charTypeSelected = 'number';
      component.numberValue = '100';
      component.numberUnit = 'ms';
      component.addCharValue();
      expect(component.creatingChars[0].value as any).toBe('100');
      expect(component.creatingChars[0].unitOfMeasure).toBe('ms');
    });

    it('addCharValue should reject an invalid range', () => {
      component.charTypeSelected = 'range';
      component.fromValue = '10';
      component.toValue = '5';
      component.addCharValue();
      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toContain('Invalid range');
      expect(component.creatingChars.length).toBe(0);
    });

    it('addCharValue should add a valid range', () => {
      component.charTypeSelected = 'range';
      component.fromValue = '5';
      component.toValue = '10';
      component.rangeUnit = 'GB';
      component.addCharValue();
      expect(component.creatingChars[0].valueFrom as any).toBe('5');
      expect(component.creatingChars[0].valueTo as any).toBe('10');
    });

    it('addCharValue should parse and store a single JSON value', () => {
      component.charTypeSelected = 'credentialsConfiguration';
      component.jsonValue = '{"issuer":"did:example:123"}';
      component.addCharValue();
      expect(component.creatingChars.length).toBe(1);
      expect(component.creatingChars[0].value as any).toEqual({ issuer: 'did:example:123' });

      component.jsonValue = '{"issuer":"did:example:456"}';
      component.addCharValue();
      expect(component.creatingChars.length).toBe(1);
      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toBe('Only one JSON value is allowed');
    });

    it('addCharValue should reject invalid JSON', () => {
      component.charTypeSelected = 'authorizationPolicy';
      component.jsonValue = '{"policy":';
      component.addCharValue();
      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toBe('Invalid JSON format');
    });

    it('removeCharValue should splice out a value except for boolean type', () => {
      component.charTypeSelected = 'string';
      component.creatingChars = [{ isDefault: true, value: 'A' } as any, { isDefault: false, value: 'B' } as any];
      component.removeCharValue(component.creatingChars[0], 0);
      expect(component.creatingChars.length).toBe(1);

      component.charTypeSelected = 'boolean';
      component.creatingChars = [{ isDefault: true, value: true } as any, { isDefault: false, value: false } as any];
      component.removeCharValue(component.creatingChars[0], 0);
      expect(component.creatingChars.length).toBe(2);
    });

    it('saveChar should push the main characteristic and an optional "- enabled" toggle', () => {
      component.charsForm.patchValue({ name: 'Bandwidth', description: 'desc' });
      component.creatingChars = [{ isDefault: true, value: '1Gbps' } as any];
      component.isOptional = true;
      component.optionalDftTrue = true;
      component.saveChar();
      expect(component.prodChars.length).toBe(2);
      expect(component.prodChars[0].name).toBe('Bandwidth');
      expect(component.prodChars[1].name).toBe('Bandwidth - enabled');
      expect(component.showCreateChar).toBeFalse();
    });

    it('deleteChar should remove the characteristic and its related "- enabled" toggle', () => {
      component.prodChars = [
        { id: '1', name: 'Bandwidth' } as any,
        { id: '2', name: 'Bandwidth - enabled' } as any
      ];
      component.deleteChar({ id: '1', name: 'Bandwidth' });
      expect(component.prodChars.length).toBe(0);
    });

    it('getFilteredCharacteristicsForCurrentStep should exclude compliance characteristics', () => {
      component.currentStepId = 'characteristics';
      component.prodChars = [
        { id: '1', name: 'Latency', valueType: 'string' },
        { id: '2', name: 'Compliance: ISO 27001', valueType: 'string' }
      ] as any;
      expect(component.getFilteredCharacteristicsForCurrentStep().map(c => c.name)).toEqual(['Latency']);
    });
  });

  describe('relationships', () => {
    it('getProdSpecsRel and nextProdSpecsRel should update relationship pagination state', async () => {
      await component.getProdSpecsRel(false);
      expect(component.prodSpecRels.length).toBe(1);
      const spy = spyOn(component, 'getProdSpecsRel').and.resolveTo();
      await component.nextProdSpecsRel();
      expect(spy).toHaveBeenCalledWith(true);
    });

    it('saveRel and deleteRel should manage prodRelationships', () => {
      const detectSpy = spyOn((component as any).cdr, 'detectChanges');
      component.relForm.patchValue({
        relType: 'dependency',
        prodSpec: { id: 'r1', href: 'href', name: 'Rel1' }
      });
      component.saveRel();
      expect(component.prodRelationships.length).toBe(1);
      expect(component.prodRelationships[0].relationshipType).toBe('dependency');
      expect(component.showCreateRel).toBeFalse();

      component.deleteRel({ id: 'r1' });
      expect(component.prodRelationships.length).toBe(0);
      expect(detectSpy).toHaveBeenCalled();
    });
  });

  describe('setProductData / updateProduct', () => {
    beforeEach(() => {
      component.generalForm.patchValue({
        name: 'My Product',
        version: '1.0',
        brand: 'Brand',
        description: '',
        number: ''
      });
    });

    it('setProductData should preserve selected ISO ids', () => {
      component.selectedISOS = [
        { id: 'urn:ngsi-ld:characteristic:iso-id', name: 'Compliance:ISO27001', url: 'https://iso' }
      ];

      component.setProductData();

      const isoChar = component.productSpecToUpdate?.productSpecCharacteristic?.find(
        (item: any) => item.name === 'Compliance:ISO27001'
      );
      expect(isoChar?.id).toBe('urn:ngsi-ld:characteristic:iso-id');
    });

    it('setProductData should preserve the Compliance:VC id when available', () => {
      component.complianceVCId = 'urn:ngsi-ld:characteristic:vc-id';
      component.complianceVC = 'vc-token';

      component.setProductData();

      const vcChar = component.productSpecToUpdate?.productSpecCharacteristic?.find(
        (item: any) => item.name === 'Compliance:VC'
      );
      expect(vcChar?.id).toBe('urn:ngsi-ld:characteristic:vc-id');
    });

    it('setProductData should include the self attestation from selfAtt state', () => {
      component.selfAtt = {
        id: 'urn:ngsi-ld:characteristic:self-att-id',
        name: 'Compliance:SelfAtt',
        productSpecCharacteristicValue: [{ isDefault: true, value: 'https://self-attestation.pdf' }]
      };

      component.setProductData();

      const selfAttChar = component.productSpecToUpdate?.productSpecCharacteristic?.find(
        (item: any) => item.name === 'Compliance:SelfAtt'
      );
      expect(selfAttChar).toBeDefined();
      expect((selfAttChar as any)?.productSpecCharacteristicValue?.[0]?.value).toBe('https://self-attestation.pdf');
    });

    it('updateProduct should call the update API and navigate back on success', () => {
      component.prod = { ...baseProd };
      const goBackSpy = spyOn(component, 'goBack');

      component.updateProduct();

      expect(prodSpecServiceSpy.updateProdSpec).toHaveBeenCalledWith(component.productSpecToUpdate, 'prod-1');
      expect(component.loading).toBeFalse();
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('updateProduct should surface an error message when the API call fails', () => {
      component.prod = { ...baseProd };
      prodSpecServiceSpy.updateProdSpec.and.returnValue(throwError(() => ({ error: { error: 'Update failed' } })));

      component.updateProduct();

      expect(component.showError).toBeTrue();
      expect(component.errorMessage).toBe('Error: Update failed');
      expect(component.loading).toBeFalse();
    });
  });

  describe('utility methods', () => {
    it('hasLongWord should detect words above the threshold', () => {
      expect(component.hasLongWord('short words only', 10)).toBeFalse();
      expect(component.hasLongWord('containsaveryverylongword here', 10)).toBeTrue();
      expect(component.hasLongWord(undefined, 10)).toBeFalse();
    });

    it('getValuePreview should truncate long values and stringify non-strings', () => {
      expect(component.getValuePreview(null)).toBe('');
      expect(component.getValuePreview('short')).toBe('short');
      expect(component.getValuePreview('a'.repeat(100), 10)).toBe(`${'a'.repeat(10)}...`);
      expect(component.getValuePreview({ a: 1 })).toBe('{"a":1}');
    });

    it('normalizeName should strip the Compliance: prefix and trim whitespace', () => {
      expect(component.normalizeName('Compliance: ISO27001 ')).toBe('ISO27001');
      expect(component.normalizeName(undefined)).toBe('');
    });
  });

  it('onBlueprintConfigChange should update blueprintConfig and derive relationships', () => {
    const value = {
      selectedItems: [{ id: 'i1', href: 'h1', name: 'Item 1' }],
      orchestrationSteps: [],
      valid: true
    };

    component.onBlueprintConfigChange(value as any);

    expect(component.blueprintConfig).toBe(value as any);
    expect(component.prodRelationships).toEqual([
      { id: 'i1', href: 'h1', relationshipType: 'dependency', name: 'Item 1' }
    ]);
  });
});
