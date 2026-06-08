import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';

import { components } from 'src/app/models/product-catalog';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';

type Catalog_Update = components['schemas']['Catalog_Update'];

@Component({
  selector: 'update-catalog',
  templateUrl: './update-catalog.component.html',
  styleUrl: './update-catalog.component.css'
})
export class UpdateCatalogComponent implements OnInit, OnDestroy {

  @Input() cat: any;

  partyId: any = '';
  catalogToUpdate: Catalog_Update | undefined;
  catStatus: any = 'Active';
  currentStep = 0;
  loading = false;

  steps = ['General Info', 'Summary'];

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
    this.populateCatInfo();
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

  populateCatInfo() {
    this.generalForm.controls['name'].setValue(this.cat.name);
    this.generalForm.controls['description'].setValue(this.cat.description);
    this.catStatus = this.cat.lifecycleStatus;
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

  setCatStatus(status: any) {
    this.catStatus = status;
  }

  setCatalogData() {
    if (this.generalForm.value.name != null) {
      this.catalogToUpdate = {
        description: this.generalForm.value.description ?? '',
        lifecycleStatus: this.catStatus,
      };
      if (this.cat.name !== this.generalForm.value.name) {
        this.catalogToUpdate.name = this.generalForm.value.name!;
      }
    }
  }

  updateCatalog() {
    this.loading = true;
    this.api.updateCatalog(this.catalogToUpdate, this.cat.id).subscribe({
      next: () => {
        this.loading = false;
        this.goBack();
      },
      error: error => {
        console.error('There was an error while updating the catalog!', error);
        this.errorMessage = error.error?.error
          ? 'Error: ' + error.error.error
          : 'There was an error while updating the catalog!';
        this.loading = false;
        this.showError = true;
        setTimeout(() => { this.showError = false; }, 3000);
      },
    });
  }

  hasLongWord(str: string | undefined | null, threshold = 20) {
    return str ? str.split(/\s+/).some(word => word.length > threshold) : false;
  }
}
