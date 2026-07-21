import { Injectable } from '@angular/core';
import { Subject } from "rxjs";
import { LoginInfo } from 'src/app/models/interfaces';
import { cartProduct, Category, FormChangeState, PricePlanChangeState } from "../models/interfaces";

export interface EventMessage {
  type: 'AddedFilter' | 'RemovedFilter' | 'AddedCartItem' | 'RemovedCartItem' | 'ToggleCartDrawer' | 'LoginProcess' | 'BillAccChanged' |
  'SellerProductSpec' |
  'CategoryAdded' | 'ChangedSession' | 'CloseCartCard' |
  'SavePricePlan' | 'UpdatePricePlan' |
  'SubformChange' | 'CloseFeedback' | 'UpdateOffer' | 'CloseQuoteRequest' | 'AiSearchFacets' | 'AiSearchCleared' | 'FiltersCommitted';
  text?: string,
  value?: object | boolean | FormChangeState | PricePlanChangeState
}


@Injectable({
  providedIn: 'root'
})
export class EventMessageService {

  // Tip: never expose the Subject itself.
  private eventMessageSubject = new Subject<EventMessage>();

  /** Observable of all messages */
  messages$ = this.eventMessageSubject.asObservable();

  /** Emit an event to notify the addition of a filter to the Subject */
  emitAddedFilter(filter: object) {
    this.eventMessageSubject.next({ type: 'AddedFilter', value: filter });
  }
  /** Emit an event to notify the removal of a filter to the Subject */
  emitRemovedFilter(filter: object) {
    this.eventMessageSubject.next({ type: 'RemovedFilter', value: filter });
  }

  /** Emit an event to notify the addition of a filter to the Subject */
  emitAddedCartItem(productOff: object) {
    this.eventMessageSubject.next({ type: 'AddedCartItem', value: productOff });
  }
  /** Emit an event to notify the removal of a filter to the Subject */
  emitRemovedCartItem(productOff: object) {
    this.eventMessageSubject.next({ type: 'RemovedCartItem', value: productOff });
  }
  emitToggleDrawer(shown: boolean) {
    this.eventMessageSubject.next({ type: 'ToggleCartDrawer', value: shown });
  }

  emitLogin(info: LoginInfo) {
    this.eventMessageSubject.next({ type: 'LoginProcess', value: info });
  }

  emitBillAccChange(changed: boolean) {
    this.eventMessageSubject.next({ type: 'BillAccChanged', value: changed });
  }

  emitSellerProductSpec(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerProductSpec', value: show });
  }

  emitCategoryAdded(cat: Category) {
    this.eventMessageSubject.next({ type: 'CategoryAdded', value: cat });
  }

  emitChangedSession(session: any) {
    this.eventMessageSubject.next({ type: 'ChangedSession', value: session });
  }

  emitCloseCartCard(val: cartProduct | undefined) {
    this.eventMessageSubject.next({ type: 'CloseCartCard', value: val })
  }

  emitSavePricePlan(pricePlan: any) {
    this.eventMessageSubject.next({ type: 'SavePricePlan', value: pricePlan })
  }

  emitUpdatePricePlan(pricePlan: any) {
    this.eventMessageSubject.next({ type: 'UpdatePricePlan', value: pricePlan })
  }

  emitSubformChange(changeState: FormChangeState | PricePlanChangeState) {
    this.eventMessageSubject.next({
      type: 'SubformChange',
      value: changeState
    });
  }

  emitCloseFeedback(show: boolean) {
    this.eventMessageSubject.next({ type: 'CloseFeedback', value: show })
  }

  emitCloseQuoteRequest(show: boolean) {
    this.eventMessageSubject.next({ type: 'CloseQuoteRequest', value: show })
  }

  emitUpdateOffer(show: boolean) {
    this.eventMessageSubject.next({ type: 'UpdateOffer', value: show })
  }

  emitAiSearchFacets(facets: Record<string, Record<string | number, number>>) {
    this.eventMessageSubject.next({ type: 'AiSearchFacets', value: facets })
  }

  emitFiltersCommitted() {
    this.eventMessageSubject.next({ type: 'FiltersCommitted', value: true });
  }

  emitAiSearchCleared() {
    this.eventMessageSubject.next({ type: 'AiSearchCleared', value: true })
  }
}
