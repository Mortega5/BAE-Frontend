import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { environment } from 'src/environments/environment';
import { UserProfilePaths } from './user-profile.paths';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent {
  readonly paths = UserProfilePaths;

  readonly sections: SideNavSection[] = [
    {
      items: [
        { label: 'PROFILE._general', routerLink: this.paths.general(), dataCy: 'generalSection' },
        { label: 'PROFILE._bill', routerLink: this.paths.billing(), dataCy: 'billingSection' },
        { label: 'PROFILE._revenue', routerLink: this.paths.revenue(), dataCy: 'revenueSection' },
        { label: 'PROFILE._payment_dashboard', onClick: () => this.getPayment(), dataCy: 'paymentDashboard' },
        { label: 'PROFILE._lear_link', onClick: () => this.getLear(), dataCy: 'learLink' },
      ],
    },
  ];

  constructor(private http: HttpClient) { }

  getPayment() {
    const paymentInfoUrl = `${environment.BASE_URL}/paymentInfo`;

    lastValueFrom(this.http.get<any>(paymentInfoUrl)).then(data => {
      window.open(data.providerUrl, '_blank');
    }).catch(() => {
    });
  }

  getLear() {
    const url = `${environment.LEAR_URL}`;
    window.open(url, '_blank');
  }
}
