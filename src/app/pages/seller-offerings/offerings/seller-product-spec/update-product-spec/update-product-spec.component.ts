import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import { jwtDecode } from "jwt-decode";
import moment from 'moment';
import { FileSystemDirectoryEntry, FileSystemFileEntry, NgxFileDropEntry } from 'ngx-file-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { certifications } from 'src/app/models/certification-standards.const';
import { buildLifecycleStatusOptions, FormField, TableFormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { components } from "src/app/models/product-catalog";
import { TableColumn } from 'src/app/models/table-column.model';
import { AttachmentServiceService } from "src/app/services/attachment-service.service";
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PaginationService } from 'src/app/services/pagination.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { CharacteristicFormValue } from 'src/app/shared/forms/specification-characteristic/specification-characteristic-form.component';
import { lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';
import { jsonValidator, noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';
import { BlueprintProductFormValue } from '../blueprint-product-form/blueprint-product-form.component';


type CharacteristicValueSpecification = components["schemas"]["CharacteristicValueSpecification"];
type ProductSpecification_Update = components["schemas"]["ProductSpecification_Update"];
type BundledProductSpecification = components["schemas"]["BundledProductSpecification"];
type ProductSpecificationCharacteristic = components["schemas"]["ProductSpecificationCharacteristic"];
type ServiceSpecificationRef = components["schemas"]["ServiceSpecificationRef"];
type ResourceSpecificationRef = components["schemas"]["ResourceSpecificationRef"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];
type ProductSpecFormStep = 'general' | 'bundle' | 'compliance' | 'characteristics' | 'dataspace' | 'resource' | 'service' | 'attachments' | 'relationships' | 'summary' | 'orchestrationPlan' | 'dsp_config';

const DSP_CHARS: string[] = ['endpointUrl', 'upstreamAddress', 'targetSpecification', 'serviceConfiguration', 'credentialsConfig', 'authorizationPolicy', 'transferPath', 'transferType'];

const BASE_TEMPLATE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'BlueprintProductSpecification', label: 'Blueprint Product Specification' },
];

@Component({
  selector: 'update-product-spec',
  templateUrl: './update-product-spec.component.html',
  styleUrl: './update-product-spec.component.css',
  providers: [DatePipe],
})
export class UpdateProductSpecComponent implements OnInit, OnDestroy {
  @Input() prod: any;

  //PAGE SIZES:
  PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;
  DOME_TRUST_LINK: string = environment.DOME_TRUST_LINK;
  BUNDLE_ENABLED: boolean = environment.BUNDLE_ENABLED;
  DATA_SPACE_ENABLED: boolean = environment.DATA_SPACE_ENABLED;
  MAX_FILE_SIZE: number = environment.MAX_FILE_SIZE;

  currentStepId: ProductSpecFormStep = 'general';
  showDspConfigStep = false;
  partyId: any = '';

  //PRODUCT GENERAL INFO:
  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    brand: new FormControl('', [Validators.required, noWhitespaceValidator]),
    version: new FormControl('0.1', [Validators.required, Validators.pattern('^-?[0-9]\\d*(\\.\\d*(\\.\\d*)?)?$'), noWhitespaceValidator]),
    number: new FormControl(''),
    lifecycleStatus: new FormControl('Active'),
    baseTemplate: new FormControl(''),

