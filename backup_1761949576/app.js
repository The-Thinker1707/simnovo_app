const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const app = express();
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));
function loadData(){ return JSON.parse(fs.readFileSync("data.json","utf8")); }
function findUser(email,pw){ const d=loadData(); return d.users.find(u=>u.email===email&&u.password===pw); }

app.post("/auth/login",(req,res)=>{
  const {email,password,role}=req.body;
  const u=findUser(email,password);
  if(!u)return res.status(401).send("Invalid credentials <a href='/portal.html'>Back</a>");
  res.cookie("edu_user",u.email,{httpOnly:true});
  if(u.role==="teacher")return res.redirect("/teacher.html");
  if(u.role==="parent")return res.redirect("/parent.html");
  res.redirect("/student.html");
});
app.get("/auth/logout",(req,res)=>{res.clearCookie("edu_user");res.redirect("/portal.html");});

function requireRole(role){
  return (req,res,next)=>{
    const c=req.cookies.edu_user;
    if(!c)return res.status(401).json({error:"unauthenticated"});
    const d=loadData(); const u=d.users.find(x=>x.email===c);
    if(!u||u.role!==role)return res.status(403).json({error:"forbidden"});
    req.user=u; next();
  }
}

app.get("/api/teacher/overview",requireRole("teacher"),(req,res)=>{
  const d=loadData(); res.json({announcements:d.announcements,staff:d.staff});
});
app.get("/api/parent/dashboard",requireRole("parent"),(req,res)=>{
  const d=loadData(); res.json({results:d.results["student-1"],announcements:d.announcements});
});
app.get("/api/student/dashboard",requireRole("student"),(req,res)=>{
  const d=loadData(); res.json({homework:d.homework["student-1"],timetable:d.timetables["student-1"]});
});

const PORT=3000;
app.listen(PORT,()=>console.log("EduConnect running on http://127.0.0.1:"+PORT));
