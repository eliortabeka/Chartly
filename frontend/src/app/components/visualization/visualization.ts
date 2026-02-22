import { Component, input, OnChanges, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import {
  Chart,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Colors,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  PieController,
  ArcElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Colors,
);

const COLORS_LIGHT = [
  '#8b5cf6', '#6366f1', '#a78bfa', '#c084fc',
  '#34d399', '#2dd4bf', '#22d3ee',
  '#fbbf24', '#fb923c', '#f87171',
  '#60a5fa', '#818cf8',
];

const COLORS_DARK = [
  '#b49cfa', '#a5b4fc', '#c4b5fd', '#d8b4fe',
  '#6ee7b7', '#5eead4', '#67e8f9',
  '#fcd34d', '#fdba74', '#fca5a5',
  '#93c5fd', '#a5b4fc',
];

function getChartColors(): string[] {
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'dark' ? COLORS_DARK : COLORS_LIGHT;
}

@Component({
  selector: 'app-visualization',
  imports: [BaseChartDirective],
  templateUrl: './visualization.html',
  styleUrl: './visualization.scss',
})
export class Visualization implements OnChanges {
  readonly chartData = input<any[]>([]);
  readonly chartType = input<string>('none');

  readonly config = signal<ChartConfiguration | null>(null);
  readonly tableColumns = signal<string[]>([]);
  readonly tableRows = signal<Record<string, any>[]>([]);

  ngOnChanges() {
    this.buildChart();
  }

  private buildChart() {
    const colors = getChartColors();
    const data = this.chartData();
    const type = this.chartType();

    if (!data || !data.length || type === 'none') {
      this.config.set(null);
      this.tableColumns.set([]);
      this.tableRows.set([]);
      return;
    }

    if (type === 'table') {
      this.config.set(null);
      const cols = Object.keys(data[0]);
      this.tableColumns.set(cols);
      this.tableRows.set(data);
      return;
    }

    this.tableColumns.set([]);
    this.tableRows.set([]);

    const labels = data.map((d) => d.label || d.name || d.category || Object.values(d)[0]);
    const values = data.map((d) => d.value || d.count || d.amount || Object.values(d)[1]);

    const chartType = this.mapChartType(type);

    const config: ChartConfiguration = {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            label: 'Value',
            data: values,
            backgroundColor:
              chartType === 'pie'
                ? colors.slice(0, labels.length)
                : colors[0],
            borderColor:
              chartType === 'pie' ? getComputedStyle(document.documentElement).getPropertyValue('--chart-border').trim() || '#fff' :
              chartType === 'line' ? colors[0] : 'transparent',
            borderWidth: chartType === 'pie' ? 2 : chartType === 'line' ? 2.5 : 0,
            tension: 0.4,
            pointBackgroundColor: chartType === 'line' ? colors[0] : undefined,
            pointBorderColor: chartType === 'line' ? (getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim() || '#fff') : undefined,
            pointBorderWidth: chartType === 'line' ? 2 : undefined,
            pointRadius: chartType === 'line' ? 4 : undefined,
            borderRadius: chartType === 'bar' ? 6 : undefined,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: chartType === 'pie',
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
              padding: 16,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary').trim(),
            titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
            bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-primary').trim(),
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
          },
        },
        scales:
          chartType !== 'pie'
            ? {
                y: {
                  beginAtZero: true,
                  grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() },
                  ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(), font: { size: 11 } },
                  border: { color: 'transparent' },
                },
                x: {
                  grid: { display: false },
                  ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(), font: { size: 11 } },
                  border: { color: 'transparent' },
                },
              }
            : undefined,
      },
    };

    this.config.set(config);
  }

  private mapChartType(type: string): ChartType {
    switch (type) {
      case 'bar': return 'bar';
      case 'pie': return 'pie';
      case 'line': return 'line';
      default: return 'bar';
    }
  }
}
