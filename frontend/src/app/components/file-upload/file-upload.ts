import { Component, signal } from '@angular/core';
import { ApiService } from '../../services/api';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-file-upload',
  imports: [],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUpload {
  readonly isUploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isDragOver = signal(false);

  constructor(
    private api: ApiService,
    private data: DataService,
  ) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave() {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadFile(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadFile(file);
  }

  private uploadFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      this.error.set('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    this.error.set(null);
    this.isUploading.set(true);

    this.api.uploadFile(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        if (res.success && res.data) {
          this.data.setUploadedData(res.data.columns, res.data.preview, res.data.totalRows);
        } else {
          this.error.set(res.error || 'Upload failed.');
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.error.set(err.error?.error || 'Failed to upload file. Is the server running?');
      },
    });
  }
}
