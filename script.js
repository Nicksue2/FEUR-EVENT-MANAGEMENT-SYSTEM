import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://wcqkpqcyaiuocwyjtvhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {

    // --- VARIABLES ---
    const path = window.location.pathname;
    let currentUser = null;
    let userRole = 'user';
    let allEventsGlobal = [];
    let currentSelectedEvent = null;

    // --- HELPERS ---
    const showCustomAlert = (title, message) => {
        const alertModal = document.getElementById('custom-alert');
        if (alertModal) {
            document.getElementById('alert-title').innerText = title;
            document.getElementById('alert-message').innerText = message;
            alertModal.classList.remove('hidden');
        } else {
            alert(title + ": " + message);
        }
    };

    const togglePassword = (checkboxId, ...inputIds) => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                inputIds.forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.type = this.checked ? 'text' : 'password';
                });
            });
        }
    };

    const isUserRegistered = async (eventId) => {
        if (!currentUser) return false;
        const { data } = await supabase.from('orders')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('event_id', eventId);
        return data && data.length > 0;
    };

    // --- DARK MODE ---
    const darkModeToggle = document.getElementById('dark-toggle');
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }
    darkModeToggle?.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', darkModeToggle.checked);
    });

    // --- SESSION ---
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData?.session) {
        currentUser = sessionData.session.user;

        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, role')
            .eq('id', currentUser.id)
            .single();

        if (profile) {
            userRole = profile.role || 'user';
            const greetingEl = document.getElementById('user-greeting');
            if (greetingEl) greetingEl.innerText = `Welcome, ${profile.first_name} ${profile.last_name}!`;
        }

        document.querySelectorAll('.guest-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.user-only').forEach(el => el.classList.remove('hidden'));

        // Admin link
        if (userRole === 'admin') {
            const sideMenu = document.querySelector('.side-menu');
            if (sideMenu && !document.getElementById('admin-link')) {
                const a = document.createElement('a');
                a.id = 'admin-link';
                a.href = 'admin.html';
                a.innerHTML = `<span>Admin Panel</span>`;
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) sideMenu.insertBefore(a, logoutBtn);
                else sideMenu.appendChild(a);
            }
        }

        // Block admin page
        if (path.includes('admin.html') && userRole !== 'admin') {
            window.location.href = 'index.html';
            return;
        }

    } else {
        if (path.includes('admin.html') || path.includes('orderlist.html')) {
            window.location.href = 'signin.html';
            return;
        }
        document.querySelectorAll('.user-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.guest-only').forEach(el => el.classList.remove('hidden'));
    }

    // --- SIGNUP ---
    if (path.includes('signup.html')) {
        togglePassword('show-password-signup', 'password', 'confirm-password');

        document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm-password').value;

            if (password !== confirm) {
                showCustomAlert('Error', 'Passwords do not match');
                return;
            }

            const { data, error } = await supabase.auth.signUp({ email, password });

            if (error) {
                showCustomAlert('Error', error.message);
            } else {
                await supabase.from('profiles').insert([{
                    id: data.user.id,
                    first_name: document.getElementById('fname').value,
                    last_name: document.getElementById('lname').value
                }]);
                showCustomAlert('Success', 'Registered!');
                window.location.href = 'signin.html';
            }
        });
    }

    // --- SIGNIN ---
    if (path.includes('signin.html')) {
        togglePassword('show-password-signin', 'password');

        document.getElementById('signin-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const { error } = await supabase.auth.signInWithPassword({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            });

            if (error) showCustomAlert('Error', error.message);
            else window.location.href = 'index.html';
        });
    }

    // --- DASHBOARD ---
    const eventsGrid = document.getElementById('events-grid');

    if (eventsGrid && (path === '/' || path.includes('index.html'))) {

        const { data: events } = await supabase.from('events').select('*');

        if (events) {
            allEventsGlobal = events;
            renderEvents(allEventsGlobal);
        }

        document.getElementById('search-input')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            renderEvents(allEventsGlobal.filter(ev => ev.title.toLowerCase().includes(term)));
        });

        document.getElementById('campus-select')?.addEventListener('change', (e) => {
            const campus = e.target.value;
            renderEvents(campus === 'All' ? allEventsGlobal : allEventsGlobal.filter(ev => ev.campus === campus));
        });
    }

    async function renderEvents(events) {
        if (!eventsGrid) return;

        eventsGrid.innerHTML = '';

        for (const ev of events) {
            const registered = await isUserRegistered(ev.id);

            const card = document.createElement('div');
            card.className = 'event-card';

            card.innerHTML = `
                <img src="${ev.poster_url || ''}" class="event-img">
                <div class="event-info">
                    <div class="event-title">${ev.title}</div>
                    <div>${ev.campus}</div>
                </div>
            `;

            card.onclick = async () => {
                currentSelectedEvent = ev;

                const modalBtn = document.getElementById('modal-register-btn');
                const isReg = await isUserRegistered(ev.id);

                if (isReg) {
                    modalBtn.innerText = 'Registered';
                    modalBtn.disabled = true;
                } else {
                    modalBtn.innerText = ev.is_paid ? `Pay ₱${ev.price}` : 'Register Now';
                    modalBtn.disabled = false;
                }

                document.getElementById('modal-event-title').innerText = ev.title;
                document.getElementById('event-details-modal').classList.remove('hidden');
            };

            eventsGrid.appendChild(card);
        }
    }

    document.getElementById('modal-register-btn')?.addEventListener('click', async () => {
        if (!currentUser) {
            document.getElementById('auth-modal').classList.remove('hidden');
            return;
        }

        const { error } = await supabase.from('orders').insert([{
            user_id: currentUser.id,
            event_id: currentSelectedEvent.id,
            status: 'Registered'
        }]);

        if (!error) {
            showCustomAlert('Success', 'Registered!');
            window.location.reload();
        } else {
            showCustomAlert('Error', 'Already registered');
        }
    });

    // --- ORDER LIST ---
    const ordersGrid = document.getElementById('orders-grid');

    if (ordersGrid && path.includes('orderlist.html')) {
        const { data: orders } = await supabase
            .from('orders')
            .select(`id, status, events ( title, campus, poster_url )`)
            .eq('user_id', currentUser.id);

        if (orders) {
            ordersGrid.innerHTML = orders.map(o => `
                <div class="event-card">
                    <img src="${o.events.poster_url}" class="event-img">
                    <div class="event-info">
                        <span>${o.status}</span>
                        <div>${o.events.title}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // --- ADMIN ---
    if (path.includes('admin.html') && userRole === 'admin') {

        const fetchAdminEvents = async () => {
            const { data: events } = await supabase.from('events').select('*');

            document.getElementById('admin-event-list').innerHTML = events.map(ev => `
                <tr>
                    <td>${ev.title}</td>
                    <td>${ev.campus}</td>
                    <td>
                        <button onclick="deleteEvent('${ev.id}')">Delete</button>
                    </td>
                </tr>
            `).join('');
        };

        window.deleteEvent = async (id) => {
            await supabase.from('events').delete().eq('id', id);
            fetchAdminEvents();
        };

        fetchAdminEvents();
    }

    // --- GLOBAL UI ---
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    document.getElementById('close-alert')?.addEventListener('click', () => {
        document.getElementById('custom-alert').classList.add('hidden');
    });

});