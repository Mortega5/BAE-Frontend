import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ApiOperation } from 'src/app/models/api-access.model';
import { apiConnectionForm } from '../api-fields';
import { ApiDefinitionFieldsComponent } from './api-definition-fields.component';

describe('ApiDefinitionFieldsComponent', () => {
  let fixture: ComponentFixture<ApiDefinitionFieldsComponent>;
  let component: ApiDefinitionFieldsComponent;
  const form = apiConnectionForm();
  const operations: ApiOperation[] = [{ id: 'list', action: 'read', path: '/items' }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ApiDefinitionFieldsComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(ApiDefinitionFieldsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('operations', operations);
    fixture.detectChanges();
  });

  it('asks for the address first, and then the operations', () => {
    expect(component.fields.map(f => f.name)).toEqual(['url']);
    const root = fixture.nativeElement.querySelector('[data-cy="apiDefinitionFields"]') as HTMLElement;
    expect(root.children[0].tagName.toLowerCase()).toBe('app-dynamic-form');
    expect(root.children[1].querySelector('app-api-operations-editor')).not.toBeNull();
  });

  it('shows the operations it is given', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-cy="apiOperationRow"]').length).toBe(1);
  });

  it('hands up the operations the seller edits', () => {
    const emitted: ApiOperation[][] = [];
    component.operationsChange.subscribe(value => emitted.push(value));

    (fixture.nativeElement.querySelector('[data-cy="apiOperationAdd"] button, button[data-cy="apiOperationAdd"], app-button[datacy="apiOperationAdd"] button') as HTMLElement).click();

    expect(emitted.length).toBe(1);
    expect(emitted[0].length).toBe(2);
  });
});
