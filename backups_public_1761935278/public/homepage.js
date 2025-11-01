/* homepage.js - counters and sparkline */
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.enh-counter').forEach(el=>{
    const target = parseInt(el.dataset.to||0,10), step = Math.max(1,Math.floor(target/40));
    let cur=0; const iv=setInterval(()=>{ cur+=step; if(cur>=target){ el.textContent=target; clearInterval(iv);} else el.textContent=cur; },18);
  });
  // small sparkline
  const c=document.getElementById('homeSpark'); if(c && c.getContext){
    const ctx=c.getContext('2d'); const data=[60,72,85,78,95,90,98,92]; const w=c.width=c.clientWidth||300, h=c.height=90, pad=8;
    c.width=w; c.height=h; const min=Math.min(...data), max=Math.max(...data); ctx.clearRect(0,0,w,h);
    ctx.beginPath(); data.forEach((v,i)=>{ const x=pad + (i/(data.length-1))*(w-pad*2); const y=h-pad - ((v-min)/(max-min))*(h-pad*2); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.strokeStyle='rgba(11,118,209,0.95)'; ctx.lineWidth=2; ctx.stroke();
  }
  // live time
  (function tick(){ const el=document.getElementById('liveDatetime'); if(!el) return; el.textContent = new Date().toLocaleString(); setTimeout(tick,1000); })();
});
