import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  Output,
  QueryList,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { StepperStepDirective } from './stepper-step.directive';

export interface StepChangedEvent {
  step: number;
  isLastStep: boolean;
}

@Component({
  selector: 'app-stepper',
  templateUrl: './stepper.component.html',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, TranslateModule],
})
export class StepperComponent {
  @Input() steps: string[] = [];
  /** If true, all steps are accessible from the start (e.g. edit mode). */
  @Input() allUnlocked = false;
  /** Whether the current step passes validation and the Next button should be enabled. */
  @Input() canAdvance = false;
  @Input() previousLabel = 'CREATE_OFFER._previous';
  @Input() nextLabel = 'CREATE_OFFER._next_step';
  @Input() submitLabel = 'Submit';
  @Input() submitDisabled = false;

  @Output() stepChanged = new EventEmitter<StepChangedEvent>();
  @Output() submitted = new EventEmitter<void>();

  @ContentChildren(StepperStepDirective) stepTemplates!: QueryList<StepperStepDirective>;

  currentStep = 0;
  private _highestReached = 0;

  get isLastStep(): boolean {
    return this.currentStep === this.steps.length - 1;
  }

  get currentTemplate() {
    return this.stepTemplates?.get(this.currentStep)?.templateRef ?? null;
  }

  canNavigate(index: number): boolean {
    return this.allUnlocked || index <= this.currentStep || index <= this._highestReached;
  }

  handleStepClick(index: number): void {
    if (!this.canNavigate(index)) return;
    if (index > this.currentStep && !this.canAdvance) return;
    this._goToStep(index);
  }

  goBack(): void {
    if (this.currentStep > 0) this._goToStep(this.currentStep - 1);
  }

  goNext(): void {
    if (!this.isLastStep && this.canAdvance) this._goToStep(this.currentStep + 1);
  }

  private _goToStep(index: number): void {
    this.currentStep = index;
    if (this.currentStep > this._highestReached) {
      this._highestReached = this.currentStep;
    }
    this.stepChanged.emit({ step: this.currentStep, isLastStep: this.isLastStep });
  }
}
