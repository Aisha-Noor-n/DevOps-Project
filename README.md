<<<<<<< HEAD
# Mess In/Out Management System

A web-based meal attendance system for hostels, universities, and cafeteria mess facilities. It supports student IN/OUT marking, admin monitoring, worker management, feedback, reports, billing records, and role-based access.

## Technology

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: PostgreSQL
- API style: REST

## Project Structure

```text
data.sql
package.json
src/
  db.js
  server.js
  middleware/
    auth.js
  routes/
    attendance.js
    auth.js
    bills.js
    feedback.js
    meals.js
    reports.js
    students.js
    workers.js
public/
  index.html
  styles.css
  app.js
```

## Database Setup

Create the PostgreSQL database:

```bash
createdb mess_in_out_system
psql -d mess_in_out_system -f data.sql
```

If you use pgAdmin, create a database named `mess_in_out_system`, open the query tool, and run the contents of `data.sql`.

## App Setup

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
copy .env.example .env
```

Update `.env` with your PostgreSQL password:

```text
PORT=3000
DATABASE_URL=postgres://postgres:your_password@localhost:5433/mess_in_out_system
JWT_SECRET=change-this-secret
```

Start the server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Demo Logins

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@mess.edu | admin123 |
| Student | ali.khan@student.edu | student123 |
| Worker | bilal.worker@mess.edu | worker123 |

## Main Features

- Student registration and authentication
- Meal IN/OUT attendance marking
- Admin dashboard with operational counts
- Worker/staff management
- Student feedback system
- Automated attendance records
- PostgreSQL-driven record management
- Daily and monthly reports
- Role-based access control
- Billing and payment records
- Admin/worker attendance marking for any student
- Admin bill generation from marked IN meals
- Admin feedback review/resolution
- Admin student and worker removal

## Notes

The seed data uses plain demo passwords so the project is easy to run for presentation. For real deployment, these would be stored as bcrypt password hashes and would update the login route to verify hashes.
=======
# DevOps-Project
>>>>>>> 9facabeb2b22a5c5e9d4c18791842843c24defc3
