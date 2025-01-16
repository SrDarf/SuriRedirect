function showUsernameModal() {
    document.getElementById('usernameModal').style.display = 'block';
  }
  
  function hideUsernameModal() {
    document.getElementById('usernameModal').style.display = 'none';
  }
  
  function setUsername(userId) {
      const username = document.getElementById('usernameInput').value.trim();
      if (username) {
        db.collection('users').doc(userId).update({
          username: username
        })
        .then(() => {
            changeBackgroundColor2();
            hideUsernameModal();
            setTimeout(() => {
              location.reload();
            }, 800); 
        })
        .catch((error) => {
          showError(`Erro ao definir úsuario ${error.message}`);
        });
      } else {
        showError('Selecione um nome de úsuario valido');
      }
    }
    
  
  
  function promptForUsername(userId) {
    showUsernameModal();
    document.getElementById('setUsernameButton').onclick = () => setUsername(userId);
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
  
  document.addEventListener('DOMContentLoaded', () => {
      const authContainer = document.getElementById('authContainer');
      const linkContainer = document.getElementById('linkContainer');
      const sharedLinksContainer = document.getElementById('sharedLinksContainer');
      const emailInput = document.getElementById('emailInput');
      const passwordInput = document.getElementById('passwordInput');
      const authButton = document.getElementById('authButton');
      const authToggle = document.getElementById('authToggle');
      const authToggleLink = document.getElementById('authToggleLink');
      const linkTitleInput = document.getElementById('linkTitle');
      const LinkImageInput = document.getElementById('linkImageUrl')
      const linkDescription = document.getElementById('linkDescription')
      const linkUrlInput = document.getElementById('linkUrl');
      const addLinkButton = document.getElementById('addLink');
      const linkList = document.getElementById('linkList');
      const shareCodeDisplay = document.getElementById('shareCodeDisplay');
      const shareCodeInput = document.getElementById('shareCodeInput');
      const viewSharedLinksButton = document.getElementById('viewSharedLinks');
      const sharedLinkList = document.getElementById('sharedLinkList');
      const signOutButton = document.getElementById('signOutButton');
      const backToAuthButton = document.getElementById('backToAuth');
      const sharedLinksTitle = document.getElementById('sharedLinksTitle');
  
      let isSignUp = false;
  
      function showAuthContainer() {
          authContainer.style.display = 'block';
          linkContainer.style.display = 'none';
          sharedLinksContainer.style.display = 'none';
      }
  
      function showLinkContainer() {
          authContainer.style.display = 'none';
          linkContainer.style.display = 'block';
          sharedLinksContainer.style.display = 'none';
          
    
          const existingUsernameSection = document.querySelector('.username-section');
          if (existingUsernameSection) {
            existingUsernameSection.remove();
          }
  
          const usernameSection = document.createElement('div');
          usernameSection.className = 'username-section mb-6 p-4 bg-gray-100 rounded-lg';
          usernameSection.innerHTML = `
            <center><p style="color:white;">Nome de usuário atual: <span id="currentUsername"></span></p></center>
            <div class="flex items-center mt-2">
              <input
                type="text"
                id="usernameInput2"
                class="flex-grow mr-2 p-2 border rounded"
                placeholder="Novo nome de usuário"
              />
              <button
                id="updateUsernameButton"
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 glass-button"
              >
                Atualizar Nome de Usuario
              </button>
            </div>
          `;
          linkContainer.insertBefore(usernameSection, linkContainer.firstChild);
  
          document.getElementById('updateUsernameButton').addEventListener('click', updateUsername);
          displayUsername();
      }
  
      function showSharedLinksContainer() {
          authContainer.style.display = 'none';
          linkContainer.style.display = 'none';
          sharedLinksContainer.style.display = 'block';
      }
  
      authButton.addEventListener('click', (e) => {
          e.preventDefault();
          const email = emailInput.value;
          const password = passwordInput.value;
  
          const overlay = document.getElementById('loadingOverlay');
          const spinner = document.getElementById('loadingSpinner');
          overlay.style.display = 'block';
          spinner.style.display = 'block';
  
          if (isSignUp) {
              firebase.auth().createUserWithEmailAndPassword(email, password)
                  .then((userCredential) => {
                      currentUser = userCredential.user;
                      generateShareCode(currentUser.uid);
                      promptForUsername(currentUser.uid);
                      
                  })
                  .catch((error) => {
                      showError(`Error registering: ${error.message}`);
                  })
                  .finally(() => {
                      spinner.style.display = 'none';
                      overlay.style.display = 'none';
                  });
          } else {
              firebase.auth().signInWithEmailAndPassword(email, password)
                  .then((userCredential) => {
                      currentUser = userCredential.user;
                      showLinkContainer();
                      renderLinks();
                      displayShareCode();
                  })
                  .catch((error) => {
                      switch (error.code) {
                          case 'auth/user-not-found':
                              showError('Erro ao fazer login: Úsuario não existente.');
                              break;
                          case 'auth/invalid-login-credentials':
                              showError('Erro ao fazer o login: Email ou senha incorretos');
                              break;
                          case 'auth/invalid-email':
                              showError('Erro no login: O Endereço de Email é invalido.');
                              break;
                          default:
                              showError(`Erro ao fazer o Login: ${error.message}`);
                      }
                  })
                  .finally(() => {
                      spinner.style.display = 'none';
                      overlay.style.display = 'none';
                  });
          }
      });
  
      authToggleLink.addEventListener('click', (e) => {
          e.preventDefault();
          isSignUp = !isSignUp;
          authButton.textContent = isSignUp ? 'Registrar' : 'Entrar';
          authToggleLink.textContent = isSignUp ? 'Entrar' : 'Registrar';
          authToggle.firstChild.textContent = isSignUp ? 'Já tem uma conta? ' : "Não tem uma conta? ";
      });
  
  function renderLinks() {
      if (!currentUser) return;
  
      db.collection('links').where('userId', '==', currentUser.uid).get()
          .then((querySnapshot) => {
              linkList.innerHTML = '';
              querySnapshot.forEach((doc) => {
                  const link = doc.data();
                  const linkItem = document.createElement('div');
                  linkItem.className = 'link-item';
                  linkItem.innerHTML = `
                      <a href="${link.url}" target="_blank"> 
                      <img src="${link.imgUrl}" alt="${link.title}" class="link-image"> </a>
                      <a href="${link.url}" target="_blank">${link.title} <br> <p>${link.descriptionUrl}</p></a>
                      
                      <button class="edit-link" data-id="${doc.id}"><i class="fa-solid fa-edit" style="color:white;" ></i></button>
                      <button class="delete-link delete-link-icon" data-id="${doc.id}"><i class="fa-solid fa-trash"></i></button>
                  `;
                  linkList.appendChild(linkItem);
              });
          })
          .catch((error) => {
              showError(`Error loading links: ${error.message}`);
          });
  }
  
  function editLink(id) {
      db.collection('links').doc(id).get()
          .then((doc) => {
              if (doc.exists) {
                  const link = doc.data();
                  linkTitleInput.value = link.title;
                  linkUrlInput.value = link.url;
                  LinkImageInput.value = link.imgUrl;
                  linkDescription.value = link.descriptionUrl;
                  
            
                  addLinkButton.textContent = 'Atualizar Link';
                  addLinkButton.setAttribute('data-edit-id', id);
              }
          })
          .catch((error) => {
              showError(`Error loading link for editing: ${error.message}`);
          });
  }
  
  addLinkButton.addEventListener('click', () => {
      const title = linkTitleInput.value.trim();
      const url = linkUrlInput.value.trim();
      const img = LinkImageInput.value.trim();
      const description = linkDescription.value;
  
      if (title && url && currentUser) {
          const editId = addLinkButton.getAttribute('data-edit-id');
          
          if (editId) {
              db.collection('links').doc(editId).update({
                  title: title,
                  url: url,
                  imgUrl: img,
                  descriptionUrl: description
              })
              .then(() => {
                  addLinkButton.textContent = 'Adicionar Link';
                  addLinkButton.removeAttribute('data-edit-id');
                  linkTitleInput.value = '';
                  linkUrlInput.value = '';
                  LinkImageInput.value = '';
                  linkDescription.value = '';
                  renderLinks();
              })
              .catch((error) => {
                  showError(`Error updating link: ${error.message}`);
              });
          } else {
              db.collection('links').add({
                  title: title,
                  url: url,
                  imgUrl: img,
                  descriptionUrl: description,
                  userId: currentUser.uid
              })
              .then(() => {
                  linkTitleInput.value = '';
                  linkUrlInput.value = '';
                  LinkImageInput.value = '';
                  linkDescription.value = '';
                  renderLinks();
              })
              .catch((error) => {
                  showError(`Error adding link: ${error.message}`);
              });
          }
      }
  });
  
  
  linkList.addEventListener('click', (e) => {
      const editButton = e.target.closest('.edit-link');
      const deleteButton = e.target.closest('.delete-link-icon');
  
      if (editButton) {
          const id = editButton.getAttribute('data-id');
          editLink(id);
      } else if (deleteButton) {
          const id = deleteButton.getAttribute('data-id');
          db.collection('links').doc(id).delete()
              .then(() => {
                  renderLinks();
              })
              .catch((error) => {
                  showError(`Error deleting link: ${error.message}`);
              });
      }
  });
  
  
      function generateShareCode(userId) {
          const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const shareUrl = `${window.location.href}#${shareCode}`;
  
          db.collection('users').doc(userId).set({
              shareCode: shareCode,
              shareUrl: shareUrl
          })
          .then(() => {
              displayShareCode(shareUrl);
          })
          .catch((error) => {
              showError(`Error generating share code: ${error.message}`);
          });
      }
  
  
      function displayShareCode() {
          db.collection('users').doc(currentUser.uid).get()
              .then((doc) => {
                  if (doc.exists && doc.data().shareCode) {
                      const shareCode = doc.data().shareCode;
                      const shareUrl = `https://srdarf.github.io/SuriRedirect/#${shareCode}`;
                      
                      
                      shareCodeDisplay.innerHTML = `
                          Seu Código de Compartilhamento: ${shareCode} 
                          <a href="#" class="white" onclick="copyToClipboard('${shareUrl}')" title="Copiar link">
                              <i class="fas fa-link effect"></i>
                          </a>
                      `;
                  } else {
                      generateShareCode(currentUser.uid);
                  }
              })
              .catch((error) => {
                  showError(`Error getting share code: ${error.message}`);
              });
      }
  
      function displayUsername() {
        db.collection('users').doc(currentUser.uid).get()
          .then((doc) => {
            if (doc.exists && doc.data().username) {
              const username = doc.data().username;
              document.getElementById('currentUsername').textContent = username;
            } else {
              document.getElementById('currentUsername').textContent = 'Não definido';
            }
          })
          .catch((error) => {
            showError(`Erro ao obter nome de usuário: ${error.message}`);
          });
      }
  
      function updateUsername() {
        const newUsername = document.getElementById('usernameInput2').value.trim();
        console.log("Novo nome de usuário:", newUsername); 
        
        if (newUsername.length >= 3 && currentUser) {
          db.collection('users').doc(currentUser.uid).update({
            username: newUsername
          })
          .then(() => {
            showError('Nome de usuário atualizado com sucesso!');
            document.getElementById('usernameInput2').value = '';  
            displayUsername();
          })
          .catch((error) => {
            showError(`Erro ao atualizar nome de usuário: ${error.message}`);
          });
        } else {
          showError('Por favor, insira um nome de usuário válido');
        }
      }
      
      
  
      viewSharedLinksButton.addEventListener('click', () => {
          const shareCode = shareCodeInput.value.trim();
          if (shareCode) {
              fetchAndDisplaySharedLinks(shareCode);
          }
      });
  
      function fetchAndDisplaySharedLinks(shareCode) {
          db.collection('users').where('shareCode', '==', shareCode).get()
              .then((querySnapshot) => {
                  if (!querySnapshot.empty) {
                      const userDoc = querySnapshot.docs[0];
                      const userId = userDoc.id;
                      const username = userDoc.data().username || 'Usuário Desconhecido';
                      return Promise.all([
                          db.collection('links').where('userId', '==', userId).get(),
                          Promise.resolve(username)
                      ]);
                  } else {
                      throw new Error('Invalid share code');
                  }
              })
              .then(([linksSnapshot, username]) => {
                  sharedLinkList.innerHTML = '';
                  linksSnapshot.forEach((doc) => {
                      const link = doc.data();
                      const linkItem = document.createElement('div');
                      linkItem.className = 'link-item';
                      linkItem.innerHTML = ` 
                          <a href="${link.url}"target="_blank">
                          <img src="${link.imgUrl}" alt="${link.title}" class="link-image imgfix"> </a>
                          <a href="${link.url}" target="_blank">${link.title} <i class="fa-solid fa-link" onclick="simulateClick()"></i><br> <p>${link.descriptionUrl}</p> </a>
                  
                          
                      `;
                      sharedLinkList.appendChild(linkItem);
                  });
                  sharedLinksTitle.textContent = `Links Compartilhados Por ${username}`;
                  showSharedLinksContainer();
              })
              .catch((error) => {
                  showError(`Erro ao ver os Links: ${error.message}`);
              });
      }
  
      signOutButton.addEventListener('click', () => {
          firebase.auth().signOut()
              .then(() => {
                  currentUser = null;
                  showAuthContainer();
              })
              .catch((error) => {
                  showError(`Erro ao Deslogar: ${error.message}`);
              });
      });
  
      backToAuthButton.addEventListener('click', () => {
          showAuthContainer();
      });
  
  
  
      
  
  function showError(message) {
          const toastContainer = document.getElementById('toastContainer');
          const toast = document.createElement('div');
          toast.className = 'toast';
          toast.textContent = message;
          toastContainer.appendChild(toast);
  
          setTimeout(() => {
              toastContainer.removeChild(toast);
          }, 3000);
      }
  
      const shareCodeFromUrl = window.location.hash.slice(1);
      if (shareCodeFromUrl) {
          fetchAndDisplaySharedLinks(shareCodeFromUrl);
      }
  
    window.onclick = function(event) {
      if (event.target == document.getElementById('usernameModal')) {
        hideUsernameModal();
      }
    }
  });
  
      
  function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
          showError('Copied to clipboard!');
      }).catch((error) => {
          alert(`Error copying link: ${error.message}`);
      });
  }
  
  function showError(message) {
      const toastContainer = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      toastContainer.appendChild(toast);
  
      setTimeout(() => {
          toastContainer.removeChild(toast);
      }, 3000);
  }
  
  
  const themes = [
      ['#232526', '#414345'],
      ['#0f0c29', '#302b63'], 
      ['#1f4037', '#99f2c8'], 
      ['#0f0c29', '#302b63'], 
      ['#2c3e50', '#3498db'], 
      ['#667eea', '#764ba2'],
      ['#4b6cb7', '#182848'], 
      ['#ee9ca7', '#ffdde1'], 
      ['#141e30', '#243b55'], 
      ['#ff7e5f', '#feb47b'], 
      ['#8360c3', '#2ebf91'], 
      ['#1a2980', '#26d0ce'], 
      ['#134e5e', '#71b280'], 
      ['#ff9966', '#ff5e62'], 
      ['#56ab2f', '#a8e063'], 
      ['#7f7fd5', '#86a8e7'], 
      ['#373b44', '#4286f4'], 
      ['#000428', '#004e92'], 
      ['#f953c6', '#b91d73'], 
      ['#43cea2', '#185a9d']
  ];
  
  
  function getRandomDirection() {
      return '135deg'; 
  }
  
  function getRandomPosition() {
      return [50, 50]; 
  }
  
  function changeBackgroundColor() {
    
      addShowClassTemporarily();
  
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      const [color1, color2] = randomTheme;
      const direction = getRandomDirection();
      document.body.style.background = `linear-gradient(${direction}, ${color1}, ${color2})`;
  
      
      setTimeout(() => {
          const elements = document.querySelectorAll('*');
          elements.forEach(element => {
              element.classList.remove('show');
              element.classList.add('show2');
          });
          addShowClassTemporarily(); 
      }, 500); 
  }
  
  
  
  
  function changeBackgroundColor2() {
    
      addShowClassTemporarily();
      setTimeout(() => {
          const elements = document.querySelectorAll('*');
          elements.forEach(element => {
              element.classList.remove('show');
              element.classList.add('show2');
          });
          addShowClassTemporarily(); 
      }, 500); 
  }
  
  function addShowClassTemporarily() {
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
          element.classList.add('show');
      });
  
      setTimeout(() => {
          elements.forEach(element => {
              element.classList.remove('show');
              element.classList.remove('show2');
          });
      }, 500);
  }