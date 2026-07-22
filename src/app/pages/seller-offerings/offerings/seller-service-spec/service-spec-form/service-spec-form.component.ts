import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { buildLifecycleStatusOptions, FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ServiceSpecServiceService } from 'src/app/services/service-spec-service.service';
import { CharValueType } from 'src/app/shared/forms/characteristic-value-spec/characteristic-value-spec-form.component';
import { CharacteristicFormValue } from 'src/app/shared/forms/specification-characteristic/specification-characteristic-form.component';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { v4 as uuidv4 } from 'uuid';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';

import { components } from 'src/app/models/service-catalog';
import { environment } from 'src/environments/environment';

type ServiceSpecification_Create = components['schemas']['ServiceSpecification_Create'];
type ServiceSpecification_Update = components['schemas']['ServiceSpecification_Update'];
type CharacteristicValueSpecification = components['schemas']['CharacteristicValueSpecification'];
type ServiceSpecificationCharacteristic = components['schemas']['CharacteristicSpecification'];

const GENERAL_FORM_FIELDS_CREATE: FormField[] = [
  { type: 'string', name: 'name', label: 'CREATE_SERV_SPEC._name', required: true, maxLength: 100, dataCy: 'servSpecName' },
  { type: 'markdownTextarea', name: 'description', label: 'CREATE_SERV_SPEC._description' },
];

const GENERAL_FORM_FIELDS_UPDATE: FormField[] = [
  { type: 'string', name: 'name', label: 'UPDATE_SERV_SPEC._name', required: true, maxLength: 100, dataCy: 'servSpecName' },
  {
    type: 'statusPicker', name: 'lifecycleStatus', label: 'UPDATE_SERV_SPEC._status',
    options: buildLifecycleStatusOptions('serviceSpecStatus'),
  },
  { type: 'markdownTextarea', name: 'description', label: 'UPDATE_SERV_SPEC._description' },
];

@Component({
  selector: 'app-service-spec-form',
  templateUrl: './service-spec-form.component.html',
})
export class ServiceSpecFormComponent implements OnInit, OnDestroy {
  mode: 'create' | 'update' = 'create';
  serv?: any;

  get isUpdate(): boolean { return this.mode === 'update'; }
  get i18nPrefix(): string { return this.isUpdate ? 'UPDATE_SERV_SPEC' : 'CREATE_SERV_SPEC'; }
  get notFound(): boolean { return this.isUpdate && !this.loading && !this.serv; }

  get generalFormFields(): FormField[] {
    return this.isUpdate ? GENERAL_FORM_FIELDS_UPDATE : GENERAL_FORM_FIELDS_CREATE;
  }

  partyId: any = '';
  serviceData: ServiceSpecification_Create | ServiceSpecification_Update | undefined;
  currentStepId = 'general';
  loading = false;

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    lifecycleStatus: new FormControl('Active'),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  prodChars: ServiceSpecificationCharacteristic[] = [];
  showCreateChar = false;
  currentChar: CharacteristicFormValue | null = null;
  allowedChars: CharValueType[] = ['string', 'number', 'range', 'object'];

  errorMessage: any = '';
  showError = false;

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private servSpecService: ServiceSpecServiceService,
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
    this.mode = this.route.snapshot.data['mode'] ?? 'create';
    this.initPartyInfo();
    if (this.isUpdate) {
      this.loading = true;
      const id = this.route.snapshot.paramMap.get('id')!;
      try {
        this.serv = await this.servSpecService.getServSpecById(id);
        this.populateServInfo();
      } catch (error) {
        console.error('Error loading service spec', error);
      } finally {
        this.loading = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canAdvance(): boolean {
    if (this.currentStepId === 'general') return this.generalForm?.valid ?? false;
    return true;
  }

  get canSaveChar(): boolean {
    return !!this.currentChar?.name?.trim() && (this.currentChar?.values?.length ?? 0) > 0;
  }

  private initPartyInfo(): void {
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

  private populateServInfo(): void {
    this.generalForm.patchValue({
      name: this.serv.name,
      lifecycleStatus: this.serv.lifecycleStatus,
      description: this.serv.description,
    });
    this.prodChars = this.serv.specCharacteristic;
  }

  goBack(): void {
    this.router.navigate([SellerOfferingsPaths.serviceSpecs.list()]);
  }

  onFormChange(value: CharacteristicFormValue): void {
    this.currentChar = value;
  }

  saveChar(): void {
    if (!this.currentChar?.name) return;
    this.prodChars = [...this.prodChars, {
      id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
      name: this.currentChar.name,
      description: this.currentChar.description ?? '',
      configurable: this.currentChar.configurable,
      valueType: this.currentChar.valueType,
      characteristicValueSpecification: this.currentChar.values as CharacteristicValueSpecification[],
    }];
    this.refreshChars();
  }

  deleteChar(char: any): void {
    this.prodChars = this.prodChars.filter(item => item.id !== char.id);
  }

  refreshChars(): void {
    this.currentChar = null;
    this.showCreateChar = false;
  }

  private setServiceData(): void {
    if (!this.generalForm.value.name) return;
    this.serviceData = {
      name: this.generalForm.value.name,
      description: this.generalForm.value.description ?? '',
      lifecycleStatus: this.generalForm.value.lifecycleStatus ?? 'Active',
      specCharacteristic: this.prodChars,
      ...(!this.isUpdate && {
        relatedParty: [{ id: this.partyId, role: environment.SELLER_ROLE, '@referredType': '' }],
      }),
    };
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId!;
    this.refreshChars();
    if (event.isLastStep) this.setServiceData();
  }

  save(): void {
    this.loading = true;
    if (this.serviceData == null) {
      this.setServiceData();
    }
    if (this.isUpdate) {
      this.servSpecService.updateServSpec(this.serviceData as ServiceSpecification_Update, this.serv.id).subscribe({
        next: () => { this.loading = false; this.goBack(); },
        error: e => this.handleError(e),
      });
    } else {
      this.servSpecService.postServSpec(this.serviceData as ServiceSpecification_Create).subscribe({
        next: () => { this.loading = false; this.goBack(); },
        error: e => this.handleError(e),
      });
    }
  }

  private handleError(error: any): void {
    this.errorMessage = error.error?.error
      ? 'Error: ' + error.error.error
      : `There was an error while ${this.isUpdate ? 'updating' : 'creating'} the service!`;
    this.loading = false;
    this.showError = true;
    setTimeout(() => this.showError = false, 3000);
  }

  hasLongWord(str: string | undefined, threshold = 20): boolean {
    return str ? str.split(/\s+/).some(word => word.length > threshold) : false;
  }

}
