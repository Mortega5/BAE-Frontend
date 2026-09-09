import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-profile-general',
  templateUrl: './profile-general.component.html',
})
export class ProfileGeneralComponent implements OnInit {
  loggedAsUser: boolean = true;

  constructor(private localStorage: LocalStorageService) { }

  ngOnInit() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      this.loggedAsUser = aux.logged_as == aux.id;
    }
  }
}
