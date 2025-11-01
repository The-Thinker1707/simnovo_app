const express=require('express');
const cookieParser=require('cookie-parser');
const multer=require('multer');
const path=require('path');
const fs=require('fs');
const {v4:uuidv4}=require('uuid');
const DATA_FILE=path.join(__dirname,'data.json');
function load(){try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));}catch(e){return{};}}
function save(d){fs.writeFileSync(DATA_FILE,JSON.stringify(d,null,2));}
const upload=multer({dest:path.join(__dirname,'public','uploads')});
const app=express();
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(path.join(__dirname,'public','uploads')));
app.use(express.static(path.join(__dirname,'public')));
function findUser(email){const d=load();return (d.users||[]).find(u=>u.email===email);}
app.post('/auth/login',(req,res)=>{
  const {email='',password=''}=req.body;
  const d=load();
  const u=(d.users||[]).find(x=>x.email===email && x.password===password);
  if(!u)return res.status(401).send('Invalid credentials.'); 
  res.cookie('edu_user',encodeURIComponent(u.email),{httpOnly:true,maxAge:8*3600*1000});
  if(u.role==='teacher')return res.redirect('/teacher.html');
  if(u.role==='parent')return res.redirect('/parent.html');
  res.redirect('/student.html');
});
app.get('/auth/logout',(req,res)=>{res.clearCookie('edu_user');res.redirect('/');});
app.use((req,res,next)=>{const c=req.cookies.edu_user;if(c){try{const u=findUser(decodeURIComponent(c));if(u)req.user=u;}catch(e){} }next();});
app.get('/api/profile',(req,res)=>{if(!req.user)return res.status(401).json({error:'unauthenticated'});res.json(req.user);});
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('EduConnect running at http://127.0.0.1:'+PORT));
