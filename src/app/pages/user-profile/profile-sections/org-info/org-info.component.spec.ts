import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';

import { OrgInfoComponent } from './org-info.component';

describe('OrgInfoComponent', () => {
  let component: OrgInfoComponent;
  let fixture: ComponentFixture<OrgInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [OrgInfoComponent],
      imports: [HttpClientTestingModule, ReactiveFormsModule, RouterTestingModule, TranslateModule.forRoot(), TableInputComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OrgInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should require a title before saving a contact medium', () => {
    component.mediumForm.get('type')?.setValue('email');
    component.mediumForm.patchValue({
      email: 'support@example.com'
    });

    component.saveMedium();

    expect(component.mediumForm.get('contactTitle')?.invalid).toBeTrue();
    expect(component.contactmediums.length).toBe(0);
  });

  it('should save the contact medium title as contactType', () => {
    component.mediumForm.get('type')?.setValue('email');
    component.mediumForm.patchValue({
      contactTitle: 'Support',
      email: 'support@example.com'
    });

    component.saveMedium();

    expect(component.contactmediums.length).toBe(1);
    expect(component.contactmediums[0].characteristic.contactType).toBe('Support');
  });

  it('should show the empty-state box (not the table) when there are no contact mediums', () => {
    component.loading = false;
    component.isReadOnly = false;
    component.contactmediums = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-table-input')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PROFILE._no_mediums');
  });

  it('should show the table (not the empty-state box) once there is at least one contact medium', () => {
    component.loading = false;
    component.contactmediums = [{
      id: 'phone-1', mediumType: 'TelephoneNumber', preferred: false,
      characteristic: { contactType: 'Support', phoneNumber: '+34911222333' },
    }];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-table-input')).toBeTruthy();
  });

  it('openAddMedium should reset selectedMedium and default the type to email', () => {
    component.selectedMedium = { id: 'x' };
    component.openAddMedium();

    expect(component.selectedMedium).toBeNull();
    expect(component.showMediumModal).toBeTrue();
    expect(component.emailSelected).toBeTrue();
    expect(component.addressSelected).toBeFalse();
    expect(component.phoneSelected).toBeFalse();
  });

  it('cancelMedium should close the modal and clear the selected medium', () => {
    component.selectedMedium = { id: 'x' };
    component.showMediumModal = true;

    component.cancelMedium();

    expect(component.showMediumModal).toBeFalse();
    expect(component.selectedMedium).toBeNull();
  });

  it('saveMediumModal should close the modal on a successful add, and keep it open on an invalid one', () => {
    component.openAddMedium();
    component.mediumForm.patchValue({ contactTitle: 'Support', email: 'support@example.com' });

    component.saveMediumModal();
    expect(component.showMediumModal).toBeFalse();
    expect(component.contactmediums.length).toBe(1);

    component.openAddMedium();
    component.saveMediumModal();
    expect(component.showMediumModal).toBeTrue();
  });

  it('saveMediumModal should delegate to editMedium when a medium is selected', () => {
    const medium = {
      id: 'email-1', mediumType: 'Email', preferred: false,
      characteristic: { contactType: 'Support', emailAddress: 'old@example.com' },
    };
    component.contactmediums = [medium];
    component.showEdit(medium);
    component.mediumForm.patchValue({ email: 'new@example.com' });

    component.saveMediumModal();

    expect(component.showMediumModal).toBeFalse();
    expect(component.contactmediums[0].characteristic.emailAddress).toBe('new@example.com');
  });

  it('should close the modal on Escape', () => {
    component.openAddMedium();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(component.showMediumModal).toBeFalse();
  });

  it('should swap mediumBodyFields and required validators when the type changes', () => {
    component.openAddMedium();
    expect(component.emailSelected).toBeTrue();
    expect(component.mediumBodyFields.map(f => f.name)).toEqual(['email']);

    component.mediumForm.get('type')?.setValue('address');
    expect(component.addressSelected).toBeTrue();
    expect(component.mediumBodyFields.map(f => f.name)).toEqual(['country', 'city', 'stateOrProvince', 'postCode', 'street']);
    expect(component.mediumForm.get('email')?.validator).toBeNull();
    expect(component.mediumForm.get('country')?.hasValidator(Validators.required)).toBeTrue();

    component.mediumForm.get('type')?.setValue('phone');
    expect(component.phoneSelected).toBeTrue();
    expect(component.mediumBodyFields.map(f => f.name)).toEqual(['telephoneNumber']);
    expect(component.mediumForm.get('country')?.validator).toBeNull();
    expect(component.mediumForm.get('telephoneNumber')?.hasValidator(Validators.required)).toBeTrue();
  });

  it('should hide the type selector from mediumHeaderFields while editing', () => {
    expect(component.mediumHeaderFields.some(f => f.name === 'type')).toBeTrue();

    component.showEdit({ id: 'x', mediumType: 'Email', characteristic: { contactType: 'Support', emailAddress: 'a@b.com' } });

    expect(component.mediumHeaderFields.some(f => f.name === 'type')).toBeFalse();
  });

  it('showEdit should set the full phone number directly on telephoneNumber, without splitting a prefix', () => {
    const medium = {
      id: 'phone-1', mediumType: 'TelephoneNumber', preferred: false,
      characteristic: { contactType: 'Support', phoneNumber: '+34612345678' },
    };
    component.showEdit(medium);

    expect(component.phoneSelected).toBeTrue();
    expect(component.mediumForm.get('telephoneNumber')?.value).toBe('+34612345678');
  });

  it('should not repeat the phone title in the info column', () => {
    component.loading = false;
    component.contactmediums = [{
      id: 'phone-1',
      mediumType: 'TelephoneNumber',
      preferred: false,
      characteristic: {
        contactType: 'Support',
        phoneNumber: '+34911222333'
      }
    }];

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Support');
    expect(text).toContain('+34911222333');
    expect(text).not.toContain('(Support) +34911222333');
  });
});
