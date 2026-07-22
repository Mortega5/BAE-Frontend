import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventMessageService } from "src/app/services/event-message.service";
import { UsageSpecsPaths } from './usage-specs.paths';

const { segments } = UsageSpecsPaths;

@Component({
  selector: 'app-usage-specs',
  standalone: true,
  imports: [
    TranslateModule,
    FontAwesomeModule,
    CommonModule,
    RouterModule,
  ],
  templateUrl: './usage-specs.component.html',
  styleUrl: './usage-specs.component.css'
})
export class UsageSpecsComponent implements OnDestroy {
  readonly paths = UsageSpecsPaths;

  private destroy$ = new Subject<void>();

  constructor(
    private eventMessage: EventMessageService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'CreateUsageSpec' && ev.value == true) {
          this.router.navigate([segments.new], { relativeTo: this.route });
        } else if (ev.type === 'UpdateUsageSpec' && ev.value) {
          this.router.navigate([(ev.value as any).id], { relativeTo: this.route });
        }
      })
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
