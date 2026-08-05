import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';

import { ComponentFixture } from '@angular/core/testing';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { CreateProductSpecComponent } from './create-product-spec.component';

class SyncFileReaderMock {
  onload: ((event: any) => void) | null = null;

  readAsDataURL(_file: File): void {
    if (this.onload) {
      this.onload({ target: { result: 'data:text/plain;base64,Zm9v' } });
    }
  }
}

describe('CreateProductSpecComponent', () => {
  let component: CreateProductSpecComponent;
  let fixture: ComponentFixture<CreateProductSpecComponent>;

  let messagesSubject: Subject<any>;
  let routerSpy: jasmine.SpyObj<Router>;
  let prodSpecServiceSpy: jasmine.SpyObj<ProductSpecServiceService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let attachmentServiceSpy: jasmine.SpyObj<AttachmentServiceService>;
  let servSpecServiceSpy: jasmine.SpyObj<ServiceSpecServiceService>;
  let resSpecServiceSpy: jasmine.SpyObj<ResourceSpecServiceService>;
  let paginationServiceSpy: jasmine.SpyObj<PaginationService>;
  let originalFileReader: any;

  const defaultPaginationData = {
    page_check: true,
    items: [{ id: 'item-1' }],
    nextItems: [{ id: 'item-2' }],
    page: 10
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

  beforeEach(async () => {
    messagesSubject = new Subject<any>();
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    prodSpecServiceSpy = jasmine.createSpyObj<ProductSpecServiceService>('ProductSpecServiceService', ['getProdSpecByUser', 'postProdSpec']);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>('EventMessageService', ['emitSellerProductSpec'], { messages$: messagesSubject.asObservable() });
    attachmentServiceSpy = jasmine.createSpyObj<AttachmentServiceService>('AttachmentServiceService', ['uploadFile']);
    servSpecServiceSpy = jasmine.createSpyObj<ServiceSpecServiceService>('ServiceSpecServiceService', ['getServiceSpecByUserPaged']);
    resSpecServiceSpy = jasmine.createSpyObj<ResourceSpecServiceService>('ResourceSpecServiceService', ['getResourceSpecByUserPaged']);
    paginationServiceSpy = jasmine.createSpyObj<PaginationService>('PaginationService', ['getItemsPaginated']);

    localStorageSpy.getObject.and.returnValue({});
    attachmentServiceSpy.uploadFile.and.returnValue(of({ content: 'https://uploaded.file' }));
    prodSpecServiceSpy.postProdSpec.and.returnValue(of({ id: 'created' }));
    paginationServiceSpy.getItemsPaginated.and.resolveTo(defaultPaginationData);
    servSpecServiceSpy.getServiceSpecByUserPaged.and.resolveTo({ items: [], total: 0 } as any);
    resSpecServiceSpy.getResourceSpecByUserPaged.and.resolveTo({ items: [], total: 0 } as any);

    await TestBed.configureTestingModule({
      declarations: [CreateProductSpecComponent],
      imports: [TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: {} },
        { provide: ProductSpecServiceService, useValue: prodSpecServiceSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: AttachmentServiceService, useValue: attachmentServiceSpy },
        { provide: ServiceSpecServiceService, useValue: servSpecServiceSpy },
        { provide: ResourceSpecServiceService, useValue: resSpecServiceSpy },
        { provide: PaginationService, useValue: paginationServiceSpy }
      ]
    })
      .overrideComponent(CreateProductSpecComponent, {
        set: { template: '' }
      })
      .compileComponents();

    fixture = TestBed.createComponent(CreateProductSpecComponent);
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
    messagesSubject.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalled();
  });

  it('should stop event subscription on destroy', () => {
    const initSpy = spyOn(component, 'initPartyInfo');
    messagesSubject.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);
    component.ngOnDestroy();
    messagesSubject.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('onClick should hide upload panel and trigger detectChanges when open', () => {
    component.showUploadFile = true;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.onClick();
    expect(component.showUploadFile).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('onClick should do nothing when upload panel is already closed', () => {
    component.showUploadFile = false;
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.onClick();
    expect(detectSpy).not.toHaveBeenCalled();
  });

  it('ngOnInit should call initPartyInfo', () => {
    const initSpy = spyOn(component, 'initPartyInfo');
    component.ngOnInit();
    expect(initSpy).toHaveBeenCalled();
  });

  it('initPartyInfo should set partyId when logged directly', () => {
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

  it('initPartyInfo should set org partyId when logged as organization', () => {
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

  it('initPartyInfo should ignore expired/empty sessions', () => {
    component.partyId = 'kept-party';
    localStorageSpy.getObject.and.returnValue({});
    component.initPartyInfo();
    expect(component.partyId).toBe('kept-party');
  });

  it('goBack should emit seller product spec event and navigate to the product specs list', () => {
    component.goBack();
    expect(eventMessageSpy.emitSellerProductSpec).toHaveBeenCalledWith(true);
    expect(routerSpy.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.productSpecs.list()]);
  });

  it('onStepChanged should update currentStepId and refresh characteristics', () => {
    const refreshSpy = spyOn(component, 'refreshChars');
    component.onStepChanged({ step: 1, isLastStep: false, label: 'Characteristics', stepId: 'characteristics' });
    expect(component.currentStepId).toBe('characteristics');
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('onStepChanged should schedule flowbite init for compliance and attachments steps', () => {
    const timeoutSpy = spyOn(window, 'setTimeout');
    component.onStepChanged({ step: 2, isLastStep: false, label: 'Compliance', stepId: 'compliance' });
    expect(timeoutSpy).toHaveBeenCalled();
    timeoutSpy.calls.reset();
    component.onStepChanged({ step: 6, isLastStep: false, label: 'Attachments', stepId: 'attachments' });
    expect(timeoutSpy).toHaveBeenCalled();
  });

  it('onStepChanged should load related product specs on relationships step', () => {
    const relSpy = spyOn(component, 'getProdSpecsRel');
    component.onStepChanged({ step: 7, isLastStep: false, label: 'Relationships', stepId: 'relationships' });
    expect(relSpy).toHaveBeenCalledWith(false);
  });

  it('onStepChanged should call showFinish when it is the last step', () => {
    const finishSpy = spyOn(component, 'showFinish');
    component.onStepChanged({ step: 9, isLastStep: true, label: 'Summary', stepId: 'summary' });
    expect(finishSpy).toHaveBeenCalled();
  });

  describe('canAdvance', () => {
    it('should reflect general form validity on the general step', () => {
      component.currentStepId = 'general';
      component.generalForm.patchValue({ name: '', brand: '', version: '' });
      expect(component.canAdvance).toBeFalse();
      component.generalForm.patchValue({ name: 'A', brand: 'B', version: '1.0' });
      expect(component.canAdvance).toBeTrue();
    });

    it('should require at least 2 bundled products when bundle is checked', () => {
      component.currentStepId = 'bundle';
      component.bundleChecked = true;
      component.prodSpecsBundle = [{ id: '1' } as any];
      expect(component.canAdvance).toBeFalse();
      component.prodSpecsBundle.push({ id: '2' } as any);
      expect(component.canAdvance).toBeTrue();
    });

    it('should allow advancing on bundle step when bundle is unchecked', () => {
      component.currentStepId = 'bundle';
      component.bundleChecked = false;
      component.prodSpecsBundle = [];
      expect(component.canAdvance).toBeTrue();
    });

    it('should require valid ISOs on the compliance step', () => {
      component.currentStepId = 'compliance';
      component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
      expect(component.canAdvance).toBeFalse();
      component.selectedISOS = [{ name: 'Compliance:ISO-A', url: 'https://doc' }];
      expect(component.canAdvance).toBeTrue();
    });

    it('should require at least one relationship on relationships step for blueprint template', () => {
      component.currentStepId = 'relationships';
      component.generalForm.patchValue({ baseTemplate: 'BlueprintProductSpecification' });
      component.prodRelationships = [];
      expect(component.canAdvance).toBeFalse();
      component.prodRelationships = [{ id: 'r1' }];
      expect(component.canAdvance).toBeTrue();
    });

    it('should not require relationships on relationships step for non-blueprint template', () => {
      component.currentStepId = 'relationships';
      component.generalForm.patchValue({ baseTemplate: '' });
      component.prodRelationships = [];
      expect(component.canAdvance).toBeTrue();
    });

    it('should reflect blueprintConfig validity on orchestrationPlan step', () => {
      component.currentStepId = 'orchestrationPlan';
      component.blueprintConfig = { selectedItems: [], orchestrationSteps: [], valid: false };
      expect(component.canAdvance).toBeFalse();
      component.blueprintConfig = { selectedItems: [], orchestrationSteps: [], valid: true };
      expect(component.canAdvance).toBeTrue();
    });

    it('should default to true on other steps', () => {
      component.currentStepId = 'dataspace';
      expect(component.canAdvance).toBeTrue();
    });
  });

  it('templateName should read the baseTemplate control value', () => {
    component.generalForm.patchValue({ baseTemplate: '' });
    expect(component.templateName).toBe('');
    component.generalForm.patchValue({ baseTemplate: 'BlueprintProductSpecification' });
    expect(component.templateName).toBe('BlueprintProductSpecification');
  });

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

  it('nextBundle should request next products page', async () => {
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

  it('addISO should move item from available to selected and toggle dropdown', () => {
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

  it('removeISO should move item back to available list', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.selectedISOS = [{ name: 'Compliance:ISO123', mandatory: false, domesupported: true }];
    component.availableISOS = [];
    component.removeISO(component.selectedISOS[0]);
    expect(component.selectedISOS.length).toBe(0);
    expect(component.availableISOS[0].name).toBe('ISO123');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('removeCert should delete an additional certification', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.additionalISOS = [{ name: 'Compliance:extra', url: 'u' }];
    component.removeCert({ name: 'Compliance:extra' });
    expect(component.additionalISOS.length).toBe(0);
    expect(detectSpy).toHaveBeenCalled();
  });

  it('removeSelfAtt should remove self attestation from finishChars', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.selfAtt = { name: 'Compliance:SelfAtt' };
    component.finishChars = [{ name: 'Compliance:SelfAtt' } as any, { name: 'Other' } as any];
    component.removeSelfAtt();
    expect(component.selfAtt).toBe('');
    expect(component.finishChars.length).toBe(1);
    expect(component.finishChars[0].name).toBe('Other');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('checkValidISOS should detect missing URLs', () => {
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    expect(component.checkValidISOS()).toBeTrue();
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: 'https://doc' }];
    expect(component.checkValidISOS()).toBeFalse();
  });

  it('dropped should reject invalid filenames', () => {
    const badFile = { name: 'bad name.txt', type: 'text/plain', size: 1000 };
    component.currentStepId = 'compliance';
    component.showUploadAtt = false;
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    component.dropped([mockDroppedFile(badFile)], component.selectedISOS[0]);
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toContain('File names can only include alphabetical characters');
    expect(attachmentServiceSpy.uploadFile).not.toHaveBeenCalled();
  });

  it('dropped should reject files that exceed max size', () => {
    const bigFile = { name: 'big.txt', type: 'text/plain', size: component.MAX_FILE_SIZE + 1 };
    component.currentStepId = 'compliance';
    component.showUploadAtt = false;
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    component.dropped([mockDroppedFile(bigFile)], component.selectedISOS[0]);
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('File size must be under 3MB.');
    expect(attachmentServiceSpy.uploadFile).not.toHaveBeenCalled();
  });

  it('dropped should upload compliance ISO file and set its URL', () => {
    component.currentStepId = 'compliance';
    component.showUploadAtt = false;
    component.showUploadFile = true;
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    const file = { name: 'iso.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], component.selectedISOS[0]);
    expect(attachmentServiceSpy.uploadFile).toHaveBeenCalled();
    expect(component.selectedISOS[0].url).toBe('https://uploaded.file');
    expect(component.showUploadFile).toBeFalse();
  });

  it('dropped should upload self-attestation when uploadAtt is enabled', () => {
    component.currentStepId = 'compliance';
    component.showUploadAtt = true;
    component.selfAtt = { name: 'Compliance:SelfAtt' };
    component.finishChars = [];
    const file = { name: 'selfatt.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], 'ignored');
    expect(component.selfAtt.name).toBe('Compliance:SelfAtt');
    expect(component.finishChars.length).toBe(1);
    expect(component.showUploadAtt).toBeFalse();
    expect(component.showUploadFile).toBeFalse();
  });

  it('dropped should upload image attachment and set preview', () => {
    component.currentStepId = 'attachments';
    const file = { name: 'picture.png', type: 'image/png', size: 200 };
    component.dropped([mockDroppedFile(file)], 'img');
    expect(component.showImgPreview).toBeTrue();
    expect(component.imgPreview).toBe('https://uploaded.file');
    expect(component.prodAttachments.length).toBe(1);
  });

  it('dropped should reject non-image file when img selector is used', () => {
    component.currentStepId = 'attachments';
    const file = { name: 'doc.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], 'img');
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('File must have a valid image format!');
  });

  it('dropped should set attachment draft for generic files', () => {
    component.currentStepId = 'attachments';
    const file = { name: 'manual.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], 'attachment');
    expect(component.attachToCreate.url).toBe('https://uploaded.file');
    expect(component.attachToCreate.attachmentType).toBe('application/pdf');
  });

  it('dropped should handle upload errors and show a 413-specific message', () => {
    attachmentServiceSpy.uploadFile.and.returnValue(throwError(() => ({ status: 413, error: { error: 'too large' } })));
    component.currentStepId = 'compliance';
    component.showUploadAtt = false;
    component.selectedISOS = [{ name: 'Compliance:ISO-A', url: '' }];
    const file = { name: 'iso.pdf', type: 'application/pdf', size: 200 };
    component.dropped([mockDroppedFile(file)], component.selectedISOS[0]);
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('File size too large! Must be under 3MB.');
  });

  it('dropped should ignore directory entries', () => {
    spyOn(console, 'log');
    const directoryEntry = {
      relativePath: 'folder',
      fileEntry: { isFile: false }
    };
    expect(() => component.dropped([directoryEntry as any], 'ignored')).not.toThrow();
  });

  it('isValidFilename should validate filename against the configured regex', () => {
    expect(component.isValidFilename('valid-file_1.0.txt')).toBeTrue();
    expect(component.isValidFilename('invalid name.txt')).toBeFalse();
  });

  it('fileOver, fileLeave and uploadFile should execute without side effects', () => {
    spyOn(console, 'log');
    component.fileOver({ type: 'over' });
    component.fileLeave({ type: 'leave' });
    component.uploadFile();
    expect(console.log).toHaveBeenCalled();
  });

  it('toggleUploadSelfAtt and toggleUploadFile should set flags and selectedISO', () => {
    component.toggleUploadSelfAtt();
    expect(component.showUploadFile).toBeTrue();
    expect(component.showUploadAtt).toBeTrue();
    component.toggleUploadFile({ name: 'ISO-A' });
    expect(component.selectedISO).toEqual({ name: 'ISO-A' });
  });

  it('toggleCreateCharacteristicForm should reset draft state when opening', () => {
    component.currentStepId = 'characteristics';
    component.showCreateChar = false;
    component.charTypeSelected = 'number';
    component.toggleCreateCharacteristicForm();
    expect(component.showCreateChar).toBeTrue();
    expect(component.charTypeSelected).toBe('string');
    expect(component.creatingChars).toEqual([]);
    expect(component.isOptional).toBeFalse();
  });

  it('toggleCreateCharacteristicForm should default to boolean values when boolean type is initial for step', () => {
    component.currentStepId = 'characteristics';
    spyOn(component, 'getInitialCharacteristicTypeForCurrentStep').and.returnValue('boolean');
    component.toggleCreateCharacteristicForm();
    expect(component.creatingChars.length).toBe(2);
  });

  it('toggleCreateCharacteristicForm should close the form on second call', () => {
    component.showCreateChar = true;
    component.toggleCreateCharacteristicForm();
    expect(component.showCreateChar).toBeFalse();
  });

  it('fetchResourceSpecs should delegate to ResourceSpecServiceService', async () => {
    component.partyId = 'party-1';
    const params = { limit: 10, offset: 0 } as any;
    await component.fetchResourceSpecs(params);
    expect(resSpecServiceSpy.getResourceSpecByUserPaged).toHaveBeenCalledWith(params, undefined, ['Active', 'Launched'], 'party-1');
  });

  it('fetchServiceSpecs should delegate to ServiceSpecServiceService', async () => {
    component.partyId = 'party-1';
    const params = { limit: 10, offset: 0 } as any;
    await component.fetchServiceSpecs(params);
    expect(servSpecServiceSpy.getServiceSpecByUserPaged).toHaveBeenCalledWith(params, undefined, ['Active', 'Launched'], 'party-1');
  });

  it('removeImg should remove the profile image attachment and clear preview', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.showImgPreview = true;
    component.imgPreview = 'https://img';
    component.prodAttachments = [{ name: 'Profile Picture', url: 'https://img', attachmentType: 'Picture' } as any];
    component.removeImg();
    expect(component.showImgPreview).toBeFalse();
    expect(component.imgPreview).toBe('');
    expect(component.prodAttachments.length).toBe(0);
    expect(detectSpy).toHaveBeenCalled();
  });

  it('saveImgFromURL should create a profile image attachment from the URL field', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.imgURL = { nativeElement: { value: 'https://site/image.png' } } as any;
    component.saveImgFromURL();
    expect(component.showImgPreview).toBeTrue();
    expect(component.imgPreview).toBe('https://site/image.png');
    expect(component.prodAttachments[0].name).toBe('Profile Picture');
    expect(component.attImageName.value).toBeNull();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('removeAtt should remove attachments and clear image preview when needed', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.showImgPreview = true;
    component.imgPreview = 'https://img';
    component.prodAttachments = [
      { name: 'Profile Picture', url: 'https://img', attachmentType: 'Picture' } as any,
      { name: 'Manual', url: 'https://manual', attachmentType: 'application/pdf' } as any
    ];
    component.removeAtt({ url: 'https://img' });
    expect(component.showImgPreview).toBeFalse();
    expect(component.imgPreview).toBe('');
    expect(component.prodAttachments.length).toBe(1);
    expect(detectSpy).toHaveBeenCalled();
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

    component.certificationName = { nativeElement: { value: 'reset' } } as any;
    component.isoToCreate = 'y';
    component.clearAdditionalCert(false);
    expect(component.certificationName.nativeElement.value).toBe('');
  });

  it('getProdSpecsRel and nextProdSpecsRel should update relationship pagination state', async () => {
    await component.getProdSpecsRel(false);
    expect(component.prodSpecRels.length).toBe(1);
    const spy = spyOn(component, 'getProdSpecsRel').and.resolveTo();
    await component.nextProdSpecsRel();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it('saveRel and deleteRel should manage relationships', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.relForm.patchValue({ relType: 'dependency', prodSpec: { id: 'r1', href: 'href-1' } });
    component.saveRel();
    expect(component.showCreateRel).toBeFalse();
    expect(component.prodRelationships.length).toBe(1);
    expect(component.prodRelationships[0].relationshipType).toBe('dependency');
    expect(component.relForm.value.relType).toBe('migration');
    component.deleteRel({ id: 'r1' });
    expect(component.prodRelationships.length).toBe(0);
    expect(detectSpy).toHaveBeenCalled();
  });

  it('refreshChars should restore default characteristic state', () => {
    component.stringValue = 'x';
    component.numberValue = '2';
    component.rangeUnit = 'ms';
    component.charTypeSelected = 'number';
    component.creatingChars = [{ isDefault: true } as any];
    component.refreshChars();
    expect(component.stringValue).toBe('');
    expect(component.numberValue).toBe('');
    expect(component.rangeUnit).toBe('');
    expect(component.charTypeSelected).toBe('string');
    expect(component.booleanDefaultTrue).toBeTrue();
    expect(component.creatingChars).toEqual([]);
  });

  it('refreshChars should use the dataspace default type on the dataspace step', () => {
    component.currentStepId = 'dataspace';
    component.charTypeSelected = 'number';
    component.refreshChars();
    expect(component.charTypeSelected).toBe('endpointUrl');
  });

  it('setBooleanDefaultValues and onBooleanDefaultChange should toggle default boolean value', () => {
    component.charTypeSelected = 'boolean';
    component.booleanDefaultTrue = true;
    component.onBooleanDefaultChange();
    expect(component.creatingChars[0].isDefault).toBeTrue();
    expect(component.creatingChars[1].isDefault).toBeFalse();

    component.booleanDefaultTrue = false;
    component.onBooleanDefaultChange();
    expect(component.creatingChars[0].isDefault).toBeFalse();
    expect(component.creatingChars[1].isDefault).toBeTrue();
  });

  it('onBooleanDefaultChange should do nothing for non-boolean types', () => {
    component.charTypeSelected = 'string';
    component.creatingChars = [];
    component.onBooleanDefaultChange();
    expect(component.creatingChars).toEqual([]);
  });

  it('onTypeChange should switch characteristic type and clear draft values', () => {
    component.creatingChars = [{ isDefault: true } as any];
    component.isOptional = true;
    component.optionalDftTrue = true;
    component.onTypeChange({ target: { value: 'number' } });
    expect(component.charTypeSelected).toBe('number');
    expect(component.creatingChars).toEqual([]);
    expect(component.isOptional).toBeFalse();

    component.onTypeChange({ target: { value: 'boolean' } });
    expect(component.charTypeSelected).toBe('boolean');
    expect(component.booleanDefaultTrue).toBeTrue();
    expect(component.creatingChars.length).toBe(2);
  });

  it('isJsonCharacteristicType, isDataSpaceCharacteristicType and isTextCharacteristicType should classify types correctly', () => {
    expect(component.isJsonCharacteristicType('credentialsConfiguration')).toBeTrue();
    expect(component.isJsonCharacteristicType('string')).toBeFalse();
    expect(component.isJsonCharacteristicType(undefined)).toBeFalse();

    expect(component.isDataSpaceCharacteristicType('endpointUrl')).toBeTrue();
    expect(component.isDataSpaceCharacteristicType('number')).toBeFalse();
    expect(component.isDataSpaceCharacteristicType(undefined)).toBeFalse();

    expect(component.isTextCharacteristicType('string')).toBeTrue();
    expect(component.isTextCharacteristicType('endpointUrl')).toBeTrue();
    expect(component.isTextCharacteristicType('number')).toBeFalse();
  });

  it('isDataspaceConfigurationStep should reflect currentStepId', () => {
    component.currentStepId = 'dataspace';
    expect(component.isDataspaceConfigurationStep()).toBeTrue();
    component.currentStepId = 'general';
    expect(component.isDataspaceConfigurationStep()).toBeFalse();
  });

  it('getFilteredCharacteristicsForCurrentStep should split default and dataspace characteristics', () => {
    component.prodChars = [
      { id: '1', name: 'Latency', valueType: 'string' },
      { id: '2', name: 'Compliance: ISO 27001', valueType: 'string' },
      { id: '3', name: 'DCP endpoint', valueType: 'endpointUrl' },
      { id: '4', name: 'Policy', valueType: 'authorizationPolicy' }
    ] as any;

    component.currentStepId = 'characteristics';
    expect(component.getFilteredCharacteristicsForCurrentStep().map(char => char.name)).toEqual(['Latency']);

    component.currentStepId = 'dataspace';
    expect(component.getFilteredCharacteristicsForCurrentStep().map(char => char.name)).toEqual(['DCP endpoint', 'Policy']);
  });

  it('getInitialCharacteristicTypeForCurrentStep should return dataspace or string default', () => {
    component.currentStepId = 'dataspace';
    expect(component.getInitialCharacteristicTypeForCurrentStep()).toBe('endpointUrl');
    component.currentStepId = 'characteristics';
    expect(component.getInitialCharacteristicTypeForCurrentStep()).toBe('string');
  });

  it('addCharValue should add string values and assign default correctly', () => {
    component.charTypeSelected = 'string';
    component.stringValue = 'A';
    component.addCharValue();
    component.stringValue = 'B';
    component.addCharValue();
    expect(component.creatingChars.length).toBe(2);
    expect(component.creatingChars[0].isDefault).toBeTrue();
    expect(component.creatingChars[1].isDefault).toBeFalse();
  });

  it('addCharValue should treat endpointUrl as text type', () => {
    component.charTypeSelected = 'endpointUrl';
    component.stringValue = 'https://example.org/api';
    component.addCharValue();
    expect(component.creatingChars.length).toBe(1);
    expect(component.creatingChars[0].value as any).toBe('https://example.org/api');
    expect(component.stringValue).toBe('');
  });

  it('addCharValue should add number values with units', () => {
    component.charTypeSelected = 'number';
    component.numberValue = '100';
    component.numberUnit = 'ms';
    component.addCharValue();
    expect(component.creatingChars[0].value as any).toBe('100');
    expect(component.creatingChars[0].unitOfMeasure).toBe('ms');
    expect(component.numberValue).toBe('');
    expect(component.numberUnit).toBe('');
  });

  it('addCharValue should not mutate fixed boolean values', () => {
    component.charTypeSelected = 'boolean';
    component.creatingChars = [
      { isDefault: true, value: true } as any,
      { isDefault: false, value: false } as any
    ];
    component.addCharValue();
    expect(component.creatingChars.length).toBe(2);
  });

  it('addCharValue should validate range and reject invalid intervals', () => {
    component.charTypeSelected = 'range';
    component.fromValue = '10';
    component.toValue = '5';
    component.addCharValue();
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toContain('Invalid range');
    expect(component.creatingChars.length).toBe(0);
  });

  it('addCharValue should add valid range values', () => {
    component.charTypeSelected = 'range';
    component.fromValue = '5';
    component.toValue = '10';
    component.rangeUnit = 'GB';
    component.addCharValue();
    expect(component.creatingChars.length).toBe(1);
    expect(component.creatingChars[0].valueFrom as any).toBe('5');
    expect(component.creatingChars[0].valueTo as any).toBe('10');
    expect(component.creatingChars[0].unitOfMeasure).toBe('GB');
  });

  it('addCharValue should parse and add JSON values for credentialsConfiguration', () => {
    component.charTypeSelected = 'credentialsConfiguration';
    component.jsonValue = '{"issuer":"did:example:123"}';
    component.addCharValue();
    expect(component.creatingChars.length).toBe(1);
    expect(component.creatingChars[0].value as any).toEqual({ issuer: 'did:example:123' });
    expect(component.jsonValue).toBe('');
  });

  it('addCharValue should allow only one JSON value for JSON-based characteristic types', () => {
    component.charTypeSelected = 'credentialsConfiguration';
    component.jsonValue = '{"issuer":"did:example:123"}';
    component.addCharValue();
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
    expect(component.creatingChars).toEqual([]);
  });

  it('removeCharValue and selectDefaultChar should manage created char values', () => {
    component.charTypeSelected = 'string';
    component.creatingChars = [
      { isDefault: true, value: 'A' } as any,
      { isDefault: false, value: 'B' } as any
    ];
    component.selectDefaultChar(component.creatingChars[1], 1);
    expect(component.creatingChars[0].isDefault).toBeFalse();
    expect(component.creatingChars[1].isDefault).toBeTrue();
    component.removeCharValue(component.creatingChars[0], 0);
    expect(component.creatingChars.length).toBe(1);
  });

  it('removeCharValue should not remove values for boolean type', () => {
    component.charTypeSelected = 'boolean';
    component.creatingChars = [
      { isDefault: true, value: true } as any,
      { isDefault: false, value: false } as any
    ];
    component.removeCharValue(component.creatingChars[0], 0);
    expect(component.creatingChars.length).toBe(2);
  });

  it('saveChar should reject duplicated names', () => {
    component.charsForm.patchValue({ name: 'Latency', description: 'desc' });
    component.prodChars = [{ id: '1', name: 'Latency', productSpecCharacteristicValue: [] } as any];
    component.creatingChars = [{ isDefault: true, value: '100' } as any];
    component.saveChar();
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Cannot save duplicated name in characteristics');
  });

  it('saveChar should save the main and optional enabled characteristic', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.charTypeSelected = 'string';
    component.charsForm.patchValue({ name: 'Bandwidth', description: 'desc' });
    component.creatingChars = [{ isDefault: true, value: '1Gbps' } as any];
    component.isOptional = true;
    component.optionalDftTrue = true;
    component.saveChar();
    expect(component.prodChars.length).toBe(2);
    expect(component.prodChars[0].name).toBe('Bandwidth');
    expect(component.prodChars[1].name).toBe('Bandwidth - enabled');
    expect(component.showCreateChar).toBeFalse();
    expect(detectSpy).toHaveBeenCalled();
  });

  it('saveChar should ignore the optional toggle for boolean characteristics', () => {
    component.charTypeSelected = 'boolean';
    component.charsForm.patchValue({ name: 'Enabled', description: 'desc' });
    component.creatingChars = [
      { isDefault: true, value: true } as any,
      { isDefault: false, value: false } as any
    ];
    component.isOptional = true;
    component.saveChar();
    expect(component.prodChars.length).toBe(1);
  });

  it('saveChar should persist credentialsConfiguration valueType and schema location', () => {
    component.charTypeSelected = 'credentialsConfiguration';
    component.charsForm.patchValue({ name: 'Credential Config', description: 'desc' });
    component.creatingChars = [{ isDefault: true, value: { issuer: 'did:example:issuer' } } as any];
    component.saveChar();
    expect((component.prodChars[0] as any).valueType).toBe('credentialsConfiguration');
    expect((component.prodChars[0] as any)['@schemaLocation']).toContain('credentialConfigCharacteristic.json');
  });

  it('saveChar should persist authorizationPolicy valueType and schema location', () => {
    component.charTypeSelected = 'authorizationPolicy';
    component.charsForm.patchValue({ name: 'Authorization Policy', description: 'desc' });
    component.creatingChars = [{ isDefault: true, value: { permission: [] } } as any];
    component.saveChar();
    expect((component.prodChars[0] as any).valueType).toBe('authorizationPolicy');
    expect((component.prodChars[0] as any)['@schemaLocation']).toContain('policyCharacteristic.json');
  });

  it('deleteChar should remove a characteristic and its related enabled one', () => {
    const detectSpy = spyOn((component as any).cdr, 'detectChanges');
    component.prodChars = [
      { id: 'a', name: 'Bandwidth' } as any,
      { id: 'b', name: 'Bandwidth - enabled' } as any,
      { id: 'c', name: 'Other' } as any
    ];
    component.deleteChar({ id: 'a', name: 'Bandwidth' });
    expect(component.prodChars.length).toBe(1);
    expect(component.prodChars[0].name).toBe('Other');
    expect(detectSpy).toHaveBeenCalled();
  });

  it('onCharacteristicsChange should map generic items emitted by app-characteristics-editor back into prodChars', () => {
    component.currentStepId = 'characteristics';
    component.onCharacteristicsChange([
      { id: 'char-1', name: 'Custom Char', description: 'desc', configurable: true, valueType: 'string', values: [{ isDefault: true, value: 'x' } as any] }
    ]);
    expect(component.prodChars.length).toBe(1);
    expect(component.prodChars[0].name).toBe('Custom Char');
    expect(component.characteristicItems.length).toBe(1);
    expect(component.characteristicItems[0].name).toBe('Custom Char');
  });

  it('onCharacteristicsChange should cascade-delete the related "- enabled" companion when its main characteristic is removed', () => {
    component.currentStepId = 'characteristics';
    component.prodChars = [
      { id: 'a', name: 'Bandwidth', productSpecCharacteristicValue: [] } as any,
      { id: 'b', name: 'Bandwidth - enabled', productSpecCharacteristicValue: [] } as any,
      { id: 'c', name: 'Other', productSpecCharacteristicValue: [] } as any
    ];
    component.onCharacteristicsChange([
      { id: 'b', name: 'Bandwidth - enabled', description: '', configurable: false, valueType: 'string', values: [] },
      { id: 'c', name: 'Other', description: '', configurable: false, valueType: 'string', values: [] }
    ]);
    expect(component.prodChars.map(c => c.name)).toEqual(['Other']);
  });

  it('showFinish should build the final product payload', () => {
    component.partyId = 'party-1';
    component.bundleChecked = true;
    component.generalForm.patchValue({
      name: 'My Product',
      description: 'Desc',
      version: '1.0',
      brand: 'Brand',
      number: 'PN-1'
    });
    component.prodSpecsBundle = [{ id: 'bundle-1' } as any];
    component.prodChars = [{ id: 'char-1', name: 'Feature', productSpecCharacteristicValue: [{ value: 'x' }] } as any];
    component.selectedISOS = [{ name: 'Compliance:ISO-1', url: 'https://iso' }];
    component.additionalISOS = [{ name: 'Compliance:Custom', url: 'https://custom' }];
    component.prodRelationships = [{ id: 'rel-1', href: 'href-1', name: 'RelName', relationshipType: 'migration' }];
    component.prodAttachments = [{ name: 'Manual', url: 'https://doc', attachmentType: 'application/pdf' } as any];
    component.selectedResourceSpecs = [{ id: 'res-1', href: 'href-res' } as any];
    component.selectedServiceSpecs = [{ id: 'srv-1', href: 'href-srv' } as any];

    component.showFinish();

    expect(component.productSpecToCreate).toBeDefined();
    expect(component.productSpecToCreate?.name).toBe('My Product');
    expect(component.productSpecToCreate?.isBundle).toBeTrue();
    expect(component.productSpecToCreate?.bundledProductSpecification?.length).toBe(1);
    expect(component.productSpecToCreate?.productSpecCharacteristic?.length).toBeGreaterThan(0);
    expect(component.productSpecToCreate?.productSpecificationRelationship?.length).toBe(1);
    expect(component.productSpecToCreate?.resourceSpecification).toEqual([{ id: 'res-1', href: 'href-res' }]);
    expect(component.productSpecToCreate?.serviceSpecification).toEqual([{ id: 'srv-1', href: 'href-srv' }]);
    expect(component.productSpecToCreate?.relatedParty?.[0]?.id).toBe('party-1');
  });

  it('showFinish should not build a product when required general fields are missing', () => {
    component.generalForm.patchValue({ name: null, brand: null, version: null });
    component.productSpecToCreate = undefined;
    component.showFinish();
    expect(component.productSpecToCreate).toBeUndefined();
  });

  it('showFinish should include self attestation even when it is not in prodChars', () => {
    component.generalForm.patchValue({ name: 'My Product', version: '1.0', brand: 'Brand' });
    component.prodChars = [{ id: 'char-1', name: 'Feature', productSpecCharacteristicValue: [{ value: 'x' }] } as any];
    component.selfAtt = {
      id: 'self-att-1',
      name: 'Compliance:SelfAtt',
      productSpecCharacteristicValue: [{ isDefault: true, value: 'https://self-att' }]
    };

    component.showFinish();

    const selfAtt = component.productSpecToCreate?.productSpecCharacteristic?.find((c: any) => c.name === 'Compliance:SelfAtt');
    expect(selfAtt).toBeDefined();
    expect((selfAtt as any)?.productSpecCharacteristicValue?.[0]?.value).toBe('https://self-att');
  });

  it('showFinish should set blueprint metadata and orchestration plan when blueprintConfig is set', () => {
    component.generalForm.patchValue({ name: 'Blueprint Product', version: '1.0', brand: 'Brand' });
    component.blueprintConfig = { selectedItems: [], orchestrationSteps: [{ step: 1 } as any], valid: true };

    component.showFinish();

    expect((component.productSpecToCreate as any)?.['@type']).toBe('BlueprintProductSpecification');
    expect((component.productSpecToCreate as any)?.orchestrationPlan).toEqual({ steps: [{ step: 1 }] });
  });

  it('createProduct should call the API and go back on success', () => {
    const backSpy = spyOn(component, 'goBack');
    component.productSpecToCreate = { name: 'Prod' } as any;
    component.createProduct();
    expect(prodSpecServiceSpy.postProdSpec).toHaveBeenCalledWith(component.productSpecToCreate);
    expect(component.loading).toBeFalse();
    expect(backSpy).toHaveBeenCalled();
  });

  it('createProduct should handle API errors and show a message', () => {
    prodSpecServiceSpy.postProdSpec.and.returnValue(throwError(() => ({ error: { error: 'boom' } })));
    component.productSpecToCreate = { name: 'Prod' } as any;
    component.createProduct();
    expect(component.loading).toBeFalse();
    expect(component.showError).toBeTrue();
    expect(component.errorMessage).toBe('Error: boom');
  });

  it('hasLongWord should detect words above the threshold', () => {
    expect(component.hasLongWord('small words only', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryveryveryverylongword here', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });

  it('getValuePreview should truncate long values and keep short ones intact', () => {
    const shortValue = component.getValuePreview({ key: 'value' }, 80);
    const longValue = component.getValuePreview('a'.repeat(200), 40);
    expect(shortValue).toContain('"key":"value"');
    expect(longValue.endsWith('...')).toBeTrue();
    expect(component.getValuePreview(null)).toBe('');
    expect(component.getValuePreview(undefined)).toBe('');
  });

  it('normalizeName should strip the compliance prefix and trim whitespace', () => {
    expect(component.normalizeName('Compliance: ISO 27001 ')).toBe('ISO 27001');
    expect(component.normalizeName('compliance:Custom')).toBe('Custom');
    expect(component.normalizeName(undefined)).toBe('');
  });

  it('onBlueprintConfigChange should store the config and map selected items to relationships', () => {
    const value = {
      selectedItems: [{ id: 'i1', href: 'h1', name: 'Item1' }],
      orchestrationSteps: [],
      valid: true
    };
    component.onBlueprintConfigChange(value);
    expect(component.blueprintConfig).toBe(value);
    expect(component.prodRelationships.length).toBe(1);
    expect(component.prodRelationships[0].relationshipType).toBe('dependency');
    expect(component.prodRelationships[0].id).toBe('i1');
  });
});
