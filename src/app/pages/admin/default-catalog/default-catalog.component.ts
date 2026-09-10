import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { NotificationService } from 'src/app/services/notification.service';
import { noWhitespaceValidator } from 'src/app/validators/validators';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'default-catalog',
  templateUrl: './default-catalog.component.html',
  styleUrl: './default-catalog.component.css'
})
export class DefaultCatalogComponent implements OnInit {
  loading = false;
  loadingDefaultCatalog = false;
  defaultCatalogId = '';

  defaultCatalogFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'ADMIN._name', required: true, maxLength: 100, dataCy: 'adminDefaultCatalogName' },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_CATALOG._description', dataCy: 'adminDefaultCatalogDescription' },
  ];

  defaultCatalogForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', [Validators.maxLength(100000)])
  });

  constructor(
    private api: ApiServiceService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    void this.loadDefaultCatalogInfo();
  }

  async loadDefaultCatalogInfo() {
    this.defaultCatalogId = environment.DFT_CATALOG_ID ?? '';

    if (!this.defaultCatalogId) {
      return;
    }

    this.loadingDefaultCatalog = true;
    try {
      const catalog = await this.api.getCatalog(this.defaultCatalogId);
      this.defaultCatalogForm.patchValue({
        name: catalog?.name ?? '',
        description: catalog?.description ?? ''
      });
    } catch (error) {
      this.defaultCatalogId = '';
      this.handleError(error, 'There was an error while loading the default catalog.');
    } finally {
      this.loadingDefaultCatalog = false;
    }
  }

  async saveDefaultCatalog() {
    if (this.defaultCatalogForm.invalid || this.loading) {
      this.defaultCatalogForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const payload: any = {
        name: this.defaultCatalogForm.value.name?.trim(),
        description: this.defaultCatalogForm.value.description ?? '',
        lifecycleStatus: 'Active'
      };

      let catalogId = this.defaultCatalogId;

      if (catalogId) {
        await firstValueFrom(this.api.updateAdminCatalog(payload, catalogId));
      } else {
        const createdCatalog = await firstValueFrom(this.api.postAdminCatalog(payload));
        catalogId = createdCatalog?.id ?? '';
      }

      if (!catalogId) {
        throw new Error('Catalog ID not returned by backend');
      }

      await firstValueFrom(this.api.setDefaultCatalog(catalogId));

      this.defaultCatalogId = catalogId;
      environment.DFT_CATALOG_ID = catalogId;

      this.notificationService.showSuccess('ADMIN._defaultCatalogSaveSuccess');
    } catch (error) {
      this.handleError(error, 'ADMIN._defaultCatalogSaveError');
    } finally {
      this.loading = false;
    }
  }

  /** `fallbackKey` is an i18n key (resolved by the toast's own `| translate` pipe). The
   * toast always shows that translated message; any raw backend/exception detail goes
   * behind its "view details" toggle instead of being baked into the shown text. */
  private handleError(error: any, fallbackKey: string) {
    const details = error?.error?.error || error?.message || undefined;
    this.notificationService.showError(fallbackKey, { details });
  }
}
