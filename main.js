// Мобильное меню и текущий год
document.getElementById('burger').addEventListener('click', function () {
  document.getElementById('nav').classList.toggle('open');
});
document.querySelectorAll('#nav a').forEach(function (link) {
  link.addEventListener('click', function () {
    document.getElementById('nav').classList.remove('open');
  });
});
document.getElementById('year').textContent = new Date().getFullYear();
