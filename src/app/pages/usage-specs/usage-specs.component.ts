import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { UsageSpecsPaths } from './usage-specs.paths';

@Component({
  selector: 'app-usage-specs',
  standalone: true,
  imports: [
    TranslateModule,
    FontAwesomeModule,
    CommonModule,
    RouterModule,
  ],
  templateUrl: './usage-specs.component.html',
  styleUrl: './usage-specs.component.css'
})
export class UsageSpecsComponent {

  readonly paths = UsageSpecsPaths;
}
