# POS Application (React + Laravel)

This project includes:

- React + TypeScript frontend
- Laravel backend API
- SQLite database
- Myanmar and English language support

## Local Run (Without Docker)

Backend:

```bash
cd backend
composer install
php artisan migrate --force
php artisan db:seed --force
php artisan serve
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Docker Run

```bash
docker compose up --build -d
```

- Frontend: `http://localhost`
- Backend API: `http://localhost:8000/api`

## Default Accounts

- Owner: `admin@pos.com` / `password123`
- Supervisor: `supervisor@pos.com` / `password123`
- Cashier: `cashier@pos.com` / `password123`
