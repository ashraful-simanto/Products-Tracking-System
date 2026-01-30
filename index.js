// index.js - Main entry point for home page
document.addEventListener("DOMContentLoaded", function () {
  console.log("Home page loaded");

  // Only check login status and update UI
  updateLoginStatus();

  // Add any home page specific functionality here
  initializeHomePage();
});

function initializeHomePage() {
  // Add any home page specific initialization here
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn) {
    loginBtn.addEventListener("click", function () {
      window.location.href = "login.html";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.clear();
      updateLoginStatus();
      showNotification("Logged out successfully", "success");
    });
  }
}

function updateLoginStatus() {
  const token = localStorage.getItem("authToken");
  const user = localStorage.getItem("user");

  // Update UI based on login status
  const loginStatus = document.getElementById("loginStatus");
  const userInfo = document.getElementById("userInfo");

  if (loginStatus) {
    if (token && user) {
      loginStatus.innerHTML =
        '<i class="fas fa-user-check text-emerald-600"></i> Logged In';
      loginStatus.classList.add("text-emerald-600");
      loginStatus.classList.remove("text-gray-600");
    } else {
      loginStatus.innerHTML =
        '<i class="fas fa-user text-gray-600"></i> Not Logged In';
      loginStatus.classList.remove("text-emerald-600");
      loginStatus.classList.add("text-gray-600");
    }
  }

  if (userInfo && token && user) {
    try {
      const userData = JSON.parse(user);
      userInfo.innerHTML = `Welcome, ${userData.name || "User"}!`;
      userInfo.style.display = "block";
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }
}

// Show notification (for home page)
function showNotification(message, type = "info") {
  const existingNotification = document.querySelector(".home-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement("div");
  notification.className = `home-notification alert alert-${type} shadow-lg fixed top-4 right-4 z-50 max-w-sm`;
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

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Add notification styles if needed
if (!document.querySelector("#home-notification-styles")) {
  const style = document.createElement("style");
  style.id = "home-notification-styles";
  style.textContent = `
        .home-notification {
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
    `;
  document.head.appendChild(style);
}

// Debug helper
console.log("Home page - Current localStorage:", {
  user: localStorage.getItem("user"),
  authToken: localStorage.getItem("authToken"),
});
