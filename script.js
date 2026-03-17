// Supabase Init
const sbUrl = "https://wcqkpqcyaiuocwyjtvhs.supabase.co";
const sbKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY";
const sb = window.supabase.createClient(sbUrl, sbKey);

// DOM Elements
const d = document;
const el = (id) => d.getElementById(id);

// --- AUTH LOGIC ---
const btnReg = el("btn-reg");
const btnLog = el("btn-login");
const btnOut = el("btn-out");

// Session Check (Dashboard protection)
async function checkAuth() {
  const {
    data: { session },
  } = await sb.auth.getSession();
  const isDash = window.location.pathname.includes("dashboard.html");

  if (isDash) {
    if (!session) window.location.href = "signin.html";
    else {
      el("app-body").classList.remove("invisible");
      // Show email username format
      el("u-name").innerText = session.user.email.split("@")[0];
    }
  } else if (
    session &&
    (window.location.pathname.includes("signin") ||
      window.location.pathname.includes("signup"))
  ) {
    window.location.href = "dashboard.html";
  }
}
checkAuth();

// Sign Up
if (btnReg) {
  btnReg.onclick = async () => {
    const mail = el("s-mail").value;
    const pass = el("s-pass").value;
    const fname = el("s-fname").value;

    if (!mail.endsWith("@feuroosevelt.edu.ph"))
      return alert("Use school email!");

    btnReg.innerText = "Loading...";
    const { data, error } = await sb.auth.signUp({
      email: mail,
      password: pass,
    });

    if (error) alert(error.message);
    else {
      alert("Check email for verification or login now!");
      window.location.href = "signin.html";
    }
    btnReg.innerText = "Register";
  };
}

// Login
if (btnLog) {
  btnLog.onclick = async () => {
    const mail = el("l-mail").value;
    const pass = el("l-pass").value;

    btnLog.innerText = "Checking...";
    const { data, error } = await sb.auth.signInWithPassword({
      email: mail,
      password: pass,
    });

    if (error) {
      alert(error.message);
      btnLog.innerText = "Login";
    } else window.location.href = "dashboard.html";
  };
}

// Logout
if (btnOut) {
  btnOut.onclick = async () => {
    await sb.auth.signOut();
    window.location.href = "signin.html";
  };
}

// --- UI LOGIC ---

// Show/Hide password
if (el("show-p"))
  el("show-p").onchange = (e) =>
    (el("s-pass").type = e.target.checked ? "text" : "password");

// Terms Scroll Check
if (el("tc")) {
  el("tc").onscroll = () => {
    if (
      el("tc").scrollHeight - el("tc").scrollTop <=
      el("tc").clientHeight + 5
    ) {
      el("chk-tc").disabled = false;
    }
  };
  el("chk-tc").onchange = (e) => {
    btnReg.disabled = !e.target.checked;
    btnReg.className = e.target.checked
      ? "w-full bg-[#3B5E3C] text-white font-bold py-3 rounded"
      : "w-full bg-gray-400 text-white font-bold py-3 rounded cursor-not-allowed";
  };
}

// Sidebar Minimizer
if (el("m-desk"))
  el("m-desk").onclick = () => el("side").classList.toggle("mini");

// View Switcher
d.querySelectorAll(".nav-b").forEach((b) => {
  b.onclick = () => {
    const trg = b.getAttribute("data-v");
    if (!trg) return;

    d.querySelectorAll(".view").forEach((v) => {
      v.classList.remove("active");
      v.classList.add("hidden-el");
    });
    const v = el(trg);
    v.classList.remove("hidden-el");
    void v.offsetWidth;
    v.classList.add("active");

    // Active style update
    if (b.parentElement.tagName === "NAV") {
      d.querySelectorAll("nav .nav-b").forEach((n) =>
        n.classList.remove("bg-black", "bg-opacity-20"),
      );
      b.classList.add("bg-black", "bg-opacity-20");
    }
  };
});
