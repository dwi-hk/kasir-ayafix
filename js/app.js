// js/app.js
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
    }
} catch(e) { 
    console.error("Inisialisasi Firebase Gagal:", e); 
}

let keranjang = [];
let riwayatTransaksi = JSON.parse(localStorage.getItem('aya_transaksi_v3')) || [];
let pengeluaran = JSON.parse(localStorage.getItem('aya_pengeluaran_v3')) || [];
let barangTitipan = JSON.parse(localStorage.getItem('aya_titipan_v3')) || [];
let kategoriAktif = 'topping';
let metodePembayaran = 'TUNAI';

function dapatkanTanggalLokal() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const lokal = new Date(d.getTime() - (offset * 60 * 1000));
    return lokal.toISOString().split('T')[0];
}

// REALTIME SINKRONISASI FIREBASE DATABASE
if (db) {
    db.ref('menu_tambahan').on('value', (snapshot) => {
        const data = snapshot.val();
        if(data) {
            Object.values(data).forEach(m => {
                const ada = databaseMenu.find(dm => String(dm.id) === String(m.id));
                if(ada) {
                    Object.assign(ada, m);
                } else {
                    databaseMenu.push(m);
                }
            });
            renderMasterData();
            renderMenu();
        }
    });

    db.ref('transaksi').on('value', (snapshot) => {
        const data = snapshot.val();
        riwayatTransaksi = data ? Object.values(data).sort((a, b) => b.id.localeCompare(a.id)) : [];
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
    });
}

function renderMasterData() {
    let tbody = document.getElementById('tabelMasterData');
    if (!tbody) return;
    let html = '';
    databaseMenu.forEach(item => {
        html += `
            <tr class="hover:bg-orange-50/40 border-b">
                <td class="p-2 font-bold">${item.nama}</td>
                <td class="p-2 text-center">${item.kategori || 'sembako'}</td>
                <td class="p-2 text-right">Rp ${(item.hargaBeli || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-right">Rp ${(item.harga || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-center">${item.isi || 1} ${item.satuan || 'pcs'}</td>
                <td class="p-2 text-center">
                    <button onclick="editMasterData('${item.id}')" class="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px]">Edit</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderMenu() {
    const container = document.getElementById('container-menu');
    if (!container) return;
    container.innerHTML = '';
    let filtered = databaseMenu.filter(item => item.kategori === kategoriAktif);
    
    filtered.forEach(item => {
        container.innerHTML += `
            <div onclick="tambahItem('${item.id}')" class="p-3 bg-white border-2 border-orange-200 rounded-xl shadow cursor-pointer hover:border-orange-500">
                <span class="font-bold text-xs text-gray-800 uppercase block truncate">${item.nama}</span>
                <span class="text-orange-600 font-extrabold text-sm block mt-1">Rp ${(item.harga || 0).toLocaleString('id-ID')}</span>
            </div>
        `;
    });
}

function tambahItem(id) {
    const produk = databaseMenu.find(p => String(p.id) === String(id));
    if (!produk) return;
    const ada = keranjang.find(k => String(k.id) === String(id));
    if (ada) {
        ada.qty += 1;
    } else {
        keranjang.push({ ...produk, qty: 1 });
    }
    updateKeranjang();
}

function updateKeranjang() {
    const container = document.getElementById('tabelKeranjang');
    if (!container) return;
    if (keranjang.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Belum ada item dipilih</p>';
        document.getElementById('textTotal').innerText = 'Rp 0';
        return;
    }

    let html = '';
    let total = 0;
    keranjang.forEach(item => {
        let subtotal = item.harga * item.qty;
        total += subtotal;
        html += `
            <div class="flex justify-between items-center py-1 border-b text-xs">
                <div>
                    <p class="font-bold uppercase">${item.nama}</p>
                    <p class="text-[10px] text-gray-500">${item.qty} x Rp ${item.harga.toLocaleString('id-ID')}</p>
                </div>
                <span class="font-bold">Rp ${subtotal.toLocaleString('id-ID')}</span>
            </div>
        `;
    });
    container.innerHTML = html;
    document.getElementById('textTotal').innerText = 'Rp ' + total.toLocaleString('id-ID');
}

window.onload = () => {
    switchTab('master');
    renderMasterData();
    renderMenu();
};