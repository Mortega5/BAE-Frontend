import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from "@ngx-translate/core";
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { LeaveConfirmable } from 'src/app/guard/unsaved-changes.guard';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { UsageSpecComponent } from 'src/app/shared/forms/usage-spec/usage-spec.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { NotFoundStateComponent } from 'src/app/shared/not-found-state/not-found-state.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';

@Component({
  selector: 'update-usage-spec',
  standalone: true,
  imports: [
    UsageSpecComponent,
    TranslateModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    NotFoundStateComponent,
    ButtonComponent,
  ],
  templateUrl: './update-usage-spec.component.html',
  styleUrl: './update-usage-spec.component.css'
})
export class UpdateUsageSpecComponent implements OnInit, LeaveConfirmable {
  @ViewChild(UsageSpecComponent) private usageSpecForm?: UsageSpecComponent;
  partyId: any = '';
  usageSpec: any;
  loading = false;

  get notFound(): boolean {
    return !this.loading && !this.usageSpec;
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private el: ElementRef,
    private localStorage: LocalStorageService,
    private usageService: UsageServiceService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  confirmLeave(): boolean | Promise<boolean> {
    return this.usageSpecForm?.confirmLeave() ?? true;
  }

  async ngOnInit() {
    this.initPartyInfo();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;
    try {
      this.usageSpec = await this.usageService.getUsageSpec(id, this.partyId);
    } catch (error) {
      console.error('Error loading usage specification', error);
    } finally {
      this.loading = false;
    }
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
