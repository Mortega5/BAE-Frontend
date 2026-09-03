import { Component, EventEmitter, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';

@Component({
  selector: 'app-plan-subtype-modal',
  standalone: true,
  templateUrl: './plan-subtype-modal.component.html',
  imports: [NgClass, TranslateModule, ButtonComponent, ContentCardComponent]
})
export class PlanSubtypeModalComponent {

  @Output() select = new EventEmitter<'standard' | 'flex'>();
  @Output() closed = new EventEmitter<void>();

  selectedType: 'standard' | 'flex' | null = null;

  pick(type: 'standard' | 'flex'): void {
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