    description: new FormControl('', Validators.maxLength(100000)),
  });
  //DSP CONFIG INFO:
  newEndpointUrl: string = '';
  newEndpointDescription: string = '';
  newEndpointName: string = '';
  endpointUrls: { url: string; description: string; name: string, id?: string }[] = [];
  readonly transferTypes: string[] = ['HttpData-PULL', 'HttpData-PUSH'];
  dspConfigForm = new FormGroup({
    upstreamAddress: new FormControl('', [Validators.required]),
    transferPath: new FormControl(''),
    transferType: new FormControl('HttpData-PULL', [Validators.required]),
    targetSpecification: new FormControl('', [Validators.required, jsonValidator]),
    serviceConfiguration: new FormControl('', [Validators.required, jsonValidator]),
    credentialsConfig: new FormControl('', [Validators.required, jsonValidator]),
    policyConfig: new FormControl('', [Validators.required, jsonValidator]),
  });

  //CHARS INFO
  charsForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', [Validators.maxLength(500)])
  });
  charTypeSelected: string = 'string';
  booleanDefaultTrue: boolean = true;
  isOptional: boolean = false;
  optionalDftTrue: boolean = false;
  prodChars: ProductSpecificationCharacteristic[] = [];
  finishChars: ProductSpecificationCharacteristic[] = [];
  creatingChars: CharacteristicValueSpecification[] = [];
  showCreateChar: boolean = false;
  currentStandardChar: CharacteristicFormValue | null = null;

  get canSaveStandardChar(): boolean {
    return !!this.currentStandardChar?.name?.trim() && (this.currentStandardChar?.values?.length ?? 0) > 0;
  }

  onStandardCharFormChange(value: CharacteristicFormValue): void {
    this.currentStandardChar = value;
  }

  saveStandardChar(): void {
    if (!this.currentStandardChar?.name) return;
    if (this.prodChars.find(c => c.name === this.currentStandardChar!.name)) {
      this.errorMessage = 'Cannot save duplicated name in characteristics';
      this.showError = true;
      setTimeout(() => { this.showError = false; }, 3000);
      return;
    }
    this.prodChars.push({
      id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
      name: this.currentStandardChar.name,
      description: this.currentStandardChar.description ?? '',
      configurable: this.currentStandardChar.configurable,
      valueType: this.currentStandardChar.valueType,
      productSpecCharacteristicValue: this.currentStandardChar.values as any[],
    });
    this.currentStandardChar = null;
    this.showCreateChar = false;
    this.refreshChars();
  }

  //BUNDLE INFO:
  bundleChecked: boolean = false;
  bundlePage = 0;
  bundlePageCheck: boolean = false;
  loadingBundle: boolean = false;
  loadingBundle_more: boolean = false;
  prodSpecs: any[] = [];
  nextProdSpecs: any[] = [];
  //final selected products inside bundle
  prodSpecsBundle: BundledProductSpecification[] = [];

  //COMPLIANCE PROFILE INFO:
  buttonISOClicked: boolean = false;
  availableISOS: any[] = [];
  selectedISOS: any[] = [];
  additionalISOS: any[] = [];
  verifiedISO: string[] = [];
  complianceLevel: string = 'NL';
  selectedISO: any;
  complianceVC: any = null;
  complianceVCId: string = '';
  showUploadFile: boolean = false;
  showRequestValidationModal: boolean = false;
  selfAtt: any;
  checkExistingSelfAtt: boolean = false;
  showUploadAtt: boolean = false;
  isoToCreate: string = '';
  showCert: boolean = false;
  initialComplianceEvidenceSignature: string = '';

  //SERVICE INFO:
  selectedServiceSpecs: any[] = [];
  servColumns: TableColumn[] = [
    { header: 'Name', getValue: (item: any) => item.name ?? '-' },
    { header: 'Status', getValue: (item: any) => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus) },
    { header: 'Last update', getValue: (item: any) => this.datePipe.transform(item.lastUpdate, 'EEEE, dd/MM/yy, HH:mm') ?? '-', width: 'w-52' },
  ];

  //RESOURCE INFO:
  selectedResourceSpecs: any[] = [];
  resColumns: TableColumn[] = [
    { header: 'Name', getValue: (item: any) => item.name ?? '-' },
    { header: 'Status', getValue: (item: any) => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus) },
    { header: 'Last update', getValue: (item: any) => this.datePipe.transform(item.lastUpdate, 'EEEE, dd/MM/yy, HH:mm') ?? '-', width: 'w-52' },
  ];

  //RELATIONSHIPS INFO:
  showCreateRel: boolean = false;
  prodSpecRelPage = 0;
  prodSpecRelPageCheck: boolean = false;
  loadingprodSpecRel: boolean = false;
  loadingprodSpecRel_more: boolean = false;
  prodSpecRels: any[] = [];
  nextProdSpecRels: any[] = [];
  //Final relationships
  prodRelationships: any[] = [];

  relFormFields: FormField[] = [
    {
      type: 'select',
      name: 'relType',
      label: 'UPDATE_PROD_SPEC._relationship_type',
      required: true,
      defaultValue: 'migration',
      options: [
        { value: 'migration', label: 'Migration' },
        { value: 'dependency', label: 'Dependency' },
        { value: 'exclusivity', label: 'Exclusivity' },
        { value: 'substitution', label: 'Substitution' },
      ],
    } as FormField,
    {
      type: 'table',
      name: 'prodSpec',
      label: 'UPDATE_PROD_SPEC._product_name',
      required: true,
      multiple: false,
      items: [],
      columns: [
        { header: 'Name', getValue: (item: any) => item.name ?? '-' },
        { header: 'Type', getValue: (item: any) => item.isBundle ? 'Bundle' : 'Simple', width: 'w-28' },
        { header: 'Last update', getValue: (item: any) => this.datePipe.transform(item.lastUpdate, 'EEEE, dd/MM/yy, HH:mm') ?? '-', width: 'w-52' },
      ],
    } as FormField,
  ];
  relForm = buildFormGroup(this.relFormFields);

  //ATTACHMENT INFO
  showImgPreview: boolean = false;
  showNewAtt: boolean = false;
  imgPreview: any = '';
  prodAttachments: AttachmentRefOrValue[] = [];
  attachToCreate: AttachmentRefOrValue = { url: '', attachmentType: '' };
  attFileName = new FormControl('', [Validators.required, Validators.pattern('[a-zA-Z0-9 _.-]*')]);
  certFileName = new FormControl('', [Validators.required, Validators.pattern('[a-zA-Z0-9 _.-]*')]);
  attImageName = new FormControl('', [Validators.required, Validators.pattern('^https?:\\/\\/.*\\.(?:png|jpg|jpeg|gif|bmp|webp)$')])

  //FINAL PRODUCT USING API CALL STRUCTURE
  productSpecToUpdate: ProductSpecification_Update | undefined;

  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;

  //CHARS
  stringValue: string = '';
  numberValue: string = '';
  numberUnit: string = '';
  fromValue: string = '';
  toValue: string = '';
  rangeUnit: string = '';
  jsonValue: string = '';

  blueprintConfig: BlueprintProductFormValue;

  readonly dataSpaceCharacteristicTypes: string[] = [
    'credentialsConfiguration',
    'authorizationPolicy'
  ];
  readonly dataSpaceJsonCharacteristicTypes: string[] = [
    'credentialsConfiguration',
    'authorizationPolicy'
  ];

  filenameRegex = /^[A-Za-z0-9_.-]+$/;
  private destroy$ = new Subject<void>();

  get templateName(): string {
    return this.generalForm.get('baseTemplate')?.value || '';
  }

  constructor(
    private api: ApiServiceService,
    private prodSpecService: ProductSpecServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private attachmentService: AttachmentServiceService,
    private servSpecService: ServiceSpecServiceService,
    private resSpecService: ResourceSpecServiceService,
    private paginationService: PaginationService,
    private datePipe: DatePipe
  ) {
    for (let i = 0; i < certifications.length; i++) {
      this.availableISOS.push(certifications[i])
    }
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      })
  }

  @HostListener('document:click')
  onClick() {
    if (this.showUploadFile == true) {
      this.showUploadFile = false;
      this.cdr.detectChanges();
    }
  }

  @ViewChild('attachName') attachName!: ElementRef;
  @ViewChild('imgURL') imgURL!: ElementRef;
  @ViewChild('certificationName') certificationName!: ElementRef;

  public files: NgxFileDropEntry[] = [];

  ngOnInit() {
    this.initPartyInfo();
    console.log(this.prod)
    this.populateProductInfo();
    initFlowbite();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'UPDATE_PROD_SPEC._product_name', required: true, maxLength: 100, colSpan: 1 },
    { type: 'string', name: 'brand', label: 'UPDATE_PROD_SPEC._product_brand', required: true, colSpan: 1 },
    { type: 'string', name: 'version', label: 'UPDATE_PROD_SPEC._product_version', required: true, colSpan: 1 },
    { type: 'string', name: 'number', label: 'UPDATE_PROD_SPEC._id_number', colSpan: 1 },
    {
      type: 'statusPicker', name: 'lifecycleStatus', label: 'UPDATE_RES_SPEC._status',
      options: buildLifecycleStatusOptions('productSpecStatus'),
    },
    { type: 'select', name: 'baseTemplate', label: 'CREATE_PROD_SPEC._base_template', options: BASE_TEMPLATE_OPTIONS, readonly: true },

    { type: 'markdownTextarea', name: 'description', label: 'UPDATE_PROD_SPEC._product_description' },
  ];

  get canAdvance(): boolean {
    if (this.currentStepId === 'general') return this.generalForm?.valid ?? false;
    if (this.currentStepId === 'bundle') {
      return !(this.bundleChecked && this.prodSpecsBundle.length < 2);
    }
    if (this.currentStepId === 'compliance') {
      return !this.checkValidISOS();
    }
    return true;
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId as ProductSpecFormStep;
    this.refreshChars();
    if (this.currentStepId === 'compliance') { setTimeout(() => { initFlowbite(); }, 100); }
    if (this.currentStepId === 'attachments') { setTimeout(() => { initFlowbite(); }, 100); }
    if (this.currentStepId === 'relationships') { this.getProdSpecsRel(false); }
    if (event.isLastStep) { this.showFinish(); }
  }

  initPartyInfo() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  populateProductInfo() {
    //GENERAL INFORMATION
    this.generalForm.controls['name'].setValue(this.prod.name);
    this.generalForm.controls['description'].setValue(this.prod.description);
    this.generalForm.controls['brand'].setValue(this.prod.brand ? this.prod.brand : '');
    this.generalForm.controls['version'].setValue(this.prod.version ? this.prod.version : '');
    this.generalForm.controls['number'].setValue(this.prod.productNumber ? this.prod.productNumber : '');
    this.generalForm.patchValue({ lifecycleStatus: this.prod.lifecycleStatus });
    if (this.prod['@baseType']) {
      this.generalForm.controls['baseTemplate'].setValue(this.prod['@type'])
    }
    //BUNDLE
    if (this.prod.isBundle == true) {
      //this.bundleChecked=true;
      this.toggleBundleCheck();
      //Ver como añadir los productos al bundle
      this.prodSpecsBundle = this.prod.bundledProductSpecification;
      //prod.bundledProductSpecification

      console.log('is bundle')
    }

    //COMPLIANCE PROFILE
    if (this.prod.productSpecCharacteristic) {
      console.log(certifications)
      console.log('--')
      console.log(this.prod.productSpecCharacteristic)
      for (let i = 0; i < this.prod.productSpecCharacteristic.length; i++) {
        // Check if this is a VC
        if (this.prod.productSpecCharacteristic[i].name == 'Compliance:VC') {
          this.complianceVCId = this.prod.productSpecCharacteristic[i].id || '';
          this.complianceVC = this.prod.productSpecCharacteristic[i].productSpecCharacteristicValue?.[0]?.value ?? null;
          // Decode the token
          try {
            this.applyComplianceDataFromVcToken(this.complianceVC);
          } catch (e) {
            console.log(e)
          }

          // Add verified certifcates

          //let cert = certifications.find(item => `${item.name}:VC` === this.prod.productSpecCharacteristic[i].name)
          //if (cert) {
          //  const val = this.prod.productSpecCharacteristic[i].productSpecCharacteristicValue[0].value
          //this.verifiedISO[cert.name] = val
          //}
          continue
        }


        //const index = this.availableISOS.findIndex(item => item.name === this.prod.productSpecCharacteristic[i].name);
        const cleanedName = this.prod.productSpecCharacteristic[i].name
          .replace('Compliance:', '')
          .trim();

        const index = this.availableISOS.findIndex(
          item => item.name === cleanedName
        );

        if (index !== -1) {
          console.log('adding sel iso')
          this.selectedISOS.push({
            id: this.prod.productSpecCharacteristic[i].id,
            name: this.prod.productSpecCharacteristic[i].name,
            url: this.prod.productSpecCharacteristic[i].productSpecCharacteristicValue[0].value,
            mandatory: this.availableISOS[index].mandatory,
            domesupported: this.availableISOS[index].domesupported
          });
          this.availableISOS.splice(index, 1);
        } else if (this.prod.productSpecCharacteristic[i].name == 'Compliance:SelfAtt') {
          this.selfAtt = JSON.parse(JSON.stringify(this.prod.productSpecCharacteristic[i]));
          this.checkExistingSelfAtt = true;
        } else if (this.prod.productSpecCharacteristic[i].name.startsWith('Compliance:')) {
          console.log('--- additional isos')
          console.log(this.prod.productSpecCharacteristic[i])
          this.additionalISOS.push({
            id: this.prod.productSpecCharacteristic[i].id,
            name: this.prod.productSpecCharacteristic[i].name,
            url: this.prod.productSpecCharacteristic[i].productSpecCharacteristicValue[0].value
          })
        }
      }
      console.log('selected isos')
      console.log(this.selectedISOS)
      console.log('available')
      console.log(this.availableISOS)
      console.log('API PROD ISOS')
      console.log(this.prod.productSpecCharacteristic)
    }
    // Baseline must reflect the loaded form representation to avoid false positives.
    this.initialComplianceEvidenceSignature = this.getCurrentComplianceEvidenceSignature();

    //CHARS
    if (this.prod.productSpecCharacteristic) {
      let chars = this.prod.productSpecCharacteristic;
      if (this.prod.externalId) {
        chars = chars.filter((char: any) => !DSP_CHARS.includes(char.valueType));
      }
      chars.forEach((char: any) => {
        const index = this.selectedISOS.findIndex(item => item.name === char.name);
        if (index == -1) {
          this.prodChars.push({
            id: char.id ? char.id : 'urn:ngsi-ld:characteristic:' + uuidv4(),
            name: char.name,
            description: char.description ? char.description : '',
            valueType: char.valueType,
            '@schemaLocation': char['@schemaLocation'],
            productSpecCharacteristicValue: char.productSpecCharacteristicValue
          });
        }
      });
    }

    //RESOURCE
    if (this.prod.resourceSpecification) {
      this.selectedResourceSpecs = this.prod.resourceSpecification
    }

    //SERVICE
    if (this.prod.serviceSpecification) {
      this.selectedServiceSpecs = this.prod.serviceSpecification;
    }

    //ATTACHMENTS
    if (this.prod.attachment) {
      this.prodAttachments = this.prod.attachment;
      const index = this.prodAttachments.findIndex(item => item.name === 'Profile Picture');
      if (index !== -1) {
        this.imgPreview = this.prodAttachments[index].url;
        this.showImgPreview = true;
      }
    }

    //RELATIONSHIPS
    console.log('----- RELACIONES')
    console.log(this.prod.productSpecificationRelationship)
    if (this.prod.productSpecificationRelationship) {
      for (let i = 0; i < this.prod.productSpecificationRelationship.length; i++) {
        this.prodSpecService.getResSpecById(this.prod.productSpecificationRelationship[i].id).then(data => {

          this.prodRelationships.push({
            id: this.prod.productSpecificationRelationship[i].id,
            href: this.prod.productSpecificationRelationship[i].id,
            //Que tipo de relacion le pongo? no viene en el prodspec
            relationshipType: this.prod.productSpecificationRelationship[i].relationshipType ?? 'migration',
            name: this.prod.productSpecificationRelationship[i].name,
            productSpec: data
          });
        })
      }
    }
    // Orchestration Plan
    if (this.prod.orchestrationPlan) {
      this.blueprintConfig = {
        selectedItems: [],
        orchestrationSteps: this.prod.orchestrationPlan.steps,
        valid: true
      }
    }

    if (this.prod.externalId) {
      this.addDspConfigStep();
    }
  }

  goBack() {
    this.eventMessage.emitSellerProductSpec(false);
  }

  toggleBundleCheck() {
    this.prodSpecs = [];
    this.bundlePage = 0;
    this.bundleChecked = !this.bundleChecked;
    if (this.bundleChecked == true) {
      this.loadingBundle = true;
      this.getProdSpecs(false);
    } else {
      this.prodSpecsBundle = [];
    }
  }

  async getProdSpecs(next: boolean) {
    if (next == false) {
      this.loadingBundle = true;
    }

    let options = {
      "filters": ['Active', 'Launched'],
      "partyId": this.partyId,
      //"sort": undefined,
      //"isBundle": false
    }

    this.paginationService.getItemsPaginated(this.bundlePage, this.PROD_SPEC_LIMIT, next, this.prodSpecs, this.nextProdSpecs, options,
      this.prodSpecService.getProdSpecByUser.bind(this.prodSpecService)).then(data => {
        this.bundlePageCheck = data.page_check;
        this.prodSpecs = data.items;
        this.nextProdSpecs = data.nextItems;
        this.bundlePage = data.page;
        this.loadingBundle = false;
        this.loadingBundle_more = false;
      })
  }

  async nextBundle() {
    await this.getProdSpecs(true);
  }

  addProdToBundle(prod: any) {
    const index = this.prodSpecsBundle.findIndex(item => item.id === prod.id);
    if (index !== -1) {
      console.log('eliminar')
      this.prodSpecsBundle.splice(index, 1);
    } else {
      console.log('añadir')
      this.prodSpecsBundle.push({
        id: prod.id,
        href: prod.href,
        lifecycleStatus: prod.lifecycleStatus,
        name: prod.name
      });
    }
    this.cdr.detectChanges();
    console.log(this.prodSpecsBundle)
  }

  isProdInBundle(prod: any) {
    const index = this.prodSpecsBundle.findIndex(item => item.id === prod.id);
    if (index !== -1) {
      return true
    } else {
      return false;
    }
  }

  addISO(iso: any) {
    const index = this.availableISOS.findIndex(item => item.name === iso.name);
    if (index !== -1) {
      console.log('seleccionar')
      this.availableISOS.splice(index, 1);
      this.selectedISOS.push({ name: 'Compliance:' + iso.name, url: '', mandatory: iso.mandatory, domesupported: iso.domesupported });
    }
    this.buttonISOClicked = !this.buttonISOClicked;
    this.cdr.detectChanges();
    console.log(this.availableISOS)
    console.log(this.selectedISOS)
  }

  removeISO(iso: any) {
    const cleanedName = iso.name
      .replace('Compliance:', '')
      .trim();
    const index = this.selectedISOS.findIndex(item => item.name === iso.name);
    if (index !== -1) {
      console.log('seleccionar')
      this.selectedISOS.splice(index, 1);
      this.availableISOS.push({ name: cleanedName, mandatory: iso.mandatory, domesupported: iso.domesupported });

      //if (iso.name in this.verifiedISO) {
      //  delete this.verifiedISO[iso.name]
      //}
    }
    this.cdr.detectChanges();
    console.log(this.prodSpecsBundle)
  }

  removeCert(iso: any) {
    const index = this.additionalISOS.findIndex(item => item.name === iso.name);
    if (index !== -1) {
      console.log('eliminar additional cert')
      this.additionalISOS.splice(index, 1);
      console.log(this.additionalISOS)
    }
    this.cdr.detectChanges();
  }

  removeSelfAtt() {
    const index = this.finishChars.findIndex(item => item.name === this.selfAtt.name);
    if (index !== -1) {
      console.log('seleccionar')
      this.finishChars.splice(index, 1);
    }
    this.selfAtt = '';
    this.cdr.detectChanges();
    console.log(this.finishChars)
  }

  checkValidISOS(): boolean {
    let invalid = this.selectedISOS.find((p => {
      return p.url === ''
    }));
    if (invalid) {
      return true;
    } else {
      return false;
    }
  }

  addISOValue(sel: any) {
    const index = this.selectedISOS.findIndex(item => item.name === sel.name);
    const nativeElement = document.getElementById('iso-' + sel.name);
    console.log(sel.url)
    console.log(this.selectedISOS)
  }

  private applyComplianceDataFromVcToken(vcToken: any) {
    if (!vcToken || typeof vcToken !== 'string') {
      this.complianceLevel = 'NL';
      return;
    }

    const allowedLevels = ['NL', 'BL', 'P', 'PP'];

    try {
      const decoded: any = jwtDecode(vcToken);
      let credential: any = null;

      if ('verifiableCredential' in decoded) {
        credential = decoded.verifiableCredential;
      } else if ('vc' in decoded) {
        credential = decoded.vc;
      }

      const subject = credential?.credentialSubject;
      if (!subject) {
        this.complianceLevel = 'NL';
        return;
      }

      const level = subject['gx:labelLevel'];
      this.complianceLevel = (typeof level === 'string' && allowedLevels.includes(level)) ? level : 'NL';
    } catch (error) {
      this.complianceLevel = 'NL';
      console.log(error);
    }
  }

  openRequestValidationModal() {
    this.showRequestValidationModal = true;
  }

  closeRequestValidationModal() {
    this.showRequestValidationModal = false;
  }

  hasSelfAttestation(): boolean {
    const selfAttestationValue = this.selfAtt?.productSpecCharacteristicValue?.[0]?.value;
    if (typeof selfAttestationValue === 'string') {
      return selfAttestationValue.trim() !== '';
    }
    return !!selfAttestationValue;
  }

  hasUnsavedComplianceProfileChanges(): boolean {
    return this.getCurrentComplianceEvidenceSignature() !== this.initialComplianceEvidenceSignature;
  }

  isVerified(sel: any) {
    return this.verifiedISO.indexOf(sel.name) > -1
  }

  public dropped(files: NgxFileDropEntry[], sel: any) {
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {
          console.log('dropped')

          if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
              const base64String: string = e.target.result.split(',')[1];
              console.log('BASE 64....')
              console.log(base64String); // You can use this base64 string as needed
              let prod_name = '';
              if (this.generalForm.value.name != null) {
                prod_name = this.generalForm.value.name.replaceAll(/\s/g, '') + '_';
              }
              let fileBody = {
                content: {
                  name: uuidv4() + '_' + file.name,
                  data: base64String
                },
                contentType: file.type,
                isPublic: true
              }
              if (!this.isValidFilename(fileBody.content.name)) {
                this.errorMessage = 'File names can only include alphabetical characters (A-Z, a-z) and a limited set of symbols, such as underscores (_), hyphens (-), and periods (.)';
                console.error('There was an error while uploading file!');
                this.showError = true;
                setTimeout(() => {
                  this.showError = false;
                }, 3000);
                return;
              }
              //IF FILES ARE HIGHER THAN 3MB THROW AN ERROR
              if (file.size > this.MAX_FILE_SIZE) {
                this.errorMessage = 'File size must be under 3MB.';
                console.error('There was an error while uploading file!');
                this.showError = true;
                setTimeout(() => {
                  this.showError = false;
                }, 3000);
                return;
              }
              if (this.currentStepId === 'compliance' && !this.showUploadAtt) {
                const index = this.selectedISOS.findIndex(item => item.name === sel.name);
                this.attachmentService.uploadFile(fileBody).subscribe({
                  next: data => {
                    console.log(data)
                    if (index !== -1) {
                      this.selectedISOS[index].url = data.content;
                      //this.selectedISOS[index].attachmentType=file.type;
                      this.showUploadFile = false;
                      this.cdr.detectChanges();
                      console.log('uploaded')
                    } else {
                      this.isoToCreate = data.content;
                    }
                  },
                  error: error => {
                    console.error('There was an error while uploading file!', error);
                    if (error.error.error) {
                      console.log(error)
                      this.errorMessage = 'Error: ' + error.error.error;
                    } else {
                      this.errorMessage = 'There was an error while uploading the file!';
                    }
                    if (error.status === 413) {
                      this.errorMessage = 'File size too large! Must be under 3MB.';
                    }
                    this.showError = true;
                    setTimeout(() => {
                      this.showError = false;
                    }, 3000);
                  }
                });
              }
              if (this.currentStepId === 'compliance' && this.showUploadAtt) {
                const index = this.finishChars.findIndex(item => item.name === this.selfAtt.name);
                this.attachmentService.uploadFile(fileBody).subscribe({
                  next: data => {
                    if (index !== -1) {
                      this.selfAtt.productSpecCharacteristicValue = [{
                        isDefault: true,
                        value: data.content
                      }];
                      this.finishChars[index] = this.selfAtt;
                    } else {
                      this.selfAtt = {
                        id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
                        name: 'Compliance:SelfAtt',
                        productSpecCharacteristicValue: [{
                          isDefault: true,
                          value: data.content
                        }]
                      }
                      this.finishChars.push(this.selfAtt)
                    }
                    this.showUploadFile = false;
                    this.showUploadAtt = false;
                    this.cdr.detectChanges();
                    console.log('uploaded')
                  },
                  error: error => {
                    console.error('There was an error while uploading the file!', error);
                    if (error.error.error) {
                      console.log(error)
                      this.errorMessage = 'Error: ' + error.error.error;
                    } else {
                      this.errorMessage = 'There was an error while uploading the file!';
                    }
                    if (error.status === 413) {
                      this.errorMessage = 'File size too large! Must be under 3MB.';
                    }
                    this.showError = true;
                    setTimeout(() => {
                      this.showError = false;
                    }, 3000);
                  }
                });
              }
              if (this.currentStepId === 'attachments') {
                console.log(file)
                this.attachmentService.uploadFile(fileBody).subscribe({
                  next: data => {
                    console.log(data)
                    if (sel == 'img') {
                      if (file.type.startsWith("image")) {
                        this.showImgPreview = true;
                        this.imgPreview = data.content;
                        this.prodAttachments.push({
                          name: 'Profile Picture',
                          url: this.imgPreview,
                          attachmentType: file.type
                        })
                      } else {
                        this.errorMessage = 'File must have a valid image format!';
                        this.showError = true;
                        setTimeout(() => {
                          this.showError = false;
                        }, 3000);
                      }
                    } else {
                      this.attachToCreate = { url: data.content, attachmentType: file.type };
                    }

                    this.cdr.detectChanges();
                    console.log('uploaded')
                  },
                  error: error => {
                    console.error('There was an error while uploading file!', error);
                    if (error.error.error) {
                      console.log(error)
                      this.errorMessage = 'Error: ' + error.error.error;
                    } else {
                      this.errorMessage = 'There was an error while uploading the file!';
                    }
                    if (error.status === 413) {
                      this.errorMessage = 'File size too large! Must be under 3MB.';
                    }
                    this.showError = true;
                    setTimeout(() => {
                      this.showError = false;
                    }, 3000);
                  }
                });
              }
            };
            reader.readAsDataURL(file);
          }

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }

  isValidFilename(filename: string): boolean {
    return this.filenameRegex.test(filename);
  }

  public fileOver(event: any) {
    console.log(event);
  }

  public fileLeave(event: any) {
    console.log('leave')
    console.log(event);
  }

  toggleUploadSelfAtt() {
    this.showUploadFile = true;
    this.showUploadAtt = true;
  }

  toggleUploadFile(sel: any) {
    this.showUploadFile = true;
    this.selectedISO = sel;
  }

  uploadFile() {
    console.log('uploading...')
  }

  toggleCreateCharacteristicForm() {
    this.showCreateChar = !this.showCreateChar;
    if (this.showCreateChar) {
      this.charTypeSelected = this.getInitialCharacteristicTypeForCurrentStep();
      this.creatingChars = [];
      this.isOptional = false;
      this.optionalDftTrue = false;
      this.booleanDefaultTrue = true;
      if (this.charTypeSelected === 'boolean') {
        this.setBooleanDefaultValues();
      }
    }
  }

  fetchResourceSpecs = (params: PageRequest): Promise<PageResult<any>> => {
    return this.resSpecService.getResourceSpecByUserPaged(params, undefined, ['Active', 'Launched'], this.partyId);
  }

  fetchServiceSpecs = (params: PageRequest): Promise<PageResult<any>> => {
    return this.servSpecService.getServiceSpecByUserPaged(params, undefined, ['Active', 'Launched'], this.partyId);
  }


  removeImg() {
    this.showImgPreview = false;
    const index = this.prodAttachments.findIndex(item => item.url === this.imgPreview);
    if (index !== -1) {
      console.log('eliminar')
      this.prodAttachments.splice(index, 1);
    }
    this.imgPreview = '';
    this.cdr.detectChanges();
  }

  saveImgFromURL() {
    this.showImgPreview = true;
    this.imgPreview = this.imgURL.nativeElement.value;
    this.prodAttachments.push({
      name: 'Profile Picture',
      url: this.imgPreview,
      attachmentType: 'Picture'
    })
    this.attImageName.reset();
    this.cdr.detectChanges();
  }

  removeAtt(att: any) {
    const index = this.prodAttachments.findIndex(item => item.url === att.url);
    if (index !== -1) {
      console.log('eliminar')
      if (this.prodAttachments[index].name == 'Profile Picture') {
        this.showImgPreview = false;
        this.imgPreview = '';
        this.cdr.detectChanges();
      }
      this.prodAttachments.splice(index, 1);
    }
    this.cdr.detectChanges();
  }

  saveAtt() {
    console.log('saving')
    this.prodAttachments.push({
      name: this.attachName.nativeElement.value,
      url: this.attachToCreate.url,
      attachmentType: this.attachToCreate.attachmentType
    })
    this.attachName.nativeElement.value = '';
    this.attachToCreate = { url: '', attachmentType: '' };
    this.showNewAtt = false;
    this.attFileName.reset();
  }

  clearAtt() {
    this.attachToCreate = { url: '', attachmentType: '' };
  }

  saveAdditionalCert() {
    console.log('saving')
    this.additionalISOS.push({
      name: 'Compliance:' + this.certificationName.nativeElement.value,
      url: this.isoToCreate
    })
    this.certificationName.nativeElement.value = '';
    this.isoToCreate = '';
    this.certFileName.reset();
    this.showCert = false;
  }

  clearAdditionalCert(urlonly: boolean) {
    if (!urlonly) {
      this.certificationName.nativeElement.value = '';
      this.certFileName.reset();
    }
    this.isoToCreate = '';
  }

  async getProdSpecsRel(next: boolean) {
    if (next == false) {
      this.loadingprodSpecRel = true;
    }

    let options = {
      "filters": ['Active', 'Launched'],
      "partyId": this.partyId,
      //"sort": undefined,
      //"isBundle": false
    }

    this.paginationService.getItemsPaginated(this.prodSpecRelPage, this.PROD_SPEC_LIMIT, next, this.prodSpecRels, this.nextProdSpecRels, options,
      this.prodSpecService.getProdSpecByUser.bind(this.prodSpecService)).then(data => {
        this.prodSpecRelPageCheck = data.page_check;
        this.prodSpecRels = data.items;
        this.nextProdSpecRels = data.nextItems;
        this.prodSpecRelPage = data.page;
        (this.relFormFields[1] as TableFormField).items = data.items;
        this.loadingprodSpecRel = false;
        this.loadingprodSpecRel_more = false;
      })
  }

  async nextProdSpecsRel() {
    await this.getProdSpecsRel(true);
  }

  saveRel() {
    const { relType, prodSpec } = this.relForm.value;
    this.showCreateRel = false;
    this.prodRelationships.push({
      id: prodSpec.id,
      href: prodSpec.href,
      relationshipType: relType,
      name: prodSpec.name,
    });
    this.relForm.reset({ relType: 'migration', prodSpec: null });
  }

  deleteRel(rel: any) {
    const index = this.prodRelationships.findIndex(item => item.id === rel.id);
    if (index !== -1) {
      console.log('eliminar')
      this.prodRelationships.splice(index, 1);
    }
    this.cdr.detectChanges();
  }

  refreshChars() {
    this.stringValue = '';
    this.numberValue = '';
    this.numberUnit = '';
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
    this.jsonValue = '';
    this.charTypeSelected = this.getInitialCharacteristicTypeForCurrentStep();
    this.booleanDefaultTrue = true;
    this.isOptional = false;
    this.optionalDftTrue = false;
    this.creatingChars = [];
  }

  setBooleanDefaultValues() {
    this.creatingChars = [
      {
        isDefault: this.booleanDefaultTrue,
        value: true as any
      },
      {
        isDefault: !this.booleanDefaultTrue,
        value: false as any
      }
    ];
  }

  onBooleanDefaultChange() {
    if (this.charTypeSelected == 'boolean') {
      this.setBooleanDefaultValues();
    }
  }

  onTypeChange(event: any) {
    this.charTypeSelected = event.target.value;
    this.charsForm.reset();
    this.stringValue = '';
    this.numberValue = '';
    this.numberUnit = '';
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
    this.jsonValue = '';
    this.isOptional = false;
    this.optionalDftTrue = false;
    if (this.charTypeSelected == 'boolean') {
      this.booleanDefaultTrue = true;
      this.setBooleanDefaultValues();
    } else {
      this.booleanDefaultTrue = true;
      this.creatingChars = [];
    }
  }

  isJsonCharacteristicType(type: string | undefined): boolean {
    if (!type) {
      return false;
    }
    return this.dataSpaceJsonCharacteristicTypes.includes(type);
  }

  isDataSpaceCharacteristicType(type: string | undefined): boolean {
    if (!type) {
      return false;
    }
    return this.dataSpaceCharacteristicTypes.includes(type);
  }

  isDataspaceConfigurationStep(): boolean {
    return this.currentStepId === 'dataspace';
  }

  isDefaultCharacteristicsStep(): boolean {
    return this.currentStepId === 'characteristics';
  }

  isTextCharacteristicType(type: string | undefined): boolean {
    return type === 'string';
  }

  getFilteredCharacteristicsForCurrentStep(): ProductSpecificationCharacteristic[] {
    const nonCompliance = this.prodChars.filter((char: any) => !char.name?.startsWith('Compliance:'));
    if (this.isDataspaceConfigurationStep()) {
      return nonCompliance.filter((char: any) => this.isDataSpaceCharacteristicType(char.valueType));
    }
    return nonCompliance.filter((char: any) => !this.isDataSpaceCharacteristicType(char.valueType));
  }

  getInitialCharacteristicTypeForCurrentStep(): string {
    if (this.isDataspaceConfigurationStep()) {
      return 'credentialsConfiguration';
    }
    return 'string';
  }

  private getSchemaLocationForType(type: string): string | null {
    if (type === 'credentialsConfiguration') {
      return 'https://raw.githubusercontent.com/FIWARE/contract-management/refs/heads/main/schemas/credentials/credentialConfigCharacteristic.json';
    }
    if (type === 'authorizationPolicy') {
      return 'https://raw.githubusercontent.com/FIWARE/contract-management/refs/heads/policy-support/schemas/odrl/policyCharacteristic.json';
    }
    return null;
  }


  addCharValue() {
    if (this.isTextCharacteristicType(this.charTypeSelected)) {
      console.log('string')
      if (this.creatingChars.length == 0) {
        this.creatingChars.push({
          isDefault: true,
          value: this.stringValue as any
        })
      } else {
        this.creatingChars.push({
          isDefault: false,
          value: this.stringValue as any
        })
      }
      this.stringValue = '';
    } else if (this.charTypeSelected == 'number') {
      console.log('number')
      if (this.creatingChars.length == 0) {
        this.creatingChars.push({
          isDefault: true,
          value: this.numberValue as any,
          unitOfMeasure: this.numberUnit
        })
      } else {
        this.creatingChars.push({
          isDefault: false,
          value: this.numberValue as any,
          unitOfMeasure: this.numberUnit
        })
      }
      this.numberUnit = '';
      this.numberValue = '';
    } else if (this.charTypeSelected == 'range') {
      console.log('range')
      // Validate that fromValue < toValue
      const fromVal = Number(this.fromValue);
      const toVal = Number(this.toValue);
      if (fromVal >= toVal) {
        console.log('range validation error: valueFrom >= valueTo')
        this.errorMessage = 'Invalid range: "From" value must be less than "To" value';
        this.showError = true;
        setTimeout(() => { this.showError = false }, 3000);
        return;
      }

      if (this.creatingChars.length == 0) {
        this.creatingChars.push({
          isDefault: true,
          valueFrom: this.fromValue as any,
          valueTo: this.toValue as any,
          unitOfMeasure: this.rangeUnit
        })
      } else {
        this.creatingChars.push({
          isDefault: false,
          valueFrom: this.fromValue as any,
          valueTo: this.toValue as any,
          unitOfMeasure: this.rangeUnit
        })
      }
    } else if (this.isJsonCharacteristicType(this.charTypeSelected)) {
      if (this.creatingChars.length > 0) {
        this.errorMessage = 'Only one JSON value is allowed';
        this.showError = true;
        setTimeout(() => { this.showError = false }, 3000);
        return;
      }
      try {
        const parsedJson = JSON.parse(this.jsonValue);
        this.creatingChars.push({
          isDefault: true,
          value: parsedJson as any
        });
        this.jsonValue = '';
      } catch (error) {
        this.errorMessage = 'Invalid JSON format';
        this.showError = true;
        setTimeout(() => { this.showError = false }, 3000);
        return;
      }
    } else if (this.charTypeSelected == 'boolean') {
      console.log('boolean values are fixed')
      return;
    } else {
      console.log('nothing')
    }
  }

  removeCharValue(char: any, idx: any) {
    if (this.charTypeSelected == 'boolean') {
      return;
    }
    console.log(this.creatingChars)
    this.creatingChars.splice(idx, 1);
    console.log(this.creatingChars)
  }

  selectDefaultChar(char: any, idx: any) {
    for (let i = 0; i < this.creatingChars.length; i++) {
      if (i == idx) {
        this.creatingChars[i].isDefault = true;
      } else {
        this.creatingChars[i].isDefault = false;
      }
    }
  }

  saveChar() {
    if (this.charsForm.value.name != null) {
      // Create the main characteristic
      const characteristic: any = {
        id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
        name: this.charsForm.value.name,
        description: this.charsForm.value.description != null ? this.charsForm.value.description : '',
        productSpecCharacteristicValue: this.creatingChars
      };

      const schemaLocation = this.getSchemaLocationForType(this.charTypeSelected);
      const primitiveTypes = ['string', 'number', 'boolean', 'range'];
      if (!primitiveTypes.includes(this.charTypeSelected)) {
        characteristic.valueType = this.charTypeSelected;
      }
      if (schemaLocation) {
        characteristic['@schemaLocation'] = schemaLocation;
      }

      this.prodChars.push(characteristic);

      // create X - enabled characteristic
      if (this.isOptional && primitiveTypes.includes(this.charTypeSelected) && this.charTypeSelected !== 'boolean') {
        this.prodChars.push({
          id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
          name: this.charsForm.value.name + ' - enabled',
          description: 'Optional toggle for ' + this.charsForm.value.name,
          productSpecCharacteristicValue: [
            {
              isDefault: this.optionalDftTrue,
              value: true as any
            },
            {
              isDefault: !this.optionalDftTrue,
              value: false as any
            }
          ]
        })
      }
    }

    this.charsForm.reset();
    this.creatingChars = [];
    this.showCreateChar = false;
    this.charTypeSelected = 'string';
    this.isOptional = false;
    this.optionalDftTrue = false;
    this.refreshChars();
    this.cdr.detectChanges();
  }

  deleteChar(char: any) {
    const index = this.prodChars.findIndex(item => item.id === char.id);
    if (index !== -1) {
      console.log('eliminar')
      this.prodChars.splice(index, 1);
    }

    // If deleting a main characteristic, also delete its "- enabled" variant if it exists
    if (!char.name.endsWith('- enabled')) {
      const relatedEnabledIndex = this.prodChars.findIndex(item => item.name === char.name + ' - enabled');
      if (relatedEnabledIndex !== -1) {
        console.log('eliminar related enabled')
        this.prodChars.splice(relatedEnabledIndex, 1);
      }
    }

    this.cdr.detectChanges();
    console.log(this.prodChars)
  }

  checkInput(value: string): boolean {
    return value.trim().length === 0;
  }

  showFinish() {
    this.setProductData();
  }

  setProductData() {
    this.finishChars = [];
    console.log('--- set product data')
    console.log(this.prodChars)
    for (let i = 0; i < this.prodChars.length; i++) {
      const index = this.finishChars.findIndex(item => item.name === this.prodChars[i].name);
      if (index == -1) {
        const cleanedName = this.prodChars[i]?.name
          ?.replace('Compliance:', '')
          .trim();

        const checkIso = this.availableISOS.findIndex(
          item => item.name === cleanedName
        );
        if (checkIso == -1) {
          if (this.prodChars[i].name != 'Compliance:SelfAtt') {
            console.log('--- check if deleted additional cert')
            console.log(this.prodChars[i].name)
            const checkAdditional = this.additionalISOS.findIndex(
              item => item.name === cleanedName
            );
            if (checkAdditional != -1) {
              this.finishChars.push(this.prodChars[i])
            }
            if (!this.prodChars[i].name?.startsWith('Compliance:')) {
              this.finishChars.push(this.prodChars[i])
            }
          } else {
            this.finishChars.push(this.prodChars[i])
          }
        } else {
          this.finishChars.push(this.prodChars[i])
        }

      }
    }
    // Load compliance profile
    for (let i = 0; i < this.selectedISOS.length; i++) {
      const index = this.finishChars.findIndex(item => item.name === this.selectedISOS[i].name);
      if (index == -1) {
        this.finishChars.push({
          id: this.selectedISOS[i].id ? this.selectedISOS[i].id : 'urn:ngsi-ld:characteristic:' + uuidv4(),
          name: this.selectedISOS[i].name,
          productSpecCharacteristicValue: [{
            isDefault: true,
            value: this.selectedISOS[i].url
          }]
        })
      }
    }

    for (let i = 0; i < this.additionalISOS.length; i++) {
      console.log('- finish chars antes')
      console.log(this.finishChars)
      console.log('añadiendo additional a finish chars')
      console.log(this.additionalISOS)
      const index = this.finishChars.findIndex(item => item.name === this.additionalISOS[i].name);
      if (index == -1) {
        this.finishChars.push({
          id: this.additionalISOS[i].id ? this.additionalISOS[i].id : 'urn:ngsi-ld:characteristic:' + uuidv4(),
          name: this.additionalISOS[i].name,
          productSpecCharacteristicValue: [{
            isDefault: true,
            value: this.additionalISOS[i].url
          }]
        })
      }
      console.log(this.finishChars)
    }

    // Always merge latest self attestation from compliance step state.
    if (this.hasSelfAttestation()) {
      const selfAttName = 'Compliance:SelfAtt';
      const selfAttValue = this.selfAtt?.productSpecCharacteristicValue?.[0]?.value;
      const selfAttIndex = this.finishChars.findIndex(item => item.name === selfAttName);
      const selfAttId = this.selfAtt?.id
        ? this.selfAtt.id
        : (selfAttIndex !== -1 && this.finishChars[selfAttIndex]?.id
          ? this.finishChars[selfAttIndex].id
          : `urn:ngsi-ld:characteristic:${uuidv4()}`);

      const selfAttestationCharacteristic = {
        id: selfAttId,
        name: selfAttName,
        productSpecCharacteristicValue: [{
          isDefault: true,
          value: selfAttValue
        }]
      } as ProductSpecificationCharacteristic;

      if (selfAttIndex === -1) {
        this.finishChars.push(selfAttestationCharacteristic);
      } else {
        this.finishChars[selfAttIndex] = selfAttestationCharacteristic;
      }
    }

    // Load compliance VCs
    if (this.complianceVC != null) {
      this.finishChars.push({
        id: this.complianceVCId ? this.complianceVCId : `urn:ngsi-ld:characteristic:${uuidv4()}`,
        name: `Compliance:VC`,
        productSpecCharacteristicValue: [{
          isDefault: true,
          value: this.complianceVC
        }]
      })
    }

    if (this.prod.externalId) {
      this.endpointUrls.forEach(endpoint => {
        this.finishChars.push({
          id: endpoint.id,
          description: endpoint.description,
          valueType: 'endpointUrl',
          name: endpoint.name,
          productSpecCharacteristicValue: [
            { value: endpoint.url! as any, isDefault: true }
          ]
        })
      })
      const dspConfigValue = this.dspConfigForm.value
      this.finishChars.push(
        {
          id: "upstreamAddress",
          name: "Address of the upstream serving the data",
          valueType: "upstreamAddress",
          productSpecCharacteristicValue: [
            { value: dspConfigValue.upstreamAddress! as any, isDefault: true }
          ]
        },
        {
          id: "targetSpecification",
          name: "Detailed specification of the ODRL target. Allows to over services via OID4VC",
          valueType: "targetSpecification",
          productSpecCharacteristicValue: [
            { value: JSON.parse(dspConfigValue.targetSpecification!), isDefault: true }
          ]
        },
        {
          id: "serviceConfiguration",
          name: "Service config to be used in the credentials config service when provisioning transfers through OID4VC",
          valueType: "serviceConfiguration",
          productSpecCharacteristicValue: [
            { value: JSON.parse(dspConfigValue.serviceConfiguration!), isDefault: true }
          ]
        },
        {
          id: "credentialsConfig",
          name: "Credentials Config",
          valueType: "credentialsConfig",
          "@schemaLocation": "https://raw.githubusercontent.com/FIWARE/contract-management/refs/heads/main/schemas/credentials/credentialConfigCharacteristic.json",
          productSpecCharacteristicValue: [
            { value: JSON.parse(dspConfigValue.credentialsConfig!), isDefault: true }
          ]
        },
        {
          id: "policyConfig",
          name: "Policy for creation of K8S clusters.",
          valueType: "authorizationPolicy",
          "@schemaLocation": "https://raw.githubusercontent.com/FIWARE/contract-management/refs/heads/policy-support/schemas/odrl/policyCharacteristic.json",
          productSpecCharacteristicValue: [
            { value: JSON.parse(dspConfigValue.policyConfig!), isDefault: true }
          ]
        },
        {
          id: 'transferType',
          name: 'transferType',
          valueType: 'transferType',
          productSpecCharacteristicValue: [
            { value: dspConfigValue.transferType as any, isDefault: true }
          ]
        }
      )
      if (dspConfigValue.transferPath) {
        this.finishChars.push({
          id: 'transferPath',
          name: 'transferPath',
          valueType: 'transferPath',
          productSpecCharacteristicValue: [
            { value: dspConfigValue.transferPath as any, isDefault: true }
          ]
        })
      }
    }

    if (this.generalForm.value.name != null && this.generalForm.value.version != null && this.generalForm.value.brand != null) {
      let rels = [];
      for (let i = 0; i < this.prodRelationships.length; i++) {
        rels.push({
          id: this.prodRelationships[i].id,
          href: this.prodRelationships[i].href,
          name: this.prodRelationships[i].name,
          relationshipType: this.prodRelationships[i].relationshipType
        })
      }
      this.productSpecToUpdate = {
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        version: this.generalForm.value.version,
        brand: this.generalForm.value.brand,
        productNumber: this.generalForm.value.number != null ? this.generalForm.value.number : '',
        lifecycleStatus: this.generalForm.value.lifecycleStatus ?? 'Active',
        //isBundle: this.bundleChecked,
        //bundledProductSpecification: this.prodSpecsBundle,
        productSpecCharacteristic: this.finishChars,
        productSpecificationRelationship: rels,
        attachment: this.prodAttachments,
        resourceSpecification: this.selectedResourceSpecs.map((res: any) => ({ id: res.id, href: res.href })),
        serviceSpecification: this.selectedServiceSpecs.map((res: any) => ({ id: res.id, href: res.href }))
      }
    }
    if (this.blueprintConfig) {
      this.productSpecToUpdate!['@schemaLocation'] = environment.BLUEPRINT_SCHEMA;
      (this.productSpecToUpdate as any).orchestrationPlan = {
        steps: this.blueprintConfig.orchestrationSteps,
      }
    }
  }

  updateProduct() {
    this.setProductData();
    this.loading = true;
    this.prodSpecService.updateProdSpec(this.productSpecToUpdate, this.prod.id).subscribe({
      next: data => {
        this.loading = false;
        this.goBack();
        console.log('actualiado producto')
      },
      error: error => {
        console.error('There was an error while updating!', error);
        if (error.error.error) {
          console.log(error)
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while uploading the product!';
        }
        this.loading = false;
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    });
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  getValuePreview(value: any, maxLength = 80): string {
    if (value === null || value === undefined) {
      return '';
    }

    let rawValue = '';
    if (typeof value === 'string') {
      rawValue = value;
    } else {
      try {
        rawValue = JSON.stringify(value);
      } catch {
        rawValue = String(value);
      }
    }

    return rawValue.length > maxLength ? `${rawValue.slice(0, maxLength)}...` : rawValue;
  }

  normalizeName(name?: string): string {
    return name?.replace(/compliance:/i, '').trim() ?? '';
  }

  private getCurrentComplianceEvidenceSignature(): string {
    const entries: string[] = [];

    const selfAttValue = this.normalizeComplianceValue(this.selfAtt?.productSpecCharacteristicValue?.[0]?.value);
    if (selfAttValue) {
      entries.push(this.toComplianceEntrySignature('Compliance:SelfAtt', selfAttValue));
    }

    for (const certification of this.selectedISOS) {
      const name = this.normalizeComplianceName(certification?.name);
      if (!name) {
        continue;
      }
      const value = this.normalizeComplianceValue(certification?.url);
      entries.push(this.toComplianceEntrySignature(name, value));
    }

    for (const certification of this.additionalISOS) {
      const name = this.normalizeComplianceName(certification?.name);
      if (!name) {
        continue;
      }
      const value = this.normalizeComplianceValue(certification?.url);
      entries.push(this.toComplianceEntrySignature(name, value));
    }

    return entries.sort().join('|');
  }

  private normalizeComplianceName(name: any): string {
    const normalizedName = this.normalizeComplianceValue(name);
    if (!normalizedName) {
      return '';
    }
    if (normalizedName.toLowerCase().startsWith('compliance:')) {
      return normalizedName;
    }
    return `Compliance:${normalizedName}`;
  }

  private normalizeComplianceValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  private toComplianceEntrySignature(name: string, value: string): string {
    return `${name.toLowerCase()}::${value}`;
  }

  addEndpointUrl(): void {
    const url = this.newEndpointUrl.trim();
    const description = this.newEndpointDescription.trim();
    const name = this.newEndpointName.trim();
    if (!url || !description) return;
    this.endpointUrls = [...this.endpointUrls, { url, description, name, id: uuidv4() }];
    this.newEndpointUrl = '';
    this.newEndpointDescription = '';
    this.newEndpointName = '';
  }

  removeEndpointUrl(idx: number): void {
    this.endpointUrls = this.endpointUrls.filter((_, i) => i !== idx);
  }

  private addDspConfigStep(): void {
    if (this.showDspConfigStep) return;
    this.showDspConfigStep = true;
    const patch: any = {}
    if (this.prod?.productSpecCharacteristic) {
      this.prod.productSpecCharacteristic.forEach((char: any) => {
        const value: string = char.productSpecCharacteristicValue?.[0]?.value ?? '';
        switch (char.valueType) {
          case 'endpointUrl':
            this.endpointUrls.push({ name: char.name ?? '', url: value, description: char.description ?? '', id: char.id });
            break;
          case 'upstreamAddress':
          case 'transferPath':
          case 'transferType':
            patch[char.valueType] = value;
            break;
          case 'targetSpecification':
          case 'serviceConfiguration':
          case 'credentialsConfig':
            patch[char.valueType] = JSON.stringify(value);
            break;
          case 'authorizationPolicy':
            patch['policyConfig'] = JSON.stringify(value);
        }
      });
    }
    this.dspConfigForm.patchValue(patch);
  }

  onBlueprintConfigChange(value: BlueprintProductFormValue) {
    this.blueprintConfig = value;
    this.prodRelationships = value.selectedItems.map((item: any) => ({
      id: item.id,
      href: item.href,
      relationshipType: 'dependency',
      name: item.name,
    }));
  }
}
