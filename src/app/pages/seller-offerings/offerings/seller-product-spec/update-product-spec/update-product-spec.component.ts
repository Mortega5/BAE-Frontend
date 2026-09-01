import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, DoCheck, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { initFlowbite } from 'flowbite';
import { jwtDecode } from "jwt-decode";
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IconCategory, POPULAR_ICON_CATEGORIES, findIconByName } from 'src/app/config/popular-icons';
import { certifications } from 'src/app/models/certification-standards.const';
import { buildLifecycleStatusOptions, FormField, SelectOption, TableFormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { components } from "src/app/models/product-catalog";
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PaginationService } from 'src/app/services/pagination.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { CharValueType } from 'src/app/shared/forms/characteristic-value-spec/characteristic-value-spec-form.component';
import { CharacteristicItem } from 'src/app/shared/forms/characteristics-editor/characteristics-editor.component';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
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
type ProductSpecFormStep = 'general' | 'productDetails' | 'bundle' | 'compliance' | 'characteristics' | 'dataspace' | 'resource' | 'service' | 'relationships' | 'faqs' | 'orchestrationPlan' | 'dsp_config';

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
export class UpdateProductSpecComponent implements OnInit, OnDestroy, DoCheck {
  prod: any;

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
    brand: new FormControl(''),
    version: new FormControl('0.1', [Validators.required, Validators.pattern('^-?[0-9]\\d*(\\.\\d*(\\.\\d*)?)?$'), noWhitespaceValidator]),
    number: new FormControl(''),
    lifecycleStatus: new FormControl('Active'),
    baseTemplate: new FormControl(''),
    dspCompatible: new FormControl(false),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  //PRODUCT DETAILS INFO (structured description, serialized into a hidden
  // <!--dome:details:start-->...<!--dome:details:end--> fragment appended to description):
  private readonly DETAILS_START = '<!--dome:details:start-->';
  private readonly DETAILS_END = '<!--dome:details:end-->';
  howItWorks: string = '';
  keyFeatures: { name: string, description: string, icon: string | null }[] = [];
  businessBenefits: { name: string, description: string }[] = [];
  useCases: { name: string, description: string, icon: string | null }[] = [];
  iconCategories: IconCategory[] = POPULAR_ICON_CATEGORIES;
  resolveIcon = findIconByName;
  itemModal: {
    type: 'feature' | 'benefit' | 'usecase' | null,
    name: string,
    description: string,
    icon: string | null,
    editIdx: number | null
  } = { type: null, name: '', description: '', icon: null, editIdx: null };
  openItemMenuIdx: { type: string, idx: number } | null = null;

  //FAQS INFO:
  faqs: { question: string, answer: string, expanded: boolean }[] = [];
  draggingFaqIdx: number | null = null;
  faqDeleteIdx: number | null = null;

  //DSP CONFIG INFO:
  newEndpointUrl: string = '';
  newEndpointDescription: string = '';
  newEndpointName: string = '';
  endpointUrls: { url: string; description: string; name: string, id?: string }[] = [];
  readonly transferTypes: SelectOption[] = [
    { value: 'HttpData-PULL', label: 'HttpData-PULL' },
    { value: 'HttpData-PUSH', label: 'HttpData-PUSH' }
  ];
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
  prodChars: ProductSpecificationCharacteristic[] = [];
  characteristicItems: CharacteristicItem[] = [];
  finishChars: ProductSpecificationCharacteristic[] = [];

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
  availableISOS: any[] = [];
  selectedISOS: any[] = [];
  additionalISOS: any[] = [];
  verifiedISO: string[] = [];
  complianceLevel: string = 'NL';
  complianceVC: any = null;
  complianceVCId: string = '';
  showRequestValidationModal: boolean = false;
  selfAtt: any;
  checkExistingSelfAtt: boolean = false;
  initialComplianceEvidenceSignature: string = '';

