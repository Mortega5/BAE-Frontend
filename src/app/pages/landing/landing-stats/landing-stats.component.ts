import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ILandingStats } from '../landing.component';

@Component({
  selector: 'app-landing-stats',
  standalone: true,
  templateUrl: './landing-stats.component.html',
  styleUrl: './landing-stats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule]
})
export class LandingStatsComponent {
  stats = input.required<ILandingStats>();

  constructor() { }

}
