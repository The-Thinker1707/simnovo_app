/**
 * EduConnect prototype server (updated)
 * Includes admin endpoints and analytics for charts.
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

// helper: find user by email
function findUser(email){
  const d = load();
  return (d.users||[]).find(u => u.email === email);
}

// auth
app.post('/auth/login', (req,res)=>{
  const { email = '', password = '' } = req.body || {};
  const d = load();
  const u = (d.users||[]).find(x => x.email === email && x.password === password);
  if(!u) return res.status(401).send('<h3>Invalid credentials</h3><p>Use demo accounts on homepage.</p><p><a href="/portal.html">Back</a></p>');
  res.cookie('edu_user', encodeURIComponent(u.email), { httpOnly:true, maxAge:1000*60*60*8 });
  if(u.role === 'teacher') return res.redirect('/teacher.html');
  if(u.role === 'parent') return res.redirect('/parent.html');
  return res.redirect('/student.html');
});
app.get('/auth/logout', (req,res)=>{ res.clearCookie('edu_user'); res.redirect('/portal.html'); });

// populate req.user middleware
app.use((req,res,next)=>{
  const c = req.cookies && req.cookies.edu_user;
  if(c){
    try{
      const email = decodeURIComponent(c);
      const u = findUser(email);
      if(u) req.user = u;
    }catch(e){}
  }
  next();
});

// profile endpoints
app.get('/api/profile', (req,res)=> {
  if(!req.user) return res.status(401).json({ error: 'unauthenticated' });
  const u = Object.assign({}, req.user);
  if(u.photo && !u.photo.startsWith('http')) u.photo = '/uploads/' + u.photo;
  res.json({ user: u });
});
app.post('/api/profile', upload.single('photo'), (req,res)=>{
  if(!req.user) return res.status(401).json({ error:'unauthenticated' });
  const d = load();
  const u = (d.users||[]).find(x=>x.email===req.user.email);
  if(!u) return res.status(401).json({ error:'unauthenticated' });
  if(req.body.name) u.name = req.body.name;
  if(req.body.phone) u.phone = req.body.phone;
  if(req.file){ u.photo = req.file.filename; }
  save(d);
  res.json({ ok:true, user:u });
});

// announcements
app.get('/api/announcements', (req,res)=> { const d = load(); res.json(d.announcements || []); });

// lessons
app.get('/api/lessons', (req,res)=>{ const d=load(); res.json(d.lessons || []); });
app.post('/api/lessons', (req,res)=>{
  if(!req.user || req.user.role !== 'teacher') return res.status(403).json({ error:'forbidden' });
  const d = load();
  d.lessons = d.lessons || [];
  const id = 'L-' + Date.now();
  d.lessons.push({ id, title: req.body.title || 'Untitled', resource: req.body.resource || '' });
  save(d);
  res.json({ ok:true });
});

// staff & fees
app.get('/api/staff', (req,res)=>{ const d=load(); res.json(d.staff || []); });
app.get('/api/fees', (req,res)=>{ const d=load(); res.json(d.fees || []); });

// results: teacher entry and read
app.post('/api/teacher/results', (req,res)=>{
  if(!req.user || req.user.role !== 'teacher') return res.status(403).json({ error:'forbidden' });
  const { studentId, term, subject, grade } = req.body;
  if(!studentId||!term||!subject||!grade) return res.status(400).json({ error:'missing' });
  const d = load();
  d.results = d.results || {};
  d.results[studentId] = d.results[studentId] || [];
  const termObj = d.results[studentId].find(t=>t.term===term);
  if(termObj){ termObj.subjects.push({ name:subject, grade }); } else { d.results[studentId].push({ term, subjects: [{ name:subject, grade }] }); }
  d.results_list = d.results_list || [];
  d.results_list.push({ id: 'r-'+Date.now(), studentId, term, subject, grade, enteredBy: req.user.email, createdAt: new Date().toISOString() });
  save(d);
  res.json({ ok:true });
});
app.get('/api/results', (req,res)=>{ const d=load(); res.json(d.results_list || []); });

// parent dashboard & complaints
app.get('/api/parent/dashboard', (req,res)=>{
  if(!req.user || req.user.role !== 'parent') return res.status(403).json({ error:'forbidden' });
  const d = load();
  const childId = req.user.childId || req.user.childId || 's-1';
  const results = d.results[childId] || d.results['s-1'] || [];
  res.json({ child: { id: childId, name: (d.users||[]).find(u=>u.studentId===childId)?.name || 'Child' }, results, announcements: d.announcements || [] });
});
app.post('/api/parent/complaint', (req,res)=>{
  if(!req.user || req.user.role !== 'parent') return res.status(403).json({ error:'forbidden' });
  const { text } = req.body || {};
  if(!text) return res.status(400).json({ error:'missing' });
  const d = load();
  d.complaints = d.complaints || [];
  const item = { id: 'c-'+Date.now(), parent: req.user.email, text, createdAt: new Date().toISOString() };
  d.complaints.push(item); save(d);
  res.json({ ok:true, complaint:item });
});

// student dashboard
app.get('/api/student/dashboard', (req,res)=>{
  if(!req.user || req.user.role !== 'student') return res.status(403).json({ error:'forbidden' });
  const d = load();
  const sid = req.user.studentId || req.user.id || 's-1';
  res.json({ timetable: d.timetables[sid] || d.timetables['s-1'] || [], homework: d.homework[sid] || d.homework['s-1'] || [], announcements: d.announcements || [] });
});
app.post('/api/student/reflection', (req,res)=>{
  if(!req.user || req.user.role !== 'student') return res.status(403).json({ error:'forbidden' });
  const d = load();
  d.reflections = d.reflections || {};
  const sid = req.user.studentId || req.user.id || 's-1';
  d.reflections[sid] = d.reflections[sid] || [];
  d.reflections[sid].push({ id: 'r-'+Date.now(), text: req.body.text || '', createdAt: new Date().toISOString() });
  save(d);
  res.json({ ok:true });
});

// complaints list
app.get('/api/complaints', (req,res)=>{
  const d = load(); res.json(d.complaints || []);
});

// --- ADMIN endpoints (create user, list users, link parent->student) ---
app.get('/api/admin/users', (req,res)=>{
  if(!req.user || (req.user.role !== 'teacher' && req.user.role !== 'parent' && req.user.role !== 'student')) {
    // allow admin via teacher for demo; in real app create proper admin role
  }
  const d = load(); res.json(d.users || []);
});
app.post('/api/admin/users', (req,res)=>{
  // For demo: require cookie user (teacher or admin). We relax here but you can restrict.
  const d = load();
  const { name, email, password, role, extra } = req.body || {};
  if(!email || !password || !role) return res.status(400).json({ error:'missing' });
  d.users = d.users || [];
  // generate ids; support extra field for studentId/childId
  const id = 'u-'+Date.now();
  const user = { id, name: name||email.split('@')[0], email, password, role };
  if(role==='student' && extra) user.studentId = extra;
  if(role==='parent' && extra) user.childId = extra;
  d.users.push(user);
  save(d);
  res.json({ ok:true, user });
});
app.post('/api/admin/link', (req,res)=>{
  const { parentEmail, studentId } = req.body || {};
  if(!parentEmail || !studentId) return res.status(400).json({ error:'missing' });
  const d = load();
  const p = (d.users||[]).find(u=>u.email===parentEmail && u.role==='parent');
  if(!p) return res.status(404).json({ error:'parent not found' });
  p.childId = studentId;
  save(d);
  res.json({ ok:true });
});

// analytics for homepage & teacher charts
app.get('/api/analytics', (req,res)=>{
  const d = load();
  const totals = { users: (d.users||[]).length, announcements: (d.announcements||[]).length, lessons: (d.lessons||[]).length };
  // grade summary: approximate numeric mapping: A=90, A-=85, B+=82, B=80, etc. we convert letter grades present in results_list into scores
  const gradeMap = { 'A+':98,'A':95,'A-':90,'B+':85,'B':80,'B-':75,'C+':72,'C':70,'C-':65,'D':60,'F':40 };
  const subjects = {};
  (d.results_list||[]).forEach(r=>{
    const s = r.subject || 'Unknown';
    let score = 0;
    const g = String(r.grade||'').toUpperCase();
    if(gradeMap[g]) score = gradeMap[g];
    else {
      // try numeric
      const n = parseFloat(r.grade);
      if(!isNaN(n)) score = Math.max(0,Math.min(100,n));
    }
    subjects[s] = subjects[s] || { total:0, count:0 };
    subjects[s].total += score; subjects[s].count += (score>0?1:0);
  });
  const subjectArr = Object.keys(subjects).map(k=>({ name:k, avgScore: subjects[k].count ? Math.round(subjects[k].total / subjects[k].count) : 0 }));
  res.json({ totals, gradeSummary: { subjects: subjectArr } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{ console.log('EduConnect prototype (updated) running at http://127.0.0.1:' + PORT); });
