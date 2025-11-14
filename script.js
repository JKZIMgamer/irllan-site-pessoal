// ------------------- Supabase config (já inserido) -------------------
const SUPABASE_URL = "https://hgnoniujxekqaxushxlh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnbm9uaXVqeGVrcWF4dXNoeGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTE2MDMsImV4cCI6MjA3ODU2NzYwM30._lF-lT4BEzq7_RNbicg-kY0cMtL7fxAsctsXh_DFQKo";
// init supabase
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- shared DOM elements (present on all pages) ----
const authBtn = document.getElementById('authBtn');
const profileBtn = document.getElementById('profileBtn');
const navAvatar = document.getElementById('navAvatar');
const themeToggle = document.getElementById('themeToggle');

let currentUser = null;

// Theme toggle
themeToggle?.addEventListener('click', () => {
  const root = document.documentElement;
  const bg = getComputedStyle(root).getPropertyValue('--bg');
  if(root.dataset.dark === "false"){
    root.dataset.dark = "true";
    root.style.setProperty('--bg','linear-gradient(180deg,#ffffff 0%, #f5f7fb 100%)');
    root.style.setProperty('--text','#061220');
  } else {
    root.dataset.dark = "false";
    root.style.setProperty('--bg','linear-gradient(180deg,#07102b 0%, #0e1530 100%)');
    root.style.setProperty('--text','#f5f7fb');
  }
});

// Auth button
authBtn?.addEventListener('click', async () => {
  if(!currentUser){
    // start Google auth
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  } else {
    await supabase.auth.signOut();
    location.reload();
  }
});

// Update UI on auth state change
supabase.auth.onAuthStateChange((event, session) => {
  if(session?.user){
    currentUser = session.user;
    authBtn.textContent = 'Sair';
    const avatar = session.user.user_metadata?.avatar_url || 'foto-perfil.jpg';
    navAvatar.src = avatar;
  } else {
    currentUser = null;
    authBtn.textContent = 'Entrar';
    navAvatar.src = 'foto-perfil.jpg';
  }
});

// ---------------- PAGE-SPECIFIC LOGIC ----------------

// Helper: fetch projects and render cards (index.html)
async function loadProjects(){
  const grid = document.getElementById('projectsGrid');
  if(!grid) return;
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if(error){ console.error(error); grid.innerHTML = '<p class="muted">Erro ao carregar projetos.</p>'; return; }
  grid.innerHTML = '';
  data.forEach(p => grid.appendChild(projectCard(p)));
}

// create project card element
function projectCard(p){
  const div = document.createElement('div'); div.className = 'card';
  const thumb = document.createElement('div'); thumb.className = 'thumb';
  thumb.style.backgroundImage = `url('${p.banner_url || 'https://via.placeholder.com/800x400?text=No+Banner'}')`;
  const h4 = document.createElement('h4'); h4.textContent = p.name;
  const pdesc = document.createElement('p'); pdesc.textContent = p.short || (p.content ? p.content.substring(0,120)+'...' : '');
  const meta = document.createElement('div'); meta.className = 'meta';
  const open = document.createElement('a'); open.href = `projeto.html?id=${p.id}`; open.textContent = 'Abrir'; open.className = 'btn ghost';
  const visit = document.createElement('a'); visit.href = p.url || '#'; visit.textContent = 'Visitar'; visit.className = 'btn ghost'; visit.target='_blank';
  meta.appendChild(open); meta.appendChild(visit);
  div.appendChild(thumb); div.appendChild(h4); div.appendChild(pdesc); div.appendChild(meta);
  return div;
}

