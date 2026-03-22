import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://wcqkpqcyaiuocwyjtvhs.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY";
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname.toLowerCase();
  let currentUser = null;
  let allEventsGlobal = [];
  let currentSelectedEvent = null;
  let userRole = "user";

  // --- 1. REUSABLE HELPERS ---
  const showCustomAlert = (title, message) => {
    const alertModal = document.getElementById("custom-alert");
    if (alertModal) {
      document.getElementById("alert-title").innerText = title;
      document.getElementById("alert-message").innerText = message;
      alertModal.classList.remove("hidden");
    }
  };

  const closeAlertBtn = document.getElementById("close-alert");
  if (closeAlertBtn) {
    closeAlertBtn.addEventListener("click", () =>
      document.getElementById("custom-alert").classList.add("hidden"),
    );
  }

  const togglePassword = (checkboxId, ...inputIds) => {
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

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      e.target.classList.add("hidden");
    }
  });

  // --- 2. UI & SETTINGS TOGGLES ---
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

  const emailToggle = document.getElementById("email-notif-toggle");
  if (emailToggle) {
    emailToggle.checked = localStorage.getItem("emailSync") !== "false";
    emailToggle.addEventListener("change", (e) => {
      localStorage.setItem("emailSync", e.target.checked);
    });
  }

  const searchContainerDom = document.querySelector(".search-container");
  const searchInputDom = document.getElementById("search-input");
  if (searchContainerDom && searchInputDom) {
    searchContainerDom.addEventListener("click", () => searchInputDom.focus());
  }

  document.querySelectorAll(".nav-settings-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("settings-modal")?.classList.remove("hidden");
    });
  });

  document.getElementById("close-settings")?.addEventListener("click", () => {
    document.getElementById("settings-modal").classList.add("hidden");
  });

  document.getElementById("burger-btn")?.addEventListener("click", () => {
    document
      .getElementById("sidebar")
      ?.classList.toggle(window.innerWidth <= 768 ? "open" : "minimized");
  });

  document.getElementById("notif-btn")?.addEventListener("click", () => {
    document.getElementById("notif-modal")?.classList.toggle("hidden");
  });

  document.getElementById("close-auth-modal")?.addEventListener("click", () => {
    document.getElementById("auth-modal")?.classList.add("hidden");
  });

  document
    .getElementById("close-details-modal")
    ?.addEventListener("click", () => {
      document.getElementById("event-details-modal")?.classList.add("hidden");
    });

  // --- 3. DYNAMIC NOTIFICATIONS LOGIC ---
  async function loadNotifications() {
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

      if (currentUser) {
        const { data: myOrders } = await supabase
          .from("orders")
          .select("status, events(title)")
          .eq("user_id", currentUser.id)
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

  // --- 4. SESSION & DATABASE ROLE CHECK ---
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData && sessionData.session) {
    currentUser = sessionData.session.user;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, role")
        .eq("id", currentUser.id)
        .single();
      if (profile) {
        userRole = profile.role || "user";
        const greetingEl = document.getElementById("user-greeting");
        if (greetingEl)
          greetingEl.innerText = `Welcome, ${profile.first_name.toUpperCase()}!`;
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }

    if (
      (path.includes("admin") || path.includes("scanner")) &&
      userRole !== "admin"
    ) {
      window.location.href = "index.html";
      return;
    }

    if (userRole === "admin") {
      const sideMenu = document.querySelector(".side-menu");
      if (sideMenu && !document.getElementById("admin-link")) {
        const adminBtn = document.createElement("a");
        adminBtn.id = "admin-link";
        adminBtn.href = "admin.html";
        adminBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> <span>Manage Events</span>`;

        const scannerBtn = document.createElement("a");
        scannerBtn.id = "scanner-link";
        scannerBtn.href = "scanner.html";
        scannerBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg> <span>Entry Scanner</span>`;

        const logoutBtnNode = document.getElementById("logout-btn");
        if (logoutBtnNode) {
          sideMenu.insertBefore(adminBtn, logoutBtnNode);
          sideMenu.insertBefore(scannerBtn, logoutBtnNode);
        }
      }
    }

    document
      .querySelectorAll(".guest-only")
      .forEach((el) => el.classList.add("hidden"));
    document
      .querySelectorAll(".user-only")
      .forEach((el) => el.classList.remove("hidden"));
  } else {
    if (
      path.includes("admin.html") ||
      path.includes("orderlist.html") ||
      path.includes("scanner.html")
    ) {
      window.location.href = "signin.html";
      return;
    }
    document
      .querySelectorAll(".user-only")
      .forEach((el) => el.classList.add("hidden"));
    document
      .querySelectorAll(".guest-only")
      .forEach((el) => el.classList.remove("hidden"));
  }

  loadNotifications();

  // --- 5. SIGN IN & SIGN UP LOGIC ---
  if (path.includes("signup")) {
    togglePassword("show-password-signup", "password", "confirm-password");
    const tcModal = document.getElementById("tc-modal");
    const openTcBtn = document.getElementById("open-tc");
    const tcBox = document.getElementById("tc-box");
    const ackBtn = document.getElementById("acknowledge-btn");
    const tcCheckbox = document.getElementById("tc-checkbox");
    const registerBtn = document.getElementById("register-btn");

    if (openTcBtn && tcModal)
      openTcBtn.addEventListener("click", () =>
        tcModal.classList.remove("hidden"),
      );

    if (tcBox && ackBtn) {
      tcBox.addEventListener("scroll", () => {
        if (tcBox.scrollTop + tcBox.clientHeight >= tcBox.scrollHeight - 20)
          ackBtn.disabled = false;
      });
    }

    if (ackBtn && tcModal && tcCheckbox && registerBtn) {
      ackBtn.addEventListener("click", () => {
        tcModal.classList.add("hidden");
        tcCheckbox.disabled = false;
        tcCheckbox.checked = true;
        registerBtn.disabled = false;
      });
    }

    document
      .getElementById("signup-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        registerBtn.innerText = "Processing...";
        registerBtn.disabled = true;

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (password !== document.getElementById("confirm-password").value) {
          showCustomAlert("Error", "Passwords do not match.");
          registerBtn.innerText = "Sign Up";
          registerBtn.disabled = false;
          return;
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          showCustomAlert("Error", error.message);
          registerBtn.innerText = "Sign Up";
          registerBtn.disabled = false;
        } else {
          if (data.user) {
            await supabase.from("profiles").insert([
              {
                id: data.user.id,
                first_name: document.getElementById("fname").value,
                last_name: document.getElementById("lname").value,
                phone_number: document.getElementById("phone").value,
                school_email: email,
                role: "user",
              },
            ]);
          }
          showCustomAlert(
            "Success",
            "Registration successful! Please confirm your email before logging in.",
          );
          setTimeout(() => {
            window.location.href = "signin.html";
          }, 1500);
        }
      });
  }

  // --- LOGIN LOGIC ---
  if (path.includes("signin")) {
    togglePassword("show-password-signin", "password");

    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      document.getElementById("email").value = savedEmail;
      const rmCheckbox = document.getElementById("remember-me");
      if (rmCheckbox) rmCheckbox.checked = true;
    }

    document
      .getElementById("forgot-password-link")
      ?.addEventListener("click", async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("email").value;
        if (!emailInput) {
          showCustomAlert(
            "Error",
            "Please type your email address first to reset password.",
          );
          return;
        }

        // I-se-set natin ang redirect URL sa reset-password.html
        const { error } = await supabase.auth.resetPasswordForEmail(
          emailInput,
          {
            redirectTo: window.location.origin + "/reset-password.html",
          },
        );
        if (error) {
          showCustomAlert("Error", error.message);
        } else {
          showCustomAlert("Success", "Password reset link sent to your email!");
        }
      });

    document
      .getElementById("signin-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("login-btn");
        if (btn) {
          btn.innerText = "Logging in...";
          btn.disabled = true;
        }

        const emailVal = document.getElementById("email").value;
        const passVal = document.getElementById("password").value;
        const rmCheckbox = document.getElementById("remember-me");

        if (rmCheckbox && rmCheckbox.checked) {
          localStorage.setItem("rememberedEmail", emailVal);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailVal,
          password: passVal,
        });
        if (error) {
          showCustomAlert("Login Failed", error.message);
          if (btn) {
            btn.innerText = "Log In";
            btn.disabled = false;
          }
        } else {
          window.location.href = "index.html";
        }
      });
  }

  // --- RESET PASSWORD LOGIC ---
  if (path.includes("reset-password")) {
    togglePassword("show-new-password", "new-password");

    // Supabase automatically handles the hash in the URL on this page load
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event == "PASSWORD_RECOVERY") {
        // Show the form
        document
          .getElementById("reset-password-form")
          ?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById("new-password").value;
            const btn = document.getElementById("update-pwd-btn");
            btn.innerText = "Updating...";
            btn.disabled = true;

            const { error } = await supabase.auth.updateUser({
              password: newPassword,
            });

            if (error) {
              showCustomAlert("Error", error.message);
              btn.innerText = "Update Password";
              btn.disabled = false;
            } else {
              showCustomAlert("Success", "Password updated successfully!");
              setTimeout(() => {
                window.location.href = "signin.html";
              }, 2000);
            }
          });
      }
    });
  }

  // --- 6. DASHBOARD EVENTS & REGISTRATION LOGIC ---
  const isUserRegistered = async (eventId) => {
    if (!currentUser) return false;
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("event_id", eventId)
      .not("status", "eq", "Cancelled"); // Ignore cancelled orders when checking if registered
    return data && data.length > 0;
  };

  const eventsGrid = document.getElementById("events-grid");
  if (
    eventsGrid &&
    (path === "/" || path.includes("index.html") || path === "")
  ) {
    const { data: events } = await supabase.from("events").select("*");
    if (events) {
      allEventsGlobal = events;
      renderEvents(allEventsGlobal);
    }

    document.getElementById("search-input")?.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      renderEvents(
        allEventsGlobal.filter((ev) => ev.title.toLowerCase().includes(term)),
      );
    });

    document
      .getElementById("campus-select")
      ?.addEventListener("change", (e) => {
        const campus = e.target.value;
        renderEvents(
          campus === "All"
            ? allEventsGlobal
            : allEventsGlobal.filter((ev) => ev.campus === campus),
        );
      });
  }

  async function renderEvents(eventsToRender) {
    if (!eventsGrid) return;
    eventsGrid.innerHTML = "";

    if (eventsToRender.length === 0) {
      eventsGrid.innerHTML = "<p>No events match your criteria.</p>";
      return;
    }

    for (const event of eventsToRender) {
      const isPaidText = event.price > 0 ? `₱${event.price}` : "FREE";

      // Fetch available slots for display on card
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .not("status", "eq", "Cancelled");

      const currentCount = count || 0;
      const maxCap = event.max_capacity || 100;
      const slotsLeft = Math.max(0, maxCap - currentCount);
      const slotsText =
        slotsLeft === 0
          ? `<b style="color:red;">Sold Out</b>`
          : `<b>${slotsLeft}</b> slots left`;

      const card = document.createElement("div");
      card.className = "event-card";
      card.setAttribute("data-id", event.id);
      card.innerHTML = `
                <img src="${event.poster_url || "https://via.placeholder.com/300x160?text=FEUR+Event"}" class="event-img">
                <div class="event-info">
                    <div class="event-title">${event.title}</div>
                    <div class="event-meta">
                        <span>📅 ${event.event_date || "TBA"} | ${event.event_time || ""}</span>
                        <span>📍 FEU Roosevelt ${event.campus}</span>
                        <span>🎟️ <b style="color:var(--primary);">${isPaidText}</b></span>
                        <span style="font-size:12px; margin-top:5px;">📊 ${slotsText}</span>
                    </div>
                </div>
            `;

      card.addEventListener("click", async () => {
        currentSelectedEvent = event;
        document.getElementById("modal-event-img").src =
          event.poster_url ||
          "https://via.placeholder.com/500x200?text=FEUR+Event";
        document.getElementById("modal-event-title").innerText = event.title;
        document.getElementById("modal-event-meta").innerHTML =
          `📅 ${event.event_date || "TBA"} at ${event.event_time || ""} <br>📍 FEU Roosevelt ${event.campus} <br><br>📊 <b>Available Slots:</b> ${slotsLeft} / ${maxCap}`;
        document.getElementById("modal-event-desc").innerText =
          event.description || "No description available for this event.";

        const modalBtn = document.getElementById("modal-register-btn");
        if (modalBtn) {
          modalBtn.innerText = "Checking...";
          modalBtn.disabled = true;

          const registered = await isUserRegistered(event.id);

          if (registered) {
            modalBtn.innerText = "Registered";
            modalBtn.style.background = "gray";
            modalBtn.style.color = "white";
            modalBtn.disabled = true;
          } else if (slotsLeft <= 0) {
            modalBtn.innerText = "Sold Out";
            modalBtn.style.background = "#ef4444";
            modalBtn.style.color = "white";
            modalBtn.disabled = true;
          } else {
            if (event.price > 0) {
              modalBtn.innerText = `Pay ₱${event.price}`;
              modalBtn.style.background = "var(--secondary)";
              modalBtn.style.color = "black";
            } else {
              modalBtn.innerText = "Register Now";
              modalBtn.style.background = "var(--primary)";
              modalBtn.style.color = "white";
            }
            modalBtn.disabled = false;
          }
        }
        document
          .getElementById("event-details-modal")
          ?.classList.remove("hidden");
      });
      eventsGrid.appendChild(card);
    }
  }

  document
    .getElementById("modal-register-btn")
    ?.addEventListener("click", async () => {
      if (!currentUser) {
        document.getElementById("event-details-modal")?.classList.add("hidden");
        document.getElementById("auth-modal")?.classList.remove("hidden");
        return;
      }

      const modalRegBtn = document.getElementById("modal-register-btn");
      modalRegBtn.innerText = "Registering...";
      modalRegBtn.disabled = true;

      const alreadyIn = await isUserRegistered(currentSelectedEvent.id);
      if (alreadyIn) {
        showCustomAlert(
          "Notification",
          "You are already registered for this event!",
        );
        modalRegBtn.innerText = "Registered";
        modalRegBtn.style.background = "gray";
        modalRegBtn.style.color = "white";
        return;
      }

      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("event_id", currentSelectedEvent.id)
        .not("status", "eq", "Cancelled");
      const maxCap = currentSelectedEvent.max_capacity || 100;
      if ((count || 0) >= maxCap) {
        showCustomAlert("Error", "Sorry, this event is already sold out.");
        modalRegBtn.innerText = "Sold Out";
        modalRegBtn.style.background = "#ef4444";
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            user_id: currentUser.id,
            event_id: currentSelectedEvent.id,
            status: "Registered",
          },
        ])
        .select();

      if (error || !data) {
        showCustomAlert("Error", "An error occurred during registration.");
        modalRegBtn.disabled = false;
      } else {
        const orderData = data[0];
        const greetingEl = document.getElementById("user-greeting");
        const userName = greetingEl
          ? greetingEl.innerText.replace("Welcome, ", "").replace("!", "")
          : "Student";
        const ticketID = `FEUR-TICKET-${orderData.id}`;

        if (typeof emailjs !== "undefined") {
          emailjs
            .send("service_nczv2qc", "template_uiwfmsd", {
              to_email: currentUser.email,
              user_name: userName,
              event_title: currentSelectedEvent.title,
              event_date: currentSelectedEvent.event_date || "TBA",
              campus: currentSelectedEvent.campus,
              qr_data: ticketID,
            })
            .then(() => console.log("Ticket sent!"))
            .catch((err) => console.error("Email error:", err));
        }
        showCustomAlert(
          "Success",
          "Successfully Registered! You can view your QR ticket in the Order List.",
        );
        modalRegBtn.innerText = "Registered";
        modalRegBtn.style.background = "gray";
        modalRegBtn.style.color = "white";
        loadNotifications();

        // Refresh event grid to update slot count
        if (allEventsGlobal.length > 0) {
          renderEvents(allEventsGlobal);
        }
      }
    });

  // --- 7. ADMIN DASHBOARD CRUD ---
  if (path.includes("admin") && userRole === "admin") {
    const fetchAdminEvents = async () => {
      const { data: events } = await supabase.from("events").select("*");
      const list = document.getElementById("admin-event-list");
      if (list && events) {
        list.innerHTML = events
          .map(
            (ev) => `
            <tr>
                <td>${ev.title}</td><td>${ev.campus}</td><td>${ev.event_date}</td><td>${ev.price > 0 ? "₱" + ev.price : "FREE"}</td>
                <td style="display:flex; gap:5px;">
                    <button class="btn btn-solid" style="background:#3b82f6; color:white; padding:5px 10px;" onclick="window.exportEvent('${ev.id}', '${ev.title.replace(/'/g, "\\'")}')">Export</button>
                    <button class="btn btn-solid" style="background:#facc15; padding:5px 10px; color:black;" onclick="window.editEvent('${ev.id}')">Edit</button>
                    <button class="btn btn-solid" style="background:#ef4444; color:white; padding:5px 10px;" onclick="window.deleteEvent('${ev.id}')">Delete</button>
                </td>
            </tr>`,
          )
          .join("");
        if (document.getElementById("stat-events"))
          document.getElementById("stat-events").innerText = events.length;
      }

      // Update Total Orders
      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      if (document.getElementById("stat-orders"))
        document.getElementById("stat-orders").innerText = orderCount || 0;

      // Update Total Attended (Analytics)
      const { count: attendedCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "Attended");
      if (document.getElementById("stat-attended"))
        document.getElementById("stat-attended").innerText = attendedCount || 0;
    };

    // EXPORT TO CSV LOGIC (UPDATED & SAFE)
    window.exportEvent = async (eventId, eventTitle) => {
      // 1. Kunin muna ang orders ng event na ito
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("user_id, status")
        .eq("event_id", eventId);

      if (ordersError || !ordersData || ordersData.length === 0) {
        showCustomAlert("Notice", "No attendees found for this event.");
        return;
      }

      // 2. Kunin ang user IDs
      const userIds = ordersData.map((order) => order.user_id);

      // 3. Kunin ang profiles gamit ang mga user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, school_email")
        .in("id", userIds);

      // 4. Buuin ang CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "First Name,Last Name,Email,Status\n";

      ordersData.forEach((order) => {
        const profile = profilesData?.find((p) => p.id === order.user_id) || {};
        const fname = profile.first_name || "N/A";
        const lname = profile.last_name || "N/A";
        const email = profile.school_email || "N/A";
        csvContent += `${fname},${lname},${email},${order.status}\n`;
      });

      // 5. I-download ang file
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `${eventTitle.replace(/\s+/g, "_")}_Attendance.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    window.deleteEvent = async (id) => {
      if (confirm("Delete this event?")) {
        await supabase.from("events").delete().eq("id", id);
        fetchAdminEvents();
        showCustomAlert("System", "Event deleted.");
      }
    };

    // ==========================================
    // EVENT CRUD LOGIC WITH MODAL
    // ==========================================
    const eventModal = document.getElementById("event-modal");

    document
      .getElementById("open-create-event-modal")
      ?.addEventListener("click", () => {
        document.getElementById("event-form").reset();
        document.getElementById("event-id").value = "";
        document.getElementById("form-title").innerText = "Add New Event";
        if (eventModal) eventModal.classList.remove("hidden");
      });

    document
      .getElementById("close-event-modal")
      ?.addEventListener("click", () => {
        if (eventModal) eventModal.classList.add("hidden");
      });

    window.editEvent = async (id) => {
      const { data: ev } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      if (ev) {
        document.getElementById("event-id").value = ev.id;
        document.getElementById("title").value = ev.title;
        document.getElementById("campus").value = ev.campus;
        document.getElementById("date").value = ev.event_date || ev.date;
        document.getElementById("price").value = ev.price || 0;
        document.getElementById("desc").value = ev.description;
        document.getElementById("poster_url").value = ev.poster_url;

        document.getElementById("form-title").innerText = "Edit: " + ev.title;
        if (eventModal) eventModal.classList.remove("hidden");
      }
    };

    document
      .getElementById("event-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("event-id").value;
        const btn = e.submitter;
        btn.innerText = "Saving...";
        btn.disabled = true;

        const eventData = {
          title: document.getElementById("title").value,
          campus: document.getElementById("campus").value,
          event_date: document.getElementById("date").value,
          price: document.getElementById("price").value,
          description: document.getElementById("desc").value,
          poster_url: document.getElementById("poster_url").value,
        };

        if (id) {
          await supabase.from("events").update(eventData).eq("id", id);
          showCustomAlert("Success", "Event Updated!");
        } else {
          await supabase.from("events").insert([eventData]);
          showCustomAlert("Success", "Event Created!");
        }

        document.getElementById("event-form").reset();
        document.getElementById("event-id").value = "";
        if (eventModal) eventModal.classList.add("hidden");

        btn.innerText = "Save Event";
        btn.disabled = false;
        fetchAdminEvents();
      });

    fetchAdminEvents();

    // ==========================================
    // IDINAGDAG KO ANG USER MANAGEMENT DITO
    // ==========================================
    const fetchAdminUsers = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("first_name", { ascending: true });
      const list = document.getElementById("admin-user-list");

      if (list && profiles) {
        list.innerHTML = profiles
          .map(
            (p) => `
          <tr>
            <td><b>${p.first_name || ""} ${p.last_name || ""}</b></td>
            <td>${p.school_email}</td>
            <td>${p.phone_number || "N/A"}</td>
            <td><span class="status-badge" style="background:${p.role === "admin" ? "#fef08a" : "#e5e7eb"}; color:black; padding: 4px 8px; border-radius: 4px;">${p.role}</span></td>
            <td><button class="btn btn-solid" style="background:#facc15; padding:5px 15px; color:black; border:none; border-radius:4px; cursor:pointer;" onclick="window.manageUser('${p.id}')">Manage</button></td>
          </tr>`,
          )
          .join("");
      }
    };

    const phoneInput = document.getElementById("edit-user-phone");
    if (phoneInput) {
      phoneInput.setAttribute("maxlength", "11");
      phoneInput.addEventListener("input", function () {
        this.value = this.value.replace(/[^0-9]/g, "");
      });
    }

    window.manageUser = async (userId) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (profile) {
        document.getElementById("edit-user-id").value = profile.id;
        document.getElementById("edit-user-fname").value =
          profile.first_name || "";
        document.getElementById("edit-user-lname").value =
          profile.last_name || "";
        document.getElementById("edit-user-phone").value =
          profile.phone_number || "";
        document.getElementById("edit-user-role").value =
          profile.role || "user";

        const titleEl = document.getElementById("user-modal-title");
        if (titleEl) titleEl.innerText = `Manage: ${profile.school_email}`;
      }

      const { data: orders } = await supabase
        .from("orders")
        .select("status, events(title)")
        .eq("user_id", userId);
      const ordersList = document.getElementById("user-orders-list");
      if (ordersList) {
        if (orders && orders.length > 0) {
          ordersList.innerHTML = orders
            .map(
              (o) =>
                `<tr><td>${o.events?.title || "Unknown"}</td><td><span class="status-badge">${o.status}</span></td></tr>`,
            )
            .join("");
        } else {
          ordersList.innerHTML = `<tr><td colspan="2" style="text-align:center;">No records.</td></tr>`;
        }
      }

      const modal = document.getElementById("user-management-modal");
      if (modal) modal.classList.remove("hidden");
    };

    document
      .getElementById("edit-user-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userId = document.getElementById("edit-user-id").value;
        const updates = {
          first_name: document.getElementById("edit-user-fname").value,
          last_name: document.getElementById("edit-user-lname").value,
          phone_number: document.getElementById("edit-user-phone").value,
          role: document.getElementById("edit-user-role").value,
        };

        const btn = e.submitter;
        btn.innerText = "Saving...";
        btn.disabled = true;

        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", userId);
        if (error) {
          showCustomAlert("Error", "Failed to update profile.");
        } else {
          showCustomAlert("Success", "Profile updated successfully!");
          document
            .getElementById("user-management-modal")
            .classList.add("hidden");
          fetchAdminUsers();
        }
        btn.innerText = "Save Profile Changes";
        btn.disabled = false;
      });

    document
      .getElementById("close-user-modal")
      ?.addEventListener("click", () => {
        document
          .getElementById("user-management-modal")
          .classList.add("hidden");
      });

    fetchAdminUsers();
  }

  // --- 8. ORDER LIST LOGIC ---
  const ordersGrid = document.getElementById("orders-grid");
  if (ordersGrid && path.includes("orderlist")) {
    const fetchOrders = async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `id, status, events ( id, title, event_date, campus, poster_url, price )`,
        )
        .eq("user_id", currentUser.id);

      ordersGrid.innerHTML = "";
      if (error || !orders || orders.length === 0) {
        ordersGrid.innerHTML = "<p>You have no registered events yet.</p>";
      } else {
        orders.forEach((order) => {
          const event = order.events;
          const isCancelled = order.status === "Cancelled";
          const card = document.createElement("div");
          card.className = "event-card";

          // Cancel button logic: Only allow cancel if FREE and not already cancelled/attended
          let cancelBtnHTML = "";
          if (!isCancelled && order.status !== "Attended" && event.price == 0) {
            cancelBtnHTML = `<button class="btn btn-outline w-100 cancel-ticket-btn" data-order-id="${order.id}" style="margin-top: 5px; border-color:#ef4444; color:#ef4444;">Cancel Ticket</button>`;
          } else if (
            !isCancelled &&
            order.status !== "Attended" &&
            event.price > 0
          ) {
            cancelBtnHTML = `<button class="btn btn-outline w-100" disabled style="margin-top: 5px; border-color:#9ca3af; color:#9ca3af; font-size:12px;">Contact Admin for Refund</button>`;
          }

          const qrBtnStyle = isCancelled ? "display:none;" : "";
          const statusStyle = isCancelled
            ? "background:#fee2e2; color:#991b1b;"
            : "";

          card.innerHTML = `
                        <img src="${event.poster_url || "https://via.placeholder.com/300x160?text=FEUR+Ticket"}" class="event-img" style="${isCancelled ? "filter: grayscale(100%);" : ""}">
                        <div class="event-info">
                            <span class="status-badge" style="${statusStyle}">${order.status}</span>
                            <div class="event-title" style="${isCancelled ? "text-decoration: line-through; color:gray;" : ""}">${event.title}</div>
                            <div class="event-meta">
                                <span>📅 ${event.event_date || "TBA"}</span>
                                <span>📍 FEU Roosevelt ${event.campus}</span>
                            </div>
                            <button class="btn btn-solid w-100 qr-code-btn" data-order-id="${order.id}" data-event-title="${event.title}" style="${qrBtnStyle}">View QR Code</button>
                            ${cancelBtnHTML}
                        </div>`;
          ordersGrid.appendChild(card);
        });

        // QR Code Event Listener
        document.querySelectorAll(".qr-code-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const orderId = btn.getAttribute("data-order-id");
            const eventTitle = btn.getAttribute("data-event-title");
            document.getElementById("qr-event-title").innerText = eventTitle;
            const qrContainer = document.getElementById("qr-code-image");
            qrContainer.innerHTML = "";
            if (typeof QRCode !== "undefined") {
              new QRCode(qrContainer, {
                text: `FEUR-TICKET-${orderId}`,
                width: 250,
                height: 250,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H,
              });
            } else {
              console.error("ERROR: QRCode library hindi nag-load!");
            }
            document.getElementById("qr-modal")?.classList.remove("hidden");
          });
        });

        // Cancel Ticket Event Listener
        document.querySelectorAll(".cancel-ticket-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const orderId = btn.getAttribute("data-order-id");
            if (
              confirm(
                "Are you sure you want to cancel your registration for this event? This action cannot be undone.",
              )
            ) {
              btn.innerText = "Cancelling...";
              btn.disabled = true;

              const { error } = await supabase
                .from("orders")
                .update({ status: "Cancelled" })
                .eq("id", orderId);

              if (error) {
                showCustomAlert("Error", "Failed to cancel ticket.");
                btn.innerText = "Cancel Ticket";
                btn.disabled = false;
              } else {
                showCustomAlert(
                  "Success",
                  "Your registration has been cancelled.",
                );
                fetchOrders(); // Reload the list
                loadNotifications(); // Update notif bell
              }
            }
          });
        });
      }
    };

    fetchOrders(); // Initial load

    document.getElementById("close-qr-modal")?.addEventListener("click", () => {
      document.getElementById("qr-modal")?.classList.add("hidden");
    });
  }

  // --- 9. LOGOUT LOGIC ---
  document.querySelectorAll("#logout-btn, .nav-logout").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = "index.html";
    });
  });

  // --- 10. ADMIN & ADMISSION QR SCANNER LOGIC ---
  if (path.includes("admin")) {
    setTimeout(() => {
      const scannerElement = document.getElementById("reader");
      if (scannerElement) {
        const scannerResult = document.getElementById("scanner-result");
        let isScanning = false;
        const qrCodeSuccessCallback = async (decodedText) => {
          if (isScanning) return;
          isScanning = true;
          scannerResult.innerText = "Checking record...";
          if (!decodedText.startsWith("FEUR-TICKET-")) {
            scannerResult.innerText = "INVALID: Not a FEUR ticket.";
            scannerResult.style.background = "#fee2e2";
            scannerResult.style.color = "#991b1b";
            setTimeout(() => {
              isScanning = false;
              scannerResult.innerText = "Ready to check ticket.";
              scannerResult.style.background = "#f4f6f8";
            }, 2000);
            return;
          }
          const orderID = decodedText.replace("FEUR-TICKET-", "");
          const { data, error } = await supabase
            .from("orders")
            .select(`status, events ( title )`)
            .eq("id", orderID)
            .single();
          if (error || !data) {
            scannerResult.innerText = "INVALID: Ticket not found in DB.";
            scannerResult.style.background = "#fee2e2";
            scannerResult.style.color = "#991b1b";
          } else {
            scannerResult.innerText = `LEGIT TICKET! Event: ${data.events.title} | Status: ${data.status}`;
            if (data.status === "Cancelled") {
              scannerResult.style.background = "#fee2e2";
              scannerResult.style.color = "#991b1b";
            } else {
              scannerResult.style.background = "#dcfce7";
              scannerResult.style.color = "#166534";
            }
          }
          setTimeout(() => {
            isScanning = false;
            scannerResult.innerText = "Ready to check ticket.";
            scannerResult.style.background = "#f4f6f8";
            scannerResult.style.color = "#333";
          }, 4000);
        };
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false,
        );
        html5QrcodeScanner.render(qrCodeSuccessCallback);
      }
    }, 1000);
  }

  if (path.includes("scanner")) {
    setTimeout(() => {
      const entryElement = document.getElementById("entry-reader");
      if (entryElement) {
        const entryResult = document.getElementById("entry-result");
        let isEntryScanning = false;
        const entrySuccessCallback = async (decodedText) => {
          if (isEntryScanning) return;
          isEntryScanning = true;
          entryResult.innerText = "Validating Admission...";
          if (!decodedText.startsWith("FEUR-TICKET-")) {
            entryResult.innerText = "❌ DENIED: Invalid QR Format.";
            entryResult.style.background = "#fee2e2";
            entryResult.style.color = "#991b1b";
            setTimeout(() => {
              isEntryScanning = false;
              entryResult.innerText = "Waiting for ticket...";
              entryResult.style.background = "#f4f6f8";
            }, 2000);
            return;
          }
          const orderID = decodedText.replace("FEUR-TICKET-", "");
          const { data, error } = await supabase
            .from("orders")
            .select(`status, events ( title )`)
            .eq("id", orderID)
            .single();
          if (error || !data) {
            entryResult.innerText = "❌ DENIED: Ticket Not Found.";
            entryResult.style.background = "#fee2e2";
            entryResult.style.color = "#991b1b";
          } else {
            if (data.status === "Cancelled") {
              entryResult.innerText = "❌ DENIED: Ticket was Cancelled.";
              entryResult.style.background = "#fee2e2";
              entryResult.style.color = "#991b1b";
            } else if (data.status === "Attended") {
              entryResult.innerText = `⚠️ ALREADY SCANNED for ${data.events.title}.`;
              entryResult.style.background = "#fef3c7";
              entryResult.style.color = "#92400e";
            } else {
              await supabase
                .from("orders")
                .update({ status: "Attended" })
                .eq("id", orderID);
              entryResult.innerText = `✅ ADMITTED! Welcome to ${data.events.title}.`;
              entryResult.style.background = "#dcfce7";
              entryResult.style.color = "#166534";
            }
          }
          setTimeout(() => {
            isEntryScanning = false;
            entryResult.innerText = "Waiting for ticket...";
            entryResult.style.background = "#f4f6f8";
            entryResult.style.color = "#333";
          }, 3000);
        };
        const entryScanner = new Html5QrcodeScanner(
          "entry-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false,
        );
        entryScanner.render(entrySuccessCallback);
      }
    }, 1000);
  }
});
