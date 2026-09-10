import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  CONTACT_US_SUPPORT_TYPES,
  ContactUsDestinations,
  ContactUsSupportType
} from 'src/app/models/contact-us.constants';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { NotificationService } from 'src/app/services/notification.service';
import { environment } from 'src/environments/environment';

interface EmailConfig {
  smtpServer?: string;
  smtpPort?: string;
  email?: string;
  emailUser?: string;
  emailPassword?: string;
  contactUsDestinations?: Partial<ContactUsDestinations>;
}

type ContactUsDestinationControlName =
  | 'contactUsGeneralEmail'
  | 'contactUsTechnicalEmail'
  | 'contactUsOnboardingEmail'
  | 'contactUsLegalEmail';

@Component({
  selector: 'email',
  templateUrl: './email.component.html',
  styleUrl: './email.component.css'
})
export class EmailComponent {

  private readonly contactUsDestinationControlNames: Record<ContactUsSupportType, ContactUsDestinationControlName> = {
    general: 'contactUsGeneralEmail',
    technical: 'contactUsTechnicalEmail',
    onboarding: 'contactUsOnboardingEmail',
    legal: 'contactUsLegalEmail'
  };

  private readonly contactUsDestinationLabels: Record<ContactUsSupportType, string> = {
    general: 'ADMIN._contactUsGeneralEmail',
    technical: 'ADMIN._contactUsTechnicalEmail',
    onboarding: 'ADMIN._contactUsOnboardingEmail',
    legal: 'ADMIN._contactUsLegalEmail'
  };

  readonly contactUsDestinationFields = CONTACT_US_SUPPORT_TYPES.map((supportType) => ({
    supportType,
    controlName: this.contactUsDestinationControlNames[supportType],
    labelKey: this.contactUsDestinationLabels[supportType]
  }));

  emailFormFields: FormField[] = [
    { type: 'string', name: 'smtpServer', label: 'ADMIN._smtpServer', required: true, dataCy: 'adminSmtpServer' },
    { type: 'string', name: 'smtpPort', label: 'ADMIN._smtpPort', required: true, dataCy: 'adminSmtpPort' },
    { type: 'string', name: 'email', label: 'ADMIN._sourceEmail', required: true, dataCy: 'adminSourceEmail' },
    { type: 'string', name: 'emailUser', label: 'ADMIN._emailUser', required: true, dataCy: 'adminEmailUser' },
    { type: 'string', name: 'emailPassword', label: 'ADMIN._emailPass', required: true, inputType: 'password', dataCy: 'adminEmailPass' },
  ];

  contactUsFormFields: FormField[] = this.contactUsDestinationFields.map((destination): FormField => ({
    type: 'string',
    name: destination.controlName,
    label: destination.labelKey,
    required: true,
    dataCy: `admin${destination.controlName}`,
  }));

  emailForm = new FormGroup({
    smtpServer: new FormControl('', [Validators.required]),
    smtpPort: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    emailUser: new FormControl('', [Validators.required]),
    emailPassword: new FormControl('', [Validators.required]),
    contactUsGeneralEmail: new FormControl('', [Validators.required, Validators.email]),
    contactUsTechnicalEmail: new FormControl('', [Validators.required, Validators.email]),
    contactUsOnboardingEmail: new FormControl('', [Validators.required, Validators.email]),
    contactUsLegalEmail: new FormControl('', [Validators.required, Validators.email])
  });

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.getConfig();
  }

  getErrorMessage(error: any, defaultMessage: string): string {
    return error?.error?.error ? 'Error: ' + error.error.error : defaultMessage;
  }

  fillData(data: EmailConfig) {
    const contactUsDestinations = data.contactUsDestinations ?? {};

    this.emailForm.setValue({
      smtpServer: data.smtpServer ?? '',
      smtpPort: data.smtpPort ?? '',
      email: data.email ?? '',
      emailUser: data.emailUser ?? '',
      emailPassword: '',
      contactUsGeneralEmail: contactUsDestinations.general ?? '',
      contactUsTechnicalEmail: contactUsDestinations.technical ?? '',
      contactUsOnboardingEmail: contactUsDestinations.onboarding ?? '',
      contactUsLegalEmail: contactUsDestinations.legal ?? ''
    });
  }

  getConfig() {
    const url = `${environment.BASE_URL}/charging/api/orderManagement/notify/config`;
    return this.http.get<any>(url).subscribe({
      next: data => {
        this.fillData(data);
      },
      error: error => {
        console.error('There was an error while getting config!', error);
        this.notificationService.showError(this.getErrorMessage(error, 'There was an error while getting the config'));
      }
    })
  }

  addConfig() {
    const url = `${environment.BASE_URL}/charging/api/orderManagement/notify/config`;
    const body = {
      "smtpServer": this.emailForm.value.smtpServer,
      "smtpPort": this.emailForm.value.smtpPort,
      "email": this.emailForm.value.email,
      "emailUser": this.emailForm.value.emailUser,
      "emailPassword": this.emailForm.value.emailPassword,
      "contactUsDestinations": {
        "general": this.emailForm.value.contactUsGeneralEmail,
        "technical": this.emailForm.value.contactUsTechnicalEmail,
        "onboarding": this.emailForm.value.contactUsOnboardingEmail,
        "legal": this.emailForm.value.contactUsLegalEmail
      }
    }

    return this.http.post<any>(url, body).subscribe({
      next: () => {
        this.emailForm.patchValue({ emailPassword: '' });
        this.notificationService.showSuccess('ADMIN._emailConfigUpdated');
      },
      error: error => {
        console.error('There was an error while updating!', error);
        this.notificationService.showError(this.getErrorMessage(error, 'There was an error while updating the config'));
      }
    })
  }
}
