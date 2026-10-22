import { Component, ElementRef, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, ViewChild } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { faComments } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonComponent } from '../button/button.component';
import { ContentCardComponent } from '../content-card/content-card.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import {LocalStorageService} from "src/app/services/local-storage.service";
import { NotificationService } from '../../services/notification.service';
import { Quote, Note } from '../../models/quote.model';
import { LoginInfo } from 'src/app/models/interfaces';

type QuoteNote = Note;

@Component({
  selector: 'app-chat-modal',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule, TranslateModule, ButtonComponent, ContentCardComponent, EmptyStateComponent, LoadingSpinnerComponent],
  templateUrl: './chat-modal.component.html',
})
export class ChatModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen = false;
  @Input() quoteId: string | null = null;
  @Output() close = new EventEmitter<void>();

  protected readonly faComments = faComments;

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;

  messages: QuoteNote[] = [];
  newMessage = '';
  isLoading = false;
  error = false;
  isSending = false;
  currentUserId: string | null = null;
  
  private pollingInterval: any;

  constructor(
    private quoteService: QuoteService,
    private localStorage: LocalStorageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;

    if(aux.logged_as == aux.id){
      this.currentUserId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.currentUserId = loggedOrg.partyId
    }
    if (this.isOpen && this.quoteId) {
      this.loadMessages();
      this.startPolling();
    }
  }

  ngOnChanges() {
    if (this.isOpen && this.quoteId) {
      let aux = this.localStorage.getObject('login_items') as LoginInfo;

      if(aux.logged_as == aux.id){
        this.currentUserId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.currentUserId = loggedOrg.partyId
      }

      //this.currentUserId = this.loginService.getUserId();
      this.loadMessages();
      this.startPolling();
    } else if (!this.isOpen) {
      this.stopPolling();
      this.resetState();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  async loadMessages() {
    if (!this.quoteId) return;

    this.isLoading = true;
    this.error = false;

    try {
      const quote = await this.quoteService.getQuoteById(this.quoteId).toPromise();
      if(quote)
      this.messages = Array.isArray(quote?.note) ? quote.note : [];
      this.scrollToBottom();
    } catch (err) {
      console.error('Error loading messages:', err);
      this.error = true;
    } finally {
      this.isLoading = false;
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.quoteId || !this.currentUserId || this.isSending) {
      return;
    }

    this.isSending = true;

    try {
      await this.quoteService.addNoteToQuote(this.quoteId, this.newMessage.trim(), this.currentUserId).toPromise();
      this.newMessage = '';
      // Reload messages after sending
      await this.loadMessages();
    } catch (err: any) {
      console.error('Error sending message:', err);
      this.notificationService.showError('CHAT_MODAL._send_error', { details: err?.error?.error || err?.error?.message || err?.message });
    } finally {
      this.isSending = false;
    }
  }

  onEnterKey(event: Event) {
    event.preventDefault();
    this.sendMessage();
  }

  isMyMessage(message: QuoteNote): boolean {
    return message.author === this.currentUserId;
  }

  getShortQuoteId(): string {
    if (!this.quoteId) return '';
    return this.quoteId.length > 8 ? this.quoteId.slice(-8) : this.quoteId;
  }

  closeModal() {
    this.close.emit();
  }

  private startPolling() {
    this.stopPolling(); // Clear any existing polling
    this.pollingInterval = setInterval(() => {
      if (this.isOpen && this.quoteId) {
        this.loadMessages();
      }
    }, 300000); // Poll every 5 minutes (300,000 ms)
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private resetState() {
    this.messages = [];
    this.newMessage = '';
    this.isLoading = false;
    this.error = false;
    this.isSending = false;
  }

  private scrollToBottom() {
    // After the new messages render
    setTimeout(() => {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }
} 