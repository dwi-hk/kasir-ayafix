// Konfigurasi Database Firebase Kasir AYA Group
const firebaseConfig = {
    apiKey: "AIzaSyCx0u4ka3lhjiPm84hI8U7v37GNusCvPaE",
    authDomain: "kasir-aya-group-e6fb4.firebaseapp.com",
    databaseURL: "https://kasir-aya-group-e6fb4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kasir-aya-group-e6fb4",
    storageBucket: "kasir-aya-group-e6fb4.firebasestorage.app",
    messagingSenderId: "654765768336",
    appId: "1:654765768336:web:7fb865aaf00e371de36215"
};

let db = null;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        console.log("Firebase Database Terkoneksi!");
    }
} catch(e) { 
    console.error("Koneksi Firebase Gagal:", e); 
}