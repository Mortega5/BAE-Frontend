import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, DoCheck, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { faXmark } from '@fortawesome/pro-solid-svg-icons';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IconCategory, POPULAR_ICON_CATEGORIES, findIconByName } from 'src/app/config/popular-icons';
import { FormField, SelectOption, TableFormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { components } from "src/app/models/product-catalog";
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PaginationService } from 'src/app/services/pagination.service';
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
type ProductSpecification_Create = components["schemas"]["ProductSpecification_Create"];
type BundledProductSpecification = components["schemas"]["BundledProductSpecification"];
type ProductSpecificationCharacteristic = components["schemas"]["ProductSpecificationCharacteristic"];
type AttachmentRefOrValue = components["schemas"]["AttachmentRefOrValue"];
type ProductSpecFormStep = 'general' | 'productDetails' | 'bundle' | 'compliance' | 'characteristics' | 'dataspace' | 'resource' | 'service' |
  'relationships' | 'faqs' | 'orchestrationPlan' | 'dsp_config';

const BASE_TEMPLATE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'BlueprintProductSpecification', label: 'Blueprint Product Specification' },
];
@Component({
  selector: 'create-product-spec',
  templateUrl: './create-product-spec.component.html',
  styleUrl: './create-product-spec.component.css',
  providers: [DatePipe],
})
export class CreateProductSpecComponent implements OnInit, OnDestroy, DoCheck {

