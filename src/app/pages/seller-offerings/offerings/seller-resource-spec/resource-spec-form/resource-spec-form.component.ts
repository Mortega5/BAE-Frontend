import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { initFlowbite } from 'flowbite';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { buildLifecycleStatusOptions, FormField, TableFormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { components } from 'src/app/models/resource-catalog';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ResourceSpecServiceService, ResourceSpecType } from 'src/app/services/resource-spec-service.service';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { CharacteristicFormValue } from 'src/app/shared/forms/specification-characteristic/specification-characteristic-form.component';
import { StepChangedEvent } from 'src/app/shared/stepper/stepper.component';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { resourceConfigUpdate, resourceConfiguration } from '../../../../../models/formFields/software-resource-fields';
import { SoftwareSpecification } from '../../../../../models/software.model';
import { CharValueType } from '../../../../../shared/forms/characteristic-value-spec/characteristic-value-spec-form.component';

type ResourceSpecification_Create = components['schemas']['ResourceSpecification_Create'];
type ResourceSpecification_Update = components['schemas']['ResourceSpecification_Update'];
type CharacteristicValueSpecification = components['schemas']['ResourceSpecificationCharacteristicValue'];
type ResourceSpecificationCharacteristic = components['schemas']['ResourceSpecificationCharacteristic'];

const BASE_TEMPLATE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'SoftwareSpecification', label: 'Software Specification' },
  { value: 'SoftwareSupportPackageSpecification', label: 'Software Support Package Specification' },
];

const GENERAL_FORM_FIELDS_CREATE: FormField[] = [
  { type: 'string', name: 'name', label: 'CREATE_RES_SPEC._name', required: true, maxLength: 100, dataCy: 'resSpecName' },
  { type: 'select', name: 'baseTemplate', label: 'CREATE_RES_SPEC._base_template', options: BASE_TEMPLATE_OPTIONS },
  { type: 'markdownTextarea', name: 'description', label: 'CREATE_RES_SPEC._description' },
];

const GENERAL_FORM_FIELDS_UPDATE: FormField[] = [
  { type: 'string', name: 'name', label: 'UPDATE_RES_SPEC._name', required: true, maxLength: 100, dataCy: 'resSpecName' },
  { type: 'select', name: 'baseTemplate', label: 'CREATE_RES_SPEC._base_template', readonly: true, options: BASE_TEMPLATE_OPTIONS },
  {
    type: 'statusPicker', name: 'lifecycleStatus', label: 'UPDATE_RES_SPEC._status',
    options: buildLifecycleStatusOptions('resourceSpecStatus'),
  },
  { type: 'markdownTextarea', name: 'description', label: 'UPDATE_RES_SPEC._description' },
];

@Component({
  selector: 'app-resource-spec-form',
  templateUrl: './resource-spec-form.component.html',

})
export class ResourceSpecFormComponent implements OnInit, OnDestroy {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() res?: any;

  get isUpdate(): boolean { return this.mode === 'update'; }
  get i18nPrefix(): string { return this.isUpdate ? 'UPDATE_RES_SPEC' : 'CREATE_RES_SPEC'; }

  partyId: any = '';

  resourceData: ResourceSpecification_Create | ResourceSpecification_Update | undefined;

  currentStep = 0;
  currentStepId = 'general'
  get generalFormFields(): FormField[] {

    return this.isUpdate ? GENERAL_FORM_FIELDS_UPDATE : GENERAL_FORM_FIELDS_CREATE
  }

  templateConfigFields: FormField[] = [];
  templateConfigColumnCount = 1;
  templateConfigForm: FormGroup = new FormGroup({});

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    baseTemplate: new FormControl(''),
    lifecycleStatus: new FormControl('Active'),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  prodChars: ResourceSpecificationCharacteristic[] = [];
  showCreateChar = false;
  currentChar: CharacteristicFormValue | null = null;

  errorMessage: any = '';
  showError = false;
  loading = false;

