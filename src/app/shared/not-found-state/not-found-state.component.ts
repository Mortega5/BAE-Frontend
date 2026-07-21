import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-not-found-state',
  standalone: true,
  templateUrl: './not-found-state.component.html',
})
export class NotFoundStateComponent {
  @Input() message = 'The requested item could not be found.';
  @Input() backLabel = 'Back to list';
  @Output() back = new EventEmitter<void>();
}
