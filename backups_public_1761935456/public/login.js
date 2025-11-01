document.addEventListener('DOMContentLoaded', function() {
  const forms = [
    { id: 'teacher-login-form', role: 'teacher' },
    { id: 'parent-login-form', role: 'parent' },
    { id: 'student-login-form', role: 'student' }
  ];

  forms.forEach(f => {
    const form = document.getElementById(f.id);
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value;
      const password = form.querySelector('input[type="password"]').value;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(res.status === 200) {
        window.location.href = data.redirect;
      } else {
        alert(data.error);
      }
    });
  });
});
