// script.js

const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
const themeToggle = document.getElementById('theme-toggle');
let darkMode = true;

profileBtn.addEventListener('click', () => {
  profileMenu.classList.toggle('hidden');
  profileMenu.style.animation = profileMenu.classList.contains('hidden') ? '' : 'fadeInMenu 0.3s ease forwards';
});

themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  document.body.style.backgroundColor = darkMode ? '#0e0e0e' : '#f2f2f2';
  document.body.style.color = darkMode ? '#f2f2f2' : '#1a1a1a';
  themeToggle.textContent = darkMode ? '🌙' : '☀️';
});

document.addEventListener('click', (event) => {
  if (!profileMenu.contains(event.target) && !profileBtn.contains(event.target)) {
    profileMenu.classList.add('hidden');
  }
});