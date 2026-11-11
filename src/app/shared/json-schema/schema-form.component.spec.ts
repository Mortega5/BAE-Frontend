import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DEPLOYMENT_DEFINITION_OVERLAY } from './overlays/deployment-definition.ui';
import { SchemaFormComponent } from './schema-form.component';
import { SchemaFormGroup } from './schema-form-group';
import { DEPLOYMENT_DEFINITION_V1, DEPLOYMENT_DEFINITION_V1_URL, MODEL_DEPLOYMENT_DEFINITIONS } from './testing/model-fixtures';

describe('SchemaFormComponent', () => {
  let fixture: ComponentFixture<SchemaFormComponent>;
  let http: HttpTestingController;
  let ready: SchemaFormGroup | undefined;

  const render = (initialValue?: any) => {
    fixture = TestBed.createComponent(SchemaFormComponent);
    fixture.componentInstance.schemaUrl = DEPLOYMENT_DEFINITION_V1_URL;
    fixture.componentInstance.overlay = DEPLOYMENT_DEFINITION_OVERLAY;
    fixture.componentInstance.initialValue = initialValue;
    fixture.componentInstance.formReady.subscribe(f => (ready = f));
    fixture.componentInstance.ngOnChanges({ schemaUrl: {} as any });
    fixture.detectChanges();
  };
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    ready = undefined;
    TestBed.configureTestingModule({
      imports: [SchemaFormComponent, HttpClientTestingModule, TranslateModule.forRoot()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('renders the fields of the selected branch once the schema loads', () => {
    render(MODEL_DEPLOYMENT_DEFINITIONS['opennebula/lxc-sw-support-pkg.json']);
    expect(text()).toContain('SCHEMA_FORM._loading');

    http.expectOne(DEPLOYMENT_DEFINITION_V1_URL).flush(DEPLOYMENT_DEFINITION_V1);
    fixture.detectChanges();

    expect(ready).toBeDefined();
    expect(text()).toContain('VM template');
    expect(text()).toContain('Health check');
    expect(text()).not.toContain('Kubernetes version');
  });

  it('offers a retry when the schema cannot be fetched', () => {
    render();
    http.expectOne(DEPLOYMENT_DEFINITION_V1_URL).flush('down', { status: 502, statusText: 'Bad Gateway' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-cy="schemaLoadError"]')).toBeTruthy();
    expect(ready).toBeUndefined();

    fixture.componentInstance.load();
    http.expectOne(DEPLOYMENT_DEFINITION_V1_URL).flush(DEPLOYMENT_DEFINITION_V1);
    fixture.detectChanges();
    expect(ready).toBeDefined();
    expect(fixture.nativeElement.querySelector('[data-cy="schemaLoadError"]')).toBeNull();
  });

  it('lists each error under the label of its field', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { 'SCHEMA_FORM._issue_required': 'is required' });
    translate.use('en');
    render({ type: 'opennebula', version: '1.0', properties: {} });
    http.expectOne(DEPLOYMENT_DEFINITION_V1_URL).flush(DEPLOYMENT_DEFINITION_V1);
    ready!.markAsDirty();
    fixture.detectChanges();

    const list = (fixture.nativeElement as HTMLElement).querySelector('[data-cy="schemaErrors"]')!;
    expect(list.textContent).toContain('Backend');
    expect(list.textContent).toContain('is required');
    expect(list.textContent).not.toContain('/properties');
    expect(list.querySelectorAll('li').length).toBe(1);
  });

  it('takes the user to the field when its label in the error list is clicked', () => {
    render({ type: 'opennebula', version: '1.0', properties: {} });
    http.expectOne(DEPLOYMENT_DEFINITION_V1_URL).flush(DEPLOYMENT_DEFINITION_V1);
    ready!.markAsDirty();
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-cy="schemaErrors"] button')!;
    link.click();

    const focused = document.activeElement as HTMLElement;
    expect(focused.id).toBe('backend');
    // `version` also exists at the root: the link must lead to the one inside `properties`.
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-schema-pointer="/properties"]')!.contains(focused)).toBeTrue();
  });
});
