import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { initFlowbite } from 'flowbite';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { buildLifecycleStatusOptions, FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { components } from 'src/app/models/resource-catalog';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ResourceSpecServiceService, ResourceSpecType } from 'src/app/services/resource-spec-service.service';
import { CharacteristicItem } from 'src/app/shared/forms/characteristics-editor/characteristics-editor.component';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { StepChangedEvent } from 'src/app/shared/stepper/stepper.component';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';
import { buildResourceConfigUpdate, buildResourceConfiguration } from '../../../../../models/formFields/software-resource-fields';
import { SoftwareCharacteristic, SoftwareDeploymentDefinition, SoftwareSpecification } from '../../../../../models/software.model';
import { CharValueType } from '../../../../../shared/forms/characteristic-value-spec/characteristic-value-spec-form.component';

type ResourceSpecification_Create = components['schemas']['ResourceSpecification_Create'];
type ResourceSpecification_Update = components['schemas']['ResourceSpecification_Update'];
type CharacteristicValueSpecification = components['schemas']['ResourceSpecificationCharacteristicValue'];
type ResourceSpecificationCharacteristic = components['schemas']['ResourceSpecificationCharacteristic'];

const BASE_TEMPLATE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'SoftwareSpecification', label: 'Software Specification' },
  // Software Support Packages are now authored inline via the "Package Deployment" step
  // when creating a SoftwareSpecification, not as their own resource spec type.
  // { value: 'SoftwareSupportPackageSpecification', label: 'Software Support Package Specification' },
];

const GENERAL_FORM_FIELDS_CREATE: FormField[] = [
  { type: 'string', name: 'name', label: 'CREATE_RES_SPEC._name', required: true, maxLength: 100, dataCy: 'resSpecName', placeholder: 'CREATE_RES_SPEC._name_placeholder' },
  { type: 'select', name: 'baseTemplate', label: 'CREATE_RES_SPEC._base_template', options: BASE_TEMPLATE_OPTIONS },
  { type: 'markdownTextarea', name: 'description', label: 'CREATE_RES_SPEC._description', placeholder: 'CREATE_RES_SPEC._description_placeholder' },
];

const GENERAL_FORM_FIELDS_UPDATE: FormField[] = [
  { type: 'string', name: 'name', label: 'UPDATE_RES_SPEC._name', required: true, maxLength: 100, dataCy: 'resSpecName', placeholder: 'CREATE_RES_SPEC._name_placeholder' },
  { type: 'select', name: 'baseTemplate', label: 'CREATE_RES_SPEC._base_template', readonly: true, options: BASE_TEMPLATE_OPTIONS },
  {
    type: 'statusPicker', name: 'lifecycleStatus', label: 'UPDATE_RES_SPEC._status',
    options: buildLifecycleStatusOptions('resourceSpecStatus'),
  },
  { type: 'markdownTextarea', name: 'description', label: 'UPDATE_RES_SPEC._description', placeholder: 'CREATE_RES_SPEC._description_placeholder' },
];

@Component({
  selector: 'app-resource-spec-form',
  templateUrl: './resource-spec-form.component.html',

})
export class ResourceSpecFormComponent implements OnInit, OnDestroy {
  mode: 'create' | 'update' = 'create';
  res?: any;

  get isUpdate(): boolean { return this.mode === 'update'; }
  get i18nPrefix(): string { return this.isUpdate ? 'UPDATE_RES_SPEC' : 'CREATE_RES_SPEC'; }
  get notFound(): boolean { return this.isUpdate && !this.loading && !this.res; }

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
  advancedConfigOpen = false;

  deploymentForm: FormGroup | null = null;
  deploymentInitialValue?: SoftwareDeploymentDefinition;
  private originalDeploymentChar: SoftwareCharacteristic | null = null;

  get requiresPackageDeployment(): boolean {
    const type = this.isUpdate ? this.res?.['@type'] : this.generalForm.value.baseTemplate;
    return type === 'SoftwareSpecification';
  }

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    baseTemplate: new FormControl(''),
    lifecycleStatus: new FormControl('Active'),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  prodChars: ResourceSpecificationCharacteristic[] = [];
  characteristicItems: CharacteristicItem[] = [];

  errorMessage: any = '';
  showError = false;
  showPublishDraftModal = false;
  loading = false;

