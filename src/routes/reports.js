const express = require('express');
const db = require('../db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, allowRoles('admin', 'worker'), async (req, res, next) => {
  try {
    const [students, workers, todaysMeals, feedbackOpen, unpaidBills] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM students'),
      db.query('SELECT COUNT(*)::int AS count FROM workers'),
      db.query('SELECT COUNT(*)::int AS count FROM meals WHERE meal_date = CURRENT_DATE'),
      db.query("SELECT COUNT(*)::int AS count FROM feedback WHERE status = 'open'"),
      db.query("SELECT COUNT(*)::int AS count FROM bills WHERE status != 'paid'"),
    ]);

    return res.json({
      students: students.rows[0].count,
      workers: workers.rows[0].count,
      todaysMeals: todaysMeals.rows[0].count,
      openFeedback: feedbackOpen.rows[0].count,
      unpaidBills: unpaidBills.rows[0].count,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/daily', authenticate, allowRoles('admin', 'worker'), async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await db.query(
      `SELECT m.meal_date, m.meal_type, m.planned_count,
              COUNT(a.attendance_id)::int AS marked_count,
              COUNT(*) FILTER (WHERE a.status = 'IN')::int AS in_count,
              COUNT(*) FILTER (WHERE a.status = 'OUT')::int AS out_count
       FROM meals m
       LEFT JOIN attendance a ON a.meal_id = m.meal_id
       WHERE m.meal_date = $1
       GROUP BY m.meal_id
       ORDER BY m.meal_type`,
      [date]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.get('/monthly', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();
    const result = await db.query(
      `SELECT b.bill_month, b.bill_year, COUNT(*)::int AS total_bills,
              SUM(b.meal_count)::int AS total_meals,
              SUM(b.total_amount)::numeric(10, 2) AS total_amount,
              SUM(CASE WHEN b.status = 'paid' THEN b.total_amount ELSE 0 END)::numeric(10, 2) AS paid_value
       FROM bills b
       WHERE b.bill_month = $1 AND b.bill_year = $2
       GROUP BY b.bill_month, b.bill_year`,
      [month, year]
    );
    return res.json(result.rows[0] || {
      bill_month: month,
      bill_year: year,
      total_bills: 0,
      total_meals: 0,
      total_amount: 0,
      paid_value: 0,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
