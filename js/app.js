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
        console.log("Firebase Realtime Database Terhubung Berhasil!");
    }
} catch(e) { 
    console.error("Inisialisasi Firebase Gagal:", e); 
}

// Variable Global Storage Internal & Temporary
let keranjang = [];
let transaksiDitahan = [];
let cabangAktif = 'SEMUA CABANG';
let dataTransaksiFirebase = [];
let dataPengeluaranFirebase = [];

let pelangganList = JSON.parse(localStorage.getItem('aya_pelanggan')) || [];
let supplierList = JSON.parse(localStorage.getItem('aya_supplier')) || [];
let karyawanList = JSON.parse(localStorage.getItem('aya_karyawan')) || [];
let absensiList = JSON.parse(localStorage.getItem('aya_absensi')) || [];
let inventarisList = JSON.parse(localStorage.getItem('aya_inventaris')) || [];
let barangTitipan = JSON.parse(localStorage.getItem('aya_titipan_v3')) || [];
let riwayatTransaksi = JSON.parse(localStorage.getItem('aya_transaksi_v3')) || [];
let riwayatPengeluaran = JSON.parse(localStorage.getItem('aya_pengeluaran_v3')) || [];

let kategoriAktif = 'topping';
let metodePembayaran = 'TUNAI';
let myChart = null;
let myExpenseChart = null;

// GANTI CABANG MANUAL
function gantiCabang(namaCabang) {
    cabangAktif = namaCabang;
    let lblCabang = document.getElementById('lblCabangKasir');
    if(lblCabang) lblCabang.innerText = namaCabang;
    let txtCabang = document.getElementById('txtCabangInv');
    if(txtCabang) txtCabang.innerText = namaCabang;
    
    renderInventaris();
    updateLaporan();
    updateLaporanPengeluaran();
}

// BUKA DAN TUTUP TAB
function switchTab(tab) {
    ['master', 'cabang', 'kasir', 'pembelian', 'pengeluaran', 'laporan', 'laporan_pengeluaran', 'backoffice', 'user', 'setting'].forEach(t => {
        let el = document.getElementById('tab-' + t);
        let btn = document.getElementById('btn-tab-' + t);
        if (el) el.classList.add('hidden');
        if (btn) btn.classList.remove('bg-orange-700');
    });

    let targetTab = document.getElementById('tab-' + tab);
    let targetBtn = document.getElementById('btn-tab-' + tab);
    if (targetTab) targetTab.classList.remove('hidden');
    if (targetBtn) targetBtn.classList.add('bg-orange-700');

    if(tab === 'master') renderMasterData();
    if(tab === 'laporan') updateLaporan();
    if(tab === 'laporan_pengeluaran') updateLaporanPengeluaran();
    if(tab === 'cabang') renderInventaris();
}

function switchSubMaster(sub) {
    ['barang', 'titipan', 'pelanggan', 'supplier', 'karyawan'].forEach(s => {
        let el = document.getElementById('sec-master-' + s);
        if(el) el.classList.add('hidden');
    });
    let targetSub = document.getElementById('sec-master-' + sub);
    if(targetSub) targetSub.classList.remove('hidden');
}

/* ================= MANAJEMEN MASTER DATA ================= */
function hitungEstimasiProfitMaster() {
    let isi = parseInt(document.getElementById('masterIsi')?.value) || 1;
    let hBeliTotal = parseInt(document.getElementById('masterHargaBeli')?.value) || 0;
    let hJual = parseInt(document.getElementById('masterHargaJual')?.value) || 0;

    let hppSatuan = Math.round(hBeliTotal / (isi > 0 ? isi : 1));
    let profit = hJual - hppSatuan;

    let el = document.getElementById('masterEstimasiProfit');
    if(el) el.innerText = `Rp ${profit.toLocaleString('id-ID')} (HPP: Rp ${hppSatuan.toLocaleString('id-ID')})`;
}

function simpanMasterDatabase() {
    let nama = document.getElementById('masterNama')?.value.trim() || '';
    let barcode = document.getElementById('masterBarcode')?.value.trim() || 'BRG-' + Date.now();
    let hJual = parseInt(document.getElementById('masterHargaJual')?.value) || 0;
    let hBeliTotal = parseInt(document.getElementById('masterHargaBeli')?.value) || 0;
    let isi = parseInt(document.getElementById('masterIsi')?.value) || 1;

    if (!nama || hJual <= 0) return alert('Mohon lengkapi nama dan harga jual!');

    let hppSatuan = Math.round(hBeliTotal / isi);
    let item = {
        id: barcode,
        nama: nama,
        kategori: document.getElementById('masterKategori')?.value || 'topping',
        satuan: document.getElementById('masterSatuan')?.value || 'pcs',
        isi: isi,
        hargaBeliTotal: hBeliTotal,
        hargaBeli: hppSatuan,
        harga: hJual
    };

    if(db) {
        db.ref('menu_tambahan/' + barcode).set(item);
    } else {
        if(typeof databaseMenu !== 'undefined') databaseMenu.push(item);
    }
    resetFormMaster();
    renderMasterData();
    renderMenu();
    alert('Master Produk Berhasil Disimpan!');
}

function resetFormMaster() {
    if(document.getElementById('masterNama')) document.getElementById('masterNama').value = '';
    if(document.getElementById('masterBarcode')) document.getElementById('masterBarcode').value = '';
    if(document.getElementById('masterHargaBeli')) document.getElementById('masterHargaBeli').value = '';
    if(document.getElementById('masterHargaJual')) document.getElementById('masterHargaJual').value = '';
}

function renderMasterData() {
    let tbody = document.getElementById('tabelMasterData');
    if (!tbody || typeof databaseMenu === 'undefined') return;
    let html = '';
    databaseMenu.forEach(item => {
        let hpp = item.hargaBeli || 0;
        let laba = (item.harga || 0) - hpp;
        html += `
            <tr class="hover:bg-orange-50 border-b">
                <td class="p-2 font-mono text-[10px]">${item.id || '-'}</td>
                <td class="p-2 font-bold uppercase">${item.nama || '-'}</td>
                <td class="p-2 text-center">${item.kategori || '-'}</td>
                <td class="p-2 text-center">${item.isi || 1} ${item.satuan || 'pcs'}</td>
                <td class="p-2 text-right">Rp ${hpp.toLocaleString('id-ID')}</td>
                <td class="p-2 text-right font-bold">Rp ${(item.harga || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-right text-emerald-600 font-bold">Rp ${laba.toLocaleString('id-ID')}</td>
                <td class="p-2 text-center">
                    <button onclick="hapusMasterData('${item.id}')" class="text-red-600 font-bold">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function hapusMasterData(id) {
    if(!confirm('Hapus barang ini dari database?')) return;
    if(db) db.ref('menu_tambahan/' + id).remove();
    if(typeof databaseMenu !== 'undefined') {
        let idx = databaseMenu.findIndex(m => String(m.id) === String(id));
        if(idx !== -1) databaseMenu.splice(idx, 1);
    }
    renderMasterData();
    renderMenu();
}

/* ================= KASIR PENJUALAN ================= */
function filterKategori(kat) {
    kategoriAktif = kat;
    ['topping', 'makanan', 'dingin', 'panas', 'jajanan'].forEach(k => {
        let btn = document.getElementById('btn-kat-' + k);
        if(btn) btn.className = "px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded";
    });
    let activeBtn = document.getElementById('btn-kat-' + kat);
    if(activeBtn) activeBtn.className = "px-3 py-1.5 bg-orange-600 text-white font-bold rounded shadow";

    renderMenu();
}

function cariMenuKasir() {
    let query = document.getElementById('cariMenuKasir')?.value.toLowerCase().trim() || '';
    if(!query) {
        renderMenu();
        return;
    }
    if(typeof databaseMenu === 'undefined') return;
    let filtered = databaseMenu.filter(m => 
        (m.nama && m.nama.toLowerCase().includes(query)) || String(m.id).toLowerCase().includes(query)
    );
    renderMenu(filtered);
}

function renderMenu(customList = null) {
    const container = document.getElementById('container-menu');
    if(!container || typeof databaseMenu === 'undefined') return;
    container.innerHTML = '';

    let list = customList || databaseMenu.filter(m => m.kategori === kategoriAktif);
    if(list.length === 0) {
        container.innerHTML = '<p class="col-span-3 text-center text-gray-400 py-8 text-xs">Menu tidak ditemukan</p>';
        return;
    }
    list.forEach(item => {
        container.innerHTML += `
            <div onclick="tambahItem('${item.id}')" class="p-2 bg-white border border-orange-200 rounded-lg shadow-sm cursor-pointer hover:border-orange-500 hover:shadow transition">
                <p class="font-bold text-xs uppercase line-clamp-1">${item.nama || '-'}</p>
                <p class="text-orange-600 font-black text-xs">Rp ${(item.harga || 0).toLocaleString('id-ID')}</p>
            </div>
        `;
    });
}

function tambahItem(id) {
    if(typeof databaseMenu === 'undefined') return;
    let prod = databaseMenu.find(p => String(p.id) === String(id));
    if(!prod) return;
    let ada = keranjang.find(k => String(k.id) === String(id));
    if(ada) { ada.qty += 1; } 
    else { keranjang.push({ ...prod, qty: 1 }); }
    updateKeranjang();
}

function updateKeranjang() {
    let container = document.getElementById('tabelKeranjang');
    if(!container) return;
    if(keranjang.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4 text-xs">Belum ada item dipilih</p>';
        if(document.getElementById('textTotal')) document.getElementById('textTotal').innerText = 'Rp 0';
        return;
    }

    let html = '';
    let total = 0;
    keranjang.forEach(item => {
        let harga = item.harga || 0;
        let sub = harga * item.qty;
        total += sub;
        html += `
            <div class="flex justify-between items-center py-1 border-b text-xs">
                <div class="flex-1 truncate">
                    <p class="font-bold uppercase">${item.nama || '-'}</p>
                    <p class="text-[10px] text-gray-500">@ Rp ${harga.toLocaleString('id-ID')}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="ubahQty('${item.id}', -1)" class="px-1.5 bg-gray-200 font-bold rounded hover:bg-gray-300">-</button>
                    <span class="font-bold">${item.qty}</span>
                    <button onclick="ubahQty('${item.id}', 1)" class="px-1.5 bg-orange-500 text-white font-bold rounded hover:bg-orange-600">+</button>
                </div>
                <span class="font-bold w-16 text-right">Rp ${sub.toLocaleString('id-ID')}</span>
            </div>
        `;
    });

    let styro = (parseInt(document.getElementById('inputStyrofoam')?.value) || 0) * 1000;
    total += styro;

    container.innerHTML = html;
    if(document.getElementById('textTotal')) document.getElementById('textTotal').innerText = 'Rp ' + total.toLocaleString('id-ID');
    hitungKembalian();
}

// FITUR BARU: Kosongkan keranjang belanja kasir
function kosongkanKeranjang() {
    if (keranjang.length === 0) return;
    if (confirm('Apakah Anda yakin ingin mengosongkan keranjang?')) {
        keranjang = [];
        if (document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
        if (document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = 0;
        updateKeranjang();
    }
}

function ubahQty(id, delta) {
    let ada = keranjang.find(k => String(k.id) === String(id));
    if(ada) {
        ada.qty += delta;
        if(ada.qty <= 0) keranjang = keranjang.filter(k => String(k.id) !== String(id));
    }
    updateKeranjang();
}

function setMetodePembayaran(m) {
    metodePembayaran = m;
    ['tunai', 'qris', 'hutang', 'konsumsi'].forEach(btn => {
        let el = document.getElementById('btn-bayar-' + btn);
        if(el) el.className = "py-1.5 rounded bg-gray-200 text-gray-700 font-bold";
    });
    let mapKey = m.toLowerCase() === 'personal' ? 'konsumsi' : m.toLowerCase();
    let selectedBtn = document.getElementById('btn-bayar-' + mapKey);
    if(selectedBtn) selectedBtn.className = "py-1.5 rounded bg-orange-600 text-white font-bold";
}

function hitungKembalian() {
    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let bayarInput = document.getElementById('inputBayar')?.value;
    
    if (bayarInput === '' || bayarInput === null || bayarInput === undefined) {
        if(document.getElementById('textKembalian')) {
            document.getElementById('textKembalian').innerText = 'Rp 0';
        }
        return;
    }

    let bayar = parseInt(bayarInput) || 0;
    let kembalian = bayar - total;
    if(document.getElementById('textKembalian')) {
        document.getElementById('textKembalian').innerText = kembalian >= 0 ? 'Rp ' + kembalian.toLocaleString('id-ID') : 'Uang Kurang';
    }
}

/* ================= ALGORITMA TAHAN TRANSAKSI ================= */
function tahanTransaksi() {
    if(keranjang.length === 0) return alert('Keranjang kosong!');
    
    let styro = parseInt(document.getElementById('inputStyrofoam')?.value) || 0;
    
    // Hitung total dari keranjang yang sedang ditahan
    let subtotalItems = keranjang.reduce((acc, item) => acc + ((item.harga || 0) * item.qty), 0);
    let totalNominal = subtotalItems + (styro * 1000);

    transaksiDitahan.push({
        id: 'HOLD-' + Date.now(),
        items: [...keranjang],
        styrofoam: styro,
        metode: metodePembayaran,
        totalNominal: totalNominal,
        waktu: new Date().toLocaleTimeString('id-ID')
    });
    
    keranjang = [];
    if(document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = 0;
    if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
    
    updateKeranjang();
    renderHeldOrders();
    alert('Transaksi berhasil ditahan!');
}

function renderHeldOrders() {
    let box = document.getElementById('boxHeldOrders');
    let container = document.getElementById('listHeldOrders');
    if(!box || !container) return;
    
    if(transaksiDitahan.length === 0) {
        box.classList.add('hidden');
        return;
    }
    
    box.classList.remove('hidden');
    container.innerHTML = '';
    
    // Tampilan Detail untuk setiap Transaksi Ditahan
    transaksiDitahan.forEach((t, i) => {
        let itemsDetailHtml = t.items.map(item => {
            let itemSub = (item.harga || 0) * item.qty;
            return `
                <div class="flex justify-between items-center text-[11px] py-0.5 border-b border-amber-100">
                    <span>${item.nama} <b class="text-amber-800">x${item.qty}</b></span>
                    <span class="font-mono">@Rp${(item.harga||0).toLocaleString('id-ID')} = <b>Rp${itemSub.toLocaleString('id-ID')}</b></span>
                </div>
            `;
        }).join('');

        if (t.styrofoam > 0) {
            itemsDetailHtml += `
                <div class="flex justify-between items-center text-[11px] py-0.5 border-b border-amber-100 italic">
                    <span>Styrofoam x${t.styrofoam}</span>
                    <span class="font-mono">Rp${(t.styrofoam * 1000).toLocaleString('id-ID')}</span>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="p-2.5 bg-amber-50 border border-amber-300 rounded-lg shadow-sm mb-2">
                <div class="flex justify-between items-center pb-1 border-b border-amber-200 mb-1">
                    <span class="font-bold text-amber-900 text-xs">📋 Jam: ${t.waktu}</span>
                    <span class="font-bold text-xs text-orange-700 font-mono">Total: Rp ${(t.totalNominal || 0).toLocaleString('id-ID')}</span>
                </div>
                
                <div class="my-1 max-h-24 overflow-y-auto pr-1">
                    ${itemsDetailHtml}
                </div>

                <div class="flex gap-2 mt-2 pt-1">
                    <button onclick="resumeTransaksi(${i})" class="flex-1 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow transition">
                        🔄 Panggil Transaksi
                    </button>
                    <button onclick="hapusTransaksiDitahan(${i})" class="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded shadow transition" title="Batal & Hapus">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    });
}

