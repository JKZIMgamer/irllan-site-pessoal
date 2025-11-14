
/* V5 JS: navbar circle -> expand, reveal on scroll, small utilities */

document.addEventListener('DOMContentLoaded', ()=>{

  // create nav structure if not present in HTML
  if(!document.querySelector('.nav-wrap')){
    const navWrap = document.createElement('div');
    navWrap.className = 'nav-wrap';
    navWrap.innerHTML = `
      <div class="nav-circle" id="navCircle">
        <div class="nav-inner" style="display:flex;align-items:center;width:100%;">
          <div class="brand">Irllan.dev</div>
          <div class="nav-links">
            <a href="index.html">Home</a>
            <a href="projeto.html">Projetos</a>
            <a href="comentarios.html">Comentários</a>
            <a href="sobre.html">Sobre</a>
            <a href="contato.html">Contato</a>
          </div>
          <div class="nav-actions">
            <div class="icon-btn" title="Tema">🌙</div>
            <div class="icon-btn" title="Perfil"><img src="foto-perfil.jpg" style="width:28px;height:28px;border-radius:6px;object-fit:cover" /></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(navWrap);
  }

  const circle = document.getElementById('navCircle');

  // animate from circle to expanded pill after a short delay
  setTimeout(()=>{
    circle.classList.add('expanded');
  }, 350);

  // reveal on scroll for elements with .reveal
  const rev = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting) entry.target.classList.add('show');
    });
  }, {threshold:0.15});
  rev.forEach(el=>obs.observe(el));

});
