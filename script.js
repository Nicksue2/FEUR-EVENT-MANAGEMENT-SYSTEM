import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Your live Supabase Credentials
const supabaseUrl = 'https://wcqkpqcyaiuocwyjtvhs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

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

    // ==========================================
    // SIGN UP LOGIC
    // ==========================================
    if (path.includes('signup.html')) {
        togglePassword('show-password-signup', 'password', 'confirm-password');

        const tcModal = document.getElementById('tc-modal');
        const openTcBtn = document.getElementById('open-tc');
        const tcBox = document.getElementById('tc-box');
        const ackBtn = document.getElementById('acknowledge-btn');
        const tcCheckbox = document.getElementById('tc-checkbox');
        const registerBtn = document.getElementById('register-btn');

        openTcBtn.addEventListener('click', () => { tcModal.style.display = 'flex'; });
        
        tcBox.addEventListener('scroll', () => {
            if (tcBox.scrollHeight - tcBox.scrollTop <= tcBox.clientHeight + 2) {
                ackBtn.disabled = false;
            }
        });

        ackBtn.addEventListener('click', () => {
            tcModal.style.display = 'none';
            tcCheckbox.disabled = false;
            tcCheckbox.checked = true;
            registerBtn.disabled = false;
        });

        const signupForm = document.getElementById('signup-form');
        signupForm.addEventListener('submit', async (e) => {
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

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                alert('Error: ' + error.message);
                registerBtn.innerText = 'Sign Up';
                registerBtn.disabled = false;
            } else {
                if (data.user) {
                    await supabase.from('profiles').insert([
                        { id: data.user.id, first_name: fname, last_name: lname, phone_number: phone, school_email: email }
                    ]);
                }
                alert('Registration successful! You can now log in.');
                window.location.href = 'signin.html';
            }
        });
    }

    // ==========================================
    // SIGN IN LOGIC
    // ==========================================
    if (path.includes('signin.html')) {
        togglePassword('show-password-signin', 'password');

        const signinForm = document.getElementById('signin-form');
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = signinForm.querySelector('button');
            btn.innerText = 'Logging in...';
            btn.disabled = true;

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert('Login Failed: ' + error.message);
                btn.innerText = 'Log In';
                btn.disabled = false;
            } else {
                window.location.href = 'dashboard.html';
            }
        });
    }

    // ==========================================
    // DASHBOARD & GLOBAL UI LOGIC
    // ==========================================
    if (path.includes('dashboard.html') || path.includes('orderlist.html')) {
        
        // 1. Session Check
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
            window.location.href = 'signin.html';
            return;
        }

        const user = sessionData.session.user;

        // Fetch Name
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();

        if (profile) {
            const greetingEl = document.getElementById('user-greeting');
            if (greetingEl) greetingEl.innerText = `Welcome, ${profile.first_name} ${profile.last_name}!`;
        }

        // Logout
        const logoutBtns = document.querySelectorAll('#logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                await supabase.auth.signOut();
                window.location.href = 'signin.html';
            });
        });

        // 2. UI Toggles
        const burgerBtn = document.getElementById('burger-btn');
        const sidebar = document.getElementById('sidebar');
        if (burgerBtn && sidebar) {
            burgerBtn.addEventListener('click', () => {
                sidebar.classList.toggle('minimized');
            });
        }

        const notifBtn = document.getElementById('notif-btn');
        const notifModal = document.getElementById('notif-modal');
        if (notifBtn && notifModal) {
            notifBtn.addEventListener('click', () => {
                notifModal.classList.toggle('hidden');
            });
        }

        const searchInput = document.getElementById('search-input');
        const searchDropdown = document.getElementById('search-dropdown');
        if (searchInput && searchDropdown) {
            searchInput.addEventListener('input', (e) => {
                if (e.target.value.length > 0) {
                    searchDropdown.classList.remove('hidden');
                    searchDropdown.innerHTML = `<p style="padding:10px;">Searching for "${e.target.value}"...</p>`;
                } else {
                    searchDropdown.classList.add('hidden');
                }
            });
        }
    }
});