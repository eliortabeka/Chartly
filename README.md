<p align="center">
  <img src="logo.png" alt="Chartly" width="280" />
</p>

<p align="center">Upload your data. Ask questions. Get instant answers and visualizations - powered by Claude AI.</p>

Chartly is a full-stack web app that lets you upload Excel or CSV files and have a natural language conversation about your data. Claude AI analyzes the dataset and returns text answers with auto-generated charts.

## Features

- **Drag & drop upload** - supports .xlsx, .xls, and .csv files (up to 50MB)
- **Large file support** - handles datasets with hundreds of thousands of rows, far exceeding AI context limits
- **Data preview** - instantly see columns and sample rows after upload
- **AI-powered Q&A** - ask questions in plain English, get structured answers
- **Auto visualizations** - bar, pie, and line charts generated based on your question
- **Light & dark themes** - toggle between themes, persisted in localStorage
- **Cancel requests** - stop a running query and remove it from chat history
- **Copy answers** - hover any message to copy its text to clipboard
- **Edit questions** - edit a previous question to re-ask it, clearing all subsequent messages
- **Responsive design** - works across desktop, tablet, and mobile
- **Markdown rendering** - bot responses support full markdown formatting

## How Large File Support Works

The biggest challenge in building an AI-powered data analysis tool is that LLM context windows have a finite size. Claude's context window can hold roughly 150-200K tokens — that's around 3,000-5,000 rows of typical tabular data. But real-world datasets can have tens of thousands, hundreds of thousands, or even millions of rows.

Chartly solves this with a **three-layer strategy** that gives Claude accurate knowledge of the entire dataset without needing to fit every row in the prompt:

### The Problem

A naive approach sends raw rows to the AI:

```
"Here is your data: [{row1}, {row2}, ... {row50}]"
"Question: What is the average revenue?"
```

This breaks down for large files — if you only send 50 rows from a 500,000-row dataset, the AI is analyzing 0.01% of your data. Any answer about totals, averages, distributions, or trends will be wrong.

### The Solution: Statistics + Sampling + Pre-Aggregation

Instead of sending raw data, Chartly computes a **complete statistical profile** of the dataset server-side, then sends that profile to Claude. The statistics are computed over **every single row** — so a 500,000-row file produces the same accurate analysis as a 50-row file.

#### Layer 1: Full-Dataset Statistics

On upload, the server scans every row and computes per-column statistics:

| Column Type | Statistics Computed |
|---|---|
| **Numeric** | min, max, mean, median, sum, std deviation, Q1, Q3, distribution histogram (10 buckets) |
| **Categorical** | unique count, top 20 values with frequencies, null count |

These statistics fit in ~1-2KB regardless of whether the source file has 100 rows or 1 million rows. They give Claude exact answers to questions like "What's the average revenue?" or "What are the most common products?" without seeing a single raw row.

#### Layer 2: Stratified Sampling

Rather than sending the first N rows (which may be unrepresentative — e.g., if data is sorted by date, the first rows only show January), Chartly takes **evenly-spaced samples** across the entire dataset:

```
Dataset:  [row0, row1, row2, ..., row999]
Sample:   [row0, row33, row66, row100, ..., row966, row999]
          ↑                                              ↑
          Covers the full span of the data
```

This gives Claude a representative view of the data format, value ranges, and patterns without bias toward the beginning of the file.

#### Layer 3: Pre-Computed Aggregations

The server automatically detects categorical and numeric columns and pre-computes **group-by aggregations** over the full dataset:

```
Group by "Region":
  North (12,450 rows): Revenue: sum=2,340,000, avg=187.95
  South (8,200 rows):  Revenue: sum=1,560,000, avg=190.24
  West (15,800 rows):  Revenue: sum=3,120,000, avg=197.47
```

These pre-computed aggregations mean Claude can answer "What's the total revenue by region?" with exact numbers — computed from all 36,450 rows — even though only 30 sample rows appear in the prompt.

### How It Chooses a Strategy

| Dataset Size | Strategy | What Claude Sees |
|---|---|---|
| ≤ 200 rows | **Full data** | Every single row (same as a traditional approach) |
| > 200 rows | **Stats + sample + aggregations** | Complete statistics over all rows, 30 representative sample rows, pre-computed group-by results |

### What This Means in Practice

| Scenario | Naive Approach (first 50 rows) | Chartly's Approach |
|---|---|---|
| "What's the total revenue?" | Sum of 50 rows = **wrong** | Pre-computed sum of ALL rows = **correct** |
| "Show revenue by region" | Only regions in first 50 rows | Full aggregation across ALL rows |
| "What's the median salary?" | Median of 50 values | Exact median from sorted full dataset |
| "How many unique products?" | Unique in 50 rows | Exact unique count from full scan |
| "Show the distribution of ages" | Histogram of 50 values | 10-bucket histogram from ALL values |

### Diagram

