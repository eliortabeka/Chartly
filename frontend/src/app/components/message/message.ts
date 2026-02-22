import { Component, input, output, signal, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../../services/data';
import { Visualization } from '../visualization/visualization';
import { marked } from 'marked';

@Component({
  selector: 'app-message',
  imports: [Visualization, FormsModule],
  templateUrl: './message.html',
  styleUrl: './message.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Message {
  readonly message = input.required<ChatMessage>();
  readonly editMessage = output<string>();
  readonly copied = signal(false);
  readonly editing = signal(false);
  readonly editText = signal('');

  get renderedHtml(): string {
    const msg = this.message();
    if (msg.role === 'user') return msg.text;
    return marked.parse(msg.text) as string;
  }

  copyText() {
    navigator.clipboard.writeText(this.message().text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  startEdit() {
    this.editText.set(this.message().text);
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
  }

  submitEdit() {
    const text = this.editText().trim();
    if (!text) return;
    this.editing.set(false);
    this.editMessage.emit(text);
  }

  onEditKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitEdit();
    }
    if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }
}