// ---------------- project page logic ----------------
async function loadProjectPage(){
  const elId = new URLSearchParams(location.search).get('id');
  if(!elId) return;
  // fetch project
  const { data, error } = await supabase.from('projects').select('*').eq('id', elId).limit(1).maybeSingle();
  if(error || !data){ console.error(error); return; }
  document.getElementById('projTitle').textContent = data.name;
  document.getElementById('projShort').textContent = data.short || '';
  document.getElementById('projContent').innerHTML = (data.content || '').replace(/\n/g, '<br/>');
  document.getElementById('projOpen').href = data.url || '#';
  document.getElementById('projBanner').style.backgroundImage = `url('${data.banner_url || 'https://via.placeholder.com/1200x600?text=No+Banner'}')`;

  // load comments for this project
  loadCommentsForProject(elId);

  // comment modal controls
  const openComment = document.getElementById('openComment');
  const commentModal = document.getElementById('commentModal');
  const closeCommentModal = document.getElementById('closeCommentModal');
  const sendComment = document.getElementById('sendComment');
  const commentText = document.getElementById('commentText');
  const commentStatus = document.getElementById('commentStatus');

  openComment?.addEventListener('click', () => {
    if(!currentUser){ alert('Você precisa entrar para comentar.'); return; }
    commentModal.classList.remove('hidden');
    commentText.value = '';
    commentStatus.textContent = '';
  });
  closeCommentModal?.addEventListener('click', () => commentModal.classList.add('hidden'));

  sendComment?.addEventListener('click', async () => {
    if(!currentUser){ commentStatus.textContent = 'Você precisa entrar.'; return; }
    const text = commentText.value.trim();
    if(!text){ commentStatus.textContent = 'Escreva algo.'; return; }
    commentStatus.textContent = 'Enviando...'; sendComment.disabled = true;
    try {
      const { error } = await supabase.from('comments').insert([{
        project_id: parseInt(elId),
        user_id: currentUser.id,
        username: currentUser.user_metadata?.full_name || currentUser.email,
        avatar_url: currentUser.user_metadata?.avatar_url || null,
        content: text
      }]);
      if(error) throw error;
      commentStatus.textContent = 'Enviado!';
      setTimeout(()=> commentModal.classList.add('hidden'), 700);
    } catch(err){
      console.error(err); commentStatus.textContent = 'Erro ao enviar.';
    } finally { sendComment.disabled = false; }
  });
}

// load comments for project
async function loadCommentsForProject(projectId){
  const list = document.getElementById('projectComments');
  if(!list) return;
  const { data, error } = await supabase.from('comments').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(200);
  if(error){ console.error(error); list.innerHTML = '<p class="muted">Erro ao carregar comentários.</p>'; return; }
  list.innerHTML = '';
  data.forEach(c => {
    const el = document.createElement('div'); el.className='comment';
    const img = document.createElement('img'); img.src = c.avatar_url || 'foto-perfil.jpg';
    const body = document.createElement('div');
    const who = document.createElement('strong'); who.textContent = c.username || 'Usuário';
    const when = document.createElement('div'); when.className = 'muted small'; when.textContent = new Date(c.created_at).toLocaleString();
    const cont = document.createElement('div'); cont.textContent = c.content;
    body.appendChild(who); body.appendChild(when); body.appendChild(cont);
    el.appendChild(img); el.appendChild(body);
    list.appendChild(el);
  });
}

// ---------------- comments page logic ----------------
async function loadCommentsPage(){
  const list = document.getElementById('commentsList');
  if(!list) return;
  const { data, error } = await supabase.from('comments').select('*, projects(id,name)').order('created_at', { ascending: false }).limit(200);
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

// ---------------- realtime subscriptions ----------------
function subscribeRealtime(){
  // watch projects changes to update index
  supabase.channel('projects-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, payload => {
      loadProjects();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
      // if on project page, refresh comments for that project
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      if(id && payload?.new?.project_id === Number(id)) loadCommentsForProject(id);
      // if on comments page reload global list
      if(location.pathname.endsWith('comentarios.html')) loadCommentsPage();
    })
    .subscribe();
}

// ---------------- init ----------------
(async function init(){
  // update auth UI
  const session = await supabase.auth.getSession();
  if(session?.data?.session?.user){
    currentUser = session.data.session.user;
    authBtn && (authBtn.textContent = 'Sair');
    navAvatar && (navAvatar.src = currentUser.user_metadata?.avatar_url || 'foto-perfil.jpg');
  } else {
    authBtn && (authBtn.textContent = 'Entrar');
    navAvatar && (navAvatar.src = 'foto-perfil.jpg');
  }

  // run page specific loaders
  if(document.getElementById('projectsGrid')) await loadProjects();
  if(document.querySelector('.project-page')) await loadProjectPage();
  if(document.querySelector('.comments-page')) await loadCommentsPage();

  // subscribe realtime updates
  subscribeRealtime();
})();
