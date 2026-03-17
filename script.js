import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// PASTE YOUR VERCEL ENVIRONMENT VARIABLES HERE
const SUPABASE_URL = 'https://wcqkpqcyaiuocwyjtvhs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY'; // Paki-paste yung buong anon key mo dito

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    
    const path = window.location.pathname;

    // ==========================================
    // AUTH LOGIC (SIGNUP & SIGNIN)
    // ==========================================
    if (path.includes('signup.html')) {
        const form = document.getElementById('signup-form');
        const tcModal = document.getElementById('tc-modal');
        const openTcBtn = document.getElementById('open-tc');
        const tcText = document.getElementById('tc-text');
        const ackBtn = document.getElementById('acknowledge-btn');
        const tcCheckbox = document.getElementById('tc-checkbox');
        const regBtn = document.getElementById('register-btn');

        // Show Passwords
        document.getElementById('show-signup-pass').addEventListener('change', (e) => {
            const type = e.target.checked ? 'text' : 'password';
            document.getElementById('signup-password').type = type;
            document.getElementById('confirm-password').type = type;
        });

        // T&C Scroll Logic
        openTcBtn.addEventListener('click', () => tcModal.classList.remove('hidden'));
        
        tcText.addEventListener('scroll', () => {
            if (tcText.scrollTop + tcText.clientHeight >= tcText.scrollHeight - 5) {
                ackBtn.disabled = false;
            }
        });

        ackBtn.addEventListener('click', () => {
            tcCheckbox.checked = true;
            tcCheckbox.disabled = false;
            regBtn.disabled = false;
            tcModal.classList.add('hidden');
        });

        // Registration Submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const pass = document.getElementById('signup-password').value;
            const confPass = document.getElementById('confirm-password').value;
            const fname = document.getElementById('fname').value;
            const lname = document.getElementById('lname').value;
            const phone = document.getElementById('phone').value;

            if (!email.endsWith('@feuroosevelt.edu.ph')) return alert("Use your @feuroosevelt.edu.ph email.");
            if (pass !== confPass) return alert("Passwords do not match.");

            const { data, error } = await supabase.auth.signUp({
                email, password, options: { data: { first_name: fname, last_name: lname, phone_number: phone } }
            });

            if (error) alert(error.message);
            else { alert("Success! Check email for verification, then Log in."); window.location.href = 'signin.html'; }
        });
    }

    if (path.includes('signin.html')) {
        const form = document.getElementById('signin-form');
        
        document.getElementById('show-login-pass').addEventListener('change', (e) => {
            document.getElementById('login-password').type = e.target.checked ? 'text' : 'password';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) alert(error.message);
            else window.location.href = 'dashboard.html';
        });
    }

    // ==========================================
    // DASHBOARD LOGIC
    // ==========================================
    if (path.includes('dashboard.html') || path === '/' || path.endsWith('/')) {
        
        // Session Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = 'signin.html'; return; }

        // Fetch User Profile Name
        const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single();
        if (profile) {
            document.getElementById('welcome-msg').innerText = `Welcome, ${profile.first_name} ${profile.last_name}!`;
        }

        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'signin.html';
        });

        // UI Toggles
        const sidebar = document.getElementById('sidebar');
        document.getElementById('burger-btn').addEventListener('click', () => {
            if (window.innerWidth <= 768) sidebar.classList.toggle('active-mobile');
            else sidebar.classList.toggle('collapsed');
        });

        const notifModal = document.getElementById('notif-modal');
        document.getElementById('notif-btn').addEventListener('click', () => {
            notifModal.classList.toggle('hidden');
        });

        // Search Dropdown dummy logic
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        searchInput.addEventListener('input', (e) => {
            if(e.target.value.length > 0) {
                searchResults.classList.remove('hidden');
                searchResults.innerHTML = `<p>Searching for "${e.target.value}"...</p>`;
            } else {
                searchResults.classList.add('hidden');
            }
        });

        // Fetch Data (Events vs Order List)
        const contentArea = document.getElementById('events-grid');
        const pageTitle = document.getElementById('page-title');
        
        async function loadEvents(campusFilter = null) {
            contentArea.innerHTML = 'Loading events...';
            let query = supabase.from('events').select('*');
            if (campusFilter) query = query.eq('campus', campusFilter);
            
            const { data: events, error } = await query;
            if (error) { contentArea.innerHTML = 'Error loading events.'; return; }
            if (events.length === 0) { contentArea.innerHTML = 'No events found.'; return; }

            contentArea.innerHTML = events.map(ev => `
                <div class="card">
                    <img src="${ev.poster_url || 'https://via.placeholder.com/150'}" class="card-img">
                    <h3>${ev.title}</h3>
                    <p>${ev.event_date}</p>
                    <p style="font-size: 12px; margin-top:10px;">HOSTED BY: ${ev.campus}</p>
                    <button class="card-btn" onclick="alert('Register logic here')">VIEW & REGISTER</button>
                </div>
            `).join('');
        }

        async function loadOrderList() {
            pageTitle.innerHTML = 'Order List <span class="sub">My Registered Events</span>';
            contentArea.innerHTML = 'Loading orders...';
            
            const { data: orders, error } = await supabase.from('orders').select('*, events(*)').eq('user_id', user.id);
            if (error) { contentArea.innerHTML = 'Error loading orders.'; return; }
            if (orders.length === 0) { contentArea.innerHTML = 'You have not registered for any events.'; return; }

            contentArea.innerHTML = orders.map(o => `
                <div class="card">
                    <h3>${o.events.title}</h3>
                    <p>Status: ${o.status}</p>
                    <button class="card-btn">VIEW QR CODE</button>
                </div>
            `).join('');
        }

        // Event Listeners for Nav
        document.querySelectorAll('.nav-links a[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                e.target.classList.add('active');
                
                const page = e.target.getAttribute('data-page');
                if (page === 'events' || page === 'home') {
                    pageTitle.innerHTML = 'Dashboard <span class="sub">Events Management</span>';
                    loadEvents();
                } else if (page === 'orders') {
                    loadOrderList();
                }
            });
        });

        // Campus Filter Listener
        document.getElementById('campus-select').addEventListener('change', (e) => {
            loadEvents(e.target.value);
        });

        // Initial Load
        loadEvents();
    }
});