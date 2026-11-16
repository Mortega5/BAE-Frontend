import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { environment } from 'src/environments/environment';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { OrganizationProfileNoticeComponent } from './organization-profile-notice.component';

describe('OrganizationProfileNoticeComponent', () => {
  let component: OrganizationProfileNoticeComponent;
  let fixture: ComponentFixture<OrganizationProfileNoticeComponent>;
  let accountService: AccountServiceService;
  let localStorageService: LocalStorageService;
  let eventMessage: EventMessageService;
  let session: any;

  const completeProfile = {
    partyCharacteristic: [{ name: 'country', value: 'ES' }],
    contactMedium: [{ mediumType: 'Email', characteristic: { emailAddress: 'a@b.com' } }],
  };

  const makeSession = (roles: string[], partyId = 'party-1') => ({
    id: 'user-1', logged_as: 'org-1', expire: moment().unix() + 3600,
    organizations: [{ id: 'org-1', name: 'Acme', partyId, roles: roles.map(name => ({ name })) }],
  });

  const setup = async (profile: any, gateways: number) => {
    spyOn(accountService, 'getOrgInfo').and.resolveTo(profile);
    spyOn(accountService, 'getPaymentInfo').and.resolveTo({ gatewaysCount: gateways, providerUrl: 'https://pay' });
    await component.checkOrganization(true);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [OrganizationProfileNoticeComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationProfileNoticeComponent);
    component = fixture.componentInstance;
    accountService = TestBed.inject(AccountServiceService);
    eventMessage = TestBed.inject(EventMessageService);
    localStorageService = TestBed.inject(LocalStorageService);
    session = makeSession([environment.ORG_ADMIN_ROLE]);
    spyOn(localStorageService, 'getObject').and.callFake(() => session);
  });

  it('stays closed when nobody is logged in as an organization', async () => {
    session = { id: 'user-1', logged_as: 'user-1', expire: moment().unix() + 3600 };
    await component.checkOrganization(true);
    expect(component.isOpen).toBeFalse();
  });

  it('stays closed when country, email and payment info are all there', async () => {
    await setup(completeProfile, 1);
    expect(component.isOpen).toBeFalse();
  });

  it('opens with a form for the missing country and email, and the payment dashboard link', async () => {
    await setup({ partyCharacteristic: [], contactMedium: [] }, 0);
    expect(component.isOpen).toBeTrue();
    expect(component.canEdit).toBeTrue();
    expect(component.fields.map(f => f.name)).toEqual(['country', 'email']);
    expect(component.missingPaymentInfo).toBeTrue();
  });

  it('only asks for what is missing', async () => {
    await setup({ partyCharacteristic: [{ name: 'country', value: 'ES' }], contactMedium: [] }, 1);
    expect(component.fields.map(f => f.name)).toEqual(['email']);
  });

  it('shows a plain list, without a form, to members that are not orgAdmin', async () => {
    session = makeSession(['member']);
    await setup({ partyCharacteristic: [], contactMedium: [] }, 1);
    expect(component.isOpen).toBeTrue();
    expect(component.canEdit).toBeFalse();
    const save = spyOn(accountService, 'completeOrgProfile');
    await component.save();
    expect(save).not.toHaveBeenCalled();
  });

  it('does not reopen after being dismissed while the session and organization are the same', async () => {
    await setup({ partyCharacteristic: [], contactMedium: [] }, 0);
    component.dismiss();
    await component.checkOrganization();
    expect(component.isOpen).toBeFalse();
  });

  it('flags a load failure so it can be retried', async () => {
    spyOn(accountService, 'getOrgInfo').and.rejectWith(new Error('boom'));
    spyOn(accountService, 'getPaymentInfo').and.resolveTo({ gatewaysCount: 0 });
    await component.checkOrganization(true);
    expect(component.loadFailed).toBeTrue();
    expect(component.isOpen).toBeTrue();
  });

  it('saves the missing fields, closes when only payment is left, and tells the profile page', async () => {
    await setup({ partyCharacteristic: [], contactMedium: [] }, 1);
    const save = spyOn(accountService, 'completeOrgProfile').and.resolveTo({});
    const emitted = spyOn(eventMessage, 'emitOrganizationProfileUpdated');
    spyOn(TestBed.inject(NotificationService), 'showSuccess');

    component.form.setValue({ country: 'FR', email: 'a@b.com' });
    await component.save();

    expect(save).toHaveBeenCalledWith('party-1', { country: 'FR', email: 'a@b.com' });
    expect(emitted).toHaveBeenCalledWith('party-1');
    expect(component.isOpen).toBeFalse();
  });

  it('does not save an invalid email', async () => {
    await setup({ partyCharacteristic: [{ name: 'country', value: 'ES' }], contactMedium: [] }, 1);
    const save = spyOn(accountService, 'completeOrgProfile');
    component.form.setValue({ email: 'not-an-email' });
    await component.save();
    expect(save).not.toHaveBeenCalled();
  });

  it('discards the answer for an organization that is no longer the current one', async () => {
    let release!: (profile: any) => void;
    spyOn(accountService, 'getOrgInfo').and.returnValue(new Promise(resolve => { release = resolve; }));
    spyOn(accountService, 'getPaymentInfo').and.resolveTo({ gatewaysCount: 0 });
    const first = component.checkOrganization(true);
    session = { id: 'user-1', logged_as: 'user-1', expire: moment().unix() + 3600 };
    await component.checkOrganization();
    release({ partyCharacteristic: [], contactMedium: [] });
    await first;
    expect(component.isOpen).toBeFalse();
  });
});
