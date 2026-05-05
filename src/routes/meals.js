const express = require('express');
const db = require('../db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT meal_id, meal_date, meal_type, planned_count, cost_per_student
       FROM meals
       ORDER BY meal_date DESC, meal_type`
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, allowRoles('admin', 'worker'), async (req, res, next) => {
  try {
    const { mealDate, mealType, plannedCount, costPerStudent } = req.body;

    if (!mealDate || !mealType) {
      return res.status(400).json({ message: 'Meal date and type are required.' });
    }

    const result = await db.query(
      `INSERT INTO meals (meal_date, meal_type, planned_count, cost_per_student)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [mealDate, mealType, plannedCount || 0, costPerStudent || 0]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
