import { NgClass, NgTemplateOutlet } from '@angular/common';
import {
  AfterContentInit,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  Output,
  QueryList,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { StepperStepDirective } from './stepper-step.directive';

export interface StepChangedEvent {
  step: number;
  isLastStep: boolean;
  label: string;
  stepId?: string;
}

@Component({
  selector: 'app-stepper',
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.css',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, TranslateModule, LoadingSpinnerComponent, ButtonComponent, ContentCardComponent],
})
export class StepperComponent implements AfterContentInit {
  /** If true, all steps are accessible from the start (e.g. edit mode). */
  @Input() allUnlocked = false;
  /** Whether the current step passes validation and the Next button should be enabled. */
  @Input() canAdvance = false;
  @Input() previousLabel = 'CREATE_OFFER._previous';
  @Input() nextLabel = 'CREATE_OFFER._next_step';
  @Input() submitLabel = 'Submit';
  @Input() submitDisabled = false;
  @Input() submitAlwaysVisible = false;
  @Input() loading = false;
  /** Step index to open on, e.g. resuming an edit past steps already saved. Earlier steps count as visited. */
  @Input() startAt = 0;
  /** Runs before moving forward one step (Next, or clicking the next step). Return false to stay,
   * e.g. when the step saves to the server and that failed. Navigation is disabled while it runs. */
  @Input() beforeNext?: (stepId: string | undefined) => boolean | Promise<boolean>;

  @Output() stepChanged = new EventEmitter<StepChangedEvent>();
  @Output() submitted = new EventEmitter<void>();

  @ContentChildren(StepperStepDirective) stepTemplates!: QueryList<StepperStepDirective>;

  currentStep = 0;
  highestStep = 0;
  /** Toggled off/on around each step change to (re)trigger the entrance animation. */
  animateContent = true;
  /** True while beforeNext is running. */
  advancing = false;

  ngAfterContentInit(): void {
    if (this.startAt > 0) {
      this._goToStep(Math.min(this.startAt, this.stepTemplates.length - 1));
    }
  }

  get isLastStep(): boolean {
    return this.currentStep === (this.stepTemplates?.length ?? 1) - 1;
  }

  get currentTemplate() {
    return this.stepTemplates?.get(this.currentStep)?.templateRef ?? null;
  }

  canNavigate(index: number): boolean {
    return this.allUnlocked || index <= this.currentStep || index <= this.highestStep;
  }

  handleStepClick(index: number): void {
    if (!this.canNavigate(index) || this.advancing) return;
    if (index > this.currentStep) {
      if (!this.canAdvance) return;
      // With a beforeNext hook, forward moves go one step at a time so no step skips its own save
      if (this.beforeNext) {
        if (index === this.currentStep + 1) void this.goNext();
        return;
      }
    }
    this._goToStep(index);
  }

  goBack(): void {
    if (this.currentStep > 0 && !this.advancing) this._goToStep(this.currentStep - 1);
  }

  async goNext(): Promise<void> {
    if (this.isLastStep || !this.canAdvance || this.advancing) return;
    if (this.beforeNext) {
      this.advancing = true;
      let proceed = false;
      try {
        proceed = await this.beforeNext(this.stepTemplates.get(this.currentStep)?.stepId);
      } finally {
        this.advancing = false;
      }
      if (!proceed) return;
    }
    this._goToStep(this.currentStep + 1);
  }

  private _goToStep(index: number): void {
    this.currentStep = index;
    if (this.currentStep > this.highestStep) {
      this.highestStep = this.currentStep;
    }
    const directive = this.stepTemplates.get(index);
    this.stepChanged.emit({
      step: this.currentStep,
      isLastStep: this.isLastStep,
      label: directive?.stepperStep ?? '',
      stepId: directive?.stepId,
    });
    this.replayContentAnimation();
  }

  private replayContentAnimation(): void {
    this.animateContent = false;
    requestAnimationFrame(() => {
      this.animateContent = true;
    });
  }
}
