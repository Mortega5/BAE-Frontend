import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MarkdownModule } from 'ngx-markdown';

import { CharacteristicComponent } from './characteristic.component';

describe('CharacteristicComponent', () => {
  let component: CharacteristicComponent;
  let fixture: ComponentFixture<CharacteristicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [
        CharacteristicComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        TranslateModule.forRoot(),
        MarkdownModule.forRoot(),
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CharacteristicComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should keep false as default value for boolean characteristics', () => {
    component.characteristic = {
      id: 'bool-1',
      name: 'platinum',
      description: '',
      productSpecCharacteristicValue: [
        { isDefault: false, value: true },
        { isDefault: true, value: false },
      ],
    } as any;

    component.ngOnInit();

    expect(component.fields[0].type).toBe('boolean');
    expect(component.control.value).toBeFalse();
  });

  it('onControlCommit should emit boolean value', () => {
    component.characteristic = {
      id: 'bool-1',
      name: 'platinum',
      description: '',
      productSpecCharacteristicValue: [
        { isDefault: true, value: true },
        { isDefault: false, value: false },
      ],
    } as any;
    component.ngOnInit();
    const emitSpy = spyOn(component.valueChange, 'emit');

    component.control.setValue(false);
    component.onControlCommit();

    expect(emitSpy).toHaveBeenCalledWith({
      characteristicId: 'bool-1',
      selectedValue: false,
    });
  });

  it('template should render a yes/no toggle for boolean characteristics', () => {
    component.characteristic = {
      id: 'bool-1',
      name: 'platinum',
      description: '',
      productSpecCharacteristicValue: [
        { isDefault: true, value: true },
        { isDefault: false, value: false },
      ],
    } as any;

    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('[data-cy="characteristicBoolean-yes"]');
    const select = fixture.nativeElement.querySelector('select');
    expect(toggle).toBeTruthy();
    expect(select).toBeNull();
  });
});
