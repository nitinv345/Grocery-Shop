// ═══════════════════════════════════════════════════════════
//  Glocery Shop — app.js
//  Firebase Auth (Email + Google) + Backend Integration
// ═══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─────────────────────────────────────────────
//  🔥  REPLACE with your Firebase project config
//  console.firebase.google.com → Project Settings
// ─────────────────────────────────────────────
const firebaseConfig = {
 apiKey: "AIzaSyDgBNIYDzllTYnvkIb1T6rufEE6lKIFDEM",
  authDomain: "glocery-app-cd761.firebaseapp.com",
  projectId: "glocery-app-cd761",
  storageBucket: "glocery-app-cd761.firebasestorage.app",
  messagingSenderId: "1020842841290",
  appId: "1:1020842841290:web:aceb056e848cdfce1dd033",
  measurementId: "G-688GR61G08"
};

// ── Init ──────────────────────────────────────
const app    = initializeApp(firebaseConfig);
const auth   = getAuth(app);
const gProv  = new GoogleAuthProvider();

// ── Backend base URL ──────────────────────────
// Live URL on Render
const API = "https://grocery-shop-0406.onrender.com";
window.API = API;
window.apiGet = apiGet;
window.apiPost = apiPost;

// ─────────────────────────────────────────────

//  AUTH STATE LISTENER
//  Fires on every login / logout change
// ─────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  window._currentUser = user;

  if (user) {
    // Update UI
    renderUserUI(user);
    // Sync cart from backend
    await syncCartFromBackend(user);
  } else {
    renderLoggedOutUI();
  }
});

// ─────────────────────────────────────────────
//  UI HELPERS
// ─────────────────────────────────────────────
function renderUserUI(user) {
  const name = user.displayName || user.email.split("@")[0];
  // Show user chip, hide auth buttons
  document.getElementById("authBtns").style.display = "none";
  document.getElementById("userBtns").style.display = "";
  // Populate header chip
  document.getElementById("uName").textContent   = name;
  document.getElementById("uAvatar").textContent = name[0].toUpperCase();
  // Populate dropdown
  document.getElementById("pdName").textContent  = name;
  document.getElementById("pdEmail").textContent = user.email;
  // Pre-fill profile modal
  document.getElementById("profNameInp").value = user.displayName || "";
}

function renderLoggedOutUI() {
  document.getElementById("authBtns").style.display = "";
  document.getElementById("userBtns").style.display = "none";
}

// ─────────────────────────────────────────────
//  TOKEN HELPERS
// ─────────────────────────────────────────────
async function getToken() {
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}

