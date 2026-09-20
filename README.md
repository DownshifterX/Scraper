# Product Price Tracker

A full-stack web application designed to scrape and track product prices and stock from the INE mock store.

## Features
- **Product Tracking**: Add products from the INE mock store to be tracked.
- **Automated Scraping**: Scheduled scraping via cron-job.org every 2 hours.
- **Robust Scraper**: Built with Playwright to render JavaScript and handle slow, error-prone mock responses with retries and exponential backoff.
- **Data Integrity**: Validates all scraped data; never overwrites valid historical data with failed attempts.
- **Dashboard**: View active tracked products, current price/stock, price history, and a detailed scrape log for each product.
- **Headed Mode Demo**: Includes a script to run the scraper in headed mode for demonstration.

## Architecture & Tech Stack
- **Frontend**: React (Vite, TypeScript, TailwindCSS), deployed on Vercel.
- **Backend**: Node.js (Express, TypeScript), deployed on Render.
- **Database**: Supabase PostgreSQL.
- **Scraping**: Playwright.
- **Scheduling**: cron-job.org HTTP triggers.

## Setup Instructions

### Environment Variables
Create a `.env` file in the `backend` directory based on `backend/.env.example`.
Create a `.env` file in the `frontend` directory based on `frontend/.env.example`.

### Supabase Database
1. Create a new Supabase project.
2. Run the SQL script from `schema.sql` in the Supabase SQL Editor.

### Local Development
**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm run dev
```

## Running the Headed Scraper
To demonstrate the scraper handling slow or failing responses interactively:
```bash
cd backend
npm run scrape:headed
```

## Deployment
- **Frontend**: Connect the GitHub repository to Vercel and set the Root Directory to `frontend`. Add `VITE_API_URL` to environment variables.
- **Backend**: Connect the GitHub repository to Render as a Web Service. Set the Root Directory to `backend`. Add all backend environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `PORT`).
- **Cron**: Set up a job on cron-job.org pointing to `https://your-render-url.onrender.com/api/cron/scrape` with method POST and Header `Authorization: Bearer <YOUR_CRON_SECRET>`, running every 120 minutes.

## Known Limitations
- The mock store occasionally forces failures. The application handles this gracefully by retrying and finally logging a failure without corrupting data.
- The scraper runs sequentially to prevent overloading the free-tier Render instance.
