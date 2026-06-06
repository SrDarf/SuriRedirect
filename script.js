function isSafeUrl(raw) {
  try {
    const { protocol } = new URL(raw);
    return protocol === 'http:' || protocol === 'https:';
  } catch { return false; }
}

const firebaseConfig = {
  apiKey: "AIzaSyBPlNEf9TFPme5bdxKe4kTijGceE10hpI0",
  authDomain: "spaceshooter-80cfa.firebaseapp.com",
  projectId: "spaceshooter-80cfa",
  storageBucket: "spaceshooter-80cfa.firebasestorage.app",
  messagingSenderId: "318371743078",
  appId: "1:318371743078:web:31db6f17990f3fbf4d34a7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;
let editingLinkId = null;
let currentThemeIndex = -1;
let dragSrcEl = null;

const themes = [
  ['#232526','#414345'], ['#0f0c29','#302b63'], ['#1f4037','#99f2c8'],
  ['#0f0c29','#302b63'], ['#2c3e50','#3498db'], ['#667eea','#764ba2'],
  ['#4b6cb7','#182848'], ['#ee9ca7','#ffdde1'], ['#141e30','#243b55'],
  ['#ff7e5f','#feb47b'], ['#8360c3','#2ebf91'], ['#1a2980','#26d0ce'],
  ['#134e5e','#71b280'], ['#ff9966','#ff5e62'], ['#56ab2f','#a8e063'],
  ['#7f7fd5','#86a8e7'], ['#373b44','#4286f4'], ['#000428','#004e92'],
  ['#f953c6','#b91d73'], ['#43cea2','#185a9d']
];

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'block';
  document.getElementById('loadingSpinner').style.display = 'block';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
  document.getElementById('loadingSpinner').style.display = 'none';
}

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appShell').classList.remove('visible');
  document.getElementById('sharedScreen').classList.remove('visible');
}

function showAppShell() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').classList.add('visible');
  document.getElementById('sharedScreen').classList.remove('visible');
}

function showSharedScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').classList.remove('visible');
  document.getElementById('sharedScreen').classList.add('visible');
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById(name + 'View');
  if (view) view.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (name === 'preview') loadPreview();
  if (name === 'settings') loadSettings();
  closeMobileSidebar();
}

function generateShareCode(userId) {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const shareCode = Array.from(array, b => b.toString(36)).join('').substring(0, 6).toUpperCase();
  const shareUrl = `https://srdarf.github.io/SuriRedirect/#${shareCode}`;

  return db.collection('users').doc(userId).set({
    shareCode,
    shareUrl
  }).then(() => shareCode);
}

let isSignUp = false;

document.getElementById('authButton').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  if (!email || !password) return showToast('Preencha email e senha');

  showLoading();
  try {
    if (isSignUp) {
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
      currentUser = cred.user;
      await generateShareCode(currentUser.uid);
      openUsernameModal();
    } else {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      currentUser = cred.user;
      await onUserLoggedIn();
    }
  } catch (err) {
    const msgs = {
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/invalid-login-credentials': 'Email ou senha incorretos.',
      'auth/invalid-email': 'Email inválido.',
      'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres).',
      'auth/email-already-in-use': 'Email já cadastrado.'
    };
    showToast(msgs[err.code] || err.message);
  } finally {
    hideLoading();
  }
});

document.getElementById('authToggleLink').addEventListener('click', (e) => {
  e.preventDefault();
  isSignUp = !isSignUp;
  document.getElementById('authButton').textContent = isSignUp ? 'Registrar' : 'Entrar';
  const toggle = document.getElementById('authToggle');
  toggle.childNodes[0].textContent = isSignUp ? 'Já tem uma conta? ' : 'Não tem uma conta? ';
  document.getElementById('authToggleLink').textContent = isSignUp ? 'Entrar' : 'Criar conta';
});

document.getElementById('signOutButton').addEventListener('click', async () => {
  await firebase.auth().signOut();
  currentUser = null;
  showAuthScreen();
});

function openUsernameModal() {
  document.getElementById('usernameModal').classList.add('open');
}

function closeUsernameModal() {
  document.getElementById('usernameModal').classList.remove('open');
}

document.getElementById('setUsernameButton').addEventListener('click', async () => {
  const username = document.getElementById('usernameInput').value.trim();
  if (username.length < 3) return showToast('Mínimo 3 caracteres');
  try {
    await db.collection('users').doc(currentUser.uid).update({ username });
    closeUsernameModal();
    await onUserLoggedIn();
  } catch (err) {
    showToast('Erro ao salvar: ' + err.message);
  }
});

async function onUserLoggedIn() {
  showAppShell();
  await Promise.all([loadSidebar(), renderLinks(), loadTheme()]);
  showView('links');
  initMobileNav();
}

function initDragAndDrop() {}
function handlePublicLinkClick(id, url) { if (url !== '#') window.open(url, '_blank', 'noopener,noreferrer'); }
function loadPreview() {}
function loadSettings() {}
async function loadSidebar() {}
async function renderLinks() {}
async function loadTheme() {}
async function fetchAndDisplaySharedLinks(code) { showSharedScreen(); }
function closeMobileSidebar() {}
function initMobileNav() {}
function openPanel(id) {}

firebase.auth().onAuthStateChanged(async (user) => {
  const hash = window.location.hash.slice(1);
  if (hash) {
    await fetchAndDisplaySharedLinks(hash);
    return;
  }
  if (user) {
    currentUser = user;
    await onUserLoggedIn();
  } else {
    showAuthScreen();
  }
});

