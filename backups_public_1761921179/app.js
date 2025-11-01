/**
 * Demo app.js for EduConnect
 * - serves static files from public/
 * - POST /auth/login authenticates demo users and redirects based on role
 * - provides simple JSON APIs for teacher/parent/student
 *
 * WARNING: Demo only. Not production-ready.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, 'data.json');
function loadData(){
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e){ return { users:[], announcements:[], staff:[], timetables:{}, homework:{}, results:{}, complaints:[] }; }
}
function saveData(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// small helper to find user by email
function findUserByEmail(email){
  const d = loadData();
  return d.users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
}

// middleware that populates req.user from cookie if present
app.use((req, res, next)=>{
  const c = req.cookies && req.cookies.edu_user;
  if(c){
    try {
      const email = decodeURIComponent(c);
      const user = findUserByEmail(email);
      if(user) req.user = user;
    } catch(e){}
  }
  next();
});

// POST /auth/login
app.post('/auth/login', (req, res)=>{
  const { email = '', password = '', role = '' } = req.body || {};
  const data = loadData();
  const u = data.users.find(x => x.email === email && x.password === password);
  if(!u){
    return res.status(401).send(`<h3>Invalid credentials</h3><p>Use demo credentials: teacher@example.com / teach123 · parent@example.com / parent123 · student@example.com / student123</p><p><a href="/portal.html">Back to login</a></p>`);
  }
  // set cookie (demo)
  res.cookie('edu_user', encodeURIComponent(u.email), { httpOnly: true, maxAge: 1000 * 60 * 60 * 4 });
  // If role param mismatches stored role, prefer stored role
  const redirectRole = u.role || role || 'student';
  if(redirectRole === 'teacher') return res.redirect('/teacher.html');
  if(redirectRole === 'parent') return res.redirect('/parent.html');
  return res.redirect('/student.html');
});

// logout
app.get('/auth/logout', (req,res)=>{
  res.clearCookie('edu_user');
  res.redirect('/');
});

/* API endpoints */

// require login helper
function requireRole(role){
  return (req,res,next)=>{
    if(!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if(role && req.user.role !== role) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

// teacher overview
app.get('/api/teacher/overview', requireRole('teacher'), (req,res)=>{
  const d = loadData();
  res.json({ announcements: d.announcements, staff: d.staff });
});

// parent dashboard (returns child info + results)
app.get('/api/parent/dashboard', requireRole('parent'), (req,res)=>{
  const d = loadData();
  const parent = req.user;
  const childId = parent.childId;
  const childUser = d.users.find(u => u.studentId === childId || u.studentId === parent.childId);
  const results = d.results[childId] ? d.results[childId] : d.results[childId] || d.results[childId] || d.results['student-1'] ? d.results['student-1'] : d.results;
  // simpler: for demo, return results array from d.results[childId] or fallback to d.results['student-1']
  const resData = {
    child: childUser || { name: 'Unknown child' },
    results: d.results[childId] || d.results['student-1'] || [],
    announcements: d.announcements || []
  };
  res.json(resData);
});

// parent submit complaint
app.post('/api/parent/complaint', requireRole('parent'), (req,res)=>{
  const d = loadData();
  const text = req.body && req.body.text;
  if(!text) return res.status(400).json({ error: 'missing text' });
  const item = { id: Date.now(), parent: req.user.email, text, createdAt: (new Date()).toISOString() };
  d.complaints = d.complaints || [];
  d.complaints.push(item);
  saveData(d);
  res.json({ ok: true, complaint: item });
});

// student dashboard
app.get('/api/student/dashboard', requireRole('student'), (req,res)=>{
  const d = loadData();
  const sid = req.user.studentId;
  res.json({
    timetable: d.timetables[sid] || d.timetables['student-1'] || [],
    homework: d.homework[sid] || d.homework['student-1'] || [],
    announcements: d.announcements || []
  });
});

// quick profile endpoint
app.get('/api/profile', (req,res)=>{
  if(!req.user) return res.status(401).json({ error: 'unauthenticated' });
  res.json({ user: req.user });
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log('EduConnect demo server listening on port', PORT);
});
