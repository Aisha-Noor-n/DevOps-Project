const state = {
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  meals: [],
  students: [],
  bills: [],
};

const demoAccounts = {
  admin: ['admin@mess.edu', 'admin123'],
  student: ['ali.khan@student.edu', 'student123'],
  worker: ['bilal.worker@mess.edu', 'worker123'],
};

const $ = (id) => document.getElementById(id);

function showMessage(text) {
  const box = $('message');
  box.textContent = text;
  box.classList.remove('hidden');
  window.setTimeout(() => box.classList.add('hidden'), 3000);
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: state.token ? `Bearer ${state.token}` : '',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  updateShell();
  loadAll();
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateShell();
}

function updateShell() {
  const signedIn = Boolean(state.token && state.user);
  $('loginPanel').classList.toggle('hidden', signedIn);
  $('appPanel').classList.toggle('hidden', !signedIn);

  if (!signedIn) return;

  $('sessionUser').textContent = `${state.user.name} (${state.user.role})`;
  $('rolePill').textContent = state.user.role.toUpperCase();

  document.querySelectorAll('.admin-only').forEach((node) => {
    node.classList.toggle('hidden', state.user.role !== 'admin');
  });
  document.querySelectorAll('.student-only').forEach((node) => {
    node.classList.toggle('hidden', state.user.role !== 'student');
  });
  document.querySelectorAll('.admin-worker-only').forEach((node) => {
    node.classList.toggle('hidden', !['admin', 'worker'].includes(state.user.role));
  });
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((btn) => btn.classList.remove('active'));
  $(`${viewName}View`).classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
  $('viewTitle').textContent = document.querySelector(`[data-view="${viewName}"]`).textContent;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, { style: 'currency', currency: 'PKR' });
}

function statusTag(value) {
  const css = String(value).toLowerCase();
  return `<span class="tag ${css}">${value}</span>`;
}

async function loadDashboard() {
  if (!['admin', 'worker'].includes(state.user.role)) {
    $('studentCount').textContent = '-';
    $('workerCount').textContent = '-';
    $('todayMealCount').textContent = state.meals.length;
    $('openFeedbackCount').textContent = '-';
    $('unpaidBillCount').textContent = '-';
    return;
  }

  const report = await api('/reports/dashboard');
  $('studentCount').textContent = report.students;
  $('workerCount').textContent = report.workers;
  $('todayMealCount').textContent = report.todaysMeals;
  $('openFeedbackCount').textContent = report.openFeedback;
  $('unpaidBillCount').textContent = report.unpaidBills;
}

async function loadMeals() {
  state.meals = await api('/meals');
  $('attendanceMealSelect').innerHTML = state.meals
    .map((meal) => `<option value="${meal.meal_id}">${formatDate(meal.meal_date)} - ${meal.meal_type}</option>`)
    .join('');
  $('adminAttendanceMealSelect').innerHTML = $('attendanceMealSelect').innerHTML;

  $('mealCards').innerHTML = state.meals
    .map((meal) => `
      <article class="info-card">
        <h4>${meal.meal_type.toUpperCase()}</h4>
        <p>${formatDate(meal.meal_date)}</p>
        <p>Planned: ${meal.planned_count}</p>
        <p>Cost: ${money(meal.cost_per_student)}</p>
      </article>
    `)
    .join('');
}

async function loadAttendance() {
  const path = state.user.role === 'student' ? '/attendance/mine' : '/attendance';
  const rows = await api(path);
  $('attendanceTable').innerHTML = rows
    .map((row) => `
      <tr>
        <td>${row.student_name || state.user.name}</td>
        <td>${row.meal_type}</td>
        <td>${formatDate(row.meal_date)}</td>
        <td>${statusTag(row.status)}</td>
        <td>${row.remarks || ''}</td>
      </tr>
    `)
    .join('');
}

async function loadStudents() {
  if (!['admin', 'worker'].includes(state.user.role)) return;
  state.students = await api('/students');
  $('adminAttendanceStudentSelect').innerHTML = state.students
    .map((row) => `<option value="${row.student_id}">${row.roll_no} - ${row.name}</option>`)
    .join('');

  $('studentsTable').innerHTML = state.students
    .map((row) => `
      <tr>
        <td>${row.roll_no}</td>
        <td>${row.name}</td>
        <td>${row.department}</td>
        <td>${row.room_no}</td>
        <td>${row.email}</td>
        <td class="admin-only">
          <button class="danger-btn" data-delete-student="${row.student_id}">Delete</button>
        </td>
      </tr>
    `)
    .join('');
  updateShell();
}

