import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventMessageService } from "../../services/event-message.service";
import { AdminPaths } from './admin.paths';

const { segments } = AdminPaths;

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnDestroy {
  readonly paths = AdminPaths;

  private destroy$ = new Subject<void>();

  constructor(
    private eventMessage: EventMessageService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'CreateCategory' && ev.value == true) {
          this.router.navigate([segments.categories, segments.new], { relativeTo: this.route });
        }
        if (ev.type === 'UpdateCategory') {
          this.router.navigate([segments.categories, (ev.value as any).id], { relativeTo: this.route });
        }
      })
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
