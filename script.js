// ---- CONFIGURE AQUI ----
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";    // <-- coloca teu project url
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhnbm9uaXVqeGVrcWF4dXNoeGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTE2MDMsImV4cCI6MjA3ODU2NzYwM30._lF-lT4BEzq7_RNbicg-kY0cMtL7fxAsctsXh_DFQKo";          // <-- coloca a anon key
const STORAGE_ENABLED = true; // true = upload para Supabase Storage; false = usa apenas URL do banner
// -------------------------

// Init supabase
const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helpers DOM
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');
const modal = document.getElementById('modal');
const openAddProject = document.getElementById('openAddProject');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const submitProject = document.getElementById('submitProject');

const projectForm = document.getElementById('projectForm');
const bannerFile = document.getElementById('bannerFile');
const bannerURL = document.getElementById('bannerURL');
const projectName = document.getElementById('projectName');
const projectLink = document.getElementById('projectLink');
const formStatus = document.getElementById('formStatus');

const projectsGrid = document.getElementById('projectsGrid');
const addProjectBtn = document.getElementById('addProjectBtn');

// UI interactions
profileBtn.addEventListener('click', (e) => {
  profileMenu.classList.toggle('hidden');
});

// modal open/close
openAddProject.addEventListener('click', showModal);
addProjectBtn.addEventListener('click', showModal);
closeModal.addEventListener('click', hideModal);
cancelBtn.addEventListener('click', hideModal);

function showModal(){
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  formStatus.textContent = '';
  projectForm.reset();
}
function hideModal(){
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
}

// Utility: create project card
function createCard(item){
  const div = document.createElement('div');
  div.className = 'card';
  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  thumb.style.backgroundImage = `url('${item.banner_url || 'https://via.placeholder.com/800x400?text=No+Banner'}')`;
  const h4 = document.createElement('h4');
  h4.textContent = item.name;
  const p = document.createElement('p');
  p.textContent = item.url || '';
  if(item.url){
    const a = document.createElement('a');
    a.href = item.url;
    a.textContent = 'Abrir';
    a.target = '_blank';
    a.style.display = 'inline-block';
    a.style.marginTop = '8px';
    a.className = 'btn ghost';
    div.appendChild(thumb);
    div.appendChild(h4);
    div.appendChild(p);
    div.appendChild(a);
  } else {
    div.appendChild(thumb);
    div.appendChild(h4);
    div.appendChild(p);
  }
  return div;
}

// Load existing projects (initial)
async function loadProjects(){
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if(error) { console.error(error); return; }
    projectsGrid.innerHTML = '';
    data.forEach(it => {
      projectsGrid.appendChild(createCard(it));
    });
  } catch(err){
    console.error(err);
  }
}

// Realtime subscription (inserts)
function subscribeRealtime(){
  supabase.channel('projects-ch')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, payload => {
      // prepend new project
      const newItem = payload.new;
      projectsGrid.prepend(createCard(newItem));
    })
    .subscribe()
    .catch(e => console.warn('Realtime subscribe failed', e));
}

// Upload helper (Supabase Storage) -> returns public url
async function uploadBannerGetURL(file){
  if(!STORAGE_ENABLED) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `banners/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
  // create bucket 'public' or use default - you'll need to create a bucket named 'banners' via Supabase UI
  // here we assume bucket is 'banners' and is public
  const { data, error } = await supabase.storage
    .from('banners')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if(error){
    console.error('Storage upload error', error);
    throw error;
  }
  // get public URL
  const { data: urlData } = supabase.storage.from('banners').getPublicUrl(fileName);
  return urlData.publicUrl;
}

// Handle submit
submitProject.addEventListener('click', async () => {
  formStatus.textContent = 'Enviando...';
  submitProject.disabled = true;

  try {
    let banner_final = bannerURL.value?.trim() || null;

    // If file provided => upload if enabled, otherwise ignore
    if(bannerFile.files && bannerFile.files.length > 0){
      if(STORAGE_ENABLED){
        const publicUrl = await uploadBannerGetURL(bannerFile.files[0]);
        banner_final = publicUrl;
      } else {
        // if storage disabled but file selected, show message
        formStatus.textContent = 'Upload de arquivo desativado. Use a URL do banner ou habilite o storage.';
        submitProject.disabled = false;
        return;
      }
    }

    const nameVal = projectName.value.trim();
    const urlVal = projectLink.value.trim() || null;
    if(!nameVal){ formStatus.textContent = 'Informe o nome do projeto.'; submitProject.disabled=false; return; }

    // insert into supabase
    const { data, error } = await supabase
      .from('projects')
      .insert([{ name: nameVal, url: urlVal, banner_url: banner_final }]);

    if(error){ throw error; }

    formStatus.textContent = 'Projeto adicionado com sucesso!';
    // close modal after a short delay
    setTimeout(()=>{ hideModal(); }, 800);
  } catch(err){
    console.error(err);
    formStatus.textContent = 'Erro ao enviar. Veja o console.';
  } finally {
    submitProject.disabled = false;
  }
});

// theme toggler (simple)
const themeToggle = document.getElementById('themeToggle');
let dark = true;
themeToggle.addEventListener('click', () => {
  dark = !dark;
  if(dark){
    document.documentElement.style.setProperty('--bg','#0e0f14');
    document.documentElement.style.setProperty('--text','#e9eef7');
    themeToggle.textContent = '🌙';
  } else {
    document.documentElement.style.setProperty('--bg','#f6f8fb');
    document.documentElement.style.setProperty('--text','#0b1220');
    themeToggle.textContent = '☀️';
  }
});

// Init
(async function init(){
  // quick check keys
  if(SUPABASE_URL.includes('YOUR-PROJECT') || SUPABASE_ANON_KEY.includes('YOUR_ANON')){
    console.warn('Supabase: substitua SUPABASE_URL e SUPABASE_ANON_KEY no script.js antes de usar.');
    // still allow offline demo
    loadDemoLocal();
    return;
  }

  await loadProjects();
  subscribeRealtime();
})();

function loadDemoLocal(){
  // fallback demo content while you configure Supabase
  const demo = [
    { id:1, name:'Lzim BOT', url:'https://lzimbot.pages.dev', banner_url:'https://via.placeholder.com/800x400?text=Lzim+BOT' },
    { id:2, name:'Bolinha de Ouro', url:'#', banner_url:'https://via.placeholder.com/800x400?text=Bolinha' },
  ];
  projectsGrid.innerHTML='';
  demo.forEach(it => projectsGrid.appendChild(createCard(it)));
}
