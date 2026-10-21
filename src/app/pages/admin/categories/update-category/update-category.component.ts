import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AdminPaths } from 'src/app/pages/admin/admin.paths';
import {LocalStorageService} from "src/app/services/local-storage.service";
import {EventMessageService} from "src/app/services/event-message.service";
import { NotificationService } from 'src/app/services/notification.service';
import { initFlowbite } from 'flowbite';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StepChangedEvent } from 'src/app/shared/stepper/stepper.component';
import { BadgeStatus, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { noWhitespaceValidator } from 'src/app/validators/validators';

import {components} from "src/app/models/product-catalog";
type Category_Update = components["schemas"]["Category_Update"];

@Component({
  selector: 'update-category',
  templateUrl: './update-category.component.html',
  styleUrl: './update-category.component.css'
})
export class UpdateCategoryComponent implements OnInit, OnDestroy {
  category: any;
  loadingCategory: boolean = false;

  get notFound(): boolean {
    return !this.loadingCategory && !this.category;
  }

  partyId:any='';
  categoryToUpdate:Category_Update | undefined;

  categories:any[]=[];
  unformattedCategories:any[]=[];

  currentStepId: string = 'general';

  //SERVICE GENERAL INFO:
  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'UPDATE_CATEGORIES._name', required: true, maxLength: 100, dataCy: 'adminCategoryNameInput' },
    { type: 'markdownTextarea', name: 'description', label: 'UPDATE_CATEGORIES._description', dataCy: 'adminCategoryDescription' },
  ];

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', Validators.maxLength(100000)),
  });
  isParent:boolean=true;
  parentSelectionCheck:boolean=false;
  checkDisableParent:boolean=false;
  selectedCategory:any=undefined;
  selected:any[];
  loading: boolean = false;
  saving = false;
  showDeleteConfirm = false;
  showPublishConfirm = false;

  private destroy$ = new Subject<void>();

  get isDraft(): boolean {
    return this.category?.lifecycleStatus === 'Active';
  }

  /** Deleting a category retires it, so a retired one has nothing left to delete. */
  get isRetired(): boolean {
    return this.category?.lifecycleStatus === 'Retired';
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private notificationService: NotificationService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initPartyInfo();
      }
      if(ev.type === 'CategoryAdded') {
        this.addCategory(ev.value);
      }
    })
  }

  get canAdvance(): boolean {
    if (this.currentStepId === 'general') {
      return this.generalForm.valid && (!this.parentSelectionCheck || this.selectedCategory !== undefined);
    }
    return true;
  }

  async ngOnInit() {
    this.initPartyInfo();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadingCategory = true;
    try {
      this.category = await this.api.getCategoryById(id);
      this.populateCatInfo();
      void this.getCategories();
    } catch (error) {
      console.error('Error loading category', error);
    } finally {
      this.loadingCategory = false;
    }
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo(){
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }


  populateCatInfo(){
    //GENERAL INFORMATION
    this.generalForm.patchValue({
      name: this.category.name,
      description: this.category.description,
    });
    if(this.category.isRoot==false){
      this.isParent=false;
      this.parentSelectionCheck=true;
      this.checkDisableParent=true;
    } else {
      this.isParent=true;
      this.parentSelectionCheck=false;
    }
  }

  goBack() {
    this.router.navigate([AdminPaths.categories.list()]);
  }

  async getCategories(){
    console.log('Getting categories...')
    this.loading = true;
    this.categories = [];
    this.unformattedCategories = [];

    const rootCategories = await this.api.getDefaultCategories().catch(() => []);
    const roots = Array.isArray(rootCategories) ? rootCategories : [];

    this.unformattedCategories = [...roots];
    const categoryTrees = await Promise.all(
      roots.map((root: any) => this.loadCategorySubtree(root))
    );

    this.categories = this.removeCategoryFromTree(
      categoryTrees.filter(Boolean),
      this.category?.id
    );
    this.loading=false;

    if(this.category.isRoot==false){
      const parentCategory = this.findCategoryById(this.categories, this.category.parentId);
      if (parentCategory) {
        this.selectedCategory = parentCategory;
        this.selected = [parentCategory];
      }
    }
    this.cdr.detectChanges();
    initFlowbite();
  }

  private async loadCategorySubtree(parent:any): Promise<any> {
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

  private findCategoryById(categories: any[], categoryId: string): any | undefined {
    for (const category of categories || []) {
      if (category?.id === categoryId) {
        return category;
      }
      const foundInChildren = this.findCategoryById(category?.children || [], categoryId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
    return undefined;
  }

  private removeCategoryFromTree(categories: any[], categoryId: string): any[] {
    if (!categoryId) {
      return categories || [];
    }

    return (categories || [])
      .filter((category) => category?.id !== categoryId)
      .map((category) => ({
        ...category,
        children: this.removeCategoryFromTree(category?.children || [], categoryId)
      }));
  }

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId ?? 'general';
    if (event.isLastStep) {
      this.buildCategoryToUpdate();
    }
  }

  toggleParent(){
    this.isParent=!this.isParent;
    this.parentSelectionCheck=!this.parentSelectionCheck;
    this.cdr.detectChanges();
  }


  addCategory(cat:any){
    if(this.selectedCategory==undefined){
      this.selectedCategory=cat;
      this.selected=[];
      this.selected.push(cat);
    } else {
      const index = this.selected.findIndex(item => item.id === cat.id);
      if (index !== -1) {
        this.selected=[];
        this.selectedCategory=undefined;
      } else {
        this.selectedCategory=cat;
        this.selected=[];
        this.selected.push(cat);
      }
    }

    this.cdr.detectChanges();
  }

  isCategorySelected(cat:any){
    if(this.selectedCategory==undefined){
      return false;
    } else {
      if(cat.id==this.selectedCategory.id){
        return true
      } else {
        return false
      }
    }
  }

  private buildCategoryToUpdate(){
    if(this.generalForm.value.name!=null){
      this.categoryToUpdate={
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        isRoot: this.isParent
      }
      if(this.isParent==false){
        this.categoryToUpdate.parentId=this.selectedCategory.id;
      }
    }
  }

  updateCategory(){
    if (!this.categoryToUpdate) return;
    this.saving = true;
    this.api.updateCategory(this.categoryToUpdate,this.category.id).subscribe({
      next: () => {
        this.saving = false;
        this.notificationService.showSuccess('UPDATE_CATEGORIES._update_success');
        this.goBack();
      },
      error: error => {
        console.error('There was an error while updating the category!', error);
        this.saving = false;
        const details = error?.error?.error || error?.error?.message || error?.message;
        this.notificationService.showError('UPDATE_CATEGORIES._update_error', details ? { details } : undefined);
      }
    })
  }

  onDeleteResolved(confirmed: boolean) {
    this.showDeleteConfirm = false;
    if (confirmed) {
      this.deleteCategory();
    }
  }

  onPublishResolved(confirmed: boolean) {
    this.showPublishConfirm = false;
    if (confirmed) {
      this.publishCategory();
    }
  }

  private deleteCategory() {
    this.saving = true;
    this.api.updateCategory({ lifecycleStatus: 'Retired' }, this.category.id).subscribe({
      next: () => {
        this.saving = false;
        this.notificationService.showSuccess('UPDATE_CATEGORIES._delete_success');
        this.goBack();
      },
      error: error => {
        console.error('There was an error while retiring the category!', error);
        this.saving = false;
        this.notificationService.showError('UPDATE_CATEGORIES._delete_error', {
          details: error?.error?.error || error?.error?.message || error?.message
        });
      },
    });
  }

  private publishCategory() {
    this.saving = true;
    this.api.updateCategory({ lifecycleStatus: 'Launched' }, this.category.id).subscribe({
      next: () => {
        this.saving = false;
        this.category.lifecycleStatus = 'Launched';
        this.notificationService.showSuccess('UPDATE_CATEGORIES._publish_success');
      },
      error: error => {
        console.error('There was an error while publishing the category!', error);
        this.saving = false;
        this.notificationService.showError('UPDATE_CATEGORIES._publish_error', {
          details: error?.error?.error || error?.error?.message || error?.message
        });
      },
    });
  }

  statusBadgeVariant(status: string): BadgeStatus {
    return lifecycleStatusBadgeVariant(status);
  }

  statusLabel(status: string): string {
    return lifecycleStatusLabel(status);
  }
}