  allowedChars: CharValueType[] = ['string', 'number', 'range', 'object'];

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private resSpecService: ResourceSpecServiceService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') this.initPartyInfo();
      });
  }

  ngOnInit(): void {
    this.initPartyInfo();
    if (this.isUpdate) {
      this.generalForm.get('baseTemplate')!.disable();
      this.populateResInfo();
      initFlowbite();
    } else {
      this.generalForm.get('baseTemplate')!.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((value: string | null) => {
          const config = value ? resourceConfiguration[value as ResourceSpecType] : undefined;
          this.templateConfigFields = config ? [...config.fields] : [];
          this.templateConfigForm = buildFormGroup(this.templateConfigFields);
          if (value === 'SoftwareSpecification') {
            this.resSpecService.getSoftwareSupportPackages(this.partyId)
              .subscribe(packages => {
                const field = this.templateConfigFields.find(f => f.name === 'softwareSupportPackage') as TableFormField;
                if (field) field.items = packages ?? [];
              });
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initPartyInfo(): void {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((element: { id: any }) => element.id == aux.logged_as);
        this.partyId = loggedOrg.partyId;
      }
    }
  }

  private populateResInfo(): void {
    const type = (this.res['@baseType'] ? this.res['@type'] : '') as ResourceSpecType;
    this.generalForm.controls['name'].setValue(this.res.name);
    this.generalForm.controls['description'].setValue(this.res.description);
    this.generalForm.controls['baseTemplate'].setValue(this.res['@baseType'] ? this.res['@type'] : '');
    this.generalForm.controls['lifecycleStatus'].setValue(this.res.lifecycleStatus);
    this.prodChars = this.res.resourceSpecCharacteristic;

    const templateConfig = type ? resourceConfigUpdate[type] : undefined;
    this.templateConfigFields = templateConfig ? templateConfig.fields : [];
    this.templateConfigColumnCount = templateConfig ? templateConfig.columnCount : 1;
    this.templateConfigForm = buildFormGroup(this.templateConfigFields);
    this.templateConfigForm.patchValue(this.res);

    if (type === 'SoftwareSpecification') {
      this.resSpecService.getSoftwareSupportPackage((this.res as SoftwareSpecification).softwareSupportPackage?.id!)
        .subscribe(pkg => {
          const field = this.templateConfigFields.find(f => f.name === 'softwareSupportPackage') as TableFormField;
          if (field) {
            field.items = [pkg];
            this.templateConfigForm.patchValue({ softwareSupportPackage: pkg });
          }
        });
    }
  }

  goBack(): void {
    this.eventMessage.emitSellerResourceSpec(true);
  }

  onFormChange(value: CharacteristicFormValue): void {
    this.currentChar = value;
  }

  get canSaveChar(): boolean {
    return !!this.currentChar?.name?.trim() && (this.currentChar?.values?.length ?? 0) > 0;
  }

  saveChar(): void {
    if (!this.currentChar?.name) return;
    this.prodChars = [...this.prodChars, {
      id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
      name: this.currentChar.name,
      description: this.currentChar.description ?? '',
      configurable: this.currentChar.configurable,
      valueType: this.currentChar.valueType,
      resourceSpecCharacteristicValue: this.currentChar.values as CharacteristicValueSpecification[],
    }];
    this.refreshChars();
  }

  deleteChar(char: any): void {
    this.prodChars = this.prodChars.filter(item => item.id !== char.id);
  }

  private prepareData(): void {
    if (!this.generalForm.value.name) return;

    this.resourceData = Object.assign({}, {
      name: this.generalForm.value.name,
      description: this.generalForm.value.description ?? '',
      lifecycleStatus: this.generalForm.value.lifecycleStatus ?? 'Active',
      resourceSpecCharacteristic: this.prodChars,
      ...(!this.isUpdate && {
        relatedParty: [{ id: this.partyId, role: environment.SELLER_ROLE, '@referredType': '' }],
      }),
    }, this.templateConfigForm.value);

    const type = this.isUpdate
      ? this.res?.['@type']
      : this.generalForm.value.baseTemplate;

    const baseType = this.isUpdate
      ? this.res?.['@baseType']
      : type ? 'ResourceSpecification' : undefined;

    if (type) (this.resourceData as any)['@type'] = type;
    if (baseType) (this.resourceData as any)['@baseType'] = baseType;

    // Add targetResourceSchema if create and SoftwareSpecification
    if (type === 'SoftwareSpecification' && !this.isUpdate) {
      (this.resourceData as ResourceSpecification_Create).targetResourceSchema = {
        '@type': 'InstalledSoftware',
        '@schemaLocation': ''
      };
    }
  }

  save(): void {
    this.loading = true;
    if (this.isUpdate) {
      this.resSpecService.updateResSpec(this.resourceData as ResourceSpecification_Update, this.res.id, this.res?.['@type'] as ResourceSpecType)
        .subscribe({ next: () => { this.loading = false; this.goBack(); }, error: e => this.handleError(e) });
    } else {
      this.resSpecService.postResSpec(this.resourceData as ResourceSpecification_Create, (this.resourceData as any)?.['@type'] as ResourceSpecType)
        .subscribe({ next: () => { this.loading = false; this.goBack(); }, error: e => this.handleError(e) });
    }
  }

  private handleError(error: any): void {
    this.errorMessage = error.error?.error
      ? 'Error: ' + error.error.error
      : `There was an error while ${this.isUpdate ? 'updating' : 'creating'} the resource!`;
    this.loading = false;
    this.showError = true;
    setTimeout(() => this.showError = false, 3000);
  }

  refreshChars(): void {
    this.currentChar = null;
    this.showCreateChar = false;
  }

  hasLongWord(str: string | undefined, threshold = 20): boolean {
    return str ? str.split(/\s+/).some(word => word.length > threshold) : false;
  }

  get canAdvance(): boolean {
    if (this.currentStep === 0) return this.generalForm?.valid ?? false;
    if (this.currentStep === 2) return this.templateConfigFields.length === 0 || this.templateConfigForm.valid;
    return true;
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStep = event.step;
    this.refreshChars();
    if (this.currentStep === 1 && this.isUpdate) setTimeout(() => initFlowbite(), 100);
    if (event.isLastStep) this.prepareData();
  }
}
