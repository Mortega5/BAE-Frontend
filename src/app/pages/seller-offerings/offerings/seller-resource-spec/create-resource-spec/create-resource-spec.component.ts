import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField, TableFormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ResourceSpecServiceService, ResourceSpecType } from 'src/app/services/resource-spec-service.service';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { CharacteristicFormValue } from 'src/app/shared/forms/specification-characteristic/specification-characteristic-form.component';
import { StepChangedEvent } from 'src/app/shared/stepper/stepper.component';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { v4 as uuidv4 } from 'uuid';

import { components } from "src/app/models/resource-catalog";
import { environment } from 'src/environments/environment';
import { resourceConfiguration } from '../../../../../models/formFields/software-resource-fields';
type ResourceSpecification_Create = components["schemas"]["ResourceSpecification_Create"];
type ResourceSpecificationCharacteristic = components["schemas"]["ResourceSpecificationCharacteristic"];

@Component({
  selector: 'create-resource-spec',
  templateUrl: './create-resource-spec.component.html',
  styleUrl: './create-resource-spec.component.css'
})
export class CreateResourceSpecComponent implements OnInit, OnDestroy {

  partyId: any = '';

  resourceToCreate: ResourceSpecification_Create | undefined;

  currentStep = 0;
  steps = [
    'General Info',
    'Characteristics',
    'Configuration',
    'Summary'
  ];

  baseTemplateOptions = [
    { value: '', label: 'None' },
    { value: 'SoftwareSpecification', label: 'Software Specification', api: 'software' },
    { value: 'SoftwareSupportPackageSpecification', label: 'Software Support Package Specification', api: 'software' }
  ];

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_RES_SPEC._name', required: true, maxLength: 100 },
    { type: 'select', name: 'baseTemplate', label: 'CREATE_RES_SPEC._base_template', options: this.baseTemplateOptions },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_RES_SPEC._description' },
  ];

  resourceConfiguration = resourceConfiguration;

  templateConfigFields: FormField[] = [];
  templateConfigForm: FormGroup = new FormGroup({});

  //SERVICE GENERAL INFO:
  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', Validators.maxLength(100000)),
    baseTemplate: new FormControl(''),
  });

  prodChars: ResourceSpecificationCharacteristic[] = [];
  currentChar: CharacteristicFormValue | null = null;
  showCreateChar: boolean = false;

  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private resSpecService: ResourceSpecServiceService,
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
    // Rebuild the template config form whenever the user changes the base template in step 0
    this.generalForm.get('baseTemplate')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: string | null) => {
        const templateConfig = value ? this.resourceConfiguration[value as ResourceSpecType] : undefined;

        this.templateConfigFields = templateConfig ? [...templateConfig.fields] : [];
        this.templateConfigForm = buildFormGroup(this.templateConfigFields);

        // TODO: get all packages
        if (value === 'SoftwareSpecification') {
          this.resSpecService.getSoftwareSupportPackages(this.partyId)
            .subscribe(packages => {
              const field = this.templateConfigFields.find(f => f.name === 'softwareSupportPackage') as TableFormField;
              if (field) field.items = packages ?? [];
            });
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.eventMessage.emitSellerResourceSpec(true);
  }

  onFormChange(value: CharacteristicFormValue): void {
    this.currentChar = value;
  }

  get canSaveChar(): boolean {
    return !!this.currentChar?.name?.trim() && (this.currentChar?.values?.length ?? 0) > 0;
  }

  saveChar(): void {
    if (this.currentChar?.name) {
      this.prodChars.push({
        id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
        name: this.currentChar.name,
        description: this.currentChar.description,
        configurable: this.currentChar.configurable,
        valueType: this.currentChar.valueType,
        resourceSpecCharacteristicValue: this.currentChar.values as any
      });
    }
    this.currentChar = null;
    this.showCreateChar = false;
    this.cdr.detectChanges();
  }

  deleteChar(char: any) {
    const index = this.prodChars.findIndex(item => item.id === char.id);
    if (index !== -1) {
      console.log('eliminar')
      this.prodChars.splice(index, 1);
    }
    this.cdr.detectChanges();
    console.log(this.prodChars)
  }

  showFinish() {
    if (this.generalForm.value.name != null) {
      this.resourceToCreate = Object.assign({}, {
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        lifecycleStatus: "Active",
        resourceSpecCharacteristic: this.prodChars,
        relatedParty: [
          {
            id: this.partyId,
            role: environment.SELLER_ROLE,
            "@referredType": ''
          }
        ],
      }, this.templateConfigForm.value);
      const type = this.generalForm.value.baseTemplate
      if (type) {
        this.resourceToCreate!['@type'] = type;
        this.resourceToCreate!['@baseType'] = 'ResourceSpecification';
        if (type === 'SoftwareSpecification') {
          this.resourceToCreate!.targetResourceSchema = { '@type': 'InstalledSoftware', "@schemaLocation": '' };
        }
      }
      this.refreshChars();
    }
  }

  createResource() {
    this.loading = true;
    this.resSpecService.postResSpec(this.resourceToCreate!, this.resourceToCreate!['@type'] as ResourceSpecType).subscribe({
      next: () => {
        this.loading = false;
        this.goBack();
        console.log('serv created')
      },
      error: error => {
        console.error('There was an error while creating!', error);
        if (error.error.error) {
          console.log(error)
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while creating the resource!';
        }
        this.loading = false;
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    })
  }

  refreshChars() {
    this.currentChar = null;
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  get canAdvance(): boolean {
    if (this.currentStep === 0) return this.generalForm?.valid ?? false;
    if (this.currentStep === 2) return this.templateConfigFields.length === 0 || this.templateConfigForm.valid;
    return true;
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStep = event.step;
    this.refreshChars();
    if (event.isLastStep) {
      this.showFinish();
    }
  }
}
