  const tabButtons = document.querySelectorAll('.opt-btn');
  const tabContents = document.querySelectorAll('.opt');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    // Adiciona active 
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});