// dashboard.js - Role-based dashboard control

document.addEventListener("DOMContentLoaded", function () {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("authToken");

  // Auth check
  if (!user || !token) {
    window.location.href = "login.html";
    return;
  }

  // Update profile UI
  updateUserInfo(user);

  // Role-based access & landing
  setupRoleBasedAccess(user.role);

  // Logout
  setupLogout();

  // Producer-only feature
  if (user.role === "producer") {
    setupQRGenerator();
  }
});

/* ==========================
   USER INFO
========================== */
function updateUserInfo(user) {
  const userName = document.getElementById("user-name");
  const userMobile = document.getElementById("user-mobile");
  const roleBadge = document.getElementById("user-role-badge");
  const currentRole = document.getElementById("current-role");
  const description = document.getElementById("user-description");

  if (userName) userName.textContent = user.name || "User";
  if (userMobile) userMobile.textContent = user.mobile || "+880 XXXXXXXX";

  if (roleBadge) {
    roleBadge.textContent = capitalize(user.role);
    roleBadge.className = `badge badge-${getRoleColor(user.role)}`;
  }

  if (currentRole) currentRole.textContent = capitalize(user.role);

  if (description) {
    const descriptions = {
      customer: "Regular customer. Verified member.",
      shopkeeper: "Shop owner. Verified business.",
      distributor: "Verified distributor.",
      producer: "Verified producer.",
      admin: "System administrator.",
    };
    description.textContent = descriptions[user.role] || "Verified member.";
  }
}

/* ==========================
   ROLE COLORS
========================== */
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

/* ==========================
   ROLE-BASED ACCESS CONTROL
========================== */
function setupRoleBasedAccess(userRole) {
  const roleHierarchy = {
    producer: ["producer", "distributor", "shopkeeper", "customer"],
    distributor: ["distributor", "shopkeeper", "customer"],
    shopkeeper: ["shopkeeper", "customer"],
    customer: ["customer"],
  };

  const allowedRoles = roleHierarchy[userRole] || ["customer"];

  // Hide all role buttons
  document.querySelectorAll(".role-btn").forEach((btn) => {
    btn.classList.add("hidden");
  });

  // Show allowed role buttons
  allowedRoles.forEach((role) => {
    const btn = document.getElementById(`role-${role}`);
    if (btn) btn.classList.remove("hidden");
  });

  // Hide all dashboards
  document.querySelectorAll('[id$="-dashboard"]').forEach((dash) => {
    dash.classList.add("hidden");
  });

  // Show landing dashboard (own role)
  const landingDashboard = document.getElementById(`${userRole}-dashboard`);
  if (landingDashboard) landingDashboard.classList.remove("hidden");

  // Highlight own role button
  const activeBtn = document.getElementById(`role-${userRole}`);
  if (activeBtn) {
    activeBtn.classList.add("btn-emerald");
    activeBtn.classList.remove("btn-outline");
  }

  // Enable switching ONLY within allowed roles
  document.querySelectorAll(".role-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const selectedRole = this.id.replace("role-", "");

      if (!allowedRoles.includes(selectedRole)) return;

      // Button UI reset
      document.querySelectorAll(".role-btn").forEach((b) => {
        b.classList.remove("btn-emerald");
        b.classList.add("btn-outline");
      });

      this.classList.add("btn-emerald");
      this.classList.remove("btn-outline");

      // Dashboard switch
      document.querySelectorAll('[id$="-dashboard"]').forEach((dash) => {
        dash.classList.add("hidden");
      });

      const target = document.getElementById(`${selectedRole}-dashboard`);
      if (target) {
        target.classList.remove("hidden");
        target.classList.add("fade-in");
        setTimeout(() => target.classList.remove("fade-in"), 300);
      }

      // Update UI role label (DO NOT change stored role)
      const roleText = capitalize(selectedRole);
      document.getElementById("current-role").textContent = roleText;

      const badge = document.getElementById("user-role-badge");
      badge.textContent = roleText;
      badge.className = `badge badge-${getRoleColor(selectedRole)}`;
    });
  });
}

/* ==========================
   LOGOUT
========================== */
function setupLogout() {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");
        window.location.href = "login.html";
      }
    });
  });
}

/* ==========================
   QR GENERATOR (PRODUCER)
========================== */
function setupQRGenerator() {
  console.log("QR Generator enabled for producer");
}

function openProfileModal() {
  document.getElementById("profile-modal")?.showModal();
}

function openQRGenerator() {
  document.getElementById("qr-generator-modal")?.showModal();
}

function generateQRCode() {
  const productName = document.getElementById("qr-product-name").value;
  const productId = document.getElementById("qr-product-id").value;

  if (!productName || !productId) {
    alert("Please fill in Product Name and Product ID");
    return;
  }

  const qrData = {
    productName,
    productId,
    batchNumber: document.getElementById("qr-batch-number").value,
    manufactureDate: document.getElementById("qr-manufacture-date").value,
    expiryDate: document.getElementById("qr-expiry-date").value,
    producer: JSON.parse(localStorage.getItem("user")).name,
    timestamp: new Date().toISOString(),
  };

  const container = document.getElementById("qr-code-container");
  container.innerHTML = "";

  QRCode.toCanvas(container, JSON.stringify(qrData), (err) => {
    if (err) {
      console.error(err);
      alert("QR generation failed");
    }
  });
}

function downloadQRCode() {
  const canvas = document.querySelector("#qr-code-container canvas");
  if (!canvas) {
    alert("Generate QR first");
    return;
  }

  const link = document.createElement("a");
  link.download = `QR_${document.getElementById("qr-product-id").value}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/* ==========================
   UTIL
========================== */
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
