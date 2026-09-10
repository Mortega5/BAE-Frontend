import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { countries } from 'src/app/models/country.const';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';

@Component({
  selector: 'user-info',
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.css'
})
export class UserInfoComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  orders: any[] = [];
  profile: any;
  partyId: any = '';
  token: string = '';
  email: string = '';
  countries: any[] = countries;

  readonly accountFields: FormField[] = [
    { type: 'string', name: 'username', label: 'PROFILE._user_id', readonly: true, colSpan: 1 },
    { type: 'string', name: 'email', label: 'PROFILE._email', readonly: true, colSpan: 1 },
    { type: 'string', name: 'token', label: 'PROFILE._token', readonly: true },
  ];

  accountForm = buildFormGroup(this.accountFields);

  readonly profileFields: FormField[] = [
    { type: 'string', name: 'name', label: 'PROFILE._name', required: true, colSpan: 2, placeholder: 'PROFILE._name_placeholder' },
    { type: 'string', name: 'lastname', label: 'PROFILE._lastname', required: true, colSpan: 2, placeholder: 'PROFILE._lastname_placeholder' },
    { type: 'string', name: 'nacionality', label: 'PROFILE._nacionality', colSpan: 2, placeholder: 'PROFILE._nacionality_placeholder' },
    {
      type: 'select', name: 'gender', label: 'PROFILE._gender', colSpan: 2, options: [
        { value: '', label: "I'd rather not say" },
        { value: 'Female', label: 'Female' },
        { value: 'Male', label: 'Male' },
        { value: 'Other', label: 'Other' },
      ]
    },
    {
      type: 'select', name: 'treatment', label: 'PROFILE._treatment', colSpan: 2, options: [
        { value: '', label: "I'd rather not say" },
        { value: 'Miss', label: 'Miss' },
        { value: 'Mrs', label: 'Mrs' },
        { value: 'Mr', label: 'Mr' },
        { value: 'Ms', label: 'Ms' },
      ]
    },
    {
      type: 'select', name: 'maritalstatus', label: 'PROFILE._marital_status', colSpan: 2, options: [
        { value: '', label: "I'd rather not say" },
        { value: 'Divorced', label: 'Divorced' },
        { value: 'Married', label: 'Married' },
        { value: 'Separated', label: 'Separated' },
        { value: 'Single', label: 'Single' },
        { value: 'Widowed', label: 'Widowed' },
      ]
    }
  ];

  readonly birthdateFields: FormField[] = [
    { type: 'date', name: 'birthdate', label: 'PROFILE._date' },
    { type: 'string', name: 'city', label: 'PROFILE._city', colSpan: 1, placeholder: 'PROFILE._city_placeholder' },
    {
      type: 'select', name: 'country', label: 'PROFILE._country', colSpan: 1, options: [
        { value: '', label: 'Select country' },
        ...countries.map(country => ({ value: country.code, label: country.name })),
      ]
    },
  ];

  userProfileForm = buildFormGroup([...this.profileFields, ...this.birthdateFields]);

  dateRange = new FormControl();
  selectedDate: any;
  preferred: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private accountService: AccountServiceService,
    private eventMessage: EventMessageService,
    private notificationService: NotificationService
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      })
  }

  ngOnInit() {
    this.loading = true;
    let today = new Date();
    today.setMonth(today.getMonth() - 1);
    this.selectedDate = today.toISOString();
    this.initPartyInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
        this.accountService.getOrgInfo(this.partyId).then(data => {
        })
      }
      this.token = aux.token;
      this.email = aux.email;
      this.accountForm.controls['email'].setValue(this.email);
      this.accountForm.controls['token'].setValue(this.token);
      //this.partyId = aux.partyId;
      this.getProfile();
    }
  }

  getProfile() {
    this.accountService.getUserInfo(this.partyId).then(data => {
      this.profile = data;
      this.loadProfileData(this.profile)
      this.loading = false;
      this.cdr.detectChanges();
    })

    this.cdr.detectChanges();
  }

  updateProfile() {
    let profile = {
      "id": this.partyId,
      "href": this.partyId,
      "countryOfBirth": this.userProfileForm.value.country,
      "familyName": this.userProfileForm.value.lastname,
      "gender": this.userProfileForm.value.gender,
      "givenName": this.userProfileForm.value.name,
      "maritalStatus": this.userProfileForm.value.maritalstatus,
      "nationality": this.userProfileForm.value.nacionality,
      "placeOfBirth": this.userProfileForm.value.city,
      "title": this.userProfileForm.value.treatment,
      "birthDate": this.userProfileForm.value.birthdate
    }
    this.accountService.updateUserInfo(this.partyId, profile).subscribe({
      next: data => {
        this.userProfileForm.reset();
        this.getProfile();
        this.notificationService.showSuccess('PROFILE._success');
      },
      error: error => {
        console.error('There was an error while updating!', error);
        this.notificationService.showError('PROFILE._update_error');
      }
    });
  }

  loadProfileData(profile: any) {
    this.accountForm.controls['username'].setValue(profile.externalReference?.[0]?.name);
    this.userProfileForm.controls['name'].setValue(profile.givenName);
    this.userProfileForm.controls['lastname'].setValue(profile.familyName);
    //this.userProfileForm.controls['treatment'].setValue(profile.title);
    this.userProfileForm.controls['maritalstatus'].setValue(profile.maritalStatus);
    this.userProfileForm.controls['gender'].setValue(profile.gender);
    this.userProfileForm.controls['nacionality'].setValue(profile.nacionality);
    //this.userProfileForm.controls['birthdate'].setValue(profile.birthDate);
    this.userProfileForm.controls['city'].setValue(profile.placeOfBirth);
    this.userProfileForm.controls['country'].setValue(profile.countryOfBirth);
  }

}