async function loadWorkers() {
  if (state.user.role !== 'admin') return;
  const rows = await api('/workers');
  $('workersTable').innerHTML = rows
    .map((row) => `
      <tr>
        <td>${row.name}</td>
        <td>${row.job_title}</td>
        <td>${row.shift}</td>
        <td>${row.phone || ''}</td>
        <td>${money(row.salary)}</td>
        <td><button class="danger-btn" data-delete-worker="${row.worker_id}">Delete</button></td>
      </tr>
    `)
    .join('');
}

async function loadFeedback() {
  if (state.user.role !== 'admin') {
    $('feedbackCards').innerHTML = '<article class="info-card"><h4>Student feedback</h4><p>Your submitted feedback will be visible to the admin dashboard.</p></article>';
    return;
  }

  const rows = await api('/feedback');
  $('feedbackCards').innerHTML = rows
    .map((row) => `
      <article class="info-card">
        <h4>${row.student_name} ${statusTag(row.status)}</h4>
        <p>${row.message}</p>
        <p>Rating: ${row.rating}/5</p>
        <p>
          <button class="secondary-btn" data-feedback-status="${row.feedback_id}" data-status="reviewed">Review</button>
          <button class="secondary-btn" data-feedback-status="${row.feedback_id}" data-status="resolved">Resolve</button>
        </p>
      </article>
    `)
    .join('');
}

async function loadBills() {
  state.bills = await api('/bills');
  $('paymentBillSelect').innerHTML = state.bills
    .map((row) => `<option value="${row.bill_id}">${row.student_name} - ${row.bill_month}/${row.bill_year} - ${money(row.total_amount)}</option>`)
    .join('');

  $('billsTable').innerHTML = state.bills
    .map((row) => `
      <tr>
        <td>${row.student_name}</td>
        <td>${row.bill_month}/${row.bill_year}</td>
        <td>${row.meal_count}</td>
        <td>${money(row.total_amount)}</td>
        <td>${money(row.paid_amount)}</td>
        <td>${statusTag(row.status)}</td>
      </tr>
    `)
    .join('');
}

async function loadReports() {
  if (!['admin', 'worker'].includes(state.user.role)) return;
  const date = $('reportDateInput').value || new Date().toISOString().slice(0, 10);
  $('reportDateInput').value = date;
  const dailyRows = await api(`/reports/daily?date=${date}`);

  $('dailyReportCards').innerHTML = dailyRows
    .map((row) => `
      <article class="info-card">
        <h4>${row.meal_type.toUpperCase()}</h4>
        <p>Planned: ${row.planned_count}</p>
        <p>IN: ${row.in_count} | OUT: ${row.out_count}</p>
        <p>Marked: ${row.marked_count}</p>
      </article>
    `)
    .join('');

  if (state.user.role === 'admin') {
    const monthly = await api('/reports/monthly?month=4&year=2026');
    $('monthlyReportCard').innerHTML = `
      <h4>April 2026</h4>
      <p>Total bills: ${monthly.total_bills}</p>
      <p>Total meals: ${monthly.total_meals}</p>
      <p>Total amount: ${money(monthly.total_amount)}</p>
      <p>Paid value: ${money(monthly.paid_value)}</p>
    `;
  }
}

async function loadAll() {
  try {
    updateShell();
    await loadMeals();
    await Promise.all([
      loadDashboard(),
      loadAttendance(),
      loadStudents(),
      loadWorkers(),
      loadFeedback(),
      loadBills(),
      loadReports(),
    ]);
  } catch (error) {
    showMessage(error.message);
  }
}

