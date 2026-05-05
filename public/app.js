/* ─── State ──────────────────────────────────────────── */
const state = {
  token: localStorage.getItem('token'),
  user:  JSON.parse(localStorage.getItem('user') || 'null'),
  meals: [], students: [], bills: [],
  _myAttendance: [], _allAttendance: [], _allStudents: [],
  selectedRole: null, payMethod: 'easypaisa', selectedRating: 5,
  _confirmCallback: null,
};

/* ─── Helpers ────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmt = d => d ? new Date(d).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}) : '—';
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}) : '—';
const money = v => 'PKR ' + Number(v||0).toLocaleString('en-PK');
const initials = n => (n||'U').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const capitalize = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
const monthName = m => ['','January','February','March','April','May','June','July','August','September','October','November','December'][m]||m;

function badge(val) {
  const cls = String(val).toLowerCase().replace(/[^a-z]/g,'');
  return `<span class="badge badge-${cls}">${val}</span>`;
}

function showMsg(id, text, type='success') {
  const el=$(id); if(!el) return;
  el.className=`msg-bar ${type}`; el.textContent=text;
  setTimeout(()=>{ el.className='msg-bar'; el.textContent=''; }, 4500);
}

function emptyRow(cols, msg='No records found') {
  return `<tr><td colspan="${cols}" class="empty-state-cell"><div class="empty-state">📭<div>${msg}</div></div></td></tr>`;
}

async function api(path, opts={}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type':'application/json',
      Authorization: state.token ? `Bearer ${state.token}` : '',
      ...(opts.headers||{}),
    },
  });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.message||'Request failed.');
  return data;
}

/* ─── Confirm modal (replaces browser confirm()) ─────── */
function openConfirm(title, msg, onOk) {
  $('confirmTitle').textContent = title;
  $('confirmMsg').textContent   = msg;
  state._confirmCallback = onOk;
  $('confirmModal').classList.add('open');
  $('confirmOk').onclick = () => { closeConfirm(); onOk(); };
}
function closeConfirm() { $('confirmModal').classList.remove('open'); }

/* ─── Skeleton helpers ───────────────────────────────── */
function skeletonRows(cols, count=4) {
  return Array(count).fill(0).map(()=>
    `<tr>${Array(cols).fill(0).map(()=>`<td><div class="skeleton-line"></div></td>`).join('')}</tr>`
  ).join('');
}

/* ─── Auth ───────────────────────────────────────────── */
function showSignup() {
  document.querySelector('.login-card:not(#signupCard)').classList.add('hidden');
  $('signupCard').classList.remove('hidden');
}
function showLogin() {
  $('signupCard').classList.add('hidden');
  document.querySelector('.login-card:not(#signupCard)').classList.remove('hidden');
}

async function doRegister() {
  $('regErr').textContent = '';
  const name = $('regName').value.trim();
  const email = $('regEmail').value.trim();
  const rollNo = $('regRollNo').value.trim();
  const roomNo = $('regRoomNo').value.trim();
  const department = $('regDept').value.trim();
  const phone = $('regPhone').value.trim();
  const password = $('regPassword').value;
  const confirm = $('regConfirm').value;
  if (!name||!email||!rollNo||!roomNo||!department||!password)
    { $('regErr').textContent='Please fill in all required fields.'; return; }
  if (password !== confirm)
    { $('regErr').textContent='Passwords do not match.'; return; }
  if (password.length < 6)
    { $('regErr').textContent='Password must be at least 6 characters.'; return; }
  try {
    await api('/auth/register',{method:'POST',body:JSON.stringify({name,email,password,rollNo,department,roomNo,phone})});
    $('regErr').style.color='var(--accent)';
    $('regErr').textContent='Account created! You can now sign in.';
    setTimeout(()=>{ $('regErr').style.color=''; showLogin(); $('loginEmail').value=email; },1800);
  } catch(err) { $('regErr').textContent=err.message; }
}

function selectRole(role, el) {
  document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedRole = role;
  const demos = {
    admin:   ['admin@mess.edu',        'admin123'],
    student: ['ali.khan@student.edu',  'student123'],
    worker:  ['bilal.worker@mess.edu', 'worker123'],
  };
  $('loginEmail').value    = demos[role][0];
  $('loginPassword').value = demos[role][1];
}

async function doLogin() {
  const email = $('loginEmail').value.trim();
  const pass  = $('loginPassword').value.trim();
  $('loginErr').textContent = '';
  if (!state.selectedRole) { $('loginErr').textContent='Please select a role first.'; return; }
  try {
    const data = await api('/auth/login',{method:'POST',body:JSON.stringify({email,password:pass})});
    if (data.user.role !== state.selectedRole) {
      $('loginErr').textContent=`This account is a "${data.user.role}". Please select the correct role.`;
      return;
    }
    state.token=data.token; state.user=data.user;
    localStorage.setItem('token',data.token);
    localStorage.setItem('user',JSON.stringify(data.user));
    enterApp();
  } catch(err) { $('loginErr').textContent=err.message; }
}

function logout() {
  state.token=null; state.user=null; state.selectedRole=null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('selected'));
  $('loginEmail').value=''; $('loginPassword').value=''; $('loginErr').textContent='';
  $('loginScreen').classList.remove('hidden');
  ['studentApp','workerApp','adminApp'].forEach(id=>$(id).classList.add('hidden'));
}

