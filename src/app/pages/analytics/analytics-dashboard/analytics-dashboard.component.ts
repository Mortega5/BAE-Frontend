import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { embedDashboard, type EmbeddedDashboard } from '@superset-ui/embedded-sdk';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

type AnalyticsTabKey = 'businessInsights' | 'usageMonitor';

interface AnalyticsTabConfig {
  label: string;
  description: string;
}

const TAB_CONFIG: Record<AnalyticsTabKey, AnalyticsTabConfig> = {
  businessInsights: {
    label: 'ANALYTICS._business_insights',
    description: 'ANALYTICS._business_insights_desc',
  },
  usageMonitor: {
    label: 'ANALYTICS._usage_monitor',
    description: 'ANALYTICS._usage_monitor_desc',
  },
};

/** One tab's worth of content from the old analytics.component — the tab bar
 * itself is gone, replaced by app-side-nav items that route here (see
 * analytics.routes.ts); this component only knows how to embed the dashboard
 * for whichever tab its route data says it is. */
@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './analytics-dashboard.component.html',
  styleUrl: './analytics-dashboard.component.css'
})
export class AnalyticsDashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('supersetMount') supersetMount?: ElementRef<HTMLElement>;

  readonly tab: AnalyticsTabKey = (this.route.snapshot.data['tab'] as AnalyticsTabKey) ?? 'businessInsights';
  readonly tabConfig: AnalyticsTabConfig = TAB_CONFIG[this.tab];

  loading = false;
  errorMessage = '';
  statusMessage = '';

  private embeddedDashboard: EmbeddedDashboard | null = null;
  private embedSequence = 0;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
  ) {}

  ngAfterViewInit(): void {
    void this.embedSelectedDashboard();
  }

  ngOnDestroy(): void {
    this.unmountDashboard();
  }

  get supersetDomain(): string {
    return environment.analytics ?? '';
  }

  get analyticsEnabled(): boolean {
    return environment.analyticsEnabled;
  }

  get hasDashboardConfig(): boolean {
    return this.analyticsEnabled && Boolean(this.supersetDomain);
  }

  private async embedSelectedDashboard(): Promise<void> {
    const sequence = ++this.embedSequence;
    const mountPoint = this.supersetMount?.nativeElement;

    this.unmountDashboard();
    this.errorMessage = '';

    if (!mountPoint) {
      return;
    }

    mountPoint.innerHTML = '';

    if (!this.analyticsEnabled) {
      this.loading = false;
      this.statusMessage = 'Analytics is disabled.';
      return;
    }

    if (!this.supersetDomain) {
      this.loading = false;
      this.statusMessage = 'Dashboard configuration is missing.';
      return;
    }

    this.loading = true;
    this.statusMessage = 'Loading dashboard...';

    try {
      const guestToken = await this.fetchGuestToken(this.tab);

      if (sequence !== this.embedSequence) {
        return;
      }

      const embeddedDashboard = await embedDashboard({
        id: guestToken.dashboardId,
        supersetDomain: this.supersetDomain,
        mountPoint,
        fetchGuestToken: () => Promise.resolve(guestToken.token),
        dashboardUiConfig: {
          hideTitle: false,
          hideTab: false,
          hideChartControls: true,
          filters: {
            expanded: true,
            visible: true
          },
          urlParams: {}
        },
        iframeSandboxExtras: [
          'allow-top-navigation',
          'allow-popups-to-escape-sandbox'
        ],
        referrerPolicy: '*' as ReferrerPolicy
      });

      if (sequence !== this.embedSequence) {
        embeddedDashboard.unmount();
        return;
      }

      this.embeddedDashboard = embeddedDashboard;
      this.statusMessage = '';
    } catch (error) {
      console.error('Failed to embed Superset dashboard', error);
      if (sequence === this.embedSequence) {
        this.errorMessage = 'Unable to load dashboard.';
        this.statusMessage = '';
      }
    } finally {
      if (sequence === this.embedSequence) {
        this.loading = false;
      }
    }
  }

  private async fetchGuestToken(tab: AnalyticsTabKey): Promise<{ dashboardId: string; token: string }> {
    const endpoint = this.resolveBackendUrl(environment.analyticsGuestTokenEndpoint);
    const response = await firstValueFrom(this.http.post<any>(endpoint, { tab }));
    const dashboardId = response?.dashboardId ?? response?.dashboard_id ?? response?.id ?? '';
    const token = this.extractGuestToken(response);

    if (!dashboardId) {
      throw new Error('Guest token endpoint did not return a dashboard id.');
    }
    if (!token) {
      throw new Error('Guest token endpoint did not return a token.');
    }

    return { dashboardId, token };
  }

  private extractGuestToken(response: any): string {
    if (typeof response === 'string') {
      return response;
    }

    return response?.token
      ?? response?.guestToken
      ?? response?.guest_token
      ?? '';
  }

  private resolveBackendUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${environment.BASE_URL}${normalizedEndpoint}`;
  }

  private unmountDashboard(): void {
    this.embeddedDashboard?.unmount();
    this.embeddedDashboard = null;
  }
}
