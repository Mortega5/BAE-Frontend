import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ResourceSpecServiceService, ResourceSpecType } from 'src/app/services/resource-spec-service.service';
import { CharacteristicFormValue } from 'src/app/shared/forms/specification-characteristic/specification-characteristic-form.component';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { v4 as uuidv4 } from 'uuid';

import { initFlowbite } from 'flowbite';
import { components } from "src/app/models/resource-catalog";
import { FormField, TableFormField } from '../../../../../models/formFields/form-field.model';
import { resourceConfigUpdate } from '../../../../../models/formFields/software-resource-fields';
import { SoftwareSpecification } from '../../../../../models/software.model';
import { buildFormGroup } from '../../../../../shared/forms/dynamic-form/build-form-group.util';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';
type ResourceSpecification_Update = components["schemas"]["ResourceSpecification_Update"];
type CharacteristicValueSpecification = components["schemas"]["ResourceSpecificationCharacteristicValue"];
type ResourceSpecificationCharacteristic = components["schemas"]["ResourceSpecificationCharacteristic"];

@Component({
  selector: 'update-resource-spec',
  templateUrl: './update-resource-spec.component.html',
  styleUrl: './update-resource-spec.component.css'
})
export class UpdateResourceSpecComponent implements OnInit, OnDestroy {
  @Input() res: any;

  partyId: any = '';

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'UPDATE_RES_SPEC._name', required: true, maxLength: 100 },
    {
      type: 'select',
      name: 'baseTemplate',
      label: 'CREATE_RES_SPEC._base_template',
      readonly: true,
      options: [
        { value: '', label: 'None' },
        { value: 'SoftwareSpecification', label: 'Software Specification' },
        { value: 'SoftwareSupportPackageSpecification', label: 'Software Support Package Specification' }
      ],
    },
    {
      type: 'statusPicker',
      name: 'lifecycleStatus',
      label: 'UPDATE_RES_SPEC._status',
      options: [
        { value: 'Active', label: 'UPDATE_CATALOG._active', activeClass: 'text-blue-500' },
        { value: 'Launched', label: 'UPDATE_CATALOG._launched', activeClass: 'text-green-700' },
        { value: 'Retired', label: 'UPDATE_CATALOG._retired', activeClass: 'text-yellow-500' },
        { value: 'Obsolete', label: 'UPDATE_CATALOG._obsolete', activeClass: 'text-red-800' },
      ],
    },
    { type: 'markdownTextarea', name: 'description', label: 'UPDATE_RES_SPEC._description' },
  ];

  resourceConfiguration = resourceConfigUpdate;

  templateConfigFields: FormField[] = [];
  templateConfigColumnCount: number = 1;

  templateConfigForm: FormGroup = new FormGroup({});

  resourceToUpdate: ResourceSpecification_Update | undefined;

  currentStep = 0;
  steps = [
    'General Info',
    'Characteristics',
    'Configuration',
    'Summary'
  ];

  //SERVICE GENERAL INFO:
  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    baseTemplate: new FormControl({ value: '', disabled: true }),
    lifecycleStatus: new FormControl('Active'),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  prodChars: ResourceSpecificationCharacteristic[] = [];
  showCreateChar: boolean = false;
  currentChar: CharacteristicFormValue | null = null;

  errorMessage: any = '';
  showError: boolean = false;
  loading: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
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
    console.log(this.res)
    this.populateResInfo();
    initFlowbite();
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

  populateResInfo() {

    const type = (this.res['@baseType'] ? this.res['@type'] : '') as ResourceSpecType;
    //GENERAL INFORMATION
    this.generalForm.controls['name'].setValue(this.res.name);
    this.generalForm.controls['description'].setValue(this.res.description);
    const baseTemplate = this.res['@baseType'] ? this.res['@type'] : '';
    this.generalForm.controls['baseTemplate'].setValue(baseTemplate);
    this.generalForm.controls['lifecycleStatus'].setValue(this.res.lifecycleStatus);

    //CHARS
    this.prodChars = this.res.resourceSpecCharacteristic;

    // CONFIG
    const templateConfig = type ? this.resourceConfiguration[type] : undefined;

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
    if (!this.currentChar) return;
    this.prodChars = [...this.prodChars, {
      id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
      name: this.currentChar.name,
      description: this.currentChar.description ?? '',
      valueType: this.currentChar.valueType,
      resourceSpecCharacteristicValue: this.currentChar.values as CharacteristicValueSpecification[]
    }];
    this.refreshChars();
  }

  deleteChar(char: any): void {
    this.prodChars = this.prodChars.filter(item => item.id !== char.id);
  }

  setResourceData() {
    if (this.generalForm.value.name != null) {
      this.resourceToUpdate = Object.assign({}, {
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        lifecycleStatus: this.generalForm.value.lifecycleStatus ?? 'Active',
        resourceSpecCharacteristic: this.prodChars
      }, this.templateConfigForm.value);
      if (this.res['@baseType']) {
        this.resourceToUpdate!['@type'] = this.res['@type'];
        this.resourceToUpdate!['@baseType'] = this.res['@baseType'];
      }
    }
  }

  updateResource() {
    this.setResourceData();
    this.loading = true;
    this.resSpecService.updateResSpec(this.resourceToUpdate, this.res.id, this.res?.['@type'] as ResourceSpecType).subscribe({
      next: data => {
        this.loading = false;
        this.goBack();
        console.log('serv updated')
      },
      error: error => {
        console.error('There was an error while updating!', error);
        if (error.error.error) {
          console.log(error)
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while updating the resource!';
        }
        this.loading = false;
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    })
  }

  refreshChars(): void {
    this.currentChar = null;
    this.showCreateChar = false;
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
    return true;
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStep = event.step;
    this.refreshChars();
    if (this.currentStep === 1) {
      setTimeout(() => initFlowbite(), 100);
    }
    if (event.isLastStep) {
      this.setResourceData();
    }
  }

}
