import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { faIdCard, faSort, faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { components } from "src/app/models/product-catalog";
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import { AdminPaths } from '../admin.paths';
import { BadgeStatus, lifecycleStatusBadgeVariant } from 'src/app/shared/badge/badge.component';
import { TableColumn } from 'src/app/models/table-column.model';
type Category = components["schemas"]["Category"];

@Component({
  selector: 'admin-categories',
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnDestroy {
  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  searchField = new FormControl();
  categories: any[] = [];
  /** categories flattened depth-first, each with a displayName prefixed by its
   * ancestors' names — table-input has no nested-row support, so this is how the
   * tree gets shown as a single flat, indented list. */
  flatCategories: any[] = [];
  unformattedCategories: any[] = [];
  page: number = 0;
  CATEGOY_LIMIT: number = environment.CATEGORY_LIMIT;
  loading: boolean = false;
  partyId: any;
  status: any[] = ['Active', 'Launched'];

  categoryColumns: TableColumn[] = [
    {
      header: 'ADMIN._name',
      getValue: (cat: any) => cat.displayName,
      cellClass: (cat: any) => this.hasLongWord(cat.displayName, 20) ? 'break-all' : 'break-words',
      width: 'w-2/4',
    },
    {
      header: 'ADMIN._status',
      getValue: (cat: any) => cat.lifecycleStatus ?? '-',
      type: 'status-badge',
      width: 'w-28',
      getStatus: (cat: any) => this.statusBadgeVariant(cat.lifecycleStatus ?? ''),
    },
    {
      header: 'ADMIN._last_update',
      type: 'date',
      getValue: (cat: any) => cat.lastUpdate,
      width: 'w-40',
    },
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initCatalogs();
        }
      })
  }

  ngOnInit() {
    this.initCatalogs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initCatalogs() {
    this.loading = true;
    this.categories = [];
    this.unformattedCategories = [];
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux.logged_as == aux.id) {
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    void this.getCategories();
    initFlowbite();
  }

  createCategory() {
    this.router.navigate([AdminPaths.categories.new()]);
  }

  goToUpdate(catId: string) {
    this.router.navigate([AdminPaths.categories.edit(catId)]);
  }

  statusBadgeVariant(status: string): BadgeStatus {
    return lifecycleStatusBadgeVariant(status);
  }

  async getCategories() {
    /*this.api.getCatalog(this.selectedCatalog.id).then(data => {
      if(data.category){
        for (let i=0; i<data.category.length; i++){
          this.api.getCategoryById(data.category[i].id).then(categoryInfo => {
            this.findChildrenByParent(categoryInfo);
          })
        }
        initFlowbite();
      } else {
        this.api.getCategories().then(data => {
          for(let i=0; i < data.length; i++){
            this.findChildren(data[i],data)
          }
          this.cdr.detectChanges();
          initFlowbite();
        })
      }
    })*/
    console.log('Getting categories...')
    const rootCategories = await this.api.getDefaultCategories().catch(() => []);
    const roots = Array.isArray(rootCategories) ? rootCategories : [];

    this.unformattedCategories = [...roots];
    const categoryTrees = await Promise.all(
      roots.map((root: any) => this.loadCategorySubtree(root))
    );

    this.categories = categoryTrees.filter((cat): cat is Category => !!cat);
    this.flatCategories = this.flattenCategories(this.categories);
    this.loading = false;
    this.cdr.detectChanges();
    initFlowbite();
  }

  private flattenCategories(categories: any[], path = ''): any[] {
    return categories.flatMap((cat: any) => {
      const displayName = path ? `${path} / ${cat.name}` : cat.name;
      const flattened = { ...cat, displayName };
      const children = this.flattenCategories(cat.children || [], displayName);
      return [flattened, ...children];
    });
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  private async loadCategorySubtree(parent: any): Promise<Category> {
    const children = await this.api.getCategoriesByParentId(parent.id).catch(() => []);
    const childList = Array.isArray(children) ? children : [];
    const resolvedChildren = await Promise.all(
      childList.map((child: any) => this.loadCategorySubtree(child))
    );

    return {
      ...parent,
      children: resolvedChildren
    };
  }

  /*addParent(parentId:any){
    const index = this.unformattedCategories.findIndex(item => item.id === parentId);
    if (index != -1) {
      //Si el padre no está seleccionado se añade a la selección
      if(this.unformattedCategories[index].isRoot==false){
        this.addCategory(this.unformattedCategories[index])
      } else {
        this.selectedCategories.push(this.unformattedCategories[index]);
      }
    }
  }*/

  onStateFilterChange(filter: string) {
    const index = this.status.findIndex(item => item === filter);
    if (index !== -1) {
      this.status.splice(index, 1);
      console.log('elimina filtro')
      console.log(this.status)
    } else {
      console.log('añade filtro')
      console.log(this.status)
      this.status.push(filter)
    }
    this.loading = true;
    this.categories = [];
    this.unformattedCategories = [];
    void this.getCategories();
    console.log('filter')
  }

}
