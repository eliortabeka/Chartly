<p align="center">
  <img src="logo.png" alt="Chartly" width="280" />
</p>

<p align="center">Upload your data. Ask questions. Get instant answers and visualizations — powered by Claude AI.</p>

Chartly is a full-stack web app that lets you upload Excel or CSV files and have a natural language conversation about your data. Claude AI analyzes the dataset and returns text answers with auto-generated charts.

## Features

- **Drag & drop upload** — supports .xlsx, .xls, and .csv files (up to 50MB)
- **Data preview** — instantly see columns and sample rows after upload
- **AI-powered Q&A** — ask questions in plain English, get structured answers
- **Auto visualizations** — bar, pie, and line charts generated based on your question
- **Light & dark themes** — toggle between themes, persisted in localStorage
- **Cancel requests** — stop a running query and remove it from chat history
- **Responsive design** — works across desktop, tablet, and mobile
- **Markdown rendering** — bot responses support full markdown formatting

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
  ├── POST /api/upload  → parse file (xlsx), store in memory
  ├── POST /api/query   → build prompt, call Claude, return JSON
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
- An Anthropic API key — [get one here](https://console.anthropic.com/)

### Backend

```bash
cd backend
# Add this API key to .env:
#   ANTHROPIC_API_KEY=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
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
| `ANTHROPIC_API_KEY` | Your Anthropic API key  | —       |
| `PORT`              | Backend server port     | 3000    |

## Usage

1. Open `http://localhost:4200`
2. Upload an Excel or CSV file (drag & drop or click the upload zone)
3. Review the data preview with column names and sample rows
4. Ask a question in the chat input — e.g. *"What are the top products by revenue?"*
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

- **Angular signals** for reactive state management — no RxJS subjects for local state
- **Stateless queries** — each question sends full dataset context to Claude for self-contained, accurate answers
- **In-memory storage** — data stored in Express `app.locals`, no database needed
- **Structured JSON responses** — Claude returns `{ textAnswer, chartData, chartType }` for clean text/chart separation
- **Theme-aware charts** — chart colors, tooltips, and grid lines adapt to light/dark mode via CSS variables
- **ViewEncapsulation.None** on Message component to style `innerHTML` content from markdown rendering

## Limitations

- Single user, single session — no persistence between browser refreshes
- Files capped at 1000 rows sent to Claude (context window management)
- No multi-turn conversation context — each question is independent
- Requires an active Anthropic API key with sufficient quota
- Data stored in server memory only — lost on server restart
