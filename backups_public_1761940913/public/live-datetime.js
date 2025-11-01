(function(){
  function fmt(d){
    return d.toLocaleString(undefined, {year:'numeric',month:'numeric',day:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit'});
  }
  const el = document.getElementById('live-dt');
  if(!el) return;
  function tick(){
    el.textContent = fmt(new Date());
  }
  tick(); setInterval(tick,1000);
})();
