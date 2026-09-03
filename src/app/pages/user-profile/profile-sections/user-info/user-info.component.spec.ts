import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UserInfoComponent } from './user-info.component';

describe('UserInfoComponent', () => {
  let component: UserInfoComponent;
  let fixture: ComponentFixture<UserInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [UserInfoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loadProfileData should populate accountForm.username from the profile', () => {
    component.loadProfileData({ externalReference: [{ name: 'jdoe' }] });

    expect(component.accountForm.value.username).toBe('jdoe');
  });

  it('loadProfileData should not throw when externalReference is missing', () => {
    expect(() => component.loadProfileData({})).not.toThrow();
    expect(component.accountForm.value.username).toBeUndefined();
  });

  it('every accountFields entry should be readonly', () => {
    expect(component.accountFields.every(f => f.readonly)).toBeTrue();
  });
});