function enterApp() {
  $('loginScreen').classList.add('hidden');
  const role = state.user.role;
  const today = new Date().toISOString().slice(0,10);
  if (role==='student') {
    $('studentApp').classList.remove('hidden');
    $('sAvatar').textContent = $('sProfileAv').textContent = initials(state.user.name);
    $('sUserName').textContent = $('sProfileName').textContent = state.user.name;
    loadStudentAll();
  } else if (role==='worker') {
    $('workerApp').classList.remove('hidden');
    $('wAvatar').textContent  = initials(state.user.name);
    $('wUserName').textContent = state.user.name;
    $('wAutoDate').value = $('wMealDate').value = $('wReportDate').value = today;
    loadWorkerAll();
  } else if (role==='admin') {
    $('adminApp').classList.remove('hidden');
    $('aAvatar').textContent  = initials(state.user.name);
    $('aUserName').textContent = state.user.name;
    $('aDashDate').textContent = new Date().toLocaleDateString('en-PK',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    $('aAttendanceDate').value = $('aReportDate').value = today;
    $('aAutoDate').value = today;
    loadAdminAll();
  }
}

/* ─── Nav + page transition ──────────────────────────── */
function showPage(pageId, navEl, appId) {
  const app=$(appId);
  app.querySelectorAll('.page').forEach(p=>{ p.classList.remove('active'); });
  app.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const target=$(pageId);
  target.classList.add('active');
  if (navEl) navEl.classList.add('active');
  // Close mobile sidebar
  const sidebar = app.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('sidebar-open');
}

/* ─── Mobile sidebar toggle ──────────────────────────── */
function toggleSidebar(appId) {
  const sidebar = $( appId==='studentApp'?'sSidebar':appId==='workerApp'?'wSidebar':'aSidebar' );
  sidebar.classList.toggle('sidebar-open');
}

/* ─── Change password (shared) ───────────────────────── */
async function changePassword(msgId) {
  const prefix = msgId[0];
  const curr = $(prefix+'CurrentPass').value;
  const nw   = $(prefix+'NewPass').value;
  const conf = $(prefix+'ConfirmPass').value;
  if (!curr||!nw||!conf) { showMsg(msgId,'Please fill in all fields.','error'); return; }
  if (nw!==conf) { showMsg(msgId,'New passwords do not match.','error'); return; }
  if (nw.length<6) { showMsg(msgId,'Password must be at least 6 characters.','error'); return; }
  try {
    await api('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:curr,newPassword:nw})});
    $(prefix+'CurrentPass').value=''; $(prefix+'NewPass').value=''; $(prefix+'ConfirmPass').value='';
    showMsg(msgId,'Password updated successfully!');
  } catch(err) { showMsg(msgId,err.message,'error'); }
}

/* ══════════════════════════════════════════════════════
   STUDENT
══════════════════════════════════════════════════════ */
async function loadStudentAll() {
  state.meals = await api('/meals');
  await Promise.all([loadStudentAttendance(), loadStudentBills(), loadStudentProfile(), loadStudentNotices()]);
  buildMealCards();
}

/* ── Meal timing window ──────────────────────────────── */
function getMealWindow(type) {
  const now  = new Date();
  const mins = now.getHours()*60 + now.getMinutes();
  if (type==='breakfast') {
    const open = mins>=420 && mins<=540;
    return { open, label:'7:00 – 9:00 AM (on-the-spot only)', hint: open?null: mins<420?'Opens at 7:00 AM':'Closed after 9:00 AM' };
  }
  const open = mins<=720;
  const mealLabel = type==='lunch' ? '12:00 – 2:00 PM' : '7:00 – 9:00 PM';
  return { open, label:`${mealLabel} (mark by 12:00 PM)`, hint: open?null:'Marking closed after 12:00 PM' };
}

function buildMealCards() {
  const today = new Date().toISOString().slice(0,10);
  const todayMeals = state.meals.filter(m=>m.meal_date&&m.meal_date.slice(0,10)===today);
  const mealDefs = [
    {type:'breakfast',icon:'🌅',label:'Breakfast'},
    {type:'lunch',icon:'☀️',label:'Lunch'},
    {type:'dinner',icon:'🌙',label:'Dinner'},
  ];
  const todayAttended = (state._myAttendance||[]).filter(r=>r.meal_date&&r.meal_date.slice(0,10)===today);

  $('sMealCards').innerHTML = mealDefs.map(def=>{
    const meal     = todayMeals.find(m=>m.meal_type===def.type);
    const attended = meal ? todayAttended.find(a=>a.meal_id===meal.meal_id) : null;
    const noMeal   = !meal;
    const win      = getMealWindow(def.type);

    let cardCls='', statusHtml='';
    if (noMeal) { statusHtml=`<span class="badge badge-muted">Not scheduled</span>`; cardCls='no-meal'; }
    else if (attended) { statusHtml=badge(attended.status); cardCls=attended.status==='IN'?'marked-in':'marked-out'; }
    else { statusHtml=`<span class="badge badge-muted">Not marked</span>`; }

    const countHtml = meal
      ? `<div style="font-size:11px;color:var(--ink-soft);margin-bottom:4px">${meal.planned_count} planned</div>`
      : '';

    let btns='';
    if (!noMeal) {
      if (win.open) {
        btns=`<div class="meal-card-btns">
          <button class="btn-in"  onclick="markMeal(${meal.meal_id},'IN')">IN</button>
          <button class="btn-out" onclick="markMeal(${meal.meal_id},'OUT')">OUT</button>
        </div>`;
      } else {
        btns=`<div class="meal-card-btns">
          <button class="btn-in"  disabled style="opacity:.35;cursor:not-allowed">IN</button>
          <button class="btn-out" disabled style="opacity:.35;cursor:not-allowed">OUT</button>
        </div>
        <div style="font-size:11px;color:var(--accent);margin-top:6px;text-align:center">⏰ ${win.hint}</div>`;
      }
    }

    return `<div class="meal-card ${cardCls}">
      <div class="meal-card-icon">${def.icon}</div>
      <div class="meal-card-name">${def.label}</div>
      <div class="meal-card-time">${win.label}</div>
      ${countHtml}
      <div class="meal-card-status">${statusHtml}</div>
      ${btns}
    </div>`;
  }).join('');
}

async function markMeal(mealId, status) {
  try {
    await api('/attendance/mark',{method:'POST',body:JSON.stringify({mealId,status,remarks:''})});
    showMsg('sMsg',`Marked as ${status} successfully.`);
    await loadStudentAttendance(); buildMealCards();
  } catch(err) { showMsg('sMsg',err.message,'error'); }
}

async function loadStudentAttendance() {
  const rows = await api('/attendance/mine');
  state._myAttendance = rows;

  $('sTotalIn').textContent    = rows.filter(r=>r.status==='IN').length;
  $('sTotalOut').textContent   = rows.filter(r=>r.status==='OUT').length;
  $('sTotalMeals').textContent = rows.length;

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const week = rows.filter(r=>r.meal_date && new Date(r.meal_date)>=weekAgo);
  $('sWeekIn').textContent  = week.filter(r=>r.status==='IN').length;
  $('sWeekOut').textContent = week.filter(r=>r.status==='OUT').length;

  const today = new Date().toISOString().slice(0,10);
  const todayRows = rows.filter(r=>r.meal_date&&r.meal_date.slice(0,10)===today);
  $('sTodaySummary').innerHTML = ['breakfast','lunch','dinner'].map(t=>{
    const rec = todayRows.find(r=>r.meal_type===t);
    const lbl = rec ? badge(rec.status) : `<span class="badge badge-muted">Not marked</span>`;
    return `<div class="meal-strip"><span style="color:var(--ink-mid);text-transform:capitalize;font-weight:500">${t}</span>${lbl}</div>`;
  }).join('');

  renderStudentAttendanceTable(rows);
}

function renderStudentAttendanceTable(rows) {
  $('sHistoryTbl').innerHTML = rows.length
    ? rows.map(r=>`<tr>
        <td>${fmt(r.meal_date)}</td>
        <td style="text-transform:capitalize">${r.meal_type}</td>
        <td>${badge(r.status)}</td>
        <td style="color:var(--ink-soft)">${fmtTime(r.marked_at)}</td>
        <td style="color:var(--ink-soft)">${r.remarks||'—'}</td>
      </tr>`).join('')
    : emptyRow(5,'No attendance records yet');
}

function filterStudentAttendance() {
  const q = $('sAttendanceSearch').value.toLowerCase();
  const filtered = (state._myAttendance||[]).filter(r=>r.meal_type.toLowerCase().includes(q));
  renderStudentAttendanceTable(filtered);
}

async function loadStudentBills() {
  state.bills = await api('/bills');
  $('sBillsTbl').innerHTML = state.bills.length
    ? state.bills.map(b=>{
        const remaining = Math.max(0, Number(b.total_amount)-Number(b.paid_amount));
        const canPay = b.status!=='paid';
        const payBtn = canPay
          ? `<button class="btn-pay btn-pay-rose" onclick="openPayModal(${b.bill_id},${b.total_amount},${b.paid_amount},'${monthName(b.bill_month)} ${b.bill_year}','${b.status}')">Pay Now</button>`
          : `<span class="badge badge-paid">Paid ✓</span>`;
        return `<tr>
          <td>${monthName(b.bill_month)} ${b.bill_year}</td>
          <td>${b.meal_count}</td>
          <td style="font-weight:600">${money(b.total_amount)}</td>
          <td style="color:var(--in-text)">${money(b.paid_amount)}</td>
          <td style="color:var(--accent)">${remaining>0?money(remaining):'—'}</td>
          <td>${badge(b.status)}</td>
          <td>${payBtn}</td>
        </tr>`;
      }).join('')
    : emptyRow(7,'No bills yet');
}

async function loadStudentProfile() {
  try {
    const s = await api('/students/me'); if(!s) return;
    $('sProfileTbl').innerHTML = `
      <tr><td style="color:var(--ink-soft);padding:9px 0;width:42%">Roll No.</td><td style="font-weight:600">${s.roll_no}</td></tr>
      <tr><td style="color:var(--ink-soft);padding:9px 0">Department</td><td style="font-weight:500">${s.department}</td></tr>
      <tr><td style="color:var(--ink-soft);padding:9px 0">Room No.</td><td style="font-weight:500">${s.room_no}</td></tr>
      <tr><td style="color:var(--ink-soft);padding:9px 0">Phone</td><td style="font-weight:500">${s.phone||'—'}</td></tr>
      <tr><td style="color:var(--ink-soft);padding:9px 0">Email</td><td style="font-weight:500">${s.email}</td></tr>
      <tr><td style="color:var(--ink-soft);padding:9px 0">Joined</td><td style="font-weight:500">${fmt(s.joined_on)}</td></tr>`;
    // Pre-fill edit form
    $('sEditName').value  = s.name  || '';
    $('sEditPhone').value = s.phone || '';
    $('sEditRoom').value  = s.room_no || '';
  } catch(e) {}
}

async function updateStudentProfile() {
  const name  = $('sEditName').value.trim();
  const phone = $('sEditPhone').value.trim();
  const roomNo = $('sEditRoom').value.trim();
  if (!name || !roomNo) { showMsg('sMsg','Name and room number are required.','error'); return; }
  try {
    const s = await api('/students/me',{method:'PUT',body:JSON.stringify({name,phone,roomNo})});
    // Update displayed name everywhere
    state.user.name = s.name;
    $('sUserName').textContent = $('sProfileName').textContent = s.name;
    $('sAvatar').textContent = $('sProfileAv').textContent = initials(s.name);
    await loadStudentProfile();
    showMsg('sMsg','Profile updated successfully.','success');
  } catch(err) { showMsg('sMsg',err.message,'error'); }
}

async function loadStudentNotices() {
  try {
    const notices = await api('/notices');
    $('sNoticesContainer').innerHTML = notices.length
      ? notices.map(n=>`
          <div class="card" style="border-left:3px solid var(--brand-rose)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
              <div style="font-family:'Lora',serif;font-weight:600;font-size:15px">${n.title}</div>
              <div style="font-size:11px;color:var(--ink-faint);white-space:nowrap;margin-left:12px">${fmt(n.posted_at)}</div>
            </div>
            <div style="font-size:13px;color:var(--ink-mid);line-height:1.65">${n.body}</div>
            <div style="font-size:11px;color:var(--ink-faint);margin-top:8px">Posted by ${n.posted_by_name}</div>
          </div>`).join('')
      : `<div class="card"><div class="empty-state">📢<div>No notices posted yet</div></div></div>`;
  } catch(e) {}
}

/* ─── Feedback rating ────────────────────────────────── */
function selectRating(val, el) {
  state.selectedRating = val; $('sFeedbackRating').value = val;
  el.closest('.form-group').querySelectorAll('label').forEach(l=>l.classList.remove('rating-active'));
  el.classList.add('rating-active');
}

async function submitFeedback() {
  const message = $('sFeedbackMsg').value.trim();
  if (!message) { showMsg('sMsg','Please write a feedback message.','error'); return; }
  try {
    await api('/feedback',{method:'POST',body:JSON.stringify({message,rating:state.selectedRating})});
    $('sFeedbackMsg').value='';
    showMsg('sMsg','Feedback submitted — thank you!');
  } catch(err) { showMsg('sMsg',err.message,'error'); }
}

/* ─── Payment Modal ──────────────────────────────────── */
function openPayModal(billId, total, paid, period, status) {
  const remaining = Math.max(0, Number(total)-Number(paid));
  $('payBillId').value=billId; $('payModalAmount').textContent=money(remaining);
  $('payModalPeriod').textContent=`Period: ${period}`;
  $('payModalStatus').innerHTML=badge(status);
  $('payAmount').value=remaining.toFixed(0); $('payRef').value='';
  document.querySelectorAll('.method-chip').forEach(c=>c.classList.remove('active'));
  document.querySelector('.method-chip').classList.add('active');
  state.payMethod='easypaisa'; $('payModal').classList.add('open');
}
function closePayModal() { $('payModal').classList.remove('open'); }
function selectMethod(method, el) {
  state.payMethod=method;
  document.querySelectorAll('.method-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
}
async function submitPayment() {
  const billId=$('payBillId').value, amount=Number($('payAmount').value);
  if (!amount||amount<=0) { showMsg('sMsg','Please enter a valid amount.','error'); closePayModal(); return; }
  try {
    await api(`/bills/${billId}/self-pay`,{method:'POST',body:JSON.stringify({amount,method:state.payMethod,referenceNo:$('payRef').value||null})});
    closePayModal(); showMsg('sMsg','Payment recorded!'); await loadStudentBills();
  } catch(err) { closePayModal(); showMsg('sMsg',err.message,'error'); }
}

/* ══════════════════════════════════════════════════════
   WORKER
══════════════════════════════════════════════════════ */
async function loadWorkerAll() {
  await Promise.all([loadWorkerHeadcount(), loadWorkerMealSummary(), loadWorkerReport()]);
}

async function loadWorkerHeadcount() {
  try {
    const rows = await api('/attendance/live');

    // Stat counters
    const byMeal = { breakfast: [], lunch: [], dinner: [] };
    rows.forEach(r => { if (byMeal[r.meal_type]) byMeal[r.meal_type].push(r); });

    $('wCountIn').textContent     = rows.length;
    $('wBreakfastIn').textContent = byMeal.breakfast.length;
    $('wLunchIn').textContent     = byMeal.lunch.length;
    $('wDinnerIn').textContent    = byMeal.dinner.length;

    const meals = await api('/meals');
    const today = new Date().toISOString().slice(0,10);
    $('wTodayMeals').textContent  = meals.filter(m=>m.meal_date&&m.meal_date.slice(0,10)===today).length;

    const mealMeta = {
      breakfast: { emoji: '🌅', label: 'Breakfast' },
      lunch:     { emoji: '☀️',  label: 'Lunch' },
      dinner:    { emoji: '🌙', label: 'Dinner' },
    };
    const colors = ['av-mint','av-rose','av-sage'];

    const studentCard = (r, i) => `
      <div style="background:var(--card-bg);border:1px solid var(--card-border);border-top:2px solid var(--accent);border-radius:var(--r-md);padding:.9rem;text-align:center">
        <div class="user-av ${colors[i%3]}" style="width:36px;height:36px;font-size:12px;margin:0 auto 7px">${initials(r.student_name)}</div>
        <div style="font-size:12px;font-weight:600;color:var(--ink);line-height:1.3">${r.student_name}</div>
        <div style="font-size:11px;color:var(--ink-soft);margin-bottom:5px">${r.roll_no}</div>
        ${badge('IN')}
      </div>`;

    const sections = Object.entries(byMeal)
      .filter(([, list]) => list.length > 0)
      .map(([type, list]) => `
        <div style="margin-bottom:1.5rem">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:.75rem;padding-bottom:.5rem;border-bottom:1px solid var(--card-border)">
            <span style="font-size:16px">${mealMeta[type].emoji}</span>
            <span style="font-family:'Lora',serif;font-size:14px;font-weight:600;color:var(--ink)">${mealMeta[type].label}</span>
            <span style="margin-left:auto;font-size:12px;background:var(--in-bg);color:var(--in-text);padding:2px 10px;border-radius:20px;font-weight:600">${list.length} IN</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
            ${list.map((r,i) => studentCard(r,i)).join('')}
          </div>
        </div>`).join('');

    $('wStudentGrid').style.display = 'block';
    $('wStudentGrid').innerHTML = sections ||
      `<div class="empty-state">👥<div>No students currently checked in</div></div>`;
  } catch(err) { showMsg('wMsg', err.message, 'error'); }
}

async function loadWorkerMealSummary() {
  try {
    const today=new Date().toISOString().slice(0,10);
    const rows=await api(`/reports/daily?date=${today}`);
    $('wMealSummary').innerHTML = rows.length
      ? rows.map(r=>{
          const pct=r.planned_count?Math.round(r.in_count/r.planned_count*100):0;
          return `<div style="margin-bottom:1.1rem">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span style="font-weight:600;text-transform:capitalize">${r.meal_type}</span>
              <span style="color:var(--ink-soft)">${r.in_count} / ${r.planned_count} planned (${pct}%)</span>
            </div>
            <div class="prog-wrap"><div class="prog-bar prog-mint" style="width:${pct}%"></div></div>
            <div style="font-size:11px;color:var(--ink-soft);margin-top:3px">IN: ${r.in_count} &nbsp; OUT: ${r.out_count}</div>
          </div>`;}).join('')
      : `<div class="empty-state">🍽️<div>No meals scheduled today</div></div>`;
  } catch(e) {}
}

async function loadWorkerReport() {
  try {
    const date=$('wReportDate').value||new Date().toISOString().slice(0,10);
    const rows=await api(`/reports/daily?date=${date}`);
    $('wReportCards').innerHTML = rows.length
      ? `<div class="card"><div class="card-title">Meal Counts — ${fmt(date)}</div>
          <div class="table-wrap"><table>
            <thead><tr><th>Meal</th><th>Planned</th><th>IN</th><th>OUT</th><th>Marked</th></tr></thead>
            <tbody>${rows.map(r=>`<tr>
              <td style="text-transform:capitalize;font-weight:600">${r.meal_type}</td>
              <td>${r.planned_count}</td>
              <td style="color:var(--in-text);font-weight:600">${r.in_count}</td>
              <td style="color:var(--accent)">${r.out_count}</td>
              <td>${r.marked_count}</td>
            </tr>`).join('')}</tbody>
          </table></div></div>`
      : `<div class="empty-state">📊<div>No data for this date</div></div>`;
  } catch(err) { showMsg('wMsg',err.message,'error'); }
}

async function workerAddMeal() {
  try {
    await api('/meals',{method:'POST',body:JSON.stringify({
      mealDate:$('wMealDate').value, mealType:$('wMealType').value,
      plannedCount:Number($('wMealCount').value), costPerStudent:Number($('wMealCost').value),
    })});
    showMsg('wMsg','Meal added.'); await loadWorkerMealSummary();
  } catch(err) { showMsg('wMsg',err.message,'error'); }
}

async function workerAutoSchedule() {
  const date=$('wAutoDate').value, count=Number($('wAutoCount').value), cost=Number($('wAutoCost').value);
  if (!date) { showMsg('wMsg','Please select a date.','error'); return; }
  try {
    const r=await api('/meals/auto-schedule',{method:'POST',body:JSON.stringify({date,plannedCount:count,costPerStudent:cost})});
    showMsg('wMsg', r.scheduled>0 ? `${r.scheduled} meal(s) scheduled for ${fmt(date)}.` : 'Meals already scheduled for this date.');
    await loadWorkerMealSummary();
  } catch(err) { showMsg('wMsg',err.message,'error'); }
}

/* ══════════════════════════════════════════════════════
   ADMIN
══════════════════════════════════════════════════════ */
async function loadAdminAll() {
  await Promise.all([
    adminLoadDashboard(), adminLoadAttendance(), adminLoadStudents(),
    adminLoadWorkers(), adminLoadMeals(), adminLoadBills(),
    adminLoadFeedback(), adminLoadDailyReport(), adminLoadNotices(),
  ]);
}

async function adminLoadDashboard() {
  try {
    const r=await api('/reports/dashboard');
    $('aStudentCount').textContent=r.students; $('aWorkerCount').textContent=r.workers;
    $('aTodayMeals').textContent=r.todaysMeals; $('aOpenFeedback').textContent=r.openFeedback;
    $('aUnpaidBills').textContent=r.unpaidBills;
    const today=new Date().toISOString().slice(0,10);
    const daily=await api(`/reports/daily?date=${today}`);
    $('aDailyAttendance').innerHTML = daily.length
      ? daily.map(d=>{
          const pct=d.planned_count?Math.round(d.in_count/d.planned_count*100):0;
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
              <span style="text-transform:capitalize;font-weight:600">${d.meal_type}</span>
              <span style="color:var(--ink-soft)">${d.in_count} / ${d.planned_count} &nbsp;<span style="color:var(--accent);font-weight:600">${pct}%</span></span>
            </div>
            <div class="prog-wrap"><div class="prog-bar prog-mint" style="width:${pct}%"></div></div>
          </div>`;}).join('')
      : `<div class="empty-state">🍽️<div>No meals scheduled today</div></div>`;
  } catch(e) {}
}

async function adminLoadAttendance(all=false) {
  try {
    const rows = await api('/attendance');
    state._allAttendance = rows;
    const date = all ? null : $('aAttendanceDate').value;
    const filtered = date ? rows.filter(r=>r.meal_date&&r.meal_date.slice(0,10)===date) : rows;
    renderAdminAttendanceTable(filtered);
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

function renderAdminAttendanceTable(rows) {
  $('aAttendanceTbl').innerHTML = rows.length
    ? rows.map(r=>`<tr>
        <td style="font-weight:500">${r.student_name}</td>
        <td style="color:var(--ink-soft)">${r.roll_no}</td>
        <td style="text-transform:capitalize">${r.meal_type}</td>
        <td>${fmt(r.meal_date)}</td>
        <td>${badge(r.status)}</td>
        <td style="color:var(--ink-soft)">${fmtTime(r.marked_at)}</td>
        <td style="color:var(--ink-soft)">${r.remarks||'—'}</td>
      </tr>`).join('')
    : emptyRow(7,'No records found for this date');
}

function filterAdminAttendance() {
  const q = $('aAttendanceSearch').value.toLowerCase();
  const date = $('aAttendanceDate').value;
  let rows = state._allAttendance||[];
  if (date) rows = rows.filter(r=>r.meal_date&&r.meal_date.slice(0,10)===date);
  if (q) rows = rows.filter(r=>r.student_name.toLowerCase().includes(q)||r.roll_no.toLowerCase().includes(q));
  renderAdminAttendanceTable(rows);
}

/* Admin mark attendance for a student */
async function adminMarkAttendance() {
  const studentId=$('aMarkStudent').value, mealId=$('aMarkMeal').value, status=$('aMarkStatus').value;
  if (!studentId||!mealId) { showMsg('aMsg','Please select a student and meal.','error'); return; }
  try {
    await api('/attendance/admin-mark',{method:'POST',body:JSON.stringify({studentId:Number(studentId),mealId:Number(mealId),status,remarks:$('aMarkRemarks').value})});
    showMsg('aMsg',`Attendance marked as ${status}.`);
    $('aMarkRemarks').value='';
    await adminLoadAttendance(true);
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

function populateAdminMarkSelects() {
  $('aMarkStudent').innerHTML = (state.students||[]).map(s=>`<option value="${s.student_id}">${s.name} (${s.roll_no})</option>`).join('');
  const today=new Date().toISOString().slice(0,10);
  const todayMeals=(state.meals||[]).filter(m=>m.meal_date&&m.meal_date.slice(0,10)===today);
  $('aMarkMeal').innerHTML = todayMeals.length
    ? todayMeals.map(m=>`<option value="${m.meal_id}">${capitalize(m.meal_type)}</option>`).join('')
    : '<option value="">No meals today</option>';
}

async function adminLoadStudents() {
  try {
    state.students=await api('/students');
    renderAdminStudentsTable(state.students);
    populateAdminMarkSelects();
  } catch(e) {}
}

function renderAdminStudentsTable(rows) {
  $('aStudentsTbl').innerHTML = rows.length
    ? rows.map(s=>`<tr>
        <td style="font-weight:600">${s.roll_no}</td><td>${s.name}</td>
        <td>${s.department}</td><td>${s.room_no}</td>
        <td style="color:var(--ink-soft)">${s.email}</td>
        <td style="color:var(--ink-soft)">${fmt(s.joined_on)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="adminDeleteStudent(${s.student_id},'${s.name}')">Remove</button></td>
      </tr>`).join('')
    : emptyRow(7,'No students registered');
}

function filterAdminStudents() {
  const q = $('aStudentSearch').value.toLowerCase();
  const filtered = (state.students||[]).filter(s=>s.name.toLowerCase().includes(q)||s.roll_no.toLowerCase().includes(q));
  renderAdminStudentsTable(filtered);
}

async function adminAddStudent() {
  try {
    await api('/students',{method:'POST',body:JSON.stringify({
      name:$('aStudentName').value, email:$('aStudentEmail').value,
      password:$('aStudentPass').value, rollNo:$('aStudentRoll').value,
      department:$('aStudentDept').value, roomNo:$('aStudentRoom').value,
    })});
    ['aStudentName','aStudentEmail','aStudentPass','aStudentRoll','aStudentDept','aStudentRoom'].forEach(id=>$(id).value='');
    showMsg('aMsg','Student added.');
    await Promise.all([adminLoadStudents(),adminLoadDashboard()]);
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

async function adminDeleteStudent(id, name) {
  openConfirm('Remove Student',`Are you sure you want to remove "${name}"? This cannot be undone.`, async ()=>{
    try {
      await api(`/students/${id}`,{method:'DELETE'});
      showMsg('aMsg','Student removed.');
      await Promise.all([adminLoadStudents(),adminLoadDashboard(),adminLoadBills()]);
    } catch(err) { showMsg('aMsg',err.message,'error'); }
  });
}

async function adminLoadWorkers() {
  try {
    const rows=await api('/workers');
    $('aWorkersTbl').innerHTML = rows.length
      ? rows.map(w=>`<tr>
          <td style="font-weight:500">${w.name}</td>
          <td style="color:var(--ink-soft)">${w.email}</td>
          <td>${w.job_title}</td>
          <td style="text-transform:capitalize">${w.shift}</td>
          <td style="color:var(--ink-soft)">${w.phone||'—'}</td>
          <td>${money(w.salary)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="adminDeleteWorker(${w.worker_id},'${w.name}')">Remove</button></td>
        </tr>`).join('')
      : emptyRow(7,'No workers registered');
  } catch(e) {}
}

async function adminAddWorker() {
  try {
    await api('/workers',{method:'POST',body:JSON.stringify({
      name:$('aWorkerName').value, email:$('aWorkerEmail').value,
      password:$('aWorkerPass').value, jobTitle:$('aWorkerJob').value,
      shift:$('aWorkerShift').value, salary:Number($('aWorkerSalary').value),
    })});
    ['aWorkerName','aWorkerEmail','aWorkerPass','aWorkerJob','aWorkerSalary'].forEach(id=>$(id).value='');
    showMsg('aMsg','Worker added.');
    await Promise.all([adminLoadWorkers(),adminLoadDashboard()]);
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

async function adminDeleteWorker(id, name) {
  openConfirm('Remove Worker',`Remove "${name}" from the system?`, async ()=>{
    try {
      await api(`/workers/${id}`,{method:'DELETE'});
      showMsg('aMsg','Worker removed.');
      await Promise.all([adminLoadWorkers(),adminLoadDashboard()]);
    } catch(err) { showMsg('aMsg',err.message,'error'); }
  });
}

async function adminLoadMeals() {
  try {
    const rows=await api('/meals');
    state.meals=rows;
    $('aMealsTbl').innerHTML = rows.length
      ? rows.map(m=>`<tr>
          <td>${fmt(m.meal_date)}</td>
          <td style="text-transform:capitalize;font-weight:500">${m.meal_type}</td>
          <td>${m.planned_count}</td>
          <td>${money(m.cost_per_student)}</td>
        </tr>`).join('')
      : emptyRow(4,'No meals scheduled');
    populateAdminMarkSelects();
  } catch(e) {}
}

async function adminAddMeal() {
  try {
    await api('/meals',{method:'POST',body:JSON.stringify({
      mealDate:$('aMealDate').value, mealType:$('aMealType').value,
      plannedCount:Number($('aMealCount').value), costPerStudent:Number($('aMealCost').value),
    })});
    showMsg('aMsg','Meal added.'); await adminLoadMeals();
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

async function adminAutoSchedule() {
  const date=$('aAutoDate').value, count=Number($('aAutoCount').value), cost=Number($('aAutoCost').value);
  if (!date) { showMsg('aMsg','Please select a date.','error'); return; }
  try {
    const r=await api('/meals/auto-schedule',{method:'POST',body:JSON.stringify({date,plannedCount:count,costPerStudent:cost})});
    showMsg('aMsg', r.scheduled>0 ? `${r.scheduled} meal(s) scheduled for ${fmt(date)}.` : 'Meals for this date already exist.');
    await adminLoadMeals();
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

async function adminLoadBills() {
  try {
    state.bills=await api('/bills');
    $('aPaymentBill').innerHTML = state.bills
      .filter(b=>b.status!=='paid')
      .map(b=>`<option value="${b.bill_id}">${b.student_name} — ${monthName(b.bill_month)} ${b.bill_year} — ${money(b.total_amount)}</option>`)
      .join('') || '<option value="">No unpaid bills</option>';
    $('aBillsTbl').innerHTML = state.bills.length
      ? state.bills.map(b=>{
          const rem=Math.max(0,Number(b.total_amount)-Number(b.paid_amount));
          return `<tr>
            <td style="font-weight:500">${b.student_name}</td>
            <td>${monthName(b.bill_month)} ${b.bill_year}</td>
            <td>${b.meal_count}</td>
            <td>${money(b.total_amount)}</td>
            <td style="color:var(--in-text)">${money(b.paid_amount)}</td>
            <td style="color:var(--accent)">${rem>0?money(rem):'—'}</td>
            <td>${badge(b.status)}</td>
          </tr>`;}).join('')
      : emptyRow(7,'No bills generated yet');
  } catch(e) {}
}

async function adminGenerateBills() {
  try {
    const r=await api('/bills/generate',{method:'POST',body:JSON.stringify({
      month:Number($('aBillMonth').value), year:Number($('aBillYear').value),
    })});
    showMsg('aMsg',`${r.generated} bill(s) generated.`);
    await Promise.all([adminLoadBills(),adminLoadDashboard()]);
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

async function adminRecordPayment() {
  try {
    await api(`/bills/${$('aPaymentBill').value}/payments`,{method:'POST',body:JSON.stringify({
      amount:Number($('aPaymentAmount').value),
      method:$('aPaymentMethod').value, referenceNo:$('aPaymentRef').value,
    })});
    $('aPaymentAmount').value=''; $('aPaymentRef').value='';
    showMsg('aMsg','Payment recorded.');
    await Promise.all([adminLoadBills(),adminLoadDashboard()]);
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

/* ─── Feedback ───────────────────────────────────────── */
async function adminLoadFeedback() {
  try {
    const rows=await api('/feedback');
    $('aFeedbackCards').innerHTML = rows.length
      ? rows.map(r=>`
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div>
                <div style="font-family:'Lora',serif;font-weight:600;font-size:14px">${r.student_name}</div>
                <div style="font-size:11px;color:var(--ink-soft)">${r.roll_no} · ${fmt(r.submitted_at)}</div>
              </div>
              ${badge(r.status)}
            </div>
            <div style="font-size:13px;color:var(--ink-mid);line-height:1.6;margin-bottom:8px;padding:10px;background:var(--rose-dim);border-radius:var(--r-sm)">${r.message}</div>
            <div style="font-size:13px;margin-bottom:10px">${'⭐'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            ${r.admin_reply ? `<div style="font-size:12px;color:var(--in-text);background:var(--in-bg);padding:8px 12px;border-radius:var(--r-sm);margin-bottom:10px"><strong>Reply:</strong> ${r.admin_reply}</div>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary btn-sm" onclick="openReplyModal(${r.feedback_id},'${r.message.replace(/'/g,"\\'")}','${r.status}')">Reply</button>
              <button class="btn btn-sm" onclick="adminUpdateFeedback(${r.feedback_id},'resolved')">Mark Resolved</button>
            </div>
          </div>`).join('')
      : `<div class="card"><div class="empty-state">💬<div>No feedback submitted yet</div></div></div>`;
  } catch(e) {}
}

function openReplyModal(feedbackId, message, currentStatus) {
  $('replyFeedbackId').value=feedbackId;
  $('replyFeedbackMsg').textContent=message;
  $('replyText').value='';
  $('replyStatus').value=currentStatus==='resolved'?'resolved':'reviewed';
  $('replyModal').classList.add('open');
}
function closeReplyModal() { $('replyModal').classList.remove('open'); }

async function submitReply() {
  const id=$('replyFeedbackId').value, reply=$('replyText').value.trim(), status=$('replyStatus').value;
  if (!reply) { return; }
  try {
    await api(`/feedback/${id}/status`,{method:'PATCH',body:JSON.stringify({status,adminReply:reply})});
    closeReplyModal(); showMsg('aMsg','Reply sent.');
    await Promise.all([adminLoadFeedback(),adminLoadDashboard()]);
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

async function adminUpdateFeedback(id, status) {
  try {
    await api(`/feedback/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});
    showMsg('aMsg','Feedback updated.');
    await Promise.all([adminLoadFeedback(),adminLoadDashboard()]);
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

/* ─── Reports ────────────────────────────────────────── */
async function adminLoadDailyReport() {
  try {
    const date=$('aReportDate').value||new Date().toISOString().slice(0,10);
    const rows=await api(`/reports/daily?date=${date}`);
    $('aDailyReportCards').innerHTML = rows.length
      ? rows.map(r=>{
          const pct=r.planned_count?Math.round(r.in_count/r.planned_count*100):0;
          return `<div class="card">
            <div class="card-title" style="text-transform:capitalize">${r.meal_type}</div>
            <div style="font-size:13px;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;justify-content:space-between"><span style="color:var(--ink-soft)">Planned</span><span>${r.planned_count}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--ink-soft)">IN</span><span style="color:var(--in-text);font-weight:700">${r.in_count}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--ink-soft)">OUT</span><span style="color:var(--accent)">${r.out_count}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:var(--ink-soft)">Total marked</span><span>${r.marked_count}</span></div>
              <div class="prog-wrap"><div class="prog-bar prog-mint" style="width:${pct}%"></div></div>
              <div style="font-size:11px;color:var(--ink-soft);text-align:right">${pct}% attendance</div>
            </div>
          </div>`;}).join('')
      : `<div class="empty-state">📊<div>No meals on this date</div></div>`;
  } catch(e) {}
}

async function adminLoadMonthlyReport() {
  try {
    const r=await api(`/reports/monthly?month=${$('aReportMonth').value}&year=${$('aReportYear').value}`);
    $('aMonthlyReport').innerHTML=`
      <div class="stats-row">
        <div class="stat-card"><div class="stat-label">Total Bills</div><div class="stat-val">${r.total_bills}</div></div>
        <div class="stat-card"><div class="stat-label">Total Meals IN</div><div class="stat-val">${r.total_meals}</div></div>
        <div class="stat-card stat-mint"><div class="stat-label">Billed Amount</div><div class="stat-val" style="font-size:16px">${money(r.total_amount)}</div></div>
        <div class="stat-card"><div class="stat-label">Amount Paid</div><div class="stat-val" style="font-size:16px">${money(r.paid_value)}</div></div>
      </div>`;
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

/* ─── Notices ────────────────────────────────────────── */
async function adminLoadNotices() {
  try {
    const notices=await api('/notices');
    $('aNoticesList').innerHTML = notices.length
      ? notices.map(n=>`
          <div class="card" style="border-left:3px solid var(--brand-rose);display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="flex:1">
              <div style="font-family:'Lora',serif;font-weight:600;font-size:14px;margin-bottom:4px">${n.title}</div>
              <div style="font-size:13px;color:var(--ink-mid);line-height:1.6;margin-bottom:6px">${n.body}</div>
              <div style="font-size:11px;color:var(--ink-faint)">Posted ${fmt(n.posted_at)} by ${n.posted_by_name}</div>
            </div>
            <button class="btn btn-danger btn-sm" style="flex-shrink:0" onclick="adminDeleteNotice(${n.notice_id})">Delete</button>
          </div>`).join('')
      : `<div class="empty-state">📢<div>No notices posted yet</div></div>`;
  } catch(e) {}
}

async function adminPostNotice() {
  const title=$('aNoticeTitle').value.trim(), body=$('aNoticeBody').value.trim();
  if (!title||!body) { showMsg('aMsg','Please fill in both title and message.','error'); return; }
  try {
    await api('/notices',{method:'POST',body:JSON.stringify({title,body})});
    $('aNoticeTitle').value=''; $('aNoticeBody').value='';
    showMsg('aMsg','Notice posted.');
    await adminLoadNotices();
  } catch(err) { showMsg('aMsg',err.message,'error'); }
}

async function adminDeleteNotice(id) {
  openConfirm('Delete Notice','Delete this notice? Students will no longer see it.', async ()=>{
    try {
      await api(`/notices/${id}`,{method:'DELETE'});
      showMsg('aMsg','Notice deleted.'); await adminLoadNotices();
    } catch(err) { showMsg('aMsg',err.message,'error'); }
  });
}

/* ─── Dark mode ──────────────────────────────────────── */
(function() {
  const btn=document.getElementById('darkToggle');
  const saved=localStorage.getItem('theme');
  if (saved==='dark') { document.documentElement.setAttribute('data-theme','dark'); btn.textContent='☀️'; }
  btn.addEventListener('click',()=>{
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    if (isDark) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','light'); btn.textContent='🌙'; }
    else { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); btn.textContent='☀️'; }
  });
})();

/* ─── Init ───────────────────────────────────────────── */
if (state.token && state.user) enterApp();