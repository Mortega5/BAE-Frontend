import { ChangeDetectorRef, Component, ElementRef, OnInit } from '@angular/core';
import { ReactiveFormsModule } from "@angular/forms";
import { Router } from '@angular/router';
import { TranslateModule } from "@ngx-translate/core";
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UsageSpecComponent } from 'src/app/shared/forms/usage-spec/usage-spec.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';

@Component({
  selector: 'create-usage-spec',
  standalone: true,
  imports: [
    UsageSpecComponent,
    TranslateModule,
    ReactiveFormsModule,
    ButtonComponent],
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
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  goBack() {
    this.router.navigate([SellerOfferingsPaths.usageSpecs.list()]);
  }

}
