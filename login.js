// login.js - Login with database verification
const API_BASE_URL = "http://localhost:3000/api"; // Update with your backend URL

document.addEventListener("DOMContentLoaded", function () {
  console.log("Login page loaded");

  // Check if there's an option to logout if already logged in
  checkIfAlreadyLoggedIn();

  // Initialize the login form
  initializeLoginForm();
});

// Check if user is already logged in (just to show logout option)
function checkIfAlreadyLoggedIn() {
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("authToken");

  if (user && token) {
    // Add a logout option instead of auto-redirecting
    addLogoutOption();
  }
}

// Add logout option if user is already logged in
function addLogoutOption() {
  const loginCard = document.querySelector(".card-body");
  if (!loginCard) return;

  const logoutDiv = document.createElement("div");
  logoutDiv.className =
    "mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200";
  logoutDiv.innerHTML = `
    <div class="flex items-start">
      <i class="fas fa-info-circle text-yellow-600 mt-1 mr-2"></i>
      <div>
        <p class="text-sm font-medium text-yellow-800">You are already logged in</p>
        <p class="text-xs text-yellow-700 mt-1">Click below to logout and login with different credentials</p>
        <button onclick="logout()" class="btn btn-sm btn-warning mt-2 w-full">
          <i class="fas fa-sign-out-alt mr-2"></i>Logout & Login as Different User
        </button>
      </div>
    </div>
  `;

  // Insert after the form
  const form = document.getElementById("loginForm");
  if (form) {
    form.parentNode.insertBefore(logoutDiv, form.nextSibling);
  }
}

// Logout function
function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("authToken");
  showNotification("Logged out successfully", "success");
  setTimeout(() => {
    location.reload();
  }, 1000);
}

// Initialize login form elements
function initializeLoginForm() {
  const loginForm = document.getElementById("loginForm");

  if (!loginForm) {
    console.error("Login form not found!");
    return;
  }

  // Focus on mobile input
  const mobileInput = document.getElementById("mobile");
  if (mobileInput) {
    mobileInput.focus();
  }

  // Add form submit handler
  loginForm.addEventListener("submit", handleLoginSubmit);
}

// Toggle password visibility
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");

  if (passwordInput && eyeIcon) {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      eyeIcon.className = "fas fa-eye-slash";
    } else {
      passwordInput.type = "password";
      eyeIcon.className = "fas fa-eye";
    }
  }
}

// Show notification
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(
    ".login-notification"
  );
  existingNotifications.forEach((notification) => notification.remove());

  // Create notification
  const notification = document.createElement("div");
  notification.className = `login-notification alert alert-${type} shadow-lg fixed top-4 right-4 z-50 max-w-sm transition-all duration-300`;
  notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${
              type === "success"
                ? "check-circle"
                : type === "error"
                ? "exclamation-circle"
                : "info-circle"
            } mr-2"></i>
            <span>${message}</span>
            <button class="btn btn-xs btn-circle btn-ghost ml-auto" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
    `;

  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Show loading state
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

// Validate mobile number format
function validateMobile(mobile) {
  if (!mobile) return false;

  // Remove non-digits
  const cleaned = mobile.replace(/\D/g, "");

  // Check length
  if (cleaned.length < 10 || cleaned.length > 11) return false;

  // Check prefix
  const validPrefixes = ["13", "14", "15", "16", "17", "18", "19"];
  const prefix = cleaned.substring(0, 2);

  return validPrefixes.includes(prefix);
}

// Handle login form submission
async function handleLoginSubmit(event) {
  event.preventDefault();

  const mobileInput = document.getElementById("mobile");
  const passwordInput = document.getElementById("password");

  if (!mobileInput || !passwordInput) {
    showNotification("Form fields not found", "error");
    return;
  }

  const mobile = mobileInput.value.trim();
  const password = passwordInput.value.trim();

  // Validation
  if (!mobile) {
    showNotification("Please enter mobile number", "error");
    mobileInput.focus();
    return;
  }

  if (!validateMobile(mobile)) {
    showNotification(
      "Please enter a valid Bangladeshi mobile number (10-11 digits starting with 13,14,15,16,17,18,19)",
      "error"
    );
    mobileInput.focus();
    return;
  }

  if (!password) {
    showNotification("Please enter password", "error");
    passwordInput.focus();
    return;
  }

  // Set loading state
  setLoading(true);

  try {
    // Prepare login data
    const loginData = {
      mobile: `+880${mobile}`, // Add Bangladesh country code
      password: password,
    };

    console.log("Attempting login with:", {
      ...loginData,
      password: "***",
    });

    // Make API call to verify credentials from database
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Login failed. Please check your credentials."
      );
    }

    if (data.success && data.user) {
      // Store user data from database response
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("authToken", data.token);

      showNotification(
        "Login successful! Redirecting to dashboard...",
        "success"
      );

      // Redirect to dashboard after delay
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      throw new Error(data.message || "Invalid credentials");
    }
  } catch (error) {
    console.error("Login error:", error);

    // If backend is unavailable, fallback to demo mode for testing
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError")
    ) {
      console.warn("Backend unavailable, using demo mode");
      useDemoModeFallback(mobile, password);
    } else {
      showNotification(
        error.message || "Login failed. Please try again.",
        "error"
      );
    }
  } finally {
    setLoading(false);
  }
}

// Demo mode fallback (for testing when backend is unavailable)
function useDemoModeFallback(mobile, password) {
  // Demo credentials check
  const isDemo =
    (mobile === "01700000000" || mobile === "017XXXXXXXX") &&
    password === "demo123";

  if (isDemo) {
    const userData = {
      id: "demo_user_123",
      name: "Demo User",
      mobile: "+8801700000000",
      email: "demo@example.com",
      role: "customer",
      isActive: true,
      createdAt: new Date().toISOString(),
      isDemo: true, // Flag to indicate demo user
    };

    const token = "demo_token_" + Date.now();

    // Save to localStorage
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", token);

    showNotification("Demo login successful! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
  } else {
    showNotification(
      "Backend unavailable. For demo, use: Mobile: 01700000000, Password: demo123",
      "error"
    );
  }
}

// Add notification styles if needed
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
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .btn-warning {
            background-color: #f59e0b;
            color: white;
            border: none;
        }
        
        .btn-warning:hover {
            background-color: #d97706;
        }
    `;
  document.head.appendChild(style);
}

// Debug: Log current state
console.log("Login page ready");
console.log("API Base URL:", API_BASE_URL);
console.log("Current auth state:", {
  hasUser: !!localStorage.getItem("user"),
  hasToken: !!localStorage.getItem("authToken"),
});