function bindEvents() {
  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: $('emailInput').value,
          password: $('passwordInput').value,
        }),
      });
      setSession(data.token, data.user);
    } catch (error) {
      showMessage(error.message);
    }
  });

  document.querySelectorAll('[data-login]').forEach((button) => {
    button.addEventListener('click', () => {
      const [email, password] = demoAccounts[button.dataset.login];
      $('emailInput').value = email;
      $('passwordInput').value = password;
    });
  });

  $('logoutBtn').addEventListener('click', clearSession);

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  $('refreshAttendanceBtn').addEventListener('click', loadAttendance);
  $('reportDateInput').addEventListener('change', loadReports);

  $('markAttendanceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({
        mealId: $('attendanceMealSelect').value,
        status: $('attendanceStatusSelect').value,
        remarks: $('attendanceRemarksInput').value,
      }),
    });
    showMessage('Attendance marked.');
    await loadAttendance();
  });

  $('adminAttendanceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/attendance/mark-for-student', {
      method: 'POST',
      body: JSON.stringify({
        studentId: $('adminAttendanceStudentSelect').value,
        mealId: $('adminAttendanceMealSelect').value,
        status: $('adminAttendanceStatusSelect').value,
        remarks: $('adminAttendanceRemarksInput').value,
      }),
    });
    showMessage('Student attendance marked.');
    await Promise.all([loadAttendance(), loadReports()]);
  });

  $('mealForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/meals', {
      method: 'POST',
      body: JSON.stringify({
        mealDate: $('mealDateInput').value,
        mealType: $('mealTypeInput').value,
        plannedCount: Number($('plannedCountInput').value || 0),
        costPerStudent: Number($('costInput').value || 0),
      }),
    });
    event.target.reset();
    showMessage('Meal added.');
    await loadMeals();
  });

  $('studentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/students', {
      method: 'POST',
      body: JSON.stringify({
        name: $('studentNameInput').value,
        email: $('studentEmailInput').value,
        password: $('studentPasswordInput').value,
        rollNo: $('studentRollInput').value,
        department: $('studentDeptInput').value,
        roomNo: $('studentRoomInput').value,
      }),
    });
    event.target.reset();
    showMessage('Student added.');
    await loadStudents();
  });

  $('studentsTable').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-student]');
    if (!button) return;
    await api(`/students/${button.dataset.deleteStudent}`, { method: 'DELETE' });
    showMessage('Student deleted.');
    await Promise.all([loadStudents(), loadAttendance(), loadBills(), loadDashboard()]);
  });

  $('workerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/workers', {
      method: 'POST',
      body: JSON.stringify({
        name: $('workerNameInput').value,
        email: $('workerEmailInput').value,
        password: $('workerPasswordInput').value,
        jobTitle: $('workerJobInput').value,
        shift: $('workerShiftInput').value,
        salary: Number($('workerSalaryInput').value || 0),
      }),
    });
    event.target.reset();
    showMessage('Worker added.');
    await loadWorkers();
  });

  $('workersTable').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-worker]');
    if (!button) return;
    await api(`/workers/${button.dataset.deleteWorker}`, { method: 'DELETE' });
    showMessage('Worker deleted.');
    await Promise.all([loadWorkers(), loadDashboard()]);
  });

  $('feedbackForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/feedback', {
      method: 'POST',
      body: JSON.stringify({
        rating: Number($('ratingInput').value),
        message: $('feedbackMessageInput').value,
      }),
    });
    event.target.reset();
    showMessage('Feedback sent.');
  });

  $('feedbackCards').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-feedback-status]');
    if (!button) return;
    await api(`/feedback/${button.dataset.feedbackStatus}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: button.dataset.status }),
    });
    showMessage('Feedback updated.');
    await Promise.all([loadFeedback(), loadDashboard()]);
  });

  $('generateBillsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = await api('/bills/generate', {
      method: 'POST',
      body: JSON.stringify({
        month: Number($('billMonthInput').value),
        year: Number($('billYearInput').value),
      }),
    });
    showMessage(`${result.generated} bills generated.`);
    await Promise.all([loadBills(), loadReports(), loadDashboard()]);
  });

  $('paymentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api(`/bills/${$('paymentBillSelect').value}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount: Number($('paymentAmountInput').value),
        method: $('paymentMethodInput').value,
        referenceNo: $('paymentReferenceInput').value,
      }),
    });
    event.target.reset();
    showMessage('Payment recorded.');
    await Promise.all([loadBills(), loadReports(), loadDashboard()]);
  });
}

bindEvents();
updateShell();
if (state.token && state.user) {
  loadAll();
}
