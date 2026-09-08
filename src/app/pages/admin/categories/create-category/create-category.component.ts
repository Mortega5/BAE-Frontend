import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AdminPaths } from 'src/app/pages/admin/admin.paths';
import {LocalStorageService} from "src/app/services/local-storage.service";
import {EventMessageService} from "src/app/services/event-message.service";
import { LoginInfo } from 'src/app/models/interfaces';
import { initFlowbite } from 'flowbite';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StepChangedEvent } from 'src/app/shared/stepper/stepper.component';
import { BadgeStatus, lifecycleStatusBadgeVariant } from 'src/app/shared/badge/badge.component';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { noWhitespaceValidator } from 'src/app/validators/validators';

import {components} from "src/app/models/product-catalog";
type Category_Create = components["schemas"]["Category_Create"];

@Component({
  selector: 'create-category',
  templateUrl: './create-category.component.html',
  styleUrl: './create-category.component.css'
})
export class CreateCategoryComponent implements OnInit, OnDestroy {
  partyId:any='';
  categoryToCreate:Category_Create | undefined;

  categories:any[]=[];
  unformattedCategories:any[]=[];

  currentStepId: string = 'general';

  //SERVICE GENERAL INFO:
  generalFormFields: FormField[] = [
    { type: 'string', name: 'name', label: 'CREATE_CATEGORIES._name', required: true, maxLength: 100, dataCy: 'adminCategoryNameInput' },
    { type: 'markdownTextarea', name: 'description', label: 'CREATE_CATEGORIES._description', dataCy: 'adminCategoryDescription' },
  ];

  generalForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100), noWhitespaceValidator]),
    description: new FormControl('', Validators.maxLength(100000)),
  });
  isParent:boolean=true;
  parentSelectionCheck:boolean=false;
  selectedCategory:any=undefined;
  selected:any[];
  loading: boolean = false;

  errorMessage:any='';
  showError:boolean=false;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService
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

  ngOnInit() {
    this.initPartyInfo();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo(){
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if(JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix())-4) > 0)) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
    void this.getCategories();
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

    this.categories = categoryTrees.filter(Boolean);
    this.loading=false;
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

  onStepChanged(event: StepChangedEvent): void {
    this.currentStepId = event.stepId ?? 'general';
    if (event.isLastStep) {
      this.buildCategoryToCreate();
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

  private buildCategoryToCreate(){
    if(this.generalForm.value.name!=null){
      this.categoryToCreate={
        name: this.generalForm.value.name,
        description: this.generalForm.value.description != null ? this.generalForm.value.description : '',
        lifecycleStatus: "Active",
        isRoot: this.isParent
      }
      if(this.isParent==false){
        this.categoryToCreate.parentId=this.selectedCategory.id;
      }
    }
  }

  statusBadgeVariant(status: string): BadgeStatus {
    return lifecycleStatusBadgeVariant(status);
  }

  createCategory(){
    this.api.postCategory(this.categoryToCreate).subscribe({
      next: data => {
        this.goBack();
      },
      error: error => {
        console.error('There was an error while updating!', error);
        if(error.error.error){
          console.log(error)
          this.errorMessage='Error: '+error.error.error;
        } else {
          this.errorMessage='There was an error while creating the category!';
        }
        this.showError=true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    })
  }
}
