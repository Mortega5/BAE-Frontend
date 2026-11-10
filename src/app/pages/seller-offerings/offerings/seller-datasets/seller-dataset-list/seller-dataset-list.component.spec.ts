import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DATASET_PRODUCTS_FILTER, SellerDatasetListComponent } from './seller-dataset-list.component';

describe('SellerDatasetListComponent', () => {
  let component: SellerDatasetListComponent;
  let prodSpecService: jasmine.SpyObj<any>;
  let api: jasmine.SpyObj<any>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    prodSpecService = jasmine.createSpyObj('ProductSpecServiceService', ['getProdSpecByUserPaged']);
    prodSpecService.getProdSpecByUserPaged.and.resolveTo({ items: [], total: 0 });
    api = jasmine.createSpyObj('ApiServiceService', ['getProductOfferByOwnerPaged']);
    api.getProductOfferByOwnerPaged.and.resolveTo({ items: [], total: 0 });
    router = jasmine.createSpyObj('Router', ['navigate']);
    const localStorage = { getObject: () => ({ id: 'u', logged_as: 'u', partyId: 'party-1' }) };
    component = new SellerDatasetListComponent(prodSpecService, api, localStorage as any, { messages$: new Subject() } as any, router);
    component.ngOnInit();
  });

  it('reads the dataset products of the seller', async () => {
    await component.fetchDatasets({ offset: 0, limit: 10 } as any, { status: ['Active'] });

    const [, filter, , partyId] = prodSpecService.getProdSpecByUserPaged.calls.mostRecent().args;
    expect(filter).toEqual(DATASET_PRODUCTS_FILTER);
    expect(partyId).toBe('party-1');
  });

  it('lists only the offers of a dataset product', async () => {
    prodSpecService.getProdSpecByUserPaged.and.resolveTo({ items: [{ id: 'spec-1' }], total: 1 });
    api.getProductOfferByOwnerPaged.and.resolveTo({
      items: [
        { id: 'offer-1', productSpecification: { id: 'spec-1' } },
        { id: 'offer-2', productSpecification: { id: 'spec-2' } },
      ],
      total: 2,
    });

    const page = await component.fetchDatasets({ offset: 0, limit: 10 } as any, {});

    expect(page.items.map(offer => offer.id)).toEqual(['offer-1']);
    expect(page.total).toBe(1);
  });

  it('opens the offer form through the datasets and offers routes', () => {
    component.goToCreate();
    expect(router.navigate).toHaveBeenCalledWith(['/my-offerings/datasets/new']);
    component.goToUpdate('urn:x:1');
    expect(router.navigate).toHaveBeenCalledWith(['/my-offerings/offers/urn:x:1']);
  });
});
