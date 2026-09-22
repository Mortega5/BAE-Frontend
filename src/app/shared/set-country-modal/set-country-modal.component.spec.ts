import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { NotificationService } from 'src/app/services/notification.service';

import { SetCountryModalComponent } from './set-country-modal.component';

describe('SetCountryModalComponent', () => {
  let component: SetCountryModalComponent;
  let fixture: ComponentFixture<SetCountryModalComponent>;
  let accountServiceSpy: jasmine.SpyObj<AccountServiceService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    accountServiceSpy = jasmine.createSpyObj<AccountServiceService>('AccountServiceService', ['updateOrgCountry']);
    notificationServiceSpy = jasmine.createSpyObj<NotificationService>('NotificationService', ['showSuccess', 'showError']);

    await TestBed.configureTestingModule({
      imports: [SetCountryModalComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AccountServiceService, useValue: accountServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SetCountryModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('save should do nothing when the form is invalid', async () => {
    component.partyId = 'party-1';

    await component.save();

    expect(accountServiceSpy.updateOrgCountry).not.toHaveBeenCalled();
  });

  it('save should update the org country and emit saved on success', async () => {
    component.partyId = 'party-1';
    component.form.patchValue({ country: 'ES' });
    accountServiceSpy.updateOrgCountry.and.resolveTo({});
    const savedSpy = spyOn(component.saved, 'emit');

    await component.save();

    expect(accountServiceSpy.updateOrgCountry).toHaveBeenCalledWith('party-1', 'ES');
    expect(notificationServiceSpy.showSuccess).toHaveBeenCalledWith('PROFILE._success');
    expect(savedSpy).toHaveBeenCalledWith('ES');
    expect(component.saving).toBeFalse();
  });

  it('save should show an error notification when the update fails', async () => {
    component.partyId = 'party-1';
    component.form.patchValue({ country: 'ES' });
    accountServiceSpy.updateOrgCountry.and.rejectWith({ error: { error: 'boom' } });
    const savedSpy = spyOn(component.saved, 'emit');

    await component.save();

    expect(notificationServiceSpy.showError).toHaveBeenCalledWith('PROFILE._update_error', { details: 'boom' });
    expect(savedSpy).not.toHaveBeenCalled();
    expect(component.saving).toBeFalse();
  });

  it('close should emit closed', () => {
    const closedSpy = spyOn(component.closed, 'emit');

    component.close();

    expect(closedSpy).toHaveBeenCalled();
  });

  it('ngOnChanges should reset the form when becoming visible', () => {
    component.form.patchValue({ country: 'ES' });

    component.ngOnChanges({ visible: { currentValue: true } as any } as any);

    expect(component.form.value.country).toBeFalsy();
  });

  it('the country dropdown should render fixed-positioned, anchored to the input, so the modal\'s own overflow-y-auto never clips it', () => {
    component.visible = true;
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const inputRow: HTMLElement | null = root.querySelector('.search-select-root > div');
    const input: HTMLInputElement | null = root.querySelector('.search-select-root input');
    expect(input).withContext('search-select input should be rendered').toBeTruthy();
    input!.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    const dropdown = root.querySelector<HTMLElement>('.search-select-root .fixed');
    expect(dropdown).withContext('dropdown should be open').toBeTruthy();
    expect(getComputedStyle(dropdown!).position).toBe('fixed');

    const inputRect = inputRow!.getBoundingClientRect();
    const dropdownRect = dropdown!.getBoundingClientRect();
    expect(dropdownRect.top).toBeCloseTo(inputRect.bottom + 4, 0);
    expect(dropdownRect.left).toBeCloseTo(inputRect.left, 0);
  });
});
