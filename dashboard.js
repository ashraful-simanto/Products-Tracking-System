// dashboard.js - Add this script to dashboard.html
document.addEventListener("DOMContentLoaded", function () {
  // Check if user is authenticated
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("authToken");

  if (!user || !token) {
    // Redirect to login if not authenticated
    window.location.href = "login.html";
    return;
  }

  // Update UI with user data
  updateUserInfo(user);

  // Set up role switching
  setupRoleSwitching(user.role);

  // Set up logout functionality
  setupLogout();

  // Initialize QR generator (for producers)
  if (user.role === "producer") {
    setupQRGenerator();
  }
});

// Update user information in the dashboard
function updateUserInfo(user) {
  // Update name
  const userNameElement = document.getElementById("user-name");
  if (userNameElement) {
    userNameElement.textContent = user.name || "User";
  }

  // Update mobile
  const userMobileElement = document.getElementById("user-mobile");
  if (userMobileElement) {
    userMobileElement.textContent = user.mobile || "+880 XXXXXXXX";
  }

  // Update role badge
  const userRoleBadge = document.getElementById("user-role-badge");
  if (userRoleBadge) {
    userRoleBadge.textContent =
      user.role.charAt(0).toUpperCase() + user.role.slice(1);
    userRoleBadge.className = `badge badge-${getRoleColor(user.role)}`;
  }

  // Update current role
  const currentRoleElement = document.getElementById("current-role");
  if (currentRoleElement) {
    currentRoleElement.textContent =
      user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }

  // Update description based on role
  const userDescription = document.getElementById("user-description");
  if (userDescription) {
    const descriptions = {
      customer: "Regular customer. Verified member.",
      shopkeeper: "Shop owner. Verified business.",
      distributor: "Verified distributor.",
      producer: "Verified producer.",
      admin: "System administrator.",
    };
    userDescription.textContent = descriptions[user.role] || "Verified member.";
  }
}

// Get color based on role
function getRoleColor(role) {
  const colors = {
    customer: "emerald",
    shopkeeper: "blue",
    distributor: "purple",
    producer: "orange",
    admin: "red",
  };
  return colors[role] || "emerald";
}

// Set up role switching
function setupRoleSwitching(currentRole) {
  // Highlight current role button
  const currentRoleBtn = document.getElementById(`role-${currentRole}`);
  if (currentRoleBtn) {
    currentRoleBtn.classList.add("btn-emerald");
  }

  // Hide all dashboards except current role
  const allDashboards = document.querySelectorAll('[id$="-dashboard"]');
  allDashboards.forEach((dashboard) => {
    dashboard.classList.add("hidden");
  });

  // Show current role dashboard
  const currentDashboard = document.getElementById(`${currentRole}-dashboard`);
  if (currentDashboard) {
    currentDashboard.classList.remove("hidden");
  }

  // Add click handlers to role buttons
  document.querySelectorAll(".role-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const role = this.id.replace("role-", "");

      // Remove highlight from all buttons
      document.querySelectorAll(".role-btn").forEach((b) => {
        b.classList.remove("btn-emerald");
        b.classList.add("btn-outline");
      });

      // Highlight clicked button
      this.classList.remove("btn-outline");
      this.classList.add("btn-emerald");

      // Update current role display
      const currentRoleElement = document.getElementById("current-role");
      if (currentRoleElement) {
        currentRoleElement.textContent =
          role.charAt(0).toUpperCase() + role.slice(1);
      }

      // Update role badge
      const userRoleBadge = document.getElementById("user-role-badge");
      if (userRoleBadge) {
        userRoleBadge.textContent =
          role.charAt(0).toUpperCase() + role.slice(1);
        userRoleBadge.className = `badge badge-${getRoleColor(role)}`;
      }

      // Switch dashboard view
      allDashboards.forEach((dashboard) => {
        dashboard.classList.add("hidden");
      });

      const targetDashboard = document.getElementById(`${role}-dashboard`);
      if (targetDashboard) {
        targetDashboard.classList.remove("hidden");
        targetDashboard.classList.add("fade-in");

        // Remove animation class after animation completes
        setTimeout(() => {
          targetDashboard.classList.remove("fade-in");
        }, 300);
      }
    });
  });
}

// Set up logout
function setupLogout() {
  const logoutLinks = document.querySelectorAll(
    'a[href*="logout"], a:contains("Logout")'
  );

  logoutLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      // Show confirmation dialog
      if (confirm("Are you sure you want to logout?")) {
        // Clear authentication data
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");

        // Redirect to login page
        window.location.href = "login.html";
      }
    });
  });
}

// Set up QR Generator (for producers)
function setupQRGenerator() {
  // This function will be called when producer clicks QR Generator button
  console.log("QR Generator setup for producer");
}

// Modal functions
function openProfileModal() {
  const modal = document.getElementById("profile-modal");
  if (modal) {
    modal.showModal();
  }
}

function openQRGenerator() {
  const modal = document.getElementById("qr-generator-modal");
  if (modal) {
    modal.showModal();
  }
}

// QR Code generation
function generateQRCode() {
  const productName = document.getElementById("qr-product-name").value;
  const productId = document.getElementById("qr-product-id").value;

  if (!productName || !productId) {
    alert("Please fill in Product Name and Product ID");
    return;
  }

  // Create data for QR code
  const qrData = {
    productName: productName,
    productId: productId,
    batchNumber: document.getElementById("qr-batch-number").value,
    manufactureDate: document.getElementById("qr-manufacture-date").value,
    expiryDate: document.getElementById("qr-expiry-date").value,
    producer: JSON.parse(localStorage.getItem("user")).name,
    timestamp: new Date().toISOString(),
  };

  // Generate QR code
  const qrContainer = document.getElementById("qr-code-container");
  qrContainer.innerHTML = "";

  QRCode.toCanvas(qrContainer, JSON.stringify(qrData), function (error) {
    if (error) {
      console.error("QR Code generation error:", error);
      alert("Failed to generate QR code");
    }
  });
}

function downloadQRCode() {
  const canvas = document.querySelector("#qr-code-container canvas");
  if (!canvas) {
    alert("Please generate a QR code first");
    return;
  }

  const link = document.createElement("a");
  link.download = `QR_${
    document.getElementById("qr-product-id").value || "product"
  }.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
