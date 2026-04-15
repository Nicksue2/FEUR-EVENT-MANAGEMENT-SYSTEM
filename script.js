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
      document.getElementById("alert-message").innerHTML = message;
      alertModal.classList.remove("hidden");
    }
  };

  // --- CUSTOM CONFIRM HELPER ---
  const showCustomConfirm = (title, message, onConfirm) => {
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
        registerBtn.classList.remove("loading-btn");

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (password !== document.getElementById("confirm-password").value) {
          showCustomAlert("Error", "Passwords do not match.");
          registerBtn.innerText = "Sign Up";
          registerBtn.disabled = false;
          registerBtn.classList.remove("loading-btn");
          return;
        }

        const captchaToken = document.querySelector(
          '[name="cf-turnstile-response"]',
        )?.value;

        if (!captchaToken) {
          showCustomAlert("Error", "Please complete the Captcha verification!");
          registerBtn.innerText = "Sign Up";
          registerBtn.disabled = false;
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            captchaToken: captchaToken,
          },
        });
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

        const captchaToken = document.querySelector(
          '[name="cf-turnstile-response"]',
        )?.value;
        if (!captchaToken) {
          showCustomAlert(
            "Error",
            "Please complete the Captcha verification first!",
          );
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(
          emailInput,
          {
            redirectTo: window.location.origin + "/reset-password.html",
            captchaToken: captchaToken,
          },
        );

        if (typeof turnstile !== "undefined") turnstile.reset();

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
          btn.classList.add("loading-btn");
        }

        const emailVal = document.getElementById("email").value;
        const passVal = document.getElementById("password").value;
        const rmCheckbox = document.getElementById("remember-me");

        if (rmCheckbox && rmCheckbox.checked) {
          localStorage.setItem("rememberedEmail", emailVal);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        const captchaToken = document.querySelector(
          '[name="cf-turnstile-response"]',
        )?.value;

        if (!captchaToken) {
          showCustomAlert("Error", "Please complete the verification!");
          if (btn) {
            btn.innerText = "Log In";
            btn.disabled = false;
          }
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailVal,
          password: passVal,
          options: {
            captchaToken: captchaToken,
          },
        });

        if (error) {
          showCustomAlert("Login Failed", error.message);
          if (typeof turnstile !== "undefined") turnstile.reset();
          if (btn) {
            btn.innerText = "Log In";
            btn.disabled = false;
            btn.classList.remove("loading-btn");
          }
        } else {
          window.location.href = "index.html";
        }
      });
  }

  // --- RESET PASSWORD LOGIC ---
  if (path.includes("reset-password")) {
    togglePassword("show-new-password", "new-password", "confirm-new-password");

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("error")) {
      showCustomAlert(
        "Error",
        "Link is expired or invalid. Please request a new one from the Log In page.",
      );
    }

    document
      .getElementById("reset-password-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById("new-password").value;
        const confirmPassword = document.getElementById(
          "confirm-new-password",
        ).value;

        if (newPassword !== confirmPassword) {
          showCustomAlert("Error", "Passwords do not match.");
          return;
        }

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

  // --- 6. DASHBOARD EVENTS & REGISTRATION LOGIC ---
  const isUserRegistered = async (eventId) => {
    if (!currentUser) return false;
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("event_id", eventId)
      .not("status", "eq", "Cancelled");
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

        // Ipakita ang GCash details kapag may bayad
        const paymentSection = document.getElementById('payment-section');
        const priceDisplay = document.getElementById('modal-price-display');
        if (paymentSection) {
            if (event.price > 0) {
                paymentSection.style.display = "block";
                if(priceDisplay) priceDisplay.innerText = event.price;
            } else {
                paymentSection.style.display = "none";
            }
        }

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
              modalBtn.innerText = `Register Now`;
              modalBtn.style.background = "var(--primary)";
              modalBtn.style.color = "white";
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

      // [SEARCH: PAYMENT_STATUS_SETUP]
      let paymentStat = currentSelectedEvent.price > 0 ? 'unpaid' : 'free';
      let orderStat = currentSelectedEvent.price > 0 ? 'Pending Payment' : 'Registered';

      // [SEARCH: DB_INSERT_ORDER]
      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            user_id: currentUser.id,
            event_id: currentSelectedEvent.id,
            status: orderStat, // "Pending Payment" o "Registered"
            payment_status: paymentStat,
            proof_of_payment_url: null 
          },
        ])
        .select();

      if (error || !data) {
        showCustomAlert("Error", "An error occurred during registration.");
        modalRegBtn.disabled = false;
      } else {
        const orderData = data[0];
        const greetingEl = document.getElementById("user-greeting");
        const userName = greetingEl ? greetingEl.innerText.replace("Welcome, ", "").replace("!", "") : "Student";
        
        const ticketID = `FEUR-TICKET-${orderData.id}`;

        if (currentSelectedEvent.price > 0) {
            // [SEARCH: PAID_EVENT_ALERT]
            showCustomAlert(
              "Slot Reserved!", 
              `Please pay ₱${currentSelectedEvent.price}.<br><br>Your Reference Number is: <b style="font-size: 14px; color: var(--primary);">${ticketID}</b><br><br>Go to your Order List to upload the receipt within 5 days.`
            );
            
            // BAGONG EMAILJS ACCOUNT - PENDING EMAIL
            if (typeof emailjs !== "undefined") {
              emailjs.send("service_abyji0d", "template_jxtr45p", {
                  to_email: currentUser.email,
                  user_name: userName,
                  event_title: currentSelectedEvent.title,
                  ref_no: ticketID,
                  price: currentSelectedEvent.price
                }, "pY0e20a_mx8EoiFdT")
                .then(() => console.log("Initial Pending Email sent!"))
                .catch((err) => console.error("Email error:", err));
            }
        } else {
            // [SEARCH: FREE_EVENT_EMAIL] (LUMANG ACCOUNT GAMIT DITO)
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
            showCustomAlert("Success", "Successfully Registered! You can view your QR ticket in the Order List.");
        }

        modalRegBtn.innerText = "Registered";
        modalRegBtn.style.background = "gray";
        modalRegBtn.style.color = "white";
        loadNotifications();

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
                    <button class="btn btn-solid" style="background:#10b981; color:white; padding:5px 10px;" onclick="window.viewEventAttendees('${ev.id}', '${ev.title.replace(/'/g, "\\'")}')">View</button>
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

      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      if (document.getElementById("stat-orders"))
        document.getElementById("stat-orders").innerText = orderCount || 0;

      const { count: attendedCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "Attended");
      if (document.getElementById("stat-attended"))
        document.getElementById("stat-attended").innerText = attendedCount || 0;
    };

    window.exportEvent = async (eventId, eventTitle) => {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("user_id, status")
        .eq("event_id", eventId);

      if (ordersError || !ordersData || ordersData.length === 0) {
        showCustomAlert("Notice", "No attendees found for this event.");
        return;
      }

      const userIds = ordersData.map((order) => order.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, school_email")
        .in("id", userIds);

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "First Name,Last Name,Email,Status\n";

      ordersData.forEach((order) => {
        const profile = profilesData?.find((p) => p.id === order.user_id) || {};
        const fname = profile.first_name || "N/A";
        const lname = profile.last_name || "N/A";
        const email = profile.school_email || "N/A";
        csvContent += `${fname},${lname},${email},${order.status}\n`;
      });

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

    let currentAttendeesData = []; 

    window.viewEventAttendees = async (eventId, eventTitle) => {
      document.getElementById("attendees-modal-title").innerText = `${eventTitle} - Attendees`;
      const list = document.getElementById("attendees-list");
      list.innerHTML = `<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>`;
      document.getElementById("attendees-modal").classList.remove("hidden");

      const { data: orders } = await supabase
        .from("orders")
        .select("user_id, status")
        .eq("event_id", eventId);

      if (!orders || orders.length === 0) {
        list.innerHTML = `<tr><td colspan="3" style="text-align:center;">No attendees yet.</td></tr>`;
        currentAttendeesData = [];
        return;
      }

      const userIds = orders.map(o => o.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, school_email")
        .in("id", userIds);

      currentAttendeesData = orders.map(order => {
        const profile = profiles?.find(p => p.id === order.user_id) || {};
        return {
          name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown",
          email: profile.school_email || "N/A",
          status: order.status
        };
      });

      renderAttendees(); 
    };

    const renderAttendees = () => {
      const term = document.getElementById("search-attendee").value.toLowerCase();
      const statusFilter = document.getElementById("filter-attendee-status").value;

      const filtered = currentAttendeesData.filter(user => {
        const matchSearch = user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
        const matchStatus = statusFilter === "All" || user.status === statusFilter;
        return matchSearch && matchStatus;
      });

      const list = document.getElementById("attendees-list");
      if (filtered.length === 0) {
        list.innerHTML = `<tr><td colspan="3" style="text-align:center;">No match found.</td></tr>`;
      } else {
        list.innerHTML = filtered.map(u => {
          let bg = u.status === "Registered" ? "#e5e7eb" : (u.status === "Attended" ? "#dcfce7" : "#fee2e2");
          let txt = u.status === "Registered" ? "black" : (u.status === "Attended" ? "#166534" : "#991b1b");
          return `<tr>
            <td><b>${u.name}</b></td>
            <td>${u.email}</td>
            <td><span class="status-badge" style="background:${bg}; color:${txt}; padding: 4px 8px; border-radius: 4px; font-size:12px;">${u.status}</span></td>
          </tr>`;
        }).join("");
      }
    };

    document.getElementById("search-attendee")?.addEventListener("input", renderAttendees);
    document.getElementById("filter-attendee-status")?.addEventListener("change", renderAttendees);
    document.getElementById("close-attendees-modal")?.addEventListener("click", () => {
      document.getElementById("attendees-modal").classList.add("hidden");
    });

    window.deleteEvent = async (id) => {
      if (confirm("Delete this event?")) {
        await supabase.from("events").delete().eq("id", id);
        fetchAdminEvents();
        showCustomAlert("System", "Event deleted.");
      }
    };

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

    // ==========================================
    // PAYMENT APPROVALS LOGIC
    // ==========================================
    const fetchPaymentApprovals = async () => {
      const { data: pendingOrders, error } = await supabase
        .from("orders")
        .select("id, user_id, created_at, proof_of_payment_url, events(title, event_date, campus)")
        .eq("payment_status", "unpaid")
        .not("proof_of_payment_url", "is", null)
        .not("status", "eq", "Cancelled");

      const list = document.getElementById("payment-approvals-list");
      if (!list) return;

      if (error || !pendingOrders || pendingOrders.length === 0) {
        list.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pending receipts to verify.</td></tr>';
        return;
      }

      const userIds = pendingOrders.map(o => o.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, school_email")
        .in("id", userIds);

      list.innerHTML = pendingOrders.map((order) => {
        const profile = profiles?.find(p => p.id === order.user_id) || {};
        const fname = profile.first_name || "";
        const lname = profile.last_name || "";
        const email = profile.school_email || "N/A";
        const title = order.events?.title || "Unknown Event";
        const safeTitle = title.replace(/'/g, "\\'"); 
        const date = order.events?.event_date || "TBA";
        const campus = order.events?.campus || "N/A";
        const dateReg = new Date(order.created_at).toLocaleDateString();

        return `<tr>
          <td><b>${fname} ${lname}</b><br><span style="font-size:12px; color:gray;">${email}</span></td>
          <td>${title}</td>
          <td>${dateReg}</td>
          <td style="display:flex; justify-content:flex-end; gap:5px;">
            <a href="${order.proof_of_payment_url}" target="_blank" class="btn btn-solid" style="background:#3b82f6; color:white; padding:5px 10px; text-decoration:none; font-size:12px;">View Receipt</a>
            <button class="btn btn-solid" style="background:#10b981; color:white; padding:5px 10px; font-size:12px;" onclick="window.approvePayment('${order.id}', '${email}', '${fname}', '${safeTitle}', '${date}', '${campus}')">Approve</button>
            <button class="btn btn-solid" style="background:#ef4444; color:white; padding:5px 10px; font-size:12px;" onclick="window.rejectPayment('${order.id}')">Reject</button>
          </td>
        </tr>`;
      }).join("");
    };

    window.approvePayment = async (orderId, userEmail, userName, eventTitle, eventDate, eventCampus) => {
      showCustomConfirm("Approve Payment", "Approve this payment and send the QR Ticket to their email?", async () => {
        await supabase.from("orders").update({ payment_status: "paid", status: "Registered" }).eq("id", orderId);

        const ticketID = `FEUR-TICKET-${orderId}`;

        // BAGONG EMAILJS ACCOUNT - ORDER CONFIRMATION
        if (typeof emailjs !== "undefined") {
          emailjs.send("service_abyji0d", "template_aosc5oj", {
              to_email: userEmail,
              user_name: userName || "Student",
              event_title: eventTitle,
              event_date: eventDate,
              campus: eventCampus,
              qr_data: ticketID,
            }, "pY0e20a_mx8EoiFdT") // NEW PUBLIC KEY NA GAMIT DITO
            .then(() => console.log("Ticket sent!"))
            .catch((err) => console.error("Email error:", err));
        }

        showCustomAlert("Success", "Payment verified and QR Ticket sent!");
        fetchPaymentApprovals();
      });
    };

    window.rejectPayment = async (orderId) => {
      showCustomConfirm("Reject Payment", "Reject this receipt? They will need to upload again.", async () => {
        await supabase.from("orders").update({ proof_of_payment_url: null }).eq("id", orderId);
        showCustomAlert("System", "Receipt rejected. User must upload again.");
        fetchPaymentApprovals();
      });
    };

    window.rejectPayment = async (orderId) => {
      if (confirm("Reject this receipt? They will need to upload again.")) {
        await supabase.from("orders").update({ proof_of_payment_url: null }).eq("id", orderId);
        showCustomAlert("System", "Receipt rejected. User must upload again.");
        fetchPaymentApprovals();
      }
    };

    fetchPaymentApprovals();
  }

  // --- 8. ORDER LIST LOGIC ---
  const ordersGrid = document.getElementById("orders-grid");
  if (ordersGrid && path.includes("orderlist")) {
    const fetchOrders = async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`id, status, payment_status, proof_of_payment_url, events ( id, title, event_date, campus, poster_url, price )`)
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

          let actionHTML = "";
          const statusStyle = isCancelled ? "background:#fee2e2; color:#991b1b;" : "";

          if (isCancelled) {
            actionHTML = `<button class="btn btn-outline w-100" disabled style="border-color:#9ca3af; color:#9ca3af;">Cancelled</button>`;
          } else if (order.status === "Attended") {
            actionHTML = `<button class="btn btn-outline w-100" disabled style="border-color:#166534; color:#166534;">Attended</button>`;
          } else {
            if (event.price == 0 || order.payment_status === "paid") {
              actionHTML = `<button class="btn btn-solid w-100 qr-code-btn" data-order-id="${order.id}" data-event-title="${event.title}">View QR Code</button>`;
              if (event.price == 0) {
                actionHTML += `<button class="btn btn-outline w-100 cancel-ticket-btn" data-order-id="${order.id}" style="margin-top: 5px; border-color:#ef4444; color:#ef4444;">Cancel Ticket</button>`;
              }
            } else if (event.price > 0 && order.payment_status === "unpaid") {
              if (order.proof_of_payment_url) {
                actionHTML = `
                  <div style="background:#fef08a; padding:10px; border-radius:6px; text-align:center; font-size:12px; color:#854d0e; margin-bottom:5px; font-weight:bold;">
                      ⏳ Pending Admin Verification
                  </div>
                  <button class="btn btn-outline w-100 cancel-ticket-btn" data-order-id="${order.id}" style="border-color:#ef4444; color:#ef4444;">Cancel Registration</button>
                `;
              } else {
                actionHTML = `
                  <div style="background:#fee2e2; padding:10px; border-radius:6px; margin-bottom:5px; border: 1px solid #fca5a5;">
                      <p style="font-size:12px; color:#991b1b; margin-bottom:5px; font-weight:bold;">⚠️ Action Required: Upload Receipt</p>
                      <input type="file" id="receipt-${order.id}" accept="image/*" style="width:100%; font-size:11px; margin-bottom:5px;">
                      <button class="btn btn-solid w-100 upload-receipt-btn" data-order-id="${order.id}" style="background:#10b981; color:white; font-size:12px; padding:8px;">Submit Payment Proof</button>
                  </div>
                  <button class="btn btn-outline w-100 cancel-ticket-btn" data-order-id="${order.id}" style="border-color:#ef4444; color:#ef4444;">Cancel Registration</button>
                `;
              }
            }
          }

          card.innerHTML = `
            <img src="${event.poster_url || "https://via.placeholder.com/300x160?text=FEUR+Ticket"}" class="event-img" style="${isCancelled ? "filter: grayscale(100%);" : ""}">
            <div class="event-info">
                <span class="status-badge" style="${statusStyle}">${order.status}</span>
                <div class="event-title" style="${isCancelled ? "text-decoration: line-through; color:gray;" : ""}">${event.title}</div>
                <div class="event-meta">
                    <span>📅 ${event.event_date || "TBA"}</span>
                    <span>📍 FEU Roosevelt ${event.campus}</span>
                </div>
                ${event.price > 0 ? `<button class="btn btn-outline w-100 ref-no-btn" data-order-id="${order.id}" style="margin-bottom:8px; border-color:var(--primary); color:var(--primary); font-size:12px; padding:6px; font-weight:bold;">📄 View Ref No.</button>` : ''}
                
                ${actionHTML}
            </div>`;
          ordersGrid.appendChild(card);
        });

        // [SEARCH: REF_NO_EVENT_LISTENER]
        document.querySelectorAll(".ref-no-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const orderId = btn.getAttribute("data-order-id");
            showCustomAlert(
              "Reference Number",
              `Your Reference Number is:<br><br><b style="font-size: 16px; color: var(--primary);">FEUR-TICKET-${orderId}</b>`
            );
          });
        });

        document.querySelectorAll(".upload-receipt-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const orderId = btn.getAttribute("data-order-id");
            const fileInput = document.getElementById(`receipt-${orderId}`);
            const file = fileInput.files[0];

            if (!file) {
              showCustomAlert("Error", "Please select an image file first.");
              return;
            }

            btn.innerText = "Uploading...";
            btn.disabled = true;

            const fileExt = file.name.split(".").pop();
            const fileName = `${currentUser.id}-${orderId}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from("receipts").upload(fileName, file);

            if (uploadError) {
              showCustomAlert("Error", "Upload failed. Try again.");
              btn.innerText = "Submit Payment Proof";
              btn.disabled = false;
              return;
            }

            const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
            await supabase.from("orders").update({ proof_of_payment_url: publicUrlData.publicUrl }).eq("id", orderId);

            showCustomAlert("Success", "Receipt uploaded! Please wait for admin verification.");
            fetchOrders(); 
          });
        });

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
            
            showCustomConfirm("Cancel Registration", "Are you sure you want to cancel your registration for this event? This action cannot be undone.", async () => {
              btn.innerText = "Cancelling...";
              btn.disabled = true;

              const { error } = await supabase.from("orders").update({ status: "Cancelled" }).eq("id", orderId);

              if (error) {
                showCustomAlert("Error", "Failed to cancel ticket.");
                btn.innerText = "Cancel Ticket";
                btn.disabled = false;
              } else {
                showCustomAlert("Success", "Your registration has been cancelled.");
                fetchOrders(); 
                loadNotifications(); 
              }
            });
          });
        });
      }
    };

    fetchOrders(); 

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

  // --- HELP PAGE LOGIC ---
  if (path.includes("help")) {
    document.getElementById("contact-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = document.getElementById("send-help-btn");
      const subject = document.getElementById("contact-subject").value;
      const message = document.getElementById("contact-message").value;

      btn.innerText = "Sending...";
      btn.disabled = true;

      const senderEmail = currentUser ? currentUser.email : "Not Logged In";
      const senderName = currentUser
        ? document.getElementById("user-greeting")?.innerText || "User"
        : "Guest";

      if (typeof emailjs !== "undefined") {
        emailjs
          .send("service_nczv2qc", "template_4unbsmi", {
            email: senderEmail,
            name: senderName,
            title: subject,
            message: message,
          })
          .then(() => {
            showCustomAlert(
              "Success",
              "Message sent successfully to the admin!",
            );
            document.getElementById("contact-form").reset();
            btn.innerText = "Send Message";
            btn.disabled = false;
          })
          .catch((err) => {
            console.error("Email error:", err);
            showCustomAlert(
              "Error",
              "Failed to send message. Please try again later.",
            );
            btn.innerText = "Send Message";
            btn.disabled = false;
          });
      } else {
        showCustomAlert("Error", "Email service is not loaded.");
        btn.innerText = "Send Message";
        btn.disabled = false;
      }
    });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
});