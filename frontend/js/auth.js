document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("login-error");
      errorEl.textContent = "";
      const email = document.getElementById("email").value.trim().toLowerCase();
      const password = document.getElementById("password").value;
      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const tourists = await AB.listTable("tourists");
        const user = tourists.find((t) => (t.email || "").toLowerCase() === email);
        if (!user || !AB.passwordMatches(user, password)) {
          throw new Error("Those credentials do not open the garden gate.");
        }
        AB.setSession(user);
        location.href = user.role === "admin" ? "admin.html" : "dashboard.html";
      } catch (err) {
        errorEl.textContent = err.message || "Login failed";
      } finally {
        btn.disabled = false;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("register-error");
      errorEl.textContent = "";
      const btn = registerForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      const body = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        passwordHash: "demo:" + document.getElementById("password").value,
        phone: document.getElementById("phone").value.trim(),
        nationality: document.getElementById("nationality").value.trim(),
        idNumber: document.getElementById("idNumber").value.trim(),
        emergencyName: document.getElementById("emergencyName").value.trim(),
        emergencyPhone: document.getElementById("emergencyPhone").value.trim(),
        role: "tourist",
        status: "active",
        digitalIdHash: AB.digitalHash(),
        lat: 35.0116,
        lng: 135.7681,
        tracking: false,
      };
      try {
        const existing = await AB.listTable("tourists");
        if (existing.some((t) => (t.email || "").toLowerCase() === body.email)) {
          throw new Error("This email already holds a Digital Tourist ID.");
        }
        let created;
        try {
          created = await AB.createRow("tourists", body);
        } catch {
          created = { ...body, id: "local-" + Date.now() };
        }
        AB.setSession(created);
        location.href = "dashboard.html";
      } catch (err) {
        errorEl.textContent = err.message || "Registration failed";
      } finally {
        btn.disabled = false;
      }
    });
  }
});
