import { ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, ValidatorFn, Validators } from '@angular/forms';
import { faEdit, faTrash } from '@fortawesome/pro-solid-svg-icons';
import { initFlowbite } from 'flowbite';
import { parsePhoneNumber } from 'libphonenumber-js/max';
import { FileSystemDirectoryEntry, FileSystemFileEntry, NgxFileDropEntry } from 'ngx-file-drop';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { countries, euCountries } from 'src/app/models/country.const';
import { FormField, SelectOption } from 'src/app/models/formFields/form-field.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { AttachmentServiceService } from "src/app/services/attachment-service.service";
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { components } from "../../../../models/party-catalog";

type OrganizationUpdate = components["schemas"]["Organization_Update"];

@Component({
  selector: 'org-info',
  templateUrl: './org-info.component.html',
  styleUrl: './org-info.component.css'
})
export class OrgInfoComponent implements OnInit, OnDestroy {

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showMediumModal) this.cancelMedium();
  }

  readonly isDataspaceEnabled: boolean = environment.DATA_SPACE_ENABLED;

  loading: boolean = false;
  orders: any[] = [];
  profile: any;
  partyId: any = '';
  token: string = '';
  email: string = '';
  selectedDate: any;
  isReadOnly: boolean = false;

  orgFields: FormField[] = this.buildOrgFields();
  profileForm = buildFormGroup(this.orgFields);

  private readonly mediumTypeOptions: SelectOption[] = [
    { value: 'email', label: 'Email' },
    { value: 'address', label: 'Postal Address' },
    { value: 'phone', label: 'Phone Number' },
  ];

  mediumForm = buildFormGroup([
    { type: 'string', name: 'contactTitle', label: 'PROFILE._contact_title', required: true, colSpan: 2, validators: [Validators.maxLength(250)] },
    { type: 'select', name: 'type', label: 'PROFILE._medium_type', colSpan: 2, defaultValue: 'email', options: this.mediumTypeOptions },
    { type: 'string', name: 'email', label: 'PROFILE._email', colSpan: 2 },
    { type: 'string', name: 'country', label: 'PROFILE._country' },
    { type: 'string', name: 'city', label: 'PROFILE._city' },
    { type: 'string', name: 'stateOrProvince', label: 'PROFILE._state' },
    { type: 'string', name: 'postCode', label: 'PROFILE._post_code' },
    { type: 'textarea', name: 'street', label: 'PROFILE._street', colSpan: 2, rows: 4 },
    { type: 'phoneNumber', name: 'telephoneNumber', label: 'PROFILE._phone', colSpan: 2 },
  ]);

  contactmediums: any[] = [];
  contactMediumColumns: TableColumn[] = this.buildContactMediumColumns();
  countries: any[] = countries;
  showMediumModal: boolean = false;
  selectedMedium: any;
  toastVisibility: boolean = false;

  errorMessage: any = '';
  showError: boolean = false;
  showImgPreview: boolean = false;
  imgPreview: any = '';
  attFileName = new FormControl('', [Validators.required, Validators.pattern('[a-zA-Z0-9 _.-]*')]);
  attImageName = new FormControl('', [Validators.required, Validators.pattern('^https?:\\/\\/.*\\.(?:png|jpg|jpeg|gif|bmp|webp)$')])
  filenameRegex = /^[A-Za-z0-9_.-]+$/;
  MAX_FILE_SIZE: number = environment.MAX_FILE_SIZE;

  selectedCountry: string = ''; // Stores the selected country code

  @ViewChild('imgURL') imgURL!: ElementRef;

  public files: NgxFileDropEntry[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private accountService: AccountServiceService,
    private eventMessage: EventMessageService,
    private attachmentService: AttachmentServiceService,
    private notificationService: NotificationService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      })

    this.mediumForm.get('type')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => this.applyMediumTypeValidators(type));
  }

  ngOnInit() {
    // Deferred from the constructor: applyMediumTypeValidators() calls cdr.detectChanges(),
    // which throws before the view exists (constructors run pre-view-init).
    this.applyMediumTypeValidators(this.mediumForm.value.type);

    this.loading = true;
    let today = new Date();
    today.setMonth(today.getMonth() - 1);
    this.selectedDate = today.toISOString();
    this.initPartyInfo();
    setTimeout(() => {
      initFlowbite();
    }, 500);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as !== aux.id) {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;

        // Check if user has orgAdmin role for edit permission
        if (loggedOrg && loggedOrg.roles) {
          const orgRoles = loggedOrg.roles.map((role: any) => role.name);
          const hasOrgAdminRole = orgRoles.some((role: any) => role === environment.ORG_ADMIN_ROLE);
          this.isReadOnly = !hasOrgAdminRole;
        }
      } else {
        this.partyId = aux.partyId;
        this.isReadOnly = false;
      }

      this.orgFields = this.buildOrgFields();
      this.contactMediumColumns = this.buildContactMediumColumns();
      this.token = aux.token;
      this.email = aux.email;
      this.profileForm.reset();
      this.getProfile();
    }
    initFlowbite();
  }

  private buildOrgFields(): FormField[] {
    return [
      { type: 'string', name: 'name', label: 'PROFILE._name', required: true, readonly: this.isReadOnly, placeholder: 'PROFILE._org_name_placeholder' },
      { type: 'string', name: 'website', label: 'PROFILE._website', readonly: this.isReadOnly, placeholder: 'PROFILE._website_placeholder' },
      {
        type: 'select', name: 'country', label: 'PROFILE._country', required: true, readonly: this.isReadOnly,
        dataCy: 'orgCountry',
        options: euCountries.map(country => ({ value: country.code, label: country.name })),
      },
      ...(this.isDataspaceEnabled ? [
        { type: 'string', name: 'contractManagementAddress', label: 'Contract Management Address', readonly: this.isReadOnly, colSpan: 2, placeholder: 'Enter the contract management address' },
        { type: 'string', name: 'contractManagementClientId', label: 'Contract Management Client ID', readonly: this.isReadOnly, colSpan: 1, placeholder: 'Enter the client ID' },
        { type: 'string', name: 'contractManagementScopes', label: 'Contract Management Scopes', readonly: this.isReadOnly, placeholder: 'external-marketplace, another-scope', colSpan: 1 },
      ] as FormField[] : []),
      {
        type: 'markdownTextarea', name: 'description', label: 'UPDATE_OFFER._description', readonly: this.isReadOnly,
        colSpan: 2, placeholder: 'Add product description...', rows: 8,
      },
    ];
  }

  private buildContactMediumColumns(): TableColumn[] {
    return [
      { header: 'PROFILE._medium_type', getValue: medium => medium.mediumType },
      { header: 'PROFILE._contact_title', getValue: medium => this.getMediumContactType(medium) },
      { header: 'PROFILE._info', hideOnMobile: true, getValue: medium => this.getMediumInfo(medium) },
      ...(!this.isReadOnly ? [{
        type: 'actions', header: 'PROFILE._actions', width: 'w-32',
        actions: [
          { icon: faEdit, onClick: (medium: any) => this.showEdit(medium), dataCy: 'editContact' },
          {
            icon: faTrash, onClick: (medium: any) => this.removeMedium(medium), dataCy: 'deleteContact',
            buttonClass: '!w-7 !h-7 bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
          },
        ],
      } as TableColumn] : []),
    ];
  }

  getMediumInfo(medium: any): string {
    if (medium.mediumType === 'Email') return medium.characteristic.emailAddress;
    if (medium.mediumType === 'PostalAddress') {
      const c = medium.characteristic;
      return `${c.street1}, ${c.postCode} (${c.city}) ${c.stateOrProvince}, ${c.country}`;
    }
    return medium.characteristic.phoneNumber;
  }

  getProfile() {
    this.contactmediums = [];
    this.accountService.getOrgInfo(this.partyId).then(data => {
      this.profile = data;
      this.loadProfileData(this.profile)
      this.loading = false;
      this.cdr.detectChanges();
    })
    this.cdr.detectChanges();
    initFlowbite();
  }

  updateProfile() {
    let mediums = [];
    let chars = [];
    if (this.imgPreview != '') {
      chars.push({
        name: 'logo',
        value: this.imgPreview
      })
    }
    if (this.profileForm.value.description != '') {
      chars.push({
        name: 'description',
        value: this.profileForm.value.description
      })
    }
    if (this.profileForm.value.website != '') {
      chars.push({
        name: 'website',
        value: this.profileForm.value.website
      })
    }
    if (this.profileForm.value.country != '') {
      chars.push({
        name: 'country',
        value: this.profileForm.value.country
      })
    }
    const contractManagementAddress = this.profileForm.value.contractManagementAddress?.trim() ?? '';
    const contractManagementClientId = this.profileForm.value.contractManagementClientId?.trim() ?? '';
    const contractManagementScopes = this.parseContractManagementScopes(this.profileForm.value.contractManagementScopes);

    if (this.isDataspaceEnabled && (contractManagementAddress !== '' || contractManagementClientId !== '' || contractManagementScopes.length > 0)) {
      chars.push({
        name: 'contractManagement',
        value: {
          address: contractManagementAddress,
          clientId: contractManagementClientId,
          scope: contractManagementScopes
        }
      })
    }
    for (let i = 0; i < this.contactmediums.length; i++) {
      if (this.contactmediums[i].mediumType == 'Email') {
        mediums.push({
          mediumType: 'Email',
          preferred: this.contactmediums[i].preferred,
          characteristic: {
            contactType: this.getMediumContactType(this.contactmediums[i], 'Email'),
            emailAddress: this.contactmediums[i].characteristic.emailAddress
          }
        })
      } else if (this.contactmediums[i].mediumType == 'PostalAddress') {
        mediums.push({
          mediumType: this.contactmediums[i].mediumType,
          preferred: this.contactmediums[i].preferred,
          characteristic: {
            contactType: this.getMediumContactType(this.contactmediums[i], 'PostalAddress'),
            city: this.contactmediums[i].characteristic.city,
            country: this.contactmediums[i].characteristic.country,
            postCode: this.contactmediums[i].characteristic.postCode,
            stateOrProvince: this.contactmediums[i].characteristic.stateOrProvince,
            street1: this.contactmediums[i].characteristic.street1
          }
        })
      } else {
        mediums.push({
          mediumType: this.contactmediums[i].mediumType,
          preferred: this.contactmediums[i].preferred,
          characteristic: {
            contactType: this.getMediumContactType(this.contactmediums[i], 'Phone'),
            phoneNumber: this.contactmediums[i].characteristic.phoneNumber
          }
        })
      }
    }

    let profile = {
      "tradingName": this.profileForm.value.name,
      "contactMedium": mediums,
      "partyCharacteristic": chars
    }
    this.accountService.updateOrgInfo(this.partyId, profile).subscribe({
      next: data => {
        this.profileForm.reset();
        this.getProfile();
        this.mediumForm.reset();
        this.notificationService.showSuccess('PROFILE._success');
      },
      error: error => {
        console.error('There was an error while updating!', error);
        this.notificationService.showError('PROFILE._update_error');
      }
    });
  }

  loadProfileData(profile: any) {
    this.profileForm.controls['name'].setValue(profile.tradingName);
    if (profile.contactMedium) {
      for (let i = 0; i < this.profile.contactMedium.length; i++) {
        if (profile.contactMedium[i].mediumType == 'Email') {
          this.contactmediums.push({
            id: uuidv4(),
            mediumType: 'Email',
            preferred: profile.contactMedium[i].preferred,
            characteristic: {
              contactType: profile.contactMedium[i].characteristic?.contactType,
              emailAddress: profile.contactMedium[i].characteristic.emailAddress
            }
          })
        } else if (profile.contactMedium[i].mediumType == 'PostalAddress') {
          this.contactmediums.push({
            id: uuidv4(),
            mediumType: profile.contactMedium[i].mediumType,
            preferred: profile.contactMedium[i].preferred,
            characteristic: {
              contactType: profile.contactMedium[i].characteristic?.contactType,
              city: profile.contactMedium[i].characteristic.city,
              country: profile.contactMedium[i].characteristic.country,
              postCode: profile.contactMedium[i].characteristic.postCode,
              stateOrProvince: profile.contactMedium[i].characteristic.stateOrProvince,
              street1: profile.contactMedium[i].characteristic.street1
            }
          })
        } else {
          this.contactmediums.push({
            id: uuidv4(),
            mediumType: profile.contactMedium[i].mediumType,
            preferred: profile.contactMedium[i].preferred,
            characteristic: {
              contactType: profile.contactMedium[i].characteristic.contactType,
              phoneNumber: profile.contactMedium[i].characteristic.phoneNumber
            }
          })
        }
      }
    }
    if (profile.partyCharacteristic) {
      for (let i = 0; i < profile.partyCharacteristic.length; i++) {
        if (profile.partyCharacteristic[i].name == 'logo') {
          this.imgPreview = profile.partyCharacteristic[i].value
          this.showImgPreview = true;
        } else if (profile.partyCharacteristic[i].name == 'description') {
          this.profileForm.controls['description'].setValue(profile.partyCharacteristic[i].value);
        } else if (profile.partyCharacteristic[i].name == 'website') {
          this.profileForm.controls['website'].setValue(profile.partyCharacteristic[i].value);
        } else if (profile.partyCharacteristic[i].name == 'country') {
          this.profileForm.controls['country'].setValue(profile.partyCharacteristic[i].value);
        } else if (profile.partyCharacteristic[i].name == 'contractManagement') {
          const contractManagement = profile.partyCharacteristic[i].value ?? {};
          this.profileForm.controls['contractManagementAddress'].setValue(contractManagement.address ?? '');
          this.profileForm.controls['contractManagementClientId'].setValue(contractManagement.clientId ?? '');
          this.profileForm.controls['contractManagementScopes'].setValue(this.formatContractManagementScopes(contractManagement.scope));
        }
      }
    }
  }

  private parseContractManagementScopes(scopes: string | null | undefined): string[] {
    if (!scopes) {
      return [];
    }

    return scopes
      .split(',')
      .map(scope => scope.trim())
      .filter(scope => scope.length > 0);
  }

  private formatContractManagementScopes(scopes: unknown): string {
    if (Array.isArray(scopes)) {
      return scopes
        .filter(scope => typeof scope === 'string')
        .join(', ');
    }

    if (typeof scopes === 'string') {
      return scopes;
    }

    return '';
  }

  getMediumContactType(medium: any, fallback: string = ''): string {
    const contactType = medium?.characteristic?.contactType;

    if (typeof contactType === 'string' && contactType.trim() !== '') {
      return contactType.trim();
    }

    return fallback;
  }

  private getContactTitle(defaultTitle: string): string {
    const contactTitle = this.mediumForm.value.contactTitle;

    if (typeof contactTitle === 'string' && contactTitle.trim() !== '') {
      return contactTitle.trim();
    }

    return defaultTitle;
  }

  saveMedium(): boolean {
    if (this.phoneSelected) {
      try {
        const phoneNumber = parsePhoneNumber(this.mediumForm.value.telephoneNumber);
        if (phoneNumber) {
          if (!phoneNumber.isValid()) {
            this.mediumForm.controls['telephoneNumber'].setErrors({ 'invalidPhoneNumber': true });
            this.toastVisibility = true;
            setTimeout(() => {
              this.toastVisibility = false
            }, 2000);
            return false;
          } else {
            this.mediumForm.controls['telephoneNumber'].setErrors(null);
            this.toastVisibility = false;
          }
        }
      } catch (e: any) {
        this.mediumForm.controls['telephoneNumber'].setErrors({ 'invalidPhoneNumber': true });
        this.toastVisibility = true;
        setTimeout(() => {
          this.toastVisibility = false
        }, 2000);
        return false;
      }
    }

    if (this.mediumForm.invalid) {
      this.toastVisibility = true;
      setTimeout(() => {
        this.toastVisibility = false
      }, 2000);
      return false;
    } else {
      if (this.emailSelected) {
        this.contactmediums.push({
          id: uuidv4(),
          mediumType: 'Email',
          preferred: false,
          characteristic: {
            contactType: this.getContactTitle('Email'),
            emailAddress: this.mediumForm.value.email
          }
        })
      } else if (this.addressSelected) {
        this.contactmediums.push({
          id: uuidv4(),
          mediumType: 'PostalAddress',
          preferred: false,
          characteristic: {
            contactType: this.getContactTitle('PostalAddress'),
            city: this.mediumForm.value.city,
            country: this.mediumForm.value.country,
            postCode: this.mediumForm.value.postCode,
            stateOrProvince: this.mediumForm.value.stateOrProvince,
            street1: this.mediumForm.value.street
          }
        })
      } else {
        this.contactmediums.push({
          id: uuidv4(),
          mediumType: 'TelephoneNumber',
          preferred: false,
          characteristic: {
            contactType: this.getContactTitle('Phone'),
            phoneNumber: this.mediumForm.value.telephoneNumber
          }
        })
      }
    }
    this.mediumForm.reset();
    return true;
  }

  removeMedium(medium: any) {
    const index = this.contactmediums.findIndex(item => item.id === medium.id);
    if (index !== -1) {
      this.contactmediums.splice(index, 1);
    }
  }

  editMedium() {

    const index = this.contactmediums.findIndex(item => item.id === this.selectedMedium.id);
    if (index !== -1) {
      if (this.mediumForm.get('contactTitle')?.invalid) {
        this.toastVisibility = true;
        setTimeout(() => {
          this.toastVisibility = false
        }, 2000);
        return;
      }
      if (this.selectedMedium.mediumType == 'Email') {
        if (this.mediumForm.get('email')?.invalid) {
          this.toastVisibility = true;
          setTimeout(() => {
            this.toastVisibility = false
          }, 2000);
          return;
        }
        this.contactmediums[index] = {
          id: this.contactmediums[index].id,
          mediumType: 'Email',
          preferred: this.contactmediums[index].preferred,
          characteristic: {
            contactType: this.getContactTitle('Email'),
            emailAddress: this.mediumForm.value.email
          }
        }
      } else if (this.selectedMedium.mediumType == 'PostalAddress') {
        let fieldsToCheck = ['country', 'city', 'stateOrProvince', 'street'];

        fieldsToCheck.forEach(fieldName => {
          const control = this.mediumForm.get(fieldName);
          if (control?.invalid) {
            this.toastVisibility = true;
            setTimeout(() => {
              this.toastVisibility = false
            }, 2000);
            return;
          }
        });
        this.contactmediums[index] = {
          id: this.contactmediums[index].id,
          mediumType: 'PostalAddress',
          preferred: this.contactmediums[index].preferred,
          characteristic: {
            contactType: this.getContactTitle('PostalAddress'),
            city: this.mediumForm.value.city,
            country: this.mediumForm.value.country,
            postCode: this.mediumForm.value.postCode,
            stateOrProvince: this.mediumForm.value.stateOrProvince,
            street1: this.mediumForm.value.street
          }
        }
      } else {
        try {
          const phoneNumber = parsePhoneNumber(this.mediumForm.value.telephoneNumber);
          if (phoneNumber) {
            if (!phoneNumber.isValid()) {
              this.mediumForm.controls['telephoneNumber'].setErrors({ 'invalidPhoneNumber': true });
              this.toastVisibility = true;
              setTimeout(() => {
                this.toastVisibility = false
              }, 2000);
              return;
            } else {
              this.mediumForm.controls['telephoneNumber'].setErrors(null);
              this.toastVisibility = false;
            }
          }
        }
        catch (error) {
          this.mediumForm.controls['telephoneNumber'].setErrors({ 'invalidPhoneNumber': true });
          this.toastVisibility = true;
          setTimeout(() => {
            this.toastVisibility = false
          }, 2000);
          return;
        }
        this.contactmediums[index] = {
          id: this.contactmediums[index].id,
          mediumType: 'TelephoneNumber',
          preferred: this.contactmediums[index].preferred,
          characteristic: {
            contactType: this.getContactTitle('Phone'),
            phoneNumber: this.mediumForm.value.telephoneNumber
          }
        }
      }
      this.mediumForm.reset();
      this.selectedMedium = null;
      this.showMediumModal = false;
    }
  }

  showEdit(medium: any) {
    this.selectedMedium = medium;
    this.mediumForm.controls['contactTitle'].setValue(this.getMediumContactType(this.selectedMedium));
    if (this.selectedMedium.mediumType == 'Email') {
      this.mediumForm.get('type')?.setValue('email');
      this.mediumForm.controls['email'].setValue(this.selectedMedium.characteristic.emailAddress);
    } else if (this.selectedMedium.mediumType == 'PostalAddress') {
      this.mediumForm.get('type')?.setValue('address');
      this.mediumForm.controls['country'].setValue(this.selectedMedium.characteristic.country);
      this.mediumForm.controls['city'].setValue(this.selectedMedium.characteristic.city);
      this.mediumForm.controls['stateOrProvince'].setValue(this.selectedMedium.characteristic.stateOrProvince);
      this.mediumForm.controls['postCode'].setValue(this.selectedMedium.characteristic.postCode);
      this.mediumForm.controls['street'].setValue(this.selectedMedium.characteristic.street1);
    } else {
      this.mediumForm.get('type')?.setValue('phone');
      // The prefix/national-number split is handled internally by app-phone-number-input's writeValue.
      this.mediumForm.controls['telephoneNumber'].setValue(this.selectedMedium.characteristic.phoneNumber);
    }
    this.showMediumModal = true;
  }

  openAddMedium(): void {
    this.selectedMedium = null;
    this.mediumForm.reset();
    this.mediumForm.get('type')?.setValue('email');
    this.showMediumModal = true;
  }

  cancelMedium(): void {
    this.selectedMedium = null;
    this.mediumForm.reset();
    this.showMediumModal = false;
  }

  saveMediumModal(): void {
    if (this.selectedMedium) {
      this.editMedium();
    } else if (this.saveMedium()) {
      this.showMediumModal = false;
    }
  }

  get emailSelected(): boolean {
    return !this.addressSelected && !this.phoneSelected;
  }

  get addressSelected(): boolean {
    return this.mediumForm.value.type === 'address';
  }

  get phoneSelected(): boolean {
    return this.mediumForm.value.type === 'phone';
  }

  /** Header fields shown above the type-dependent body — the type selector itself
   * is hidden while editing (an existing medium's type can't change). */
  get mediumHeaderFields(): FormField[] {
    return [
      ...(!this.selectedMedium ? [{
        type: 'select', name: 'type', label: 'PROFILE._medium_type', colSpan: 2, options: this.mediumTypeOptions,
      } as FormField] : []),
      { type: 'string', name: 'contactTitle', label: 'PROFILE._contact_title', required: true, colSpan: 2, placeholder: 'PROFILE._contact_title_placeholder' },
    ];
  }

  /** Swapped based on the type selector's current value — same array-swap pattern
   * `package-deployment`/`resource-spec-form` already use for a type-dependent dynamic-form. */
  get mediumBodyFields(): FormField[] {
    if (this.addressSelected) {
      return [
        { type: 'string', name: 'country', label: 'PROFILE._country', required: true, dataCy: 'mediumCountry', placeholder: 'PROFILE._country_placeholder' },
        { type: 'string', name: 'city', label: 'PROFILE._city', required: true, placeholder: 'PROFILE._city_placeholder' },
        { type: 'string', name: 'stateOrProvince', label: 'PROFILE._state', required: true, placeholder: 'PROFILE._state_placeholder' },
        { type: 'string', name: 'postCode', label: 'PROFILE._post_code', required: true, placeholder: 'PROFILE._post_code_placeholder' },
        { type: 'textarea', name: 'street', label: 'PROFILE._street', required: true, colSpan: 2, rows: 4, placeholder: 'PROFILE._street_placeholder' },
      ];
    }
    if (this.phoneSelected) {
      return [{ type: 'phoneNumber', name: 'telephoneNumber', label: 'PROFILE._phone', required: true, colSpan: 2 }];
    }
    return [{ type: 'string', name: 'email', label: 'PROFILE._email', required: true, colSpan: 2, placeholder: 'PROFILE._email_placeholder' }];
  }

  /** Validators for every type-dependent control, keyed by the medium type that needs them —
   * anything not listed here for the active type gets cleared+blanked. */
  private readonly mediumTypeValidators: Record<string, Record<string, ValidatorFn[]>> = {
    email: { email: [Validators.required, Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')] },
    address: {
      country: [Validators.required], city: [Validators.required],
      stateOrProvince: [Validators.required], postCode: [Validators.required], street: [Validators.required],
    },
    phone: { telephoneNumber: [Validators.required] },
  };

  /** Toggles which of email/address/phone controls are required, clearing and blanking
   * the others — same validation behavior the old hand-built type-select used to drive,
   * just triggered by mediumForm's own 'type' control instead of a raw DOM change event. */
  private applyMediumTypeValidators(type: string): void {
    const activeValidators = this.mediumTypeValidators[type] ?? {};
    for (const name of ['email', 'country', 'city', 'stateOrProvince', 'postCode', 'street', 'telephoneNumber']) {
      const control = this.mediumForm.get(name);
      control?.setValidators(activeValidators[name] ?? []);
      control?.markAsUntouched();
      control?.setValue('');
    }
    this.cdr.detectChanges();
  }

  printActiveValidators(controlName: string) {
    const control = this.mediumForm.get(controlName);
    if (!control || !control.validator) {
      return;
    }

    const validatorFn = control.validator({} as AbstractControl);
    if (!validatorFn) {
      return;
    }

  }

  printAllActiveValidators() {
    Object.keys(this.mediumForm.controls).forEach(controlName => {
      this.printActiveValidators(controlName);
    });
  }



  public dropped(files: NgxFileDropEntry[], sel: any) {
    this.files = files;
    for (const droppedFile of files) {

      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
        fileEntry.file((file: File) => {

          if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
              const base64String: string = e.target.result.split(',')[1];
              let fileBody = {
                content: {
                  name: 'orglogo' + file.name,
                  data: base64String
                },
                contentType: file.type,
                isPublic: true
              }
              if (!this.isValidFilename(fileBody.content.name)) {
                this.errorMessage = 'File names can only include alphabetical characters (A-Z, a-z) and a limited set of symbols, such as underscores (_), hyphens (-), and periods (.)';
                console.error('There was an error while uploading file!');
                this.showError = true;
                setTimeout(() => {
                  this.showError = false;
                }, 3000);
                return;
              }
              //IF FILES ARE HIGHER THAN 3MB THROW AN ERROR
              if (file.size > this.MAX_FILE_SIZE) {
                this.errorMessage = 'File size must be under 3MB.';
                console.error('There was an error while uploading file!');
                this.showError = true;
                setTimeout(() => {
                  this.showError = false;
                }, 3000);
                return;
              }
              this.attachmentService.uploadFile(fileBody).subscribe({
                next: data => {
                  if (sel == 'img') {
                    if (file.type.startsWith("image")) {
                      this.showImgPreview = true;
                      this.imgPreview = data.content;
                    } else {
                      this.errorMessage = 'File must have a valid image format!';
                      this.showError = true;
                      setTimeout(() => {
                        this.showError = false;
                      }, 3000);
                    }
                  }
                  this.cdr.detectChanges();
                },
                error: error => {
                  console.error('There was an error while uploading!', error);
                  if (error.error.error) {
                    this.errorMessage = 'Error: ' + error.error.error;
                  } else {
                    this.errorMessage = 'There was an error while uploading the file!';
                  }
                  if (error.status === 413) {
                    this.errorMessage = 'File size too large! Must be under 3MB.';
                  }
                  this.showError = true;
                  setTimeout(() => {
                    this.showError = false;
                  }, 3000);
                }
              });
            };
            reader.readAsDataURL(file);
          }

        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
      }
    }
  }

  isValidFilename(filename: string): boolean {
    return this.filenameRegex.test(filename);
  }

  public fileOver(event: any) {
  }

  public fileLeave(event: any) {
  }

  saveImgFromURL() {
    this.showImgPreview = true;
    this.imgPreview = this.imgURL.nativeElement.value;
    this.attImageName.reset();
    this.cdr.detectChanges();
  }

  removeImg() {
    this.showImgPreview = false;
    this.imgPreview = '';
    this.cdr.detectChanges();
  }

}
