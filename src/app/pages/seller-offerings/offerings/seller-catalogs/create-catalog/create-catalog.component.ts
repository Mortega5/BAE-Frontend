import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';

import { components } from 'src/app/models/product-catalog';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';

type Catalog_Create = components['schemas']['Catalog_Create'];

@Component({
  selector: 'create-catalog',
  templateUrl: './create-catalog.component.html',
  styleUrl: './create-catalog.component.css'
})
export class CreateCatalogComponent implements OnInit, OnDestroy {

  partyId: any = '';
  catalogToCreate: Catalog_Create | undefined;
  currentStep = 0;
  loading = false;

  steps = ['General Info', 'Summary'];

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_CATALOG._name', required: true, maxLength: 100, dataCy: 'catalogName' },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_CATALOG._description', dataCy: 'catalogDsc' },
  ];

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  errorMessage: any = '';
  showError = false;
  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
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
    return this.generalForm?.valid ?? false;
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStep = event.step;
    if (event.isLastStep) {
      this.setCatalogData();
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
    this.eventMessage.emitSellerCatalog(true);
  }

  setCatalogData() {
    if (this.generalForm.value.name != null) {
      this.catalogToCreate = {
        name: this.generalForm.value.name,
        description: this.generalForm.value.description ?? '',
        lifecycleStatus: 'Active',
        relatedParty: [{
          id: this.partyId,
          role: environment.SELLER_ROLE,
          '@referredType': '',
        }],
      };
    }
  }

  createCatalog() {
    this.loading = true;
    this.api.postCatalog(this.catalogToCreate).subscribe({
      next: () => {
        this.loading = false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while creating the catalog!', error);
        this.errorMessage = error.error?.error
          ? 'Error: ' + error.error.error
          : 'There was an error while creating the catalog!';
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
