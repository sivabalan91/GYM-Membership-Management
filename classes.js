const API   = 'http://localhost:4000/api';
  const token = localStorage.getItem('ironlog_token');
  const user  = JSON.parse(localStorage.getItem('ironlog_user') || '{}');

  // Guard
  if (!token || !user.id) window.location.href = 'login.html';

  // Populate user
  if (user.name) {
    const initials = user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('userInitials').textContent = initials;
    document.getElementById('userName').textContent     = user.name;
  }
  document.getElementById('pageDate').textContent =
    new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    localStorage.clear(); window.location.href = 'login.html';
  });

  // ---- Toast ----
  function showToast(msg, type='success') {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(()=> t.classList.remove('show'), 3000);
  }

  // ---- Format helpers ----
  function fmtDate(dt) {
    return new Date(dt).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
  }
  function fmtTime(dt) {
    return new Date(dt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
  }
  function duration(start, end) {
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    return mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60?mins%60+'m':''}`.trim() : `${mins}m`;
  }

  // ---- Load classes ----
  async function loadClasses() {
    const grid      = document.getElementById('classesGrid');
    const dateVal   = document.getElementById('filterDate').value;
    const branchVal = document.getElementById('filterBranch').value;
    const search    = document.getElementById('filterSearch').value.toLowerCase();

    grid.innerHTML = `
      <div class="class-card" style="padding:18px;gap:10px;">
        <div class="skeleton" style="width:60%;height:12px;"></div>
        <div class="skeleton" style="width:80%;height:20px;"></div>
        <div class="skeleton" style="width:50%;height:12px;"></div>
      </div>
      <div class="class-card" style="padding:18px;gap:10px;">
        <div class="skeleton" style="width:60%;height:12px;"></div>
        <div class="skeleton" style="width:80%;height:20px;"></div>
        <div class="skeleton" style="width:50%;height:12px;"></div>
      </div>`;

    try {
      let url = `${API}/classes?`;
      if (branchVal) url += `branch_id=${branchVal}&`;
      if (dateVal)   url += `from=${dateVal}T00:00:00&to=${dateVal}T23:59:59&`;

      const res  = await fetch(url, { headers:{ Authorization:`Bearer ${token}` }});
      let classes = await res.json();

      // Client-side search filter
      if (search) classes = classes.filter(c => c.name.toLowerCase().includes(search));

      document.getElementById('classCount').textContent = `${classes.length} class${classes.length!==1?'es':''}`;

      if (!classes.length) {
        grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🏋️</div>No classes found — try adjusting the filters or check back later.</div>`;
        return;
      }

      grid.innerHTML = classes.map(c => {
        const pct   = c.capacity > 0 ? Math.round((c.booked_count / c.capacity) * 100) : 0;
        const left  = c.capacity - c.booked_count;
        const full  = left <= 0;
        const warn  = pct >= 80;
        const fillClass = full ? 'full' : warn ? 'warn' : '';
        const spotsClass = left <= 3 ? 'urgent' : '';

        return `
        <div class="class-card" id="card-${c.id}">
          <div class="class-card-top">
            <div class="class-type-tag">Group Class</div>
            <div class="class-name">${c.name}</div>
            <div class="class-trainer">with ${c.trainer_name}</div>
            <div class="class-capacity-bar">
              <div class="class-capacity-fill ${fillClass}" style="width:${pct}%"></div>
            </div>
          </div>
          <div class="class-card-body">
            <div class="class-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${fmtDate(c.start_time)}
            </div>
            <div class="class-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${fmtTime(c.start_time)} · ${duration(c.start_time, c.end_time)}
            </div>
            <div class="class-meta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Branch #${c.branch_id}
            </div>
          </div>
          <div class="class-card-foot">
            <span class="spots-left ${spotsClass}">
              ${full ? '🔴 Full' : `${left} spot${left!==1?'s':''} left`}
            </span>
            <button
              class="btn btn-primary btn-sm"
              onclick="bookClass(${c.id}, this)"
              ${full ? '' : ''}>
              ${full ? 'Join waitlist' : 'Book now'}
            </button>
          </div>
        </div>`;
      }).join('');

    } catch(err) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">⚠️</div>Could not load classes — make sure the API is running.<br><small style="color:var(--text-dim)">${err.message}</small></div>`;
    }
  }

  // ---- Book a class ----
  async function bookClass(classId, btn) {
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Booking…';

    try {
      const res  = await fetch(`${API}/classes/bookings`, {
        method: 'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ class_id: classId, member_id: user.id })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Booking failed', 'error');
        btn.disabled = false;
        btn.textContent = orig;
        return;
      }

      if (data.status === 'confirmed') {
        showToast('✅ Booked! See you there.', 'success');
        btn.textContent = '✓ Booked';
        btn.style.background = 'var(--lime)';
        btn.style.color = '#14151A';
        btn.style.borderColor = 'var(--lime)';
      } else {
        showToast('Added to waitlist — we\'ll notify you if a spot opens.', 'success');
        btn.textContent = '⏳ Waitlisted';
        btn.style.background = 'var(--surface-2)';
        btn.style.borderColor = 'var(--border)';
        btn.style.color = 'var(--text-dim)';
      }

      loadMyBookings();

    } catch(err) {
      showToast('Cannot reach server', 'error');
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  // ---- Cancel a booking ----
  async function cancelBooking(bookingId, btn) {
    if (!confirm('Cancel this booking?')) return;
    btn.disabled = true;
    btn.textContent = 'Cancelling…';

    try {
      const res  = await fetch(`${API}/classes/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers:{ Authorization:`Bearer ${token}` }
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Cancel failed', 'error');
        btn.disabled = false;
        btn.textContent = 'Cancel';
        return;
      }

      showToast('Booking cancelled.', 'success');
      loadMyBookings();
      loadClasses(); // refresh availability

    } catch(err) {
      showToast('Cannot reach server', 'error');
      btn.disabled = false;
      btn.textContent = 'Cancel';
    }
  }

  // ---- My Bookings ----
  async function loadMyBookings() {
    const list = document.getElementById('myBookingsList');
    list.innerHTML = '<div class="empty">Loading…</div>';

    try {
      const res      = await fetch(`${API}/classes/bookings/member/${user.id}`, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      const bookings = await res.json();

      // Only upcoming
      const upcoming = bookings.filter(b => b.status !== 'cancelled' && new Date(b.start_time) > new Date());

      document.getElementById('bookingCount').textContent = upcoming.length;

      if (!upcoming.length) {
        list.innerHTML = `<div class="empty"><div class="empty-icon">🗓️</div>No upcoming bookings yet.<br>Book a class from the list!</div>`;
        return;
      }

      list.innerHTML = upcoming.map(b => `
        <div class="booking-row">
          <div class="booking-info">
            <div class="booking-name">${b.class_name}</div>
            <div class="booking-meta">${fmtDate(b.start_time)} · ${fmtTime(b.start_time)} · ${b.trainer_name}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
            <span class="pill ${b.status==='confirmed'?'pill-green':'pill-orange'}">${b.status}</span>
            <button class="btn btn-ghost btn-sm" style="color:var(--red);padding:4px 8px;"
              onclick="cancelBooking(${b.id}, this)">Cancel</button>
          </div>
        </div>`).join('');

    } catch(err) {
      list.innerHTML = `<div class="empty">Could not load bookings.<br><small>${err.message}</small></div>`;
    }
  }

  // ---- Seed sample classes if DB is empty ----
  async function seedClassesIfEmpty() {
    try {
      const res     = await fetch(`${API}/classes`, { headers:{ Authorization:`Bearer ${token}` }});
      const classes = await res.json();
      if (classes.length === 0) {
        // Insert a few sample classes so the page isn't empty
        const samples = [
          { name:'HIIT Circuit', branch_id:1, trainer_id:1, start_time: offsetDate(0,8,0),  end_time: offsetDate(0,9,0),  capacity:16 },
          { name:'Power Yoga',   branch_id:1, trainer_id:1, start_time: offsetDate(0,17,0), end_time: offsetDate(0,18,0), capacity:20 },
          { name:'Strength & Conditioning', branch_id:2, trainer_id:1, start_time: offsetDate(1,7,0), end_time: offsetDate(1,8,30), capacity:12 },
          { name:'Functional Fitness', branch_id:1, trainer_id:1, start_time: offsetDate(1,18,0), end_time: offsetDate(1,19,0), capacity:14 },
          { name:'Spin Class',   branch_id:3, trainer_id:1, start_time: offsetDate(2,6,30), end_time: offsetDate(2,7,30), capacity:18 },
        ];
        await Promise.all(samples.map(s => fetch(`${API}/classes`,{
          method:'POST',
          headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
          body:JSON.stringify(s)
        })));
      }
    } catch(e) { /* ignore seed errors */ }
    loadClasses();
  }

  function offsetDate(days, h, m) {
    const d = new Date(); d.setDate(d.getDate()+days);
    d.setHours(h,m,0,0);
    return d.toISOString().slice(0,19);
  }

  // Set default filter date to today
  document.getElementById('filterDate').value = new Date().toISOString().slice(0,10);

  // Boot
  seedClassesIfEmpty();
  loadMyBookings();