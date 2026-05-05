const express = require('express');
const db = require('../db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT w.worker_id, u.name, u.email, w.job_title, w.shift, w.phone, w.salary
       FROM workers w
       JOIN users u ON u.user_id = w.user_id
       ORDER BY w.worker_id`
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    const { name, email, password, jobTitle, shift, phone, salary } = req.body;

    if (!name || !email || !password || !jobTitle || !shift) {
      return res.status(400).json({ message: 'Missing required worker information.' });
    }

    const userResult = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'worker')
       RETURNING user_id, name, email, role`,
      [name, email, password]
    );

    const workerResult = await db.query(
      `INSERT INTO workers (user_id, job_title, shift, phone, salary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userResult.rows[0].user_id, jobTitle, shift, phone || null, salary || 0]
    );

    return res.status(201).json({ user: userResult.rows[0], worker: workerResult.rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM users
       WHERE user_id = (SELECT user_id FROM workers WHERE worker_id = $1)
       RETURNING user_id`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Worker was not found.' });
    }

    return res.json({ message: 'Worker deleted.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
