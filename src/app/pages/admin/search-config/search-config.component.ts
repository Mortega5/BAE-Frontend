import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { NotificationService } from 'src/app/services/notification.service';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { environment } from 'src/environments/environment';

/** Where the proxy sends marketplace searches (`keyword`) and how it builds the engine's query. */
@Component({
  selector: 'search-config',
  standalone: true,
  imports: [TranslateModule, ContentCardComponent, DynamicFormComponent, ButtonComponent, LoadingSpinnerComponent],
  templateUrl: './search-config.component.html',
})
export class SearchConfigComponent implements OnInit {
  loading = false;
  saving = false;

  readonly fields: FormField[] = [
    { type: 'string', name: 'searchUrl', label: 'ADMIN.SEARCH_CONFIG._search_url', dataCy: 'adminSearchUrl' },
    {
      type: 'boolean', name: 'useQueryKeyword', label: 'ADMIN.SEARCH_CONFIG._use_query_keyword',
      hint: 'ADMIN.SEARCH_CONFIG._use_query_keyword_hint', dataCy: 'adminSearchUseQueryKeyword'
    },
  ];
  readonly form = buildFormGroup(this.fields);

  private readonly url = `${environment.BASE_URL}/config/search`;

  constructor(private http: HttpClient, private notificationService: NotificationService) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      this.applyConfig(await firstValueFrom(this.http.get<any>(this.url)));
    } catch (error: any) {
      this.notificationService.showError('ADMIN.SEARCH_CONFIG._load_error', { details: this.errorDetail(error) });
    } finally {
      this.loading = false;
    }
  }

  async save(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try {
      const payload = {
        searchUrl: (this.form.value.searchUrl ?? '').trim(),
        useQueryKeyword: this.form.value.useQueryKeyword === true,
      };
      await firstValueFrom(this.http.patch<any>(this.url, payload));
      this.applyConfig(await firstValueFrom(this.http.get<any>(this.url)));
      this.notificationService.showSuccess('ADMIN.SEARCH_CONFIG._save_success');
    } catch (error: any) {
      this.notificationService.showError('ADMIN.SEARCH_CONFIG._save_error', { details: this.errorDetail(error) });
    } finally {
      this.saving = false;
    }
  }

  /** The proxy has returned the settings both flat and nested under `search`. */
  private applyConfig(config: any): void {
    const search = config?.search && typeof config.search === 'object' ? config.search : config;
    const url = search?.searchUrl ?? search?.url;
    this.form.reset({
      searchUrl: typeof url === 'string' ? url.trim() : '',
      useQueryKeyword: search?.useQueryKeyword === true,
    });
  }

  private errorDetail(error: any): string | undefined {
    return error?.error?.error || error?.error?.message || error?.message || undefined;
  }
}
