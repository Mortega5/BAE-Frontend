import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { tendersRoutes } from './tenders.routes';
import { TenderListComponent } from './pages/tender-list/tender-list.component';
import { NotificationComponent } from 'src/app/shared/notification/notification.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(tendersRoutes),
    TenderListComponent,
    NotificationComponent,
    ConfirmModalComponent
  ],
  declarations: []
})
export class TendersModule { }

