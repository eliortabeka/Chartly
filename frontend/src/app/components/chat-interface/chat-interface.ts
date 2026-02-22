import { Component, ElementRef, signal, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataService } from '../../services/data';
import { ApiService } from '../../services/api';
import { Message } from '../message/message';

@Component({
  selector: 'app-chat-interface',
  imports: [FormsModule, Message],
  templateUrl: './chat-interface.html',
  styleUrl: './chat-interface.scss',
})
export class ChatInterface implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  readonly question = signal('');
  readonly error = signal<string | null>(null);
  private shouldScroll = false;
  private querySubscription: Subscription | null = null;

  constructor(
    protected data: DataService,
    private api: ApiService,
  ) {}

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  sendQuestion() {
    const q = this.question().trim();
    if (!q || this.data.isLoading()) return;

    this.error.set(null);

    this.data.addMessage({
      role: 'user',
      text: q,
      timestamp: new Date(),
    });

    this.question.set('');
    this.data.isLoading.set(true);
    this.shouldScroll = true;

    this.querySubscription = this.api.queryData(q).subscribe({
      next: (res) => {
        this.querySubscription = null;
        this.data.isLoading.set(false);
        if (res.success && res.data) {
          this.data.addMessage({
            role: 'bot',
            text: res.data.textAnswer,
            chartData: res.data.chartData,
            chartType: res.data.chartType,
            timestamp: new Date(),
          });
        } else {
          this.data.addMessage({
            role: 'bot',
            text: res.error || 'Something went wrong. Please try again.',
            timestamp: new Date(),
          });
        }
        this.shouldScroll = true;
        this.scrollToBottom();
      },
      error: (err) => {
        this.querySubscription = null;
        this.data.isLoading.set(false);
        this.data.addMessage({
          role: 'bot',
          text: err.error?.error || 'Failed to get a response. Make sure the server is running.',
          timestamp: new Date(),
        });
        this.shouldScroll = true;
        this.scrollToBottom();
      },
    });
  }

  stopQuestion() {
    if (this.querySubscription) {
      this.querySubscription.unsubscribe();
      this.querySubscription = null;
    }
    this.data.removeLastMessage();
    this.data.isLoading.set(false);
  }

  onEditMessage(index: number, newText: string) {
    if (this.data.isLoading()) return;
    this.data.truncateFromIndex(index);
    this.question.set(newText);
    this.sendQuestion();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendQuestion();
    }
  }

  private scrollToBottom() {
    const el = this.scrollContainer?.nativeElement;
    if (el) {
      setTimeout(() => el.scrollTop = el.scrollHeight);
    }
  }
}
