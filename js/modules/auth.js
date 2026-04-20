import { supabase } from "./api.js";
import { state } from "./state.js";
import {
  showCustomAlert,
  togglePassword,
  renderSidebar,
  loadNotifications,
} from "./ui.js";

export async function initAuth() {
  const path = state.path;

  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData && sessionData.session) {
    state.currentUser = sessionData.session.user;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, role")
        .eq("id", state.currentUser.id)
        .single();
      if (profile) {
        state.userRole = profile.role || "user";
        const greetingEl = document.getElementById("user-greeting");
        if (greetingEl)
          greetingEl.innerText = `Welcome, ${profile.first_name.toUpperCase()}!`;
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }

    if (
      (path.includes("admin") || path.includes("scanner")) &&
      state.userRole !== "admin"
    ) {
      window.location.href = path.includes("pages/")
        ? "../index.html"
        : "index.html";
      return;
    }

    renderSidebar(state.userRole);

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
      window.location.href = path.includes("pages/")
        ? "signin.html"
        : "pages/signin.html";
      return;
    }

    renderSidebar(state.userRole);

    document
      .querySelectorAll(".user-only")
      .forEach((el) => el.classList.add("hidden"));
    document
      .querySelectorAll(".guest-only")
      .forEach((el) => el.classList.remove("hidden"));
  }

  loadNotifications();

  // --- SIGN UP LOGIC ---
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

    const phoneInput = document.getElementById("phone");
    const phoneHint = document.getElementById("phone-hint");
    if (phoneInput && phoneHint) {
      phoneInput.addEventListener("input", () => {
        if (phoneInput.value.length === 11) {
          phoneHint.style.color = "#10b981"; // Success green
          phoneHint.innerText = "✓ Valid 11-digit format";
        } else {
          phoneHint.style.color = "#ef4444"; // Error red
          phoneHint.innerText = "* Must be exactly 11 digits";
        }
      });
    }

    document
      .getElementById("signup-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const registerBtn = document.getElementById("register-btn");
        const email = document.getElementById("email").value.toLowerCase();
        const password = document.getElementById("password").value;

        if (!email.endsWith("@feuroosevelt.edu.ph")) {
          showCustomAlert(
            "Invalid Email",
            "Please use your official school email ending in <b>@feuroosevelt.edu.ph</b>.",
          );
          if (typeof turnstile !== "undefined") turnstile.reset();
          return;
        }

        const phone = document.getElementById("phone").value;
        if (phone.length !== 11) {
          showCustomAlert(
            "Invalid Phone",
            "Phone number must be exactly <b>11 digits</b>.",
          );
          if (typeof turnstile !== "undefined") turnstile.reset();
          return;
        }

        const fname = document.getElementById("fname").value.trim();
        const lname = document.getElementById("lname").value.trim();
        const nameRegex = /^[a-zA-Z\s-]+$/;
        const nameError = document.getElementById("name-error");

        if (!nameRegex.test(fname) || !nameRegex.test(lname)) {
          if (nameError) nameError.style.display = "block";
          document.getElementById("fname").style.borderColor = "#ef4444";
          document.getElementById("lname").style.borderColor = "#ef4444";
          showCustomAlert(
            "Invalid Name",
            "Names can only contain letters, spaces, and hyphens.",
          );
          if (typeof turnstile !== "undefined") turnstile.reset();
          return;
        } else {
          if (nameError) nameError.style.display = "none";
          document.getElementById("fname").style.borderColor = "";
          document.getElementById("lname").style.borderColor = "";
        }

        registerBtn.innerText = "Processing...";
        registerBtn.disabled = true;

        if (password !== document.getElementById("confirm-password").value) {
          showCustomAlert("Error", "Passwords do not match.");
          registerBtn.innerText = "Sign Up";
          registerBtn.disabled = false;
          if (typeof turnstile !== "undefined") turnstile.reset();
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
          options: { captchaToken: captchaToken },
        });

        if (error) {
          showCustomAlert("Registration Error", error.message);
          registerBtn.innerText = "Sign Up";
          registerBtn.disabled = false;
          if (typeof turnstile !== "undefined") turnstile.reset();
          return; // STOP FLOW HERE
        }

        // Supabase returns an empty identities array if the email is already taken
        // depending on your project settings (Email enumeration protection).
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          showCustomAlert("Error", "This email is already registered. Please use another or log in.");
          registerBtn.innerText = "Sign Up";
          registerBtn.disabled = false;
          if (typeof turnstile !== "undefined") turnstile.reset();
          return;
        }

        if (data.user) {
          await supabase.from("profiles").insert([
            {
              id: data.user.id,
              first_name: fname,
              last_name: lname,
              phone_number: phone,
              school_email: email,
              role: "user",
            },
          ]);
          showCustomAlert(
            "Success",
            "Registration successful! Confirm email before logging in.",
          );
          setTimeout(() => {
            window.location.href = "signin.html";
          }, 1500);
        } else {
          showCustomAlert("Error", "An unexpected error occurred. Please try again.");
          registerBtn.innerText = "Sign Up";
          registerBtn.disabled = false;
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
            redirectTo: window.location.origin + "/pages/reset-password.html",
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
            btn.classList.remove("loading-btn"); // ← was missing; pointer-events:none kept button unclickable
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
          window.location.href = "../index.html";
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
}