async function apiPost(path, body = {}) {
  const token   = await getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiGet(path) {
  const token   = await getToken();
  const headers = {};
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API + path, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─────────────────────────────────────────────
//  SIGN UP (Email + Password)
// ─────────────────────────────────────────────
window.doSignup = async () => {
  const name  = document.getElementById("suName").value.trim();
  const email = document.getElementById("suEmail").value.trim();
  const pass  = document.getElementById("suPass").value;
  clearAuthMsg();

  // Client-side validation
  if (!name)           return showAuthErr("Please enter your full name.");
  if (!email)          return showAuthErr("Please enter your email.");
  if (pass.length < 6) return showAuthErr("Password must be at least 6 characters.");

  setLoading("signupBtn", "signupBtnTxt", true);
  try {
    // 1. Create Firebase user
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    // 2. Set display name
    await updateProfile(cred.user, { displayName: name });
    // 3. Send Firebase ID token → backend → saves to MongoDB
    const token = await cred.user.getIdToken();
    await fetch(`${API}/api/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });
    showAuthOk("Account created! Welcome to Grocery Shop 🎉");
    setTimeout(() => closeModal("authModal"), 1200);
    window.toast?.("✅ Signed up successfully!");
  } catch (e) {
    showAuthErr(friendlyError(e.code));
  } finally {
    setLoading("signupBtn", "signupBtnTxt", false, "Create Account →");
  }
};

// ─────────────────────────────────────────────
//  LOGIN (Email + Password)
// ─────────────────────────────────────────────
window.doLogin = async () => {
  const email = document.getElementById("liEmail").value.trim();
  const pass  = document.getElementById("liPass").value;
  clearAuthMsg();

  if (!email) return showAuthErr("Please enter your email.");
  if (!pass)  return showAuthErr("Please enter your password.");

  setLoading("loginBtn", "loginBtnTxt", true);
  try {
    // 1. Sign in via Firebase
    const cred  = await signInWithEmailAndPassword(auth, email, pass);
    // 2. Send token to backend (creates user in MongoDB if first login)
    const token = await cred.user.getIdToken();
    await fetch(`${API}/api/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });
    closeModal("authModal");
    window.toast?.("✅ Welcome back!");
  } catch (e) {
    showAuthErr(friendlyError(e.code));
  } finally {
    setLoading("loginBtn", "loginBtnTxt", false, "Login →");
  }
};

// ─────────────────────────────────────────────
//  GOOGLE SIGN-IN
// ─────────────────────────────────────────────
window.doGoogle = async () => {
  clearAuthMsg();
  try {
    const cred  = await signInWithPopup(auth, gProv);
    const token = await cred.user.getIdToken();
    await fetch(`${API}/api/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });
    closeModal("authModal");
    window.toast?.("✅ Logged in with Google!");
  } catch (e) {
    showAuthErr(friendlyError(e.code));
  }
};

// ─────────────────────────────────────────────
//  FORGOT PASSWORD
// ─────────────────────────────────────────────
window.doForgotPw = async () => {
  const email = document.getElementById("liEmail").value.trim();
  if (!email) return showAuthErr("Enter your email above first.");
  try {
    await sendPasswordResetEmail(auth, email);
    showAuthOk("Password reset email sent! Check your inbox.");
  } catch (e) {
    showAuthErr(friendlyError(e.code));
  }
};

// ─────────────────────────────────────────────
//  SIGN OUT
// ─────────────────────────────────────────────
window.doSignOut = async () => {
  await signOut(auth);
  window._cart = {};
  if (typeof refreshAll === "function") refreshAll();
  window.closeProfMenu?.();
  window.toast?.("👋 Signed out successfully");
};

// ─────────────────────────────────────────────
//  SYNC CART FROM BACKEND
// ─────────────────────────────────────────────
async function syncCartFromBackend(user) {
  try {
    const data = await apiGet("/api/cart");
    if (data?.items?.length) {
      window._cart = {};
      data.items.forEach((i) => {
        window._cart[i.productId] = i.quantity;
      });
      if (typeof refreshAll === "function") refreshAll();
    }
  } catch (e) {
    // Backend offline — use in-memory cart only
  }
}

// ─────────────────────────────────────────────
//  PUSH CART TO BACKEND  (debounced)
// ─────────────────────────────────────────────
window.pushCartToBackend = async () => {
  if (!auth.currentUser) return;
  const items = Object.entries(window._cart || {}).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
  try {
    await apiPost("/api/cart", { items });
  } catch (e) { /* silent fail */ }
};

// ─────────────────────────────────────────────
//  PLACE ORDER → BACKEND
// ─────────────────────────────────────────────
window.placeOrder = async () => {
  if (!Object.keys(window._cart || {}).length) return;

  if (!auth.currentUser) {
    window.toast?.("⚠️ Please login to place an order");
    window.openAuthModal?.("login");
    return;
  }

  // Build order payload
  const items = Object.entries(window._cart).map(([id, qty]) => {
    // PRODUCTS is defined in the main UI script
    const p = (window.PRODUCTS || []).find((x) => x.id == id);
    return { productId: id, name: p?.n || id, price: p?.p || 0, quantity: qty };
  });
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0) + 27; // +delivery+handling

  // Get selected payment method
  const payMethod = document.querySelector('input[name="checkoutPayMethod"]:checked')?.value || 'COD';

  if (payMethod === 'ONLINE') {
    // Handled in index.html to avoid duplicate logic
    if (typeof window.placeOrder === "function") {
        return window.placeOrder(); 
    }
  }

  // COD Path
  try {
    const data    = await apiPost("/api/orders", { items, totalPrice, paymentMethod: 'COD' });
    const orderId = data.order?._id || "QC" + Date.now().toString().slice(-8);
    finaliseOrder(orderId);
  } catch (e) {
    // Backend offline → local order
    finaliseOrder("QC" + Date.now().toString().slice(-8));
  }
};

window.confirmPrePayment = async () => {
  const { items, totalPrice } = window._pendingOrderData || {};
  if (!items) return;

  try {
    const data = await apiPost("/api/orders", { 
      items, 
      totalPrice, 
      paymentMethod: 'ONLINE',
      paymentStatus: 'paid',
      transactionId: 'TXN' + Date.now()
    });
    const orderId = data.order?._id || "QC" + Date.now().toString().slice(-8);
    window.closeModal?.('payModal');
    finaliseOrder(orderId);
    window.toast?.("✅ Payment confirmed & Order placed!");
  } catch (e) {
    window.toast?.("❌ Failed to place order: " + e.message);
  }
};

function finaliseOrder(orderId) {
  document.getElementById("succOrderId").textContent = orderId;
  window._cart = {};
  if (typeof refreshAll === "function") refreshAll();
  window.openModal?.("succModal");
  // Also clear cart on backend
  window.pushCartToBackend?.();
}

window.payOrder = (orderId, amount) => {
  window._payingOrderId = orderId;
  if (document.getElementById('payModalTotal')) {
    document.getElementById('payModalTotal').textContent = `₹${amount}`;
  }
  // Hide COD option in post-delivery payment
  if (document.getElementById('payOptCod')) {
    document.getElementById('payOptCod').style.display = 'none';
  }
  if (document.getElementById('radioOnline')) {
    document.getElementById('radioOnline').checked = true;
  }
  if (document.getElementById('payUpiSim')) {
    document.getElementById('payUpiSim').classList.add('on');
  }
  window.openModal?.('payModal');
};

window.confirmPayment = async () => {
    const upiId = document.getElementById('payUpiId')?.value.trim();
    if (!upiId) return window.toast?.('⚠️ Please enter payment details');

    if (document.getElementById('paySelectView')) {
        document.getElementById('paySelectView').style.display = 'none';
    }
    if (document.getElementById('payProcessingView')) {
        document.getElementById('payProcessingView').style.display = 'flex';
    }

    try {
        const orderId = window._payingOrderId;
        const res = await apiPost(`/api/orders/${orderId}/pay`, { transactionId: 'TXN' + Date.now() });

        if (res.error) throw new Error(res.error);

        window.toast?.('✅ Payment Successful!');
        window.closeModal?.('payModal');
        if (typeof showOrdersPage === "function") showOrdersPage(); 
    } catch (e) {
        window.toast?.('❌ Payment failed: ' + e.message);
        if (document.getElementById('paySelectView')) {
            document.getElementById('paySelectView').style.display = 'block';
        }
        if (document.getElementById('payProcessingView')) {
            document.getElementById('payProcessingView').style.display = 'none';
        }
    }
};

// ─────────────────────────────────────────────
//  SAVE PROFILE
// ─────────────────────────────────────────────
window.saveProfile = async () => {
  const name = document.getElementById("profNameInp").value.trim();
  if (!name) return window.toast?.("❌ Name cannot be empty");
  try {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      await apiPost("/api/profile", {
        name,
        phone:   document.getElementById("profPhone").value,
        address: document.getElementById("profAddr").value,
      });
      renderUserUI(auth.currentUser);
    }
    window.closeModal?.("profModal");
    window.toast?.("✅ Profile updated!");
  } catch (e) {
    window.toast?.("❌ " + e.message);
  }
};

// ─────────────────────────────────────────────
//  ERROR MESSAGE HELPERS
// ─────────────────────────────────────────────
function showAuthErr(msg) {
  const el = document.getElementById("authErr");
  el.textContent = "⚠️ " + msg;
  el.classList.add("on");
}
function showAuthOk(msg) {
  const el = document.getElementById("authOk");
  el.textContent = "✅ " + msg;
  el.classList.add("on");
}
function clearAuthMsg() {
  document.getElementById("authErr").classList.remove("on");
  document.getElementById("authOk").classList.remove("on");
}

function setLoading(btnId, txtId, loading, label = "") {
  const btn = document.getElementById(btnId);
  const txt = document.getElementById(txtId);
  btn.disabled    = loading;
  txt.innerHTML   = loading
    ? '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite"></span>'
    : label;
}

// ─────────────────────────────────────────────
//  FIREBASE ERROR CODE → HUMAN MESSAGE
// ─────────────────────────────────────────────
function friendlyError(code) {
  const map = {
    "auth/email-already-in-use":    "Email already registered. Try logging in.",
    "auth/invalid-email":           "Invalid email address.",
    "auth/weak-password":           "Password too weak (min 6 characters).",
    "auth/user-not-found":          "No account found with this email.",
    "auth/wrong-password":          "Incorrect password.",
    "auth/invalid-credential":      "Invalid email or password.",
    "auth/too-many-requests":       "Too many attempts. Try again later.",
    "auth/popup-closed-by-user":    "Google sign-in was cancelled.",
    "auth/network-request-failed":  "Network error. Check your connection.",
    "auth/user-disabled":           "This account has been disabled.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ─────────────────────────────────────────────
//  EXPOSE auth to window for other scripts
// ─────────────────────────────────────────────
window._auth = auth;
