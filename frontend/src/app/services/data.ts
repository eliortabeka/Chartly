import { Injectable, signal } from '@angular/core';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  chartData?: any[];
  chartType?: 'bar' | 'pie' | 'line' | 'table' | 'none';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  readonly hasData = signal(false);
  readonly columns = signal<string[]>([]);
  readonly preview = signal<Record<string, any>[]>([]);
  readonly totalRows = signal(0);
  readonly messages = signal<ChatMessage[]>([]);
  readonly isLoading = signal(false);

  setUploadedData(columns: string[], preview: Record<string, any>[], totalRows: number) {
    this.columns.set(columns);
    this.preview.set(preview);
    this.totalRows.set(totalRows);
    this.hasData.set(true);
    this.messages.set([]);
  }

  addMessage(message: ChatMessage) {
    this.messages.update((msgs) => [...msgs, message]);
  }

  removeLastMessage() {
    this.messages.update((msgs) => msgs.slice(0, -1));
  }

  truncateFromIndex(index: number) {
    this.messages.update((msgs) => msgs.slice(0, index));
  }

  clearData() {
    this.hasData.set(false);
    this.columns.set([]);
    this.preview.set([]);
    this.totalRows.set(0);
    this.messages.set([]);
  }
}
