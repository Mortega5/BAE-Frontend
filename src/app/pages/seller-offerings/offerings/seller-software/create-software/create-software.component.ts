import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';

import { components } from "src/app/models/software-catalog";
import { environment } from 'src/environments/environment';
import { FormField, SelectOption } from '../../../../../models/formFields/form-field.model';
import { RESOURCE_STATUS_TYPES } from '../../../../../models/software.model';
import { TableColumn, TableSort } from '../../../../../models/table-column.model';
import { ResourceSpecServiceService } from '../../../../../services/resource-spec-service.service';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';
import { lifecycleStatusClass } from '../../../../../shared/utils/lifecycle-status.utils';

type SoftwareCreate = components["schemas"]["Resource_Create"];
type CharacteristicValueSpecification = components["schemas"]["Characteristic"];

const statusOptions: SelectOption[] = RESOURCE_STATUS_TYPES.map(value => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

@Component({
  selector: 'create-software',
  templateUrl: './create-software.component.html',
  styleUrl: './create-software.component.css',
  providers: [DatePipe],
})
export class CreateSoftwareComponent implements OnInit, OnDestroy {

  partyId: any = '';
  softwareToCreate: SoftwareCreate | undefined;
  currentStepId: string = 'general';
  loading = false;

  steps = [
    'General Info',
    'Software Specification',
    'Characteristics',
    'Summary',
  ];

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

  defaultSort: TableSort = { key: 'lastUpdate', direction: 'desc' };
  softwareSpecColumns: TableColumn[] = [
    { header: 'Name', getValue: item => item.name ?? '-', sortKey: 'name' },
    { header: 'Version', getValue: item => item.version ?? '-', width: 'w-24' },
    { header: 'Status', getValue: item => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: item => lifecycleStatusClass(item.lifecycleStatus), sortKey: 'lifecycleStatus' },
    { header: 'Last update', getValue: item => this.datePipe.transform(item.lastUpdate, 'dd/MM/yy, HH:mm') ?? '-', width: 'w-36', sortKey: 'lastUpdate' },
  ];
  softwareSpecForm = new FormGroup({
    softwareSpec: new FormControl<any>(null, Validators.required),
  });

  resourceCharacteristics: CharacteristicValueSpecification[] = [];

  errorMessage: any = '';
  showError = false;
  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private resSpecService: ResourceSpecServiceService,
    private datePipe: DatePipe,
    private route: ActivatedRoute,
    private router: Router,
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

  fetchSoftwareSpecs = (params: PageRequest): Promise<PageResult<any>> => {
    return this.resSpecService.getResourceSpecByUserPaged(
      params, { '@type': 'SoftwareSupportPackageSpecification' }, ['Active', 'Launched'], this.partyId, 'SoftwareSupportPackageSpecification'
    );
  }

  onSoftwareSpecChange(spec: any): void {
    this.softwareSpecForm.get('softwareSpec')?.setValue(spec);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canAdvance(): boolean {
    switch (this.currentStepId) {
      case 'general': return this.generalForm?.valid ?? false;
      case 'software': return this.softwareSpecForm?.valid ?? false;
      default: return true;
    }
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId!;
    if (event.isLastStep) {
      this.setSoftwareData();
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
    this.router.navigate([SellerOfferingsPaths.softwares.list()]);
  }

  setSoftwareData() {
    if (this.generalForm.value.name != null) {
      this.softwareToCreate = {
        '@type': 'SoftwareSupportPackage',
        '@baseType': 'Resource',
        name: this.generalForm.value.name,
        description: this.generalForm.value.description ?? '',
        resourceStatus: 'available',
        usageState: 'active',
        resourceCharacteristic: this.resourceCharacteristics,
        resourceSpecification: { id: this.softwareSpecForm.value.softwareSpec?.id },
        relatedParty: [{
          id: this.partyId,
          role: environment.SELLER_ROLE,
          '@referredType': '',
        }],
      };
    }
  }

  createSoftware() {
    this.loading = true;
    this.api.postSoftware(this.softwareToCreate).subscribe({
      next: () => {
        this.loading = false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating the software!', error);
        this.errorMessage = error.error?.error
          ? 'Error: ' + error.error.error
          : 'There was an error while creating the software!';
        this.loading = false;
        this.showError = true;
        setTimeout(() => { this.showError = false; }, 3000);
      },
    });
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    return str ? str.split(/\s+/).some(word => word.length > threshold) : false;
  }
}