  //SERVICE INFO:
  defaultServSort: TableSort = { key: 'lastUpdate', direction: 'desc' };
  selectedServiceSpecs: any[] = [];
  servColumns: TableColumn[] = [
    { header: 'Name', getValue: (item: any) => item.name ?? '-', sortKey: 'name' },
    { header: 'Status', getValue: (item: any) => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus), sortKey: 'lifecycleStatus' },
    { header: 'Last update', getValue: (item: any) => this.datePipe.transform(item.lastUpdate, 'EEEE, dd/MM/yy, HH:mm') ?? '-', width: 'w-52', sortKey: 'lastUpdate' },
  ];

  //RESOURCE INFO:
  defaultResSort: TableSort = { key: 'lastUpdate', direction: 'desc' };
  selectedResourceSpecs: any[] = [];
  resColumns: TableColumn[] = [
    { header: 'Name', getValue: (item: any) => item.name ?? '-', sortKey: 'name' },
    { header: 'Type', getValue: (item: any) => item['@type'] ?? 'ResourceSpecification', hideOnMobile: true },
    { header: 'Status', getValue: (item: any) => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus), sortKey: 'lifecycleStatus' },
    { header: 'Last update', getValue: (item: any) => this.datePipe.transform(item.lastUpdate, 'EEEE, dd/MM/yy, HH:mm') ?? '-', width: 'w-52', sortKey: 'lastUpdate' },
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
  prodAttachments: AttachmentRefOrValue[] = [];

  //FINAL PRODUCT USING API CALL STRUCTURE
  productSpecToUpdate: ProductSpecification_Update | undefined;

  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;

  get notFound(): boolean {
    return !this.loading && !this.prod;
  }

  blueprintConfig: BlueprintProductFormValue;

  readonly dataSpaceCharacteristicTypes: string[] = [
    'credentialsConfiguration',
    'authorizationPolicy'
  ];
  readonly dataSpaceJsonCharacteristicTypes: string[] = [
    'credentialsConfiguration',
    'authorizationPolicy'
  ];

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
    private servSpecService: ServiceSpecServiceService,
    private resSpecService: ResourceSpecServiceService,
    private paginationService: PaginationService,
    private datePipe: DatePipe,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
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

  async ngOnInit() {
    this.initPartyInfo();
    this.loading = true;
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      this.prod = await this.prodSpecService.getResSpecById(id);
      this.populateProductInfo();
      initFlowbite();
    } catch (error) {
      console.error('Error loading product spec', error);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    document.body.style.overflow = '';
  }

  ngDoCheck(): void {
    const open = !!(this.itemModal.type || this.faqDeleteIdx !== null);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  /** Serializes howItWorks/keyFeatures/businessBenefits/useCases/faqs into a hidden HTML
   * fragment appended to the plain-text description, so it round-trips through the
   * ProductSpecification.description string field without needing a schema change. */
  private composeDescription(): string {
    const overview = (this.generalForm.value.description ?? '').toString();
    const sections = this.serializeProductDetails();
    if (!sections) return overview;
    return `${overview}\n${this.DETAILS_START}\n${sections}\n${this.DETAILS_END}`;
  }

  private serializeProductDetails(): string {
    const parts: string[] = [];
    if (this.howItWorks?.trim()) {
      parts.push(`<section data-dome-section="how-it-works" data-text="${this.attr(this.howItWorks)}"><h3>${this.esc(this.translate.instant('CREATE_PROD_SPEC._how_it_works'))}</h3><p>${this.esc(this.howItWorks)}</p></section>`);
    }
    parts.push(this.serializeItemSection('key-features', this.translate.instant('CREATE_PROD_SPEC._key_features'), this.keyFeatures, true));
    parts.push(this.serializeItemSection('business-benefits', this.translate.instant('CREATE_PROD_SPEC._business_benefits'), this.businessBenefits, false));
    parts.push(this.serializeItemSection('use-cases', this.translate.instant('CREATE_PROD_SPEC._use_cases'), this.useCases, true));
    parts.push(this.serializeFaqs());
    return parts.filter(Boolean).join('\n');
  }

  private serializeItemSection(key: string, title: string, items: any[], withIcon: boolean): string {
    if (!items || items.length === 0) return '';
    const lis = items.map(it => {
      const icon = withIcon && it.icon ? ` data-icon="${this.attr(it.icon)}"` : '';
      const desc = it.description ? `: ${this.esc(it.description)}` : '';
      return `<li data-name="${this.attr(it.name)}" data-desc="${this.attr(it.description || '')}"${icon}><strong>${this.esc(it.name)}</strong>${desc}</li>`;
    }).join('');
    return `<section data-dome-section="${key}"><h3>${this.esc(title)}</h3><ul>${lis}</ul></section>`;
  }

  private serializeFaqs(): string {
    if (!this.faqs || this.faqs.length === 0) return '';
    const lis = this.faqs.map(f =>
      `<li data-q="${this.attr(f.question)}" data-a="${this.attr(f.answer)}"><strong>${this.esc(f.question)}</strong><p>${this.esc(f.answer)}</p></li>`
    ).join('');
    return `<section data-dome-section="faqs"><h3>${this.esc(this.translate.instant('CREATE_PROD_SPEC._faqs'))}</h3><ul>${lis}</ul></section>`;
  }

  private esc(s: string): string {
    return (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private attr(s: string): string {
    return this.esc(s).replace(/"/g, '&quot;');
  }

  /** Reverse of composeDescription() — populates howItWorks/keyFeatures/businessBenefits/
   * useCases/faqs from an existing description when entering edit mode, and returns just
   * the plain-text overview (without the hidden fragment) for the description form control. */
  private parseDescription(raw: string | undefined): string {
    this.howItWorks = '';
    this.keyFeatures = [];
    this.businessBenefits = [];
    this.useCases = [];
    this.faqs = [];
    const text = (raw ?? '').toString();
    const startIdx = text.indexOf(this.DETAILS_START);
    if (startIdx === -1) return text;
    const overview = text.slice(0, startIdx).replace(/\n+$/, '');
    const endIdx = text.indexOf(this.DETAILS_END);
    const inner = text.slice(startIdx + this.DETAILS_START.length, endIdx > -1 ? endIdx : undefined);
    try {
      const doc = new DOMParser().parseFromString(`<div>${inner}</div>`, 'text/html');
      const how = doc.querySelector('[data-dome-section="how-it-works"]');
      if (how) this.howItWorks = how.getAttribute('data-text') || how.querySelector('p')?.textContent || '';
      this.keyFeatures = this.parseItemSection(doc, 'key-features', true);
      this.businessBenefits = this.parseItemSection(doc, 'business-benefits', false);
      this.useCases = this.parseItemSection(doc, 'use-cases', true);
      const faqSection = doc.querySelector('[data-dome-section="faqs"]');
      if (faqSection) {
        this.faqs = Array.from(faqSection.querySelectorAll('li')).map((li: any) => ({
          question: li.getAttribute('data-q') || '',
          answer: li.getAttribute('data-a') || '',
          expanded: false
        }));
      }
    } catch { }
    return overview;
  }

  private parseItemSection(doc: Document, key: string, withIcon: boolean): any[] {
    const section = doc.querySelector(`[data-dome-section="${key}"]`);
    if (!section) return [];
    return Array.from(section.querySelectorAll('li')).map((li: any) => {
      const name = li.getAttribute('data-name') || li.querySelector('strong')?.textContent || '';
      const description = li.getAttribute('data-desc') || '';
      return withIcon ? { name, description, icon: li.getAttribute('data-icon') || null } : { name, description };
    });
  }

  itemListFor(type: 'feature' | 'benefit' | 'usecase') {
    return type === 'feature' ? this.keyFeatures : type === 'benefit' ? this.businessBenefits : this.useCases;
  }

  itemDescriptionLimit(type: 'feature' | 'benefit' | 'usecase' | null): number {
    return type === 'usecase' ? 400 : 200;
  }

  openItemModal(type: 'feature' | 'benefit' | 'usecase', editIdx: number | null = null): void {
    if (editIdx !== null) {
      const existing: any = this.itemListFor(type)[editIdx];
      this.itemModal = { type, name: existing?.name || '', description: existing?.description || '', icon: existing?.icon ?? null, editIdx };
    } else {
      this.itemModal = { type, name: '', description: '', icon: null, editIdx: null };
    }
  }

  closeItemModal(): void {
    this.itemModal = { type: null, name: '', description: '', icon: null, editIdx: null };
  }

  selectModalIcon(name: string): void {
    this.itemModal.icon = this.itemModal.icon === name ? null : name;
  }

  saveItemModal(): void {
    const name = (this.itemModal.name || '').trim();
    if (!name || !this.itemModal.type) return;
    const description = (this.itemModal.description || '').trim();
    if (this.itemModal.type === 'benefit') {
      const entry = { name, description };
      if (this.itemModal.editIdx !== null) {
        this.businessBenefits[this.itemModal.editIdx] = entry;
      } else {
        this.businessBenefits.push(entry);
      }
    } else {
      const list = this.itemModal.type === 'feature' ? this.keyFeatures : this.useCases;
      const entry = { name, description, icon: this.itemModal.icon };
      if (this.itemModal.editIdx !== null) {
        list[this.itemModal.editIdx] = entry;
      } else {
        list.push(entry);
      }
    }
    this.closeItemModal();
  }

  removeItem(type: 'feature' | 'benefit' | 'usecase', idx: number): void {
    this.itemListFor(type).splice(idx, 1);
    this.openItemMenuIdx = null;
  }

  toggleItemMenu(type: string, idx: number, event: Event): void {
    event.stopPropagation();
    if (this.openItemMenuIdx && this.openItemMenuIdx.type === type && this.openItemMenuIdx.idx === idx) {
      this.openItemMenuIdx = null;
    } else {
      this.openItemMenuIdx = { type, idx };
    }
  }

  isItemMenuOpen(type: string, idx: number): boolean {
    return this.openItemMenuIdx?.type === type && this.openItemMenuIdx.idx === idx;
  }

  addFaq(): void {
    this.faqs.forEach(f => f.expanded = false);
    this.faqs.push({ question: '', answer: '', expanded: true });
  }

  removeFaq(idx: number): void {
    this.faqDeleteIdx = idx;
  }

  cancelDeleteFaq(): void {
    this.faqDeleteIdx = null;
  }

  confirmDeleteFaq(): void {
    if (this.faqDeleteIdx !== null) {
      this.faqs.splice(this.faqDeleteIdx, 1);
    }
    this.faqDeleteIdx = null;
  }

  toggleFaq(idx: number): void {
    const wasExpanded = this.faqs[idx]?.expanded;
    this.faqs.forEach((f, i) => f.expanded = (i === idx ? !wasExpanded : false));
  }

  onFaqDragStart(event: DragEvent, idx: number): void {
    this.draggingFaqIdx = idx;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(idx));
    }
  }

  onFaqDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) { event.dataTransfer.dropEffect = 'move'; }
  }

  onFaqDrop(event: DragEvent, targetIdx: number): void {
    event.preventDefault();
    const sourceIdx = this.draggingFaqIdx;
    this.draggingFaqIdx = null;
    if (sourceIdx === null || sourceIdx === targetIdx) return;
    const item = this.faqs.splice(sourceIdx, 1)[0];
    this.faqs.splice(targetIdx, 0, item);
  }

  onFaqDragEnd(): void {
    this.draggingFaqIdx = null;
  }

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'UPDATE_PROD_SPEC._product_name', required: true, maxLength: 100, colSpan: 1, placeholder: 'CREATE_PROD_SPEC._name_placeholder' },
    { type: 'string', name: 'brand', label: 'UPDATE_PROD_SPEC._product_brand', colSpan: 1 },
    { type: 'string', name: 'version', label: 'UPDATE_PROD_SPEC._product_version', required: true, colSpan: 1 },
    { type: 'string', name: 'number', label: 'UPDATE_PROD_SPEC._id_number', colSpan: 1 },
    {
      type: 'statusPicker', name: 'lifecycleStatus', label: 'UPDATE_RES_SPEC._status',
      options: buildLifecycleStatusOptions('productSpecStatus'),
    },
    { type: 'select', name: 'baseTemplate', label: 'CREATE_PROD_SPEC._base_template', options: BASE_TEMPLATE_OPTIONS, readonly: true },

    { type: 'markdownTextarea', name: 'description', label: 'UPDATE_PROD_SPEC._product_description', placeholder: 'CREATE_PROD_SPEC._product_description_placeholder' },
  ];

  dspFormFields: FormField[] = [
    { type: 'string', name: 'upstreamAddress', label: 'CREATE_PROD_SPEC._dsp_upstream_address', required: true, colSpan: 1 },
    { type: 'string', name: 'transferPath', label: 'CREATE_PROD_SPEC._dsp_transfer_path', required: false, colSpan: 1 },
    { type: 'select', name: 'transferType', label: 'CREATE_PROD_SPEC._dsp_transfer_type', options: this.transferTypes, colSpan: 1 },
    { type: 'code', name: 'targetSpecification', label: 'CREATE_PROD_SPEC._dsp_targetSpecification', language: 'json', required: true, lineNumbers: false, placeholder: '{"key": "value"}' },
    { type: 'code', name: 'serviceConfiguration', label: 'CREATE_PROD_SPEC._dsp_serviceConfiguration', language: 'json', required: true, lineNumbers: false, placeholder: '{"key": "value"}' },
    { type: 'code', name: 'credentialsConfig', label: 'CREATE_PROD_SPEC._dsp_credentialsConfig', language: 'json', required: true, lineNumbers: false, placeholder: '{"key": "value"}' },
    { type: 'code', name: 'policyConfig', label: 'CREATE_PROD_SPEC._dsp_policyConfig', language: 'json', required: true, lineNumbers: false, placeholder: '{"key": "value"}' }
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
    if (this.currentStepId === 'characteristics' || this.currentStepId === 'dataspace') { this.characteristicItems = this.buildCharacteristicItems(); }
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
    this.generalForm.controls['description'].setValue(this.parseDescription(this.prod.description));
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
            configurable: char.configurable,
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

    this.generalForm.controls['dspCompatible'].setValue(!!this.prod.externalId);
    if (this.prod.externalId) {
      this.addDspConfigStep();
    }
  }

  goBack() {
    this.router.navigate([SellerOfferingsPaths.productSpecs.list()]);
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

  /** Backing value for the self-attestation app-attachment-upload field. */
  get selfAttFile(): any {
    const url = this.selfAtt?.productSpecCharacteristicValue?.[0]?.value;
    return url ? { name: this.filenameFromComplianceUrl(url), url, attachmentType: '' } : null;
  }

  onSelfAttestationChange(file: any): void {
    this.selfAtt = file ? {
      id: this.selfAtt?.id || ('urn:ngsi-ld:characteristic:' + uuidv4()),
      name: 'Compliance:SelfAtt',
      productSpecCharacteristicValue: [{ isDefault: true, value: file.url }]
    } : null;
  }

  /** Backing value for the additional-attachments app-attachment-upload field. */
  get additionalAttestationFiles(): any[] {
    return this.additionalISOS.map(c => ({ name: this.normalizeName(c.name), url: c.url, attachmentType: '' }));
  }

  onComplianceAttachmentsChange(files: any[]): void {
    this.additionalISOS = (files || []).map(f => {
      const existing = this.additionalISOS.find(c => c.url === f.url);
      return { id: existing?.id, name: 'Compliance:' + f.name, url: f.url };
    });
  }

  downloadSelfAttestationTemplate(): void {
    const link = document.createElement('a');
    link.href = 'assets/documents/self-attestation-template.docx';
    link.download = 'self-attestation-template.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private filenameFromComplianceUrl(url: string): string {
    const last = url.split('/').pop() || url;
    const match = last.match(/^[0-9a-f-]{36}_(.+)$/i);
    return match ? match[1] : last;
  }

  fetchResourceSpecs = (params: PageRequest): Promise<PageResult<any>> => {
    return this.resSpecService.getResourceSpecByUserPaged(params, undefined, ['Active', 'Launched'], this.partyId);
  }

  fetchServiceSpecs = (params: PageRequest): Promise<PageResult<any>> => {
    return this.servSpecService.getServiceSpecByUserPaged(params, undefined, ['Active', 'Launched'], this.partyId);
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

  getFilteredCharacteristicsForCurrentStep(): ProductSpecificationCharacteristic[] {
    const nonCompliance = this.prodChars.filter((char: any) => !char.name?.startsWith('Compliance:'));
    if (this.isDataspaceConfigurationStep()) {
      return nonCompliance.filter((char: any) => this.isDataSpaceCharacteristicType(char.valueType));
    }
    return nonCompliance.filter((char: any) => !this.isDataSpaceCharacteristicType(char.valueType));
  }

  private buildCharacteristicItems(): CharacteristicItem[] {
    return this.getFilteredCharacteristicsForCurrentStep().map(c => ({
      id: c.id,
      name: c.name ?? '',
      description: c.description ?? '',
      configurable: c.configurable ?? false,
      valueType: c.valueType as CharValueType,
      values: (c.productSpecCharacteristicValue ?? []) as CharacteristicValueSpecification[],
      schemaLocation: c['@schemaLocation'],
    }));
  }

  onCharacteristicsChange(items: CharacteristicItem[]): void {
    const previousEditable = this.getFilteredCharacteristicsForCurrentStep();
    const untouched = this.prodChars.filter(c => !previousEditable.includes(c));

    // If a main characteristic was removed, also drop its "- enabled" companion, if any.
    const removedEnabledCompanions = previousEditable
      .filter(c => !c.name?.endsWith('- enabled') && !items.some(item => item.name === c.name))
      .map(c => c.name + ' - enabled');

    const updatedEditable: ProductSpecificationCharacteristic[] = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      configurable: item.configurable,
      valueType: item.valueType,
      productSpecCharacteristicValue: item.values as any[],
      ...(item.schemaLocation ? { '@schemaLocation': item.schemaLocation } : {}),
    }));

    this.characteristicItems = items;
    this.prodChars = [...untouched, ...updatedEditable].filter(c => !removedEnabledCompanions.includes(c.name ?? ''));
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
        description: this.composeDescription(),
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
