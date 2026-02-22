import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadResponse {
  success: boolean;
  data?: {
    columns: string[];
    preview: Record<string, any>[];
    totalRows: number;
    analyzedRows: number;
  };
  error?: string;
  code?: string;
}

export interface QueryResponse {
  success: boolean;
  data?: {
    textAnswer: string;
    chartData: any[];
    chartType: 'bar' | 'pie' | 'line' | 'table' | 'none';
  };
  error?: string;
  code?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResponse>(`${this.baseUrl}/upload`, formData);
  }

  queryData(question: string): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.baseUrl}/query`, { question });
  }
}
