import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Your live Supabase Credentials
const supabaseUrl = "https://wcqkpqcyaiuocwyjtvhs.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWtwcWN5YWl1b2N3eWp0dmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDI3NDEsImV4cCI6MjA4OTMxODc0MX0.ECG7XZIovBahv9NlDMuYGe0RrlI7J4oxr1gBBIYh7aY";
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  // --- REUSABLE SHOW PASSWORD LOGIC ---
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

  // ==========================================
  // SIGN UP PAGE LOGIC
  // ==========================================
  if (path.includes("signup.html")) {
    togglePassword("show-password-signup", "password", "confirm-password");

    // T&C Modal Variables
    const tcModal = document.getElementById("tc-modal");
    const openTcBtn = document.getElementById("open-tc");
    const tcBox = document.getElementById("tc-box");
    const ackBtn = document.getElementById("acknowledge-btn");
    const tcCheckbox = document.getElementById("tc-checkbox");
    const registerBtn = document.getElementById("register-btn");

    // Open Modal
    openTcBtn.addEventListener("click", () => {
      tcModal.style.display = "flex";
    });

    // Scroll Logic
    tcBox.addEventListener("scroll", () => {
      if (tcBox.scrollHeight - tcBox.scrollTop <= tcBox.clientHeight + 2) {
        ackBtn.disabled = false;
      }
    });

    // Acknowledge Button Logic
    ackBtn.addEventListener("click", () => {
      tcModal.style.display = "none";
      tcCheckbox.disabled = false;
      tcCheckbox.checked = true;
      registerBtn.disabled = false;
    });

    // Handle Registration
    const signupForm = document.getElementById("signup-form");
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      registerBtn.innerText = "Processing...";
      registerBtn.disabled = true;

      const fname = document.getElementById("fname").value;
      const lname = document.getElementById("lname").value;
      const phone = document.getElementById("phone").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      // Strict Validations
      if (!email.endsWith("@feuroosevelt.edu.ph")) {
        alert(
          "Registration Failed: Please use your official @feuroosevelt.edu.ph email account.",
        );
        registerBtn.innerText = "Sign Up";
        registerBtn.disabled = false;
        return;
      }

      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        registerBtn.innerText = "Sign Up";
        registerBtn.disabled = false;
        return;
      }

      // 1. Send data to Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        alert("Error: " + error.message);
        registerBtn.innerText = "Sign Up";
        registerBtn.disabled = false;
      } else {
        // 2. Save additional details to the profiles table
        if (data.user) {
          await supabase.from("profiles").insert([
            {
              id: data.user.id,
              first_name: fname,
              last_name: lname,
              phone_number: phone,
              school_email: email,
            },
          ]);
        }
        alert("Registration successful! You can now log in.");
        window.location.href = "signin.html";
      }
    });
  }

  // ==========================================
  // SIGN IN PAGE LOGIC
  // ==========================================
  if (
    path.includes("signin.html") ||
    path === "/" ||
    path.includes("index.html")
  ) {
    togglePassword("show-password-signin", "password");

    const signinForm = document.getElementById("signin-form");
    if (signinForm) {
      signinForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = signinForm.querySelector("button");
        btn.innerText = "Logging in...";
        btn.disabled = true;

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          alert("Login Failed: " + error.message);
          btn.innerText = "Log In";
          btn.disabled = false;
        } else {
          alert("Login successful!");
          window.location.href = "dashboard.html";
        }
      });
    }
  }
});
