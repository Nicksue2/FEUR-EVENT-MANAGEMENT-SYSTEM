import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://wcqkpqcyaiuocwyjtvhs.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY";
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;
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
  if (closeAlertBtn)
    closeAlertBtn.addEventListener("click", () =>
      document.getElementById("custom-alert").classList.add("hidden"),
    );

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

  // --- CLICK OUTSIDE MODAL TO CLOSE ---
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

  // Mobile Search Focus Fix
  const searchContainerDom = document.querySelector(".search-container");
  const searchInputDom = document.getElementById("search-input");
  if (searchContainerDom && searchInputDom) {
    searchContainerDom.addEventListener("click", () => {
      searchInputDom.focus();
    });
  }

  document.querySelectorAll(".nav-settings-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("settings-modal")?.classList.remove("hidden");
    });
  });
  document
    .getElementById("close-settings")
    ?.addEventListener("click", () =>
      document.getElementById("settings-modal").classList.add("hidden"),
    );
  document
    .getElementById("burger-btn")
    ?.addEventListener("click", () =>
      document
        .getElementById("sidebar")
        .classList.toggle(window.innerWidth <= 768 ? "open" : "minimized"),
    );
  document
    .getElementById("notif-btn")
    ?.addEventListener("click", () =>
      document.getElementById("notif-modal").classList.toggle("hidden"),
    );
  document
    .getElementById("close-auth-modal")
    ?.addEventListener("click", () =>
      document.getElementById("auth-modal").classList.add("hidden"),
    );
  document
    .getElementById("close-details-modal")
    ?.addEventListener("click", () =>
      document.getElementById("event-details-modal").classList.add("hidden"),
    );

  // --- SETTINGS TOGGLE LOGIC ---
  const emailToggle = document.getElementById("email-notif-toggle");
  if (emailToggle) {
    emailToggle.checked = localStorage.getItem("emailSync") !== "false";
    emailToggle.addEventListener("change", (e) => {
      localStorage.setItem("emailSync", e.target.checked);
    });
  }

  // Idagdag din natin ang closing function para sa settings modal kung wala pa
  document.getElementById("close-settings")?.addEventListener("click", () => {
    document.getElementById("settings-modal").classList.add("hidden");
  });
  document.querySelectorAll(".nav-settings-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      document.getElementById("settings-modal").classList.remove("hidden"),
    );
  });

  // --- 3. SESSION & DATABASE ROLE CHECK ---
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
          greetingEl.innerText = `Welcome, ${profile.first_name} ${profile.last_name}!`;
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }

    // SECURITY FIX: I-block ang mga normal users sa admin at scanner pages
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
    if (path.includes("admin.html") || path.includes("orderlist.html")) {
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
  if (path.includes("signup.html"))
    if (path.includes("signup.html")) {
      // --- 4. SIGN IN & SIGN UP LOGIC ---
      togglePassword("show-password-signup", "password", "confirm-password");

      const tcModal = document.getElementById("tc-modal");
      const openTcBtn = document.getElementById("open-tc");
      const tcBox = document.getElementById("tc-box");
      const ackBtn = document.getElementById("acknowledge-btn");
      const tcCheckbox = document.getElementById("tc-checkbox");
      const registerBtn = document.getElementById("register-btn");

      if (openTcBtn && tcModal) {
        openTcBtn.addEventListener("click", () => {
          tcModal.classList.remove("hidden");
        });
      }

      if (tcBox && ackBtn) {
        tcBox.addEventListener("scroll", () => {
          if (tcBox.scrollTop + tcBox.clientHeight >= tcBox.scrollHeight - 20) {
            ackBtn.disabled = false;
          }
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

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
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

  if (path.includes("signin.html")) {
    togglePassword("show-password-signin", "password");
    document
      .getElementById("signin-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("login-btn");
        if (btn) {
          btn.innerText = "Logging in...";
          btn.disabled = true;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
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

  // --- 5. DASHBOARD EVENTS LOGIC ---
  const isUserRegistered = async (eventId) => {
    if (!currentUser) return false;
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("event_id", eventId);
    return data && data.length > 0;
  };

  const eventsGrid = document.getElementById("events-grid");
  if (eventsGrid && (path === "/" || path.includes("index.html"))) {
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
          `📅 ${event.event_date || "TBA"} at ${event.event_time || ""} <br>📍 FEU Roosevelt ${event.campus}`;
        document.getElementById("modal-event-desc").innerText =
          event.description || "No description available for this event.";

        const modalBtn = document.getElementById("modal-register-btn");
        const registered = await isUserRegistered(event.id);

        if (registered) {
          modalBtn.innerText = "Registered";
          modalBtn.style.background = "gray";
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
        document
          .getElementById("event-details-modal")
          .classList.remove("hidden");
      });
      eventsGrid.appendChild(card);
    }
  }

  // --- REGISTRATION & EMAILJS LOGIC ---
  document
    .getElementById("modal-register-btn")
    ?.addEventListener("click", async () => {
      if (!currentUser) {
        document.getElementById("event-details-modal").classList.add("hidden");
        document.getElementById("auth-modal").classList.remove("hidden");
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

        // EMAIL SETTINGS CHECKER
        if (localStorage.getItem("emailSync") !== "false") {
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
              .then(() => console.log("Receipt sent!"))
              .catch((err) => console.error("EmailJS error:", err));
          }
        } else {
          console.log("Email notifications disabled by user.");
        }

        showCustomAlert(
          "Success",
          "Successfully Registered! You can view your QR ticket in the Order List.",
        );
        modalRegBtn.innerText = "Registered";
        modalRegBtn.style.background = "gray";
        modalRegBtn.style.color = "white";

        if (typeof loadNotifications === "function") loadNotifications();
      }
    });

  // --- 6. ADMIN DASHBOARD CRUD ---
  if (path.includes("admin.html") && userRole === "admin") {
    const fetchAdminEvents = async () => {
      const { data: events, error } = await supabase.from("events").select("*");
      const list = document.getElementById("admin-event-list");
      if (list && events) {
        list.innerHTML = events
          .map(
            (ev) => `
                    <tr>
                        <td>${ev.title}</td>
                        <td>${ev.campus}</td>
                        <td>${ev.event_date}</td>
                        <td>${ev.price > 0 ? "₱" + ev.price : "FREE"}</td>
                        <td>
                            <button class="btn btn-solid" style="background:#facc15; padding:5px 10px; color:black;" onclick="window.editEvent('${ev.id}')">Edit</button>
                            <button class="btn btn-solid" style="background:#ef4444; color:white; padding:5px 10px;" onclick="window.deleteEvent('${ev.id}')">Delete</button>
                        </td>
                    </tr>
                `,
          )
          .join("");
        if (document.getElementById("stat-events"))
          document.getElementById("stat-events").innerText = events.length;
      }

      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      if (document.getElementById("stat-orders"))
        document.getElementById("stat-orders").innerText = count || 0;
    };

    window.deleteEvent = async (id) => {
      if (confirm("Delete this event?")) {
        await supabase.from("events").delete().eq("id", id);
        fetchAdminEvents();
        showCustomAlert("System", "Event deleted.");
      }
    };

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
        document.getElementById("date").value = ev.event_date;
        document.getElementById("price").value = ev.price || 0;
        document.getElementById("desc").value = ev.description;
        document.getElementById("poster_url").value = ev.poster_url;
        document.getElementById("form-title").innerText = "Edit: " + ev.title;
        document.getElementById("cancel-edit").classList.remove("hidden");
      }
    };

    document
      .getElementById("event-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("event-id").value;
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
        document.getElementById("cancel-edit").classList.add("hidden");
        document.getElementById("form-title").innerText = "Add New Event";
        fetchAdminEvents();
      });

    document.getElementById("cancel-edit")?.addEventListener("click", () => {
      document.getElementById("event-form").reset();
      document.getElementById("event-id").value = "";
      document.getElementById("form-title").innerText = "Add New Event";
      document.getElementById("cancel-edit").classList.add("hidden");
    });

    fetchAdminEvents();
  }

  // --- 7. ORDER LIST LOGIC ---
  const ordersGrid = document.getElementById("orders-grid");
  if (ordersGrid && path.includes("orderlist")) {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`id, status, events ( title, event_date, campus, poster_url )`)
      .eq("user_id", currentUser.id);

    ordersGrid.innerHTML = "";
    if (error || !orders || orders.length === 0) {
      ordersGrid.innerHTML = "<p>You have no registered events yet.</p>";
    } else {
      orders.forEach((order) => {
        const event = order.events;
        const card = document.createElement("div");
        card.className = "event-card";

        // Tinanggal yung inline styles sa HTML at pinalitan ng class
        card.innerHTML = `
                    <img src="${event.poster_url || "https://via.placeholder.com/300x160?text=FEUR+Ticket"}" class="event-img">
                    <div class="event-info">
                        <span class="status-badge">${order.status}</span>
                        <div class="event-title">${event.title}</div>
                        <div class="event-meta">
                            <span>📅 ${event.event_date || "TBA"}</span>
                            <span>📍 FEU Roosevelt ${event.campus}</span>
                        </div>
                        <button class="btn btn-solid w-100 qr-code-btn" data-order-id="${order.id}" data-event-title="${event.title}">View QR Code</button>
                    </div>
                `;
        ordersGrid.appendChild(card);
      });

      // Logic para mag-generate at magpakita ng QR Code pag kinlick ang button
      document.querySelectorAll(".qr-code-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const orderId = btn.getAttribute("data-order-id");
          const eventTitle = btn.getAttribute("data-event-title");

          document.getElementById("qr-event-title").innerText = eventTitle;

          const qrContainer = document.getElementById("qr-code-image");
          qrContainer.innerHTML = ""; // Clear lumang QR

          const ticketID = `FEUR-TICKET-${orderId}`;

          if (typeof QRCode !== "undefined") {
            new QRCode(qrContainer, {
              text: ticketID,
              width: 250,
              height: 250,
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.H,
            });
          } else {
            console.error("ERROR: QRCode library hindi nag-load!");
          }

          document.getElementById("qr-modal").classList.remove("hidden");
        });
      });

      // Logic para isara yung QR modal
      document
        .getElementById("close-qr-modal")
        ?.addEventListener("click", () => {
          document.getElementById("qr-modal").classList.add("hidden");
        });
    }
  }

  // --- 8. LOGOUT LOGIC ---
  document.querySelectorAll("#logout-btn, .nav-logout").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = "index.html";
    });
  });
});

