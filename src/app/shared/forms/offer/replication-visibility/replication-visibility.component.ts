import { Component } from '@angular/core';
import {MultipleSelectComponent} from "src/app/shared/multiple-select/multiple-select.component"
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-replication-visibility',
  standalone: true,
  imports: [MultipleSelectComponent, TranslateModule],
  templateUrl: './replication-visibility.component.html',
  styleUrl: './replication-visibility.component.css'
})
export class ReplicationVisibilityComponent {
  availableCountries:any[]=['Austria','Belgium','Germany','Hungary','Luxembourg','Poland','Romania','Spain']
  availableMarketplaces:any[]=['BEIA Software Services','CloudFerro','CSI Piemonte','digitanimal','Digitel TS','DOME']

}
