function updateDateTime() {
    const now = new Date();
    const formatted = now.toLocaleString('en-GB', { 
        weekday: 'long', year: 'numeric', month: 'long', 
        day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    const el = document.getElementById('live-datetime');
    if(el) el.textContent = formatted;
}
setInterval(updateDateTime, 1000);
updateDateTime();
