import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { belongsToParty } from 'src/app/shared/session-ownership.util';
import { noWhitespaceValidator } from 'src/app/validators/validators';

import { components } from 'src/app/models/product-catalog';
import { StepChangedEvent } from '../../../../../shared/stepper/stepper.component';
import { BadgeStatus, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';

type Catalog_Update = components['schemas']['Catalog_Update'];

@Component({
  selector: 'update-catalog',
  templateUrl: './update-catalog.component.html',
  styleUrl: './update-catalog.component.css'
})
export class UpdateCatalogComponent implements OnInit, OnDestroy {

  cat: any;

  partyId: any = '';
  catalogToUpdate: Catalog_Update | undefined;
  currentStep = 0;
  loading = false;

  get notFound(): boolean {
    return !this.loading && !this.cat;
  }

  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'UPDATE_CATALOG._name', required: true, maxLength: 100, dataCy: 'catalogName' },
    { type: 'markdownTextarea', name: 'description', label: 'UPDATE_CATALOG._description', dataCy: 'catalogDsc' },
  ];

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    lifecycleStatus: new FormControl('Active'),
    description: new FormControl('', Validators.maxLength(100000)),
  });

  showDeleteConfirm = false;
  showPublishConfirm = false;
  private destroy$ = new Subject<void>();

  get isDraft(): boolean {
    return this.cat?.lifecycleStatus === 'Active';
  }

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
    private translate: TranslateService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
          if (!belongsToParty(this.cat, this.partyId)) {
            this.notificationService.showInfo(this.translate.instant('UPDATE_CATALOG._wrong_org_notice'));
            this.goBack();
          }
        }
      });
  }

  async ngOnInit() {
    this.initPartyInfo();
    this.loading = true;
    const id = this.route.snapshot.paramMap.get('id')!;
    try {
      this.cat = await this.api.getCatalog(id);
      this.populateCatInfo();
    } catch (error) {
      console.error('Error loading catalog', error);
    } finally {
      this.loading = false;
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
    if (event.isLastStep) {
      this.setCatalogData();
    }
  }

  populateCatInfo() {
    this.generalForm.patchValue({
      name: this.cat.name,
      lifecycleStatus: this.cat.lifecycleStatus,
      description: this.cat.description,
    });
  }

  initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as === aux.id) {
        this.partyId = aux.partyId;
      } else {
        const loggedOrg = aux.organizations.find((element: { id: any }) => element.id === aux.logged_as);
        if (!loggedOrg) return;
        this.partyId = loggedOrg.partyId;
      }
    }
  }

  goBack() {
    this.router.navigate([SellerOfferingsPaths.catalogues.list()]);
  }

  statusBadgeVariant(status: string): BadgeStatus {
    return lifecycleStatusBadgeVariant(status);
  }

  statusLabel(status: string): string {
    return lifecycleStatusLabel(status);
  }

  setCatalogData() {
    if (this.generalForm.value.name != null) {
      this.catalogToUpdate = {
        description: this.generalForm.value.description ?? '',
        lifecycleStatus: this.generalForm.value.lifecycleStatus ?? 'Active',
      };
      if (this.cat.name !== this.generalForm.value.name) {
        this.catalogToUpdate.name = this.generalForm.value.name!;
      }
    }
  }

  updateCatalog() {
    this.loading = true;
    if (this.catalogToUpdate == null) {
      this.setCatalogData();
    }
    this.api.updateCatalog(this.catalogToUpdate, this.cat.id).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('UPDATE_CATALOG._update_success');
        this.goBack();
      },
      error: error => {
        console.error('There was an error while updating the catalog!', error);
        this.loading = false;
        this.notificationService.showError('UPDATE_CATALOG._update_error', {
          details: error?.error?.error || error?.error?.message || error?.message
        });
      },
    });
  }

  onDeleteResolved(confirmed: boolean) {
    this.showDeleteConfirm = false;
    if (confirmed) {
      this.deleteCatalog();
    }
  }

  onPublishResolved(confirmed: boolean) {
    this.showPublishConfirm = false;
    if (confirmed) {
      this.publishCatalog();
    }
  }

  private deleteCatalog() {
    this.loading = true;
    this.api.deleteCatalog(this.cat.id).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('UPDATE_CATALOG._delete_success');
        this.goBack();
      },
      error: error => {
        console.error('There was an error while deleting the catalog!', error);
        this.loading = false;
        this.notificationService.showError('UPDATE_CATALOG._delete_error', {
          details: error?.error?.error || error?.error?.message || error?.message
        });
      },
    });
  }

  private publishCatalog() {
    this.loading = true;
    this.api.updateCatalog({ lifecycleStatus: 'Launched' }, this.cat.id).subscribe({
      next: () => {
        this.loading = false;
        this.cat.lifecycleStatus = 'Launched';
        this.generalForm.patchValue({ lifecycleStatus: 'Launched' });
        this.notificationService.showSuccess('UPDATE_CATALOG._publish_success');
      },
      error: error => {
        console.error('There was an error while publishing the catalog!', error);
        this.loading = false;
        this.notificationService.showError('UPDATE_CATALOG._publish_error', {
          details: error?.error?.error || error?.error?.message || error?.message
        });
      },
    });
  }

  hasLongWord(str: string | undefined | null, threshold = 20) {
    return str ? str.split(/\s+/).some(word => word.length > threshold) : false;
  }
}
