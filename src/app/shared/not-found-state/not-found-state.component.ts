import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from 'src/app/shared/button/button.component';

@Component({
  selector: 'app-not-found-state',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './not-found-state.component.html',
})
export class NotFoundStateComponent {
  @Input() message = 'The requested item could not be found.';
  @Input() backLabel = 'Back to list';
  @Output() back = new EventEmitter<void>();
}
