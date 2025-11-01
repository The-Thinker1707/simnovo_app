/* homepage.js - small interactions: counters & sparkline on homepage */
document.addEventListener('DOMContentLoaded', ()=> {
  // counters
  document.querySelectorAll('.enh-counter').forEach(el=>{
    const target = parseInt(el.dataset.to||el.textContent||0,10);
    let cur=0; const step=Math.max(1,Math.floor(target/40));
    const t=setInterval(()=>{ cur+=step; if(cur>=target){ el.textContent=target; clearInterval(t);} else el.textContent=cur },18);
  });

  // sparkline mini chart
  const c=document.getElementById('homeSpark');
  if(c && c.getContext){
    const ctx=c.getContext('2d'); const data=[60,72,85,78,95,90,98,92]; const w=c.width=c.clientWidth, h=c.height=100, pad=10;
    const min=Math.min(...data), max=Math.max(...data); ctx.clearRect(0,0,w,h);
    ctx.beginPath(); data.forEach((v,i)=>{ const x=pad + (i/(data.length-1))*(w-pad*2); const y=h-pad - ((v-min)/(max-min))*(h-pad*2); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.strokeStyle='rgba(11,118,209,0.95)'; ctx.lineWidth=2; ctx.stroke();
    ctx.lineTo(w-pad,h-pad); ctx.lineTo(pad,h-pad); ctx.closePath(); ctx.fillStyle='rgba(11,118,209,0.06)'; ctx.fill();
  }

  // live datetime element (if present)
  (function startTime(){
    const el=document.getElementById('liveDatetime'); if(!el) return;
    function tick(){ el.textContent = new Date().toLocaleString(); }
    tick(); setInterval(tick,1000);
  })();

  // smooth scroll for in-page links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', function(e){ e.preventDefault(); const id=this.getAttribute('href').slice(1); const el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); });
  });
});
