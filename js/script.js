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
let dataTitipanFirebase = [];

let pelangganList = JSON.parse(localStorage.getItem('aya_pelanggan')) || [];
let supplierList = JSON.parse(localStorage.getItem('aya_supplier')) || [];
let karyawanList = JSON.parse(localStorage.getItem('aya_karyawan')) || [];
let absensiList = JSON.parse(localStorage.getItem('aya_absensi')) || [];
let inventarisList = JSON.parse(localStorage.getItem('aya_inventaris')) || [];
let barangTitipan = JSON.parse(localStorage.getItem('aya_titipan_v3')) || [];
let riwayatTransaksi = JSON.parse(localStorage.getItem('aya_transaksi_v3')) || [];
let riwayatPengeluaran = JSON.parse(localStorage.getItem('aya_pengeluaran_v3')) || [];

// Custom Modal Laci State
let modalTambahanManual = parseInt(localStorage.getItem('aya_modal_laci')) || 70000;

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
    ['master', 'cabang', 'kasir', 'pengeluaran', 'laporan', 'laporan_pengeluaran', 'backoffice', 'user', 'setting', 'pembelian'].forEach(t => {
        let el = document.getElementById('tab-' + t);
        let btn = document.getElementById('btn-tab-' + t);
        if (el) el.classList.add('hidden');
        if (btn) btn.classList.remove('bg-orange-700');
    });

    let targetTab = document.getElementById('tab-' + tab);
    let targetBtn = document.getElementById('btn-tab-' + tab);
    if (targetTab) targetTab.classList.remove('hidden');
    if (targetBtn) targetBtn.classList.add('bg-orange-700');

    if(tab === 'master') {
        renderMasterData();
        renderOpsiMasterTitipan();
        renderBarangTitipan();
    }
    if(tab === 'laporan') updateLaporan();
    if(tab === 'laporan_pengeluaran') updateLaporanPengeluaran();
    if(tab === 'cabang') renderInventaris();
    if(tab === 'pembelian') renderPembelian();
    if(tab === 'pengeluaran') {
        let inputModal = document.getElementById('inputTambahModalLaci');
        if(inputModal) inputModal.value = modalTambahanManual;
    }
}

function switchSubMaster(sub) {
    ['barang', 'titipan', 'pelanggan', 'supplier', 'karyawan'].forEach(s => {
        let el = document.getElementById('sec-master-' + s);
        let btn = document.getElementById('btn-submaster-' + s);
        if(el) el.classList.add('hidden');
        if(btn) btn.classList.remove('bg-orange-600', 'text-white');
    });
    let targetSub = document.getElementById('sec-master-' + sub);
    let targetBtn = document.getElementById('btn-submaster-' + sub);
    if(targetSub) targetSub.classList.remove('hidden');
    if(targetBtn) targetBtn.classList.add('bg-orange-600', 'text-white');

    if(sub === 'titipan') {
        renderOpsiMasterTitipan();
        renderBarangTitipan();
    }
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
    renderOpsiMasterTitipan();
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
    renderOpsiMasterTitipan();
    renderMenu();
}

/* ================= MANAJEMEN BARANG TITIPAN ================= */
function renderOpsiMasterTitipan() {
    let select = document.getElementById('titipanSelectMaster');
    if (!select || typeof databaseMenu === 'undefined') return;

    let html = '<option value="">-- Manual / Pilih Produk Master --</option>';
    databaseMenu.forEach(item => {
        html += `<option value="${item.id}">${item.nama} (Modal: Rp ${(item.hargaBeli || 0).toLocaleString('id-ID')} | Jual: Rp ${(item.harga || 0).toLocaleString('id-ID')})</option>`;
    });
    select.innerHTML = html;
}

function pilihMasterUntukTitipan() {
    let id = document.getElementById('titipanSelectMaster')?.value;
    if (!id || typeof databaseMenu === 'undefined') return;

    let item = databaseMenu.find(m => String(m.id) === String(id));
    if (item) {
        if(document.getElementById('titipanNama')) document.getElementById('titipanNama').value = item.nama || '';
        if(document.getElementById('titipanHargaBeli')) document.getElementById('titipanHargaBeli').value = item.hargaBeli || 0;
        if(document.getElementById('titipanHargaJual')) document.getElementById('titipanHargaJual').value = item.harga || 0;
        hitungKalkulasiTitipan();
    }
}

function hitungKalkulasiTitipan() {
    let hBeli = parseInt(document.getElementById('titipanHargaBeli')?.value) || 0;
    let hJual = parseInt(document.getElementById('titipanHargaJual')?.value) || 0;
    let profit = hJual - hBeli;

    let elProfit = document.getElementById('titipanEstimasiProfit');
    if(elProfit) {
        elProfit.innerText = `Rp ${profit.toLocaleString('id-ID')} / pcs`;
        elProfit.className = profit >= 0 ? "p-2 bg-emerald-100 text-emerald-800 font-bold rounded border border-emerald-300 text-center" : "p-2 bg-red-100 text-red-800 font-bold rounded border border-red-300 text-center";
    }
}

