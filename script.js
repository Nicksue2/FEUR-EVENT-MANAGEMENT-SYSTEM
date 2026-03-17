import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://wcqkpqcyaiuocwyjtvhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    let currentUser = null;

    // --- 1. DARK MODE LOGIC ---
    const darkModeToggle = document.getElementById('dark-toggle');
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if(darkModeToggle) darkModeToggle.checked = true;
    }
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', darkModeToggle.checked);
        });
    }

    // --- 2. AUTHENTICATION & UI TOGGLE ---
    const { data: sessionData } = await supabase.auth.getSession();
    
    const guestView = document.getElementById('guest-view');
    const authUserView = document.getElementById('auth-user-view');
    const navOrders = document.getElementById('nav-orders');
    const logoutBtn = document.getElementById('logout-btn');
    const greetingEl = document.getElementById('user-greeting');

    if (sessionData && sessionData.session) {
        currentUser = sessionData.session.user;
        if(guestView) guestView.classList.add('hidden');
        if(authUserView) authUserView.classList.remove('hidden');
        if(logoutBtn) logoutBtn.classList.remove('hidden');
        
        // Get Profile Name
        const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', currentUser.id).single();
        if (profile && greetingEl) {
            greetingEl.innerText = `Welcome, ${profile.first_name} ${profile.last_name}!`;
        }
    } else {
        if(guestView) guestView.classList.remove('hidden');
        if(authUserView) authUserView.classList.add('hidden');
        if(navOrders) navOrders.classList.add('hidden'); // Hide orders for guests
    }

    // Logout Action
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.reload();
        });
    }

    // --- 3. UI INTERACTIONS (Burger, Modals, Search) ---
    const burgerBtn = document.getElementById('burger-btn');
    const sidebar = document.getElementById('sidebar');
    if (burgerBtn && sidebar) {
        burgerBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('open'); // Slide in for mobile
            } else {
                sidebar.classList.toggle('minimized'); // Shrink for PC
            }
        });
    }

    const notifBtn = document.getElementById('notif-btn');
    const notifModal = document.getElementById('notif-modal');
    if (notifBtn && notifModal) {
        notifBtn.addEventListener('click', () => notifModal.classList.toggle('hidden'));
    }

    const navSettings = document.getElementById('nav-settings');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    if (navSettings && settingsModal) {
        navSettings.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.classList.remove('hidden');
        });
        closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
    }

    // --- 4. FETCH AND RENDER EVENTS (index.html) ---
    const eventsGrid = document.getElementById('events-grid');
    if (eventsGrid) {
        const { data: events, error } = await supabase.from('events').select('*');
        
        eventsGrid.innerHTML = ''; // Clear loading text
        
        if (error || !events || events.length === 0) {
            eventsGrid.innerHTML = '<p>No events found. Please add events in Supabase.</p>';
        } else {
            events.forEach(event => {
                const isPaidText = event.is_paid ? `₱${event.price}` : 'FREE';
                const card = document.createElement('div');
                card.className = 'event-card';
                card.innerHTML = `
                    <img src="${event.poster_url || 'https://via.placeholder.com/300x160?text=FEUR+Event'}" alt="Event" class="event-img">
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

            // Register Button Logic
            document.querySelectorAll('.register-trigger').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (!currentUser) {
                        document.getElementById('auth-modal').classList.remove('hidden');
                        return;
                    }
                    const eventId = e.target.getAttribute('data-id');
                    alert('Registration functionality connecting to Order List... (Coming Next!)');
                    // Logic to insert into 'orders' table goes here
                });
            });
        }
    }

    // Close Auth Modal
    const closeAuthBtn = document.getElementById('close-auth-modal');
    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', () => {
            document.getElementById('auth-modal').classList.add('hidden');
        });
    }
});