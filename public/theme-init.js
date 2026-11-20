// Runs before first paint so dark mode doesn't flash. Kept as a file (not inline) so the CSP can stay strict.
try {
  var t = localStorage.getItem('pw-theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
} catch (e) {}