  //PAGE SIZES:
  PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;
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
    baseTemplate: new FormControl(''),
    description: new FormControl('', Validators.maxLength(100000)),
    dspCompatible: new FormControl(false),
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
  newEndpointFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_PROD_SPEC._dsp_endpoint_name', placeholder: 'CREATE_PROD_SPEC._dsp_endpoint_name_placeholder', colSpan: 1, dataCy: 'dspEndpointName' },
    { type: 'string', name: 'url', label: 'CREATE_PROD_SPEC._dsp_endpoint_url', required: true, placeholder: 'CREATE_PROD_SPEC._dsp_endpoint_url_placeholder', colSpan: 1, dataCy: 'dspEndpointUrl' },
    { type: 'textarea', name: 'description', label: 'CREATE_PROD_SPEC._dsp_endpoint_description', required: true, placeholder: 'CREATE_PROD_SPEC._dsp_endpoint_description_placeholder', rows: 3, maxLength: 100000, colSpan: 2, dataCy: 'dspEndpointDescription' },
  ];
  newEndpointForm = buildFormGroup(this.newEndpointFormFields);
  endpointUrls: { url: string; description: string, name: string }[] = [];
  endpointUrlColumns: TableColumn[] = [
    { header: 'Endpoint URL', getValue: (item: any) => item.url, width: 'w-96', cellClass: () => 'break-all' },
    { header: 'Description', getValue: (item: any) => item.description, cellClass: () => 'break-words' },
    {
      header: 'Actions', type: 'actions', width: 'w-48',
      actions: [{
        icon: faXmark, tooltip: '_delete', dataCy: 'removeEndpointUrl',
        buttonClass: '!w-7 !h-7 bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
        onClick: (item: any) => this.removeEndpointUrl(this.endpointUrls.indexOf(item)),
      }],
    },
  ];
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
  additionalISOS: any[] = [];
  selfAtt: any;

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
  prodRelationships: any[] = [];
  showCreateRel: boolean = false;
  prodSpecRelPage = 0;
  prodSpecRelPageCheck: boolean = false;
  loadingprodSpecRel: boolean = false;
  loadingprodSpecRel_more: boolean = false;
  prodSpecRels: any[] = [];
  nextProdSpecRels: any[] = [];
  relFormFields: FormField[] = [
    {
      type: 'select',
      name: 'relType',
      label: 'CREATE_PROD_SPEC._relationship_type',
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
      label: 'CREATE_PROD_SPEC._product_name',
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
  productSpecToCreate: ProductSpecification_Create | undefined;

  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;

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

  get dspEnable(): boolean {
    return environment.DSP_ENABLED && this.DATA_SPACE_ENABLED;
  }

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_PROD_SPEC._product_name', required: true, maxLength: 100, colSpan: 1, dataCy: 'inputName', placeholder: 'CREATE_PROD_SPEC._name_placeholder' },
    { type: 'string', name: 'brand', label: 'CREATE_PROD_SPEC._product_brand', colSpan: 1, dataCy: 'inputBrand' },
    { type: 'string', name: 'version', label: 'CREATE_PROD_SPEC._product_version', required: true, colSpan: 1, dataCy: 'inputVersion' },
    { type: 'string', name: 'number', label: 'CREATE_PROD_SPEC._id_number', colSpan: 1, dataCy: 'inputIdNumber' },
    { type: 'select', name: 'baseTemplate', label: 'CREATE_PROD_SPEC._base_template', options: BASE_TEMPLATE_OPTIONS, colSpan: 1 },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_PROD_SPEC._product_description', placeholder: 'CREATE_PROD_SPEC._product_description_placeholder' },
  ];

  dspFormFields: FormField[] = [
    { type: 'string', name: 'upstreamAddress', label: 'CREATE_PROD_SPEC._dsp_upstream_address', required: true, colSpan: 1 },
    { type: 'string', name: 'transferPath', label: 'CREATE_PROD_SPEC._dsp_transfer_path', required: false, colSpan: 1 },
    { type: 'select', name: 'transferType', label: 'CREATE_PROD_SPEC._dsp_transfer_type', options: this.transferTypes, colSpan: 1 },
    { type: 'code', name: 'targetSpecification', label: 'CREATE_PROD_SPEC._dsp_targetSpecification', language: 'json', required: true, lineNumbers: false, placeholder: '{"key": "value"}' },
    { type: 'code', name: 'serviceConfiguration', label: 'CREATE_PROD_SPEC._dsp_serviceConfiguration', language: 'json', required: true, lineNumbers: false, placeholder: '{"key": "value"}' },
    { type: 'code', name: 'credentialsConfig', label: 'CREATE_PROD_SPEC._dsp_credentialsConfig', language: 'json', required: true, lineNumbers: false, placeholder: '{"key": "value"}' },
    { type: 'code', name: 'policyConfig', label: 'CREATE_PROD_SPEC._dsp_policyConfig', language: 'json', required: true, lineNumbers: false, placeholder: '{"key": "value"}' }

  ]
  get canAdvance(): boolean {
    if (this.currentStepId === 'general') return this.generalForm?.valid ?? false;
    if (this.currentStepId === 'bundle') {
      return !(this.bundleChecked && this.prodSpecsBundle.length < 2);
    }
    if (this.currentStepId === 'relationships' && this.templateName === 'BlueprintProductSpecification') {
      return this.prodRelationships.length > 0;
    }
    if (this.currentStepId === 'dsp_config') {
      return this.dspConfigForm.valid ?? false
    }

    if (this.currentStepId === 'orchestrationPlan') {
      return this.blueprintConfig?.valid ?? false;
    }
    return true;
  }

  get templateName(): string {
    return this.generalForm.get('baseTemplate')?.value || '';
  }

  constructor(
    private prodSpecService: ProductSpecServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private servSpecService: ServiceSpecServiceService,
    private resSpecService: ResourceSpecServiceService,
    private paginationService: PaginationService,
    private datePipe: DatePipe,
    private router: Router,
    private translate: TranslateService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      })
  }

  ngOnInit() {
    this.initPartyInfo();
    this.generalForm.get('dspCompatible')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(dspCompatible => {
        this.showDspConfigStep = !!dspCompatible;
      });
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

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId as ProductSpecFormStep
    switch (this.currentStepId) {
      case 'characteristics':
      case 'dataspace':
        this.characteristicItems = this.buildCharacteristicItems();
        break;
      case 'relationships':
        this.getProdSpecsRel(false);
        break;
    }
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

  private hasSelfAttestation(): boolean {
    const selfAttestationValue = this.selfAtt?.productSpecCharacteristicValue?.[0]?.value;
    if (typeof selfAttestationValue === 'string') {
      return selfAttestationValue.trim() !== '';
    }
    return !!selfAttestationValue;
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
    this.additionalISOS = (files || []).map(f => ({ name: 'Compliance:' + f.name, url: f.url }));
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
        (this.relFormFields[1] as TableFormField).items = data.items;
        this.nextProdSpecRels = data.nextItems;
        this.prodSpecRelPage = data.page;
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
      productSpec: prodSpec
    });
    this.relForm.reset({ relType: 'migration', prodSpec: null });
    console.log(this.prodRelationships)
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

  showFinish() {
    this.finishChars = [];
    console.log('--- set product data')
    console.log(this.prodChars)
    for (let i = 0; i < this.prodChars.length; i++) {
      const index = this.finishChars.findIndex(item => item.name === this.prodChars[i].name);
      if (index == -1) {
        this.finishChars.push(this.prodChars[i])
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
          id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
          name: this.additionalISOS[i].name,
          productSpecCharacteristicValue: [{
            isDefault: true,
            value: this.additionalISOS[i].url
          }]
        })
      }
      console.log(this.finishChars)
    }

    // Keep self attestation from compliance step in final payload.
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

    let rels = [];
    for (let i = 0; i < this.prodRelationships.length; i++) {
      rels.push({
        id: this.prodRelationships[i].id,
        href: this.prodRelationships[i].href,
        name: this.prodRelationships[i].name,
        relationshipType: this.prodRelationships[i].relationshipType
      })
    }
    console.log('rels')
    console.log(rels)
    if (this.generalForm.value.name != null && this.generalForm.value.version != null && this.generalForm.value.brand != null) {
      this.productSpecToCreate = {
        name: this.generalForm.value.name,
        description: this.composeDescription(),
        version: this.generalForm.value.version,
        brand: this.generalForm.value.brand,
        productNumber: this.generalForm.value.number != null ? this.generalForm.value.number : '',
        lifecycleStatus: "Active",
        isBundle: this.bundleChecked,
        bundledProductSpecification: this.prodSpecsBundle,
        productSpecCharacteristic: this.finishChars,
        productSpecificationRelationship: rels,
        attachment: this.prodAttachments,
        relatedParty: [
          {
            id: this.partyId,
            //href: "http://proxy.docker:8004/party/individual/urn:ngsi-ld:individual:803ee97b-1671-4526-ba3f-74681b22ccf3",
            role: environment.SELLER_ROLE,
            "@referredType": ''
          }
        ],
        resourceSpecification: this.selectedResourceSpecs.map(res => ({ id: res.id, href: res.href })),
        serviceSpecification: this.selectedServiceSpecs.map(res => ({ id: res.id, href: res.href }))
      }
      if (this.blueprintConfig) {
        this.productSpecToCreate['@type'] = 'BlueprintProductSpecification';
        this.productSpecToCreate['@schemaLocation'] = environment.BLUEPRINT_SCHEMA;
        this.productSpecToCreate['@baseType'] = 'ProductSpecification';
        (this.productSpecToCreate as any).orchestrationPlan = {
          steps: this.blueprintConfig.orchestrationSteps,
        }
      }
    }
    if (this.generalForm.value.dspCompatible) {
      this.productSpecToCreate!.productSpecCharacteristic = this.productSpecToCreate?.productSpecCharacteristic || [];
      (this.productSpecToCreate! as any).externalId = uuidv4();
      this.productSpecToCreate!['@schemaLocation'] = environment.DSP_SCHEMA;
      this.endpointUrls.forEach(endpoint => {
        this.productSpecToCreate!.productSpecCharacteristic!.push({
          id: uuidv4(),
          description: endpoint.description,
          valueType: 'endpointUrl',
          name: endpoint.name,
          productSpecCharacteristicValue: [
            { value: endpoint.url! as any, isDefault: true }
          ]
        })
      })
      const dspConfigValue = this.dspConfigForm.value;
      this.productSpecToCreate!.productSpecCharacteristic!.push(
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
        this.productSpecToCreate!.productSpecCharacteristic!.push({
          id: 'transferPath',
          name: 'transferPath',
          valueType: 'transferPath',
          productSpecCharacteristicValue: [
            { value: dspConfigValue.transferPath as any, isDefault: true }
          ]
        })
      }
    }
    console.log('PRODUCTO A CREAR:')
    console.log(this.productSpecToCreate)
  }

  createProduct() {
    this.loading = true;
    this.prodSpecService.postProdSpec(this.productSpecToCreate).subscribe({
      next: data => {
        this.loading = false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating!', error);
        if (error.error.error) {
          console.log(error)
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while creating the product!';
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

  addEndpointUrl(): void {
    if (!this.newEndpointForm.valid) return;
    const { name, url, description } = this.newEndpointForm.value;
    this.endpointUrls = [...this.endpointUrls, { url: url.trim(), description: description.trim(), name: (name ?? '').trim() }];
    this.newEndpointForm.reset();
  }

  removeEndpointUrl(idx: number): void {
    this.endpointUrls = this.endpointUrls.filter((_, i) => i !== idx);
  }

  onBlueprintConfigChange(value: BlueprintProductFormValue) {
    this.blueprintConfig = value;
    this.prodRelationships = value.selectedItems.map((item: any) => ({
      id: item.id,
      href: item.href,
      relationshipType: 'dependency',
      name: item.name,
      productSpec: item
    }));
  }
}
