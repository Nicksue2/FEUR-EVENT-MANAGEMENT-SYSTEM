import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://wcqkpqcyaiuocwyjtvhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    let currentUser = null;
    let allEventsGlobal = [];
    let currentSelectedEvent = null; // Stores event info for modal

    // --- REUSABLE SHOW PASSWORD ---
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

    const settingsBtns = document.querySelectorAll('.nav-settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); if(settingsModal) settingsModal.classList.remove('hidden'); });
    });
    const closeSettings = document.getElementById('close-settings');
    if(closeSettings) closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));


   // --- 2. AUTHENTICATION STATE (SESSION CHECK) ---
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (sessionData && sessionData.session) {
        currentUser = sessionData.session.user;

        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('first_name, last_name, role')
                .eq('id', currentUser.id)
                .single();

            if (profile) {
                userRole = profile.role || 'user';
                const greetingEl = document.getElementById('user-greeting');
                if (greetingEl) greetingEl.innerText = `Welcome, ${profile.first_name}!`;
            }

            // Admin Link Logic
            if (userRole === 'admin') {
                const sideMenu = document.querySelector('.side-menu');
                if (sideMenu && !document.getElementById('admin-link')) {
                    const a = document.createElement('a');
                    a.id = 'admin-link';
                    a.href = 'admin.html';
                    a.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> <span>Admin Panel</span>`;
                    const logoutBtn = document.getElementById('logout-btn');
                    if (logoutBtn) sideMenu.insertBefore(a, logoutBtn);
                    else sideMenu.appendChild(a);
                }
            }
        } catch (err) {
            console.error("Profile fetch failed:", err);
        }

        // Access Control for Admin Page
        if (path.includes('admin.html') && userRole !== 'admin') {
            window.location.href = 'index.html';
            return;
        }

        document.querySelectorAll('.guest-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.user-only').forEach(el => el.classList.remove('hidden'));
    } else {
        if (path.includes('admin.html')) {
            window.location.href = 'signin.html';
            return;
        }
        document.querySelectorAll('.user-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.guest-only').forEach(el => el.classList.remove('hidden'));
    }
        // Dummy Notifications Logic for Logged-In Users
        const notifList = document.getElementById('notif-list');
        if (notifList) {
            notifList.innerHTML = `
                <p class="notif-item">🔔 Welcome to FEUR Events! Explore upcoming activities.</p>
                <p class="notif-item">✅ Email Outlook sync is enabled in settings.</p>
            `;
        }

    } else {
        document.querySelectorAll('.user-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.guest-only').forEach(el => el.classList.remove('hidden'));
    }

    const logoutBtns = document.querySelectorAll('#logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    });


    // --- 3. SIGN UP PAGE LOGIC ---
    if (path.includes('signup.html')) {
        togglePassword('show-password-signup', 'password', 'confirm-password');

        const tcModal = document.getElementById('tc-modal');
        const openTcBtn = document.getElementById('open-tc');
        const tcBox = document.getElementById('tc-box');
        const ackBtn = document.getElementById('acknowledge-btn');
        const tcCheckbox = document.getElementById('tc-checkbox');
        const registerBtn = document.getElementById('register-btn');

        if(openTcBtn) openTcBtn.addEventListener('click', () => { tcModal.style.display = 'flex'; });
        
        if(tcBox) tcBox.addEventListener('scroll', () => {
            if (tcBox.scrollHeight - tcBox.scrollTop <= tcBox.clientHeight + 2) {
                ackBtn.disabled = false;
            }
        });

        if(ackBtn) ackBtn.addEventListener('click', () => {
            tcModal.style.display = 'none';
            tcCheckbox.disabled = false;
            tcCheckbox.checked = true;
            registerBtn.disabled = false;
        });

        const signupForm = document.getElementById('signup-form');
        if(signupForm) signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            registerBtn.innerText = 'Processing...';
            registerBtn.disabled = true;
            
            const fname = document.getElementById('fname').value;
            const lname = document.getElementById('lname').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (!email.endsWith('@feuroosevelt.edu.ph')) {
                alert('Please use your official @feuroosevelt.edu.ph email account.');
                registerBtn.innerText = 'Sign Up';
                registerBtn.disabled = false;
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                registerBtn.innerText = 'Sign Up';
                registerBtn.disabled = false;
                return;
            }

            const { data, error } = await supabase.auth.signUp({ email: email, password: password });

            if (error) {
                alert('Error: ' + error.message);
                registerBtn.innerText = 'Sign Up';
                registerBtn.disabled = false;
            } else {
                if (data.user) {
                    await supabase.from('profiles').insert([{ id: data.user.id, first_name: fname, last_name: lname, phone_number: phone, school_email: email }]);
                }
                alert('Registration successful! You can now log in.');
                window.location.href = 'signin.html';
            }
        });
    }

    // --- 4. SIGN IN PAGE LOGIC ---
    if (path.includes('signin.html')) {
        togglePassword('show-password-signin', 'password');

        const signinForm = document.getElementById('signin-form');
        if(signinForm) signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = signinForm.querySelector('button');
            btn.innerText = 'Logging in...';
            btn.disabled = true;

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { error } = await supabase.auth.signInWithPassword({ email: email, password: password });

            if (error) {
                alert('Login Failed: ' + error.message);
                btn.innerText = 'Log In';
                btn.disabled = false;
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // --- 5. GLOBAL UI (Sidebar, Modals) ---
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

    const closeAuthBtn = document.getElementById('close-auth-modal');
    if(closeAuthBtn) closeAuthBtn.addEventListener('click', () => document.getElementById('auth-modal').classList.add('hidden'));

    const eventDetailsModal = document.getElementById('event-details-modal');
    const closeDetailsBtn = document.getElementById('close-details-modal');
    if(closeDetailsBtn) closeDetailsBtn.addEventListener('click', () => eventDetailsModal.classList.add('hidden'));


    // --- 6. DASHBOARD LOGIC (Fetch, Search, Filter & Modals) ---
    const eventsGrid = document.getElementById('events-grid');
    if (eventsGrid && (path === '/' || path.includes('index.html'))) {
        
        const { data: events, error } = await supabase.from('events').select('*');
        
        if (error || !events || events.length === 0) {
            eventsGrid.innerHTML = '<p>No events found.</p>';
        } else {
            allEventsGlobal = events;
            renderEvents(allEventsGlobal);
        }

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allEventsGlobal.filter(ev => ev.title.toLowerCase().includes(term));
                renderEvents(filtered);
            });
        }

        const campusSelect = document.getElementById('campus-select');
        if (campusSelect) {
            campusSelect.addEventListener('change', (e) => {
                const selected = e.target.value;
                const filtered = selected === 'All' ? allEventsGlobal : allEventsGlobal.filter(ev => ev.campus === selected);
                renderEvents(filtered);
            });
        }

        // Setup the Register button INSIDE the modal
        const modalRegBtn = document.getElementById('modal-register-btn');
        if (modalRegBtn) {
            modalRegBtn.addEventListener('click', async () => {
                if (!currentUser) {
                    eventDetailsModal.classList.add('hidden');
                    document.getElementById('auth-modal').classList.remove('hidden');
                    return;
                }
                
                if (currentSelectedEvent.is_paid) {
                    alert(`Redirecting to Payment Gateway for ₱${currentSelectedEvent.price}... (Feature Coming Soon)`);
                    return;
                }

                modalRegBtn.innerText = 'Registering...';
                modalRegBtn.disabled = true;

                const { error } = await supabase.from('orders').insert([{ user_id: currentUser.id, event_id: currentSelectedEvent.id, status: 'Registered' }]);
                
                if(error) {
                    alert('You might be already registered to this event!');
                } else {
                    alert('Successfully Registered! Check your Order List.');
                    modalRegBtn.innerText = 'Registered';
                    modalRegBtn.style.background = 'gray';
                }
                modalRegBtn.disabled = false;
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
            // Store event id in data attribute to fetch it when clicked
            card.setAttribute('data-id', event.id); 
            card.innerHTML = `
                <img src="${event.poster_url || 'https://via.placeholder.com/300x160?text=FEUR+Event'}" class="event-img">
                <div class="event-info">
                    <div class="event-title">${event.title}</div>
                    <div class="event-meta">
                        <span>📅 ${event.event_date || 'TBA'} | ${event.event_time || ''}</span>
                        <span>📍 FEU Roosevelt ${event.campus}</span>
                        <span>🎟️ <b style="color:var(--primary);">${isPaidText}</b></span>
                    </div>
                </div>
            `;
            
            // Open Details Modal on Card Click
            card.addEventListener('click', () => {
                currentSelectedEvent = event;
                
                document.getElementById('modal-event-img').src = event.poster_url || 'https://via.placeholder.com/500x200?text=FEUR+Event';
                document.getElementById('modal-event-title').innerText = event.title;
                document.getElementById('modal-event-meta').innerHTML = `📅 ${event.event_date || 'TBA'} at ${event.event_time || ''} <br>📍 FEU Roosevelt ${event.campus}`;
                document.getElementById('modal-event-desc').innerText = event.description || 'No description available for this event.';
                
                const modalBtn = document.getElementById('modal-register-btn');
                if (event.is_paid) {
                    modalBtn.innerText = `Pay ₱${event.price}`;
                    modalBtn.style.background = 'var(--secondary)';
                    modalBtn.style.color = 'black';
                } else {
                    modalBtn.innerText = 'Register Now';
                    modalBtn.style.background = 'var(--primary)';
                    modalBtn.style.color = 'white';
                }

                eventDetailsModal.classList.remove('hidden');
            });

            eventsGrid.appendChild(card);
        });
    }


    // --- 7. ORDER LIST LOGIC ---
    const ordersGrid = document.getElementById('orders-grid');
    if (ordersGrid && path.includes('orderlist.html')) {
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

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
                        <button class="btn btn-solid w-100" style="margin-top:auto;" onclick="alert('QR Feature Coming Soon!')">View QR Code</button>
                    </div>
                `;
                ordersGrid.appendChild(card);
            });
        }
    }
});



