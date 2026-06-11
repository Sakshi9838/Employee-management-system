(function () {
  const toggleButton = document.getElementById('theme-toggle');
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      if (toggleButton) toggleButton.textContent = 'Light Mode';
    } else {
      document.body.classList.remove('dark-mode');
      if (toggleButton) toggleButton.textContent = 'Dark Mode';
    }
  };

  const savedTheme = localStorage.getItem('ems-theme');
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
      localStorage.setItem('ems-theme', nextTheme);
      applyTheme(nextTheme);
    });
  }
})();
