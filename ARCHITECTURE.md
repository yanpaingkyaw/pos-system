# POS Application Architecture

## 1) Project Goals

This POS system is designed for:

- Product Management (CRUD)
- Product Category Management (CRUD)
- Sale Management
- Order Management (Online Orders)
- Invoice and Receipt (HTML thermal print)
- User and Role Management (Owner/Supervisor/Cashier)
- Myanmar and English language support
- Reports (Products, Sales, Orders)

The solution is optimized for lightweight deployment on a low-budget DigitalOcean server.

---

## 2) Final Architecture

### Frontend

- **React + TypeScript + Vite**
- SPA routing with `react-router-dom`
- API communication with `axios`
- State with `zustand`
- i18n with `i18next` + `react-i18next`

### Backend

- **Laravel 12 (PHP 8.2)**
- REST API in `routes/api.php`
- Token-based API auth (Bearer token via `api_token`)
- Role middleware (`owner`, `supervisor`, `cashier`)

### Database

- **SQLite** (single-file DB)
- Cost-effective and simple for small/medium POS deployment

### Deployment

- Dockerized frontend + backend
- Nginx for frontend serving and reverse proxy
- Suitable for **DigitalOcean Droplet 1GB RAM** low-cost setup

---

## 3) High-Level System Diagram

```text
[ React Frontend ]
        |
        | HTTP (JSON / multipart)
        v
[ Laravel API ]
        |
        | Eloquent ORM
        v
[ SQLite database.sqlite ]
```

---

## 4) Database Design (Core Tables)

- `roles`
- `users` (includes `role_id`, `api_token`)
- `categories`
- `products`
- `sales`
- `sale_items`
- `orders`
- `order_items`
- `shop_settings` (shop name, logo, receipt header)

---

## 5) Role and Permission Rules

- **Owner**
  - Full system access
  - User management
  - Shop settings (shop name/logo/header)
  - Product quantity changes
- **Supervisor**
  - Product/category/sales/orders operations
  - Product quantity changes
- **Cashier**
  - Sales operations

---

## 6) API Design Summary

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Master Data

- `apiResource /api/categories`
- Product routes:
  - `GET /api/products`
  - `POST /api/products`
  - `GET /api/products/{product}`
  - `PUT /api/products/{product}`
  - `DELETE /api/products/{product}`
  - `PATCH /api/products/{product}/quantity`

### Transactions

- Sales:
  - `GET /api/sales`
  - `POST /api/sales`
  - `GET /api/sales/{sale}`
- Orders:
  - `apiResource /api/orders`

### Management and Reports

- `apiResource /api/users` (owner only)
- Reports:
  - `GET /api/reports/overview`
  - `GET /api/reports/sales`
  - `GET /api/reports/products`
  - `GET /api/reports/orders`
- Shop settings:
  - `GET /api/shop-settings`
  - `POST /api/shop-settings` (owner only)

---

## 7) UX and Receipt Design Decisions

- POS sale screen redesigned to terminal style:
  - Product grid (left)
  - Ticket panel (right)
  - Category chips + quick category strip
  - Real product image support
- Receipt enhancements:
  - 80mm thermal print layout
  - Shop name/logo/header from admin settings
  - Cashier name and payment method line
  - QR code at receipt bottom

---

## 8) DigitalOcean Low-Budget Recommendation

- Start with **1 vCPU / 1GB RAM Droplet**
- Use Docker Compose with this repository
- Keep SQLite for low operational cost
- Scale later by moving DB to managed PostgreSQL if needed
