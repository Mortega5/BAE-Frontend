import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { countries } from 'src/app/models/country.const';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

interface OrganizationContext {
  /** Identifies session + organization + permission, to notice when any of them changes. */
  key: string;
  partyId: string;
  name: string;
  canEdit: boolean;
}

const EMAIL_PATTERN = '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$';

/** Modal shown once per session/organization when the logged-in organization lacks what the
 * marketplace needs to operate: a country, a contact email and a payment gateway. An orgAdmin can
 * fill in the country and email right here; the payment gateway is set up in the payment
 * dashboard, and other members are only told what to ask their orgAdmin for. */
@Component({
  selector: 'app-organization-profile-notice',
  standalone: true,
  imports: [ModalComponent, DynamicFormComponent, ButtonComponent, TranslateModule],
  templateUrl: './organization-profile-notice.component.html',
})
export class OrganizationProfileNoticeComponent implements OnInit, OnDestroy {
  isOpen = false;
  saving = false;
  canEdit = false;
  loadFailed = false;
  organizationName = '';
  missingCountry = false;
  missingEmail = false;
  missingPaymentInfo = false;

  fields: FormField[] = [];
  form: FormGroup = buildFormGroup([]);

  private contextKey = '';
  /** Bumped on every (re)check, so a slow response for a previous organization is discarded. */
  private checkVersion = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private accountService: AccountServiceService,
    private eventMessage: EventMessageService,
    private notificationService: NotificationService,
    private router: Router,
  ) { }

  get hasFormFields(): boolean {
    return this.fields.length > 0;
  }

  ngOnInit(): void {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event.type === 'LoginProcess' || event.type === 'ChangedSession') {
        void this.checkOrganization(event.type === 'LoginProcess');
      }
    });
    // Covers sessions that start without any of those events (page reload with a stored session).
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => void this.checkOrganization());
    void this.checkOrganization();
  }

  ngOnDestroy(): void {
    this.checkVersion++;
    this.destroy$.next();
    this.destroy$.complete();
  }

  dismiss(): void {
    this.isOpen = false;
  }

  /** Re-checks the organization of the current session. Unless `force`, it does nothing when
   * session, organization and permission are the same as in the last check, so closing the
   * modal keeps it closed while navigating. */
  async checkOrganization(force = false): Promise<void> {
    const context = this.getContext();
    const key = context?.key ?? '';
    if (!force && key === this.contextKey) return;

    const version = ++this.checkVersion;
    this.contextKey = key;
    this.isOpen = false;
    this.loadFailed = false;
    this.saving = false;
    this.fields = [];
    this.missingCountry = this.missingEmail = this.missingPaymentInfo = false;
    if (!context) return;

    this.canEdit = context.canEdit;
    this.organizationName = context.name;
    try {
      const [profile, paymentInfo] = await Promise.all([
        this.accountService.getOrgInfo(context.partyId),
        this.accountService.getPaymentInfo(),
      ]);
      if (version !== this.checkVersion) return;
      this.missingCountry = !this.hasCountry(profile);
      this.missingEmail = !this.hasEmail(profile);
      this.missingPaymentInfo = Number(paymentInfo?.gatewaysCount ?? 0) === 0;
      this.buildFields();
      this.isOpen = this.missingCountry || this.missingEmail || this.missingPaymentInfo;
    } catch {
      if (version !== this.checkVersion) return;
      this.loadFailed = true;
      this.isOpen = true;
    }
  }

  async openPaymentDashboard(): Promise<void> {
    try {
      const data = await this.accountService.getPaymentInfo();
      if (data?.providerUrl) window.open(data.providerUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // The dashboard is also reachable from the profile; nothing to recover here.
    }
  }

  async save(): Promise<void> {
    const context = this.getContext();
    if (!context?.canEdit || context.key !== this.contextKey || !this.isOpen || this.saving || !this.hasFormFields) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const version = this.checkVersion;
    const values = this.form.getRawValue();
    this.saving = true;
    try {
      await this.accountService.completeOrgProfile(context.partyId, {
        country: this.missingCountry ? values.country : undefined,
        email: this.missingEmail ? values.email?.trim() : undefined,
      });
      if (version !== this.checkVersion) return;
      this.notificationService.showSuccess('PROFILE._success');
      this.missingCountry = this.missingEmail = false;
      this.buildFields();
      this.isOpen = this.missingPaymentInfo;
      this.eventMessage.emitOrganizationProfileUpdated(context.partyId);
    } catch (error: any) {
      if (version === this.checkVersion) {
        this.notificationService.showError('PROFILE._update_error', {
          details: error?.error?.error || error?.error?.message || error?.message
        });
      }
    } finally {
      if (version === this.checkVersion) this.saving = false;
    }
  }

  /** Only the fields still missing: the country select and the email input. */
  private buildFields(): void {
    const fields: FormField[] = [];
    if (this.missingCountry) {
      fields.push({
        type: 'select', name: 'country', label: 'PROFILE._country', required: true,
        searchable: true, dataCy: 'organizationNoticeCountry', placeholder: 'PROFILE._country_placeholder',
        options: countries.map(country => ({ value: country.code, label: country.name })),
      });
    }
    if (this.missingEmail) {
      fields.push({
        type: 'string', name: 'email', label: 'PROFILE._email', required: true, maxLength: 320,
        placeholder: 'PROFILE._email_placeholder', dataCy: 'organizationNoticeEmail',
        validators: [Validators.email, Validators.pattern(EMAIL_PATTERN)],
        errorMessages: { email: 'ORGANIZATION_PROFILE_NOTICE._email_invalid', pattern: 'ORGANIZATION_PROFILE_NOTICE._email_invalid' },
      });
    }
    this.fields = fields;
    this.form = buildFormGroup(fields);
  }

  /** The organization of the session, or null when nobody is logged in as one. */
  private getContext(): OrganizationContext | null {
    const session = this.localStorage.getObject('login_items') as LoginInfo | null;
    if (!session?.id || !session.logged_as || session.logged_as === session.id) return null;
    if (!Number.isFinite(session.expire) || session.expire <= moment().unix() + 4) return null;

    const organization = session.organizations?.find((item: any) => item.id === session.logged_as);
    if (!organization?.partyId) return null;

    const canEdit = (organization.roles ?? []).some((role: { name?: string }) => role.name === environment.ORG_ADMIN_ROLE);
    return {
      key: JSON.stringify([session.id, organization.id, organization.partyId, canEdit]),
      partyId: organization.partyId,
      name: organization.name || organization.id,
      canEdit,
    };
  }

  private hasCountry(profile: any): boolean {
    return (profile?.partyCharacteristic ?? []).some((item: any) => item?.name === 'country' && !!item.value);
  }

  private hasEmail(profile: any): boolean {
    return (profile?.contactMedium ?? []).some((medium: any) => medium?.mediumType?.toLowerCase() === 'email');
  }
}
