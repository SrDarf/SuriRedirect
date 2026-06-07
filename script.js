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
  ['#0f0c29', '#302b63'],
  ['#141e30', '#243b55'],
  ['#667eea', '#764ba2'],
  ['#4b6cb7', '#182848'],
  ['#134e5e', '#71b280'],
  ['#43cea2', '#185a9d'],
  ['#8360c3', '#2ebf91'],
  ['#005c97', '#363795'],
  ['#b91d73', '#f953c6'],
  ['#6a0572', '#c62a88'],
  ['#7b241c', '#c0392b'],
  ['#c0392b', '#e67e22'],
  ['#1a6b3a', '#27ae60'],
  ['#0b3d91', '#1a73e8'],
  ['#2c3e50', '#3498db'],
  ['#4a0e8f', '#7b1fa2'],
  ['#1a1a2e', '#e94560'],
  ['#0d3349', '#1a8a9f'],
  ['#3d1c32', '#986868'],
  ['#1b4332', '#52b788'],
];

{
  const saved = parseInt(localStorage.getItem('themeIndex') ?? '-1', 10);
  if (saved >= 0 && saved < themes.length) applyTheme(saved);
}

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
  document.getElementById('authScreen').style.opacity = '';
  document.getElementById('authScreen').style.transform = '';
  document.getElementById('appShell').classList.remove('visible');
  document.getElementById('sharedScreen').classList.remove('visible');
  document.body.classList.remove('app-visible');
}

function showAppShell() {
  const auth = document.getElementById('authScreen');
  const app  = document.getElementById('appShell');
  const shared = document.getElementById('sharedScreen');

  shared.classList.remove('visible');

  auth.classList.add('screen-exit');
  app.classList.add('visible', 'screen-enter');
  document.body.classList.add('app-visible');

  setTimeout(() => {
    auth.style.display = 'none';
    auth.classList.remove('screen-exit');
  }, 340);

  setTimeout(() => app.classList.remove('screen-enter'), 420);
}

function showSharedScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').classList.remove('visible');
  document.getElementById('sharedScreen').classList.add('visible');
  document.body.classList.remove('app-visible');
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
  }, { merge: true }).then(() => shareCode);
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

['emailInput', 'passwordInput'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('authButton').click();
  });
});

document.getElementById('authToggleLink').addEventListener('click', (e) => {
  e.preventDefault();
  swapAuthSides();
});

