import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[stepperStep]',
  standalone: true,
})
export class StepperStepDirective {
  @Input() stepperStep: string = '';
  @Input() stepId: string = '';
  constructor(public templateRef: TemplateRef<void>) {}
}
