/**
 * EduConnect demo backend (with server-side profile uploads + simple persistence)
 * Run: node app.js
 */
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const multer = require('multer');

const DATA_DIR = path.join(__dirname,'data');
fse.ensureDirSync(DATA_DIR);
fse.ensureDirSync(path.join(__dirname,'public','uploads'));

const USERS_FILE = path.join(DATA_DIR,'users.json');
const RESULTS_FILE = path.join(DATA_DIR,'results.json');
const COMPLAINTS_FILE = path.join(DATA_DIR,'complaints.json');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const PORT = process.env.PORT || 3000;

// --- helpers to load/save JSON ---
function loadJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,'utf8')||'null') || fallback;
  } catch(e){}
  return fallback;
}
function saveJSON(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

// --- default demo users (passwords hashed) ---
let users = loadJSON(USERS_FILE, null);
if (!users) {
  users = [
    { id:1, email:'admin@example.com', password_hash: bcrypt.hashSync('admin123',8), role:'admin', full_name:'School Admin', profile_photo: null },
    { id:2, email:'teacher@example.com', password_hash: bcrypt.hashSync('teach123',8), role:'teacher', full_name:'Ms Teacher', profile_photo: null },
    { id:3, email:'parent@example.com', password_hash: bcrypt.hashSync('parent123',8), role:'parent', full_name:'Parent One', profile_photo: null },
    { id:4, email:'student@example.com', password_hash: bcrypt.hashSync('student123',8), role:'student', full_name:'Pupil One', profile_photo: null }
  ];
  saveJSON(USERS_FILE, users);
}

// simple persistent stores
let results = loadJSON(RESULTS_FILE, []);
let complaints = loadJSON(COMPLAINTS_FILE, []);

// express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'public')));

// file upload config
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, path.join(__dirname,'public','uploads')),
  filename: (req,file,cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_\-\.]/g,'');
    cb(null, safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// JWT sign
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '8h' });
}

// auth middleware
function authMiddleware(req,res,next){
  try{
    const h = req.headers.authorization || '';
    if(!h) return res.status(401).json({ error:'no token' });
    const parts = h.split(' ');
    if(parts.length !== 2) return res.status(401).json({ error:'malformed token' });
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = payload;
    next();
  }catch(err){
    return res.status(401).json({ error:'invalid token', detail: String(err) });
  }
}

// find user by id
function findUserById(id){ return users.find(u => u.id === id) }
function findUserByEmail(email){ return users.find(u => u.email === email) }

// --- routes ---

// login -> returns token
app.post('/api/auth/login', (req,res)=>{
  try{
    const { email, password } = req.body || {};
    if(!email || !password) return res.status(400).json({ error:'email & password required' });
    const user = findUserByEmail(email);
    if(!user) return res.status(401).json({ error:'invalid credentials' });
    if(!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error:'invalid credentials' });
    const token = signToken(user);
    return res.json({ token });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// upload profile photo (multipart/form-data: field name "photo")
app.post('/api/upload/profile', authMiddleware, upload.single('photo'), (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({ error: 'no file uploaded (field name must be "photo")' });
    const user = findUserById(req.user.id);
    if(!user) return res.status(404).json({ error: 'user not found' });
    // update profile_photo path (public URL)
    user.profile_photo = '/uploads/' + path.basename(req.file.path);
    saveJSON(USERS_FILE, users);
    return res.json({ ok:true, photoUrl: user.profile_photo });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

// simple results endpoint (requires auth)
app.post('/api/results', authMiddleware, (req,res)=>{
  try{
    const { student_id, term, subject, score, max_score } = req.body || {};
    if(!student_id || !term || !subject) return res.status(400).json({ error:'student_id,term,subject required' });
    const grade = (score / (max_score||100) * 100) >= 80 ? 'A' : ((score/(max_score||100) * 100) >= 60 ? 'B' : 'C');
    const item = { id: results.length + 1, student_id, term, subject, score, max_score, grade, published_at: new Date().toISOString() };
    results.push(item); saveJSON(RESULTS_FILE, results);
    return res.json(item);
  }catch(err){ console.error(err); return res.status(500).json({ error: String(err) }); }
});

// fetch results by student (parent/student can use)
app.get('/api/results/student/:id', authMiddleware, (req,res)=>{
  const sid = Number(req.params.id);
  const out = results.filter(r => r.student_id === sid);
  res.json(out);
});

// complaints
app.post('/api/complaints', authMiddleware, (req,res)=>{
  try{
    const { about_student, category, message } = req.body || {};
    if(!about_student || !message) return res.status(400).json({ error:'about_student & message required' });
    const item = { id: complaints.length + 1, from_user: req.user.id, about_student, category, message, status: 'open', created_at: new Date().toISOString() };
    complaints.push(item); saveJSON(COMPLAINTS_FILE, complaints);
    return res.json(item);
  }catch(err){ console.error(err); return res.status(500).json({ error: String(err) }); }
});

app.get('/api/complaints', authMiddleware, (req,res)=>{
  // teacher/admin sees all, parent sees their own, student sees complaints about them
  const role = req.user.role;
  if(role === 'admin' || role === 'teacher') return res.json(complaints);
  if(role === 'parent') return res.json(complaints.filter(c => c.from_user === req.user.id));
  if(role === 'student') return res.json(complaints.filter(c => c.about_student === req.user.id));
  return res.json([]);
});

// debug: list users (no password hashes)
app.get('/_internal/users', (req,res)=>{
  res.json(users.map(u => ({ id:u.id, email:u.email, role:u.role, full_name:u.full_name, profile_photo: u.profile_photo })));
});

// Ensure / serves index.html in public (static middleware already does it)
// start
app.listen(PORT, '0.0.0.0', ()=> console.log('EduConnect server running on :'+PORT));