function tambahBarangTitipan() {
    let nama = document.getElementById('titipanNama')?.value.trim() || '';
    let jumlah = parseInt(document.getElementById('titipanJumlah')?.value) || 0;
    let kontak = document.getElementById('titipanKontak')?.value.trim() || 'Titipan Umum';
    let hBeli = parseInt(document.getElementById('titipanHargaBeli')?.value) || 0;
    let hJual = parseInt(document.getElementById('titipanHargaJual')?.value) || 0;

    if (!nama || jumlah <= 0 || hJual <= 0) {
        return alert('Mohon isi nama barang, jumlah stok awal, dan harga jual!');
    }

    let item = {
        id: 'TTP-' + Date.now(),
        nama: nama,
        awal: jumlah,
        terjual: 0,
        retur: 0,
        kontak: kontak,
        hargaBeli: hBeli,
        hargaJual: hJual,
        sudahDibayar: 0,
        tanggalISO: new Date().toISOString().split('T')[0],
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif
    };

    if (db) {
        db.ref('barang_titipan/' + item.id).set(item);
    }

    barangTitipan.unshift(item);
    localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));

    resetFormTitipan();
    renderBarangTitipan();
    alert('Barang Titipan Berhasil Disimpan!');
}

function resetFormTitipan() {
    if(document.getElementById('titipanSelectMaster')) document.getElementById('titipanSelectMaster').value = '';
    if(document.getElementById('titipanNama')) document.getElementById('titipanNama').value = '';
    if(document.getElementById('titipanJumlah')) document.getElementById('titipanJumlah').value = '';
    if(document.getElementById('titipanKontak')) document.getElementById('titipanKontak').value = '';
    if(document.getElementById('titipanHargaBeli')) document.getElementById('titipanHargaBeli').value = '';
    if(document.getElementById('titipanHargaJual')) document.getElementById('titipanHargaJual').value = '';
    if(document.getElementById('titipanEstimasiProfit')) document.getElementById('titipanEstimasiProfit').innerText = 'Rp 0 / pcs';
}

