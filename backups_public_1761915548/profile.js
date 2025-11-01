/* profile.js - handles profile form submission + preview for teacher/parent/student dashboards */
function initProfileForm(formSelector, avatarImgSelector, emailLookupSelector) {
  const form = document.querySelector(formSelector);
  if(!form) return;
  const avatarImg = document.querySelector(avatarImgSelector);
  const fileInput = form.querySelector('input[type=file]');
  const submitBtn = form.querySelector('button[type=submit]');
  const emailInput = form.querySelector('input[name="email"]');
  const nameInput = form.querySelector('input[name="name"]');

  // preview local file
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { if(avatarImg) avatarImg.src = reader.result; };
      reader.readAsDataURL(f);
    });
  }

  // submit
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    submitBtn.disabled = true;
    const fd = new FormData(form);
    try {
      const r = await fetch('/api/profile', { method:'POST', body: fd });
      const j = await r.json();
      if (j && j.ok) {
        alert('Profile saved');
        // update avatar if returned remote path
        if (j.profile && j.profile.avatar && avatarImg) {
          avatarImg.src = j.profile.avatar;
        }
      } else {
        alert('Save failed: ' + (j && j.error ? j.error : 'unknown'));
      }
    } catch (err) {
      alert('Network error: ' + err);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // optional: load profile by email (if lookup element provided)
  if (emailLookupSelector) {
    const loadBtn = document.querySelector(emailLookupSelector);
    if (loadBtn) {
      loadBtn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const email = (emailInput && emailInput.value) || '';
        if (!email) return alert('Enter email to lookup');
        try {
          const r = await fetch('/api/profile?email=' + encodeURIComponent(email));
          const p = await r.json();
          if (!p) return alert('No profile found');
          if (nameInput) nameInput.value = p.name || '';
          if (avatarImg && p.avatar) avatarImg.src = p.avatar;
          alert('Profile loaded');
        } catch (e) {
          alert('Lookup failed: ' + e);
        }
      });
    }
  }
}
