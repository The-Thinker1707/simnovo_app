/* dashboard-common.js (recreated) */
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('[data-target]').forEach(card=>{
    card.addEventListener('click', ()=> {
      const t = document.querySelector(card.dataset.target);
      if(!t) return;
      document.querySelectorAll('.panel').forEach(p=>p.style.display='none');
      t.style.display='block';
      t.scrollIntoView({behavior:'smooth',block:'start'});
      const canvas = t.querySelector('canvas[data-chart]');
      if(canvas && !canvas.dataset.rendered && window.renderChart){ window.renderChart(canvas, canvas.dataset.chart); canvas.dataset.rendered=1; }
    });
  });

  document.querySelectorAll('.nav-back').forEach(b=> b.addEventListener('click', (e)=>{ e.preventDefault(); history.back(); }));

  document.querySelectorAll('.profile-upload').forEach(input=>{
    input.addEventListener('change', (e)=>{
      const file = e.target.files[0]; const preview = document.querySelector(input.dataset.preview);
      if(!file || !preview) return;
      const reader = new FileReader(); reader.onload = function(ev){ preview.src = ev.target.result; }; reader.readAsDataURL(file);
    });
  });
});

window.renderChart = function(canvas, cfgName){
  if(!window.Chart) return;
  const ctx = canvas.getContext('2d');
  const configs = {
    "teacherLoad": { type:'bar', data:{labels:["Mon","Tue","Wed","Thu","Fri"], datasets:[{label:"Classes",data:[4,5,4,3,4],backgroundColor:'rgba(11,118,209,0.9)'}]}, options:{responsive:true,maintainAspectRatio:false} },
    "parentSummary": { type:'doughnut', data:{labels:["Fees Paid","Outstanding"], datasets:[{data:[70,30],backgroundColor:['#0bb5a1','#e6eef5']}]}, options:{responsive:true,maintainAspectRatio:false} },
    "studentPerformance": { type:'line', data:{labels:["W1","W2","W3","W4","W5","W6"], datasets:[{label:"Score",data:[72,78,85,80,90,88],fill:true,backgroundColor:'rgba(11,118,209,0.06)',borderColor:'rgba(11,118,209,0.95)'}]}, options:{responsive:true,maintainAspectRatio:false} }
  };
  const c = configs[cfgName];
  if(!c) return;
  new Chart(ctx, c);
};
