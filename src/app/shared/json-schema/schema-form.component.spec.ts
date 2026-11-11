import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
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
});
