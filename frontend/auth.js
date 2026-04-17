/* ═══════════════════════════════════════════════════
   auth.js — Authentication Logic
   ═══════════════════════════════════════════════════ */

const Auth = (() => {
  const API_URL = '/api/auth';
  let isLoginMode = true;

  const form     = document.getElementById('authForm');
  const toggle   = document.getElementById('toggleAuth');
  const title    = document.getElementById('authTitle');
  const subtitle = document.getElementById('authSubtitle');
  const footer   = document.getElementById('footerText');
  const submit   = document.getElementById('submitBtn');
  const nameGrp  = document.getElementById('nameGroup');
  const errorEl  = document.getElementById('errorMsg');

  // Initialization
  function init() {
    // If already logged in, redirect to home
    if (localStorage.getItem('insightmail_token')) {
      window.location.href = 'index.html';
      return;
    }

    toggle.addEventListener('click', toggleMode);
    form.addEventListener('submit', handleSubmit);
  }

  function toggleMode() {
    isLoginMode = !isLoginMode;
    
    title.textContent    = isLoginMode ? 'Welcome Back' : 'Get Started';
    subtitle.textContent = isLoginMode ? 'Login to access your InsightMail reports' : 'Create an account to start generating reports';
    footer.textContent   = isLoginMode ? "Don't have an account?" : "Already have an account?";
    toggle.textContent   = isLoginMode ? 'Create Account' : 'Sign In';
    submit.textContent   = isLoginMode ? 'Sign In' : 'Create Account';
    nameGrp.style.display = isLoginMode ? 'none' : 'block';
    
    errorEl.style.display = 'none';
    form.reset();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    errorEl.style.display = 'none';
    submit.disabled = true;
    submit.textContent = 'Processing…';

    const email    = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const name     = document.getElementById('nameInput').value;

    const endpoint = isLoginMode ? `${API_URL}/login` : `${API_URL}/signup`;
    const payload  = isLoginMode ? { email, password } : { name, email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Store token and user data
      localStorage.setItem('insightmail_token', data.token);
      localStorage.setItem('insightmail_user', JSON.stringify(data.user));
      
      // Redirect to main app
      window.location.href = 'index.html';

    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      submit.disabled = false;
      submit.textContent = isLoginMode ? 'Sign In' : 'Create Account';
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Auth.init);
