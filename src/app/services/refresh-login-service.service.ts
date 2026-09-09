import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import moment from 'moment';
import { Subscription, timer } from 'rxjs';
import { LoginServiceService } from 'src/app/services/login-service.service';
import { LoginInfo } from '../models/interfaces';
import { EventMessageService } from './event-message.service';
import { LocalStorageService } from "./local-storage.service";
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class RefreshLoginServiceService {
  private intervalSubscription: Subscription | undefined;

  constructor(
    private localStorage: LocalStorageService,
    private api: LoginServiceService,
    private router: Router,
    private eventMessage: EventMessageService,
    private notificationService: NotificationService
  ) { }

  startInterval(intervalDuration: number, data: any): void {
    // Always cancel whatever was scheduled before, regardless of what the
    // caller already did — makes concurrent/overlapping calls (e.g. a
    // LoginProcess reaction racing this service's own reschedule) safe
    // instead of leaking the previous timer.
    this.stopInterval();

    // A stale stored expiry (clock skew, long-idle reload) can yield a
    // non-positive duration; refresh right away instead of scheduling a
    // timer that would fire immediately anyway, just less directly.
    const delay = Math.max(intervalDuration, 0);
    console.debug(`Refresh token in ${delay}ms`)

    this.intervalSubscription = timer(delay).subscribe(() => {
      let aux = this.localStorage.getObject('login_items') as LoginInfo;
      this.api.getLogin(aux['token']).then(refreshed => {
        console.debug("Token refreshed", refreshed);
        console.log(`Expire: ${new Date(refreshed.expire * 1000)}`,)

        const info = {
          "id": refreshed.id,
          "user": refreshed.username,
          "email": refreshed.email,
          "token": refreshed.accessToken,
          "expire": refreshed.expire,
          "partyId": aux['partyId'],
          "roles": refreshed.roles,
          "organizations": aux['organizations'],
          "logged_as": aux['logged_as']
        } as LoginInfo;
        this.localStorage.setObject('login_items', info);

        // Start the interval only if the token has been really refreshed
        // Otherwise close the session
        const now = moment().unix();
        if (refreshed.expire > now + 4) {
          this.startInterval(((refreshed.expire - now) - 4) * 1000, refreshed)
          // Let components caching login state in memory (e.g. the header)
          // know it was silently refreshed, not just persisted to storage.
          this.eventMessage.emitLogin(info);
        } else {
          this.logout();
        }
      }).catch(error => {
        console.error('Error refreshing token', error);
        this.logout();
      })
    });
  }

  stopInterval(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }

  private logout(): void {
    this.stopInterval();
    // Only logout if user is logged
    const aux = this.localStorage.getObject('login_items') as any;
    if (aux && Object.keys(aux).length > 0) {
      this.localStorage.setObject('login_items', {});
      this.eventMessage.emitLogin({} as LoginInfo);
      this.api.logout()
        .catch((err) => {
          console.error('Error during logout:', err);
        })

      this.router.navigate(['/dashboard']).then(() => {
        this.notificationService.showInfo('Your session has expired. Please log in again.');
      })
    }
  }
}
