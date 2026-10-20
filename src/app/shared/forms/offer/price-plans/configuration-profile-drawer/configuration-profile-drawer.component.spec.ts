import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ConfigurationProfileDrawerComponent } from './configuration-profile-drawer.component';

describe('ConfigurationProfileDrawerComponent', () => {
  let component: ConfigurationProfileDrawerComponent;
  let fixture: ComponentFixture<ConfigurationProfileDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [ConfigurationProfileDrawerComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should exclude optional toggle characteristics ending with - enabled', () => {
    const testFixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    const testComponent = testFixture.componentInstance;

    testComponent.profileData = [
      {
        id: 'char-1',
        name: 'Storage',
        productSpecCharacteristicValue: [{ value: 'small', isDefault: true }]
      },
      {
        id: 'char-2',
        name: 'Storage - enabled',
        productSpecCharacteristicValue: [{ value: true, isDefault: true }]
      }
    ];

    testComponent.ngOnInit();

    const names = testComponent.fields.map(field => field.label);
    expect(names).toEqual(['Storage']);
  });

  it('should keep filtering compliance and data-space-specific characteristics', () => {
    const testFixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    const testComponent = testFixture.componentInstance;

    testComponent.profileData = [
      {
        id: 'char-1',
        name: 'Compliance:SelfAtt',
        productSpecCharacteristicValue: [{ value: true, isDefault: true }]
      },
      {
        id: 'char-2',
        name: 'Policy JSON',
        valueType: 'authorizationPolicy',
        productSpecCharacteristicValue: [{ value: '{"a":1}', isDefault: true }]
      },
      {
        id: 'char-3',
        name: 'Credential JSON',
        valueType: 'credentialsConfiguration',
        productSpecCharacteristicValue: [{ value: '{"b":2}', isDefault: true }]
      },
      {
        id: 'char-4',
        name: 'Region',
        productSpecCharacteristicValue: [{ value: 'EU', isDefault: true }]
      }
    ];

    testComponent.ngOnInit();

    const names = testComponent.fields.map(field => field.label);
    expect(names).toEqual(['Region']);
  });

  it('should preserve boolean false as default selected value', () => {
    const testFixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    const testComponent = testFixture.componentInstance;

    testComponent.profileData = [
      {
        id: 'char-1',
        name: 'Platinum',
        productSpecCharacteristicValue: [
          { value: true, isDefault: false },
          { value: false, isDefault: true }
        ]
      }
    ];

    testComponent.ngOnInit();
    const saveSpy = spyOn(testComponent.save, 'emit');
    testComponent.saveProfile();

    const values = (saveSpy.calls.mostRecent().args[0] as any)[0].productSpecCharacteristicValue;
    expect(values.map((v: any) => v.isDefault)).toEqual([false, true]);
    expect(values[1].value).toBeFalse();
  });

  it('should label object values as JSON and mark only the chosen one as default', () => {
    const testFixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    const testComponent = testFixture.componentInstance;

    testComponent.profileData = [
      {
        id: 'char-1',
        name: 'Limits',
        valueType: 'object',
        productSpecCharacteristicValue: [
          { value: { cpu: 1 }, isDefault: true },
          { value: { cpu: 2 }, isDefault: false }
        ]
      }
    ];

    testComponent.ngOnInit();
    expect((testComponent.fields[0] as any).options.map((o: any) => o.label)).toEqual(['{"cpu":1}', '{"cpu":2}']);

    testComponent.form.get('char_0')!.setValue('1');
    const saveSpy = spyOn(testComponent.save, 'emit');
    testComponent.saveProfile();

    const values = (saveSpy.calls.mostRecent().args[0] as any)[0].productSpecCharacteristicValue;
    expect(values.map((v: any) => v.isDefault)).toEqual([false, true]);
    expect(values[1].value).toEqual({ cpu: 2 });
  });

  it('should give only the chosen range band a value, without mutating the input', () => {
    const testFixture = TestBed.createComponent(ConfigurationProfileDrawerComponent);
    const testComponent = testFixture.componentInstance;
    const bands = [
      { valueFrom: 1, valueTo: 10, unitOfMeasure: 'GB', isDefault: true },
      { valueFrom: 11, valueTo: 20, unitOfMeasure: 'GB', isDefault: false }
    ];

    testComponent.profileData = [{ id: 'char-1', name: 'Disk', productSpecCharacteristicValue: bands }];
    testComponent.ngOnInit();
    testComponent.form.get('char_0')!.setValue('1');
    const saveSpy = spyOn(testComponent.save, 'emit');
    testComponent.saveProfile();

    const values = (saveSpy.calls.mostRecent().args[0] as any)[0].productSpecCharacteristicValue;
    expect(values.map((v: any) => v.isDefault)).toEqual([false, true]);
    expect(values[1].value).toBe(11);
    expect('value' in values[0]).toBeFalse();
    expect('value' in bands[1]).toBeFalse();
  });
});
