import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UserProfilePaths } from './user-profile.paths';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent implements AfterViewInit {
  readonly paths = UserProfilePaths;

  constructor(private http: HttpClient) { }

  ngAfterViewInit() {
    initFlowbite();
  }

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
