import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-profile-general',
  templateUrl: './profile-general.component.html',
})
export class ProfileGeneralComponent implements OnInit, OnDestroy {
  loggedAsUser: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService
  ) { }

  ngOnInit() {
    this.refreshLoggedAsUser();

    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.refreshLoggedAsUser();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refreshLoggedAsUser() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      this.loggedAsUser = aux.logged_as == aux.id;
    }
  }
}