function swapAuthSides() {
  const screen = document.getElementById('authScreen');
  if (screen.dataset.swapping) return;
  screen.dataset.swapping = '1';

  const left  = screen.querySelector('.auth-split-left');
  const right = screen.querySelector('.auth-split-right');

  const sRect = screen.getBoundingClientRect();
  const lRect = left.getBoundingClientRect();
  const rRect = right.getBoundingClientRect();

  const DURATION = 680;
  const EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';

  [{ el: left, rect: lRect }, { el: right, rect: rRect }].forEach(({ el, rect }) => {
    el.style.position = 'absolute';
    el.style.top      = '0';
    el.style.left     = (rect.left - sRect.left) + 'px';
    el.style.width    = rect.width + 'px';
    el.style.height   = '100%';
    el.style.margin   = '0';
    el.classList.add('auth-swapping-panel');
  });

  screen.offsetHeight;

  const [panelAtZero, panelAtFar] =
    (lRect.left - sRect.left) < 1 ? [left, right] : [right, left];
  const zeroWidth = (panelAtZero === left ? lRect : rRect).width;

  left.style.transition  = `left ${DURATION}ms ${EASE}`;
  right.style.transition = `left ${DURATION}ms ${EASE}`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panelAtZero.style.left = (sRect.width - zeroWidth) + 'px';
      panelAtFar.style.left  = '0px';
    });
  });

  setTimeout(() => {
    isSignUp = !isSignUp;
    const btn = document.getElementById('authButton');
    const toggleEl = document.getElementById('authToggle');
    const toggleLink = document.getElementById('authToggleLink');
    const hl  = document.querySelector('.auth-headline');
    const sub = document.querySelector('.auth-subline');
    btn.textContent = isSignUp ? 'Criar conta' : 'Entrar';
    toggleEl.childNodes[0].textContent = isSignUp ? 'Já tem uma conta? ' : 'Não tem uma conta? ';
    toggleLink.textContent = isSignUp ? 'Entrar' : 'Criar conta';
    if (hl)  hl.innerHTML  = isSignUp ? 'Crie sua<br>conta.' : 'Bem-vindo<br>de volta.';
    if (sub) sub.innerHTML = isSignUp ? 'Rápido<br>e gratuito.' : 'Seus links,<br>sua identidade.';

    const avatar = document.querySelector('.deco-avatar');
    const decoName = document.querySelector('.deco-name');
    const decoBio = document.querySelector('.deco-bio');
    const shareVal = document.querySelector('.deco-share-value');
    const linkRows = document.querySelectorAll('.deco-link-row');

    if (isSignUp) {
      if (avatar)   avatar.textContent = '?';
      if (decoName) decoName.textContent = '@você';
      if (decoBio)  decoBio.textContent = 'Crie seu perfil único';
      if (shareVal) shareVal.textContent = '------';
      if (linkRows[0]) {
        linkRows[0].querySelector('.deco-link-icon').innerHTML = '<i class="fa-brands fa-youtube"></i>';
        linkRows[0].querySelector('.deco-link-icon').style.color = '#ff0000';
        linkRows[0].querySelector('.deco-link-title').textContent = 'YouTube';
        linkRows[0].querySelector('.deco-link-url').textContent = 'youtube.com/@você';
        linkRows[0].querySelector('.deco-clicks').innerHTML = '0 <i class="fa-solid fa-arrow-trend-up"></i>';
      }
      if (linkRows[1]) {
        linkRows[1].querySelector('.deco-link-icon').innerHTML = '<i class="fa-brands fa-twitter"></i>';
        linkRows[1].querySelector('.deco-link-icon').style.color = '#1da1f2';
        linkRows[1].querySelector('.deco-link-title').textContent = 'Twitter / X';
        linkRows[1].querySelector('.deco-link-url').textContent = '@você';
        linkRows[1].querySelector('.deco-clicks').innerHTML = '0';
      }
    } else {
      if (avatar)   avatar.textContent = 'S';
      if (decoName) decoName.textContent = '@suri';
      if (decoBio)  decoBio.textContent = 'Dev · Design · Café';
      if (shareVal) shareVal.textContent = 'XYZ123';
      if (linkRows[0]) {
        linkRows[0].querySelector('.deco-link-icon').innerHTML = '<i class="fa-brands fa-github"></i>';
        linkRows[0].querySelector('.deco-link-icon').style.color = '';
        linkRows[0].querySelector('.deco-link-title').textContent = 'GitHub';
        linkRows[0].querySelector('.deco-link-url').textContent = 'github.com/srdarf';
        linkRows[0].querySelector('.deco-clicks').innerHTML = '47 <i class="fa-solid fa-arrow-trend-up"></i>';
      }
      if (linkRows[1]) {
        linkRows[1].querySelector('.deco-link-icon').style.color = '#e1306c';
        linkRows[1].querySelector('.deco-link-url').textContent = '';
        linkRows[1].querySelector('.deco-clicks').innerHTML = '12';
      }
    }
  }, DURATION / 2);

  setTimeout(() => {
    const clear = ['position', 'top', 'left', 'width', 'height', 'margin', 'transition'];
    [left, right].forEach(el => {
      clear.forEach(p => (el.style[p] = ''));
      el.classList.remove('auth-swapping-panel');
    });
    screen.classList.toggle('auth-sides-swapped');
    delete screen.dataset.swapping;
  }, DURATION + 40);
}

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
  if (!currentUser) applyTheme(-1);
});

