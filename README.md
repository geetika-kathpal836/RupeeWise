# RupeeWise — Personal Finance Tracker with Budgets and Reports

A modern, full-stack personal finance application designed for complete financial visibility, budgeting, and automated tracking.

---

## 📸 Overview & Features

- **🔐 Secure Authentication**: JWT authentication stored in HTTP-only cookies, password hashing with bcrypt, and session validation.
- **📊 Real-Time Dashboard**:
  - Net Balance, Monthly Income, Monthly Expenses, and Savings Rate metrics.
  - Interactive Spending by Category donut chart (Recharts).
  - Monthly Income vs. Expenses comparison bar chart for the entire year.
  - Budget progress bars and Recent Transactions feed.
  - Month-by-month historical selector.
- **💳 Transaction Management**:
  - Full CRUD for income and expenses.
  - Filtering by type, category, payment method (UPI, Debit Card, Credit Card, Bank Transfer, Cash), date range, and text search on notes.
  - Clean pagination.
- **🎯 Category Budgets & Smart Alerts**:
  - Custom spending limits per category per month.
  - Automatic progress tracking (OK, Warning ≥80%, Danger ≥100%).
  - Idempotent budget alert notifications triggered automatically at 80% and 100% thresholds.
- **🔄 Recurring Transactions**:
  - Automated recurrence engine (Daily, Weekly, Monthly, Yearly).
  - Background hourly cron scheduler with unique idempotency keys preventing duplicates.
  - Pause, resume, edit, and delete recurring rules.
- **📈 Reports & Data Export**:
  - Custom date-range summary reports.
  - Monthly spending trends and category breakdown analytics.
  - 1-click **Export to CSV** and formatted **Export to PDF** with tables and summaries.
- **👤 Profile & Settings**:
  - Update full name, monthly income reference, preferred currency, and secure password updates.
  - **Profile Picture Management (Cloudinary)**: Upload, preview, replace, and remove profile pictures with automatic fallback to user name initials.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router v7
- **Styling**: Vanilla CSS Design System + Bootstrap Icons
- **Charts**: Recharts (Pie & Bar charts)
- **Date Handling**: date-fns
- **Notifications**: Sonner (toasts) + In-app notification center
- **HTTP Client**: Axios with credentials & interceptors

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Cloud Storage**: Cloudinary SDK + Multer (memory storage with magic-bytes validation)
- **Security**: Helmet, CORS, bcryptjs, jsonwebtoken, cookie-parser
- **Scheduler**: node-cron (recurring transaction processor)
- **Exports**: json2csv (CSV generation), PDFKit (PDF generation)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on port 27017 or a MongoDB Atlas URI
- Cloudinary Account (free tier works great: https://cloudinary.com)

### 1. Backend Setup
```bash
cd backend
npm install
```

Configure your `.env` file in `backend/`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/RupeeWise
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false
CLIENT_ORIGIN=http://localhost:5173,http://localhost:5174
CRON_SECRET=your_cron_secret

# Cloudinary Configuration for Profile Pictures
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Email Validation (emailvalidation.io)
EMAILVALIDATION_API_KEY=your_emailvalidation_api_key_here
```

#### ☁️ Configuring Cloudinary for Profile Pictures
1. Sign up for a free account at [Cloudinary](https://cloudinary.com/).
2. In the Cloudinary Dashboard (Console), locate your **Cloud Name**, **API Key**, and **API Secret**.
3. Copy these credentials into `backend/.env`.

#### ✉️ Configuring emailvalidation.io for Signup
1. Sign up for a free API key at [emailvalidation.io](https://emailvalidation.io/).
2. Add `EMAILVALIDATION_API_KEY=your_api_key` to `backend/.env`.
3. During user signup (`POST /api/auth/signup`), the server verifies:
   - Email format correctness.
   - Mail server / MX record availability.
   - Deliverability state (rejects undeliverable addresses and offers suggestions if available, e.g. "Did you mean...?").
   - Blocks disposable/temporary email domains.
   - Graceful fail-open fallback if the API key is unconfigured or if the service times out.
4. **Security Notice**:
   - The Cloudinary API Secret is strictly server-side and is never exposed in frontend code, client bundles, or API responses.
   - Uploads are sent to the authenticated Express endpoint `POST /api/users/profile-picture` using Multer memory storage.
   - Files are validated using both MIME type and binary **magic bytes** (JPEG, PNG, WebP only, 5 MB maximum).
   - Images are automatically organized in Cloudinary under `rupeewise/profile-pictures` and transformed into optimized 400x400 face-centered avatars.
   - Replacing or deleting a picture safely cleans up the old Cloudinary asset to avoid orphaned files.

Start the backend development server:
```bash
npm run dev
```
The server will run on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend/RupeeWise
npm install
npm run dev
```
The client will run on `http://localhost:5173`.

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/signup` | POST | Register new user + seed default categories |
| `/api/auth/login` | POST | Authenticate user & issue JWT cookie |
| `/api/auth/logout` | POST | Clear authentication cookie |
| `/api/auth/me` | GET | Retrieve authenticated user profile |
| `/api/transactions` | GET, POST | List transactions with filters / Create transaction |
| `/api/transactions/:id` | GET, PUT, DELETE | Retrieve, update, or remove a transaction |
| `/api/categories` | GET, POST | List user categories / Create custom category |
| `/api/categories/:id` | PUT, DELETE | Update or delete category |
| `/api/budgets` | GET, POST | Get category budgets with spending / Set budget |
| `/api/budgets/:id` | PUT, DELETE | Update limit or delete budget |
| `/api/recurring-transactions` | GET, POST | List / Create recurring transaction rule |
| `/api/recurring-transactions/:id` | PUT, DELETE | Edit or delete recurring transaction |
| `/api/recurring-transactions/:id/toggle` | PATCH | Pause or activate recurring rule |
| `/api/reports/summary` | GET | Monthly financial summary for dashboard |
| `/api/reports/summary-range` | GET | Custom date-range summary |
| `/api/reports/by-category` | GET | Category breakdown with percentage share |
| `/api/reports/monthly-trend` | GET | 12-month income vs expense trend |
| `/api/reports/export` | GET | Export transactions as CSV or PDF |
| `/api/notifications` | GET | List budget notifications |
| `/api/notifications/:id/read` | PATCH | Mark single notification as read |
| `/api/notifications/read-all` | PATCH | Mark all notifications as read |
| `/api/users/me` | PUT | Update name, currency, monthly income |
| `/api/users/me/password` | PUT | Change password |
| `/api/users/profile-picture` | POST | Upload or replace user profile picture (max 5 MB) |
| `/api/users/profile-picture` | DELETE | Remove user profile picture and restore initials |

