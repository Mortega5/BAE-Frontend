import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { SideNavComponent } from 'src/app/shared/side-nav/side-nav.component';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { UsageSpecsPaths } from './usage-specs.paths';

@Component({
  selector: 'app-usage-specs',
  standalone: true,
  imports: [
    TranslateModule,
    FontAwesomeModule,
    CommonModule,
    RouterModule,
    SideNavComponent,
    ContentCardComponent,
  ],
  templateUrl: './usage-specs.component.html',
  styleUrl: './usage-specs.component.css'
})
export class UsageSpecsComponent {

  readonly paths = UsageSpecsPaths;

  readonly sections: SideNavSection[] = [
    { items: [{ label: 'USAGE_SPECS._list', routerLink: this.paths.list(), exact: true }] },
  ];
}
