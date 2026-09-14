import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from 'src/app/shared/button/button.component';

@Component({
  selector: 'app-not-found-state',
  standalone: true,
  imports: [ButtonComponent, TranslateModule],
  templateUrl: './not-found-state.component.html',
})
export class NotFoundStateComponent {
  @Input() message = 'COMMON._not_found_default';
  @Input() backLabel = 'COMMON._back_to_list';
  @Output() back = new EventEmitter<void>();
}
