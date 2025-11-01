/* Home enhancements: ticker, quick search, accordion FAQs, mini-chart */
(function(){
  // announcements for ticker
  const announcements = [
    "Term 1 exams start 2025-11-10 · All students must register.",
    "PTA meeting on 2025-11-15 at 17:00 in the main hall.",
    "New library e-resources available online for pupils.",
    "Staff PD workshop: Assessment Strategies — 2025-12-05."
  ];
  // insert ticker text
  const tickerEls = document.querySelectorAll('.enh-ticker-inner');
  tickerEls.forEach(el=>{ el.textContent = announcements.join(' •  ') });

  // quick search: filter quick links by typed text
  const qInput = document.querySelector('.enh-quick-input');
  if(qInput){
    qInput.addEventListener('input', e=>{
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.enh-quick-item').forEach(a=>{
        const txt = (a.dataset.tags || a.textContent).toLowerCase();
        a.style.display = txt.includes(q) ? 'inline-block' : 'none';
      });
    });
  }

  // FAQ accordion
  document.querySelectorAll('.enh-faq-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const ans = btn.nextElementSibling;
      const opened = ans.style.display === 'block';
      document.querySelectorAll('.enh-faq-answer').forEach(x=>x.style.display='none');
      if(!opened) ans.style.display='block';
    });
  });

  // mini chart (simple sparkline using canvas)
  const canvas = document.getElementById('enh-mini-chart');
  if(canvas && canvas.getContext){
    const ctx = canvas.getContext('2d');
    const data = [65,72,80,76,90,85,95,100,92,88]; // sample performance trend
    const w = canvas.width = canvas.clientWidth || 300;
    const h = canvas.height = 80;
    const pad = 12;
    const min = Math.min(...data), max = Math.max(...data);
    ctx.clearRect(0,0,w,h);
    // draw grid lines
    ctx.strokeStyle = 'rgba(15,23,36,0.06)'; ctx.lineWidth=1;
    for(let i=0;i<3;i++){ ctx.beginPath(); const y= pad + i*( (h-pad*2)/2 ); ctx.moveTo(pad,y); ctx.lineTo(w-pad,y); ctx.stroke(); }
    // draw area & line
    ctx.beginPath();
    data.forEach((v,i)=>{
      const x = pad + (i/(data.length-1))*(w-pad*2);
      const y = h - pad - ((v-min)/(max-min))*(h-pad*2);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = 'rgba(11,118,209,0.95)'; ctx.lineWidth=2; ctx.stroke();
    // fill area
    ctx.lineTo(w-pad,h-pad); ctx.lineTo(pad,h-pad); ctx.closePath();
    ctx.fillStyle = 'rgba(11,118,209,0.06)'; ctx.fill();
    // dots
    ctx.fillStyle='white'; ctx.strokeStyle='rgba(11,118,209,0.9)';
    data.forEach((v,i)=>{ const x = pad + (i/(data.length-1))*(w-pad*2); const y = h - pad - ((v-min)/(max-min))*(h-pad*2); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); ctx.stroke(); });
  }

  // animate numeric counters (if present)
  document.querySelectorAll('.enh-counter').forEach(el=>{
    const target = parseInt(el.dataset.to||el.textContent||0,10);
    let cur=0; const step=Math.max(1, Math.floor(target/40));
    const t=setInterval(()=>{ cur+=step; if(cur>=target){ el.textContent=target; clearInterval(t)} else el.textContent=cur },20);
  });

})();