function hapusTransaksiDitahan(index) {
    if (confirm('Hapus transaksi ditahan ini?')) {
        transaksiDitahan.splice(index, 1);
        renderHeldOrders();
    }
}

function resumeTransaksi(index) {
    if (keranjang.length > 0) {
        if (!confirm('Keranjang saat ini tidak kosong. Ingin menimpa/melanjutkan transaksi yang ditahan?')) {
            return;
        }
    }
    
    let target = transaksiDitahan[index];
    keranjang = [...target.items];
    if(document.getElementById('inputStyrofoam')) {
        document.getElementById('inputStyrofoam').value = target.styrofoam || 0;
    }
    if(target.metode) {
        setMetodePembayaran(target.metode);
    }
    
    transaksiDitahan.splice(index, 1);
    updateKeranjang();
    renderHeldOrders();
}

/* ================= SIMPAN TRANSAKSI & VALIDASI PENJUALAN ================= */
function simpanTransaksi() {
    if(keranjang.length === 0) { 
        alert('Keranjang Kosong!'); 
        return false; 
    }

    let bayarVal = document.getElementById('inputBayar')?.value;
    if (bayarVal === '' || bayarVal === null || bayarVal === undefined) {
        alert('Nominal uang belum diisi!');
        return false;
    }

    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let bayar = parseInt(bayarVal) || 0;

    if (bayar < total && metodePembayaran === 'TUNAI') {
        alert('Jumlah bayar kurang dari total tagihan!');
        return false;
    }

    let nota = {
        id: 'NOTA-' + Date.now(),
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif,
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: new Date().toISOString().split('T')[0],
        items: [...keranjang],
        styrofoam: parseInt(document.getElementById('inputStyrofoam')?.value) || 0,
        total: total,
        bayar: bayar,
        metodePembayaran: metodePembayaran
    };

    if(db) {
        db.ref('transaksi/' + nota.id).set(nota);
    }
    
    riwayatTransaksi.unshift(nota);
    localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));

    return true;
}

