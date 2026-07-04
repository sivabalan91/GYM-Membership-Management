# IRONLOG API

Node.js + Express + MySQL backend for the IRONLOG Gym Membership Management System.

## Setup

```bash
npm install
cp .env.example .env   # fill in your DB credentials and a real JWT_SECRET
mysql -u root -p < db/schema.sql
npm run dev             # or: npm start
```

Server runs on `http://localhost:4000` by default. Health check: `GET /api/health`.

## Auth model

- `POST /api/auth/register` — public self-registration, always creates a `member` account.
- `POST /api/auth/login` — returns a JWT containing `{ id, role, branch_id }`.
- Admin and trainer accounts are created by an admin via `POST /api/users` (role-protected).
- Every protected route requires `Authorization: Bearer <token>`.

## Route map

| Resource      | Base path              | Notes |
|---------------|-------------------------|-------|
| Auth          | `/api/auth`             | register, login, me |
| Users         | `/api/users`             | admin/trainer management, trainer↔member assignment |
| Plans/Memberships | `/api/memberships`  | plans, subscribe, cancel w/ prorated refund |
| Classes/Bookings | `/api/classes`        | schedule, book, cancel w/ waitlist promotion |
| Attendance    | `/api/attendance`       | QR generation + scan check-in/out |
| Payments      | `/api/payments`         | order creation, verification, revenue analytics |
| Lockers       | `/api/lockers`          | assign/release |
| Progress      | `/api/progress`         | weight/BMI/body-fat logs |

## Roles

`admin` · `trainer` · `member` — enforced per-route via `middleware/auth.js`'s `authorize(...)`.

## Payment gateway

`controllers/paymentController.js` is gateway-agnostic with stubbed order creation/verification.
Swap the stub blocks for the real Razorpay or Stripe SDK calls (signature verification included as a comment).

## Next steps to wire up the frontend

1. Point the dashboard HTML/JS at this API's base URL (e.g. `http://localhost:4000/api`).
2. Replace the mock data in `admin.html` / `trainer.html` / `member.html` with `fetch()` calls
   to the endpoints above, using the JWT from `/api/auth/login` in an `Authorization` header.
3. Add a QR scanner page for front-desk check-in calling `POST /api/attendance/scan`.