document.getElementById('authScreen').addEventListener('click', (e) => {
  const swatch = e.target.closest('.deco-swatch[data-theme-idx]');
  if (!swatch) return;
  const idx = parseInt(swatch.dataset.themeIdx, 10);
  triggerThemeTransition(() => applyTheme(idx), idx);
  document.querySelectorAll('.deco-swatch').forEach(s => s.classList.remove('deco-swatch--active'));
  swatch.classList.add('deco-swatch--active');
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
      list.innerHTML = '';
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

function openPanel(linkId) {
  editingLinkId = linkId;
  const panel = document.getElementById('slidePanel');
  const overlay = document.getElementById('panelOverlay');
  const title = document.getElementById('panelTitle');

  document.getElementById('linkTitleInput').value = '';
  document.getElementById('linkUrlInput').value = '';
  document.getElementById('linkDescInput').value = '';
  document.getElementById('linkImageInput').value = '';

  if (linkId) {
    title.textContent = 'Editar Link';
    db.collection('links').doc(linkId).get().then(doc => {
      if (!doc.exists) return;
      const d = doc.data();
      document.getElementById('linkTitleInput').value = d.title || '';
      document.getElementById('linkUrlInput').value = d.url || '';
      document.getElementById('linkDescInput').value = d.descriptionUrl || '';
      document.getElementById('linkImageInput').value = d.imgUrl || '';
    });
  } else {
    title.textContent = 'Adicionar Link';
  }

  panel.classList.add('open');
  overlay.classList.add('visible');
}

function closePanel() {
  document.getElementById('slidePanel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('visible');
  editingLinkId = null;
}

document.getElementById('closePanel').addEventListener('click', closePanel);
document.getElementById('panelOverlay').addEventListener('click', closePanel);

document.getElementById('saveLinkBtn').addEventListener('click', async () => {
  const title = document.getElementById('linkTitleInput').value.trim();
  const url = document.getElementById('linkUrlInput').value.trim();
  const desc = document.getElementById('linkDescInput').value.trim();
  const img = document.getElementById('linkImageInput').value.trim();

  if (!title) return showToast('Título obrigatório');
  if (!url) return showToast('URL obrigatória');
  if (!isSafeUrl(url)) return showToast('URL inválida. Use http:// ou https://');
  if (img && !isSafeUrl(img)) return showToast('URL de imagem inválida');

  showLoading();
  try {
    if (editingLinkId) {
      const doc = await db.collection('links').doc(editingLinkId).get();
      if (!doc.exists || doc.data().userId !== currentUser.uid) {
        return showToast('Sem permissão');
      }
      await db.collection('links').doc(editingLinkId).update({
        title, url, descriptionUrl: desc, imgUrl: img
      });
    } else {
      const snap = await db.collection('links')
        .where('userId', '==', currentUser.uid)
        .get();
      const maxOrder = snap.docs.reduce((m, d) => Math.max(m, d.data().order || 0), 0);

      await db.collection('links').add({
        title, url, descriptionUrl: desc, imgUrl: img,
        userId: currentUser.uid,
        isPublic: true,
        order: maxOrder + 1,
        clickCount: 0
      });
    }
    const wasEditing = editingLinkId;
    closePanel();
    await renderLinks();
    showToast(wasEditing ? 'Link atualizado!' : 'Link adicionado!');
  } catch (err) {
    showToast('Erro: ' + err.message);
  } finally {
    hideLoading();
  }
});

async function deleteLink(id) {
  if (!confirm('Deletar este link?')) return;
  try {
    const doc = await db.collection('links').doc(id).get();
    if (!doc.exists || doc.data().userId !== currentUser.uid) {
      return showToast('Sem permissão');
    }
    await db.collection('links').doc(id).delete();
    await renderLinks();
    showToast('Link deletado');
  } catch (err) {
    showToast('Erro: ' + err.message);
  }
}

async function toggleLink(id, isPublic) {
  try {
    await db.collection('links').doc(id).update({ isPublic });
  } catch (err) {
    showToast('Erro ao atualizar: ' + err.message);
    await renderLinks();
  }
}

function initDragAndDrop() {
  const list = document.getElementById('linkList');
  const cards = list.querySelectorAll('.link-card');

  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
  });
}

function handleDragStart(e) {
  dragSrcEl = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this !== dragSrcEl) this.classList.add('drag-over');
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  if (this === dragSrcEl) return;

  this.classList.remove('drag-over');
  const list = document.getElementById('linkList');
  const cards = [...list.querySelectorAll('.link-card')];
  const srcIdx = cards.indexOf(dragSrcEl);
  const dstIdx = cards.indexOf(this);

  if (srcIdx < dstIdx) {
    list.insertBefore(dragSrcEl, this.nextSibling);
  } else {
    list.insertBefore(dragSrcEl, this);
  }

  saveOrder();
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.link-card').forEach(c => c.classList.remove('drag-over'));
  dragSrcEl = null;
}

