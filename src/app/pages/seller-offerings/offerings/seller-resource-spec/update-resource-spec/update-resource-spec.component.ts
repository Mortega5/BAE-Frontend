import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ResourceSpecServiceService, ResourceSpecType } from 'src/app/services/resource-spec-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { v4 as uuidv4 } from 'uuid';

import { initFlowbite } from 'flowbite';
import { components } from "src/app/models/resource-catalog";
import { FormField, TableFormField } from '../../../../../models/formFields/form-field.model';
import { resourceConfigUpdate } from '../../../../../models/formFields/software-resource-fields';
import { SoftwareSpecification } from '../../../../../models/software.model';
import { buildFormGroup } from '../../../../../shared/forms/dynamic-form/build-form-group.util';
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

  baseTemplateOptions = [
    { value: '', label: 'None' },
    { value: 'SoftwareSpecification', label: 'Software Specification', api: 'software' },
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
    description: new FormControl('', Validators.maxLength(100000)),
    baseTemplate: new FormControl({ value: '', disabled: true }),
  });
  resStatus: any;

  //CHARS INFO
  charsForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('')
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
    this.resStatus = this.res.lifecycleStatus;

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

  setResStatus(status: any) {
    this.resStatus = status;
    this.cdr.detectChanges();
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

  setResourceData() {
    if (this.generalForm.value.name != null) {
      this.resourceToUpdate = Object.assign({}, {
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        lifecycleStatus: this.resStatus,
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
    this.currentStep = index;
    this.refreshChars();
    if (this.currentStep == 1) {
      setTimeout(() => {
        initFlowbite();
      }, 100);
    }
    if (this.currentStep == 2) {
      this.setResourceData();
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 0: // General Info
        return this.generalForm?.valid || false;
      default:
        return true;
    }
  }

  canNavigate(index: number) {
    return this.generalForm?.valid
  }

  handleStepClick(index: number): void {
    if (this.canNavigate(index)) {
      this.goToStep(index);
    }
  }

}
