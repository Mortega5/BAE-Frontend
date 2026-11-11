import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from 'src/app/services/notification.service';
import { environment } from 'src/environments/environment';

import { SearchConfigComponent } from './search-config.component';

describe('SearchConfigComponent', () => {
  let component: SearchConfigComponent;
  let httpMock: HttpTestingController;
  let notifications: jasmine.SpyObj<NotificationService>;
  const url = `${environment.BASE_URL}/config/search`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['showSuccess', 'showError']);
    component = new SearchConfigComponent(TestBed.inject(HttpClient), notifications);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the config, flat or nested under search', async () => {
    const promise = component.load();
    httpMock.expectOne(url).flush({ search: { url: ' http://engine ', useQueryKeyword: true } });
    await promise;

    expect(component.form.value).toEqual({ searchUrl: 'http://engine', useQueryKeyword: true });
    expect(component.loading).toBeFalse();
  });

  it('saves the trimmed url and flag, then reloads', async () => {
    component.form.setValue({ searchUrl: ' http://new ', useQueryKeyword: true });

    const promise = component.save();
    const patch = httpMock.expectOne(req => req.method === 'PATCH' && req.url === url);
    expect(patch.request.body).toEqual({ searchUrl: 'http://new', useQueryKeyword: true });
    patch.flush({});
    await Promise.resolve();
    httpMock.expectOne(req => req.method === 'GET' && req.url === url).flush({ searchUrl: 'http://new', useQueryKeyword: true });
    await promise;

    expect(notifications.showSuccess).toHaveBeenCalledWith('ADMIN.SEARCH_CONFIG._save_success');
    expect(component.saving).toBeFalse();
  });

  it('reports a load error', async () => {
    const promise = component.load();
    httpMock.expectOne(url).flush({ error: 'nope' }, { status: 403, statusText: 'Forbidden' });
    await promise;

    expect(notifications.showError).toHaveBeenCalledWith('ADMIN.SEARCH_CONFIG._load_error', { details: 'nope' });
  });
});