  allowedChars: CharValueType[] = ['string', 'number', 'range', 'object'];

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private resSpecService: ResourceSpecServiceService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') this.initPartyInfo();
      });
  }

  async ngOnInit(): Promise<void> {
    this.initPartyInfo();
    this.mode = this.route.snapshot.data['mode'] ?? 'create';
    if (this.isUpdate) {
      this.loading = true;
      const id = this.route.snapshot.paramMap.get('id')!;
      try {
        this.res = await this.fetchResSpecById(id);
        this.generalForm.get('baseTemplate')!.disable();
        this.populateResInfo();
        initFlowbite();
      } catch (error) {
        console.error('Error loading resource spec', error);
      } finally {
        this.loading = false;
      }
    } else {
      this.generalForm.get('baseTemplate')!.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((value: string | null) => {
          const configs = buildResourceConfiguration({ partyId: this.partyId, resSpecService: this.resSpecService });
          const config = value ? configs[value as ResourceSpecType] : undefined;
          this.templateConfigFields = config ? [...config.fields] : [];
          this.templateConfigForm = buildFormGroup(this.templateConfigFields);
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async fetchResSpecById(id: string): Promise<any> {
    const primaryType: ResourceSpecType = id.startsWith('urn:ngsi-ld:software-') ? 'SoftwareSpecification' : 'ResourceSpecification';
    const fallbackType: ResourceSpecType = primaryType === 'ResourceSpecification' ? 'SoftwareSpecification' : 'ResourceSpecification';
    try {
      return await this.resSpecService.getResSpecById(id, primaryType);
    } catch {
      return await this.resSpecService.getResSpecById(id, fallbackType);
    }
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
    this.characteristicItems = this.buildCharacteristicItems();

    const configs = type ? buildResourceConfigUpdate({ partyId: this.partyId, resSpecService: this.resSpecService }) : undefined;
    const templateConfig = configs && type ? configs[type] : undefined;
    this.templateConfigFields = templateConfig ? templateConfig.fields : [];
    this.templateConfigColumnCount = templateConfig ? templateConfig.columnCount : 1;
    this.templateConfigForm = buildFormGroup(this.templateConfigFields);
    this.templateConfigForm.patchValue(this.res);

    if (type === 'SoftwareSpecification') {
      const packageId = (this.res as SoftwareSpecification).softwareSupportPackage?.id;
      if (packageId) {
        this.resSpecService.getSoftwareSupportPackage(packageId)
          .subscribe(pkg => {
            this.templateConfigForm.patchValue({ softwareSupportPackage: pkg });
            const pkgChars = (pkg.resourceCharacteristic ?? []) as SoftwareCharacteristic[];
            this.originalDeploymentChar = pkgChars.find(c => c.valueType === 'deployment') ?? null;
            this.deploymentInitialValue = this.originalDeploymentChar?.value as SoftwareDeploymentDefinition | undefined;
          });
      }
    }
  }

  goBack(): void {
    this.router.navigate([SellerOfferingsPaths.resourceSpecs.list()]);
  }

  private buildCharacteristicItems(): CharacteristicItem[] {
    return this.prodChars.map(c => ({
      id: c.id,
      name: c.name ?? '',
      description: c.description ?? '',
      configurable: c.configurable ?? false,
      valueType: c.valueType as CharValueType,
      values: (c.resourceSpecCharacteristicValue ?? []) as CharacteristicValueSpecification[],
    }));
  }

  onCharacteristicsChange(items: CharacteristicItem[]): void {
    this.characteristicItems = items;
    this.prodChars = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      configurable: item.configurable,
      valueType: item.valueType,
      resourceSpecCharacteristicValue: item.values as CharacteristicValueSpecification[],
    }));
  }

  onDeploymentFormReady(form: FormGroup): void {
    this.deploymentForm = form;
  }

  private getArtifactType(deployment: SoftwareDeploymentDefinition): string {
    switch (deployment.type) {
      case 'helm':
        return 'HelmChart';
      case 'docker':
        return deployment.properties?.composeFile ? 'DockerCompose' : 'DockerImage';
    }
  }

  private buildResourceCharacteristics(): ResourceSpecificationCharacteristic[] {
    const chars: any[] = [...this.prodChars];
    if (!this.requiresPackageDeployment) return chars;

    if (this.deploymentForm) {
      chars.push({
        name: 'deploymentDefinition',
        valueType: 'deployment',
        value: this.deploymentForm.value,
        '@schemaLocation': environment.DEPLOYMENT_SCHEMA_LOCATION,
      });
    } else if (this.originalDeploymentChar) {
      chars.push(this.originalDeploymentChar);
    }

    chars.push({
      name: 'artifactType',
      valueType: 'string',
      value: this.getArtifactType(this.deploymentForm?.value || this.originalDeploymentChar),
    });

    return chars;
  }

  private prepareData(): void {
    if (!this.generalForm.value.name) return;

    this.resourceData = Object.assign({}, {
      name: this.generalForm.value.name,
      description: this.generalForm.value.description ?? '',
      lifecycleStatus: this.generalForm.value.lifecycleStatus ?? 'Active',
      resourceSpecCharacteristic: this.buildResourceCharacteristics(),
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
    this.prepareData();
    if (this.isUpdate) {
      this.loading = true;
      this.resSpecService.updateResSpec(this.resourceData as ResourceSpecification_Update, this.res.id, this.res?.['@type'] as ResourceSpecType)
        .subscribe({ next: () => { this.loading = false; this.goBack(); }, error: e => this.handleError(e) });
    } else {
      this.showPublishDraftModal = true;
    }
  }

  saveDraft(): void {
    this.createResource('Active');
  }

  publish(): void {
    this.createResource('Launched');
  }

  private createResource(lifecycleStatus: 'Active' | 'Launched'): void {
    if (!this.resourceData) return;
    (this.resourceData as any).lifecycleStatus = lifecycleStatus;
    this.loading = true;
    this.resSpecService.postResSpec(this.resourceData as ResourceSpecification_Create, (this.resourceData as any)?.['@type'] as ResourceSpecType)
      .subscribe({
        next: () => { this.loading = false; this.showPublishDraftModal = false; this.goBack(); },
        error: e => this.handleError(e),
      });
  }

  private handleError(error: any): void {
    this.errorMessage = error.error?.error
      ? 'Error: ' + error.error.error
      : `There was an error while ${this.isUpdate ? 'updating' : 'creating'} the resource!`;
    this.loading = false;
    this.showPublishDraftModal = false;
    this.showError = true;
    setTimeout(() => this.showError = false, 3000);
  }

  get canAdvance(): boolean {
    if (this.currentStepId === 'general') return this.generalForm?.valid ?? false;
    if (this.currentStepId === 'packageDeployment') {
      return !this.requiresPackageDeployment || (this.deploymentForm?.valid ?? false);
    }
    if (this.currentStepId === 'configuration') return this.templateConfigFields.length === 0 || this.templateConfigForm.valid;
    return true;
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStep = event.step;
    this.currentStepId = event.stepId ?? 'general';
    if (this.currentStepId === 'characteristics' && this.isUpdate) setTimeout(() => initFlowbite(), 100);
    if (event.isLastStep) this.prepareData();
  }
}