function tombolSimpanSaja() {
    if(simpanTransaksi()) {
        alert('Transaksi Berhasil Disimpan!');
        keranjang = [];
        if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
        if(document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = 0;
        updateKeranjang();
    }
}

function cetakNota() {
    if(keranjang.length === 0) return alert('Keranjang belanja kosong!');
    
    let bayarVal = document.getElementById('inputBayar')?.value;
    if (bayarVal === '' || bayarVal === null || bayarVal === undefined) {
        alert('Nominal uang belum diisi!');
        return;
    }

    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let bayar = parseInt(bayarVal) || 0;

    if (bayar < total && metodePembayaran === 'TUNAI') {
        alert('Jumlah bayar kurang dari total tagihan!');
        return;
    }

    let htmlItems = '';
    keranjang.forEach(i => {
        let harga = i.harga || 0;
        let sub = harga * i.qty;
        htmlItems += `
            <div class="nota-item-row font-bold">
                <span>${i.nama || '-'}</span>
                <div class="nota-item-detail">
                    <span>${i.qty} x ${harga.toLocaleString('id-ID')}</span>
                    <span>Rp${sub.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });

    let styroQty = parseInt(document.getElementById('inputStyrofoam')?.value) || 0;
    if (styroQty > 0) {
        let subStyro = styroQty * 1000;
        htmlItems += `
            <div class="nota-item-row font-bold">
                <span>Styrofoam</span>
                <div class="nota-item-detail">
                    <span>${styroQty} x 1.000</span>
                    <span>Rp${subStyro.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    }

    if(document.getElementById('notaItems')) document.getElementById('notaItems').innerHTML = htmlItems;
    if(document.getElementById('notaWaktu')) document.getElementById('notaWaktu').innerText = "Waktu: " + new Date().toLocaleString('id-ID');
    if(document.getElementById('notaMetode')) document.getElementById('notaMetode').innerText = "Metode: " + metodePembayaran;
    if(document.getElementById('notaTotal')) {
        document.getElementById('notaTotal').innerHTML = `
            <div class="flex justify-between font-bold"><span>TOTAL :</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
            <div class="flex justify-between font-bold text-[9px]"><span>BAYAR :</span><span>Rp ${bayar.toLocaleString('id-ID')}</span></div>
            <div class="flex justify-between font-bold text-[9px]"><span>KEMBALI :</span><span>Rp ${(bayar - total).toLocaleString('id-ID')}</span></div>
        `;
    }

    const area = document.getElementById('areaNota');
    if(area) area.style.display = 'block';
    setTimeout(() => {
        window.print();
        if(area) area.style.display = 'none';
        if (simpanTransaksi()) {
            keranjang = [];
            if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
            if(document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = 0;
            updateKeranjang();
        }
    }, 300);
}

/* ================= MANAJEMEN PENGELUARAN (EXPENSES) ================= */
function resetFormPengeluaran() {
    let todayISO = new Date().toISOString().split('T')[0];
    if(document.getElementById('pengeluaranTanggal')) document.getElementById('pengeluaranTanggal').value = todayISO;
    if(document.getElementById('pengeluaranNominal')) document.getElementById('pengeluaranNominal').value = '';
    if(document.getElementById('pengeluaranKeterangan')) document.getElementById('pengeluaranKeterangan').value = '';
}

function simpanPengeluaran() {
    let tanggal = document.getElementById('pengeluaranTanggal')?.value || new Date().toISOString().split('T')[0];
    let kategori = document.getElementById('pengeluaranKategori')?.value || 'Lain-lain / Tak Terduga';
    let metode = document.getElementById('pengeluaranMetode')?.value || 'TUNAI';
    let nominal = parseInt(document.getElementById('pengeluaranNominal')?.value) || 0;
    let keterangan = document.getElementById('pengeluaranKeterangan')?.value.trim() || '';

    if (!tanggal || nominal <= 0 || !keterangan) {
        return alert('Mohon lengkapi tanggal, nominal, dan keterangan pengeluaran!');
    }

    let expenseItem = {
        id: 'EXP-' + Date.now(),
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif,
        tanggalISO: tanggal,
        waktu: new Date().toLocaleString('id-ID'),
        kategori: kategori,
        metode: metode,
        nominal: nominal,
        keterangan: keterangan
    };

    if (db) {
        db.ref('pengeluaran/' + expenseItem.id).set(expenseItem);
    }

    riwayatPengeluaran.unshift(expenseItem);
    localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(riwayatPengeluaran));

    resetFormPengeluaran();
    alert('Transaksi Pengeluaran Kas Berhasil Disimpan!');
    updateLaporanPengeluaran();
}

function hapusPengeluaranFirebase(id) {
    if (!confirm(`Hapus pengeluaran ${id}?`)) return;
    if (db) {
        db.ref('pengeluaran/' + id).remove();
    } else {
        riwayatPengeluaran = riwayatPengeluaran.filter(e => e.id !== id);
        localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(riwayatPengeluaran));
        updateLaporanPengeluaran();
    }
}

/* ================= HELPER PARSING TANGGAL & NOMINAL ================= */
function parseNominalDinamis(exp) {
    if (!exp) return 0;
    let raw = exp.nominal ?? exp.jumlah ?? exp.total ?? exp.harga ?? exp.biaya ?? 0;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        let clean = raw.replace(/[^0-9]/g, '');
        return parseInt(clean) || 0;
    }
    return 0;
}

function parseTanggalISO(exp) {
    if (!exp) return '';
    if (exp.tanggalISO) return exp.tanggalISO;
    if (exp.tanggal) return exp.tanggal;
    
    let timeStr = exp.waktu || exp.timestamp || exp.date || '';
    if (timeStr) {
        if (/^\d{4}-\d{2}-\d{2}/.test(timeStr)) {
            return timeStr.substring(0, 10);
        }
        let parts = timeStr.split(',')[0].split('/');
        if (parts.length === 3) {
            let day = parts[0].trim().padStart(2, '0');
            let month = parts[1].trim().padStart(2, '0');
            let year = parts[2].trim();
            if (year.length === 4) {
                return `${year}-${month}-${day}`;
            }
        }
    }
    return '';
}

/* ================= LAPORAN TRANSAKSI PENJUALAN ================= */
function setTanggalHariIniIfEmpty() {
    let todayISO = new Date().toISOString().split('T')[0];
    
    let tglMulai = document.getElementById('filterTanggalMulai');
    let tglSelesai = document.getElementById('filterTanggalSelesai');
    if (tglMulai && !tglMulai.value) tglMulai.value = todayISO;
    if (tglSelesai && !tglSelesai.value) tglSelesai.value = todayISO;

    let tglExpMulai = document.getElementById('filterTglPengeluaranMulai');
    let tglExpSelesai = document.getElementById('filterTglPengeluaranSelesai');
    if (tglExpMulai && !tglExpMulai.value) tglExpMulai.value = todayISO;
    if (tglExpSelesai && !tglExpSelesai.value) tglExpSelesai.value = todayISO;

    let pengeluaranTglInput = document.getElementById('pengeluaranTanggal');
    if (pengeluaranTglInput && !pengeluaranTglInput.value) pengeluaranTglInput.value = todayISO;
}

function terapkanFilterLaporan() {
    updateLaporan();
}

function resetFilterLaporan() {
    let todayISO = new Date().toISOString().split('T')[0];
    if(document.getElementById('filterTanggalMulai')) document.getElementById('filterTanggalMulai').value = todayISO;
    if(document.getElementById('filterTanggalSelesai')) document.getElementById('filterTanggalSelesai').value = todayISO;
    updateLaporan();
}

function updateLaporan() {
    setTanggalHariIniIfEmpty();
    let tglMulai = document.getElementById('filterTanggalMulai')?.value || '';
    let tglSelesai = document.getElementById('filterTanggalSelesai')?.value || '';

    let sumberData = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    prosesRenderLaporan(sumberData, tglMulai, tglSelesai);
}

function prosesRenderLaporan(semuaTransaksi, tglMulai, tglSelesai) {
    let filtered = (semuaTransaksi || []).filter(t => {
        if (!t) return false;
        let dateStr = parseTanggalISO(t);
        
        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        } else if (tglMulai) {
            matchDate = dateStr >= tglMulai;
        } else if (tglSelesai) {
            matchDate = dateStr <= tglSelesai;
        }
        
        let matchCabang = false;
        if (cabangAktif === 'SEMUA CABANG') {
            matchCabang = true;
        } else if (cabangAktif === 'DAPUR AYA SEMBAKO') {
            matchCabang = (!t.cabang || t.cabang === 'DAPUR AYA SEMBAKO' || t.cabang === 'DAPUR AYA' || t.cabang === 'AYA TOKO Sembako');
        } else {
            matchCabang = (t.cabang === cabangAktif);
        }

        return matchDate && matchCabang;
    });

    let totalOmset = 0;
    let totalQris = 0;
    let totalCash = 0;
    let totalQty = 0;
    let itemMap = {};

    filtered.forEach(t => {
        let sumTotal = parseNominalDinamis(t);
        totalOmset += sumTotal;
        
        let me = t.metodePembayaran || t.metode || 'TUNAI';
        if (me === 'QRIS') totalQris += sumTotal;
        else if (me === 'TUNAI') totalCash += sumTotal;

        let itemList = [];
        if (Array.isArray(t.items)) {
            itemList = t.items;
        } else if (t.items && typeof t.items === 'object') {
            itemList = Object.values(t.items);
        }

        itemList.forEach(item => {
            if(!item) return;
            let qty = parseInt(item.qty) || 0;
            let harga = parseInt(item.harga) || 0;
            let namaItem = item.nama || 'Tidak Diketahui';
            totalQty += qty;

            if (!itemMap[namaItem]) {
                itemMap[namaItem] = {
                    nama: namaItem,
                    kategori: item.kategori || 'Umum',
                    qty: 0,
                    subtotal: 0
                };
            }
            itemMap[namaItem].qty += qty;
            itemMap[namaItem].subtotal += (harga * qty);
        });
    });

    let elOmset = document.getElementById('statOmset');
    let elQris = document.getElementById('statOmsetQris');
    let elCash = document.getElementById('statUangCash');
    let elQty = document.getElementById('statTotalQty');
    let elTrx = document.getElementById('statTotalTransaksi');

    if (elOmset) elOmset.innerText = 'Rp ' + totalOmset.toLocaleString('id-ID');
    if (elQris) elQris.innerText = 'Rp ' + totalQris.toLocaleString('id-ID');
    if (elCash) elCash.innerText = 'Rp ' + totalCash.toLocaleString('id-ID');
    if (elQty) elQty.innerText = totalQty.toLocaleString('id-ID') + ' Pcs';
    if (elTrx) elTrx.innerText = filtered.length + ' Trx';

    let containerRekap = document.getElementById('tabelRekapItemTerjual');
    if (containerRekap) {
        let itemArray = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
        if (itemArray.length === 0) {
            containerRekap.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-400">Belum ada item terjual pada periode ini</td></tr>`;
        } else {
            let htmlItems = '';
            itemArray.forEach((item, index) => {
                htmlItems += `
                    <tr class="hover:bg-orange-50 transition">
                        <td class="p-2 text-center font-bold text-gray-500">${index + 1}</td>
                        <td class="p-2 font-bold uppercase">${item.nama}</td>
                        <td class="p-2 text-center uppercase text-[10px]"><span class="px-2 py-0.5 bg-gray-100 rounded border">${item.kategori}</span></td>
                        <td class="p-2 text-center font-black text-orange-600">${item.qty} pcs</td>
                        <td class="p-2 text-right font-bold">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
            containerRekap.innerHTML = htmlItems;
        }

        renderChartLaporan(itemArray.slice(0, 7));
    }

    let containerRiwayat = document.getElementById('tabelRiwayatTransaksi');
    if (containerRiwayat) {
        if (filtered.length === 0) {
            containerRiwayat.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-400">Tidak ada riwayat transaksi pada periode ini</td></tr>`;
        } else {
            let htmlRiwayat = '';
            filtered.forEach(t => {
                let itemList = [];
                if (Array.isArray(t.items)) {
                    itemList = t.items;
                } else if (t.items && typeof t.items === 'object') {
                    itemList = Object.values(t.items);
                }

                let detailItemsStr = itemList.map(i => `<span class="inline-block bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded mr-1 mb-1 font-semibold">${i.nama || '-'} <b>(x${i.qty || 0})</b></span>`).join('');
                if(!detailItemsStr) detailItemsStr = '<span class="text-gray-400 italic">Detail item kosong</span>';

                let nominalTrx = parseNominalDinamis(t);
                let metodeTrx = t.metodePembayaran || t.metode || 'TUNAI';

                htmlRiwayat += `
                    <tr class="hover:bg-orange-50 border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${t.id || '-'}</td>
                        <td class="p-2 text-[11px] whitespace-nowrap">${t.waktu || t.tanggalISO || '-'}</td>
                        <td class="p-2 text-[11px] font-bold text-gray-600">${t.cabang || 'Utama'}</td>
                        <td class="p-2">${detailItemsStr}</td>
                        <td class="p-2 text-center font-bold"><span class="px-2 py-0.5 rounded text-[10px] ${metodeTrx === 'QRIS' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">${metodeTrx}</span></td>
                        <td class="p-2 text-right font-black text-orange-700">Rp ${nominalTrx.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center">
                            <button onclick="hapusTransaksiFirebase('${t.id}')" class="text-red-500 font-bold hover:underline">Hapus</button>
                        </td>
                    </tr>
                `;
            });
            containerRiwayat.innerHTML = htmlRiwayat;
        }
    }
}

/* ================= LAPORAN PENGELUARAN REALTIME ================= */
function terapkanFilterPengeluaran() {
    updateLaporanPengeluaran();
}

function updateLaporanPengeluaran() {
    setTanggalHariIniIfEmpty();
    let tglMulai = document.getElementById('filterTglPengeluaranMulai')?.value || '';
    let tglSelesai = document.getElementById('filterTglPengeluaranSelesai')?.value || '';
    let katFilter = document.getElementById('filterKategoriPengeluaran')?.value || 'SEMUA';

    let sumberData = (db && dataPengeluaranFirebase.length > 0) ? dataPengeluaranFirebase : riwayatPengeluaran;
    prosesRenderLaporanPengeluaran(sumberData, tglMulai, tglSelesai, katFilter);
}

function prosesRenderLaporanPengeluaran(semuaPengeluaran, tglMulai, tglSelesai, katFilter) {
    let filtered = (semuaPengeluaran || []).filter(exp => {
        if (!exp) return false;
        
        let dateStr = parseTanggalISO(exp);
        
        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        } else if (tglMulai) {
            matchDate = dateStr >= tglMulai;
        } else if (tglSelesai) {
            matchDate = dateStr <= tglSelesai;
        }

        let matchCabang = false;
        if (cabangAktif === 'SEMUA CABANG') {
            matchCabang = true;
        } else if (cabangAktif === 'DAPUR AYA SEMBAKO') {
            matchCabang = (!exp.cabang || exp.cabang === 'DAPUR AYA SEMBAKO' || exp.cabang === 'DAPUR AYA' || exp.cabang === 'AYA TOKO Sembako');
        } else {
            matchCabang = (exp.cabang === cabangAktif);
        }

        let matchKategori = (katFilter === 'SEMUA') || (exp.kategori === katFilter);
        return matchDate && matchCabang && matchKategori;
    });

    let totalPengeluaran = 0;
    let totalTunai = 0;
    let totalTransfer = 0;
    let mapKategori = {};

    filtered.forEach(exp => {
        let nominal = parseNominalDinamis(exp);
        totalPengeluaran += nominal;

        let metode = exp.metode || exp.sumber || 'TUNAI';
        if (metode === 'TRANSFER') totalTransfer += nominal;
        else totalTunai += nominal;

        let kat = exp.kategori || 'Lain-lain / Tak Terduga';
        if (!mapKategori[kat]) mapKategori[kat] = 0;
        mapKategori[kat] += nominal;
    });

    let totalOmsetSaatIni = 0;
    let sumberTx = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    sumberTx.filter(t => {
        if(!t) return false;
        let dateStr = parseTanggalISO(t);
        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        }
        let matchCabang = false;
        if (cabangAktif === 'SEMUA CABANG') {
            matchCabang = true;
        } else if (cabangAktif === 'DAPUR AYA SEMBAKO') {
            matchCabang = (!t.cabang || t.cabang === 'DAPUR AYA SEMBAKO' || t.cabang === 'DAPUR AYA' || t.cabang === 'AYA TOKO Sembako');
        } else {
            matchCabang = (t.cabang === cabangAktif);
        }
        return matchDate && matchCabang;
    }).forEach(t => totalOmsetSaatIni += parseNominalDinamis(t));

    let arusKasBersih = totalOmsetSaatIni - totalPengeluaran;

    let elTotalExp = document.getElementById('statTotalPengeluaran');
    let elTunaiExp = document.getElementById('statPengeluaranTunai');
    let elTrfExp = document.getElementById('statPengeluaranTransfer');
    let elKasBersih = document.getElementById('statArusKasBersih');

    if (elTotalExp) elTotalExp.innerText = 'Rp ' + totalPengeluaran.toLocaleString('id-ID');
    if (elTunaiExp) elTunaiExp.innerText = 'Rp ' + totalTunai.toLocaleString('id-ID');
    if (elTrfExp) elTrfExp.innerText = 'Rp ' + totalTransfer.toLocaleString('id-ID');
    if (elKasBersih) {
        elKasBersih.innerText = 'Rp ' + arusKasBersih.toLocaleString('id-ID');
        elKasBersih.className = arusKasBersih >= 0 ? "text-lg font-black text-emerald-700" : "text-lg font-black text-red-600";
    }

    let containerTabel = document.getElementById('tabelRiwayatPengeluaran');
    if (containerTabel) {
        if (filtered.length === 0) {
            containerTabel.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-400">Tidak ada catatan pengeluaran pada periode ini</td></tr>`;
        } else {
            let html = '';
            filtered.forEach(exp => {
                let ket = exp.keterangan || exp.deskripsi || exp.nama || exp.catatan || '-';
                let nominal = parseNominalDinamis(exp);
                let tglDisplay = exp.waktu || exp.tanggalISO || exp.tanggal || '-';
                
                html += `
                    <tr class="hover:bg-red-50 border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${exp.id || '-'}</td>
                        <td class="p-2 text-[11px] whitespace-nowrap">${tglDisplay}</td>
                        <td class="p-2 text-[11px] font-bold text-gray-600">${exp.cabang || 'Utama'}</td>
                        <td class="p-2 font-semibold text-red-700">${exp.kategori || 'Lain-lain'}</td>
                        <td class="p-2 font-medium">${ket}</td>
                        <td class="p-2 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${exp.metode === 'TRANSFER' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}">${exp.metode || 'TUNAI'}</span></td>
                        <td class="p-2 text-right font-black text-red-600">Rp ${nominal.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center">
                            <button onclick="hapusPengeluaranFirebase('${exp.id}')" class="text-red-500 font-bold hover:underline">Hapus</button>
                        </td>
                    </tr>
                `;
            });
            containerTabel.innerHTML = html;
        }
    }

    renderChartPengeluaran(mapKategori);
}