// --- ADMIN ACCESS & CRUD (DATABASE BASIS) ---
    if (currentUser) {
        // Kunin ang role mula sa DB profiles
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
        const userRole = profile?.role || 'user';

        // Security check para sa admin page
        if (path.includes('admin.html') && userRole !== 'admin') {
            window.location.href = 'index.html';
            return;
        }

        // I-display ang Admin Link sa sidebar kung admin siya
        if (userRole === 'admin') {
            const sideMenu = document.querySelector('.side-menu');
            if (sideMenu && !document.getElementById('admin-link')) {
                const a = document.createElement('a');
                a.id = 'admin-link';
                a.href = 'admin.html';
                a.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> <span>Admin Panel</span>`;
                sideMenu.insertBefore(a, document.getElementById('logout-btn'));
            }
        }

        // Logic para sa Admin Page CRUD
        if (path.includes('admin.html') && userRole === 'admin') {
            const fetchAdminEvents = async () => {
                const { data: events } = await supabase.from('events').select('*').order('created_at', { ascending: false });
                const list = document.getElementById('admin-event-list');
                if (list && events) {
                    list.innerHTML = events.map(ev => `
                        <tr>
                            <td>${ev.title}</td>
                            <td>${ev.campus}</td>
                            <td>${ev.event_date}</td>
                            <td>
                                <button class="btn btn-solid" style="background:#facc15; padding:5px 10px;" onclick="editEvent('${ev.id}')">Edit</button>
                                <button class="btn btn-solid" style="background:#ef4444; color:white; padding:5px 10px;" onclick="deleteEvent('${ev.id}')">Delete</button>
                            </td>
                        </tr>
                    `).join('');
                }
            };

            // Global functions para clickable ang buttons sa table
            window.deleteEvent = async (id) => {
                if (confirm('Delete this event?')) {
                    await supabase.from('events').delete().eq('id', id);
                    fetchAdminEvents();
                    showCustomAlert('System', 'Event deleted.');
                }
            };

            window.editEvent = async (id) => {
                const { data: ev } = await supabase.from('events').select('*').eq('id', id).single();
                if(ev) {
                    document.getElementById('event-id').value = ev.id;
                    document.getElementById('title').value = ev.title;
                    document.getElementById('campus').value = ev.campus;
                    document.getElementById('date').value = ev.event_date;
                    document.getElementById('price').value = ev.price;
                    document.getElementById('desc').value = ev.description;
                    document.getElementById('poster_url').value = ev.poster_url;
                    document.getElementById('form-title').innerText = "Edit: " + ev.title;
                    document.getElementById('cancel-edit').classList.remove('hidden');
                }
            };

            fetchAdminEvents();
        }
    }

    function showCustomAlert(title, message) {
    const modal = document.getElementById('custom-alert');
    if (!modal) return alert(message);

    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    modal.classList.remove('hidden');

    document.getElementById('close-alert').onclick = () => {
        modal.classList.add('hidden');
    };
}