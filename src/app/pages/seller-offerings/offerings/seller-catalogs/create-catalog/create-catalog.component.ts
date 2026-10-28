import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { UnsavedChangesModalComponent } from 'src/app/shared/unsaved-changes-modal/unsaved-changes-modal.component';
import { LeaveConfirmable } from 'src/app/guard/unsaved-changes.guard';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { StepperComponent } from 'src/app/shared/stepper/stepper.component';
import { StepperStepDirective } from 'src/app/shared/stepper/stepper-step.directive';

import { components } from 'src/app/models/product-catalog';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';

type Catalog_Create = components['schemas']['Catalog_Create'];

@Component({
  selector: 'create-catalog',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, ConfirmModalComponent, UnsavedChangesModalComponent, DynamicFormComponent, StepperComponent, StepperStepDirective],
  templateUrl: './create-catalog.component.html',
  styleUrl: './create-catalog.component.css'
})
export class CreateCatalogComponent implements OnInit, OnDestroy, LeaveConfirmable {
  /** True when embedded inside another flow (e.g. the offer form's catalogue picker)
   * instead of routed to as its own page — swaps navigating away for emitting `created`. */
  @Input() embedded = false;
  /** Prefills the name, e.g. with what was typed into the catalogue picker that opened this form. */
  @Input() initialName = '';
  @Output() created = new EventEmitter<any>();
  /** Only emitted in embedded mode, when the seller backs out instead of creating one. */
  @Output() cancelled = new EventEmitter<void>();

  partyId: any = '';
  catalogToCreate: Catalog_Create | undefined;
  currentStep = 0;
  loading = false;

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_CATALOG._name', required: true, maxLength: 100, dataCy: 'catalogName' },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_CATALOG._description', dataCy: 'catalogDsc' },
  ];

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  showPublishDraftModal = false;
  @ViewChild(UnsavedChangesModalComponent) private unsavedChangesModal?: UnsavedChangesModalComponent;
  /** Set once the catalogue is saved, so the navigation back to the list isn't asked about. */
  private leaveAllowed = false;
  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
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
    if (this.initialName.trim()) {
      this.generalForm.patchValue({ name: this.initialName.trim() });
    }
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
  }

  initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as === aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((element: { id: any }) => element.id === aux.logged_as);
        this.partyId = loggedOrg.partyId;
      }
    }
  }

  get leaveNeedsConfirmation(): boolean {
    return !this.embedded && !this.leaveAllowed && this.generalForm.dirty;
  }

  confirmLeave(): boolean | Promise<boolean> {
    if (!this.leaveNeedsConfirmation) return true;
    return this.unsavedChangesModal?.confirm(() => {
      this.setCatalogData();
      this.saveDraft();
    }) ?? true;
  }

  goBack() {
    if (this.embedded) {
      this.cancelled.emit();
      return;
    }
    this.router.navigate([SellerOfferingsPaths.catalogues.list()]);
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

  onSubmitCatalog() {
    this.setCatalogData();
    this.showPublishDraftModal = true;
  }

  saveDraft() {
    this.createCatalog('Active');
  }

  publish() {
    this.createCatalog('Launched');
  }

  private createCatalog(lifecycleStatus: 'Active' | 'Launched') {
    if (!this.catalogToCreate) return;
    this.catalogToCreate.lifecycleStatus = lifecycleStatus;
    this.loading = true;
    this.api.postCatalog(this.catalogToCreate).subscribe({
      next: (created) => {
        this.loading = false;
        this.showPublishDraftModal = false;
        this.notificationService.showSuccess('CREATE_CATALOG._create_success');
        if (this.embedded) {
          this.created.emit(created);
        } else {
          this.leaveAllowed = true;
          this.goBack();
        }
      },
      error: error => {
        console.error('There was an error while creating the catalog!', error);
        this.loading = false;
        this.showPublishDraftModal = false;
        this.notificationService.showError('CREATE_CATALOG._create_error', {
          details: error?.error?.error || error?.error?.message || error?.message
        });
      },
    });
  }
}
