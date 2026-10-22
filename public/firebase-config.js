// Projet Firebase de Terra Mustela (Auth Google + Firestore)
export const firebaseConfig = {
    apiKey: "AIzaSyBYBvRIi0ex-I7n1ju3BFf9P7ji9sMCfkQ",
    authDomain: "terramustela.firebaseapp.com",
    projectId: "terramustela",
    storageBucket: "terramustela.firebasestorage.app",
    messagingSenderId: "984738826742",
    appId: "1:984738826742:web:7177a30f3ab431dfc1dfd7"
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/13.1.0';

// Document Firestore qui contient tout le contenu modifiable du site
export const CONTENT_DOC = { collection: 'site', id: 'content' };

// Seuls ces comptes Google peuvent accéder à /admin (vérifié aussi par les règles Firestore et le serveur)
export const ADMIN_EMAILS = ['martin.stuis11@gmail.com', 'terra.ophis@gmail.com'];