document.getElementById('viewSharedLinks').addEventListener('click', async () => {
  const code = document.getElementById('shareCodeInput').value.trim();
  if (!code) return showToast('Digite um código');
  await fetchAndDisplaySharedLinks(code);
});

document.getElementById('backToAuth').addEventListener('click', () => {
  window.location.hash = '';
  showAuthScreen();
});

async function loadSidebar() {
  if (!currentUser) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const data = doc.data() || {};

    document.getElementById('sidebarUsername').textContent = data.username || '—';

    const bioEl = document.getElementById('sidebarBio');
    bioEl.textContent = data.bio || '';

    const avatarEl = document.getElementById('sidebarAvatar');
    const fallbackEl = document.getElementById('avatarFallback');
    if (data.photoUrl && isSafeUrl(data.photoUrl)) {
      avatarEl.src = data.photoUrl;
      avatarEl.style.display = 'block';
      fallbackEl.style.display = 'none';
      avatarEl.onerror = () => {
        avatarEl.style.display = 'none';
        fallbackEl.style.display = 'flex';
        fallbackEl.textContent = (data.username || '?')[0];
      };
    } else {
      avatarEl.style.display = 'none';
      fallbackEl.style.display = 'flex';
      fallbackEl.textContent = (data.username || '?')[0];
    }

    const shareCode = data.shareCode;
    if (shareCode) {
      document.getElementById('sidebarShareCode').textContent = shareCode;
    } else {
      const code = await generateShareCode(currentUser.uid);
      document.getElementById('sidebarShareCode').textContent = code;
    }
  } catch (err) {
    showToast('Erro ao carregar perfil');
  }
}

document.getElementById('copyShareCode').addEventListener('click', () => {
  const code = document.getElementById('sidebarShareCode').textContent;
  const url = `https://srdarf.github.io/SuriRedirect/#${code}`;
  navigator.clipboard.writeText(url).then(() => showToast('Link copiado!')).catch(() => showToast('Erro ao copiar'));
});

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    if (view === 'add') {
      openPanel(null);
      closeMobileSidebar();
    } else {
      showView(view);
    }
  });
});

async function renderLinks() {
  if (!currentUser) return;
  const list = document.getElementById('linkList');
  list.innerHTML = '';

  try {
    const snap = await db.collection('links')
      .where('userId', '==', currentUser.uid)
      .orderBy('order', 'asc')
      .get();

    const docs = snap.empty ? [] : snap.docs;

    document.getElementById('linkCount').textContent = docs.length;

    docs.forEach(doc => {
      const card = buildLinkCard(doc.id, doc.data());
      list.appendChild(card);
    });

    initDragAndDrop();
  } catch (err) {
    try {
      const snap2 = await db.collection('links')
        .where('userId', '==', currentUser.uid)
        .get();
      document.getElementById('linkCount').textContent = snap2.size;
      snap2.forEach(doc => {
        const card = buildLinkCard(doc.id, doc.data());
        list.appendChild(card);
      });
      initDragAndDrop();
    } catch (err2) {
      showToast('Erro ao carregar links');
    }
  }
}

function buildLinkCard(id, data) {
  const card = document.createElement('div');
  card.className = 'link-card' + (data.isPublic === false ? ' inactive' : '');
  card.dataset.id = id;
  card.draggable = true;

  let thumbHtml;
  if (data.imgUrl && isSafeUrl(data.imgUrl)) {
    thumbHtml = `<img src="${data.imgUrl}" alt="" class="link-thumb" onerror="this.outerHTML='<div class=\\'link-thumb-placeholder\\'><i class=\\'fa-solid fa-link\\'></i></div>'">`;
  } else {
    thumbHtml = `<div class="link-thumb-placeholder"><i class="fa-solid fa-link"></i></div>`;
  }

  const clicks = data.clickCount || 0;
  const clickBadge = clicks > 0 ? `<span class="click-badge">↗ ${clicks}</span>` : '';

  const safeUrl = isSafeUrl(data.url) ? data.url : '#';

  card.innerHTML = `
    <span class="drag-handle">⠿</span>
    ${thumbHtml}
    <div class="link-info">
      <div class="link-title">${escHtml(data.title || '')}</div>
      ${data.descriptionUrl ? `<div class="link-desc">${escHtml(data.descriptionUrl)}</div>` : ''}
      <div class="link-url">${escHtml(safeUrl)}</div>
    </div>
    <div class="link-meta">
      ${clickBadge}
      <label class="toggle" title="${data.isPublic === false ? 'Ativar' : 'Desativar'}">
        <input type="checkbox" ${data.isPublic !== false ? 'checked' : ''} data-id="${id}">
        <span class="toggle-track"></span>
      </label>
    </div>
    <div class="link-actions">
      <button class="icon-btn edit-btn" data-id="${id}" title="Editar">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button class="icon-btn danger delete-btn" data-id="${id}" title="Deletar">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;

  card.querySelector('input[type="checkbox"]').dataset.id = id;

  card.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
    toggleLink(id, e.target.checked);
    card.classList.toggle('inactive', !e.target.checked);
  });

  card.querySelector('.edit-btn').addEventListener('click', () => openPanel(id));
  card.querySelector('.delete-btn').addEventListener('click', () => deleteLink(id));

  return card;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
