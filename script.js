// ------- Supabase (use suas chaves)
const SUPABASE_URL = "https://hgnoniujxekqaxushxlh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnbm9uaXVqeGVrcWF4dXNoeGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTE2MDMsImV4cCI6MjA3ODU2NzYwM30._lF-lT4BEzq7_RNbicg-kY0cMtL7fxAsctsXh_DFQKo";

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM
const authBtn = document.getElementById('authBtn');
const profileBtn = document.getElementById('profileBtn');
const navAvatar = document.getElementById('navAvatar');
const themeToggle = document.getElementById('themeToggle');

let currentUser = null;

// Theme toggle (simple)
themeToggle?.addEventListener('click', () => {
  const root = document.documentElement;
  const isDark = root.dataset.dark !== 'false';
  if(isDark){
    root.dataset.dark = 'false';
    root.style.setProperty('--bg','linear-gradient(180deg,#0b0520 0%, #0f1630 45%, #15142a 100%)');
  } else {
    root.dataset.dark = 'true';
    root.style.setProperty('--bg','linear-gradient(180deg,#f7f9ff 0%, #eef4ff 100%)');
    root.style.setProperty('--text','#061220');
  }
});

// auth
authBtn?.addEventListener('click', async () => {
  if(!currentUser){
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  } else {
    await supabase.auth.signOut();
    location.reload();
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  if(session?.user){
    currentUser = session.user;
    authBtn.textContent = 'Sair';
    navAvatar.src = session.user.user_metadata?.avatar_url || 'foto-perfil.jpg';
  } else {
    currentUser = null;
    authBtn.textContent = 'Entrar';
    navAvatar.src = 'foto-perfil.jpg';
  }
});

// --- small animation for hero mock using GSAP (if available)
window.addEventListener('load', () => {
  if(window.gsap){
    gsap.from('.title',{y:30,opacity:0,duration:0.9,delay:0.2,ease:"power3.out"});
    gsap.from('.lead',{y:18,opacity:0,duration:0.9,delay:0.35,ease:"power3.out"});
    gsap.from('.btn',{y:12,opacity:0,duration:0.9,delay:0.5,stagger:0.08});
    // mock mini tiles
    const mock = document.getElementById('mockGrid');
    if(mock){
      for(let i=0;i<4;i++){
        const m = document.createElement('div'); m.className='mini';
        m.style.backgroundImage = `linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)), url('https://picsum.photos/seed/${i+10}/600/400')`;
        mock.appendChild(m);
      }
      gsap.from('.mini',{y:8,opacity:0,duration:0.9,delay:0.7,stagger:0.08});
    }
  }
});

// --- Projects (index)
async function loadProjects(){
  const grid = document.getElementById('projectsGrid');
  if(!grid) return;
  const { data, error } = await supabase.from('projects').select('*').order('created_at',{ascending:false});
  if(error){ grid.innerHTML = '<p class="muted">Erro ao carregar projetos.</p>'; console.error(error); return; }
  grid.innerHTML = '';
  data.forEach(p => {
    const card = document.createElement('div'); card.className='card';
    const thumb = document.createElement('div'); thumb.className='thumb';
    thumb.style.backgroundImage = `url('${p.banner_url || 'https://via.placeholder.com/1200x600'}')`;
    const h4 = document.createElement('h4'); h4.textContent = p.name;
    const pdesc = document.createElement('p'); pdesc.textContent = p.short || (p.content ? p.content.substring(0,120) + '...' : '');
    const meta = document.createElement('div'); meta.className='meta';
    const open = document.createElement('a'); open.href = `projeto.html?id=${p.id}`; open.textContent = 'Abrir'; open.className='btn ghost';
    const visit = document.createElement('a'); visit.href = p.url || '#'; visit.textContent = 'Visitar'; visit.className='btn ghost'; visit.target='_blank';
    meta.appendChild(open); meta.appendChild(visit);
    card.appendChild(thumb); card.appendChild(h4); card.appendChild(pdesc); card.appendChild(meta);
    grid.appendChild(card);
  });
}

// --- Project page
async function loadProjectPage(){
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if(!id) return;
  const { data, error } = await supabase.from('projects').select('*').eq('id',id).maybeSingle();
  if(error || !data){ console.error(error); return; }
  document.getElementById('projTitle').textContent = data.name;
  document.getElementById('projShort').textContent = data.short || '';
  document.getElementById('projContent').innerHTML = (data.content || '').replace(/\n/g,'<br/>');
  document.getElementById('projOpen').href = data.url || '#';
  document.getElementById('projBanner').style.backgroundImage = `url('${data.banner_url || 'https://via.placeholder.com/1200x600'}')`;
  document.getElementById('projDate').textContent = new Date(data.created_at).toLocaleDateString();
  loadCommentsForProject(id);

  // comment handling wired in DOM (see modal buttons)
  document.getElementById('openComment')?.addEventListener('click', () => {
    if(!currentUser){ alert('Você precisa entrar para comentar.'); return; }
    document.getElementById('commentModal').classList.remove('hidden');
  });
  document.getElementById('closeCommentModal')?.addEventListener('click', () => {
    document.getElementById('commentModal').classList.add('hidden');
  });
  document.getElementById('sendComment')?.addEventListener('click', async () => {
    const el = document.getElementById('commentText');
    const text = el.value.trim();
    if(!text){ document.getElementById('commentStatus').textContent='Escreva algo.'; return; }
    document.getElementById('commentStatus').textContent='Enviando...';
    try{
      const { error } = await supabase.from('comments').insert([{
        project_id: parseInt(id),
        user_id: currentUser.id,
        username: currentUser.user_metadata?.full_name || currentUser.email,
        avatar_url: currentUser.user_metadata?.avatar_url || null,
        content: text
      }]);
      if(error) throw error;
      document.getElementById('commentStatus').textContent='Enviado!';
      setTimeout(()=>{ document.getElementById('commentModal').classList.add('hidden'); loadCommentsForProject(id); }, 600);
    }catch(err){ console.error(err); document.getElementById('commentStatus').textContent='Erro ao enviar.'; }
  });
}

// load comments for project
async function loadCommentsForProject(projectId){
  const list = document.getElementById('projectComments');
  if(!list) return;
  const { data, error } = await supabase.from('comments').select('*').eq('project_id', projectId).order('created_at',{ascending:false}).limit(200);
  if(error){ console.error(error); list.innerHTML='<p class="muted">Erro ao carregar comentários.</p>'; return; }
  list.innerHTML = '';
  data.forEach(c => {
    const el = document.createElement('div'); el.className='comment';
    const img = document.createElement('img'); img.src = c.avatar_url || 'foto-perfil.jpg';
    const body = document.createElement('div');
    const who = document.createElement('strong'); who.textContent = c.username || 'Usuário';
    const when = document.createElement('div'); when.className='muted small'; when.textContent = new Date(c.created_at).toLocaleString();
    const cont = document.createElement('div'); cont.textContent = c.content;
    body.appendChild(who); body.appendChild(when); body.appendChild(cont);
    el.appendChild(img); el.appendChild(body);
    list.appendChild(el);
  });
}

// comments page
async function loadCommentsPage(){
  const list = document.getElementById('commentsList');
  if(!list) return;
  const { data, error } = await supabase.from('comments').select('*, projects(id,name)').order('created_at',{ascending:false}).limit(200);
  if(error){ console.error(error); list.innerHTML = '<p class="muted">Erro ao carregar comentários.</p>'; return; }
  list.innerHTML = '';
  data.forEach(c => {
    const el = document.createElement('div'); el.className='comment';
    const img = document.createElement('img'); img.src = c.avatar_url || 'foto-perfil.jpg';
    const body = document.createElement('div');
    const who = document.createElement('strong'); who.textContent = c.username || 'Usuário';
    const meta = document.createElement('div'); meta.className='muted small'; meta.textContent = `${new Date(c.created_at).toLocaleString()} • Projeto: ${c.projects?.name || '—'}`;
    const cont = document.createElement('div'); cont.textContent = c.content;
    body.appendChild(who); body.appendChild(meta); body.appendChild(cont);
    el.appendChild(img); el.appendChild(body);
    list.appendChild(el);
  });
}

// realtime updates
function subscribeRealtime(){
  supabase.channel('projects-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => { loadProjects(); })
    .on('postgres_changes', { event: 'INSERT', schema:'public', table:'comments' }, payload => {
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      if(id && payload?.new?.project_id === Number(id)) loadCommentsForProject(id);
      if(location.pathname.endsWith('comentarios.html')) loadCommentsPage();
    })
    .subscribe();
}

// init
(async function init(){
  const session = await supabase.auth.getSession();
  if(session?.data?.session?.user){
    currentUser = session.data.session.user;
    authBtn && (authBtn.textContent = 'Sair');
    navAvatar && (navAvatar.src = currentUser.user_metadata?.avatar_url || 'foto-perfil.jpg');
  } else {
    authBtn && (authBtn.textContent = 'Entrar');
    navAvatar && (navAvatar.src = 'foto-perfil.jpg');
  }

  if(document.getElementById('projectsGrid')) await loadProjects();
  if(document.querySelector('.project-page')) await loadProjectPage();
  if(document.querySelector('.comments-page')) await loadCommentsPage();

  subscribeRealtime();
})();
