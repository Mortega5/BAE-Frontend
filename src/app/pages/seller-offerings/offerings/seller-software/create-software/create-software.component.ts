import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';

import { components } from "src/app/models/software-catalog";
import { environment } from 'src/environments/environment';
import { FormField, SelectableFormField, SelectOption } from '../../../../../models/formFields/form-field.model';
import { RESOURCE_STATUS_TYPES } from '../../../../../models/software.model';
import { ResourceSpecServiceService } from '../../../../../services/resource-spec-service.service';
import { buildFormGroup } from '../../../../../shared/forms/dynamic-form/build-form-group.util';


type SoftwareCreate = components["schemas"]["Resource_Create"];
type CharacteristicValueSpecification = components["schemas"]["Characteristic"];

const statusOptions: SelectOption[] = RESOURCE_STATUS_TYPES.map(value => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))

@Component({
  selector: 'create-software',
  templateUrl: './create-software.component.html',
  styleUrl: './create-software.component.css'
})
export class CreateSoftwareComponent implements OnInit, OnDestroy {

  private readonly LAST_STEP = 3;

  get isLastStep() {
    return this.currentStep === this.LAST_STEP;
  }

  partyId: any = '';

  softwareToCreate: SoftwareCreate | undefined;

  currentStep = 0;
  highestStep = 0;
  steps = [
    'General Info',
    'Software Specification',
    'Characteristics',
    'Summary'
  ];

  loading: boolean = false;
  //SERVICE GENERAL INFO:
  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_RES_SPEC._name', required: true, maxLength: 100 },
    { type: 'select', name: 'resourceStatus', label: 'Status', required: true, options: statusOptions },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_RES_SPEC._description' },
  ];

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    resourceStatus: new FormControl('available', [Validators.required]),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  softwareSpecFields: FormField[] = [
    { name: 'softwareSpec', label: 'Software specification', type: 'select', required: true, options: [] },
  ]
  softwareSpecEmpty = true;
  softwareSpecForm = buildFormGroup(this.softwareSpecFields);

  resourceCharacteristics: CharacteristicValueSpecification[] = [];

  errorMessage: any = '';
  showError: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
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
    this.loading = true;
    this.initPartyInfo();
    this.resSpecService.getSoftwarePackageSpec(this.partyId).subscribe({
      next: (specs) => {
        // TODO fix when specs are empty. Create spec automatically?
        this.loading = false;
        const field = this.softwareSpecFields[0] as SelectableFormField;
        if (field) field.options = specs?.map(p => ({ value: { id: p.id }, label: `${p.name}` }));
      },
      error: (error) => {
        console.error("Error getting Software Package Specs", error);
        this.loading = false;
      }
    })
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
    this.eventMessage.emitSellerSoftwareCreate(true);
  }

  setSoftwareData() {
    if (this.generalForm.value.name != null) {
      this.softwareToCreate = {
        '@type': 'SoftwarePackageResource',
        '@baseType': 'Resource',
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        resourceStatus: 'available',
        resourceCharacteristic: this.resourceCharacteristics,
        relatedParty: [
          {
            id: this.partyId,
            role: environment.SELLER_ROLE,
            "@referredType": ''
          }
        ],
      }
      console.log('SOFTWARE TO CREATE:')
      console.log(this.softwareToCreate)
    }
  }

  createSoftware() {
    this.loading = true;
    this.api.postSoftware(this.softwareToCreate).subscribe({
      next: data => {
        this.loading = false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while updating!', error);
        if (error.error.error) {
          console.log(error)
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while creating the software!';
        }
        this.loading = false;
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    })
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
    if (this.isLastStep) {
      this.setSoftwareData();
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 0: // General Info
        return this.generalForm?.valid || false;
      case 1: // Software Specification
        return this.softwareSpecForm?.valid || false;
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
