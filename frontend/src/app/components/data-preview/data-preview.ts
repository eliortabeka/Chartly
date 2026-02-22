import { Component } from '@angular/core';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-data-preview',
  imports: [],
  templateUrl: './data-preview.html',
  styleUrl: './data-preview.scss',
})
export class DataPreview {
  constructor(protected data: DataService) {}
}
