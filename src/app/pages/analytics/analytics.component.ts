import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { SideNavComponent } from 'src/app/shared/side-nav/side-nav.component';
import { SideNavItem, SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { environment } from 'src/environments/environment';
import { AnalyticsPaths } from './analytics.paths';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [TranslateModule, CommonModule, RouterModule, SideNavComponent, ContentCardComponent],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent {
  readonly paths = AnalyticsPaths;

  constructor(private localStorage: LocalStorageService) {}

  get sections(): SideNavSection[] {
    const items: SideNavItem[] = [
      { label: 'ANALYTICS._business_insights', routerLink: this.paths.businessInsights(), icon: 'chart-line' as IconName, dataCy: 'analyticsBusinessInsights' },
    ];

    if (this.isAdmin) {
      items.push({ label: 'ANALYTICS._usage_monitor', routerLink: this.paths.usageMonitor(), icon: 'display-chart-up' as IconName, dataCy: 'analyticsUsageMonitor' });
    }

    return [{ items }];
  }

  get isAdmin(): boolean {
    const loginInfo = this.localStorage.getObject('login_items') as any;
    if (!loginInfo || JSON.stringify(loginInfo) === '{}') {
      return false;
    }

    const adminRole = environment.ADMIN_ROLE?.toLowerCase();
    const userRoles = (loginInfo.roles ?? []).map((role: any) => role.name?.toLowerCase());
    const loggedOrganization = (loginInfo.organizations ?? []).find((organization: any) => organization.id === loginInfo.logged_as);
    const organizationRoles = (loggedOrganization?.roles ?? []).map((role: any) => role.name?.toLowerCase());

    return userRoles.includes(adminRole) || organizationRoles.includes(adminRole);
  }
}
