import { Component } from '@angular/core';
import {faAtom} from "@fortawesome/pro-regular-svg-icons";
import { Router } from '@angular/router';

@Component({
  selector: 'contact-us',
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.css'
})
export class ContactUsComponent {
  protected readonly faAtom = faAtom;

  constructor(
    private router: Router,
  ) {  }

  contact(){
    window.open('https://app.getonepass.eu/invite/8Zw5HETsNr', '_blank');
  }

  goTo(path:string) {
    this.router.navigate([path]);
  }

  closeModal(){
  }
}
