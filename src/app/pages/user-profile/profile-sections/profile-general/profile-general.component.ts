import { Component, OnInit } from '@angular/core';
import moment from 'moment';
import { LoginInfo } from 'src/app/models/interfaces';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-profile-general',
  templateUrl: './profile-general.component.html',
})
export class ProfileGeneralComponent implements OnInit {
  loggedAsUser: boolean = true;

  constructor(private localStorage: LocalStorageService) { }

  ngOnInit() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      this.loggedAsUser = aux.logged_as == aux.id;
    }
  }
}
