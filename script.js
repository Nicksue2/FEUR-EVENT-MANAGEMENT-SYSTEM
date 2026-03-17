// --- SPA NAVIGATION (For Dashboard) ---
function showContent(contentId) {
    document.querySelectorAll('.content-page').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden-page');
    });
    
    const target = document.getElementById(contentId);
    if (target) {
        target.classList.remove('hidden-page');
        void target.offsetWidth; 
        target.classList.add('active');
    }
}

// --- SIDEBAR & MOBILE MENU ---
const sidebar = document.getElementById('sidebar');
const desktopBurger = document.getElementById('desktop-burger');

if (desktopBurger) {
    desktopBurger.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

const mobileOverlay = document.getElementById('mobile-menu-overlay');
const mobileSidebar = document.getElementById('mobile-sidebar');

function toggleMobileMenu() {
    if (mobileOverlay.classList.contains('hidden')) {
        mobileOverlay.classList.remove('hidden');
        setTimeout(() => mobileSidebar.classList.remove('-translate-x-full'), 10);
    } else {
        mobileSidebar.classList.add('-translate-x-full');
        setTimeout(() => mobileOverlay.classList.add('hidden'), 300);
    }
}

const mobileBurger = document.getElementById('mobile-burger');
const closeMobile = document.getElementById('close-mobile-menu');
if (mobileBurger) mobileBurger.addEventListener('click', toggleMobileMenu);
if (closeMobile) closeMobile.addEventListener('click', toggleMobileMenu);

// --- PASSWORD TOGGLE (For Auth Pages) ---
document.querySelectorAll('.toggle-pass').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = document.getElementById(this.getAttribute('data-target'));
        if (input.type === 'password') {
            input.type = 'text';
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
        }
    });
});

// --- TERMS & CONDITIONS LOGIC (For Signup Page) ---
const tcBox = document.getElementById('tc-box');
const tcCheckbox = document.getElementById('tc-checkbox');
const registerBtn = document.getElementById('register-btn');

if (tcBox && tcCheckbox && registerBtn) {
    tcBox.addEventListener('scroll', () => {
        if (tcBox.scrollHeight - tcBox.scrollTop <= tcBox.clientHeight + 2) {
            tcCheckbox.disabled = false;
            tcCheckbox.classList.remove('cursor-not-allowed');
        }
    });

    tcCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            registerBtn.disabled = false;
            registerBtn.classList.replace('bg-gray-400', 'bg-feu-green');
            registerBtn.classList.remove('cursor-not-allowed');
        } else {
            registerBtn.disabled = true;
            registerBtn.classList.replace('bg-feu-green', 'bg-gray-400');
            registerBtn.classList.add('cursor-not-allowed');
        }
    });
}

// --- ALERTS ---
function guestRegisterAlert() {
    alert("You need to login to register for an event.");
    window.location.href = 'signin.html';
}

function userRegisterAlert() {
    alert("Registered successfully!");
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)