async function saveOrder() {
  const cards = document.querySelectorAll('#linkList .link-card');
  const batch = db.batch();
  cards.forEach((card, i) => {
    const ref = db.collection('links').doc(card.dataset.id);
    batch.update(ref, { order: i + 1 });
  });
  try {
    await batch.commit();
  } catch (err) {
    showToast('Erro ao salvar ordem');
  }
}

async function loadSettings() {
  if (!currentUser) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const data = doc.data() || {};
    document.getElementById('settingsUsername').value = data.username || '';
    document.getElementById('settingsPhotoUrl').value = data.photoUrl || '';
    document.getElementById('settingsBio').value = data.bio || '';
    updateBioCount(data.bio || '');
  } catch (err) {
    showToast('Erro ao carregar configurações');
  }
}

function updateBioCount(val) {
  document.getElementById('bioCharCount').textContent = `${val.length}/160`;
}

document.getElementById('settingsBio').addEventListener('input', (e) => {
  updateBioCount(e.target.value);
});

document.getElementById('settingsThemeBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const picker = document.getElementById('themePicker');
  if (picker.classList.contains('open')) { closeThemePicker(); return; }
  renderThemePicker();
  const rect = e.currentTarget.getBoundingClientRect();
  picker.style.left = rect.left + 'px';
  picker.style.top = (rect.bottom + 8) + 'px';
  picker.style.bottom = 'auto';
  picker.classList.add('open');
});

document.getElementById('saveSettings').addEventListener('click', async () => {
  const username = document.getElementById('settingsUsername').value.trim();
  const photoUrl = document.getElementById('settingsPhotoUrl').value.trim();
  const bio = document.getElementById('settingsBio').value.trim();

  if (username.length < 3) return showToast('Usuário: mínimo 3 caracteres');
  if (photoUrl && !isSafeUrl(photoUrl)) return showToast('URL de foto inválida');
  if (bio.length > 160) return showToast('Bio: máximo 160 caracteres');

  showLoading();
  try {
    await db.collection('users').doc(currentUser.uid).update({ username, photoUrl, bio });
    await loadSidebar();
    showToast('Salvo!');
  } catch (err) {
    showToast('Erro: ' + err.message);
  } finally {
    hideLoading();
  }
});

