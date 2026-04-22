import { supabase } from "./api.js";
import { state } from "./state.js";
import { showCustomAlert, showCustomConfirm } from "./ui.js";

export async function initAdmin() {
  if (!state.path.includes("admin") || state.userRole !== "admin") return;

  const fetchAdminEvents = async () => {
    const list = document.getElementById("admin-event-list");
    if (list) {
      list.innerHTML = `
        <tr>
          <td colspan="100%">
            <div class="loading-container">
              <div class="loading-spinner"></div>
              <p>Loading records...</p>
            </div>
          </td>
        </tr>
      `;
    }
    const { data: events } = await supabase.from("events").select("*");
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
    const { data: profilesData } = await supabase
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
    document.getElementById("attendees-modal-title").innerText =
      `${eventTitle} - Attendees`;
    const list = document.getElementById("attendees-list");
    if (list) {
      list.innerHTML = `
        <tr>
          <td colspan="100%">
            <div class="loading-container">
              <div class="loading-spinner"></div>
              <p>Loading records...</p>
            </div>
          </td>
        </tr>
      `;
    }
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

    const userIds = orders.map((o) => o.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, school_email")
      .in("id", userIds);

    currentAttendeesData = orders.map((order) => {
      const profile = profiles?.find((p) => p.id === order.user_id) || {};
      return {
        name:
          `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
          "Unknown",
        email: profile.school_email || "N/A",
        status: order.status,
      };
    });

    renderAttendees();
  };

  const renderAttendees = () => {
    const term = document
      .getElementById("search-attendee")
      .value.toLowerCase();
    const statusFilter = document.getElementById(
      "filter-attendee-status",
    ).value;

    const filtered = currentAttendeesData.filter((user) => {
      const matchSearch =
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchStatus =
        statusFilter === "All" || user.status === statusFilter;
      return matchSearch && matchStatus;
    });

    const list = document.getElementById("attendees-list");
    if (filtered.length === 0) {
      list.innerHTML = `<tr><td colspan="3" style="text-align:center;">No match found.</td></tr>`;
    } else {
      list.innerHTML = filtered
        .map((u) => {
          let bg =
            u.status === "Registered"
              ? "#e5e7eb"
              : u.status === "Attended"
                ? "#dcfce7"
                : "#fee2e2";
          let txt =
            u.status === "Registered"
              ? "black"
              : u.status === "Attended"
                ? "#166534"
                : "#991b1b";
          return `<tr>
          <td><b>${u.name}</b></td>
          <td>${u.email}</td>
          <td><span class="status-badge" style="background:${bg}; color:${txt}; padding: 4px 8px; border-radius: 4px; font-size:12px;">${u.status}</span></td>
        </tr>`;
        })
        .join("");
    }
  };

  document
    .getElementById("search-attendee")
    ?.addEventListener("input", renderAttendees);
  document
    .getElementById("filter-attendee-status")
    ?.addEventListener("change", renderAttendees);
  document
    .getElementById("close-attendees-modal")
    ?.addEventListener("click", () => {
      document.getElementById("attendees-modal").classList.add("hidden");
    });

  window.deleteEvent = async (id) => {
    showCustomConfirm(
      "Delete Event",
      "Are you sure you want to delete this event? This action cannot be undone.",
      async () => {
        await supabase.from("events").delete().eq("id", id);
        fetchAdminEvents();
        showCustomAlert("System", "Event deleted.");
      },
    );
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
    const list = document.getElementById("admin-user-list");
    if (list) {
      list.innerHTML = `
        <tr>
          <td colspan="100%">
            <div class="loading-container">
              <div class="loading-spinner"></div>
              <p>Loading records...</p>
            </div>
          </td>
        </tr>
      `;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("first_name", { ascending: true });

    if (list && profiles) {
      list.innerHTML = profiles
        .map(
          (p) => `
        <tr>
          <td><b>${p.first_name || ""} ${p.last_name || ""}</b></td>
          <td>${p.school_email}</td>
          <td>${p.phone_number || "N/A"}</td>
          <td><span class="status-badge" style="background:${p.role === "admin" ? "#fef08a" : "#e5e7eb"}; color:black; padding: 4px 8px; border-radius: 4px;">${p.role}</span></td>
          <td>
            <button class="btn btn-solid" style="background:#facc15; padding:5px 15px; color:black; border:none; border-radius:4px; cursor:pointer;" onclick="window.manageUser('${p.id}')">Manage</button>
          </td>
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

      // Wire up delete button for this specific user
      const deleteBtn = document.getElementById("delete-user-btn");
      if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener("click", () => {
          window.deleteUser(profile.id, profile.school_email);
        });
      }
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

  window.deleteUser = async (userId, email) => {
    showCustomConfirm(
      "Delete User Account",
      `Are you sure you want to delete <b>${email}</b>?<br><br><span style="color:#ef4444;">Warning: This will also delete all their event registrations and order history. This action is irreversible.</span>`,
      async () => {
        try {
          // 1. Delete associated orders first due to Foreign Key constraints
          await supabase.from("orders").delete().eq("user_id", userId);

          // 2. Delete the profile record
          const { error } = await supabase
            .from("profiles")
            .delete()
            .eq("id", userId);

          if (error) throw error;

          showCustomAlert("Success", "User and associated records deleted.");
          fetchAdminUsers();
        } catch (err) {
          console.error("Deletion error:", err);
          showCustomAlert("Error", "Failed to delete user: " + err.message);
        }
      },
    );
  };

  fetchAdminUsers();

  const fetchPaymentApprovals = async () => {
    const list = document.getElementById("payment-approvals-list");
    if (list) {
      list.innerHTML = `
        <tr>
          <td colspan="100%">
            <div class="loading-container">
              <div class="loading-spinner"></div>
              <p>Loading records...</p>
            </div>
          </td>
        </tr>
      `;
    }
    const { data: pendingOrders, error } = await supabase
      .from("orders")
      .select(
        "id, user_id, created_at, proof_of_payment_url, events(title, event_date, campus)",
      )
      .eq("payment_status", "unpaid")
      .not("proof_of_payment_url", "is", null)
      .not("status", "eq", "Cancelled");

    if (!list) return;

    if (error || !pendingOrders || pendingOrders.length === 0) {
      list.innerHTML =
        '<tr><td colspan="4" style="text-align:center;">No pending receipts to verify.</td></tr>';
      return;
    }

    const userIds = pendingOrders.map((o) => o.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, school_email")
      .in("id", userIds);

    list.innerHTML = pendingOrders
      .map((order) => {
        const profile = profiles?.find((p) => p.id === order.user_id) || {};
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
        <td>
<div class="admin-actions-flex">
  <button class="btn btn-solid" style="background:#3b82f6; color:white; padding:5px 10px; font-size:12px;" onclick="window.viewReceiptModal('${order.proof_of_payment_url}')">View</button>
  <button class="btn btn-solid" style="background:#10b981; color:white; padding:5px 10px; font-size:12px;" onclick="window.approvePayment('${order.id}', '${email}', '${fname}', '${safeTitle}', '${date}', '${campus}')">Approve</button>
  <button class="btn btn-solid" style="background:#ef4444; color:white; padding:5px 10px; font-size:12px;" onclick="window.rejectPayment('${order.id}')">Reject</button>
</div>
</td>
      </tr>`;
      })
      .join("");
  };

  window.approvePayment = async (
    orderId,
    userEmail,
    userName,
    eventTitle,
    eventDate,
    eventCampus,
  ) => {
    showCustomConfirm(
      "Approve Payment",
      "Approve this payment and send the QR Ticket to their email?",
      async () => {
        await supabase
          .from("orders")
          .update({ payment_status: "paid", status: "Registered" })
          .eq("id", orderId);

        const ticketID = `FEUR-TICKET-${orderId}`;

        fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: "service_abyji0d",
            template_id: "template_aosc5oj",
            user_id: "pY0e20a_mx8EoiFdT",
            template_params: {
              to_email: userEmail,
              user_name: userName || "Student",
              event_title: eventTitle,
              event_date: eventDate,
              campus: eventCampus,
              qr_data: ticketID,
            },
          }),
        }).then(() => console.log("QR Ticket sent via API!"));

        showCustomAlert("Success", "Payment verified and QR Ticket sent!");
        fetchPaymentApprovals();
      },
    );
  };

  window.rejectPayment = async (orderId) => {
    showCustomConfirm(
      "Reject Receipt",
      "Are you sure you want to reject this receipt? The student will need to upload a new one.",
      async () => {
        const { error } = await supabase
          .from("orders")
          .update({ proof_of_payment_url: null })
          .eq("id", orderId);

        if (error) {
          showCustomAlert("Error", "Failed to reject receipt.");
        } else {
          showCustomAlert(
            "System",
            "Receipt rejected. Student notified to re-upload.",
          );
          fetchPaymentApprovals();
        }
      },
    );
  };

  window.viewReceiptModal = (imgUrl) => {
    document.getElementById("receipt-image").src = imgUrl;
    document.getElementById("receipt-modal").classList.remove("hidden");
  };

  document
    .getElementById("close-receipt-modal")
    ?.addEventListener("click", () => {
      document.getElementById("receipt-modal").classList.add("hidden");
    });

  fetchPaymentApprovals();

  const adminMain = document.querySelector(".main-content");
  const sections = document.querySelectorAll(
    "#validator-section, #events-section, #users-section, #payments-section",
  );
  const navLinks = document.querySelectorAll(".sec-link");

  if (navLinks.length > 0) {
    const highlightSection = () => {
      let current = "";
      const scrollPos = window.scrollY || document.documentElement.scrollTop;

      sections.forEach((section) => {
        const sectionTop = section.offsetTop - 120; // Offset for sticky header
        if (scrollPos >= sectionTop) {
          current = section.getAttribute("id");
        }
      });

      // Special case for bottom of page
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
        current = "payments-section";
      }

      navLinks.forEach((link) => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${current}`) {
          link.classList.add("active");
        }
      });
    };

    window.addEventListener("scroll", highlightSection);

    navLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href");
        const targetSection = document.querySelector(targetId);

        if (targetSection) {
          const offset = 100; // Header height offset
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = targetSection.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      });
    });
  }

  let myChart = null;

  window.openAnalytics = async (type) => {
    const modal = document.getElementById("analytics-modal");
    const ctx = document.getElementById("analyticsChart").getContext("2d");
    const title = document.getElementById("analytics-title");

    if (modal) modal.classList.remove("hidden");
    if (myChart) myChart.destroy();

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 15 } },
      },
    };

    if (type === "events") {
      title.innerText = "Events per Campus";
      const { data } = await supabase.from("events").select("campus");
      const counts = { Cainta: 0, Marikina: 0, Rodriguez: 0 };
      data.forEach((ev) => {
        if (counts[ev.campus] !== undefined) counts[ev.campus]++;
      });

      myChart = new Chart(ctx, {
        type: "pie",
        data: {
          labels: Object.keys(counts),
          datasets: [
            {
              data: Object.values(counts),
              backgroundColor: ["#facc15", "#006633", "#166534"],
            },
          ],
        },
        options: chartOptions,
      });
    } else if (type === "orders") {
      title.innerText = "Registrations by Status";
      const { data } = await supabase.from("orders").select("status");
      const counts = {};
      data.forEach((o) => (counts[o.status] = (counts[o.status] || 0) + 1));

      myChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: Object.keys(counts),
          datasets: [
            {
              label: "Total Orders",
              data: Object.values(counts),
              backgroundColor: "#006633",
            },
          ],
        },
        options: {
          ...chartOptions,
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
      });
    } else if (type === "attendance") {
      title.innerText = "Overall Attendance Rate";
      const { data } = await supabase.from("orders").select("status");
      const attended = data.filter((o) => o.status === "Attended").length;
      const others = data.length - attended;

      myChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Attended", "Others"],
          datasets: [
            {
              data: [attended, others],
              backgroundColor: ["#006633", "#e5e7eb"],
            },
          ],
        },
        options: chartOptions,
      });
    }
  };

  window.closeAnalytics = () => {
    const modal = document.getElementById("analytics-modal");
    if (modal) modal.classList.add("hidden");
  };

  window.addEventListener("click", (e) => {
    const modal = document.getElementById("analytics-modal");
    if (e.target === modal) {
      window.closeAnalytics();
    }
  });
}