function renderBarangTitipan() {
    let tbody = document.getElementById('tabelDaftarTitipan');
    if (!tbody) return;

    let sumberData = (db && dataTitipanFirebase.length > 0) ? dataTitipanFirebase : barangTitipan;

    if (sumberData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4 text-gray-400">Belum ada data barang titipan</td></tr>`;
        return;
    }

    let html = '';
    sumberData.forEach(item => {
        let sisa = (item.awal || 0) - (item.terjual || 0) - (item.retur || 0);
        let hBeli = item.hargaBeli || 0;
        let hJual = item.hargaJual || 0;
        let profitPcs = hJual - hBeli;
        let totalProfit = profitPcs * (item.terjual || 0);
        let wajibBayar = (item.terjual || 0) * hBeli;
        let sisaTagihan = wajibBayar - (item.sudahDibayar || 0);

        html += `
            <tr class="hover:bg-orange-50 border-b text-xs">
                <td class="p-2 font-bold uppercase">
                    ${item.nama || '-'}
                    <span class="block text-[10px] text-gray-500 font-normal">Pengirim: ${item.kontak || 'Umum'}</span>
                </td>
                <td class="p-2 text-center font-bold">${item.awal || 0}</td>
                <td class="p-2 text-center font-black text-orange-600">${item.terjual || 0}</td>
                <td class="p-2 text-center text-red-600 font-bold">${item.retur || 0}</td>
                <td class="p-2 text-center font-bold bg-amber-50">${sisa}</td>
                <td class="p-2 text-right">
                    <span class="block text-gray-500 text-[10px]">M: Rp ${hBeli.toLocaleString('id-ID')}</span>
                    <span class="font-bold">J: Rp ${hJual.toLocaleString('id-ID')}</span>
                </td>
                <td class="p-2 text-right font-bold text-emerald-600">Rp ${profitPcs.toLocaleString('id-ID')}</td>
                <td class="p-2 text-right font-black text-emerald-700">Rp ${totalProfit.toLocaleString('id-ID')}</td>
                <td class="p-2 text-right font-bold text-blue-700">Rp ${wajibBayar.toLocaleString('id-ID')}</td>
                <td class="p-2 text-right font-black ${sisaTagihan > 0 ? 'text-red-600' : 'text-emerald-600'}">Rp ${sisaTagihan.toLocaleString('id-ID')}</td>
                <td class="p-2 text-center space-x-1 whitespace-nowrap">
                    <button onclick="aksiTitipan('${item.id}', 'terjual')" class="px-1.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold text-[10px]">🛒 Terjual</button>
                    <button onclick="aksiTitipan('${item.id}', 'retur')" class="px-1.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px]">🔴 Retur</button>
                    <button onclick="aksiTitipan('${item.id}', 'bayar')" class="px-1.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]">💵 Bayar</button>
                    <button onclick="hapusBarangTitipan('${item.id}')" class="px-1.5 py-1 bg-gray-200 hover:bg-gray-300 text-red-600 rounded font-bold text-[10px]">❌</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function aksiTitipan(id, tipe) {
    let sumberData = (db && dataTitipanFirebase.length > 0) ? dataTitipanFirebase : barangTitipan;
    let item = sumberData.find(t => String(t.id) === String(id));
    if (!item) return alert('Data barang titipan tidak ditemukan!');

    let sisa = (item.awal || 0) - (item.terjual || 0) - (item.retur || 0);

    if (tipe === 'terjual') {
        let inputQty = prompt(`Catat Tambahan Jumlah Terjual (${item.nama}):\n(Sisa Stok Tersedia: ${sisa})`, "1");
        let qty = parseInt(inputQty);
        if (isNaN(qty) || qty <= 0) return;
        if (qty > sisa) return alert('Jumlah terjual melebihi sisa stok yang ada!');
        item.terjual = (item.terjual || 0) + qty;
    } 
    else if (tipe === 'retur') {
        let inputQty = prompt(`Catat Barang Diretur / Dikembalikan (${item.nama}):\n(Sisa Stok Tersedia: ${sisa})`, "1");
        let qty = parseInt(inputQty);
        if (isNaN(qty) || qty <= 0) return;
        if (qty > sisa) return alert('Jumlah retur melebihi sisa stok!');
        item.retur = (item.retur || 0) + qty;
    } 
    else if (tipe === 'bayar') {
        let wajibBayar = (item.terjual || 0) * (item.hargaBeli || 0);
        let sisaTagihan = wajibBayar - (item.sudahDibayar || 0);
        let inputBayar = prompt(`Bayar Modal ke Pengirim/Supplier (${item.nama}):\nWajib Bayar Total: Rp ${wajibBayar.toLocaleString('id-ID')}\nSisa Tagihan: Rp ${sisaTagihan.toLocaleString('id-ID')}`, sisaTagihan);
        let nominal = parseInt(inputBayar);
        if (isNaN(nominal) || nominal <= 0) return;
        item.sudahDibayar = (item.sudahDibayar || 0) + nominal;
    }

    if (db) {
        db.ref('barang_titipan/' + item.id).update(item);
    } else {
        localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));
        renderBarangTitipan();
    }
}

function hapusBarangTitipan(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data titipan ini?')) return;
    if (db) {
        db.ref('barang_titipan/' + id).remove();
    } else {
        barangTitipan = barangTitipan.filter(t => String(t.id) !== String(id));
        localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));
        renderBarangTitipan();
    }
}

/* ================= KASIR & TRANSAKSI ================= */
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
    let bayar = parseInt(document.getElementById('inputBayar')?.value) || 0;
    let kembalian = bayar - total;
    if(document.getElementById('textKembalian')) {
        document.getElementById('textKembalian').innerText = kembalian >= 0 ? 'Rp ' + kembalian.toLocaleString('id-ID') : 'Uang Kurang';
    }
}

function tahanTransaksi() {
    if(keranjang.length === 0) return alert('Keranjang kosong!');
    transaksiDitahan.push({
        id: 'HOLD-' + Date.now(),
        items: [...keranjang],
        waktu: new Date().toLocaleTimeString('id-ID')
    });
    keranjang = [];
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
        container.innerHTML += `
            <button onclick="resumeTransaksi(${i})" class="px-2 py-1 bg-amber-600 text-white text-[10px] rounded font-bold whitespace-nowrap">
                📋 ${t.waktu} (${t.items.length} Item)
            </button>
        `;
    });
}

function resumeTransaksi(index) {
    keranjang = [...transaksiDitahan[index].items];
    transaksiDitahan.splice(index, 1);
    updateKeranjang();
    renderHeldOrders();
}

/* ================= SIMPAN TRANSAKSI & CETAK NOTA ================= */
function simpanTransaksi() {
    if(keranjang.length === 0) { alert('Keranjang Kosong!'); return false; }
    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let bayar = parseInt(document.getElementById('inputBayar')?.value) || total;

    let nota = {
        id: 'NOTA-' + Date.now(),
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif,
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: new Date().toISOString().split('T')[0],
        items: [...keranjang],
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
        updateKeranjang();
    }
}

function cetakNota() {
    if(keranjang.length === 0) return alert('Keranjang belanja kosong!');
    
    let htmlItems = '';
    let total = 0;
    keranjang.forEach(i => {
        let harga = i.harga || 0;
        let sub = harga * i.qty;
        total += sub;
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

    if(document.getElementById('notaItems')) document.getElementById('notaItems').innerHTML = htmlItems;
    if(document.getElementById('notaWaktu')) document.getElementById('notaWaktu').innerText = "Waktu: " + new Date().toLocaleString('id-ID');
    if(document.getElementById('notaMetode')) document.getElementById('notaMetode').innerText = "Metode: " + metodePembayaran;
    if(document.getElementById('notaTotal')) {
        document.getElementById('notaTotal').innerHTML = `
            <div class="flex justify-between font-bold"><span>TOTAL :</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
        `;
    }

    const area = document.getElementById('areaNota');
    if(area) area.style.display = 'block';
    setTimeout(() => {
        window.print();
        if(area) area.style.display = 'none';
        simpanTransaksi();
        keranjang = [];
        updateKeranjang();
    }, 300);
}

function cetakNotaDariRiwayat(idNota) {
    let sumberData = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    let nota = sumberData.find(t => String(t.id) === String(idNota));

    if (!nota) return alert("Data transaksi tidak ditemukan!");

    let htmlItems = '';
    let itemList = Array.isArray(nota.items) ? nota.items : Object.values(nota.items || {});
    
    itemList.forEach(i => {
        let harga = i.harga || 0;
        let sub = harga * (i.qty || 1);
        htmlItems += `
            <div class="nota-item-row font-bold">
                <span>${i.nama || '-'}</span>
                <div class="nota-item-detail">
                    <span>${i.qty || 1} x ${harga.toLocaleString('id-ID')}</span>
                    <span>Rp${sub.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });

    if(document.getElementById('notaItems')) document.getElementById('notaItems').innerHTML = htmlItems;
    if(document.getElementById('notaWaktu')) document.getElementById('notaWaktu').innerText = "Waktu: " + (nota.waktu || nota.tanggalISO || '-');
    if(document.getElementById('notaMetode')) document.getElementById('notaMetode').innerText = "Metode: " + (nota.metodePembayaran || nota.metode || 'TUNAI');
    if(document.getElementById('notaTotal')) {
        document.getElementById('notaTotal').innerHTML = `
            <div class="flex justify-between font-bold"><span>TOTAL :</span><span>Rp ${(nota.total || parseNominalDinamis(nota)).toLocaleString('id-ID')}</span></div>
        `;
    }

    const area = document.getElementById('areaNota');
    if(area) area.style.display = 'block';
    setTimeout(() => {
        window.print();
        if(area) area.style.display = 'none';
    }, 300);
}

/* ================= MANAJEMEN PENGELUARAN (EXPENSES) + MODAL LACI ================= */

// FITUR TAMBAH MODAL MANUAL (BERPENGARUH KE UANG CASH LACI)
function setModalLaci(nominalBaru) {
    let val = parseInt(nominalBaru) || 0;
    modalTambahanManual = val;
    localStorage.setItem('aya_modal_laci', val);
    if(db) {
        db.ref('pengaturan/modal_laci').set(val);
    }
    alert('Modal Laci Berhasil Diperbarui: Rp ' + val.toLocaleString('id-ID'));
    updateLaporan();
    updateLaporanPengeluaran();
}

function hitungSubtotalPengeluaran() {
    let harga = parseInt(document.getElementById('pengeluaranHarga')?.value) || 0;
    let qty = parseInt(document.getElementById('pengeluaranQty')?.value) || 1;
    let total = harga * qty;
    
    let elNominal = document.getElementById('pengeluaranNominal');
    if (elNominal) {
        elNominal.value = total > 0 ? total : '';
    }
}

function resetFormPengeluaran() {
    let todayISO = new Date().toISOString().split('T')[0];
    if(document.getElementById('pengeluaranTanggal')) document.getElementById('pengeluaranTanggal').value = todayISO;
    if(document.getElementById('pengeluaranNamaBarang')) document.getElementById('pengeluaranNamaBarang').value = '';
    if(document.getElementById('pengeluaranHarga')) document.getElementById('pengeluaranHarga').value = '';
    if(document.getElementById('pengeluaranSatuan')) document.getElementById('pengeluaranSatuan').value = 'pcs';
    if(document.getElementById('pengeluaranQty')) document.getElementById('pengeluaranQty').value = '1';
    if(document.getElementById('pengeluaranNominal')) document.getElementById('pengeluaranNominal').value = '';
    if(document.getElementById('pengeluaranKeterangan')) document.getElementById('pengeluaranKeterangan').value = '';
}

function simpanPengeluaran() {
    let tanggal = document.getElementById('pengeluaranTanggal')?.value || new Date().toISOString().split('T')[0];
    let kategori = document.getElementById('pengeluaranKategori')?.value || 'Lain-lain / Tak Terduga';
    let metode = document.getElementById('pengeluaranMetode')?.value || 'TUNAI';
    
    let namaBarang = document.getElementById('pengeluaranNamaBarang')?.value.trim() || document.getElementById('pengeluaranKeterangan')?.value.trim() || 'Pengeluaran Kas';
    let harga = parseInt(document.getElementById('pengeluaranHarga')?.value) || 0;
    let satuan = document.getElementById('pengeluaranSatuan')?.value || 'pcs';
    let qty = parseInt(document.getElementById('pengeluaranQty')?.value) || 1;
    let nominal = parseInt(document.getElementById('pengeluaranNominal')?.value) || (harga * qty);
    let keterangan = document.getElementById('pengeluaranKeterangan')?.value.trim() || namaBarang;

    if (!tanggal || nominal <= 0) {
        return alert('Mohon lengkapi data barang/pengeluaran dan nominal!');
    }

    let expenseItem = {
        id: 'EXP-' + Date.now(),
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif,
        tanggalISO: tanggal,
        waktu: new Date().toLocaleString('id-ID'),
        kategori: kategori,
        metode: metode,
        namaBarang: namaBarang,
        harga: harga > 0 ? harga : nominal,
        satuan: satuan,
        qty: qty,
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
    updateLaporan();
    updateLaporanPengeluaran();
}

function hapusPengeluaranFirebase(id) {
    if (!confirm(`Hapus pengeluaran ${id}?`)) return;
    if (db) {
        db.ref('pengeluaran/' + id).remove();
    } else {
        riwayatPengeluaran = riwayatPengeluaran.filter(e => e.id !== id);
        localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(riwayatPengeluaran));
        updateLaporan();
        updateLaporanPengeluaran();
    }
}

/* ================= MANAJEMEN PEMBELIAN / KULAKAN ================= */
let pembelianList = JSON.parse(localStorage.getItem('aya_pembelian_v1')) || [];

function renderPembelian() {
    let tbody = document.getElementById('tabelPembelianData');
    if (!tbody) return;
    if (pembelianList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-400">Belum ada data pembelian / kulakan</td></tr>`;
        return;
    }
    let html = '';
    pembelianList.forEach((item) => {
        let total = (item.hargaBeli || 0) * (item.qty || 1);
        html += `
            <tr class="hover:bg-orange-50 border-b text-xs">
                <td class="p-2 font-mono text-[10px]">${item.id || '-'}</td>
                <td class="p-2 font-mono text-[10px]">${item.barcode || '-'}</td>
                <td class="p-2 font-bold uppercase">${item.nama || '-'}</td>
                <td class="p-2 text-center">${item.qty || 1} ${item.satuan || 'pcs'}</td>
                <td class="p-2 text-right">Rp ${(item.hargaBeli || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-right font-bold text-emerald-600">Rp ${(item.hargaJual || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-center">${item.supplier || '-'}</td>
                <td class="p-2 text-center">
                    <button onclick="hapusPembelian('${item.id}')" class="text-red-600 font-bold">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function simpanTransaksiPembelian() {
    let nama = document.getElementById('pembelianNamaBarang')?.value.trim() || '';
    let barcode = document.getElementById('pembelianBarcode')?.value.trim() || 'BRG-' + Date.now();
    let satuan = document.getElementById('pembelianSatuanBeli')?.value || 'Pcs';
    let isi = parseInt(document.getElementById('pembelianIsiBeli')?.value) || 1;
    let hBeliTotal = parseInt(document.getElementById('pembelianHargaBeli')?.value) || 0;
    let supplier = document.getElementById('pembelianSupplier')?.value || 'Umum / Pasar';
    let hJual = parseInt(document.getElementById('pembelianHargaJual')?.value) || 0;

    if (!nama || hBeliTotal <= 0) return alert('Mohon lengkapi nama barang dan harga beli kulakan!');

    let item = {
        id: 'BLK-' + Date.now(),
        barcode: barcode,
        nama: nama,
        supplier: supplier,
        qty: isi,
        satuan: satuan,
        hargaBeli: hBeliTotal,
        hargaJual: hJual,
        tanggalISO: new Date().toISOString().split('T')[0],
        cabang: cabangAktif
    };

    if (db) {
        db.ref('pembelian/' + item.id).set(item);
    }
    pembelianList.unshift(item);
    localStorage.setItem('aya_pembelian_v1', JSON.stringify(pembelianList));

    resetFormPembelian();
    renderPembelian();
    alert('Data Pembelian / Kulakan Berhasil Disimpan!');
}

function resetFormPembelian() {
    if(document.getElementById('pembelianNamaBarang')) document.getElementById('pembelianNamaBarang').value = '';
    if(document.getElementById('pembelianBarcode')) document.getElementById('pembelianBarcode').value = '';
    if(document.getElementById('pembelianHargaBeli')) document.getElementById('pembelianHargaBeli').value = '';
    if(document.getElementById('pembelianHargaJual')) document.getElementById('pembelianHargaJual').value = '';
}

function hapusPembelian(id) {
    if(!confirm('Hapus riwayat kulakan ini?')) return;
    if(db) db.ref('pembelian/' + id).remove();
    pembelianList = pembelianList.filter(p => p.id !== id);
    localStorage.setItem('aya_pembelian_v1', JSON.stringify(pembelianList));
    renderPembelian();
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

    let inputModalLaci = document.getElementById('inputTambahModalLaci');
    if (inputModalLaci && !inputModalLaci.value) inputModalLaci.value = modalTambahanManual;
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
    let totalHutang = 0;
    let totalHPP = 0;
    let totalQty = 0;
    let itemMap = {};

    filtered.forEach(t => {
        let sumTotal = parseNominalDinamis(t);
        totalOmset += sumTotal;
        
        let me = (t.metodePembayaran || t.metode || 'TUNAI').toUpperCase();
        if (me === 'QRIS') totalQris += sumTotal;
        else if (me === 'HUTANG') totalHutang += sumTotal;
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
            let hpp = parseInt(item.hargaBeli) || 0;
            let namaItem = item.nama || 'Tidak Diketahui';
            
            totalQty += qty;
            totalHPP += (hpp * qty);

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

    // HITUNG TOTAL PENGELUARAN TUNAI
    let totalPengeluaranTunai = 0;
    let sumberPengeluaran = (db && dataPengeluaranFirebase.length > 0) ? dataPengeluaranFirebase : riwayatPengeluaran;
    sumberPengeluaran.filter(exp => {
        let dateStr = parseTanggalISO(exp);
        let matchDate = (tglMulai && tglSelesai) ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        let metode = (exp.metode || 'TUNAI').toUpperCase();
        return matchDate && metode === 'TUNAI';
    }).forEach(exp => {
        totalPengeluaranTunai += parseNominalDinamis(exp);
    });

    // PROSES KALKULASI CASH RIIL LACI BERSAMA MODAL MANUAL
    let inputModalLaci = parseInt(document.getElementById('inputTambahModalLaci')?.value);
    if (!isNaN(inputModalLaci)) {
        modalTambahanManual = inputModalLaci;
    }
    
    let cashRiilLaci = modalTambahanManual + totalCash - totalPengeluaranTunai;

    // UPDATE TAMPILAN DASHBOARD STATISTIK
    let elOmset = document.getElementById('statOmset');
    let elQris = document.getElementById('statOmsetQris');
    let elCash = document.getElementById('statUangCash');
    let elQty = document.getElementById('statTotalQty');
    let elTrx = document.getElementById('statTotalTransaksi');
    let elLaci = document.getElementById('statCashLaci');

    if (elOmset) elOmset.innerText = 'Rp ' + totalOmset.toLocaleString('id-ID');
    if (elQris) elQris.innerText = 'Rp ' + totalQris.toLocaleString('id-ID');
    if (elCash) elCash.innerText = 'Rp ' + totalCash.toLocaleString('id-ID');
    if (elQty) elQty.innerText = totalQty.toLocaleString('id-ID') + ' Pcs';
    if (elTrx) elTrx.innerText = filtered.length + ' Trx';
    if (elLaci) elLaci.innerText = 'Rp ' + cashRiilLaci.toLocaleString('id-ID');

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
            containerRiwayat.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-400">Tidak ada riwayat transaksi pada periode ini</td></tr>`;
        } else {
            let htmlRiwayat = '';
            filtered.forEach(t => {
                let itemList = [];
                let hppTrx = 0;
                if (Array.isArray(t.items)) {
                    itemList = t.items;
                } else if (t.items && typeof t.items === 'object') {
                    itemList = Object.values(t.items);
                }

                itemList.forEach(i => {
                    hppTrx += ((parseInt(i.hargaBeli) || 0) * (parseInt(i.qty) || 0));
                });

                let detailItemsStr = '';
                if (itemList.length > 0) {
                    detailItemsStr = `
                        <div class="bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 my-1 shadow-inner">
                            <table class="w-full text-[11px] border-collapse">
                                <thead>
                                    <tr class="border-b border-amber-200 text-amber-900 text-left font-bold text-[10px]">
                                        <th class="pb-1 uppercase">Nama Barang</th>
                                        <th class="pb-1 text-center uppercase w-12">Qty</th>
                                        <th class="pb-1 text-right uppercase w-20">Harga</th>
                                        <th class="pb-1 text-right uppercase w-20">Total</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-amber-100">
                    `;

                    itemList.forEach(i => {
                        let qty = parseInt(i.qty) || 0;
                        let harga = parseInt(i.harga) || 0;
                        let subtotal = harga * qty;
                        detailItemsStr += `
                            <tr class="hover:bg-amber-100/50">
                                <td class="py-1 font-bold text-gray-800 uppercase">${i.nama || '-'}</td>
                                <td class="py-1 text-center font-extrabold text-orange-700">${qty}</td>
                                <td class="py-1 text-right text-gray-600">Rp ${harga.toLocaleString('id-ID')}</td>
                                <td class="py-1 text-right font-bold text-gray-900">Rp ${subtotal.toLocaleString('id-ID')}</td>
                            </tr>
                        `;
                    });

                    detailItemsStr += `
                                </tbody>
                            </table>
                        </div>
                    `;
                } else {
                    detailItemsStr = '<span class="text-gray-400 italic text-xs">Detail item kosong</span>';
                }

                let nominalTrx = parseNominalDinamis(t);
                let labaTrx = nominalTrx - hppTrx;
                let metodeTrx = t.metodePembayaran || t.metode || 'TUNAI';

                htmlRiwayat += `
                    <tr class="hover:bg-orange-50/50 border-b transition">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700 align-top">
                            <span class="block text-gray-900 font-extrabold">${t.id || '-'}</span>
                            <button onclick="cetakNotaDariRiwayat('${t.id}')" class="mt-2 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded text-[9px] shadow transition">🖨️ Cetak Nota</button>
                        </td>
                        <td class="p-2 text-[11px] whitespace-nowrap align-top text-gray-600 font-medium">${t.waktu || t.tanggalISO || '-'}</td>
                        <td class="p-2 text-[11px] font-bold text-gray-700 align-top">${t.cabang || 'Utama'}</td>
                        <td class="p-2 align-top">${detailItemsStr}</td>
                        <td class="p-2 text-center font-bold align-top"><span class="px-2.5 py-1 rounded-md text-[10px] shadow-sm font-black ${metodeTrx === 'QRIS' ? 'bg-blue-100 text-blue-800 border border-blue-200' : (metodeTrx === 'HUTANG' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200')}">${metodeTrx}</span></td>
                        <td class="p-2 text-right font-black text-orange-700 align-top text-xs">Rp ${nominalTrx.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-right font-bold text-emerald-600 align-top text-xs">Rp ${labaTrx.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center align-top">
                            <button onclick="hapusTransaksiFirebase('${t.id}')" class="text-red-500 font-bold hover:text-red-700 hover:underline text-xs">Hapus</button>
                        </td>
                    </tr>
                `;
            });
            containerRiwayat.innerHTML = htmlRiwayat;
        }
    }
}

function hapusTransaksiFirebase(id) {
    if(!confirm('Hapus transaksi ini dari database?')) return;
    if(db) db.ref('transaksi/' + id).remove();
    riwayatTransaksi = riwayatTransaksi.filter(t => String(t.id) !== String(id));
    localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
    updateLaporan();
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

    filtered.forEach(exp => {
        let nominal = parseNominalDinamis(exp);
        totalPengeluaran += nominal;

        let metode = (exp.metode || exp.sumber || 'TUNAI').toUpperCase();
        if (metode === 'TRANSFER') totalTransfer += nominal;
        else totalTunai += nominal;
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
    if (elKasBersih) elKasBersih.innerText = 'Rp ' + arusKasBersih.toLocaleString('id-ID');

    let container = document.getElementById('tabelRiwayatPengeluaran');
    if (container) {
        if (filtered.length === 0) {
            container.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-400">Belum ada catatan pengeluaran pada periode ini</td></tr>`;
        } else {
            let html = '';
            filtered.forEach(exp => {
                let nominal = parseNominalDinamis(exp);
                let namaBrg = exp.namaBarang || exp.keterangan || '-';
                let hargaSatuan = exp.harga || 0;
                let satuan = exp.satuan || 'pcs';
                let qty = exp.qty || 1;

                html += `
                    <tr class="hover:bg-red-50 transition border-b text-xs">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${exp.id || '-'}</td>
                        <td class="p-2 text-[11px] whitespace-nowrap text-gray-600 font-medium">${exp.waktu || exp.tanggalISO || '-'}</td>
                        <td class="p-2 font-bold text-gray-700">${exp.cabang || 'Utama'}</td>
                        <td class="p-2"><span class="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold text-[10px]">${exp.kategori || 'Umum'}</span></td>
                        <td class="p-2 font-bold text-gray-900 uppercase">
                            ${namaBrg}
                            <span class="block text-[10px] text-gray-500 normal-case font-normal">${exp.keterangan || ''}</span>
                        </td>
                        <td class="p-2 text-center font-semibold">
                            ${hargaSatuan > 0 ? `Rp ${hargaSatuan.toLocaleString('id-ID')} / ${satuan} (${qty} ${satuan})` : `${qty} ${satuan}`}
                        </td>
                        <td class="p-2 text-center font-bold"><span class="px-2 py-0.5 rounded ${exp.metode === 'TRANSFER' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'} text-[10px]">${exp.metode || 'TUNAI'}</span></td>
                        <td class="p-2 text-right font-black text-red-600 text-xs">Rp ${nominal.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center">
                            <button onclick="hapusPengeluaranFirebase('${exp.id}')" class="text-red-500 font-bold hover:text-red-700 hover:underline">Hapus</button>
                        </td>
                    </tr>
                `;
            });
            container.innerHTML = html;
        }
    }
}

/* ================= RENDER CHART & KALKULATOR ================= */
function renderChartLaporan(topItems) {
    let ctx = document.getElementById('chartProdukLaku');
    if(!ctx) return;
    
    let labels = topItems.map(i => i.nama);
    let data = topItems.map(i => i.qty);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Qty Terjual',
                data: data,
                backgroundColor: 'rgba(234, 88, 12, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function renderInventaris() {
    let tbody = document.getElementById('tabelInventaris');
    if(!tbody || typeof databaseMenu === 'undefined') return;

    let html = '';
    databaseMenu.forEach(item => {
        html += `
            <tr class="hover:bg-orange-50 border-b">
                <td class="p-2 font-mono text-[10px]">${item.id || '-'}</td>
                <td class="p-2 font-bold uppercase">${item.nama || '-'}</td>
                <td class="p-2 text-center">${item.kategori || '-'}</td>
                <td class="p-2 text-right font-bold">Rp ${(item.harga || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-center text-emerald-600 font-bold">Tersedia</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// KALKULATOR BACK OFFICE
let calcStr = '';
function calcInput(val) {
    calcStr += val;
    let d = document.getElementById('calcDisplay');
    if(d) d.value = calcStr;
}
function calcOp(op) {
    calcStr += ' ' + op + ' ';
    let d = document.getElementById('calcDisplay');
    if(d) d.value = calcStr;
}
function calcClear() {
    calcStr = '';
    let d = document.getElementById('calcDisplay');
    if(d) d.value = '0';
}
function calcEqual() {
    try {
        let res = eval(calcStr.replace(/[^0-9+\-*/.]/g, ''));
        let d = document.getElementById('calcDisplay');
        if(d) d.value = res;
        calcStr = String(res);
    } catch(e) {
        let d = document.getElementById('calcDisplay');
        if(d) d.value = 'Error';
        calcStr = '';
    }
}

/* ================= FIREBASE REALTIME LISTENERS ================= */
if (db) {
    db.ref('transaksi').on('value', (snapshot) => {
        let val = snapshot.val();
        dataTransaksiFirebase = [];
        if (val) {
            Object.keys(val).forEach(key => {
                dataTransaksiFirebase.push({ ...val[key], id: key });
            });
            dataTransaksiFirebase.sort((a, b) => b.id.localeCompare(a.id));
        }
        updateLaporan();
    });

    db.ref('pengeluaran').on('value', (snapshot) => {
        let val = snapshot.val();
        dataPengeluaranFirebase = [];
        if (val) {
            Object.keys(val).forEach(key => {
                dataPengeluaranFirebase.push({ ...val[key], id: key });
            });
            dataPengeluaranFirebase.sort((a, b) => b.id.localeCompare(a.id));
        }
        updateLaporanPengeluaran();
    });

    db.ref('barang_titipan').on('value', (snapshot) => {
        let val = snapshot.val();
        dataTitipanFirebase = [];
        if (val) {
            Object.keys(val).forEach(key => {
                dataTitipanFirebase.push({ ...val[key], id: key });
            });
        }
        renderBarangTitipan();
    });

    db.ref('pengaturan/modal_laci').on('value', (snapshot) => {
        let val = snapshot.val();
        if (val !== null) {
            modalTambahanManual = parseInt(val) || 0;
            let input = document.getElementById('inputTambahModalLaci');
            if(input) input.value = modalTambahanManual;
            updateLaporan();
        }
    });
}

// INITIAL LOAD
window.onload = function() {
    setTanggalHariIniIfEmpty();
    renderMenu();
    updateLaporan();
    updateLaporanPengeluaran();
};