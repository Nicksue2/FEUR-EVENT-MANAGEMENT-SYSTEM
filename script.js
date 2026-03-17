import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://wcqkpqcyaiuocwyjtvhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    let currentUser = null;
    let allEventsGlobal = []; // For search and filtering

    // --- 1. DARK MODE & SETTINGS LOGIC ---
    const darkModeToggle = document.getElementById('dark-toggle');
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        if(darkModeToggle) darkModeToggle.checked = true;
    }
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', darkModeToggle.checked);
        });
    }

    const settingsBtns = document.querySelectorAll('#nav-settings, .mobile-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); if(settingsModal) settingsModal.classList.remove('hidden'); });
    });
    const closeSettings = document.getElementById('close-settings');
    if(closeSettings) closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));


    // --- 2. AUTHENTICATION & GUEST/USER LOGIC ---
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (sessionData && sessionData.session) {
        currentUser = sessionData.session.user;
        
        // Hide Guest UI, Show User UI
        document.querySelectorAll('.guest-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.user-only').forEach(el => el.classList.remove('hidden'));
        
        // Fetch User Name
        const greetingEl = document.getElementById('user-greeting');
        if(greetingEl) {
            const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', currentUser.id).single();
            if (profile) greetingEl.innerText = `Welcome, ${profile.first_name} ${profile.last_name}!`;
        }
    } else {
        // Hide User UI, Show Guest UI
        document.querySelectorAll('.user-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.guest-only').forEach(el => el.classList.remove('hidden'));
    }

    // Logout
    const logoutBtns = document.querySelectorAll('#logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    });

    // Sidebar & Modal Toggles
    const burgerBtn = document.getElementById('burger-btn');
    const sidebar = document.getElementById('sidebar');
    if (burgerBtn && sidebar) {
        burgerBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) sidebar.classList.toggle('open');
            else sidebar.classList.toggle('minimized');
        });
    }

    const notifBtn = document.getElementById('notif-btn');
    const notifModal = document.getElementById('notif-modal');
    if (notifBtn && notifModal) {
        notifBtn.addEventListener('click', () => notifModal.classList.toggle('hidden'));
    }


    // --- 3. DASHBOARD: FETCH, SEARCH & FILTER EVENTS ---
    const eventsGrid = document.getElementById('events-grid');
    if (eventsGrid && (path === '/' || path.includes('index.html'))) {
        
        const { data: events, error } = await supabase.from('events').select('*');
        
        if (error || !events || events.length === 0) {
            eventsGrid.innerHTML = '<p>No events found.</p>';
        } else {
            allEventsGlobal = events;
            renderEvents(allEventsGlobal);
        }

        // Search Filter
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allEventsGlobal.filter(ev => ev.title.toLowerCase().includes(term));
                renderEvents(filtered);
            });
        }

        // Campus Filter
        const campusSelect = document.getElementById('campus-select');
        if (campusSelect) {
            campusSelect.addEventListener('change', (e) => {
                const selected = e.target.value;
                const filtered = selected === 'All' ? allEventsGlobal : allEventsGlobal.filter(ev => ev.campus === selected);
                renderEvents(filtered);
            });
        }
    }

    function renderEvents(eventsToRender) {
        if (!eventsGrid) return;
        eventsGrid.innerHTML = '';
        if (eventsToRender.length === 0) {
            eventsGrid.innerHTML = '<p>No events match your criteria.</p>';
            return;
        }

        eventsToRender.forEach(event => {
            const isPaidText = event.is_paid ? `₱${event.price}` : 'FREE';
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <img src="${event.poster_url || 'https://via.placeholder.com/300x160?text=FEUR+Event'}" class="event-img">
                <div class="event-info">
                    <div class="event-title">${event.title}</div>
                    <div class="event-meta">
                        <span>📅 ${event.event_date || 'TBA'} | ${event.event_time || ''}</span>
                        <span>📍 FEU Roosevelt ${event.campus}</span>
                        <span>🎟️ ${isPaidText}</span>
                    </div>
                    <button class="event-btn register-trigger" data-id="${event.id}">Register Now</button>
                </div>
            `;
            eventsGrid.appendChild(card);
        });

        // Register Button Actions
        document.querySelectorAll('.register-trigger').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (!currentUser) {
                    document.getElementById('auth-modal').classList.remove('hidden');
                    return;
                }
                const eventId = e.target.getAttribute('data-id');
                btn.innerText = 'Registering...';
                btn.disabled = true;

                const { error } = await supabase.from('orders').insert([{ user_id: currentUser.id, event_id: eventId, status: 'Registered' }]);
                
                if(error) {
                    alert('You might be already registered to this event!');
                    btn.innerText = 'Register Now';
                    btn.disabled = false;
                } else {
                    alert('Successfully Registered! Check your Order List.');
                    btn.innerText = 'Registered';
                    btn.style.background = 'gray';
                }
            });
        });
    }

    const closeAuthBtn = document.getElementById('close-auth-modal');
    if(closeAuthBtn) closeAuthBtn.addEventListener('click', () => document.getElementById('auth-modal').classList.add('hidden'));


    // --- 4. ORDER LIST LOGIC (Foreign Keys) ---
    const ordersGrid = document.getElementById('orders-grid');
    if (ordersGrid && path.includes('orderlist.html')) {
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

        // Inner Join using Foreign Key 'event_id'
        const { data: orders, error } = await supabase.from('orders').select(`id, status, events ( title, event_date, event_time, campus, poster_url )`).eq('user_id', currentUser.id);

        ordersGrid.innerHTML = '';
        if (error || !orders || orders.length === 0) {
            ordersGrid.innerHTML = '<p>You have no registered events yet.</p>';
        } else {
            orders.forEach(order => {
                const event = order.events;
                const card = document.createElement('div');
                card.className = 'event-card';
                card.innerHTML = `
                    <img src="${event.poster_url || 'https://via.placeholder.com/300x160?text=FEUR+Ticket'}" class="event-img">
                    <div class="event-info">
                        <span class="status-badge">${order.status}</span>
                        <div class="event-title">${event.title}</div>
                        <div class="event-meta">
                            <span>📅 ${event.event_date || 'TBA'} | ${event.event_time || ''}</span>
                            <span>📍 FEU Roosevelt ${event.campus}</span>
                        </div>
                        <button class="event-btn" style="background:#000;">View QR Code</button>
                    </div>
                `;
                ordersGrid.appendChild(card);
            });
        }
    }
});