```
                    ┌─────────────────────────┐
                    │    User uploads file     │
                    │   (any size up to 50MB)  │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │   Server parses ALL rows │
                    │   (no row limit)         │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
   ┌──────────────────┐ ┌──────────────┐ ┌────────────────┐
   │ Compute per-col  │ │  Stratified  │ │ Pre-aggregate  │
   │ statistics       │ │  sampling    │ │ group-by       │
   │ (min/max/mean/   │ │  (30 rows    │ │ results        │
   │  median/sum/     │ │   evenly     │ │ (sum/avg per   │
   │  histogram/      │ │   spaced)    │ │  category)     │
   │  frequencies)    │ │              │ │                │
   └────────┬─────────┘ └──────┬───────┘ └───────┬────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Compact prompt     │
                    │  (~3-5KB total)     │
                    │  fits ANY model's   │
                    │  context window     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Claude analyzes    │
                    │  with full-dataset  │
                    │  accuracy           │
                    └─────────────────────┘
```

### Key Design Decisions

1. **Statistics are computed at upload time, not query time.** This means the first upload takes a moment longer, but every subsequent question is fast — there's no re-scanning the data per question.

2. **The 200-row threshold is intentional.** Below 200 rows, the full dataset fits easily in the context window, and sending raw data gives Claude maximum flexibility. Above 200, the statistical approach kicks in.

3. **Aggregations are limited to categorical columns with ≤ 50 unique values.** A column with 10,000 unique IDs would generate a massive aggregation table. By capping at 50 unique values, we keep the prompt compact while covering the columns users actually want to group by (region, category, status, etc.).

4. **All processing happens server-side in JavaScript.** No external database, no pandas, no R — just plain loops over the in-memory array. This keeps the deployment simple (just Node.js) while being fast enough for files with hundreds of thousands of rows.

## Architecture

```
Angular Frontend (port 4200)
  ├── FileUpload     → drag/drop upload with validation
  ├── DataPreview    → scrollable table preview
  ├── ChatInterface  → chat messages + sticky input with glow effect
  ├── Message        → user/bot bubbles with markdown (via marked)
  └── Visualization  → Chart.js charts + data tables
        ↓ HTTP
Express Backend (port 3000)
  ├── POST /api/upload  → parse file, compute stats, store in memory
  ├── POST /api/query   → build smart prompt, call Claude, return JSON
  ├── GET  /api/data    → current session data info
  └── GET  /api/health  → health check
        ↓
Claude API → analyzes data, returns { textAnswer, chartData, chartType }
```

## Tech Stack

| Layer    | Technology                                |
|----------|-------------------------------------------|
| Frontend | Angular 21, TypeScript, SCSS, Chart.js, ng2-charts, marked |
| Backend  | Node.js, Express 5, Anthropic SDK, multer |
| Parsing  | xlsx (handles both Excel and CSV)         |
| AI       | Claude Sonnet 4 (claude-sonnet-4-20250514) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- An Anthropic API key - [get one here](https://console.anthropic.com/)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install
npm start
```

Runs at `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npx ng serve
```

Runs at `http://localhost:4200`

### Environment Variables

| Variable            | Description             | Default |
|---------------------|-------------------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key  | -       |
| `PORT`              | Backend server port     | 3000    |

## Usage

1. Open `http://localhost:4200`
2. Upload an Excel or CSV file (drag & drop or click the upload zone)
3. Review the data preview with column names and sample rows
4. Ask a question in the chat input - e.g. *"What are the top products by revenue?"*
5. Get a text answer with an auto-generated chart
6. Toggle between light and dark themes using the button in the bottom-right corner
7. Start a new session anytime with the "New Chat" button in the top-right corner

## Sample Questions

A sample dataset is included at `sample_data/sales_data.csv`. Try these:

| Question | Expected output |
|----------|----------------|
| What are the top products by total revenue? | Bar chart |
| What percentage of revenue comes from each region? | Pie chart |
| Show the revenue trend by month | Line chart |
| What's the average units sold per product? | Bar chart |
| Show a summary of the data | Table / text |

## Design Decisions

- **Angular signals** for reactive state management - no RxJS subjects for local state
- **Server-side statistics** - full dataset is analyzed on upload; queries use pre-computed stats instead of raw rows
- **Stateless queries** - each question sends dataset context (stats + sample) to Claude for self-contained, accurate answers
- **In-memory storage** - data stored in Express `app.locals`, no database needed
- **Structured JSON responses** - Claude returns `{ textAnswer, chartData, chartType }` for clean text/chart separation
- **Theme-aware charts** - chart colors, tooltips, and grid lines adapt to light/dark mode via CSS variables
- **ViewEncapsulation.None** on Message component to style `innerHTML` content from markdown rendering

## Limitations

- Single user, single session - no persistence between browser refreshes
- Files up to 50MB on disk (limited by multer, not by AI context)
- No multi-turn conversation context - each question is independent
- Requires an active Anthropic API key with sufficient quota
- Data stored in server memory only - lost on server restart
