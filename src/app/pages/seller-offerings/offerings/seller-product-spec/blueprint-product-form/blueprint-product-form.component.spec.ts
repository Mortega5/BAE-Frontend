import { HttpClient } from '@angular/common/http';
import { SchemaRegistryService } from 'src/app/shared/json-schema/schema-registry.service';
import { BLUEPRINT_PRODUCT_SPEC_V1, BLUEPRINT_PRODUCT_SPEC_V1_URL } from 'src/app/shared/json-schema/testing/model-fixtures';
import { BlueprintProductFormComponent } from './blueprint-product-form.component';

describe('BlueprintProductFormComponent step form', () => {
  let component: any;

  beforeEach(() => {
    const schema = new SchemaRegistryService({} as HttpClient).compile(BLUEPRINT_PRODUCT_SPEC_V1_URL, BLUEPRINT_PRODUCT_SPEC_V1);
    component = new BlueprintProductFormComponent({} as any, {} as any, {} as any);
    component.blueprintSchema = schema;
    component.showStepForm = true;
    component.stepForm.patchValue({ componentProductSpec: { id: 'urn:ngsi-ld:product-specification:1', name: 'Web' } });
  });

  it('takes the timeout a new step starts with from the schema', () => {
    expect(component.defaultTimeoutSeconds).toBe(600);
    component.resetStepForm();
    expect(component.stepForm.value.timeoutSeconds).toBe(600);
  });

  it('shows what the schema says about the step as it is written', () => {
    component.stepForm.patchValue({ id: 'step-web', timeoutSeconds: 0 });
    component.validateStepForm();
    expect(component.stepIssues.map((i: any) => i.path)).toEqual(['/orchestrationPlan/steps/0/timeoutSeconds']);
    expect(component.stepIssues[0].label).toBe('BLUEPRINT_PROD._step_timeout');
  });

  it('accepts an empty timeout: the step is sent without it', () => {
    component.stepForm.patchValue({ id: 'step-web', timeoutSeconds: null });
    component.validateStepForm();
    expect(component.stepIssues).toEqual([]);
    expect('timeoutSeconds' in component.stepFromForm()).toBeFalse();
  });

  it('does not ask for the id or the component while they are not filled in', () => {
    component.stepForm.patchValue({ id: '', componentProductSpec: null });
    component.validateStepForm();
    expect(component.stepIssues).toEqual([]);
  });

  it('keeps quiet until the schema is loaded', () => {
    component.blueprintSchema = undefined;
    component.stepForm.patchValue({ id: 'step-web', timeoutSeconds: 0 });
    component.validateStepForm();
    expect(component.stepIssues).toEqual([]);
  });
});