function renderChartLaporan(topItems) {
    let canvas = document.getElementById('chartProdukLaku');
    if(!canvas) return;
    let ctx = canvas.getContext('2d');
    if(myChart) myChart.destroy();

    let labels = topItems.map(i => i.nama);
    let dataQty = topItems.map(i => i.qty);

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Terjual (Qty)',
                data: dataQty,
                backgroundColor: 'rgba(234, 88, 12, 0.8)',
                borderColor: 'rgba(194, 65, 12, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderChartPengeluaran(mapKategori) {
    let canvas = document.getElementById('chartPengeluaran');
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    if (myExpenseChart) myExpenseChart.destroy();

    let labels = Object.keys(mapKategori);
    let values = Object.values(mapKategori);

    if(labels.length === 0) {
        labels = ['Belum Ada Data'];
        values = [0];
    }

    myExpenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
                    '#06b6d4', '#6366f1', '#a855f7', '#ec4899'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function hapusTransaksiFirebase(id) {
    if(!confirm(`Hapus transaksi ${id}?`)) return;
    if(db) {
        db.ref('transaksi/' + id).remove();
    } else {
        riwayatTransaksi = riwayatTransaksi.filter(t => t.id !== id);
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
        updateLaporan();
    }
}

/* ================= KALKULATOR & BACK OFFICE ================= */
let calcExpr = '';
function calcInput(v) { calcExpr += v; if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = calcExpr; }
function calcOp(op) { calcExpr += op; if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = calcExpr; }
function calcClear() { calcExpr = ''; if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = ''; }
function calcEqual() {
    try {
        calcExpr = eval(calcExpr).toString();
        if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = calcExpr;
    } catch { if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = 'Error'; }
}

function renderInventaris() {}
function simpanInventaris() {}
function simpanPelanggan() {}
function simpanSupplier() {}
function simpanKaryawan() {}
function tambahBarangTitipan() {}
function simpanAbsensi() {}
function cetakSPK() {}
function simpanSettingNota() {}

/* ================= INISIALISASI LISTENER REALTIME ================= */
document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    renderMasterData();
    setTanggalHariIniIfEmpty();
    
    if(db) {
        db.ref('menu_tambahan').on('value', (s) => {
            let val = s.val();
            if(val && typeof databaseMenu !== 'undefined') {
                Object.values(val).forEach(m => {
                    let idx = databaseMenu.findIndex(dm => String(dm.id) === String(m.id));
                    if(idx !== -1) databaseMenu[idx] = m;
                    else databaseMenu.push(m);
                });
                renderMenu();
                renderMasterData();
            }
        });

        db.ref('transaksi').on('value', (snapshot) => {// Konfigurasi Database Firebase Kasir AYA Group
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
        console.log("Firebase Realtime Database Terhubung Berhasil!");
    }
} catch(e) { 
    console.error("Inisialisasi Firebase Gagal:", e); 
}

// Variable Global Storage Internal & Temporary
let keranjang = [];
let keranjangPengeluaran = [];
let transaksiDitahan = [];
let cabangAktif = 'SEMUA CABANG';
let dataTransaksiFirebase = [];
let dataPengeluaranFirebase = [];
let dataModalFirebase = [];

let pelangganList = JSON.parse(localStorage.getItem('aya_pelanggan')) || [];
let supplierList = JSON.parse(localStorage.getItem('aya_supplier')) || [];
let karyawanList = JSON.parse(localStorage.getItem('aya_karyawan')) || [];
let absensiList = JSON.parse(localStorage.getItem('aya_absensi')) || [];
let inventarisList = JSON.parse(localStorage.getItem('aya_inventaris')) || [];
let barangTitipan = JSON.parse(localStorage.getItem('aya_titipan_v3')) || [];
let riwayatTransaksi = JSON.parse(localStorage.getItem('aya_transaksi_v3')) || [];
let riwayatPengeluaran = JSON.parse(localStorage.getItem('aya_pengeluaran_v3')) || [];
let riwayatModal = JSON.parse(localStorage.getItem('aya_modal_v3')) || [];

let kategoriAktif = 'topping';
let metodePembayaran = 'TUNAI';
let myChart = null;
let myExpenseChart = null;

// GANTI CABANG MANUAL
function gantiCabang(namaCabang) {
    cabangAktif = namaCabang;
    let lblCabang = document.getElementById('lblCabangKasir');
    if(lblCabang) lblCabang.innerText = namaCabang;
    let txtCabang = document.getElementById('txtCabangInv');
    if(txtCabang) txtCabang.innerText = namaCabang;
    
    renderInventaris();
    updateLaporan();
    updateLaporanPengeluaran();
}

// BUKA DAN TUTUP TAB
function switchTab(tab) {
    ['master', 'cabang', 'kasir', 'pembelian', 'pengeluaran', 'laporan', 'laporan_pengeluaran', 'backoffice', 'user', 'setting'].forEach(t => {
        let el = document.getElementById('tab-' + t);
        let btn = document.getElementById('btn-tab-' + t);
        if (el) el.classList.add('hidden');
        if (btn) btn.classList.remove('bg-orange-700');
    });

    let targetTab = document.getElementById('tab-' + tab);
    let targetBtn = document.getElementById('btn-tab-' + tab);
    if (targetTab) targetTab.classList.remove('hidden');
    if (targetBtn) targetBtn.classList.add('bg-orange-700');

    if(tab === 'master') renderMasterData();
    if(tab === 'laporan') updateLaporan();
    if(tab === 'laporan_pengeluaran') updateLaporanPengeluaran();
    if(tab === 'cabang') renderInventaris();
}

function switchSubMaster(sub) {
    ['barang', 'titipan', 'pelanggan', 'supplier', 'karyawan'].forEach(s => {
        let el = document.getElementById('sec-master-' + s);
        if(el) el.classList.add('hidden');
    });
    let targetSub = document.getElementById('sec-master-' + sub);
    if(targetSub) targetSub.classList.remove('hidden');
}

/* ================= MANAJEMEN MASTER DATA ================= */
function hitungEstimasiProfitMaster() {
    let isi = parseInt(document.getElementById('masterIsi')?.value) || 1;
    let hBeliTotal = parseInt(document.getElementById('masterHargaBeli')?.value) || 0;
    let hJual = parseInt(document.getElementById('masterHargaJual')?.value) || 0;

    let hppSatuan = Math.round(hBeliTotal / (isi > 0 ? isi : 1));
    let profit = hJual - hppSatuan;

    let el = document.getElementById('masterEstimasiProfit');
    if(el) el.innerText = `Rp ${profit.toLocaleString('id-ID')} (HPP: Rp ${hppSatuan.toLocaleString('id-ID')})`;
}

function simpanMasterDatabase() {
    let nama = document.getElementById('masterNama')?.value.trim() || '';
    let barcode = document.getElementById('masterBarcode')?.value.trim() || 'BRG-' + Date.now();
    let hJual = parseInt(document.getElementById('masterHargaJual')?.value) || 0;
    let hBeliTotal = parseInt(document.getElementById('masterHargaBeli')?.value) || 0;
    let isi = parseInt(document.getElementById('masterIsi')?.value) || 1;

    if (!nama || hJual <= 0) return alert('Mohon lengkapi nama dan harga jual!');

    let hppSatuan = Math.round(hBeliTotal / isi);
    let item = {
        id: barcode,
        nama: nama,
        kategori: document.getElementById('masterKategori')?.value || 'topping',
        satuan: document.getElementById('masterSatuan')?.value || 'pcs',
        isi: isi,
        hargaBeliTotal: hBeliTotal,
        hargaBeli: hppSatuan,
        harga: hJual
    };

    if(db) {
        db.ref('menu_tambahan/' + barcode).set(item);
    } else {
        if(typeof databaseMenu !== 'undefined') databaseMenu.push(item);
    }
    resetFormMaster();
    renderMasterData();
    renderMenu();
    alert('Master Produk Berhasil Disimpan!');
}

function resetFormMaster() {
    if(document.getElementById('masterNama')) document.getElementById('masterNama').value = '';
    if(document.getElementById('masterBarcode')) document.getElementById('masterBarcode').value = '';
    if(document.getElementById('masterHargaBeli')) document.getElementById('masterHargaBeli').value = '';
    if(document.getElementById('masterHargaJual')) document.getElementById('masterHargaJual').value = '';
}

function renderMasterData() {
    let tbody = document.getElementById('tabelMasterData');
    if (!tbody || typeof databaseMenu === 'undefined') return;
    let html = '';
    databaseMenu.forEach(item => {
        let hpp = item.hargaBeli || 0;
        let laba = (item.harga || 0) - hpp;
        html += `
            <tr class="hover:bg-orange-50 border-b">
                <td class="p-2 font-mono text-[10px]">${item.id || '-'}</td>
                <td class="p-2 font-bold uppercase">${item.nama || '-'}</td>
                <td class="p-2 text-center">${item.kategori || '-'}</td>
                <td class="p-2 text-center">${item.isi || 1} ${item.satuan || 'pcs'}</td>
                <td class="p-2 text-right">Rp ${hpp.toLocaleString('id-ID')}</td>
                <td class="p-2 text-right font-bold">Rp ${(item.harga || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-right text-emerald-600 font-bold">Rp ${laba.toLocaleString('id-ID')}</td>
                <td class="p-2 text-center">
                    <button onclick="hapusMasterData('${item.id}')" class="text-red-600 font-bold">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function hapusMasterData(id) {
    if(!confirm('Hapus barang ini dari database?')) return;
    if(db) db.ref('menu_tambahan/' + id).remove();
    if(typeof databaseMenu !== 'undefined') {
        let idx = databaseMenu.findIndex(m => String(m.id) === String(id));
        if(idx !== -1) databaseMenu.splice(idx, 1);
    }
    renderMasterData();
    renderMenu();
}

/* ================= KASIR PENJUALAN ================= */
function filterKategori(kat) {
    kategoriAktif = kat;
    ['topping', 'makanan', 'dingin', 'panas', 'jajanan'].forEach(k => {
        let btn = document.getElementById('btn-kat-' + k);
        if(btn) btn.className = "px-3 py-1.5 bg-gray-100 text-gray-700 font-bold rounded";
    });
    let activeBtn = document.getElementById('btn-kat-' + kat);
    if(activeBtn) activeBtn.className = "px-3 py-1.5 bg-orange-600 text-white font-bold rounded shadow";

    renderMenu();
}

function cariMenuKasir() {
    let query = document.getElementById('cariMenuKasir')?.value.toLowerCase().trim() || '';
    if(!query) {
        renderMenu();
        return;
    }
    if(typeof databaseMenu === 'undefined') return;
    let filtered = databaseMenu.filter(m => 
        (m.nama && m.nama.toLowerCase().includes(query)) || String(m.id).toLowerCase().includes(query)
    );
    renderMenu(filtered);
}

function renderMenu(customList = null) {
    const container = document.getElementById('container-menu');
    if(!container || typeof databaseMenu === 'undefined') return;
    container.innerHTML = '';

    let list = customList || databaseMenu.filter(m => m.kategori === kategoriAktif);
    if(list.length === 0) {
        container.innerHTML = '<p class="col-span-3 text-center text-gray-400 py-8 text-xs">Menu tidak ditemukan</p>';
        return;
    }
    list.forEach(item => {
        container.innerHTML += `
            <div onclick="tambahItem('${item.id}')" class="p-2 bg-white border border-orange-200 rounded-lg shadow-sm cursor-pointer hover:border-orange-500 hover:shadow transition">
                <p class="font-bold text-xs uppercase line-clamp-1">${item.nama || '-'}</p>
                <p class="text-orange-600 font-black text-xs">Rp ${(item.harga || 0).toLocaleString('id-ID')}</p>
            </div>
        `;
    });
}

function tambahItem(id) {
    if(typeof databaseMenu === 'undefined') return;
    let prod = databaseMenu.find(p => String(p.id) === String(id));
    if(!prod) return;
    let ada = keranjang.find(k => String(k.id) === String(id));
    if(ada) { ada.qty += 1; } 
    else { keranjang.push({ ...prod, qty: 1 }); }
    updateKeranjang();
}

function updateKeranjang() {
    let container = document.getElementById('tabelKeranjang');
    if(!container) return;
    if(keranjang.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4 text-xs">Belum ada item dipilih</p>';
        if(document.getElementById('textTotal')) document.getElementById('textTotal').innerText = 'Rp 0';
        return;
    }

    let html = '';
    let total = 0;
    keranjang.forEach(item => {
        let harga = item.harga || 0;
        let sub = harga * item.qty;
        total += sub;
        html += `
            <div class="flex justify-between items-center py-1 border-b text-xs">
                <div class="flex-1 truncate">
                    <p class="font-bold uppercase">${item.nama || '-'}</p>
                    <p class="text-[10px] text-gray-500">@ Rp ${harga.toLocaleString('id-ID')}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="ubahQty('${item.id}', -1)" class="px-1.5 bg-gray-200 font-bold rounded hover:bg-gray-300">-</button>
                    <span class="font-bold">${item.qty}</span>
                    <button onclick="ubahQty('${item.id}', 1)" class="px-1.5 bg-orange-500 text-white font-bold rounded hover:bg-orange-600">+</button>
                </div>
                <span class="font-bold w-16 text-right">Rp ${sub.toLocaleString('id-ID')}</span>
            </div>
        `;
    });

    let styro = (parseInt(document.getElementById('inputStyrofoam')?.value) || 0) * 1000;
    total += styro;

    container.innerHTML = html;
    if(document.getElementById('textTotal')) document.getElementById('textTotal').innerText = 'Rp ' + total.toLocaleString('id-ID');
    hitungKembalian();
}

function ubahQty(id, delta) {
    let ada = keranjang.find(k => String(k.id) === String(id));
    if(ada) {
        ada.qty += delta;
        if(ada.qty <= 0) keranjang = keranjang.filter(k => String(k.id) !== String(id));
    }
    updateKeranjang();
}

function setMetodePembayaran(m) {
    metodePembayaran = m;
    ['tunai', 'qris', 'hutang', 'konsumsi'].forEach(btn => {
        let el = document.getElementById('btn-bayar-' + btn);
        if(el) el.className = "py-1.5 rounded bg-gray-200 text-gray-700 font-bold";
    });
    let mapKey = m.toLowerCase() === 'personal' ? 'konsumsi' : m.toLowerCase();
    let selectedBtn = document.getElementById('btn-bayar-' + mapKey);
    if(selectedBtn) selectedBtn.className = "py-1.5 rounded bg-orange-600 text-white font-bold";
}

function hitungKembalian() {
    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let bayarInput = document.getElementById('inputBayar')?.value;
    
    if (bayarInput === '' || bayarInput === null || bayarInput === undefined) {
        if(document.getElementById('textKembalian')) {
            document.getElementById('textKembalian').innerText = 'Rp 0';
        }
        return;
    }

    let bayar = parseInt(bayarInput) || 0;
    let kembalian = bayar - total;
    if(document.getElementById('textKembalian')) {
        document.getElementById('textKembalian').innerText = kembalian >= 0 ? 'Rp ' + kembalian.toLocaleString('id-ID') : 'Uang Kurang';
    }
}

/* ================= ALGORITMA TAHAN TRANSAKSI ================= */
function tahanTransaksi() {
    if(keranjang.length === 0) return alert('Keranjang kosong!');
    
    let styro = parseInt(document.getElementById('inputStyrofoam')?.value) || 0;
    let subtotalItems = keranjang.reduce((acc, item) => acc + ((item.harga || 0) * item.qty), 0);
    let totalNominal = subtotalItems + (styro * 1000);

    transaksiDitahan.push({
        id: 'HOLD-' + Date.now(),
        items: [...keranjang],
        styrofoam: styro,
        metode: metodePembayaran,
        totalNominal: totalNominal,
        waktu: new Date().toLocaleTimeString('id-ID')
    });
    
    keranjang = [];
    if(document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = 0;
    if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
    
    updateKeranjang();
    renderHeldOrders();
    alert('Transaksi berhasil ditahan!');
}

function renderHeldOrders() {
    let box = document.getElementById('boxHeldOrders');
    let container = document.getElementById('listHeldOrders');
    if(!box || !container) return;
    
    if(transaksiDitahan.length === 0) {
        box.classList.add('hidden');
        return;
    }
    
    box.classList.remove('hidden');
    container.innerHTML = '';
    
    transaksiDitahan.forEach((t, i) => {
        let itemsDetailHtml = t.items.map(item => {
            let itemSub = (item.harga || 0) * item.qty;
            return `
                <div class="flex justify-between items-center text-[11px] py-0.5 border-b border-amber-100">
                    <span>${item.nama} <b class="text-amber-800">x${item.qty}</b></span>
                    <span class="font-mono">@Rp${(item.harga||0).toLocaleString('id-ID')} = <b>Rp${itemSub.toLocaleString('id-ID')}</b></span>
                </div>
            `;
        }).join('');

        if (t.styrofoam > 0) {
            itemsDetailHtml += `
                <div class="flex justify-between items-center text-[11px] py-0.5 border-b border-amber-100 italic">
                    <span>Styrofoam x${t.styrofoam}</span>
                    <span class="font-mono">Rp${(t.styrofoam * 1000).toLocaleString('id-ID')}</span>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="p-2.5 bg-amber-50 border border-amber-300 rounded-lg shadow-sm mb-2">
                <div class="flex justify-between items-center pb-1 border-b border-amber-200 mb-1">
                    <span class="font-bold text-amber-900 text-xs">📋 Jam: ${t.waktu}</span>
                    <span class="font-bold text-xs text-orange-700 font-mono">Total: Rp ${(t.totalNominal || 0).toLocaleString('id-ID')}</span>
                </div>
                
                <div class="my-1 max-h-24 overflow-y-auto pr-1">
                    ${itemsDetailHtml}
                </div>

                <div class="flex gap-2 mt-2 pt-1">
                    <button onclick="resumeTransaksi(${i})" class="flex-1 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow transition">
                        🔄 Panggil Transaksi
                    </button>
                    <button onclick="hapusTransaksiDitahan(${i})" class="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded shadow transition" title="Batal & Hapus">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    });
}

function hapusTransaksiDitahan(index) {
    if (confirm('Hapus transaksi ditahan ini?')) {
        transaksiDitahan.splice(index, 1);
        renderHeldOrders();
    }
}

function resumeTransaksi(index) {
    if (keranjang.length > 0) {
        if (!confirm('Keranjang saat ini tidak kosong. Ingin menimpa/melanjutkan transaksi yang ditahan?')) {
            return;
        }
    }
    
    let target = transaksiDitahan[index];
    keranjang = [...target.items];
    if(document.getElementById('inputStyrofoam')) {
        document.getElementById('inputStyrofoam').value = target.styrofoam || 0;
    }
    if(target.metode) {
        setMetodePembayaran(target.metode);
    }
    
    transaksiDitahan.splice(index, 1);
    updateKeranjang();
    renderHeldOrders();
}

/* ================= SIMPAN TRANSAKSI & VALIDASI PENJUALAN ================= */
function simpanTransaksi() {
    if(keranjang.length === 0) { 
        alert('Keranjang Kosong!'); 
        return false; 
    }

    let bayarVal = document.getElementById('inputBayar')?.value;
    if (bayarVal === '' || bayarVal === null || bayarVal === undefined) {
        alert('Nominal uang belum diisi!');
        return false;
    }

    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let bayar = parseInt(bayarVal) || 0;

    if (bayar < total && metodePembayaran === 'TUNAI') {
        alert('Jumlah bayar kurang dari total tagihan!');
        return false;
    }

    let nota = {
        id: 'NOTA-' + Date.now(),
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif,
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: new Date().toISOString().split('T')[0],
        items: [...keranjang],
        styrofoam: parseInt(document.getElementById('inputStyrofoam')?.value) || 0,
        total: total,
        bayar: bayar,
        metodePembayaran: metodePembayaran
    };

    if(db) {
        db.ref('transaksi/' + nota.id).set(nota);
    }
    
    riwayatTransaksi.unshift(nota);
    localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));

    return true;
}

