import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

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
});