function renderThemePicker() {
  const grid = document.getElementById('themeGrid');
  grid.innerHTML = '';
  themes.forEach((pair, i) => {
    const swatch = document.createElement('button');
    swatch.className = 'theme-swatch' + (i === currentThemeIndex ? ' active' : '');
    swatch.style.background = `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
    swatch.title = `Tema ${i + 1}`;
    swatch.addEventListener('click', () => selectTheme(i));
    grid.appendChild(swatch);
  });
}

function applyTheme(index) {
  const sidebar = document.getElementById('sidebar');
  const root = document.documentElement;
  currentThemeIndex = index;
  if (index === -1) {
    document.body.style.background = '';
    document.body.style.backgroundAttachment = '';
    document.body.classList.remove('theme-active');
    sidebar.style.background = '';
    root.style.removeProperty('--auth-left-bg');
    root.style.removeProperty('--auth-orb1');
    root.style.removeProperty('--auth-orb2');
  } else {
    const [c1, c2] = themes[index];
    document.body.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
    document.body.style.backgroundAttachment = 'fixed';
    document.body.classList.add('theme-active');
    sidebar.style.background = 'rgba(0,0,0,0.35)';
    root.style.setProperty('--auth-left-bg', `linear-gradient(155deg, ${c1}38 0%, ${c2}47 100%)`);
    root.style.setProperty('--auth-orb1', `${c1}4d`);
    root.style.setProperty('--auth-orb2', `${c2}40`);
    const r = parseInt(c1.slice(1,3), 16);
    const g = parseInt(c1.slice(3,5), 16);
    const b = parseInt(c1.slice(5,7), 16);
    root.style.setProperty('--theme-rgb', `${r}, ${g}, ${b}`);
  }
  localStorage.setItem('themeIndex', index);
  document.querySelectorAll('.theme-swatch').forEach((s, i) => {
    s.classList.toggle('active', i === index);
  });
}

function triggerThemeTransition(applyFn, index) {
  const bg = (index >= 0 && index < themes.length) ? themes[index][0] : 'rgba(255,255,255,0.15)';
  const el = document.createElement('div');
  el.className = 'theme-wipe-anim';
  el.style.cssText = `position:fixed;top:-20%;left:-20%;width:140%;height:140%;background:${bg};opacity:0.75;z-index:9998;pointer-events:none;`;
  document.body.appendChild(el);
  setTimeout(() => applyFn(), 340);
  setTimeout(() => el.remove(), 800);
}

async function selectTheme(index) {
  triggerThemeTransition(() => applyTheme(index), index);
  closeThemePicker();
  if (currentUser) {
    try {
      await db.collection('users').doc(currentUser.uid).update({ themeIndex: index });
    } catch (err) {
      showToast('Erro ao salvar tema');
    }
  }
}

async function loadTheme() {
  if (!currentUser) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const idx = doc.data()?.themeIndex ?? -1;
    applyTheme(idx);
  } catch (_) {}
}

function openThemePicker() {
  renderThemePicker();
  const picker = document.getElementById('themePicker');
  const btn = document.getElementById('themePickerBtn');
  const rect = btn.getBoundingClientRect();
  picker.style.left = rect.left + 'px';
  picker.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
  picker.style.top = 'auto';
  picker.classList.add('open');
}

function closeThemePicker() {
  document.getElementById('themePicker').classList.remove('open');
}

document.getElementById('themePickerBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const picker = document.getElementById('themePicker');
  picker.classList.contains('open') ? closeThemePicker() : openThemePicker();
});

document.getElementById('resetTheme').addEventListener('click', () => selectTheme(-1));

document.addEventListener('click', (e) => {
  const picker = document.getElementById('themePicker');
  if (picker.classList.contains('open') && !picker.contains(e.target) && e.target.id !== 'themePickerBtn') {
    closeThemePicker();
  }
});

async function loadPreview() {
  if (!currentUser) return;
  const container = document.getElementById('previewContainer');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando...</p>';

  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data() || {};

    const linksSnap = await db.collection('links')
      .where('userId', '==', currentUser.uid)
      .where('isPublic', '==', true)
      .get();

    const links = linksSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    container.innerHTML = '';
    container.appendChild(buildPublicContent(userData, links));
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text-secondary)">Erro ao carregar preview</p>';
  }
}

function buildPublicContent(userData, links) {
  const headerEl = document.getElementById('sharedHeader');
  const listEl   = document.getElementById('sharedLinkList');
  headerEl.innerHTML = '';
  listEl.innerHTML   = '';

  let avatarHtml;
  if (userData.photoUrl && isSafeUrl(userData.photoUrl)) {
    avatarHtml = `<img src="${escHtml(userData.photoUrl)}" alt="" class="shared-avatar" onerror="this.outerHTML='<div class=\\'shared-avatar-fallback\\'>${escHtml((userData.username||'?')[0])}</div>'">`;
  } else {
    avatarHtml = `<div class="shared-avatar-fallback">${escHtml((userData.username || '?')[0])}</div>`;
  }
  headerEl.innerHTML = `
    ${avatarHtml}
    <div class="shared-username">${escHtml(userData.username || 'Usuário')}</div>
    ${userData.bio ? `<div class="shared-bio">${escHtml(userData.bio)}</div>` : ''}
  `;

  if (links.length === 0) {
    listEl.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:1rem 0">Nenhum link público</p>';
    return;
  }

  const rng = (min, max) => Math.random() * (max - min) + min;

  links.forEach((link, i) => {
    const btn = document.createElement('button');
    btn.className = 'public-link-card';

    let thumbHtml;
    if (link.imgUrl && isSafeUrl(link.imgUrl)) {
      thumbHtml = `<img src="${escHtml(link.imgUrl)}" alt="" class="public-thumb" onerror="this.outerHTML='<div class=\\'public-thumb-placeholder\\'><i class=\\'fa-solid fa-link\\'></i></div>'">`;
    } else {
      thumbHtml = `<div class="public-thumb-placeholder"><i class="fa-solid fa-link"></i></div>`;
    }

    btn.innerHTML = `
      ${thumbHtml}
      <div class="public-link-info">
        <div class="public-link-title">${escHtml(link.title || '')}</div>
        ${link.descriptionUrl ? `<div class="public-link-desc">${escHtml(link.descriptionUrl)}</div>` : ''}
      </div>
      <i class="fa-solid fa-arrow-up-right-from-square" style="color:var(--text-tertiary);font-size:0.75rem;flex-shrink:0"></i>
    `;

    const safeUrl = isSafeUrl(link.url) ? link.url : '#';
    btn.addEventListener('click', () => handlePublicLinkClick(link.id, safeUrl));

    const tx  = rng(-55, 55);
    const ty  = rng(-40, 40);
    const rot = rng(-9, 9);
    btn.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(0.82)`;
    btn.style.opacity   = '0';

    listEl.appendChild(btn);

    setTimeout(() => {
      btn.style.transition = 'transform 0.65s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease';
      btn.style.transform  = '';
      btn.style.opacity    = '';
      setTimeout(() => { btn.style.transition = ''; }, 700);
    }, 80 + i * 90);
  });
}

