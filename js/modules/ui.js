import { supabase } from "./api.js";
import { state } from "./state.js";

// --- 1. REUSABLE HELPERS ---
export const showCustomAlert = (title, message) => {
  const alertModal = document.getElementById("custom-alert");
  if (alertModal) {
    document.getElementById("alert-title").innerText = title;
    document.getElementById("alert-message").innerHTML = message;
    alertModal.classList.remove("hidden");
  }
};

export const showCustomConfirm = (title, message, onConfirm) => {
  const confirmModal = document.getElementById("custom-confirm");
  if (confirmModal) {
    document.getElementById("confirm-title").innerText = title;
    document.getElementById("confirm-message").innerHTML = message;
    confirmModal.classList.remove("hidden");

    const okBtn = document.getElementById("confirm-ok-btn");
    const cancelBtn = document.getElementById("confirm-cancel-btn");

    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newCancelBtn.addEventListener("click", () => {
      confirmModal.classList.add("hidden");
    });

    newOkBtn.addEventListener("click", () => {
      confirmModal.classList.add("hidden");
      onConfirm();
    });
  }
};

export const togglePassword = (checkboxId, ...inputIds) => {
  const checkbox = document.getElementById(checkboxId);
  if (checkbox) {
    checkbox.addEventListener("change", function () {
      inputIds.forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.type = this.checked ? "text" : "password";
      });
    });
  }
};

