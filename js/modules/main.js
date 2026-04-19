import { supabase } from "./api.js";
import { state } from "./state.js";
import { initUI, showCustomAlert, showCustomConfirm, loadNotifications } from "./ui.js";
import { initAuth } from "./auth.js";
import { initAdmin } from "./admin.js";

document.addEventListener("DOMContentLoaded", async () => {
  initUI();
  await initAuth();
  initAdmin();

  // --- SERVICE WORKER REGISTRATION ---
  if ("serviceWorker" in navigator) {
    const isSubPage = window.location.pathname.includes("/pages/");
    const swPath = isSubPage ? "../sw.js" : "sw.js";
    
    navigator.serviceWorker
      .register(swPath)
      .then((reg) => console.log("ServiceWorker registered with scope:", reg.scope))
      .catch((err) => console.log("ServiceWorker registration failed:", err));
  }

  const path = state.path;

  // --- DASHBOARD EVENTS & REGISTRATION LOGIC ---
  const isUserRegistered = async (eventId) => {
    if (!state.currentUser) return false;
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", state.currentUser.id)
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
      state.allEventsGlobal = events;
      renderEvents(state.allEventsGlobal);
    }

    document.getElementById("search-input")?.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      renderEvents(
        state.allEventsGlobal.filter((ev) => ev.title.toLowerCase().includes(term)),
      );
    });

    document
      .getElementById("campus-select")
      ?.addEventListener("change", (e) => {
        const campus = e.target.value;
        renderEvents(
          campus === "All"
            ? state.allEventsGlobal
            : state.allEventsGlobal.filter((ev) => ev.campus === campus),
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
        state.currentSelectedEvent = event;
        document.getElementById("modal-event-img").src =
          event.poster_url ||
          "https://via.placeholder.com/500x200?text=FEUR+Event";
        document.getElementById("modal-event-title").innerText = event.title;
        document.getElementById("modal-event-meta").innerHTML =
          `📅 ${event.event_date || "TBA"} at ${event.event_time || ""} <br>📍 FEU Roosevelt ${event.campus} <br><br>📊 <b>Available Slots:</b> ${slotsLeft} / ${maxCap}`;
        document.getElementById("modal-event-desc").innerText =
          event.description || "No description available for this event.";

        const paymentSection = document.getElementById("payment-section");
        const priceDisplay = document.getElementById("modal-price-display");
        if (paymentSection) {
          if (event.price > 0) {
            paymentSection.style.display = "block";
            if (priceDisplay) priceDisplay.innerText = event.price;
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
            modalBtn.innerText = "Register Now";
            modalBtn.style.background = "var(--primary)";
            modalBtn.style.color = "white";
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
      if (!state.currentUser) {
        document.getElementById("event-details-modal")?.classList.add("hidden");
        document.getElementById("auth-modal")?.classList.remove("hidden");
        return;
      }

      const modalRegBtn = document.getElementById("modal-register-btn");
      modalRegBtn.innerText = "Registering...";
      modalRegBtn.disabled = true;

      const currentSelectedEvent = state.currentSelectedEvent;

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

      let paymentStat = currentSelectedEvent.price > 0 ? "unpaid" : "free";
      let orderStat =
        currentSelectedEvent.price > 0 ? "Pending Payment" : "Registered";

      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            user_id: state.currentUser.id,
            event_id: currentSelectedEvent.id,
            status: orderStat,
            payment_status: paymentStat,
            proof_of_payment_url: null,
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

        if (currentSelectedEvent.price > 0) {
          showCustomAlert(
            "Slot Reserved!",
            `Please pay ₱${currentSelectedEvent.price}.<br><br>Your Reference Number is: <b style="font-size: 14px; color: var(--primary);">${ticketID}</b><br><br>Go to your Order List to upload the receipt within 5 days.`,
          );

          fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              service_id: "service_abyji0d",
              template_id: "template_sy2u7pe",
              user_id: "pY0e20a_mx8EoiFdT",
              template_params: {
                to_email: state.currentUser.email,
                user_name: userName,
                event_title: currentSelectedEvent.title,
                ref_no: ticketID,
                price: currentSelectedEvent.price,
              },
            }),
          }).then(() => console.log("Pending Email sent via API!"));
        } else {
          if (typeof emailjs !== "undefined") {
            emailjs
              .send("service_nczv2qc", "template_uiwfmsd", {
                to_email: state.currentUser.email,
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
        }

        modalRegBtn.innerText = "Registered";
        modalRegBtn.style.background = "gray";
        modalRegBtn.style.color = "white";
        loadNotifications();

        if (state.allEventsGlobal.length > 0) {
          renderEvents(state.allEventsGlobal);
        }
      }
    });

  // --- ORDER LIST LOGIC ---
  const ordersGrid = document.getElementById("orders-grid");
  if (ordersGrid && path.includes("orderlist")) {
    const fetchOrders = async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `id, status, payment_status, proof_of_payment_url, events ( id, title, event_date, campus, poster_url, price )`,
        )
        .eq("user_id", state.currentUser.id);

      ordersGrid.innerHTML = "";
      if (error || !orders || orders.length === 0) {
        ordersGrid.innerHTML = "<p>You have no registered events yet.</p>";
      } else {
        const searchVal = (
          document.getElementById("search-input")?.value || ""
        ).toLowerCase();
        const campusVal =
          document.getElementById("campus-select")?.value || "All";

        const filteredOrders = orders.filter((o) => {
          const ev = o.events;
          if (!ev) return false;
          return (
            ev.title.toLowerCase().includes(searchVal) &&
            (campusVal === "All" || ev.campus === campusVal)
          );
        });

        if (filteredOrders.length === 0) {
          ordersGrid.innerHTML = "<p>No matching events found.</p>";
          return;
        }

        filteredOrders.forEach((order) => {
          const event = order.events;
          const isCancelled = order.status === "Cancelled";
          const card = document.createElement("div");
          card.className = "event-card";

          let actionHTML = "";
          const statusStyle = isCancelled
            ? "background:#fee2e2; color:#991b1b;"
            : "";

          if (isCancelled) {
            actionHTML = `<button class="btn btn-outline w-100" disabled style="border-color:#9ca3af; color:#9ca3af;">Cancelled</button>`;
          } else if (order.status === "Attended") {
            actionHTML = `<button class="btn btn-outline w-100" disabled style="border-color:#166534; color:#166534;">Attended</button>`;
          } else {
            if (event.price == 0 || order.payment_status === "paid") {
              actionHTML = `<button class="btn btn-solid w-100 qr-code-btn" data-order-id="${order.id}" data-event-title="${event.title}">View QR Code</button>`;
              if (event.price == 0) {
                actionHTML += `<button class="btn btn-outline w-100 cancel-ticket-btn" data-order-id="${order.id}" data-price="${event.price}" style="border-color:#ef4444; color:#ef4444; font-size:12px; padding:6px; font-weight:bold;">Cancel Ticket</button>`;
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
                ${event.price > 0 ? `<button class="btn btn-outline w-100 ref-no-btn" data-order-id="${order.id}" style="margin-bottom:8px; border-color:var(--primary); color:var(--primary); font-size:12px; padding:6px; font-weight:bold;">📄 View Ref No.</button>` : ""}
                
                ${actionHTML}
            </div>`;
          ordersGrid.appendChild(card);
        });

        document.querySelectorAll(".ref-no-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const orderId = btn.getAttribute("data-order-id");
            showCustomAlert(
              "Reference Number",
              `Your Reference Number is:<br><br><b style="font-size: 16px; color: var(--primary);">FEUR-TICKET-${orderId}</b>`,
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
            const fileName = `${state.currentUser.id}-${orderId}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("receipts")
              .upload(fileName, file);

            if (uploadError) {
              showCustomAlert("Error", "Upload failed. Try again.");
              btn.innerText = "Submit Payment Proof";
              btn.disabled = false;
              return;
            }

            const { data: publicUrlData } = supabase.storage
              .from("receipts")
              .getPublicUrl(fileName);
            await supabase
              .from("orders")
              .update({ proof_of_payment_url: publicUrlData.publicUrl })
              .eq("id", orderId);

            showCustomAlert(
              "Success",
              "Receipt uploaded! Please wait for admin verification.",
            );
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

        document.querySelectorAll(".cancel-ticket-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const orderId = btn.getAttribute("data-order-id");
            const eventPrice = parseFloat(btn.getAttribute("data-price") || 0);

            if (eventPrice > 0) {
              showCustomAlert(
                "Action Not Allowed",
                "You cannot cancel a paid registration directly. Please go to the <b>Help</b> section and contact the administrator for cancellation or refunds.",
              );
              return;
            }

            showCustomConfirm(
              "Cancel Registration",
              "Are you sure you want to cancel your registration for this free event? This action cannot be undone.",
              async () => {
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
                  fetchOrders();
                  loadNotifications();
                }
              },
            );
          });
        });
      }
    };

    fetchOrders();

    document
      .getElementById("search-input")
      ?.addEventListener("input", fetchOrders);
    document
      .getElementById("campus-select")
      ?.addEventListener("change", fetchOrders);

    document.getElementById("close-qr-modal")?.addEventListener("click", () => {
      document.getElementById("qr-modal")?.classList.add("hidden");
    });
  }

  // --- ADMIN & ADMISSION QR SCANNER LOGIC ---
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

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }
});