async function fetchAndDisplaySharedLinks(shareCode) {
  showSharedScreen();
  document.getElementById('sharedHeader').innerHTML =
    '<p style="color:var(--text-secondary);text-align:center">Carregando...</p>';
  document.getElementById('sharedLinkList').innerHTML = '';

  try {
    const usersSnap = await db.collection('users')
      .where('shareCode', '==', shareCode.toUpperCase())
      .get();

    if (usersSnap.empty) {
      document.getElementById('sharedHeader').innerHTML =
        '<p style="color:var(--text-secondary);text-align:center">Código inválido</p>';
      return;
    }

    const userDoc  = usersSnap.docs[0];
    const userData = userDoc.data() || {};
    const userId   = userDoc.id;

    applyTheme(userData.themeIndex ?? -1);

    const linksSnap = await db.collection('links')
      .where('userId', '==', userId)
      .where('isPublic', '==', true)
      .get();

    const links = linksSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    buildPublicContent(userData, links);

  } catch (err) {
    document.getElementById('sharedHeader').innerHTML =
      '<p style="color:var(--text-secondary);text-align:center">Erro ao carregar</p>';
  }
}

async function handlePublicLinkClick(linkId, url) {
  if (url === '#') return;
  try {
    await db.collection('links').doc(linkId).update({
      clickCount: firebase.firestore.FieldValue.increment(1)
    });
  } catch (_) {
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('mobileOverlay').classList.add('visible');
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobileOverlay').classList.remove('visible');
}

function initMobileNav() {
  document.getElementById('hamburger').addEventListener('click', openMobileSidebar);
  document.getElementById('mobileOverlay').addEventListener('click', closeMobileSidebar);
}

(function () {
  const decos = document.querySelectorAll('.deco-card');
  decos.forEach((card, i) => {
    setTimeout(() => card.classList.add('deco-visible'), 620 + i * 140);
  });

  const authScreen = document.getElementById('authScreen');
  authScreen.addEventListener('animationend', (e) => {
    if (e.animationName === 'siteReveal') authScreen.style.animation = 'none';
  }, { once: true });
})();
