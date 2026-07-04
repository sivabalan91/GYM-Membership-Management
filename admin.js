  // ---- Load real user ----
  const token = localStorage.getItem('ironlog_token');
  const user  = JSON.parse(localStorage.getItem('ironlog_user') || '{}');
  if (!token || user.role !== 'admin') window.location.href = 'login.html';
  if (user.name) {
    const initials = user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userName').textContent     = user.name;
  }

  const ctx = document.getElementById('revenueChart');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun'],
      datasets: [
        {
          label: 'Revenue (₹L)',
          data: [14.2, 15.1, 15.8, 16.9, 17.4, 18.6],
          backgroundColor: '#FF5722',
          borderRadius: 4,
          order: 2,
          yAxisID: 'y'
        },
        {
          label: 'Active members',
          data: [1040, 1090, 1130, 1180, 1230, 1284],
          type: 'line',
          borderColor: '#D4FF4D',
          backgroundColor: '#D4FF4D',
          tension: 0.35,
          pointRadius: 3,
          order: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#9A9CA6', font: { family: 'Inter', size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#9A9CA6' }, grid: { color: '#33363F' } },
        y: { position:'left', ticks: { color: '#9A9CA6' }, grid: { color: '#33363F' } },
        y1: { position:'right', ticks: { color: '#9A9CA6' }, grid: { display:false } }
      }
    }
  });