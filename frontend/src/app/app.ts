import { Component, signal, OnInit } from '@angular/core';
import { DataService } from './services/data';
import { FileUpload } from './components/file-upload/file-upload';
import { DataPreview } from './components/data-preview/data-preview';
import { ChatInterface } from './components/chat-interface/chat-interface';

@Component({
  selector: 'app-root',
  imports: [FileUpload, DataPreview, ChatInterface],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly isDark = signal(false);

  constructor(protected data: DataService) {}

  ngOnInit() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDark.set(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  toggleTheme() {
    const dark = !this.isDark();
    this.isDark.set(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }
}
