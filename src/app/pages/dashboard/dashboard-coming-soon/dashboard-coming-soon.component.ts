import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Placeholder for a workspace section that is not built yet. The route data gives it a `title` and `subtitle` (i18n keys). */
@Component({
  selector: 'app-dashboard-coming-soon',
  templateUrl: './dashboard-coming-soon.component.html',
})
export class DashboardComingSoonComponent {
  readonly title: string = this.route.snapshot.data['title'];
  readonly subtitle: string = this.route.snapshot.data['subtitle'];

  constructor(private route: ActivatedRoute) {}
}
