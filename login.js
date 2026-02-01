// login.js - Login with mobile/password (Bangladesh 11-digit numbers)
const API_BASE_URL = "http://localhost:3000/api";

// ----------------------
// DOMContentLoaded
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("Login page loaded");
  checkIfAlreadyLoggedIn();
  initializeLoginForm();
});

// ----------------------
// Check if already logged in
// ----------------------
function checkIfAlreadyLoggedIn() {
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token"); // consistent with dashboard.js

  if (user && token) {
    showNotification("You are already logged in. Redirecting...", "info");
    setTimeout(() => (window.location.href = "dashboard.html"), 1000);
  }
}

// ----------------------
// Initialize login form
// ----------------------
function initializeLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  document.getElementById("mobile")?.focus();
  loginForm.addEventListener("submit", handleLoginSubmit);
}

// ----------------------
// Toggle password visibility
// ----------------------
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");

  if (!passwordInput || !eyeIcon) return;

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    passwordInput.type = "password";
    eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
  }
}

// ----------------------
// Show notification
// ----------------------
function showNotification(message, type = "info") {
  document.querySelectorAll(".login-notification").forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `login-notification alert alert-${type} shadow-lg fixed top-4 right-4 z-50 max-w-sm`;
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"} mr-2"></i>
      <span>${message}</span>
      <button class="btn btn-xs btn-circle btn-ghost ml-auto" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5000);
}

// ----------------------
// Set loading state
// ----------------------
function setLoading(isLoading) {
  const submitBtn = document.querySelector('#loginForm button[type="submit"]');
  if (!submitBtn) return;

  if (isLoading) {
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i>Verifying...';
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-70", "cursor-not-allowed");
  } else {
    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Login';
    submitBtn.disabled = false;
    submitBtn.classList.remove("opacity-70", "cursor-not-allowed");
  }
}

// ----------------------
// Validate mobile number
// ----------------------
function validateMobile(mobile) {
  const cleaned = mobile.replace(/\D/g, "");
  return cleaned.length === 11 && cleaned.startsWith("01");
}

// ----------------------
// Handle login submission
// ----------------------
async function handleLoginSubmit(event) {
  event.preventDefault();

  const mobile = document.getElementById("mobile").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!mobile) return showError("Please enter mobile number", "mobile");
  if (!validateMobile(mobile))
    return showError(
      "Enter a valid 11-digit Bangladeshi mobile number starting with 01",
      "mobile",
    );
  if (!password) return showError("Please enter password", "password");

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, password }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || "Login failed");

    // Save to localStorage using consistent keys
    if (data.success && data.user && data.token) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      showNotification("Login successful! Redirecting...", "success");
      setTimeout(() => (window.location.href = "dashboard.html"), 1000);
    }
  } catch (err) {
    console.error("Login error:", err);

    // Demo fallback
    if (
      err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError")
    ) {
      useDemoModeFallback(mobile, password);
    } else {
      showNotification(err.message, "error");
    }
  } finally {
    setLoading(false);
  }
}

// ----------------------
// Show error
// ----------------------
function showError(message, fieldId) {
  showNotification(message, "error");
  document.getElementById(fieldId)?.focus();
}

// ----------------------
// Demo fallback if backend unavailable
// ----------------------
function useDemoModeFallback(mobile, password) {
  if (mobile === "01700000000" && password === "demo123") {
    const userData = {
      id: "demo_user_123",
      name: "Demo User",
      mobile: "01700000000",
      email: "demo@example.com",
      role: "customer",
      createdAt: new Date().toISOString(),
      isDemo: true,
    };
    const token = "demo_token_" + Date.now();

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);

    showNotification("Demo login successful! Redirecting...", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 1000);
  } else {
    showNotification(
      "Backend unavailable. For demo, use Mobile: 01700000000, Password: demo123",
      "error",
    );
  }
}

// ----------------------
// Notification styles
// ----------------------
if (!document.querySelector("#login-notification-styles")) {
  const style = document.createElement("style");
  style.id = "login-notification-styles";
  style.textContent = `
    .login-notification {
      animation: slideIn 0.3s ease-out;
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 9999 !important;
    }
    @keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
  `;
  document.head.appendChild(style);
}

console.log("Login page ready");
console.log("API Base URL:", API_BASE_URL);
