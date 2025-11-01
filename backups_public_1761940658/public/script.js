function updateDateTime() {
  const dt = new Date();
  const options = {weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'};
  document.querySelectorAll('#live-datetime').forEach(el => el.textContent = dt.toLocaleDateString('en-GB', options));
}
setInterval(updateDateTime, 1000);
updateDateTime();
