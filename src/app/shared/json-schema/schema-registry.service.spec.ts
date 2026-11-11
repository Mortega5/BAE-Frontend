import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SchemaRegistryService } from './schema-registry.service';
import { BLUEPRINT_PRODUCT_SPEC_V1, BLUEPRINT_PRODUCT_SPEC_V1_URL, DEPLOYMENT_DEFINITION_V1, DEPLOYMENT_DEFINITION_V1_URL } from './testing/model-fixtures';

describe('SchemaRegistryService', () => {
  let service: SchemaRegistryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(SchemaRegistryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches and compiles a schema once per URL', () => {
    const results: string[] = [];
    service.get(DEPLOYMENT_DEFINITION_V1_URL).subscribe(s => results.push(s.url));
    service.get(DEPLOYMENT_DEFINITION_V1_URL).subscribe(s => results.push(s.url));
    http.expectOne(DEPLOYMENT_DEFINITION_V1_URL).flush(DEPLOYMENT_DEFINITION_V1);
    service.get(DEPLOYMENT_DEFINITION_V1_URL).subscribe(s => results.push(s.url));
    expect(results.length).toBe(3);
  });

  it('fetches again after a failure', () => {
    let failed = false;
    service.get(DEPLOYMENT_DEFINITION_V1_URL).subscribe({ error: () => (failed = true) });
    http.expectOne(DEPLOYMENT_DEFINITION_V1_URL).flush('down', { status: 503, statusText: 'Unavailable' });
    expect(failed).toBeTrue();

    let loaded = false;
    service.get(DEPLOYMENT_DEFINITION_V1_URL).subscribe(() => (loaded = true));
    http.expectOne(DEPLOYMENT_DEFINITION_V1_URL).flush(DEPLOYMENT_DEFINITION_V1);
    expect(loaded).toBeTrue();
  });

  it('reports only the errors of the branch being filled in', () => {
    const { validate } = service.compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1);
    const errors = validate({ type: 'helm', version: '1.0', properties: { repository: 'not a url', chart: 'x', version: '1' } });
    expect(errors).toEqual([{ path: '/properties/repository', message: 'must match format "uri"' }]);
  });

  it('reports a missing property at that property', () => {
    const { validate } = service.compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1);
    const errors = validate({ type: 'helm', version: '1.0', properties: {} });
    expect(errors).toContain({ path: '/properties/chart', message: 'is required' });
  });

  describe('a discriminator that is not set yet', () => {
    const opennebula = (properties: object) => ({ type: 'opennebula', version: '1.0', properties });

    it('asks only for the discriminator, not for what every branch would need', () => {
      const { validate } = service.compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1);
      expect(validate(opennebula({ flavour: 'standalone', workerFlavour: 'small' })))
        .toEqual([{ path: '/properties/backend', message: 'is required' }]);
    });

    it('asks for what the chosen branch needs once it is set', () => {
      const { validate } = service.compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1);
      expect(validate(opennebula({ backend: 'vm' }))).toEqual([{ path: '/properties/templateId', message: 'is required' }]);
    });

    it('rejects a field the chosen branch forbids', () => {
      const { validate } = service.compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1);
      expect(validate(opennebula({ backend: 'vm', templateId: 1, flavour: 'ha' })))
        .toEqual([{ path: '/properties/flavour', message: 'is not allowed here' }]);
    });
  });

  it('validates a Blueprint orchestration plan', () => {
    const { validate } = service.compile(BLUEPRINT_PRODUCT_SPEC_V1_URL, BLUEPRINT_PRODUCT_SPEC_V1);
    const step = { id: 'step-web', componentProductSpec: 'urn:ngsi-ld:product-specification:1', dependsOn: [] };
    expect(validate({ orchestrationPlan: { steps: [step] } })).toEqual([]);
    expect(validate({ orchestrationPlan: { steps: [{ ...step, id: 'Step Web' }] } }).length).toBeGreaterThan(0);
    expect(validate({ orchestrationPlan: { steps: [{ ...step, timeoutSeconds: '30' }] } }).length).toBeGreaterThan(0);
  });
});
