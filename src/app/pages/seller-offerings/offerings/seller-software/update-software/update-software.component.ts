import { DatePipe } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';

import { components } from 'src/app/models/software-catalog';
import { FormField, SelectOption, TableFormField } from '../../../../../models/formFields/form-field.model';
import { RESOURCE_STATUS_TYPES } from '../../../../../models/software.model';
import { NotificationService } from '../../../../../services/notification.service';
import { ResourceSpecServiceService } from '../../../../../services/resource-spec-service.service';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';
import { lifecycleStatusClass } from '../../../../../shared/utils/lifecycle-status.utils';

type SoftwareSupportPackage = components['schemas']['SoftwareResource'];
type CharacteristicValueSpecification = components['schemas']['Characteristic'];

const statusOptions: SelectOption[] = RESOURCE_STATUS_TYPES.map(value => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

@Component({
  selector: 'update-software',
  templateUrl: './update-software.component.html',
  providers: [DatePipe],
})
export class UpdateSoftwareComponent implements OnInit, OnDestroy {

  @Input() software!: SoftwareSupportPackage;

  partyId: any = '';
  softwareToUpdate: any;
  currentStepId = 'general';
  loading = false;

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_RES_SPEC._name', required: true, maxLength: 100, readonly: true },
    { type: 'select', name: 'resourceStatus', label: 'Status', required: true, options: statusOptions },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_RES_SPEC._description' },
  ];

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    resourceStatus: new FormControl('available', [Validators.required]),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  softwareSpecFields: TableFormField[] = [
    {
      name: 'softwareSpec',
      label: 'Software specification',
      type: 'table',
      required: true,
      readonly: true,
      multiple: false,
      items: [],
      columns: [
        { header: 'Name', getValue: item => item.name ?? '-' },
        { header: 'Version', getValue: item => item.version ?? '-', width: 'w-24' },
        { header: 'Status', getValue: item => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: item => lifecycleStatusClass(item.lifecycleStatus) },
        { header: 'Last update', getValue: item => this.datePipe.transform(item.lastUpdate, 'dd/MM/yy, HH:mm') ?? '-', width: 'w-36' },
      ],
    },
  ];
  softwareSpecForm = new FormGroup({
    softwareSpec: new FormControl<any>(null, [Validators.required]),
  });

  resourceCharacteristics: CharacteristicValueSpecification[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private resSpecService: ResourceSpecServiceService,
    private notificationService: NotificationService,
    private datePipe: DatePipe,
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
    this.loading = true;
    this.initPartyInfo();
    this.populateForms();

    const specId = this.software.resourceSpecification?.id;
    if (!specId) {
      this.loading = false;
      return;
    }

    this.resSpecService.getSoftwarePackageSpec(specId, this.partyId).subscribe({
      next: spec => {
        this.loading = false;
        const field = this.softwareSpecFields[0];
        if (field) {
          field.items = [spec];
          this.softwareSpecForm.patchValue({ softwareSpec: spec });
        }
      },
      error: error => {
        console.error('Error getting Software Package Specs', error);
        this.loading = false;
      },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canAdvance(): boolean {
    switch (this.currentStepId) {
      case 'general': return this.generalForm?.valid ?? false;
      default: return true;
    }
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId!;
    if (event.isLastStep) {
      this.setSoftwareData();
    }
  }

  private populateForms() {
    this.generalForm.patchValue({
      name: this.software.name ?? '',
      resourceStatus: this.software.resourceStatus ?? 'available',
      description: this.software.description ?? '',
    });
    this.resourceCharacteristics = this.software.resourceCharacteristic
      ? [...this.software.resourceCharacteristic]
      : [];
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
    this.eventMessage.emitSellerSoftware(true);
  }

  setSoftwareData() {
    this.softwareToUpdate = {
      name: this.generalForm.value.name,
      description: this.generalForm.value.description ?? '',
      resourceStatus: this.generalForm.value.resourceStatus,
      resourceCharacteristic: this.resourceCharacteristics
    };
  }

  updateSoftware() {
    if (this.softwareToUpdate == null) {
      this.setSoftwareData();
    }
    this.resSpecService.updateSoftwareSupportPackage(this.software.id, this.softwareToUpdate).subscribe({
      next: () => {
        this.notificationService.showInfo('Software package resource updated');
        this.goBack();
      },
      error: (error) => {
        console.error('Unable to update the software package resource', error);
        this.notificationService.showError('Unable to update software resource');
      }
    });
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    return str ? str.split(/\s+/).some(word => word.length > threshold) : false;
  }
}
