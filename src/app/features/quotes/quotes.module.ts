import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { quotesRoutes } from './quotes.routes';
import { QuoteListComponent } from './pages/quote-list/quote-list.component';
import { QuoteDetailsComponent } from './pages/quote-details/quote-details.component';
import { QuoteFormComponent } from './pages/quote-form/quote-form.component';
import { NotificationComponent } from 'src/app/shared/notification/notification.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(quotesRoutes),
    QuoteListComponent,
    QuoteDetailsComponent,
    QuoteFormComponent,
    NotificationComponent,
    ConfirmModalComponent
  ],
  declarations: []
})
export class QuotesModule { } 