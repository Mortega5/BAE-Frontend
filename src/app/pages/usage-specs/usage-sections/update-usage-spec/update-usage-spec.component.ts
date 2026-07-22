import { ChangeDetectorRef, Component, ElementRef, OnInit } from '@angular/core';
import { ReactiveFormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from "@ngx-translate/core";
import moment from 'moment';
import { LoginInfo } from 'src/app/models/interfaces';
import { UsageSpecsPaths } from 'src/app/pages/usage-specs/usage-specs.paths';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { UsageSpecComponent } from 'src/app/shared/forms/usage-spec/usage-spec.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { NotFoundStateComponent } from 'src/app/shared/not-found-state/not-found-state.component';

@Component({
  selector: 'update-usage-spec',
  standalone: true,
  imports: [
    UsageSpecComponent,
    TranslateModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent,
    NotFoundStateComponent,
  ],
  templateUrl: './update-usage-spec.component.html',
  styleUrl: './update-usage-spec.component.css'
})
export class UpdateUsageSpecComponent implements OnInit {
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