// --- 2. DYNAMIC NOTIFICATIONS LOGIC ---
export async function loadNotifications() {
  const notifContainer = document.getElementById("notif-list");
  const notifBtn = document.getElementById("notif-btn");
  if (!notifContainer || !notifBtn) return;

  try {
    let notifs = [];
    const { data: eventsData } = await supabase
      .from("events")
      .select("title")
      .limit(1);
    if (eventsData?.length > 0) {
      notifs.push(
        `<div class="notif-item">📢 <b>New Event:</b> ${eventsData[0].title}</div>`,
      );
    }

    if (state.currentUser) {
      const { data: myOrders } = await supabase
        .from("orders")
        .select("status, events(title)")
        .eq("user_id", state.currentUser.id)
        .limit(2);
      myOrders?.forEach((order) => {
        const title = order.events?.title || "Event";
        notifs.push(
          `<div class="notif-item">${order.status === "Registered" ? "✅" : "🎓"} <b>${order.status}:</b> ${title}</div>`,
        );
      });
    }

    notifContainer.innerHTML = notifs.length
      ? notifs.join("")
      : '<div class="notif-empty">No notifications</div>';

    const lastCount = parseInt(localStorage.getItem("lastNotifCount") || "0");
    const bellIconSVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>`;

    if (notifs.length > lastCount) {
      const unreadCount = notifs.length - lastCount;
      notifBtn.innerHTML = `${bellIconSVG}<span class="notif-badge" style="pointer-events: none;">${unreadCount}</span>`;
    } else {
      notifBtn.innerHTML = bellIconSVG;
    }

    const newNotifBtn = notifBtn.cloneNode(true);
    notifBtn.parentNode.replaceChild(newNotifBtn, notifBtn);

    newNotifBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById("notif-modal");
      if (!modal) return;
      const isHidden = modal.classList.toggle("hidden");
      if (!isHidden) {
        localStorage.setItem("lastNotifCount", notifs.length);
        const badge = newNotifBtn.querySelector(".notif-badge");
        if (badge) badge.remove();
      }
    });
  } catch (err) {
    console.error(err);
  }
}

// --- 3. SETTINGS MODAL INJECTION (Global) ---
// Injects the settings modal into the body if it doesn't already exist.
// This makes Settings work on ALL pages without duplicating HTML.
function injectSettingsModal() {
  if (document.getElementById("settings-modal")) return; // already present
  const modal = document.createElement("div");
  modal.id = "settings-modal";
  modal.className = "modal-overlay hidden";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>Settings</h3>
      <div class="setting-item">
        <span>Dark Mode</span>
        <label class="switch"><input type="checkbox" id="dark-toggle" /><span class="slider"></span></label>
      </div>
      <div class="setting-item">
        <span>Outlook Email Updates</span>
        <label class="switch"><input type="checkbox" id="email-notif-toggle" checked /><span class="slider"></span></label>
      </div>
      <button id="close-settings" class="btn btn-solid" style="width:100%;margin-top:20px">Save &amp; Close</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// --- 4. UI & SETTINGS TOGGLES (Init) ---
export function initUI() {
  // Always inject the settings modal first so all subsequent selectors find it.
  injectSettingsModal();

  const closeAlertBtn = document.getElementById("close-alert");
  if (closeAlertBtn) {
    closeAlertBtn.addEventListener("click", () =>
      document.getElementById("custom-alert").classList.add("hidden"),
    );
  }

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      e.target.classList.add("hidden");
    }
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", (e) => {
    const sidebar = document.getElementById("sidebar");
    const burgerBtn = document.getElementById("burger-btn");
    if (sidebar && sidebar.classList.contains("open") && window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && (!burgerBtn || !burgerBtn.contains(e.target))) {
        sidebar.classList.remove("open");
      }
    }
  });

  // --- CONTACT FORM (EmailJS) with dynamic user email + subject ---
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("send-help-btn");
      if (btn) btn.innerText = "Sending...";

      // Dynamically get the logged-in user's email from Supabase auth session
      let userEmail = "Guest (not logged in)";
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData && sessionData.session) {
          userEmail = sessionData.session.user.email;
        }
      } catch (err) {
        console.error("Could not fetch user session for email:", err);
      }

      // Get the selected subject from the dropdown
      const subjectEl = document.getElementById("contact-subject");
      const subject = subjectEl ? subjectEl.value : "General Inquiry";

      // Get the message
      const messageEl = document.getElementById("contact-message");
      const message = messageEl ? messageEl.value : "";

      if (window.emailjs) {
        emailjs
          .send("service_nczv2qc", "template_4unbsmi", {
            from_email: userEmail,
            subject: subject,
            message: message,
          })
          .then(() => {
            showCustomAlert("Success", "Message sent successfully!");
            contactForm.reset();
            if (btn) btn.innerText = "Send Message";
          })
          .catch((error) => {
            console.error("EmailJS error:", error);
            showCustomAlert("Error", "Failed to send message. Please try again.");
            if (btn) btn.innerText = "Send Message";
          });
      }
    });
  }

  // Dark mode toggle
  const darkModeToggle = document.getElementById("dark-toggle");
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    if (darkModeToggle) darkModeToggle.checked = true;
  }
  if (darkModeToggle) {
    darkModeToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem("darkMode", darkModeToggle.checked);
    });
  }

  // Email sync toggle
  const emailToggle = document.getElementById("email-notif-toggle");
  if (emailToggle) {
    emailToggle.checked = localStorage.getItem("emailSync") !== "false";
    emailToggle.addEventListener("change", (e) => {
      localStorage.setItem("emailSync", e.target.checked);
    });
  }

  // Search container focus
  const searchContainerDom = document.querySelector(".search-container");
  const searchInputDom = document.getElementById("search-input");
  if (searchContainerDom && searchInputDom) {
    searchContainerDom.addEventListener("click", () => searchInputDom.focus());
  }

  // Settings modal close
  document.getElementById("close-settings")?.addEventListener("click", () => {
    document.getElementById("settings-modal").classList.add("hidden");
  });

  // Burger button toggle
  document.getElementById("burger-btn")?.addEventListener("click", function() {
    this.classList.toggle("active");
    document
      .getElementById("sidebar")
      ?.classList.toggle(window.innerWidth <= 768 ? "open" : "minimized");
  });

  // Notification button
  document.getElementById("notif-btn")?.addEventListener("click", () => {
    document.getElementById("notif-modal")?.classList.toggle("hidden");
  });

  // Auth modal close
  document.getElementById("close-auth-modal")?.addEventListener("click", () => {
    document.getElementById("auth-modal")?.classList.add("hidden");
  });

  // Event details modal close
  document
    .getElementById("close-details-modal")
    ?.addEventListener("click", () => {
      document.getElementById("event-details-modal")?.classList.add("hidden");
    });
}

// --- 5. SIDEBAR RENDERING ---
export function renderSidebar(role) {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  const path = state.path;
  const isDash = path === "/" || path.includes("index.html") || path === "";

  // Dynamic path prefixes: pages in /pages/ link to siblings; root links up
  const inPages = path.includes("pages/");
  const pagePrefix = inPages ? "" : "pages/";   // prefix to reach /pages/ siblings
  const rootPrefix = inPages ? "../" : "";       // prefix to reach root (index.html)

  const dashPath = rootPrefix + "index.html";
  const orderPath = pagePrefix + "orderlist.html";
  const helpPath = pagePrefix + "help.html";
  const mapsPath = pagePrefix + "maps.html";

  const dashActive = isDash ? "active" : "";
  const orderActive = path.includes("orderlist") ? "active" : "";
  const helpActive = path.includes("help") ? "active" : "";
  const mapsActive = path.includes("maps") ? "active" : "";

  // Admin-only links: only rendered if role is exactly 'admin'
  let adminLinks = "";
  if (role === "admin") {
    const adminPath = pagePrefix + "admin.html";
    const scannerPath = pagePrefix + "scanner.html";
    adminLinks = `
      <a href="${adminPath}" class="${path.includes('admin') ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> <span>Manage Events</span>
      </a>
      <a href="${scannerPath}" class="${path.includes('scanner') ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg> <span>Entry Scanner</span>
      </a>
    `;
  }

  const html = `
    <nav class="side-menu main-links">
      <a href="${dashPath}" class="${dashActive}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>Dashboard</span>
      </a>
      <a href="${orderPath}" class="${orderActive} user-only hidden">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        <span>Order List</span>
      </a>
      <a href="${helpPath}" class="${helpActive}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span>Help</span>
      </a>
      <a href="${mapsPath}" class="${mapsActive}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <span>Campus Maps</span>
      </a>
      ${adminLinks}
    </nav>
    <div class="sidebar-bottom">
      <nav class="side-menu">
        <a href="#" class="nav-settings-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span>Settings</span>
        </a>
        <a href="#" id="logout-btn" class="user-only hidden logout-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span>Logout</span>
        </a>
      </nav>
    </div>
  `;

  sidebar.innerHTML = html;

  // Wire up settings button click
  document.querySelectorAll(".nav-settings-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("settings-modal")?.classList.remove("hidden");
    });
  });

  // Wire up logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    if (state.currentUser) {
      logoutBtn.classList.remove("hidden");
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = rootPrefix + "index.html";
      });
    }
  }
}
