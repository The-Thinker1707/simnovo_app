/* profile.js: token helper, jwt decode (basic), profile image upload+preview, dashboard utils */
(function(){
  // Helpers
  function b64UrlDecode(str){
    // convert base64url to base64 then decode
    str = str.replace(/-/g,'+').replace(/_/g,'/');
    while(str.length %4) str += '=';
    try { return atob(str); } catch(e){ return null; }
  }
  function parseJwt(token){
    if(!token) return null;
    const parts = token.split('.');
    if(parts.length < 2) return null;
    const payload = b64UrlDecode(parts[1]);
    if(!payload) return null;
    try { return JSON.parse(payload); } catch(e){ return null; }
  }
  window.ec = window.ec || {};
  window.ec.getToken = ()=> sessionStorage.getItem('ec_token') || localStorage.getItem('ec_token');
  window.ec.decodeToken = ()=> parseJwt(window.ec.getToken());
  window.ec.logout = function(){
    sessionStorage.removeItem('ec_token'); localStorage.removeItem('ec_token'); location.href='/portal.html';
  };

  // profile upload / preview
  function setupProfileBlock(root){
    if(!root) root = document;
    const file = root.querySelector('input[type=file].profile-file');
    if(!file) return;
    const role = root.querySelector('[data-role]') ? root.querySelector('[data-role]').dataset.role : 'user';
    const key = 'ec_profile_'+role;
    const avatar = root.querySelector('.avatar');
    const nameInput = root.querySelector('input[name="full_name"]');
    const emailInput = root.querySelector('input[name="email"]');
    // load saved
    try{
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if(saved.photo) avatar.src = saved.photo;
      if(saved.full_name && nameInput) nameInput.value = saved.full_name;
      if(saved.email && emailInput) emailInput.value = saved.email;
    }catch(e){}
    // preview handler
    file.addEventListener('change', function(e){
      const f = e.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = function(ev){
        avatar.src = ev.target.result;
        // store in localStorage
        const st = JSON.parse(localStorage.getItem(key) || '{}');
        st.photo = ev.target.result;
        localStorage.setItem(key, JSON.stringify(st));
      };
      reader.readAsDataURL(f);
    });
    // save form handler
    const saveBtn = root.querySelector('.save-profile');
    if(saveBtn){
      saveBtn.addEventListener('click', function(){
        const st = JSON.parse(localStorage.getItem(key) || '{}');
        if(nameInput) st.full_name = nameInput.value;
        if(emailInput) st.email = emailInput.value;
        localStorage.setItem(key, JSON.stringify(st));
        alert('Profile saved locally (demo).');
      });
    }
  }

  // card detail toggles
  function setupCardDetails(){
    document.querySelectorAll('.subcard[data-content]').forEach(card=>{
      card.addEventListener('click', function(){
        const detail = document.getElementById(card.dataset.content);
        if(detail){
          // hide other details
          document.querySelectorAll('.details').forEach(d=>d.style.display='none');
          detail.style.display='block';
          detail.scrollIntoView({behavior:'smooth',block:'center'});
        }
      });
    });
  }

  // mini chart draw
  function drawSpark(id,data){
    const c = document.getElementById(id);
    if(!c) return;
    const ctx = c.getContext('2d'); const w=c.width=c.clientWidth; const h=c.height=80;
    ctx.clearRect(0,0,w,h);
    const pad=10; const min=Math.min(...data), max=Math.max(...data);
    ctx.beginPath();
    data.forEach((v,i)=>{
      const x = pad + (i/(data.length-1))*(w-pad*2);
      const y = h - pad - ((v-min)/(max-min||1))*(h-pad*2);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = 'rgba(11,118,209,0.95)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // live datetime
  function startLiveDatetime(){
    const el = document.getElementById('liveDatetime');
    if(!el) return;
    function tick(){ const d=new Date(); el.textContent = d.toLocaleString(); }
    tick(); setInterval(tick,1000);
  }

  // on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    startLiveDatetime();
    setupCardDetails();
    // init profile blocks
    document.querySelectorAll('.profile-block').forEach(setupProfileBlock);
    // init any spark charts
    document.querySelectorAll('canvas.spark').forEach(c=>{
      drawSpark(c.id, [60,70,85,80,95,90,100,92]);
    });

    // show username if token present
    const tokenData = window.ec.decodeToken();
    document.querySelectorAll('.ec-username').forEach(el=>{
      el.textContent = tokenData && tokenData.name ? tokenData.name : 'Guest';
    });
    document.querySelectorAll('.ec-role').forEach(el=>{
      el.textContent = tokenData && tokenData.role ? tokenData.role : '';
    });
  });

  // expose functions
  window.ec.setupProfileBlock = setupProfileBlock;
})();
