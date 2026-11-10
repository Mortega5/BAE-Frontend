import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClipboardCheck } from '@fortawesome/pro-regular-svg-icons';
import { faEye, faPuzzlePiece, faShieldCheck } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-whatsdome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-whatsdome.component.html',
  styleUrls: ['./landing-whatsdome.component.css'],
  imports: [FontAwesomeModule, TranslateModule],
})
export class LandingWhatsDome {
  faShieldCheck = faShieldCheck;
  faEye = faEye;
  faPuzzle = faPuzzlePiece;
  faClipboard = faClipboardCheck;
}
