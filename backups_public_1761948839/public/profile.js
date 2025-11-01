/* profile.js - profile, local demo data, complaints, results, timetable, small charts */
(function(){
  // small helpers
  function b64UrlDecode(str){ str = str.replace(/-/g,'+').replace(/_/g,'/'); while(str.length%4) str+='='; try{return atob(str)}catch(e){return null} }
  function parseJwt(token){ if(!token)return null; const p=token.split('.'); if(p.length<2) return null; try{return JSON.parse(b64UrlDecode(p[1]))}catch(e){return null} }
  window.ec = window.ec || {};
  window.ec.getToken = ()=> sessionStorage.getItem('ec_token')||localStorage.getItem('ec_token');
  window.ec.decodeToken = ()=> parseJwt(window.ec.getToken());
  window.ec.logout = ()=> { sessionStorage.removeItem('ec_token'); localStorage.removeItem('ec_token'); location.href='/portal.html'; };

  // profile image & profile save per role
  function setupProfileBlock(root){
    if(!root) root=document;
    const file=root.querySelector('input[type=file].profile-file');
    if(!file) return;
    const role = (root.querySelector('[data-role]')||{}).dataset.role || 'user';
    const key='ec_profile_'+role;
    const avatar=root.querySelector('.avatar');
    const nameInput=root.querySelector('input[name="full_name"]');
    const emailInput=root.querySelector('input[name="email"]');
    try{ const saved=JSON.parse(localStorage.getItem(key)||'{}'); if(saved.photo) avatar.src=saved.photo; if(saved.full_name && nameInput) nameInput.value=saved.full_name; if(saved.email && emailInput) emailInput.value=saved.email;}catch(e){}
    file.addEventListener('change', (e)=> {
      const f=e.target.files[0]; if(!f) return;
      const r=new FileReader(); r.onload = ev=> { avatar.src=ev.target.result; const s=JSON.parse(localStorage.getItem(key)||'{}'); s.photo=ev.target.result; localStorage.setItem(key, JSON.stringify(s)); }
      r.readAsDataURL(f);
    });
    const saveBtn = root.querySelector('.save-profile');
    if(saveBtn) saveBtn.addEventListener('click', ()=> {
      const s=JSON.parse(localStorage.getItem(key)||'{}'); if(nameInput) s.full_name=nameInput.value; if(emailInput) s.email=emailInput.value; localStorage.setItem(key, JSON.stringify(s)); alert('Profile saved locally (demo).');
    });
  }

  // seed demo data if missing: results, fees, timetable
  function seedDemo(){
    if(!localStorage.getItem('ec_demo_results')){
      const results = [
        {student_id:1, name:'Pupil One', term:'2025_Term1', subject:'Mathematics', score:82, max_score:100, grade:'A'},
        {student_id:1, name:'Pupil One', term:'2025_Term1', subject:'English', score:74, max_score:100, grade:'B+'},
        {student_id:2, name:'John Doe', term:'2025_Term1', subject:'Mathematics', score:88, max_score:100, grade:'A'}
      ];
      localStorage.setItem('ec_demo_results', JSON.stringify(results));
    }
    if(!localStorage.getItem('ec_demo_fees')){
      const fees=[ {id:1, student_id:1, amount:2000, due:'2025-11-30', status:'pending'}, {id:2, student_id:1, amount:500, due:'2025-12-15', status:'paid'} ];
      localStorage.setItem('ec_demo_fees', JSON.stringify(fees));
    }
    if(!localStorage.getItem('ec_demo_timetable')){
      const tt=[ {day:'Mon', time:'08:00-09:00', subject:'Mathematics'}, {day:'Tue', time:'09:00-10:00', subject:'English'} ];
      localStorage.setItem('ec_demo_timetable', JSON.stringify(tt));
    }
    if(!localStorage.getItem('ec_complaints')) localStorage.setItem('ec_complaints', JSON.stringify([]));
  }

  // complaints: parent can submit, teacher can view
  function setupComplaintsForm(){
    const form = document.getElementById('complaintForm');
    if(!form) return;
    form.addEventListener('submit', e=> {
      e.preventDefault();
      const about = form.querySelector('[name=about_student]').value;
      const category = form.querySelector('[name=category]').value;
      const message = form.querySelector('[name=message]').value;
      const all = JSON.parse(localStorage.getItem('ec_complaints')||'[]');
      all.push({id:Date.now(), from: (ec.decodeToken()&&ec.decodeToken().name)||'parent', about, category, message, status:'open', created: new Date().toISOString()});
      localStorage.setItem('ec_complaints', JSON.stringify(all));
      alert('Complaint submitted (demo).');
      form.reset();
      renderComplaintsList();
    });
  }
  function renderComplaintsList(){
    const container = document.getElementById('complaintsList');
    if(!container) return;
    const all = JSON.parse(localStorage.getItem('ec_complaints')||'[]');
    if(all.length===0){ container.innerHTML='<div class="small">No complaints yet.</div>'; return;}
    container.innerHTML = all.map(c=>`<div class="kv"><div><strong>${c.category}</strong> by ${c.from}<div class="small">${new Date(c.created).toLocaleString()}</div></div><div><div class="small">${c.status}</div><div style="margin-top:6px">${escapeHtml(c.message)}</div></div></div>`).join('');
  }

  // results table rendering and search
  function renderResults(containerId, filterStudentId){
    const cont = document.getElementById(containerId);
    if(!cont) return;
    const all = JSON.parse(localStorage.getItem('ec_demo_results')||'[]');
    const rows = all.filter(r => !filterStudentId || String(r.student_id) === String(filterStudentId));
    if(rows.length===0){ cont.innerHTML='<div class="small">No results</div>'; return; }
    let html = '<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Student</th><th>Term</th><th>Subject</th><th>Score</th><th>Grade</th></tr></thead><tbody>';
    rows.forEach(r=> html += `<tr><td style="padding:6px 8px;border-top:1px solid rgba(0,0,0,0.04)">${r.name}</td><td style="padding:6px 8px;border-top:1px solid rgba(0,0,0,0.04)">${r.term}</td><td style="padding:6px 8px;border-top:1px solid rgba(0,0,0,0.04)">${r.subject}</td><td style="padding:6px 8px;border-top:1px solid rgba(0,0,0,0.04)">${r.score}/${r.max_score}</td><td style="padding:6px 8px;border-top:1px solid rgba(0,0,0,0.04)">${r.grade}</td></tr>` );
    html += '</tbody></table>';
    cont.innerHTML = html;
  }

  // fees render
  function renderFees(containerId, student_id){
    const cont = document.getElementById(containerId); if(!cont) return;
    const all = JSON.parse(localStorage.getItem('ec_demo_fees')||'[]').filter(f=> !student_id || String(f.student_id) === String(student_id));
    if(all.length===0) { cont.innerHTML='<div class="small">No fees</div>'; return; }
    cont.innerHTML = all.map(f=>`<div class="kv"><div>Due: ${f.due} — ${f.amount} ZMW</div><div class="small">${f.status}</div></div>`).join('');
  }

  // timetable render
  function renderTimetable(containerId){
    const cont=document.getElementById(containerId); if(!cont) return;
    const tt = JSON.parse(localStorage.getItem('ec_demo_timetable')||'[]');
    cont.innerHTML = tt.map(row=>`<div class="kv"><div>${row.day} ${row.time}</div><div class="small">${row.subject}</div></div>`).join('');
  }

  // utilities
  function escapeHtml(s){ return String(s).replace(/[&<>]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  // subcard click toggles
  function setupSubcards(){
    document.querySelectorAll('.subcard[data-content]').forEach(c=> c.addEventListener('click', ()=> {
      const id = c.dataset.content;
      document.querySelectorAll('.details').forEach(d=>d.style.display='none');
      const el = document.getElementById(id); if(el) el.style.display='block';
      el && el.scrollIntoView({behavior:'smooth', block:'center'});
    }));
  }

  // spark draw
  function drawSpark(id,data){
    const c=document.getElementById(id); if(!c) return;
    const ctx=c.getContext('2d'); const w=c.width=c.clientWidth,h=c.height=80; ctx.clearRect(0,0,w,h);
    const pad=8,min=Math.min(...data),max=Math.max(...data);
    ctx.beginPath(); data.forEach((v,i)=>{ const x=pad + (i/(data.length-1))*(w-pad*2); const y=h-pad - ((v-min)/(max-min||1))*(h-pad*2); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.strokeStyle='rgba(11,118,209,0.95)'; ctx.lineWidth=2; ctx.stroke();
  }

  // live datetime
  function startLiveDatetime(){
    const els=document.querySelectorAll('#liveDatetime'); if(!els.length) return;
    function tick(){ els.forEach(e=> e.textContent = new Date().toLocaleString()) }
    tick(); setInterval(tick,1000);
  }

  // init on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    seedDemo();
    startLiveDatetime();
    setupSubcards();
    document.querySelectorAll('.profile-block').forEach(setupProfileBlock);
    setupComplaintsForm();
    renderComplaintsList();
    renderResults('resultsTable'); renderResults('teacherResults');
    renderFees('feesList'); renderTimetable('timetableList');
    ['homeSpark','teachSpark','parentSpark','studentSpark'].forEach(id=>{
      const el=document.getElementById(id); if(el) drawSpark(id,[60,72,85,78,95,90,98,92]);
    });
    // show name from token
    const td = parseJwt(window.ec.getToken ? (window.ec.getToken()||'') : '');
    const decoded = parseJwt(window.ec.getToken ? (window.ec.getToken()||'') : '');
    document.querySelectorAll('.ec-username').forEach(el=> el.textContent = (decoded && decoded.name) ? decoded.name : 'Guest');
    document.querySelectorAll('.ec-role').forEach(el=> el.textContent = (decoded && decoded.role) ? decoded.role : '');
  });

  // small helper to parse token with b64UrlDecode
  function parseJwt(t){ try{ if(!t) return null; const p=t.split('.'); return JSON.parse(b64UrlDecode(p[1])); } catch(e){ return null; } }

  // expose
  window.ec.renderResults = renderResults;
  window.ec.renderFees = renderFees;
  window.ec.renderTimetable = renderTimetable;
  window.ec.renderComplaints = renderComplaintsList;
})();
