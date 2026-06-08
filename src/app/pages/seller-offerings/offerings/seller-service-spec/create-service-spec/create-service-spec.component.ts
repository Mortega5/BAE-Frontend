import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { LocalStorageService } from "src/app/services/local-storage.service";
import { EventMessageService } from "src/app/services/event-message.service";
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { LoginInfo } from 'src/app/models/interfaces';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';

import { components } from "src/app/models/service-catalog";
import { environment } from 'src/environments/environment';
type ServiceSpecification_Create = components["schemas"]["ServiceSpecification_Create"];
type CharacteristicValueSpecification = components["schemas"]["CharacteristicValueSpecification"];
type ProductSpecificationCharacteristic = components["schemas"]["CharacteristicSpecification"];

@Component({
  selector: 'create-service-spec',
  templateUrl: './create-service-spec.component.html',
  styleUrl: './create-service-spec.component.css'
})
export class CreateServiceSpecComponent implements OnInit, OnDestroy {

  partyId: any = '';
  serviceToCreate: ServiceSpecification_Create | undefined;
  currentStep = 0;
  loading = false;

  steps = ['General Info', 'Characteristics', 'Summary'];

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_SERV_SPEC._name', required: true, maxLength: 100 },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_SERV_SPEC._description' },
  ];

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  charsForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('')
  });
  stringCharSelected = true;
  numberCharSelected = false;
  rangeCharSelected = false;
  prodChars: ProductSpecificationCharacteristic[] = [];
  creatingChars: CharacteristicValueSpecification[] = [];
  showCreateChar = false;

  errorMessage: any = '';
  showError = false;

  stringValue = '';
  numberValue = '';
  numberUnit = '';
  fromValue = '';
  toValue = '';
  rangeUnit = '';
  private destroy$ = new Subject<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private servSpecService: ServiceSpecServiceService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      });
  }

  ngOnInit() {
    this.initPartyInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canAdvance(): boolean {
    if (this.currentStep === 0) return this.generalForm?.valid ?? false;
    return true;
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStep = event.step;
    this.refreshChars();
    if (event.isLastStep) {
      this.setServiceData();
    }
  }

  initPartyInfo() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) !== '{}' && ((aux.expire - moment().unix()) - 4) > 0) {
      if (aux.logged_as === aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((element: { id: any }) => element.id === aux.logged_as);
        this.partyId = loggedOrg.partyId;
      }
    }
  }

  goBack() {
    this.eventMessage.emitSellerServiceSpec(true);
  }

  setServiceData() {
    if (this.generalForm.value.name != null) {
      this.serviceToCreate = {
        name: this.generalForm.value.name,
        description: this.generalForm.value.description ?? '',
        lifecycleStatus: 'Active',
        specCharacteristic: this.prodChars,
        relatedParty: [
          {
            id: this.partyId,
            role: environment.SELLER_ROLE,
            "@referredType": ''
          }
        ],
      };
    }
  }

  onTypeChange(event: any) {
    if (event.target.value === 'string') {
      this.stringCharSelected = true;
      this.numberCharSelected = false;
      this.rangeCharSelected = false;
    } else if (event.target.value === 'number') {
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
      this.creatingChars.push({ isDefault: this.creatingChars.length === 0, value: this.stringValue as any });
      this.stringValue = '';
    } else if (this.numberCharSelected) {
      this.creatingChars.push({ isDefault: this.creatingChars.length === 0, value: this.numberValue as any, unitOfMeasure: this.numberUnit });
      this.numberUnit = '';
      this.numberValue = '';
    } else {
      this.creatingChars.push({ isDefault: this.creatingChars.length === 0, valueFrom: this.fromValue as any, valueTo: this.toValue as any, unitOfMeasure: this.rangeUnit });
      this.fromValue = '';
      this.toValue = '';
      this.rangeUnit = '';
    }
  }

  selectDefaultChar(char: any, idx: any) {
    for (let i = 0; i < this.creatingChars.length; i++) {
      this.creatingChars[i].isDefault = i === idx;
    }
  }

  saveChar() {
    if (this.charsForm.value.name != null) {
      this.prodChars.push({
        id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
        name: this.charsForm.value.name,
        description: this.charsForm.value.description ?? '',
        characteristicValueSpecification: this.creatingChars
      });
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
    this.creatingChars.splice(idx, 1);
  }

  deleteChar(char: any) {
    const index = this.prodChars.findIndex(item => item.id === char.id);
    if (index !== -1) {
      this.prodChars.splice(index, 1);
    }
    this.cdr.detectChanges();
  }

  createService() {
    this.loading = true;
    this.servSpecService.postServSpec(this.serviceToCreate).subscribe({
      next: () => {
        this.loading = false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating!', error);
        this.errorMessage = error.error?.error
          ? 'Error: ' + error.error.error
          : 'There was an error while creating the service!';
        this.loading = false;
        this.showError = true;
        setTimeout(() => { this.showError = false; }, 3000);
      }
    });
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
    return str ? str.split(/\s+/).some(word => word.length > threshold) : false;
  }
}
