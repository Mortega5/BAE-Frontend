import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ProductInvDetailComponent } from './product-inv-detail.component';

describe('ProductInvDetailComponent', () => {
  let component: ProductInvDetailComponent;
  let fixture: ComponentFixture<ProductInvDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [ProductInvDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProductInvDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('ProductInvDetailComponent as a route', () => {
  let inventory: jasmine.SpyObj<ProductInventoryServiceService>;

  const create = async (state: any) => {
    history.replaceState(state, '');
    inventory = jasmine.createSpyObj('ProductInventoryServiceService', ['getProduct']);
    inventory.getProduct.and.resolveTo({ id: 'inv-1', productOffering: { id: 'offer-1' } });
    // What follows reading the item is not what these tests are about
    const api = jasmine.createSpyObj('ApiServiceService', ['getProductById', 'getProductSpecification', 'getOfferingPrice']);
    api.getProductById.and.rejectWith(new Error('stop'));
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [ProductInvDetailComponent],
      providers: [
        { provide: ProductInventoryServiceService, useValue: inventory },
        { provide: ApiServiceService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'inv-1' } } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProductInvDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  };

  afterEach(() => history.replaceState(null, ''));

  it('uses the item handed over by the navigation, without asking for it by id', async () => {
    const handedOver = { id: 'inv-1', productOffering: { id: 'offer-1' }, name: 'handed over' };
    const component = await create({ inv: handedOver });
    expect(component.prod).toEqual(handedOver);
    expect(inventory.getProduct).not.toHaveBeenCalled();
  });

  it('asks for the item by id when nothing was handed over (a reload, a shared link)', async () => {
    await create(null);
    expect(inventory.getProduct).toHaveBeenCalledWith('inv-1', jasmine.anything());
  });

  it('does not use an item handed over for another product', async () => {
    await create({ inv: { id: 'other', productOffering: { id: 'offer-2' } } });
    expect(inventory.getProduct).toHaveBeenCalled();
  });
});
