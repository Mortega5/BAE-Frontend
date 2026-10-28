import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ModalComponent } from 'src/app/shared/modal/modal.component';

@Component({
  selector: 'app-plan-subtype-modal',
  standalone: true,
  templateUrl: './plan-subtype-modal.component.html',
  imports: [TranslateModule, ButtonComponent, ModalComponent]
})
export class PlanSubtypeModalComponent {

  /** Standard plans price a configuration profile, so they need a product spec with configuration options. */
  @Input() standardAvailable = true;
  @Output() select = new EventEmitter<'standard' | 'flex'>();
  @Output() closed = new EventEmitter<void>();

  selectedType: 'standard' | 'flex' | null = null;

  pick(type: 'standard' | 'flex'): void {
    if (type === 'standard' && !this.standardAvailable) return;
    this.selectedType = type;
  }

  confirm(): void {
    if (!this.selectedType) return;
    this.select.emit(this.selectedType);
  }

  cancel(): void {
    this.closed.emit();
  }
}
