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
    const usernameInput = document.getElementById('usernameInput');

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
            const username = usernameInput.value.trim();
            if (!username) {
                showError('Por favor, insira um nome de usuário.');
                spinner.style.display = 'none';
                overlay.style.display = 'none';
                return;
            }
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    currentUser = userCredential.user;
                    return db.collection('users').doc(currentUser.uid).set({
                        username: username
                    });
                })
                .then(() => {
                    generateShareCode(currentUser.uid);
                    showLinkContainer();
                })
                .catch((error) => {
                    showError(`Erro ao cadastrar: ${error.message}`);
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
                            showError('Erro ao fazer login: Usuário não encontrado.');
                            break;
                        case 'auth/invalid-login-credentials':
                            showError('Erro ao fazer login: Email ou Senha estão incorretos.');
                            break;
                        case 'auth/invalid-email':
                            showError('Erro ao fazer login: O endereço de e-mail está mal formatado.');
                            break;
                        default:
                            showError(`Erro ao fazer login: ${error.message}`);
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
        authButton.textContent = isSignUp ? 'Cadastrar' : 'Entrar';
        authToggleLink.textContent = isSignUp ? 'Entrar' : 'Cadastrar';
        authToggle.firstChild.textContent = isSignUp ? 'Já tem uma conta? ' : "Não tem uma conta? ";
        usernameInput.style.display = isSignUp ? 'block' : 'none';
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
                        <a href="${link.url}"target="_blank"> 
                        <img src="${link.imgUrl}" alt="${link.title}" class="link-image"> </a>
                        <a href="${link.url}" target="_blank">${link.title} <br> <p>${link.descriptionUrl}</p></a>
                        
                        <center><button class="delete-link delete-link-icon" data-id="${doc.id}">  <i class="fa-solid fa-trash"></i>       </button> </center>
                    `;
                    linkList.appendChild(linkItem);
                });
            })
            .catch((error) => {
                showError(`Erro ao carregar links: ${error.message}`);
            });
    }

    addLinkButton.addEventListener('click', () => {
        const title = linkTitleInput.value.trim();
        const url = linkUrlInput.value.trim();
        const img = LinkImageInput.value.trim();
        const description = linkDescription.value;

        if (title && url && currentUser) {
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
                renderLinks();
            })
            .catch((error) => {
                showError(`Erro ao adicionar link: ${error.message}`);
            });
        }
    });

    linkList.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-link-icon');

        if (deleteButton) {
            const id = deleteButton.getAttribute('data-id');
            db.collection('links').doc(id).delete()
                .then(() => {
                    renderLinks();
                })
                .catch((error) => {
                    showError(`Erro ao deletar link: ${error.message}`);
                });
        }
    });

    function generateShareCode(userId) {
        const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const shareUrl = `${window.location.href}#${shareCode}`;
        const username = usernameInput.value

        db.collection('users').doc(userId).set({
            shareCode: shareCode,
            username: username,
            shareUrl: shareUrl
        })
        .then(() => {
            displayShareCode(shareUrl);
        })
        .catch((error) => {
            showError(`Erro ao gerar código de compartilhamento: ${error.message}`);
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
                            <i class="fas fa-link"></i>
                        </a>
                    `;
                } else {
                    generateShareCode(currentUser.uid);
                }
            })
            .catch((error) => {
                showError(`Erro ao obter código de compartilhamento: ${error.message}`);
            });
    }

    viewSharedLinksButton.addEventListener('click', () => {
        const shareCode = shareCodeInput.value.trim();
        if (shareCode) {
            fetchAndDisplaySharedLinks(shareCode);
        }
    });

    function fetchAndDisplaySharedLinks(shareCode) {
        let sharedUsername = '';
        db.collection('users').where('shareCode', '==', shareCode).get()
            .then((querySnapshot) => {
                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const userId = userDoc.id;
                    sharedUsername = userDoc.data().username || 'Usuário Desconhecido';
                    return db.collection('links').where('userId', '==', userId).get();
                } else {
                    throw new Error('Código de compartilhamento inválido');
                }
            })
            .then((linksSnapshot) => {
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
                const sharedLinksUsernameElement = document.getElementById('sharedLinksUsername');
                if (sharedLinksUsernameElement) {
                    sharedLinksUsernameElement.textContent = sharedUsername;
                } else {
                }
                sharedLinksTitle.textContent = `Links Compartilhados por: ${sharedUsername}`;
                sharedLinksTitle.style.display = 'block';
                showSharedLinksContainer();
            })
            .catch((error) => {
                showError(`Erro ao ver links compartilhados: ${error.message}`);
            });
    }

    signOutButton.addEventListener('click', () => {
        firebase.auth().signOut()
            .then(() => {
                currentUser = null;
                showAuthContainer();
            })
            .catch((error) => {
                showError(`Erro ao fazer logout: ${error.message}`);
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
});

    
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showError('Copiado para a area de transferencia!');
    }).catch((error) => {
        alert(`Erro ao copiar o link: ${error.message}`);
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

