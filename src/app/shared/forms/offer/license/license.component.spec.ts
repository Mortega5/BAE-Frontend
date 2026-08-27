import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { LicenseComponent } from './license.component';

describe('LicenseComponent', () => {
  let component: LicenseComponent;
  let fixture: ComponentFixture<LicenseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [LicenseComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LicenseComponent);
    component = fixture.componentInstance;
    component.form = new FormGroup({});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('termsFile', () => {
    it('should populate termsFile from an existing terms-file term in edit mode', () => {
      component.formType = 'update';
      component.data = {
        productOfferingTerm: [
          { name: 'License', description: 'Terms text' },
          { name: 'terms-file', description: 'https://uploaded.file/uuid-1_terms.pdf' }
        ]
      };

      component.ngOnInit();

      expect(component.termsFileControl?.value).toEqual({ name: 'terms.pdf', url: 'https://uploaded.file/uuid-1_terms.pdf', attachmentType: '' });
    });

    it('should leave termsFile empty when no terms-file term exists', () => {
      component.formType = 'update';
      component.data = { productOfferingTerm: [{ name: 'License', description: 'Terms text' }] };

      component.ngOnInit();

      expect(component.termsFileControl?.value).toBeNull();
    });

    it('should emit a dirty termsFile field when a new file is uploaded', () => {
      component.formType = 'update';
      component.data = { productOfferingTerm: [{ name: 'License', description: 'Terms text' }] };
      component.ngOnInit();

      const emitSpy = jasmine.createSpy('formChange');
      component.formChange.subscribe(emitSpy);

      component.termsFileControl?.setValue({ name: 'new.pdf', url: 'https://uploaded.file/new.pdf' });
      component.ngOnDestroy();

      expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        dirtyFields: jasmine.arrayContaining(['termsFile'])
      }));
    });
  });
});