// --- 9. ADMIN & ADMISSION QR SCANNER LOGIC ---
const currentPath = window.location.pathname.toLowerCase();

// A. VALIDATOR LOGIC (admin.html)
if (currentPath.includes("admin")) {
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
          scannerResult.style.background = "#dcfce7";
          scannerResult.style.color = "#166534";
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

// B. LIVE ADMISSION LOGIC (scanner.html)
if (currentPath.includes("scanner")) {
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
          if (data.status === "Attended") {
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
  // --- 10. DYNAMIC NOTIFICATIONS LOGIC (BULLETPROOF) ---
  async function loadNotifications() {
    const notifContainer = document.getElementById("notif-list");
    if (!notifContainer) return;

    try {
      let notifs = [];

      // 1. Kunin ang latest event (Ligtas na fetch nang walang sorting error)
      const { data: eventsData } = await supabase
        .from("events")
        .select("title")
        .limit(1);
      if (eventsData && eventsData.length > 0) {
        notifs.push(
          `<div style="padding: 12px; border-bottom: 1px solid #eee; font-size: 0.9rem;">📢 <b>New Event:</b> ${eventsData[0].title} is now open!</div>`,
        );
      }

      // 2. Kunin ang orders ng User kung naka-login
      if (currentUser) {
        const { data: myOrders } = await supabase
          .from("orders")
          .select("status, events(title)")
          .eq("user_id", currentUser.id)
          .limit(2);
        if (myOrders && myOrders.length > 0) {
          myOrders.forEach((order) => {
            if (order.status === "Registered") {
              notifs.push(
                `<div style="padding: 12px; border-bottom: 1px solid #eee; font-size: 0.9rem; color: #006633;">✅ <b>Ticket Secured:</b> See you at ${order.events.title}.</div>`,
              );
            } else if (order.status === "Attended") {
              notifs.push(
                `<div style="padding: 12px; border-bottom: 1px solid #eee; font-size: 0.9rem; color: gray;">🎓 <b>Attended:</b> Thanks for joining ${order.events.title}!</div>`,
              );
            }
          });
        }
      }

      // 3. I-display sa UI
      if (notifs.length === 0) {
        notifContainer.innerHTML = `<div style="padding: 15px; color: gray; font-size: 0.9rem; text-align: center;">No new notifications.</div>`;
      } else {
        notifContainer.innerHTML = notifs.join("");
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
      notifContainer.innerHTML = `<div style="padding: 15px; color: red; font-size: 0.9rem; text-align: center;">Failed to load.</div>`;
    }
  }
}
