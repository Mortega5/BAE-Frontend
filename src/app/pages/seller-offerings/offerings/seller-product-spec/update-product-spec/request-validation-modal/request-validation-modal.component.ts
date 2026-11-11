import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LoginInfo } from 'src/app/models/interfaces';
import { TableColumn } from 'src/app/models/table-column.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { DrawerComponent } from 'src/app/shared/drawer/drawer.component';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';

type ValidationEvidenceRow = {
  type: string;
  name: string;
  value: string;
  missing: boolean;
};
type OrganizationInfoRow = {
  label: string;
  value: string;
  missing: boolean;
};
type OrganizationInfo = {
  organizationName: string;
  organizationVat: string;
  organizationAddress: string;
  organizationCountry: string;
  organizationWebsite: string;
  organizationEmail: string;
};

@Component({
  selector: 'request-validation-modal',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, ContentCardComponent, DrawerComponent, TableInputComponent],
  templateUrl: './request-validation-modal.component.html'
})
export class RequestValidationModalComponent implements OnChanges {
  @Input() showModal: boolean = false;
  @Input() productSpec: any;
  @Input() selfAtt: any;
  @Input() selectedISOS: any[] = [];
  @Input() additionalISOS: any[] = [];
  requestValidationLoading: boolean = false;
  requestValidationError: string = '';
  organizationInfo: OrganizationInfo = this.getEmptyOrganizationInfo();

  @Output() closeModal = new EventEmitter<void>();

  /** Shared by both tables: a missing value reads "Not provided" in red instead of an empty cell. */
  private static readonly MISSING_CELL = 'font-medium text-danger';

  readonly evidenceColumns: TableColumn<ValidationEvidenceRow>[] = [
    { header: 'REQUEST_VALIDATION._type', getValue: row => row.type, width: 'w-56' },
    { header: 'REQUEST_VALIDATION._name', getValue: row => row.name, cellClass: 'break-words' },
    {
      header: 'REQUEST_VALIDATION._document', type: 'link',
      getValue: row => row.missing ? 'REQUEST_VALIDATION._not_provided' : row.value,
      getHref: row => !row.missing && this.isHttpUrl(row.value) ? row.value : null,
      cellClass: row => row.missing ? RequestValidationModalComponent.MISSING_CELL : 'break-all',
    },
  ];

  readonly organizationColumns: TableColumn<OrganizationInfoRow>[] = [
    { header: 'REQUEST_VALIDATION._field', getValue: row => row.label, width: 'w-56' },
    {
      header: 'REQUEST_VALIDATION._value',
      getValue: row => row.missing ? 'REQUEST_VALIDATION._not_provided' : row.value,
      cellClass: row => row.missing ? RequestValidationModalComponent.MISSING_CELL : 'break-all',
    },
  ];

