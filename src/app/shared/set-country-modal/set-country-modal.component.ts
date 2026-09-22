import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { countries } from 'src/app/models/country.const';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

/** Small standalone modal to set an organization's country, for flows (like the buyer
 * price-plan drawer) that need it set before continuing but shouldn't drag the seller
 * in to the full profile page. Reuses AccountServiceService.updateOrgCountry, which
 * rebuilds the whole partyCharacteristic array so logo/description/website survive. */
@Component({
  selector: 'app-set-country-modal',
  standalone: true,
  imports: [ModalComponent, DynamicFormComponent, ButtonComponent, TranslateModule],
  templateUrl: './set-country-modal.component.html',
})
export class SetCountryModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() partyId: any;
  @Output() saved = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  saving = false;
  countryFields: FormField[] = [
    {
      type: 'select', name: 'country', label: 'PROFILE._country', required: true,
      searchable: true, dataCy: 'buyerCountry', placeholder: 'PROFILE._country_placeholder',
      options: countries.map(country => ({ value: country.code, label: country.name })),
    },
  ];
  form = buildFormGroup(this.countryFields);

  constructor(
    private accountService: AccountServiceService,
    private notificationService: NotificationService,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.form.reset();
    }
  }

  close(): void {
    this.closed.emit();
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving || !this.partyId) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    try {
      await this.accountService.updateOrgCountry(this.partyId, this.form.value.country);
      this.notificationService.showSuccess('PROFILE._success');
      this.saved.emit(this.form.value.country);
    } catch (error: any) {
      this.notificationService.showError('PROFILE._update_error', {
        details: error?.error?.error || error?.error?.message || error?.message
      });
    } finally {
      this.saving = false;
    }
  }
}
