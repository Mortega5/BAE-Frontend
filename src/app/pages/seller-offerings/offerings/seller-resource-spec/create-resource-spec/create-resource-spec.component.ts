import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField, SelectableFormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ResourceSpecServiceService, ResourceSpecType } from 'src/app/services/resource-spec-service.service';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { v4 as uuidv4 } from 'uuid';

import { components } from "src/app/models/resource-catalog";
import { environment } from 'src/environments/environment';
import { resourceConfiguration } from '../../../../../models/formFields/software-resource-fields';
type ResourceSpecification_Create = components["schemas"]["ResourceSpecification_Create"];
type CharacteristicValueSpecification = components["schemas"]["ResourceSpecificationCharacteristicValue"];
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
  highestStep = 0;
  steps = [
    'General Info',
    'Characteristics',
    'Configuration',
    'Summary'
  ];

  baseTemplateOptions = [
    { value: '', label: 'None' },
    { value: 'SoftwareSpecification', label: 'Software Specification', api: 'software' },
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

  //CHARS INFO
  charsForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl(''),
    configurable: new FormControl('false'),
  });
  stringCharSelected: boolean = true;
  numberCharSelected: boolean = false;
  rangeCharSelected: boolean = false;
  prodChars: ResourceSpecificationCharacteristic[] = [];
  creatingChars: CharacteristicValueSpecification[] = [];
  showCreateChar: boolean = false;

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

        if (value === 'SoftwareSpecification') {
          this.resSpecService.getSoftwareSupportPackages()
            .subscribe(packages => {
              const field = this.templateConfigFields.find(f => f.name === 'softwareSupportPackage') as SelectableFormField;
              if (field) field.options = packages.map(p => ({ value: p.id, label: p.name }));
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

  onTypeChange(event: any) {
    if (event.target.value == 'string') {
      this.stringCharSelected = true;
      this.numberCharSelected = false;
      this.rangeCharSelected = false;
    } else if (event.target.value == 'number') {
      this.stringCharSelected = false;
      this.numberCharSelected = true;
      this.rangeCharSelected = false;
    } else {
      this.stringCharSelected = false;
      this.numberCharSelected = false;
      this.rangeCharSelected = true;
    }
    this.creatingChars = [];
  }

  addCharValue() {
    if (this.stringCharSelected) {
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
    } else if (this.numberCharSelected) {
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
    } else {
      console.log('range')
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
    }
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
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
      this.prodChars.push({
        id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
        name: this.charsForm.value.name,
        description: this.charsForm.value.description != null ? this.charsForm.value.description : '',
        configurable: this.charsForm.value.configurable == 'true' ? true : false,
        resourceSpecCharacteristicValue: this.creatingChars
      })
    }

    this.charsForm.reset();
    this.creatingChars = [];
    this.showCreateChar = false;
    this.stringCharSelected = true;
    this.numberCharSelected = false;
    this.rangeCharSelected = false;
    this.refreshChars();
    this.cdr.detectChanges();
  }

  removeCharValue(char: any, idx: any) {
    console.log(this.creatingChars)
    this.creatingChars.splice(idx, 1);
    console.log(this.creatingChars)
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
      if (this.generalForm.value.baseTemplate) {
        this.resourceToCreate!['@type'] = this.generalForm.value.baseTemplate;
        this.resourceToCreate!['@baseType'] = 'ResourceSpecification';
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
    this.stringValue = '';
    this.numberValue = '';
    this.numberUnit = '';
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
    this.stringCharSelected = true;
    this.numberCharSelected = false;
    this.rangeCharSelected = false;
    this.creatingChars = [];
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  goToStep(index: number) {
    // Solo validar en modo creación
    if (index > this.currentStep) {
      // Validar el paso actual
      const currentStepValid = this.validateCurrentStep();
      if (!currentStepValid) {
        return; // No permitir avanzar si el paso actual no es válido
      }
    }

    this.currentStep = index;
    if (this.currentStep > this.highestStep) {
      this.highestStep = this.currentStep
    }
    this.refreshChars();
    if (this.currentStep == 3) {
      this.showFinish();
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 0: // General Info
        return this.generalForm?.valid || false;
      case 2: // Configuration — valid if no fields or all required fields filled
        return this.templateConfigFields.length === 0 || this.templateConfigForm.valid;
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    return (this.generalForm?.valid && (index <= this.currentStep)) || (this.generalForm?.valid && (index <= this.highestStep));
  }

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
  }
}
