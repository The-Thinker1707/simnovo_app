/**
 * EduConnect prototype server (demo)
 * - Express + static front-end
 * - POST /auth/login handles demo authentication
 * - Cookie-based session (edu_user)
 * - Profile uploads via multer -> public/uploads
 * - data.json used for persistence
 *
 * NOTE: Demo only. Do NOT use in production as-is.
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, 'data.json');
function load(){ try { return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); } catch(e){ return {}; } }
function save(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

const upload = multer({ dest: path.join(__dirname, 'public', 'uploads') });

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname,'public','uploads')));
app.use(express.static(path.join(__dirname,'public')));

// helper
function findUserByEmail(email){
  const d = load();
  return (d.users||[]).find(u => u.email === email);
}

app.post('/auth/login', (req,res)=>{
  const { email = '', password = '' } = req.body || {};
  const d = load();
  const u = (d.users||[]).find(x => x.email === email && x.password === password);
  if(!u) return res.status(401).send('<h3>Invalid credentials</h3><p>Use demo accounts on homepage.</p><p><a href="/portal.html">Back</a></p>');
  res.cookie('edu_user', encodeURIComponent(u.email), { httpOnly:true, maxAge:1000*60*60*6 });
  if(u.role === 'teacher') return res.redirect('/teacher.html');
  if(u.role === 'parent') return res.redirect('/parent.html');
  return res.redirect('/student.html');
});

app.get('/auth/logout', (req,res)=>{
  res.clearCookie('edu_user');
  res.redirect('/');
});

app.get('/api/profile', (req,res)=>{
  const c = req.cookies.edu_user;
  if(!c) return res.status(401).json({ error: 'unauthenticated' });
  const email = decodeURIComponent(c);
  const d = load();
  const u = (d.users||[]).find(x => x.email === email);
  if(!u) return res.status(401).json({ error: 'unauthenticated' });
  // enrich photo path
  if(u.photo && !u.photo.startsWith('http')) u.photo = '/uploads/' + u.photo;
  res.json({ user: u });
});

// profile update (multipart)
app.post('/api/profile', upload.single('photo'), (req,res)=>{
  const c = req.cookies.edu_user;
  if(!c) return res.status(401).json({ error:'unauthenticated' });
  const email = decodeURIComponent(c);
  const d = load();
  const u = (d.users||[]).find(x => x.email === email);
  if(!u) return res.status(401).json({ error:'unauthenticated' });
  // update fields
  if(req.body.name) u.name = req.body.name;
  if(req.body.phone) u.phone = req.body.phone;
  if(req.file){
    // store filename; multer already saved file
    u.photo = req.file.filename;
  }
  save(d);
  res.json({ ok:true, user:u });
});

// announcements
app.get('/api/announcements', (req,res)=>{ const d = load(); res.json(d.announcements || []); });

// lessons (teacher accessible)
app.get('/api/lessons', (req,res)=>{ const d=load(); res.json(d.lessons||[]); });
app.post('/api/lessons', (req,res)=>{
  const d = load();
  const { title, resource } = req.body;
  const id = 'L-' + Date.now();
  d.lessons = d.lessons || [];
  d.lessons.push({ id, title, resource });
  save(d);
  res.json({ ok: true });
});

// staff
app.get('/api/staff', (req,res)=>{ const d=load(); res.json(d.staff||[]); });

// fees
app.get('/api/fees', (req,res)=>{ const d=load(); res.json(d.fees||[]); });

// results API (list & teacher entry)
app.get('/api/results', (req,res)=>{ const d=load(); res.json(d.results_list || []); });
app.post('/api/teacher/results', (req,res)=>{
  const c = req.cookies.edu_user;
  if(!c) return res.status(401).json({ error:'unauthenticated' });
  const email = decodeURIComponent(c);
  const d = load();
  const user = (d.users||[]).find(x=>x.email===email);
  if(!user || user.role !== 'teacher') return res.status(403).json({ error:'forbidden' });
  const { studentId, term, subject, grade } = req.body;
  d.results = d.results || {};
  d.results[studentId] = d.results[studentId] || [];
  // push subject into existing term or add new term
  const termObj = d.results[studentId].find(t=>t.term===term);
  if(termObj){
    termObj.subjects.push({ name:subject, grade });
  } else {
    d.results[studentId].push({ term, subjects: [ { name:subject, grade } ] });
  }
  // keep a flat list for teacher view
  d.results_list = d.results_list || [];
  d.results_list.push({ id: 'r-'+Date.now(), studentId, term, subject, grade, enteredBy:email, createdAt:new Date().toISOString() });
  save(d);
  res.json({ ok:true });
});

// parent dashboard
app.get('/api/parent/dashboard', (req,res)=>{
  const c = req.cookies.edu_user; if(!c) return res.status(401).json({ error:'unauthenticated' });
  const email = decodeURIComponent(c);
  const d = load();
  const p = (d.users||[]).find(x=>x.email===email);
  if(!p || p.role !== 'parent') return res.status(403).json({ error:'forbidden' });
  const childId = p.childId || p.child || 's-1';
  const results = d.results[childId] || d.results['s-1'] || [];
  res.json({ child: { id: childId, name: (d.users||[]).find(u=>u.studentId===childId)?.name || 'Your child' }, results, announcements: d.announcements || [] });
});

// parent complaint
app.post('/api/parent/complaint', (req,res)=>{
  const c = req.cookies.edu_user; if(!c) return res.status(401).json({ error:'unauthenticated' });
  const email = decodeURIComponent(c);
  const d = load(); const p = (d.users||[]).find(x=>x.email===email);
  if(!p || p.role !== 'parent') return res.status(403).json({ error:'forbidden' });
  const { text } = req.body;
  if(!text) return res.status(400).json({ error:'missing text' });
  d.complaints = d.complaints || [];
  const item = { id: 'c-'+Date.now(), parent: email, text, createdAt: (new Date()).toISOString() };
  d.complaints.push(item);
  save(d);
  res.json({ ok:true, complaint:item });
});

// student dashboard
app.get('/api/student/dashboard', (req,res)=>{
  const c = req.cookies.edu_user; if(!c) return res.status(401).json({ error:'unauthenticated' });
  const email = decodeURIComponent(c);
  const d = load();
  const u = (d.users||[]).find(x=>x.email===email);
  if(!u || u.role !== 'student') return res.status(403).json({ error:'forbidden' });
  const sid = u.studentId || u.id || 's-1';
  res.json({
    timetable: d.timetables[sid] || d.timetables['s-1'] || [],
    homework: d.homework[sid] || d.homework['s-1'] || [],
    announcements: d.announcements || []
  });
});

// student reflection
app.post('/api/student/reflection', (req,res)=>{
  const c = req.cookies.edu_user; if(!c) return res.status(401).json({ error:'unauthenticated' });
  const email = decodeURIComponent(c);
  const d = load();
  const u = (d.users||[]).find(x=>x.email===email);
  if(!u || u.role !== 'student') return res.status(403).json({ error:'forbidden' });
  d.reflections = d.reflections || {};
  d.reflections[u.studentId || u.id || 's-1'] = d.reflections[u.studentId || u.id || 's-1'] || [];
  d.reflections[u.studentId || u.id || 's-1'].push({ id: 'ref-'+Date.now(), text: req.body.text || '', createdAt: new Date().toISOString() });
  save(d);
  res.json({ ok:true });
});

// convenience: list complaints (teacher?)
app.get('/api/complaints', (req,res)=>{
  const d = load(); res.json(d.complaints || []);
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{ console.log('EduConnect prototype running at http://127.0.0.1:' + PORT); });
