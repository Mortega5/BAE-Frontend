import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { NotificationService } from 'src/app/services/notification.service';
import { environment } from 'src/environments/environment';
import { FeaturesConfigComponent } from './features-config.component';

describe('FeaturesConfigComponent', () => {
  let fixture: ComponentFixture<FeaturesConfigComponent>;
  let component: FeaturesConfigComponent;
  let http: HttpTestingController;
  let originalQuotes: boolean;

  beforeEach(async () => {
    originalQuotes = environment.QUOTES_ENABLED;

    await TestBed.configureTestingModule({
      declarations: [FeaturesConfigComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FeaturesConfigComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.QUOTES_ENABLED = originalQuotes;
    http.verify();
  });

  it('applies the flags the proxy answers with, without fetching the config again', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${environment.BASE_URL}/config`).flush({ quotesEnabled: false });
    flushMicrotasks();

    void component.saveConfig();
    // The proxy stored quotes as enabled even if the form said otherwise: its answer wins
    http.expectOne(req => req.method === 'PATCH' && req.url === `${environment.BASE_URL}/config/features`)
      .flush({ quotesEnabled: true, purchaseEnabled: true });
    flushMicrotasks();

    expect(environment.QUOTES_ENABLED).toBeTrue();
    http.expectNone(`${environment.BASE_URL}/config`);
  }));

  describe('searching the features', () => {
    const shown = () => Array.from(fixture.nativeElement.querySelectorAll('[data-cy^="adminFeatureFlag-"]'))
      .map((el: any) => el.getAttribute('data-cy').replace('adminFeatureFlag-', ''));
    const type = (text: string | null) => {
      component.searchField.setValue(text);
      fixture.detectChanges();
    };

    beforeEach(fakeAsync(() => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', {
        ADMIN: { FEATURES: {
          _quotes_label: 'Presupuestos', _quotes_description: 'Activa los flujos de solicitud de presupuesto.',
          _purchases_label: 'Compras', _purchases_description: 'Activa el carrito de la compra.',
        } },
      });
      translate.use('en');
      fixture.detectChanges();
      http.expectOne(`${environment.BASE_URL}/config`).flush({});
      flushMicrotasks();
      fixture.detectChanges();
    }));

    it('shows every feature until something is typed', () => {
      expect(shown().length).toBe(component.definitions.length);
    });

    it('finds a feature by its name, ignoring case and accents', () => {
      type('PRESUPUESTO');
      expect(shown()).toEqual(['quotesEnabled']);
    });

    it('finds a feature by its description and by its key', () => {
      type('carrito');
      expect(shown()).toEqual(['purchaseEnabled']);
      type('purchaseEnabled');
      expect(shown()).toEqual(['purchaseEnabled']);
    });

    it('needs every word typed to be in the feature', () => {
      type('compras carrito');
      expect(shown()).toEqual(['purchaseEnabled']);
      type('compras presupuesto');
      expect(shown()).toEqual([]);
    });

    it('says so when nothing matches, and shows everything again when cleared', () => {
      type('zzz');
      expect(fixture.nativeElement.querySelector('[data-cy="adminFeaturesNoResults"]')).not.toBeNull();
      type(null);
      expect(fixture.nativeElement.querySelector('[data-cy="adminFeaturesNoResults"]')).toBeNull();
      expect(shown().length).toBe(component.definitions.length);
    });

    it('still saves every feature while the list is narrowed', fakeAsync(() => {
      type('presupuesto');
      void component.saveConfig();
      const req = http.expectOne(r => r.method === 'PATCH' && r.url === `${environment.BASE_URL}/config/features`);
      expect(Object.keys(req.request.body).sort()).toEqual(component.definitions.map(definition => definition.key).sort());
      req.flush({});
      flushMicrotasks();
    }));
  });
});
