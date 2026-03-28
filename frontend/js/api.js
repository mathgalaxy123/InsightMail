// ═══════════════════════════════════════
// api.js
// All API calls to Java Spring Boot backend
// Base URL points to localhost:8080
// ═══════════════════════════════════════

const BASE_URL = "http://localhost:8080";

// ── Send Report to Backend ──
// Sends CSV file + form data to Java
// Java generates PDF and sends email
async function sendReportToBackend(
  file,
  reportTitle,
  recipientEmail,
  chartType,
  message,
) {
  try {
    let formData = new FormData();
    formData.append("file", file);
    formData.append("reportTitle", reportTitle);
    formData.append("recipientEmail", recipientEmail);
    formData.append("chartType", chartType);
    formData.append("message", message);

    let response = await fetch(BASE_URL + "/api/report/send", {
      method: "POST",
      body: formData,
    });

    let result = await response.json();

    if (response.ok) {
      return { success: true, message: result.message };
    } else {
      return {
        success: false,
        message: result.error || "Something went wrong.",
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Cannot connect to server. Is the backend running?",
    };
  }
}

// ── Fetch Report History ──
// Gets all past reports from MySQL database
async function fetchReportHistory() {
  try {
    let response = await fetch(BASE_URL + "/api/report/history");
    let data = await response.json();

    if (response.ok) {
      return { success: true, data: data };
    } else {
      return { success: false, data: [] };
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      message: "Cannot connect to server.",
    };
  }
}

// ── Delete a Report ──
async function deleteReport(reportId) {
  try {
    let response = await fetch(BASE_URL + "/api/report/" + reportId, {
      method: "DELETE",
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false };
    }
  } catch (error) {
    return { success: false };
  }
}

// ── Login ──
async function loginUser(email, password) {
  try {
    let response = await fetch(BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    });

    let result = await response.json();

    if (response.ok) {
      localStorage.setItem("token", result.token);
      localStorage.setItem("username", result.username);
      return { success: true };
    } else {
      return { success: false, message: result.error || "Login failed." };
    }
  } catch (error) {
    return {
      success: false,
      message: "Cannot connect to server.",
    };
  }
}

// ── Signup ──
async function signupUser(name, email, password) {
  try {
    let response = await fetch(BASE_URL + "/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, email: email, password: password }),
    });

    let result = await response.json();

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, message: result.error || "Signup failed." };
    }
  } catch (error) {
    return {
      success: false,
      message: "Cannot connect to server.",
    };
  }
}

// ── Logout ──
function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "login.html";
}

// ── Check if logged in ──
function isLoggedIn() {
  return localStorage.getItem("token") !== null;
}
