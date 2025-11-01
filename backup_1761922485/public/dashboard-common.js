/* common behavior for dashboards */
document.querySelectorAll('.nav-back').forEach(b=>{
  b.addEventListener('click', function(e){ e.preventDefault(); history.back(); });
});
// profile upload preview
document.querySelectorAll('.profile-upload').forEach(inp=>{
  inp.addEventListener('change', function(){
    const preview = document.querySelector(inp.dataset.preview);
    const f = inp.files[0];
    if(!f || !preview) return;
    const reader = new FileReader();
    reader.onload = function(ev){ preview.src = ev.target.result; };
    reader.readAsDataURL(f);
    // optionally auto-upload to server if token present in a sibling input (left for manual)
  });
});
