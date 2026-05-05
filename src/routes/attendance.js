const express = require('express');
const db = require('../db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, allowRoles('admin', 'worker'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT a.attendance_id, a.status, a.marked_at, a.remarks,
              s.roll_no, u.name AS student_name, m.meal_date, m.meal_type
       FROM attendance a
       JOIN students s ON s.student_id = a.student_id
       JOIN users u ON u.user_id = s.user_id
       JOIN meals m ON m.meal_id = a.meal_id
       ORDER BY m.meal_date DESC, m.meal_type, u.name`
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.get('/mine', authenticate, allowRoles('student'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT a.attendance_id, a.status, a.marked_at, a.remarks, m.meal_id, m.meal_date, m.meal_type
       FROM attendance a
       JOIN meals m ON m.meal_id = a.meal_id
       JOIN students s ON s.student_id = a.student_id
       WHERE s.user_id = $1
       ORDER BY m.meal_date DESC, m.meal_type`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post('/mark', authenticate, allowRoles('student'), async (req, res, next) => {
  try {
    const { mealId, status, remarks } = req.body;

    if (!mealId || !['IN', 'OUT'].includes(status)) {
      return res.status(400).json({ message: 'Meal and IN/OUT status are required.' });
    }

    const studentResult = await db.query('SELECT student_id FROM students WHERE user_id = $1', [req.user.id]);
    const student = studentResult.rows[0];

    if (!student) {
      return res.status(404).json({ message: 'Student profile was not found.' });
    }

    const result = await db.query(
      `INSERT INTO attendance (student_id, meal_id, status, remarks)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, meal_id)
       DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, marked_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [student.student_id, mealId, status, remarks || null]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.post('/mark-for-student', authenticate, allowRoles('admin', 'worker'), async (req, res, next) => {
  try {
    const { studentId, mealId, status, remarks } = req.body;

    if (!studentId || !mealId || !['IN', 'OUT'].includes(status)) {
      return res.status(400).json({ message: 'Student, meal, and IN/OUT status are required.' });
    }

    const result = await db.query(
      `INSERT INTO attendance (student_id, meal_id, status, remarks)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, meal_id)
       DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, marked_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [studentId, mealId, status, remarks || null]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
