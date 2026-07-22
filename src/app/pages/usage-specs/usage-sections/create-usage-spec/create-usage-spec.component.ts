import { ChangeDetectorRef, Component, ElementRef, OnInit } from '@angular/core';
import { ReactiveFormsModule } from "@angular/forms";
import { Router } from '@angular/router';
import { TranslateModule } from "@ngx-translate/core";
import moment from 'moment';
import { LoginInfo } from 'src/app/models/interfaces';
import { UsageSpecsPaths } from 'src/app/pages/usage-specs/usage-specs.paths';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UsageSpecComponent } from 'src/app/shared/forms/usage-spec/usage-spec.component';

@Component({
  selector: 'create-usage-spec',
  standalone: true,
  imports: [
    UsageSpecComponent,
    TranslateModule,
    ReactiveFormsModule],
  templateUrl: './create-usage-spec.component.html',
  styleUrl: './create-usage-spec.component.css'
})

export class CreateUsageSpecComponent implements OnInit {
  partyId: any = '';

  constructor(
    private cdr: ChangeDetectorRef,
    private el: ElementRef,
    private localStorage: LocalStorageService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.initPartyInfo();
  }

  initPartyInfo() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  goBack() {
    this.router.navigate([UsageSpecsPaths.list()]);
  }

}
