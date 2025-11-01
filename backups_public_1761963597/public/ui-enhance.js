/* ui-enhance.js — modal previews for portal card links */
(function(){
  // create modal container
  const modalHtml = `
    <div id="ec-modal" style="position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:9999">
      <div style="background: rgba(5,8,12,0.45); position:absolute;inset:0"></div>
      <div style="position:relative;max-width:920px;width:94%;background:var(--card);border-radius:12px;box-shadow:var(--shadow);overflow:auto;max-height:90vh;padding:16px">
        <button id="ec-modal-close" style="position:absolute;left:12px;top:12px" class="back-button">Close</button>
        <div id="ec-modal-body"></div>
      </div>
    </div>`;
  document.addEventListener('DOMContentLoaded', ()=>{
    if(!document.body) return;
    const d = document.createElement('div');
    d.innerHTML = modalHtml;
    document.body.appendChild(d.firstElementChild);

    document.querySelectorAll('.subcard').forEach(card => {
      card.addEventListener('click', async (e) => {
        // if card has data-href, fetch that page and show inside modal
        const href = card.dataset.href || card.querySelector('a')?.getAttribute('href');
        const body = document.getElementById('ec-modal-body');
        const modal = document.getElementById('ec-modal');
        if (!href) return;
        try {
          body.innerHTML = '<div style="padding:40px;text-align:center">Loading preview…</div>';
          modal.style.display = 'flex';
          // fetch the target page (same-origin)
          const res = await fetch(href);
          if (!res.ok) { body.innerHTML = '<div style="padding:20px;color:var(--muted)">Preview not available</div>'; return; }
          let text = await res.text();
          // Strip <head> to avoid conflicts, show body portion
          // naive extraction: try find <body>..</body>
          const m = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const content = m ? m[1] : text;
          body.innerHTML = content;
          // run any inline scripts in content by evaluating small ones (best-effort)
          body.querySelectorAll('script').forEach(s=>{
            try { if(s.src) { const scr = document.createElement('script'); scr.src = s.src; document.head.appendChild(scr); } else { eval(s.innerText); } } catch(e){ console.warn('script eval failed', e); }
          });
        } catch(err) {
          body.innerHTML = '<div style="padding:20px;color:var(--muted)">Error loading preview</div>';
        }
      });
    });

    document.getElementById('ec-modal-close').addEventListener('click', ()=>{
      const modal = document.getElementById('ec-modal');
      modal.style.display = 'none';
      document.getElementById('ec-modal-body').innerHTML = '';
    });
  });
})();
