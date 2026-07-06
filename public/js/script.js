// ===== CONFIGURAÇÃO DO FIREBASE =====
// Substitua pelos dados do SEU projeto (realtime database)
const firebaseConfig = {
    apiKey: "AIzaSyCoLL1G69ndOm3VB4Hm1Dq_aIthxRaeMRA",
    authDomain: "foxyz-server.firebaseapp.com",
    databaseURL: "https://foxyz-server-default-rtdb.firebaseio.com",
    projectId: "foxyz-server",
    storageBucket: "foxyz-server.firebasestorage.app",
    messagingSenderId: "G-4NGLC83J7S",
    appId: "1:1060803472834:web:69b8add3e77ae99c707a5b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ===== ELEMENTOS =====
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const registerNick = document.getElementById('registerNick');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const loginMsg = document.getElementById('loginMessage');
const registerMsg = document.getElementById('registerMessage');

// ===== ABA =====
const tabBtns = document.querySelectorAll('.tab-btn');
const forms = {
    login: loginForm,
    register: registerForm
};

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;
        Object.keys(forms).forEach(key => {
            forms[key].classList.toggle('active', key === tab);
        });

        loginMsg.textContent = '';
        registerMsg.textContent = '';
    });
});

// ===== LOGIN =====
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    loginMsg.textContent = 'Entrando...';
    loginMsg.className = 'message';

    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const uid = cred.user.uid;

        // Verifica banimento
        const snapshot = await db.ref('bannedUsers/' + uid).once('value');
        if (snapshot.exists()) {
            await auth.signOut();
            loginMsg.textContent = '❌ Conta banida. Motivo: ' + snapshot.val();
            loginMsg.className = 'message error';
            return;
        }

        loginMsg.textContent = '✅ Login bem-sucedido! Redirecionando...';
        loginMsg.className = 'message success';

        // Obter token para enviar ao backend (opcional)
        const token = await auth.currentUser.getIdToken();
        console.log('Token JWT:', token);

        // Exemplo: chamar a API de validação
        const response = await fetch('/api/auth', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const userData = await response.json();
        console.log('Dados do usuário (via API):', userData);

        // Redirecionar para o lobby (se existir)
        // window.location.href = 'lobby.html';

    } catch (error) {
        console.error(error);
        let msg = 'Erro ao entrar. Verifique seus dados.';
        if (error.code === 'auth/user-not-found') msg = 'Usuário não encontrado.';
        if (error.code === 'auth/wrong-password') msg = 'Senha incorreta.';
        if (error.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Tente mais tarde.';
        loginMsg.textContent = '❌ ' + msg;
        loginMsg.className = 'message error';
    }
});

// ===== REGISTRO =====
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = registerNick.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;

    registerMsg.textContent = 'Criando conta...';
    registerMsg.className = 'message';

    if (nick.length < 3 || nick.length > 20) {
        registerMsg.textContent = '❌ Nick deve ter entre 3 e 20 caracteres.';
        registerMsg.className = 'message error';
        return;
    }

    try {
        const nickSnapshot = await db.ref('users').orderByChild('nickname').equalTo(nick).once('value');
        if (nickSnapshot.exists()) {
            registerMsg.textContent = '❌ Este nickname já está em uso.';
            registerMsg.className = 'message error';
            return;
        }

        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const uid = cred.user.uid;

        await db.ref('users/' + uid).set({
            nickname: nick,
            email: email,
            level: 1,
            exp: 0,
            diamonds: 1000,
            gold: 10000,
            vipLevel: 0,
            avatar: 'default.png',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            banned: false,
            banReason: '',
            isAdmin: false,
            inventory: [],
            friends: []
        });

        registerMsg.textContent = '✅ Conta criada com sucesso! Bem-vindo, ' + nick + '!';
        registerMsg.className = 'message success';
        registerForm.reset();

        setTimeout(() => {
            document.querySelector('.tab-btn[data-tab="login"]').click();
        }, 1500);

    } catch (error) {
        console.error(error);
        let msg = 'Erro ao criar conta.';
        if (error.code === 'auth/email-already-in-use') msg = 'E-mail já cadastrado.';
        if (error.code === 'auth/weak-password') msg = 'Senha muito fraca (mínimo 6 caracteres).';
        registerMsg.textContent = '❌ ' + msg;
        registerMsg.className = 'message error';
    }
});

// ===== ATUALIZA LASTLOGIN AUTOMÁTICO =====
auth.onAuthStateChanged((user) => {
    if (user) {
        db.ref('users/' + user.uid + '/lastLogin').set(new Date().toISOString());
    }
});
