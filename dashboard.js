// dashboard.js — FIXED & CLEAN VERSION

let currentUser = null;
const token = localStorage.getItem("token");

// ----------------------
// App bootstrap
// ----------------------
document.addEventListener("DOMContentLoaded", async () => {
  if (!token) {
    window.location.replace("login.html");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/user/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Session expired");

    currentUser = await res.json();
    saveUserToLocal(currentUser);
    renderDashboard(currentUser);
  } catch (err) {
    console.warn("Backend unavailable, using localStorage fallback:", err);

    const localData = JSON.parse(localStorage.getItem("user"));
    if (localData) {
      currentUser = localData;
      renderDashboard(currentUser);
    } else {
      localStorage.clear();
      window.location.replace("login.html");
    }
  }
});

// qr generator function
function openQRGenerator() {
  const user = JSON.parse(localStorage.getItem("user"));

  // Safety check
  if (!user || user.role !== "producer") {
    Swal.fire(
      "Access denied ❌",
      "Only producers can generate QR codes",
      "error",
    );
    return;
  }

  // Redirect to QR Generator page
  window.location.href = "QrGenerator.html";
}


// ----------------------
// Save user locally
// ----------------------
function saveUserToLocal(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

// ----------------------
// Render dashboard
// ----------------------
function renderDashboard(user) {
  document.getElementById("user-name").textContent = user.name || "User";
  document.getElementById("user-mobile").textContent = user.mobile || "";

  const roleText = capitalize(user.role);
  const badge = document.getElementById("user-role-badge");
  badge.textContent = roleText;
  badge.className = `badge badge-${getRoleColor(user.role)}`;

  document.getElementById("current-role").textContent = roleText;
  document.getElementById("user-description").textContent =
    user.description || "Verified member.";

  // Prefill profile form
  const fields = {
    "edit-name": user.name || "",
    "edit-email": user.email || "",
    "edit-mobile": user.additionalMobile || "",
    "edit-address": user.address || "",
    "edit-business": user.businessName || "",
    "edit-tax": user.taxId || "",
    "edit-description": user.description || "",
    "edit-dob": user.dateOfBirth
      ? new Date(user.dateOfBirth).toISOString().split("T")[0]
      : "",
    "edit-additional-info": user.additionalInfo || "",
  };

  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  // Hide business fields for customers
  ["edit-business", "edit-tax"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.closest(".form-control").classList.toggle(
      "hidden",
      user.role === "customer",
    );
  });

  setupRoleBasedAccess(user.role);
  setupLogout();

  if (user.role === "producer") setupQRGenerator();
}

// ----------------------
// Update profile
// ----------------------
async function updateUserProfile() {
  const payload = {
    name: document.getElementById("edit-name").value.trim(),
    email: document.getElementById("edit-email")?.value.trim(),
    additionalMobile: document.getElementById("edit-mobile")?.value.trim(),
    address: document.getElementById("edit-address")?.value.trim(),
    businessName: document.getElementById("edit-business")?.value.trim(),
    taxId: document.getElementById("edit-tax")?.value.trim(),
    description: document.getElementById("edit-description")?.value.trim(),
    dateOfBirth: document.getElementById("edit-dob")?.value || null,
    additionalInfo: document
      .getElementById("edit-additional-info")
      ?.value.trim(),
  };

  // Validation
  if (payload.additionalMobile && !/^01\d{9}$/.test(payload.additionalMobile)) {
    Swal.fire(
      "Invalid mobile ❌",
      "Must be 11 digits starting with 01",
      "error",
    );
    return;
  }

  if (payload.email && !/\S+@\S+\.\S+/.test(payload.email)) {
    Swal.fire("Invalid email ❌", "Enter a valid email address", "error");
    return;
  }

  const submitBtn = document.querySelector("#profile-modal .btn.btn-emerald");
  submitBtn.disabled = true;
  submitBtn.innerHTML = "Updating...";

  try {
    const res = await fetch("http://localhost:3000/api/user/update-profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Update failed");

    const data = await res.json();
    currentUser = data.user;
    saveUserToLocal(currentUser);
    renderDashboard(currentUser);
    document.getElementById("profile-modal")?.close();

    Swal.fire("Updated ✅", "Profile saved successfully", "success");
  } catch (err) {
    console.warn("Offline update, saving locally:", err);
    currentUser = { ...currentUser, ...payload };
    saveUserToLocal(currentUser);
    renderDashboard(currentUser);

    Swal.fire(
      "Offline ⚠️",
      "Saved locally. Will sync when backend is online.",
      "info",
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Save";
  }
}

// ----------------------
// Role helpers
// ----------------------
function getRoleColor(role) {
  return (
    {
      customer: "emerald",
      shopkeeper: "blue",
      distributor: "purple",
      producer: "orange",
      admin: "red",
    }[role] || "emerald"
  );
}

function setupRoleBasedAccess(role) {
  const hierarchy = {
    producer: ["producer", "distributor", "shopkeeper", "customer"],
    distributor: ["distributor", "shopkeeper", "customer"],
    shopkeeper: ["shopkeeper", "customer"],
    customer: ["customer"],
  };

  const allowed = hierarchy[role] || ["customer"];

  document
    .querySelectorAll(".role-btn")
    .forEach((btn) => btn.classList.add("hidden"));

  allowed.forEach((r) =>
    document.getElementById(`role-${r}`)?.classList.remove("hidden"),
  );

  document
    .querySelectorAll('[id$="-dashboard"]')
    .forEach((d) => d.classList.add("hidden"));

  document.getElementById(`${role}-dashboard`)?.classList.remove("hidden");
}

// ----------------------
// Logout (FINAL FIX)
// ----------------------
function setupLogout() {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.onclick = () => {
      localStorage.clear();
      window.location.replace("login.html");
    };
  });
}

// ----------------------
// Utils
// ----------------------
function openProfileModal() {
  document.getElementById("profile-modal")?.showModal();
}

function setupQRGenerator() {
  console.log("QR generator enabled for producers");
}

function capitalize(str = "") {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
