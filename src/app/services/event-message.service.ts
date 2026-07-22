import { Injectable } from '@angular/core';
import { Subject } from "rxjs";
import { LoginInfo } from 'src/app/models/interfaces';
import { cartProduct, Category, FormChangeState, PricePlanChangeState } from "../models/interfaces";

export interface EventMessage {
  type: 'AddedFilter' | 'RemovedFilter' | 'AddedCartItem' | 'RemovedCartItem' | 'FilterShown' | 'ToggleCartDrawer' | 'LoginProcess' | 'BillAccChanged' |
  'SellerCreateProductSpec' | 'SellerServiceSpec' | 'SellerCreateServiceSpec' | 'SellerResourceSpec' | 'SellerCreateResourceSpec' |
  'SellerOffer' | 'SellerCreateOffer' | 'SellerUpdateProductSpec' | 'SellerUpdateServiceSpec' | 'SellerUpdateResourceSpec' | 'SellerUpdateOffer' | 'SellerCreateCustomOffer' |
  'SellerCatalog' | 'SellerCatalogCreate' | 'SellerCatalogUpdate' | 'CategoryAdded' | 'CategoryRemoved' | 'ChangedSession' | 'CloseCartCard' |
  'CreateCategory' | 'UpdateCategory' | 'ShowCartToast' | 'HideCartToast' | 'CloseContact' |
  'SavePricePlan' | 'UpdatePricePlan' | 'ToggleEditPrice' | 'ToggleNewPrice' |
  'SubformChange' | 'CloseFeedback' | 'UpdateOffer' | 'CloseQuoteRequest' | 'UpdateUsageSpec' | 'UsageSpecList' | 'CreateUsageSpec' | 'AiSearchFacets' | 'AiSearchCleared' | 'FiltersCommitted' | 'SellerSoftware' | 'SellerCreateSoftware' | 'SellerSoftwareUpdate';
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
  /** Emit an event to notify if the filter panel is shown or hidden */
  emitFilterShown(shown: boolean) {
    this.eventMessageSubject.next({ type: 'FilterShown', value: shown });
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

  emitSellerCreateProductSpec(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerCreateProductSpec', value: show });
  }

  emitSellerUpdateProductSpec(prod: any) {
    this.eventMessageSubject.next({ type: 'SellerUpdateProductSpec', value: prod });
  }

  emitSellerServiceSpec(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerServiceSpec', value: show });
  }

  emitSellerCreateServiceSpec(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerCreateServiceSpec', value: show });
  }

  emitSellerUpdateServiceSpec(serv: any) {
    this.eventMessageSubject.next({ type: 'SellerUpdateServiceSpec', value: serv });
  }

  emitSellerResourceSpec(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerResourceSpec', value: show });
  }

  emitSellerCreateResourceSpec(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerCreateResourceSpec', value: show });
  }

  emitSellerUpdateResourceSpec(res: any) {
    this.eventMessageSubject.next({ type: 'SellerUpdateResourceSpec', value: res });
  }

  emitSellerOffer(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerOffer', value: show });
  }

  emitSellerCreateOffer(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerCreateOffer', value: show });
  }

  emitSellerUpdateOffer(offer: any) {
    this.eventMessageSubject.next({ type: 'SellerUpdateOffer', value: offer });
  }

  emitSellerCreateCustomOffer(offer: any, partyId?: string) {
    this.eventMessageSubject.next({ type: 'SellerCreateCustomOffer', value: { offer, partyId } })
  }

  emitSellerCatalog(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerCatalog', value: show });
  }

  emitSellerUpdateCatalog(cat: any) {
    this.eventMessageSubject.next({ type: 'SellerCatalogUpdate', value: cat });
  }

  emitSellerCreateCatalog(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerCatalogCreate', value: show });
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

  emitShowCartToast(val: cartProduct | undefined) {
    this.eventMessageSubject.next({ type: 'ShowCartToast', value: val })
  }
  emitHideCartToast(val: cartProduct | undefined) {
    this.eventMessageSubject.next({ type: 'HideCartToast', value: val })
  }

  emitCreateCategory(show: boolean) {
    this.eventMessageSubject.next({ type: 'CreateCategory', value: show });
  }

  emitUpdateCategory(cat: any) {
    this.eventMessageSubject.next({ type: 'UpdateCategory', value: cat });
  }

  emitCloseContact(close: boolean) {
    this.eventMessageSubject.next({ type: 'CloseContact', value: close })
  }

  emitSavePricePlan(pricePlan: any) {
    this.eventMessageSubject.next({ type: 'SavePricePlan', value: pricePlan })
  }

  emitUpdatePricePlan(pricePlan: any) {
    this.eventMessageSubject.next({ type: 'UpdatePricePlan', value: pricePlan })
  }

  emitToggleEditPricePlan(pricePlan: any) {
    this.eventMessageSubject.next({ type: 'ToggleEditPrice', value: pricePlan })
  }

  emitToggleNewPricePlan(pricePlan: any) {
    this.eventMessageSubject.next({ type: 'ToggleNewPrice', value: pricePlan })
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

  emitUpdateUsageSpec(usageSpec: any) {
    this.eventMessageSubject.next({ type: 'UpdateUsageSpec', value: usageSpec })
  }

  emitUsageSpecList(show: boolean) {
    this.eventMessageSubject.next({ type: 'UsageSpecList', value: show })
  }

  emitCreateUsageSpec(show: boolean) {
    this.eventMessageSubject.next({ type: 'CreateUsageSpec', value: show })
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

  emitSellerSoftware(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerSoftware', value: show })
  }
  emitSellerSoftwareCreate(show: boolean) {
    this.eventMessageSubject.next({ type: 'SellerCreateSoftware', value: show })
  }

  emitSellerSoftwareUpdate(software: any) {
    this.eventMessageSubject.next({ type: 'SellerSoftwareUpdate', value: software })
  }
}
