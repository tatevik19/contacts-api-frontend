console.log("app.js loaded ✅");

const API_BASE = "http://localhost:4000";

// Tabs + Auth UI
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMsg = document.getElementById("authMsg");

// App UI
const authCard = document.getElementById("authCard");
const appCard = document.getElementById("appCard");
const logoutBtn = document.getElementById("logoutBtn");

const contactForm = document.getElementById("contactForm");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");

const listEl = document.getElementById("list");
const appMsg = document.getElementById("appMsg");

const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// Confirm modal
const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmText = document.getElementById("confirmText");
const confirmCancel = document.getElementById("confirmCancel");
const confirmOk = document.getElementById("confirmOk");

let confirmCallback = null;

function openConfirm({ title, text, okText = "Delete", onConfirm }) {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  confirmOk.textContent = okText;
  confirmCallback = onConfirm;
  confirmModal.classList.remove("hidden");
}

function closeConfirm() {
  confirmModal.classList.add("hidden");
  confirmCallback = null;
}

confirmCancel?.addEventListener("click", closeConfirm);
confirmOk?.addEventListener("click", async () => {
  try {
    if (confirmCallback) await confirmCallback();
  } finally {
    closeConfirm();
  }
});

// ----- Helpers -----
function setAuthMsg(text = "") {
  authMsg.textContent = text;
}

function setAppMsg(text = "") {
  appMsg.textContent = text;
}

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {}

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ----- Tabs -----
function showLogin() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  setAuthMsg("");
}

function showRegister() {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  setAuthMsg("");
}

tabLogin?.addEventListener("click", showLogin);
tabRegister?.addEventListener("click", showRegister);

// ----- Auth -----
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthMsg("Logging in...");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });

    const token = data.token || (data.data && data.data.token);
    if (!token) throw new Error("Token missing from response");

    setToken(token);
    loginForm.reset();
    setAuthMsg("");
    enterApp();
  } catch (err) {
    setAuthMsg(err.message || "Login failed");
  }
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAuthMsg("Creating account...");

  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const data = await api("/auth/register", {
      method: "POST",
      body: { email, password },
      auth: false,
    });

    const token = data.token || (data.data && data.data.token);
    if (token) {
      setToken(token);
      registerForm.reset();
      setAuthMsg("");
      enterApp();
    } else {
      setAuthMsg("Account created. Please login.");
      showLogin();
    }
  } catch (err) {
    setAuthMsg(err.message || "Register failed");
  }
});

logoutBtn?.addEventListener("click", () => {
  clearToken();
  exitApp();
});

// ----- Contacts CRUD -----
let contacts = [];
let editingId = null;

function startEdit(contact) {
  editingId = contact.id || contact._id;
  nameInput.value = contact.name || "";
  phoneInput.value = contact.phone || "";
  emailInput.value = contact.email || "";

  saveBtn.textContent = "Save changes";
  cancelEditBtn.classList.remove("hidden");
  setAppMsg(`Editing: ${contact.name || "contact"}`);
}

function cancelEdit() {
  editingId = null;
  contactForm.reset();
  saveBtn.textContent = "Add contact";
  cancelEditBtn.classList.add("hidden");
  setAppMsg("");
}

cancelEditBtn?.addEventListener("click", cancelEdit);

function renderContacts() {
  listEl.innerHTML = "";

  if (!contacts.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No contacts yet.";
    listEl.appendChild(empty);
    return;
  }

  contacts.forEach((c) => {
    const id = c.id || c._id;

    const item = document.createElement("div");
    item.className = "contact-item";

    const left = document.createElement("div");
    left.className = "contact-meta";
    left.innerHTML = `
      <div class="contact-name">${c.name ?? ""}</div>
      <div class="contact-sub">${c.phone ?? ""}</div>
      <div class="contact-sub">${c.email ?? ""}</div>
    `;

    const right = document.createElement("div");
    right.className = "contact-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEdit({ ...c, id }));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      openConfirm({
        title: "Delete contact?",
        text: `Are you sure you want to delete “${c.name}”? This can’t be undone.`,
        okText: "Delete",
        onConfirm: async () => {
          await api(`/contacts/${id}`, { method: "DELETE" });
          contacts = contacts.filter((x) => (x.id || x._id) !== id);
          if (editingId === id) cancelEdit();
          renderContacts();
          setAppMsg("Contact deleted.");
        },
      });
    });

    right.appendChild(editBtn);
    right.appendChild(delBtn);

    item.appendChild(left);
    item.appendChild(right);

    listEl.appendChild(item);
  });
}

async function loadContacts() {
  setAppMsg("Loading contacts...");
  try {
    const data = await api("/contacts");
    contacts = Array.isArray(data) ? data : (data.contacts || data.data || []);
    setAppMsg("");
    renderContacts();
  } catch (err) {
    setAppMsg(err.message || "Failed to load contacts");
  }
}

contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAppMsg(editingId ? "Saving changes..." : "Adding contact...");

  const payload = {
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    email: emailInput.value.trim(),
  };

  if (!payload.name) {
    setAppMsg("Name is required.");
    return;
  }

  try {
    if (editingId) {
      const data = await api(`/contacts/${editingId}`, {
        method: "PUT",
        body: payload,
      });

      const updated = data.contact || data.updated || data;
      const updatedId = (updated && (updated.id || updated._id)) || editingId;

      contacts = contacts.map((c) => {
        const cid = c.id || c._id;
        return cid === updatedId ? { ...c, ...updated, id: updatedId } : c;
      });

      cancelEdit();
      renderContacts();
      setAppMsg("Updated ✅");
    } else {
      const data = await api("/contacts", { method: "POST", body: payload });
      const created = data.contact || data.created || data;
      contacts.unshift(created);
      contactForm.reset();
      renderContacts();
      setAppMsg("Added ✅");
    }
  } catch (err) {
    setAppMsg(err.message || "Save failed");
  }
});

// ----- Enter/Exit App -----
function enterApp() {
  authCard.classList.add("hidden");
  appCard.classList.remove("hidden");
  cancelEdit();
  loadContacts();
}

function exitApp() {
  appCard.classList.add("hidden");
  authCard.classList.remove("hidden");
  cancelEdit();
  showLogin();
}

// Init
if (getToken()) enterApp();
else exitApp();