function tombolSimpanSaja() {
    if(simpanTransaksi()) {
        alert('Transaksi Berhasil Disimpan!');
        keranjang = [];
        if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
        if(document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = 0;
        updateKeranjang();
    }
}

function cetakNota() {
    if(keranjang.length === 0) return alert('Keranjang belanja kosong!');
    
    let bayarVal = document.getElementById('inputBayar')?.value;
    if (bayarVal === '' || bayarVal === null || bayarVal === undefined) {
        alert('Nominal uang belum diisi!');
        return;
    }

    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let bayar = parseInt(bayarVal) || 0;

    if (bayar < total && metodePembayaran === 'TUNAI') {
        alert('Jumlah bayar kurang dari total tagihan!');
        return;
    }

    let htmlItems = '';
    keranjang.forEach(i => {
        let harga = i.harga || 0;
        let sub = harga * i.qty;
        htmlItems += `
            <div class="nota-item-row font-bold">
                <span>${i.nama || '-'}</span>
                <div class="nota-item-detail">
                    <span>${i.qty} x ${harga.toLocaleString('id-ID')}</span>
                    <span>Rp${sub.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });

    let styroQty = parseInt(document.getElementById('inputStyrofoam')?.value) || 0;
    if (styroQty > 0) {
        let subStyro = styroQty * 1000;
        htmlItems += `
            <div class="nota-item-row font-bold">
                <span>Styrofoam</span>
                <div class="nota-item-detail">
                    <span>${styroQty} x 1.000</span>
                    <span>Rp${subStyro.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    }

    if(document.getElementById('notaItems')) document.getElementById('notaItems').innerHTML = htmlItems;
    if(document.getElementById('notaWaktu')) document.getElementById('notaWaktu').innerText = "Waktu: " + new Date().toLocaleString('id-ID');
    if(document.getElementById('notaMetode')) document.getElementById('notaMetode').innerText = "Metode: " + metodePembayaran;
    if(document.getElementById('notaTotal')) {
        document.getElementById('notaTotal').innerHTML = `
            <div class="flex justify-between font-bold"><span>TOTAL :</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
            <div class="flex justify-between font-bold text-[9px]"><span>BAYAR :</span><span>Rp ${bayar.toLocaleString('id-ID')}</span></div>
            <div class="flex justify-between font-bold text-[9px]"><span>KEMBALI :</span><span>Rp ${(bayar - total).toLocaleString('id-ID')}</span></div>
        `;
    }

    const area = document.getElementById('areaNota');
    if(area) area.style.display = 'block';
    setTimeout(() => {
        window.print();
        if(area) area.style.display = 'none';
        if (simpanTransaksi()) {
            keranjang = [];
            if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
            if(document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = 0;
            updateKeranjang();
        }
    }, 300);
}

/* ================= FITUR BARU: MANAJEMEN TAMBAH MODAL ================= */
function simpanSuntikanModal() {
    let tgl = document.getElementById('modalTanggal')?.value || new Date().toISOString().split('T')[0];
    let nominal = parseInt(document.getElementById('modalNominal')?.value) || 0;
    let sumber = document.getElementById('modalSumber')?.value || 'TUNAI';
    let ket = document.getElementById('modalKeterangan')?.value.trim() || 'Tambah Modal Kasir';

    if (nominal <= 0) {
        return alert('Mohon masukkan nominal modal yang valid!');
    }

    let modalObj = {
        id: 'MODAL-' + Date.now(),
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif,
        tanggalISO: tgl,
        waktu: new Date().toLocaleString('id-ID'),
        nominal: nominal,
        sumber: sumber,
        keterangan: ket
    };

    if (db) {
        db.ref('modal/' + modalObj.id).set(modalObj);
    }

    riwayatModal.unshift(modalObj);
    localStorage.setItem('aya_modal_v3', JSON.stringify(riwayatModal));

    if (document.getElementById('modalNominal')) document.getElementById('modalNominal').value = '';
    if (document.getElementById('modalKeterangan')) document.getElementById('modalKeterangan').value = '';

    alert('Suntikan Modal Kas Berhasil Disimpan!');
    updateLaporan();
    updateLaporanPengeluaran();
}

function hapusModalFirebase(id) {
    if (!confirm(`Hapus data modal ${id}?`)) return;
    if (db) {
        db.ref('modal/' + id).remove();
    } else {
        riwayatModal = riwayatModal.filter(m => m.id !== id);
        localStorage.setItem('aya_modal_v3', JSON.stringify(riwayatModal));
        updateLaporan();
        updateLaporanPengeluaran();
    }
}

/* ================= MANAJEMEN PENGELUARAN (EXPENSES) ================= */
function hitungSubtotalItemPengeluaran() {
    let qty = parseInt(document.getElementById('itemPengeluaranQty')?.value) || 0;
    let harga = parseInt(document.getElementById('itemPengeluaranHarga')?.value) || 0;
    let subtotal = qty * harga;
    let lbl = document.getElementById('lblSubtotalItemPengeluaran');
    if (lbl) lbl.innerText = 'Rp ' + subtotal.toLocaleString('id-ID');
}

function tambahItemKeranjangPengeluaran() {
    let nama = document.getElementById('itemPengeluaranNama')?.value.trim();
    let kategori = document.getElementById('itemPengeluaranKategori')?.value;
    let satuan = document.getElementById('itemPengeluaranSatuan')?.value.trim() || 'pcs';
    let qty = parseInt(document.getElementById('itemPengeluaranQty')?.value) || 0;
    let harga = parseInt(document.getElementById('itemPengeluaranHarga')?.value) || 0;

    if (!nama || qty <= 0 || harga <= 0) {
        return alert('Mohon isi nama barang, qty, dan harga satuan secara valid!');
    }

    keranjangPengeluaran.push({
        id: 'EXPI-' + Date.now(),
        nama: nama,
        kategori: kategori,
        satuan: satuan,
        qty: qty,
        harga: harga,
        subtotal: qty * harga
    });

    if (document.getElementById('itemPengeluaranNama')) document.getElementById('itemPengeluaranNama').value = '';
    if (document.getElementById('itemPengeluaranQty')) document.getElementById('itemPengeluaranQty').value = 1;
    if (document.getElementById('itemPengeluaranHarga')) document.getElementById('itemPengeluaranHarga').value = '';
    hitungSubtotalItemPengeluaran();
    renderKeranjangPengeluaran();
}

function hapusItemKeranjangPengeluaran(index) {
    keranjangPengeluaran.splice(index, 1);
    renderKeranjangPengeluaran();
}

function renderKeranjangPengeluaran() {
    let tbody = document.getElementById('tabelKeranjangPengeluaran');
    let totalTxt = document.getElementById('textTotalPengeluaranNota');
    if (!tbody) return;

    if (keranjangPengeluaran.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-400">Belum ada item ditambahkan ke keranjang pengeluaran</td></tr>`;
        if (totalTxt) totalTxt.innerText = 'Rp 0';
        return;
    }

    let html = '';
    let total = 0;
    keranjangPengeluaran.forEach((item, index) => {
        total += item.subtotal;
        html += `
            <tr class="hover:bg-red-50 border-b">
                <td class="p-2 text-center font-bold text-gray-500">${index + 1}</td>
                <td class="p-2 font-bold uppercase">${item.nama}</td>
                <td class="p-2 font-semibold text-red-700 text-[11px]">${item.kategori}</td>
                <td class="p-2 text-center font-bold">${item.qty} ${item.satuan}</td>
                <td class="p-2 text-right">Rp ${item.harga.toLocaleString('id-ID')}</td>
                <td class="p-2 text-right font-black text-red-600">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                <td class="p-2 text-center">
                    <button onclick="hapusItemKeranjangPengeluaran(${index})" class="text-red-500 font-bold hover:underline">❌</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    if (totalTxt) totalTxt.innerText = 'Rp ' + total.toLocaleString('id-ID');
}

function resetFormPengeluaran() {
    let todayISO = new Date().toISOString().split('T')[0];
    if(document.getElementById('pengeluaranTanggal')) document.getElementById('pengeluaranTanggal').value = todayISO;
    if(document.getElementById('pengeluaranKeteranganNota')) document.getElementById('pengeluaranKeteranganNota').value = '';
    keranjangPengeluaran = [];
    renderKeranjangPengeluaran();
}

function simpanPengeluaran() {
    if (keranjangPengeluaran.length === 0) {
        return alert('Keranjang pengeluaran masih kosong! Tambahkan minimal 1 item terlebih dahulu.');
    }

    let tanggal = document.getElementById('pengeluaranTanggal')?.value || new Date().toISOString().split('T')[0];
    let metode = document.getElementById('pengeluaranMetode')?.value || 'TUNAI';
    let ketNota = document.getElementById('pengeluaranKeteranganNota')?.value.trim() || 'Pengeluaran Kas';
    let totalNominal = keranjangPengeluaran.reduce((acc, curr) => acc + curr.subtotal, 0);

    let expenseItem = {
        id: 'EXP-' + Date.now(),
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif,
        tanggalISO: tanggal,
        waktu: new Date().toLocaleString('id-ID'),
        kategori: keranjangPengeluaran[0].kategori || 'Operasional',
        metode: metode,
        nominal: totalNominal,
        keterangan: ketNota,
        items: [...keranjangPengeluaran]
    };

    if (db) {
        db.ref('pengeluaran/' + expenseItem.id).set(expenseItem);
    }

    riwayatPengeluaran.unshift(expenseItem);
    localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(riwayatPengeluaran));

    resetFormPengeluaran();
    alert('Transaksi Pengeluaran Kas Berhasil Disimpan!');
    updateLaporanPengeluaran();
}

function hapusPengeluaranFirebase(id) {
    if (!confirm(`Hapus pengeluaran ${id}?`)) return;
    if (db) {
        db.ref('pengeluaran/' + id).remove();
    } else {
        riwayatPengeluaran = riwayatPengeluaran.filter(e => e.id !== id);
        localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(riwayatPengeluaran));
        updateLaporanPengeluaran();
    }
}

/* ================= HELPER PARSING TANGGAL & NOMINAL ================= */
function parseNominalDinamis(exp) {
    if (!exp) return 0;
    let raw = exp.nominal ?? exp.jumlah ?? exp.total ?? exp.harga ?? exp.biaya ?? 0;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        let clean = raw.replace(/[^0-9]/g, '');
        return parseInt(clean) || 0;
    }
    return 0;
}

function parseTanggalISO(exp) {
    if (!exp) return '';
    if (exp.tanggalISO) return exp.tanggalISO;
    if (exp.tanggal) return exp.tanggal;
    
    let timeStr = exp.waktu || exp.timestamp || exp.date || '';
    if (timeStr) {
        if (/^\d{4}-\d{2}-\d{2}/.test(timeStr)) {
            return timeStr.substring(0, 10);
        }
        let parts = timeStr.split(',')[0].split('/');
        if (parts.length === 3) {
            let day = parts[0].trim().padStart(2, '0');
            let month = parts[1].trim().padStart(2, '0');
            let year = parts[2].trim();
            if (year.length === 4) {
                return `${year}-${month}-${day}`;
            }
        }
    }
    return '';
}

/* ================= LAPORAN TRANSAKSI PENJUALAN & MODAL ================= */
function setTanggalHariIniIfEmpty() {
    let todayISO = new Date().toISOString().split('T')[0];
    
    let tglMulai = document.getElementById('filterTanggalMulai');
    let tglSelesai = document.getElementById('filterTanggalSelesai');
    if (tglMulai && !tglMulai.value) tglMulai.value = todayISO;
    if (tglSelesai && !tglSelesai.value) tglSelesai.value = todayISO;

    let tglExpMulai = document.getElementById('filterTglPengeluaranMulai');
    let tglExpSelesai = document.getElementById('filterTglPengeluaranSelesai');
    if (tglExpMulai && !tglExpMulai.value) tglExpMulai.value = todayISO;
    if (tglExpSelesai && !tglExpSelesai.value) tglExpSelesai.value = todayISO;

    let pengeluaranTglInput = document.getElementById('pengeluaranTanggal');
    if (pengeluaranTglInput && !pengeluaranTglInput.value) pengeluaranTglInput.value = todayISO;

    let modalTglInput = document.getElementById('modalTanggal');
    if (modalTglInput && !modalTglInput.value) modalTglInput.value = todayISO;
}

function terapkanFilterLaporan() {
    updateLaporan();
}

function resetFilterLaporan() {
    let todayISO = new Date().toISOString().split('T')[0];
    if(document.getElementById('filterTanggalMulai')) document.getElementById('filterTanggalMulai').value = todayISO;
    if(document.getElementById('filterTanggalSelesai')) document.getElementById('filterTanggalSelesai').value = todayISO;
    updateLaporan();
}

function updateLaporan() {
    setTanggalHariIniIfEmpty();
    let tglMulai = document.getElementById('filterTanggalMulai')?.value || '';
    let tglSelesai = document.getElementById('filterTanggalSelesai')?.value || '';

    let sumberDataTx = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    let sumberDataModal = (db && dataModalFirebase.length > 0) ? dataModalFirebase : riwayatModal;

    prosesRenderLaporan(sumberDataTx, sumberDataModal, tglMulai, tglSelesai);
}

function prosesRenderLaporan(semuaTransaksi, semuaModal, tglMulai, tglSelesai) {
    // Filter Modal Kas
    let filteredModal = (semuaModal || []).filter(m => {
        if (!m) return false;
        let dateStr = parseTanggalISO(m);
        let matchDate = true;
        if (tglMulai && tglSelesai) matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        
        let matchCabang = (cabangAktif === 'SEMUA CABANG') || (m.cabang === cabangAktif);
        return matchDate && matchCabang;
    });

    let totalNominalModal = filteredModal.reduce((acc, curr) => acc + parseNominalDinamis(curr), 0);
    let elTotalModal = document.getElementById('statTotalModal');
    if (elTotalModal) elTotalModal.innerText = 'Rp ' + totalNominalModal.toLocaleString('id-ID');

    // Render Tabel Riwayat Modal Kas
    let containerModal = document.getElementById('tabelRiwayatModal');
    if (containerModal) {
        if (filteredModal.length === 0) {
            containerModal.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-400">Tidak ada riwayat tambah modal pada periode ini</td></tr>`;
        } else {
            let htmlModal = '';
            filteredModal.forEach(m => {
                htmlModal += `
                    <tr class="hover:bg-emerald-50 border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${m.id || '-'}</td>
                        <td class="p-2 text-[11px] whitespace-nowrap">${m.waktu || m.tanggalISO || '-'}</td>
                        <td class="p-2 text-[11px] font-bold text-gray-600">${m.cabang || 'Utama'}</td>
                        <td class="p-2 font-semibold text-emerald-800">${m.keterangan || 'Modal Kas'}</td>
                        <td class="p-2 text-center font-bold"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">${m.sumber || 'TUNAI'}</span></td>
                        <td class="p-2 text-right font-black text-emerald-700">Rp ${parseNominalDinamis(m).toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center">
                            <button onclick="hapusModalFirebase('${m.id}')" class="text-red-500 font-bold hover:underline">Hapus</button>
                        </td>
                    </tr>
                `;
            });
            containerModal.innerHTML = htmlModal;
        }
    }

    // Filter Penjualan
    let filtered = (semuaTransaksi || []).filter(t => {
        if (!t) return false;
        let dateStr = parseTanggalISO(t);
        
        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        } else if (tglMulai) {
            matchDate = dateStr >= tglMulai;
        } else if (tglSelesai) {
            matchDate = dateStr <= tglSelesai;
        }
        
        let matchCabang = false;
        if (cabangAktif === 'SEMUA CABANG') {
            matchCabang = true;
        } else if (cabangAktif === 'DAPUR AYA SEMBAKO') {
            matchCabang = (!t.cabang || t.cabang === 'DAPUR AYA SEMBAKO' || t.cabang === 'DAPUR AYA' || t.cabang === 'AYA TOKO Sembako');
        } else {
            matchCabang = (t.cabang === cabangAktif);
        }

        return matchDate && matchCabang;
    });

    let totalOmset = 0;
    let totalQris = 0;
    let totalCash = 0;
    let totalQty = 0;
    let itemMap = {};

    filtered.forEach(t => {
        let sumTotal = parseNominalDinamis(t);
        totalOmset += sumTotal;
        
        let me = t.metodePembayaran || t.metode || 'TUNAI';
        if (me === 'QRIS') totalQris += sumTotal;
        else if (me === 'TUNAI') totalCash += sumTotal;

        let itemList = [];
        if (Array.isArray(t.items)) {
            itemList = t.items;
        } else if (t.items && typeof t.items === 'object') {
            itemList = Object.values(t.items);
        }

        itemList.forEach(item => {
            if(!item) return;
            let qty = parseInt(item.qty) || 0;
            let harga = parseInt(item.harga) || 0;
            let namaItem = item.nama || 'Tidak Diketahui';
            totalQty += qty;

            if (!itemMap[namaItem]) {
                itemMap[namaItem] = {
                    nama: namaItem,
                    kategori: item.kategori || 'Umum',
                    qty: 0,
                    subtotal: 0
                };
            }
            itemMap[namaItem].qty += qty;
            itemMap[namaItem].subtotal += (harga * qty);
        });
    });

    let elOmset = document.getElementById('statOmset');
    let elQris = document.getElementById('statOmsetQris');
    let elCash = document.getElementById('statUangCash');
    let elQty = document.getElementById('statTotalQty');
    let elTrx = document.getElementById('statTotalTransaksi');

    if (elOmset) elOmset.innerText = 'Rp ' + totalOmset.toLocaleString('id-ID');
    if (elQris) elQris.innerText = 'Rp ' + totalQris.toLocaleString('id-ID');
    if (elCash) elCash.innerText = 'Rp ' + totalCash.toLocaleString('id-ID');
    if (elQty) elQty.innerText = totalQty.toLocaleString('id-ID') + ' Pcs';
    if (elTrx) elTrx.innerText = filtered.length + ' Trx';

    let containerRekap = document.getElementById('tabelRekapItemTerjual');
    if (containerRekap) {
        let itemArray = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
        if (itemArray.length === 0) {
            containerRekap.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-400">Belum ada item terjual pada periode ini</td></tr>`;
        } else {
            let htmlItems = '';
            itemArray.forEach((item, index) => {
                htmlItems += `
                    <tr class="hover:bg-orange-50 transition">
                        <td class="p-2 text-center font-bold text-gray-500">${index + 1}</td>
                        <td class="p-2 font-bold uppercase">${item.nama}</td>
                        <td class="p-2 text-center uppercase text-[10px]"><span class="px-2 py-0.5 bg-gray-100 rounded border">${item.kategori}</span></td>
                        <td class="p-2 text-center font-black text-orange-600">${item.qty} pcs</td>
                        <td class="p-2 text-right font-bold">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
            containerRekap.innerHTML = htmlItems;
        }

        renderChartLaporan(itemArray.slice(0, 7));
    }

    let containerRiwayat = document.getElementById('tabelRiwayatTransaksi');
    if (containerRiwayat) {
        if (filtered.length === 0) {
            containerRiwayat.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-400">Tidak ada riwayat transaksi pada periode ini</td></tr>`;
        } else {
            let htmlRiwayat = '';
            filtered.forEach(t => {
                let itemList = [];
                if (Array.isArray(t.items)) {
                    itemList = t.items;
                } else if (t.items && typeof t.items === 'object') {
                    itemList = Object.values(t.items);
                }

                let detailItemsStr = itemList.map(i => `<span class="inline-block bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded mr-1 mb-1 font-semibold">${i.nama || '-'} <b>(x${i.qty || 0})</b></span>`).join('');
                if(!detailItemsStr) detailItemsStr = '<span class="text-gray-400 italic">Detail item kosong</span>';

                let nominalTrx = parseNominalDinamis(t);
                let metodeTrx = t.metodePembayaran || t.metode || 'TUNAI';

                htmlRiwayat += `
                    <tr class="hover:bg-orange-50 border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${t.id || '-'}</td>
                        <td class="p-2 text-[11px] whitespace-nowrap">${t.waktu || t.tanggalISO || '-'}</td>
                        <td class="p-2 text-[11px] font-bold text-gray-600">${t.cabang || 'Utama'}</td>
                        <td class="p-2">${detailItemsStr}</td>
                        <td class="p-2 text-center font-bold"><span class="px-2 py-0.5 rounded text-[10px] ${metodeTrx === 'QRIS' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">${metodeTrx}</span></td>
                        <td class="p-2 text-right font-black text-orange-700">Rp ${nominalTrx.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center">
                            <button onclick="hapusTransaksiFirebase('${t.id}')" class="text-red-500 font-bold hover:underline">Hapus</button>
                        </td>
                    </tr>
                `;
            });
            containerRiwayat.innerHTML = htmlRiwayat;
        }
    }
}

/* ================= LAPORAN PENGELUARAN REALTIME ================= */
function terapkanFilterPengeluaran() {
    updateLaporanPengeluaran();
}

function updateLaporanPengeluaran() {
    setTanggalHariIniIfEmpty();
    let tglMulai = document.getElementById('filterTglPengeluaranMulai')?.value || '';
    let tglSelesai = document.getElementById('filterTglPengeluaranSelesai')?.value || '';
    let katFilter = document.getElementById('filterKategoriPengeluaran')?.value || 'SEMUA';

    let sumberDataExp = (db && dataPengeluaranFirebase.length > 0) ? dataPengeluaranFirebase : riwayatPengeluaran;
    let sumberDataModal = (db && dataModalFirebase.length > 0) ? dataModalFirebase : riwayatModal;

    prosesRenderLaporanPengeluaran(sumberDataExp, sumberDataModal, tglMulai, tglSelesai, katFilter);
}

function prosesRenderLaporanPengeluaran(semuaPengeluaran, semuaModal, tglMulai, tglSelesai, katFilter) {
    let filtered = (semuaPengeluaran || []).filter(exp => {
        if (!exp) return false;
        
        let dateStr = parseTanggalISO(exp);
        
        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        } else if (tglMulai) {
            matchDate = dateStr >= tglMulai;
        } else if (tglSelesai) {
            matchDate = dateStr <= tglSelesai;
        }

        let matchCabang = false;
        if (cabangAktif === 'SEMUA CABANG') {
            matchCabang = true;
        } else if (cabangAktif === 'DAPUR AYA SEMBAKO') {
            matchCabang = (!exp.cabang || exp.cabang === 'DAPUR AYA SEMBAKO' || exp.cabang === 'DAPUR AYA' || exp.cabang === 'AYA TOKO Sembako');
        } else {
            matchCabang = (exp.cabang === cabangAktif);
        }

        let matchKategori = (katFilter === 'SEMUA') || (exp.kategori === katFilter);
        return matchDate && matchCabang && matchKategori;
    });

    let totalPengeluaran = 0;
    let totalTunai = 0;
    let totalTransfer = 0;
    let mapKategori = {};

    filtered.forEach(exp => {
        let nominal = parseNominalDinamis(exp);
        totalPengeluaran += nominal;

        let metode = exp.metode || exp.sumber || 'TUNAI';
        if (metode === 'TRANSFER') totalTransfer += nominal;
        else totalTunai += nominal;

        let kat = exp.kategori || 'Lain-lain / Tak Terduga';
        if (!mapKategori[kat]) mapKategori[kat] = 0;
        mapKategori[kat] += nominal;
    });

    // Hitung Total Modal
    let totalModalKas = (semuaModal || []).filter(m => {
        if (!m) return false;
        let dateStr = parseTanggalISO(m);
        let matchDate = true;
        if (tglMulai && tglSelesai) matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        let matchCabang = (cabangAktif === 'SEMUA CABANG') || (m.cabang === cabangAktif);
        return matchDate && matchCabang;
    }).reduce((acc, curr) => acc + parseNominalDinamis(curr), 0);

    let totalOmsetSaatIni = 0;
    let sumberTx = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    sumberTx.filter(t => {
        if(!t) return false;
        let dateStr = parseTanggalISO(t);
        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        }
        let matchCabang = false;
        if (cabangAktif === 'SEMUA CABANG') {
            matchCabang = true;
        } else if (cabangAktif === 'DAPUR AYA SEMBAKO') {
            matchCabang = (!t.cabang || t.cabang === 'DAPUR AYA SEMBAKO' || t.cabang === 'DAPUR AYA' || t.cabang === 'AYA TOKO Sembako');
        } else {
            matchCabang = (t.cabang === cabangAktif);
        }
        return matchDate && matchCabang;
    }).forEach(t => totalOmsetSaatIni += parseNominalDinamis(t));

    // Kalkulasi Arus Kas Bersih (Modal + Omset Penjualan - Pengeluaran)
    let arusKasBersih = (totalModalKas + totalOmsetSaatIni) - totalPengeluaran;

    let elTotalExp = document.getElementById('statTotalPengeluaran');
    let elTunaiExp = document.getElementById('statPengeluaranTunai');
    let elTrfExp = document.getElementById('statPengeluaranTransfer');
    let elKasBersih = document.getElementById('statArusKasBersih');

    if (elTotalExp) elTotalExp.innerText = 'Rp ' + totalPengeluaran.toLocaleString('id-ID');
    if (elTunaiExp) elTunaiExp.innerText = 'Rp ' + totalTunai.toLocaleString('id-ID');
    if (elTrfExp) elTrfExp.innerText = 'Rp ' + totalTransfer.toLocaleString('id-ID');
    if (elKasBersih) {
        elKasBersih.innerText = 'Rp ' + arusKasBersih.toLocaleString('id-ID');
        elKasBersih.className = arusKasBersih >= 0 ? "text-lg font-black text-emerald-700" : "text-lg font-black text-red-600";
    }

    let containerTabel = document.getElementById('tabelRiwayatPengeluaran');
    if (containerTabel) {
        if (filtered.length === 0) {
            containerTabel.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-400">Tidak ada catatan pengeluaran pada periode ini</td></tr>`;
        } else {
            let html = '';
            filtered.forEach(exp => {
                let itemsList = [];
                if (Array.isArray(exp.items)) itemsList = exp.items;
                else if (exp.items && typeof exp.items === 'object') itemsList = Object.values(exp.items);

                let detailItemsStr = itemsList.map(i => `<span class="inline-block bg-red-50 border border-red-200 px-1.5 py-0.5 rounded mr-1 mb-1 font-semibold text-[11px]">${i.nama || '-'} <b>(${i.qty||1} ${i.satuan||'pcs'} @Rp${(i.harga||0).toLocaleString('id-ID')})</b></span>`).join('');
                let ket = exp.keterangan || exp.deskripsi || exp.nama || exp.catatan || '-';
                if (detailItemsStr) ket += `<div class="mt-1">${detailItemsStr}</div>`;

                let nominal = parseNominalDinamis(exp);
                let tglDisplay = exp.waktu || exp.tanggalISO || exp.tanggal || '-';
                
                html += `
                    <tr class="hover:bg-red-50 border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${exp.id || '-'}</td>
                        <td class="p-2 text-[11px] whitespace-nowrap">${tglDisplay}</td>
                        <td class="p-2 text-[11px] font-bold text-gray-600">${exp.cabang || 'Utama'}</td>
                        <td class="p-2 font-semibold text-red-700">${exp.kategori || 'Lain-lain'}</td>
                        <td class="p-2 font-medium">${ket}</td>
                        <td class="p-2 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${exp.metode === 'TRANSFER' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}">${exp.metode || 'TUNAI'}</span></td>
                        <td class="p-2 text-right font-black text-red-600">Rp ${nominal.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center">
                            <button onclick="hapusPengeluaranFirebase('${exp.id}')" class="text-red-500 font-bold hover:underline">Hapus</button>
                        </td>
                    </tr>
                `;
            });
            containerTabel.innerHTML = html;
        }
    }

    renderChartPengeluaran(mapKategori);
}

function renderChartLaporan(topItems) {
    let canvas = document.getElementById('chartProdukLaku');
    if(!canvas) return;
    let ctx = canvas.getContext('2d');
    if(myChart) myChart.destroy();

    let labels = topItems.map(i => i.nama);
    let dataQty = topItems.map(i => i.qty);

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Terjual (Qty)',
                data: dataQty,
                backgroundColor: 'rgba(234, 88, 12, 0.8)',
                borderColor: 'rgba(194, 65, 12, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderChartPengeluaran(mapKategori) {
    let canvas = document.getElementById('chartPengeluaran');
    if (!canvas) return;
    let ctx = canvas.getContext('2d');
    if (myExpenseChart) myExpenseChart.destroy();

    let labels = Object.keys(mapKategori);
    let values = Object.values(mapKategori);

    if(labels.length === 0) {
        labels = ['Belum Ada Data'];
        values = [0];
    }

    myExpenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
                    '#06b6d4', '#6366f1', '#a855f7', '#ec4899'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function hapusTransaksiFirebase(id) {
    if(!confirm(`Hapus transaksi ${id}?`)) return;
    if(db) {
        db.ref('transaksi/' + id).remove();
    } else {
        riwayatTransaksi = riwayatTransaksi.filter(t => t.id !== id);
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
        updateLaporan();
    }
}

/* ================= KALKULATOR & BACK OFFICE ================= */
let calcExpr = '';
function calcInput(v) { calcExpr += v; if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = calcExpr; }
function calcOp(op) { calcExpr += op; if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = calcExpr; }
function calcClear() { calcExpr = ''; if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = ''; }
function calcEqual() {
    try {
        calcExpr = eval(calcExpr).toString();
        if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = calcExpr;
    } catch { if(document.getElementById('calcDisplay')) document.getElementById('calcDisplay').value = 'Error'; }
}

function renderInventaris() {}
function simpanInventaris() {}
function simpanPelanggan() {}
function simpanSupplier() {}
function simpanKaryawan() {}
function tambahBarangTitipan() {}
function simpanAbsensi() {}
function cetakSPK() {}
function simpanSettingNota() {}

/* ================= INISIALISASI LISTENER REALTIME ================= */
document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    renderMasterData();
    setTanggalHari IniIfEmpty();
    
    if(db) {
        db.ref('menu_tambahan').on('value', (s) => {
            let val = s.val();
            if(val && typeof databaseMenu !== 'undefined') {
                Object.values(val).forEach(m => {
                    let idx = databaseMenu.findIndex(dm => String(dm.id) === String(m.id));
                    if(idx !== -1) databaseMenu[idx] = m;
                    else databaseMenu.push(m);
                });
                renderMenu();
                renderMasterData();
            }
        });

        db.ref('transaksi').on('value', (snapshot) => {
            let data = snapshot.val();
            if (data) {
                dataTransaksiFirebase = Array.isArray(data) ? data : Object.values(data);
                dataTransaksiFirebase.sort((a, b) => ((b.id || '') > (a.id || '') ? 1 : -1));
            } else {
                dataTransaksiFirebase = [];
            }
            updateLaporan();
            updateLaporanPengeluaran();
        });

        db.ref('pengeluaran').on('value', (snapshot) => {
            let data = snapshot.val();
            if (data) {
                dataPengeluaranFirebase = Array.isArray(data) ? data : Object.values(data);
                dataPengeluaranFirebase.sort((a, b) => ((b.id || '') > (a.id || '') ? 1 : -1));
            } else {
                dataPengeluaranFirebase = [];
            }
            updateLaporanPengeluaran();
        });

        db.ref('modal').on('value', (snapshot) => {
            let data = snapshot.val();
            if (data) {
                dataModalFirebase = Array.isArray(data) ? data : Object.values(data);
                dataModalFirebase.sort((a, b) => ((b.id || '') > (a.id || '') ? 1 : -1));
            } else {
                dataModalFirebase = [];
            }
            updateLaporan();
            updateLaporanPengeluaran();
        });
    } else {
        updateLaporan();
        updateLaporanPengeluaran();
    }
});
            let data = snapshot.val();
            if (data) {
                dataTransaksiFirebase = Array.isArray(data) ? data : Object.values(data);
                dataTransaksiFirebase.sort((a, b) => ((b.id || '') > (a.id || '') ? 1 : -1));
            } else {
                dataTransaksiFirebase = [];
            }
            updateLaporan();
            updateLaporanPengeluaran();
        });

        db.ref('pengeluaran').on('value', (snapshot) => {
            let data = snapshot.val();
            if (data) {
                dataPengeluaranFirebase = Array.isArray(data) ? data : Object.values(data);
                dataPengeluaranFirebase.sort((a, b) => ((b.id || '') > (a.id || '') ? 1 : -1));
            } else {
                dataPengeluaranFirebase = [];
            }
            updateLaporanPengeluaran();
        });
    } else {
        updateLaporan();
        updateLaporanPengeluaran();
    }
});