  constructor(
    private localStorage: LocalStorageService,
    private accountService: AccountServiceService,
    private prodSpecService: ProductSpecServiceService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showModal']?.currentValue === true) {
      this.requestValidationError = '';
      this.loadOrganizationInfoFromCurrentSession();
    }
  }

  get validationEvidenceRows(): ValidationEvidenceRow[] {
    const rows: ValidationEvidenceRow[] = [];
    const selfAttestationValue = this.selfAtt?.productSpecCharacteristicValue?.[0]?.value ?? '';

    rows.push({
      type: 'REQUEST_VALIDATION._type_self_attestation',
      name: 'REQUEST_VALIDATION._type_self_attestation',
      value: selfAttestationValue,
      missing: !selfAttestationValue
    });

    for (const certification of this.selectedISOS) {
      const value = certification?.url ?? '';
      rows.push({
        type: 'REQUEST_VALIDATION._type_third_party',
        name: this.normalizeName(certification?.name),
        value,
        missing: !value
      });
    }

    for (const certification of this.additionalISOS) {
      const value = certification?.url ?? '';
      rows.push({
        type: 'REQUEST_VALIDATION._type_additional',
        name: this.normalizeName(certification?.name),
        value,
        missing: !value
      });
    }

    return rows;
  }

  get organizationRows(): OrganizationInfoRow[] {
    const info = this.organizationInfo;
    return [
      { label: 'REQUEST_VALIDATION._org_name', value: info.organizationName },
      { label: 'REQUEST_VALIDATION._org_vat', value: info.organizationVat },
      { label: 'REQUEST_VALIDATION._org_address', value: info.organizationAddress },
      { label: 'REQUEST_VALIDATION._org_country', value: info.organizationCountry },
      { label: 'REQUEST_VALIDATION._org_website', value: info.organizationWebsite },
      { label: 'REQUEST_VALIDATION._org_email', value: info.organizationEmail },
    ].map(row => ({ ...row, missing: this.isMissing(row.value) }));
  }

  normalizeName(name?: string): string {
    return name?.replace(/compliance:/i, '').trim() ?? '';
  }

  isHttpUrl(value?: string): boolean {
    return /^https?:\/\//i.test(value ?? '');
  }

  hasMissingOrganizationInfo(): boolean {
    return [
      this.organizationInfo.organizationName,
      this.organizationInfo.organizationVat,
      this.organizationInfo.organizationAddress,
      this.organizationInfo.organizationCountry,
      this.organizationInfo.organizationWebsite,
      this.organizationInfo.organizationEmail
    ].some((value) => this.isMissing(value));
  }

  isMissing(value?: string): boolean {
    return !value || value.trim() === '';
  }

  submitRequestValidation(): void {
    if (this.hasMissingOrganizationInfo() || this.requestValidationLoading) {
      return;
    }

    if (!this.productSpec) {
      this.requestValidationError = 'Product specification information is not available.';
      return;
    }

    this.requestValidationLoading = true;
    this.requestValidationError = '';

    this.prodSpecService.requestComplianceCertificate(this.buildRequestPayload(this.productSpec)).subscribe({
      next: () => {
        this.requestValidationLoading = false;
        this.closeModal.emit();
      },
      error: (error) => {
        console.error('There was an error while requesting validation!', error);
        this.requestValidationLoading = false;
        this.requestValidationError = this.extractErrorMessage(error);
      }
    });
  }

  private async loadOrganizationInfoFromCurrentSession(): Promise<void> {
    const organizationPartyId = this.getOrganizationPartyId();
    if (!organizationPartyId) {
      this.organizationInfo = this.getEmptyOrganizationInfo();
      return;
    }

    try {
      const organization = await this.accountService.getOrgInfo(organizationPartyId);
      this.organizationInfo = this.mapOrganizationInfo(organization);
    } catch (error) {
      console.error('There was an error while loading organization info!', error);
      this.organizationInfo = this.getEmptyOrganizationInfo();
    }
  }

  private getOrganizationPartyId(): string {
    const loginInfo = this.localStorage.getObject('login_items') as LoginInfo;

    if (!loginInfo || JSON.stringify(loginInfo) === '{}') {
      return '';
    }

    if (loginInfo.logged_as === loginInfo.id) {
      return '';
    }

    const organizations = Array.isArray(loginInfo.organizations) ? loginInfo.organizations : [];
    const loggedOrganization = organizations.find((organization: any) => organization?.id == loginInfo.logged_as);
    return loggedOrganization?.partyId ?? '';
  }

  private mapOrganizationInfo(organization: any): OrganizationInfo {
    const contactMedium = Array.isArray(organization?.contactMedium) ? organization.contactMedium : [];
    const partyCharacteristics = Array.isArray(organization?.partyCharacteristic) ? organization.partyCharacteristic : [];
    const externalReferences = Array.isArray(organization?.externalReference) ? organization.externalReference : [];

    const emailMedium = contactMedium.find((medium: any) => medium?.mediumType === 'Email');
    const postalMedium = contactMedium.find((medium: any) => medium?.mediumType === 'PostalAddress');
    const postalCharacteristic = postalMedium?.characteristic ?? {};
    const characteristicCountry = this.getPartyCharacteristicValue(partyCharacteristics, 'country');

    return {
      organizationName: organization?.tradingName ?? organization?.name ?? '',
      organizationVat: this.getOrganizationVat(externalReferences),
      organizationAddress: this.formatPostalAddress(postalCharacteristic),
      organizationCountry: characteristicCountry,
      organizationWebsite: this.getPartyCharacteristicValue(partyCharacteristics, 'website'),
      organizationEmail: emailMedium?.characteristic?.emailAddress ?? ''
    };
  }

  private getOrganizationVat(externalReferences: any[]): string {
    if (!externalReferences.length) {
      return '';
    }

    const idmReference = externalReferences.find((reference: any) =>
      (reference?.externalReferenceType ?? '').toLowerCase() === 'idm_id'
    );

    return idmReference?.name ?? '';
  }

  private getPartyCharacteristicValue(characteristics: any[], key: string): string {
    const characteristic = characteristics.find((item: any) => item?.name === key);
    return characteristic?.value ?? '';
  }

  private formatPostalAddress(address: any): string {
    if (!address) {
      return '';
    }

    return [
      address.street1,
      address.postCode,
      address.city,
      address.stateOrProvince
    ].filter((value: any) => !!value).join(', ');
  }

  private getEmptyOrganizationInfo(): OrganizationInfo {
    return {
      organizationName: '',
      organizationVat: '',
      organizationAddress: '',
      organizationCountry: '',
      organizationWebsite: '',
      organizationEmail: ''
    };
  }

  private buildRequestPayload(productSpec: any): any {
    return JSON.parse(JSON.stringify(productSpec));
  }

  private extractErrorMessage(error: any): string {
    const message = error?.error?.error ?? error?.error?.message ?? error?.message;
    return message ? `Error: ${message}` : 'Error: there was a problem requesting the validation.';
  }
}
