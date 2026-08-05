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
let pembelianList = JSON.parse(localStorage.getItem('aya_pembelian_v1')) || [];

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
    if(tab === 'pembelian') {
        renderOpsiMasterPembelian();
        renderPembelian();
    }
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

    let hppSatuan = Math.round(hBeliTotal / (isi > 0 ? isi : 1));
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
        if(typeof databaseMenu !== 'undefined') {
            let idx = databaseMenu.findIndex(m => String(m.id) === String(barcode));
            if(idx !== -1) databaseMenu[idx] = item;
            else databaseMenu.push(item);
        }
    }
    resetFormMaster();
    renderMasterData();
    renderOpsiMasterTitipan();
    renderOpsiMasterPembelian();
    renderMenu();
    alert('Master Produk Berhasil Disimpan!');
}

function resetFormMaster() {
    if(document.getElementById('masterNama')) document.getElementById('masterNama').value = '';
    if(document.getElementById('masterBarcode')) {
        document.getElementById('masterBarcode').value = '';
        document.getElementById('masterBarcode').removeAttribute('readonly');
    }
    if(document.getElementById('masterHargaBeli')) document.getElementById('masterHargaBeli').value = '';
    if(document.getElementById('masterHargaJual')) document.getElementById('masterHargaJual').value = '';
    if(document.getElementById('masterIsi')) document.getElementById('masterIsi').value = '1';
    if(document.getElementById('masterEstimasiProfit')) document.getElementById('masterEstimasiProfit').innerText = 'Rp 0';
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
                <td class="p-2 text-center space-x-1">
                    <button onclick="editMasterData('${item.id}')" class="px-2 py-1 bg-amber-500 text-white rounded font-bold text-xs hover:bg-amber-600">✏️ Edit</button>
                    <button onclick="hapusMasterData('${item.id}')" class="px-2 py-1 bg-red-600 text-white rounded font-bold text-xs hover:bg-red-700">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function editMasterData(id) {
    let item = databaseMenu.find(m => String(m.id) === String(id));
    if(!item) return alert('Data barang tidak ditemukan!');

    if(document.getElementById('masterNama')) document.getElementById('masterNama').value = item.nama || '';
    if(document.getElementById('masterBarcode')) {
        document.getElementById('masterBarcode').value = item.id || '';
        document.getElementById('masterBarcode').setAttribute('readonly', 'true');
    }
    if(document.getElementById('masterKategori')) document.getElementById('masterKategori').value = item.kategori || 'topping';
    if(document.getElementById('masterSatuan')) document.getElementById('masterSatuan').value = item.satuan || 'pcs';
    if(document.getElementById('masterIsi')) document.getElementById('masterIsi').value = item.isi || 1;
    if(document.getElementById('masterHargaBeli')) document.getElementById('masterHargaBeli').value = item.hargaBeliTotal || (item.hargaBeli * (item.isi || 1)) || 0;
    if(document.getElementById('masterHargaJual')) document.getElementById('masterHargaJual').value = item.harga || 0;

    hitungEstimasiProfitMaster();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    renderOpsiMasterPembelian();
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
    if(keranjang.length === 0) { 
        alert('Keranjang Kosong!'); 
        return false; 
    }

    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let inputBayarEl = document.getElementById('inputBayar');
    let rawBayar = inputBayarEl?.value ? inputBayarEl.value.trim() : '';
    let bayar = parseInt(rawBayar) || 0;

    // VALIDASI PEMBAYARAN: Peringatan jika belum diisi atau nominal kurang
    if (!rawBayar || bayar <= 0) {
        alert('⚠️ PERINGATAN: Nominal UANG BAYAR belum diisi!\nSilakan masukkan nominal uang bayar terlebih dahulu.');
        if (inputBayarEl) inputBayarEl.focus();
        return false;
    }

    if (bayar < total) {
        alert(`⚠️ PERINGATAN: Uang Bayar Kurang!\nTotal Tagihan: Rp ${total.toLocaleString('id-ID')}\nUang Bayar: Rp ${bayar.toLocaleString('id-ID')}`);
        if (inputBayarEl) inputBayarEl.focus();
        return false;
    }

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
        if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
        updateKeranjang();
    }
}

function cetakNota() {
    if(keranjang.length === 0) return alert('Keranjang belanja kosong!');
    
    // Validasi Pembayaran Sebelum Cetak
    let totalText = document.getElementById('textTotal')?.innerText.replace('Rp ', '').replace(/\./g, '') || '0';
    let total = parseInt(totalText) || 0;
    let inputBayarEl = document.getElementById('inputBayar');
    let rawBayar = inputBayarEl?.value ? inputBayarEl.value.trim() : '';
    let bayar = parseInt(rawBayar) || 0;

    if (!rawBayar || bayar <= 0) {
        alert('⚠️ PERINGATAN: Nominal UANG BAYAR belum diisi!\nSilakan masukkan nominal uang bayar sebelum mencetak nota.');
        if (inputBayarEl) inputBayarEl.focus();
        return;
    }

    if (bayar < total) {
        alert(`⚠️ PERINGATAN: Uang Bayar Kurang!\nTotal Tagihan: Rp ${total.toLocaleString('id-ID')}\nUang Bayar: Rp ${bayar.toLocaleString('id-ID')}`);
        if (inputBayarEl) inputBayarEl.focus();
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
        simpanTransaksi();
        keranjang = [];
        if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
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
        let tot = nota.total || parseNominalDinamis(nota);
        let bay = nota.bayar || tot;
        document.getElementById('notaTotal').innerHTML = `
            <div class="flex justify-between font-bold"><span>TOTAL :</span><span>Rp ${tot.toLocaleString('id-ID')}</span></div>
            <div class="flex justify-between font-bold text-[9px]"><span>BAYAR :</span><span>Rp ${bay.toLocaleString('id-ID')}</span></div>
            <div class="flex justify-between font-bold text-[9px]"><span>KEMBALI :</span><span>Rp ${(bay - tot).toLocaleString('id-ID')}</span></div>
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

function setModalLaci(nominalBaru) {
    let val = parseInt(nominalBaru) || 0;
    modalTambahanManual = val;
    localStorage.setItem('aya_modal_laci', val);
    if(db) {
        db.ref('pengaturan/modal_laci').set(val);
    }
    updateLaporan();
    updateLaporanPengeluaran();
}

function hitungSubtotalPengeluaran() {
    let harga = parseInt(document.getElementById('pengeluaranHarga')?.value) || 0;
    let qty = parseInt(document.getElementById('pengeluaranQty')?.value) || 1;
    let total = harga * qty;
    
    let elNominal = document.getElementById('pengeluaranNominal');
    if (elNominal) {
        elNominal.value = total;
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

/* ================= MANAJEMEN PEMBELIAN / KULAKAN (KODE TERPERBAIKI) ================= */

function renderOpsiMasterPembelian() {
    let inputNama = document.getElementById('pembelianNamaBarang');
    if (!inputNama) return;

    // Menyiapkan Datalist Dinamis untuk Dropdown Pilihan Barang dari Master Data
    let datalist = document.getElementById('listMasterPembelian');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'listMasterPembelian';
        document.body.appendChild(datalist);
    }
    
    // Hubungkan input nama barang dengan datalist
    inputNama.setAttribute('list', 'listMasterPembelian');
    inputNama.setAttribute('autocomplete', 'off');

    // Populate opsi pilihan dari databaseMenu
    if (typeof databaseMenu !== 'undefined' && Array.isArray(databaseMenu)) {
        let html = '';
        databaseMenu.forEach(item => {
            let hpp = item.hargaBeli || 0;
            let hjual = item.harga || 0;
            html += `<option value="${item.nama}">ID: ${item.id} | Modal: Rp ${hpp.toLocaleString('id-ID')} | Jual: Rp ${hjual.toLocaleString('id-ID')}</option>`;
        });
        datalist.innerHTML = html;
    }

    // Fungsi otomatis melengkapi form saat nama barang dipilih / diinput
    let handleAutoFill = function() {
        let val = inputNama.value.trim();
        if (!val || typeof databaseMenu === 'undefined') return;

        let matched = databaseMenu.find(m => m.nama.toLowerCase() === val.toLowerCase() || String(m.id).toLowerCase() === val.toLowerCase());
        if (matched) {
            let barcodeInput = document.getElementById('pembelianBarcode');
            let hJualInput = document.getElementById('pembelianHargaJual');
            let isiInput = document.getElementById('pembelianIsiBeli');
            let hBeliInput = document.getElementById('pembelianHargaBeli');

            if (barcodeInput) barcodeInput.value = matched.id || '';
            if (hJualInput) hJualInput.value = matched.harga || 0;
            if (isiInput) isiInput.value = matched.isi || 1;
            
            if (hBeliInput) {
                if (matched.hargaBeliTotal && matched.hargaBeliTotal > 0) {
                    hBeliInput.value = matched.hargaBeliTotal;
                } else if (matched.hargaBeli && matched.hargaBeli > 0) {
                    hBeliInput.value = matched.hargaBeli * (matched.isi || 1);
                }
            }

            hitungEstimasiProfitPembelian();
        }
    };

    inputNama.oninput = handleAutoFill;
    inputNama.onchange = handleAutoFill;

    // Pasang Event Listener Kalkulasi Realtime
    ['pembelianHargaBeli', 'pembelianIsiBeli', 'pembelianHargaJual'].forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            el.oninput = hitungEstimasiProfitPembelian;
        }
    });
}

function hitungEstimasiProfitPembelian() {
    let totalHargaBeli = parseInt(document.getElementById('pembelianHargaBeli')?.value) || 0;
    let isiBeli = parseInt(document.getElementById('pembelianIsiBeli')?.value) || 1;
    let hargaJualSatuan = parseInt(document.getElementById('pembelianHargaJual')?.value) || 0;

    let hppSatuan = Math.round(totalHargaBeli / (isiBeli > 0 ? isiBeli : 1));
    let profitSatuan = hargaJualSatuan - hppSatuan;
    let totalProfitEstimasi = profitSatuan * isiBeli;

    let elProfit = document.getElementById('pembelianEstimasiProfit');
    if (elProfit) {
        if (totalHargaBeli > 0 || hargaJualSatuan > 0) {
            elProfit.innerHTML = `
                <div class="flex flex-col gap-0.5">
                    <span class="text-xs font-bold ${profitSatuan >= 0 ? 'text-emerald-800' : 'text-red-800'}">
                        HPP/Pcs: Rp ${hppSatuan.toLocaleString('id-ID')}
                    </span>
                    <span class="text-[11px] font-bold ${profitSatuan >= 0 ? 'text-emerald-700' : 'text-red-700'}">
                        Profit/Pcs: Rp ${profitSatuan.toLocaleString('id-ID')} (Total Margin: Rp ${totalProfitEstimasi.toLocaleString('id-ID')})
                    </span>
                </div>
            `;
            elProfit.className = profitSatuan >= 0 
                ? "p-2 bg-emerald-100 text-emerald-800 font-bold rounded border border-emerald-300"
                : "p-2 bg-red-100 text-red-800 font-bold rounded border border-red-300";
        } else {
            elProfit.innerText = 'Rp 0';
            elProfit.className = "p-2 bg-emerald-100 text-emerald-800 font-bold rounded border border-emerald-300";
        }
    }
}

function simpanTransaksiPembelian() {
    let namaBarang = document.getElementById('pembelianNamaBarang')?.value.trim() || '';
    let barcode = document.getElementById('pembelianBarcode')?.value.trim() || 'BRG-' + Date.now();
    let satuanBeli = document.getElementById('pembelianSatuanBeli')?.value || 'Karton';
    let isiBeli = parseInt(document.getElementById('pembelianIsiBeli')?.value) || 1;
    let hargaBeliTotal = parseInt(document.getElementById('pembelianHargaBeli')?.value) || 0;
    let supplier = document.getElementById('pembelianSupplier')?.value || 'Umum / Pasar';
    let hargaJualSatuan = parseInt(document.getElementById('pembelianHargaJual')?.value) || 0;

    if (!namaBarang || hargaBeliTotal <= 0) {
        return alert('Mohon isi nama barang dan harga beli total!');
    }

    let hppSatuan = Math.round(hargaBeliTotal / (isiBeli > 0 ? isiBeli : 1));
    let profitSatuan = hargaJualSatuan - hppSatuan;

    let item = {
        id: 'KUL-' + Date.now(),
        barcode: barcode,
        nama: namaBarang,
        satuanBeli: satuanBeli,
        isiBeli: isiBeli,
        hargaBeliTotal: hargaBeliTotal,
        hppSatuan: hppSatuan,
        hargaJualSatuan: hargaJualSatuan,
        profitSatuan: profitSatuan,
        supplier: supplier,
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: new Date().toISOString().split('T')[0],
        cabang: cabangAktif === 'SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif
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
    if (document.getElementById('pembelianNamaBarang')) document.getElementById('pembelianNamaBarang').value = '';
    if (document.getElementById('pembelianBarcode')) document.getElementById('pembelianBarcode').value = '';
    if (document.getElementById('pembelianIsiBeli')) document.getElementById('pembelianIsiBeli').value = '1';
    if (document.getElementById('pembelianHargaBeli')) document.getElementById('pembelianHargaBeli').value = '';
    if (document.getElementById('pembelianHargaJual')) document.getElementById('pembelianHargaJual').value = '';
    if (document.getElementById('pembelianEstimasiProfit')) document.getElementById('pembelianEstimasiProfit').innerText = 'Rp 0';
}

function renderPembelian() {
    let tbody = document.getElementById('tabelPembelianData');
    if (!tbody) return;

    if (pembelianList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-400">Belum ada data transaksi pembelian / kulakan</td></tr>`;
        return;
    }

    let html = '';
    pembelianList.forEach((item) => {
        let hBeliTotal = item.hargaBeliTotal || (item.hargaBeli * (item.qty || 1)) || 0;
        let hpp = item.hppSatuan || Math.round(hBeliTotal / (item.isiBeli || item.qty || 1));
        let hJual = item.hargaJualSatuan || item.hargaJual || 0;
        let profitPcs = item.profitSatuan ?? (hJual - hpp);
        let totalProfit = profitPcs * (item.isiBeli || item.qty || 1);

        html += `
            <tr class="hover:bg-orange-50 border-b text-xs">
                <td class="p-2 font-mono text-[10px]">
                    <span class="font-bold text-gray-700">${item.id || '-'}</span>
                    <span class="block text-gray-400 text-[9px]">${item.tanggalISO || '-'}</span>
                </td>
                <td class="p-2 font-mono text-[10px] text-gray-600">${item.barcode || item.id || '-'}</td>
                <td class="p-2 font-bold uppercase">${item.nama || '-'}</td>
                <td class="p-2 text-center font-bold">${item.satuanBeli || item.satuan || 'Pcs'} (${item.isiBeli || item.qty || 1} Pcs)</td>
                <td class="p-2 text-right">
                    <span class="block font-bold text-gray-800">Rp ${hBeliTotal.toLocaleString('id-ID')}</span>
                    <span class="block text-gray-500 text-[9px]">HPP: Rp ${hpp.toLocaleString('id-ID')}/pcs</span>
                </td>
                <td class="p-2 text-right font-bold text-gray-900">
                    Rp ${hJual.toLocaleString('id-ID')}
                </td>
                <td class="p-2 text-center font-semibold text-gray-700">${item.supplier || 'Umum'}</td>
                <td class="p-2 text-right bg-amber-50/50">
                    <span class="font-black ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}">
                        Rp ${totalProfit.toLocaleString('id-ID')}
                    </span>
                    <span class="block text-[9px] ${profitPcs >= 0 ? 'text-emerald-700' : 'text-red-700'} font-semibold">
                        (Profit: Rp ${profitPcs.toLocaleString('id-ID')}/pcs)
                    </span>
                </td>
                <td class="p-2 text-center">
                    <button onclick="hapusPembelian('${item.id}')" class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded text-[10px]">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function hapusPembelian(id) {
    if(!confirm('Apakah Anda yakin ingin menghapus transaksi kulakan ini?')) return;
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

        itemList.forEach(i => {
            let q = parseInt(i.qty) || 1;
            let hargaJual = parseInt(i.harga) || 0;
            let sub = hargaJual * q;
            let hpp = parseInt(i.hargaBeli) || 0;

            totalQty += q;
            totalHPP += (hpp * q);

            let key = i.nama || 'Lainnya';
            if (!itemMap[key]) {
                itemMap[key] = { nama: key, kategori: i.kategori || 'Umum', qty: 0, omset: 0 };
            }
            itemMap[key].qty += q;
            itemMap[key].omset += sub;
        });
    });

    // Hitung Sisa Cash Laci = Modal + Total Penjualan Cash - Pengeluaran Cash
    let totalPengeluaranCash = 0;
    let sumberExp = (db && dataPengeluaranFirebase.length > 0) ? dataPengeluaranFirebase : riwayatPengeluaran;
    
    (sumberExp || []).forEach(e => {
        let dateStr = parseTanggalISO(e);
        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        }
        if (matchDate && (e.metode || 'TUNAI').toUpperCase() === 'TUNAI') {
            totalPengeluaranCash += parseNominalDinamis(e);
        }
    });

    let cashLaci = modalTambahanManual + totalCash - totalPengeluaranCash;

    // Render Stat Cards
    if(document.getElementById('statOmset')) document.getElementById('statOmset').innerText = 'Rp ' + totalOmset.toLocaleString('id-ID');
    if(document.getElementById('statOmsetQris')) document.getElementById('statOmsetQris').innerText = 'Rp ' + totalQris.toLocaleString('id-ID');
    if(document.getElementById('statUangCash')) document.getElementById('statUangCash').innerText = 'Rp ' + totalCash.toLocaleString('id-ID');
    if(document.getElementById('statCashLaci')) document.getElementById('statCashLaci').innerText = 'Rp ' + cashLaci.toLocaleString('id-ID');
    if(document.getElementById('statTotalQty')) document.getElementById('statTotalQty').innerText = totalQty.toLocaleString('id-ID') + ' Pcs';
    if(document.getElementById('statTotalTransaksi')) document.getElementById('statTotalTransaksi').innerText = filtered.length + ' Trx';

    // Render Tabel Item Terjual
    let tbodyItem = document.getElementById('tabelRekapItemTerjual');
    if (tbodyItem) {
        let sortedItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
        if (sortedItems.length === 0) {
            tbodyItem.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-400">Belum ada item terjual pada periode ini</td></tr>`;
        } else {
            let html = '';
            sortedItems.forEach((item, idx) => {
                html += `
                    <tr class="hover:bg-orange-50 text-xs border-b">
                        <td class="p-2 text-center font-bold">${idx + 1}</td>
                        <td class="p-2 font-bold uppercase">${item.nama}</td>
                        <td class="p-2 text-center text-gray-600">${item.kategori}</td>
                        <td class="p-2 text-center font-black text-orange-600">${item.qty} Pcs</td>
                        <td class="p-2 text-right font-bold">Rp ${item.omset.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
            tbodyItem.innerHTML = html;
        }
    }

    // Render Riwayat Nota Transaksi
    let tbodyRiwayat = document.getElementById('tabelRiwayatTransaksi');
    if (tbodyRiwayat) {
        if (filtered.length === 0) {
            tbodyRiwayat.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-400">Tidak ada riwayat transaksi pada filter ini</td></tr>`;
        } else {
            let html = '';
            filtered.forEach(t => {
                let sumTotal = parseNominalDinamis(t);
                let me = (t.metodePembayaran || t.metode || 'TUNAI').toUpperCase();
                
                let itemList = Array.isArray(t.items) ? t.items : Object.values(t.items || {});
                let detailStr = itemList.map(i => `${i.nama} (${i.qty}x)`).join(', ');

                html += `
                    <tr class="hover:bg-orange-50 text-xs border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${t.id || '-'}</td>
                        <td class="p-2 text-[10px] text-gray-600">${t.waktu || t.tanggalISO || '-'}</td>
                        <td class="p-2 text-center text-gray-600">${t.cabang || 'Cabang Utama'}</td>
                        <td class="p-2 max-w-xs truncate" title="${detailStr}">${detailStr || '-'}</td>
                        <td class="p-2 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${me === 'QRIS' ? 'bg-blue-100 text-blue-800' : me === 'HUTANG' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}">${me}</span></td>
                        <td class="p-2 text-right font-bold">Rp ${sumTotal.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-right font-bold text-emerald-600">Rp ${(sumTotal * 0.3).toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center space-x-1">
                            <button onclick="cetakNotaDariRiwayat('${t.id}')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]">🖨️ Cetak</button>
                            <button onclick="hapusTransaksi('${t.id}')" class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px]">❌</button>
                        </td>
                    </tr>
                `;
            });
            tbodyRiwayat.innerHTML = html;
        }
    }

    renderChartPenjualan(Object.values(itemMap));
}

function hapusTransaksi(id) {
    if (!confirm(`Hapus transaksi ${id}?`)) return;
    if (db) {
        db.ref('transaksi/' + id).remove();
    } else {
        riwayatTransaksi = riwayatTransaksi.filter(t => t.id !== id);
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
        updateLaporan();
    }
}

function renderChartPenjualan(items) {
    let ctx = document.getElementById('chartProdukLaku')?.getContext('2d');
    if (!ctx) return;

    let topItems = items.sort((a, b) => b.qty - a.qty).slice(0, 7);
    let labels = topItems.map(i => i.nama);
    let dataQty = topItems.map(i => i.qty);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Terjual (Pcs)',
                data: dataQty,
                backgroundColor: 'rgba(234, 88, 12, 0.7)',
                borderColor: 'rgba(234, 88, 12, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/* ================= LAPORAN PENGELUARAN ================= */

function terapkanFilterPengeluaran() {
    updateLaporanPengeluaran();
}

function updateLaporanPengeluaran() {
    setTanggalHariIniIfEmpty();
    let tglMulai = document.getElementById('filterTglPengeluaranMulai')?.value || '';
    let tglSelesai = document.getElementById('filterTglPengeluaranSelesai')?.value || '';
    let katFilter = document.getElementById('filterKategoriPengeluaran')?.value || 'SEMUA';

    let sumberExp = (db && dataPengeluaranFirebase.length > 0) ? dataPengeluaranFirebase : riwayatPengeluaran;

    let filtered = (sumberExp || []).filter(e => {
        if (!e) return false;
        let dateStr = parseTanggalISO(e);

        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        } else if (tglMulai) {
            matchDate = dateStr >= tglMulai;
        } else if (tglSelesai) {
            matchDate = dateStr <= tglSelesai;
        }

        let matchKat = (katFilter === 'SEMUA') ? true : (e.kategori === katFilter);
        
        let matchCabang = false;
        if (cabangAktif === 'SEMUA CABANG') {
            matchCabang = true;
        } else {
            matchCabang = (e.cabang === cabangAktif);
        }

        return matchDate && matchKat && matchCabang;
    });

    let totalExp = 0;
    let totalTunai = 0;
    let totalTransfer = 0;
    let katMap = {};

    filtered.forEach(e => {
        let nominal = parseNominalDinamis(e);
        totalExp += nominal;

        let me = (e.metode || 'TUNAI').toUpperCase();
        if (me === 'TRANSFER') totalTransfer += nominal;
        else totalTunai += nominal;

        let k = e.kategori || 'Lain-lain';
        katMap[k] = (katMap[k] || 0) + nominal;
    });

    let totalOmsetHariIni = 0;
    let sumberTrx = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    (sumberTrx || []).forEach(t => {
        let dateStr = parseTanggalISO(t);
        let matchDate = true;
        if (tglMulai && tglSelesai) {
            matchDate = dateStr ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        }
        if (matchDate) totalOmsetHariIni += parseNominalDinamis(t);
    });

    let arusKasBersih = totalOmsetHariIni - totalExp;

    if(document.getElementById('statTotalPengeluaran')) document.getElementById('statTotalPengeluaran').innerText = 'Rp ' + totalExp.toLocaleString('id-ID');
    if(document.getElementById('statPengeluaranTunai')) document.getElementById('statPengeluaranTunai').innerText = 'Rp ' + totalTunai.toLocaleString('id-ID');
    if(document.getElementById('statPengeluaranTransfer')) document.getElementById('statPengeluaranTransfer').innerText = 'Rp ' + totalTransfer.toLocaleString('id-ID');
    if(document.getElementById('statArusKasBersih')) document.getElementById('statArusKasBersih').innerText = 'Rp ' + arusKasBersih.toLocaleString('id-ID');

    let tbodyExp = document.getElementById('tabelRiwayatPengeluaran');
    if (tbodyExp) {
        if (filtered.length === 0) {
            tbodyExp.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-400">Tidak ada transaksi pengeluaran pada periode ini</td></tr>`;
        } else {
            let html = '';
            filtered.forEach(e => {
                let nominal = parseNominalDinamis(e);
                let me = (e.metode || 'TUNAI').toUpperCase();

                html += `
                    <tr class="hover:bg-red-50 text-xs border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${e.id || '-'}</td>
                        <td class="p-2 text-[10px] text-gray-600">${e.waktu || e.tanggalISO || '-'}</td>
                        <td class="p-2 text-center text-gray-600">${e.cabang || 'Cabang Utama'}</td>
                        <td class="p-2 font-bold text-red-800">${e.kategori || 'Umum'}</td>
                        <td class="p-2 font-semibold">
                            ${e.namaBarang || e.keterangan || '-'}
                            <span class="block text-[10px] text-gray-400 font-normal">${e.keterangan || ''}</span>
                        </td>
                        <td class="p-2 text-center font-bold">${e.qty || 1} ${e.satuan || 'pcs'}</td>
                        <td class="p-2 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${me === 'TRANSFER' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}">${me}</span></td>
                        <td class="p-2 text-right font-black text-red-600">Rp ${nominal.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center">
                            <button onclick="hapusPengeluaranFirebase('${e.id}')" class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded text-[10px]">❌ Hapus</button>
                        </td>
                    </tr>
                `;
            });
            tbodyExp.innerHTML = html;
        }
    }

    renderChartPengeluaran(katMap);
}

function renderChartPengeluaran(katMap) {
    let ctx = document.getElementById('chartPengeluaran')?.getContext('2d');
    if (!ctx) return;

    let labels = Object.keys(katMap);
    let dataNominal = Object.values(katMap);

    if (myExpenseChart) myExpenseChart.destroy();

    myExpenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataNominal,
                backgroundColor: [
                    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/* ================= SETTING PRINTER & REALTIME SYNC ================= */

function simpanSettingPrinter() {
    let header = document.getElementById('settingHeader')?.value || 'AYA GROUP POS';
    let alamat = document.getElementById('settingAlamat')?.value || 'Cabang Utama';
    let wa = document.getElementById('settingWA')?.value || '0812-XXXX-XXXX';
    let footer = document.getElementById('settingFooter')?.value || 'Terima Kasih Atas Kunjungan Anda!';

    localStorage.setItem('settingHeader', header);
    localStorage.setItem('settingAlamat', alamat);
    localStorage.setItem('settingWA', wa);
    localStorage.setItem('settingFooter', footer);

    terapkanSettingPrinter();
    alert('Pengaturan Nota Thermal Berhasil Disimpan!');
}

function terapkanSettingPrinter() {
    let header = localStorage.getItem('settingHeader') || 'AYA GROUP POS';
    let alamat = localStorage.getItem('settingAlamat') || 'Cabang Utama';
    let wa = localStorage.getItem('settingWA') || 'WA: 0812-XXXX-XXXX';
    let footer = localStorage.getItem('settingFooter') || 'Terima Kasih Atas Kunjungan Anda!';

    if(document.getElementById('notaHeaderStore')) document.getElementById('notaHeaderStore').innerText = header;
    if(document.getElementById('notaAddress')) document.getElementById('notaAddress').innerText = alamat;
    if(document.getElementById('notaPhone')) document.getElementById('notaPhone').innerText = wa;
    if(document.getElementById('notaFooter')) document.getElementById('notaFooter').innerText = footer;

    if(document.getElementById('settingHeader')) document.getElementById('settingHeader').value = header;
    if(document.getElementById('settingAlamat')) document.getElementById('settingAlamat').value = alamat;
    if(document.getElementById('settingWA')) document.getElementById('settingWA').value = wa;
    if(document.getElementById('settingFooter')) document.getElementById('settingFooter').value = footer;
}

function resetSettingPrinter() {
    localStorage.removeItem('settingHeader');
    localStorage.removeItem('settingAlamat');
    localStorage.removeItem('settingWA');
    localStorage.removeItem('settingFooter');
    terapkanSettingPrinter();
}

// INSIALISASI REALTIME LISTENERS DARI FIREBASE DATABASE
function inisialisasiFirebaseListeners() {
    if(!db) return;

    db.ref('transaksi').on('value', snapshot => {
        let val = snapshot.val();
        dataTransaksiFirebase = val ? Object.values(val) : [];
        updateLaporan();
    });

    db.ref('pengeluaran').on('value', snapshot => {
        let val = snapshot.val();
        dataPengeluaranFirebase = val ? Object.values(val) : [];
        updateLaporan();
        updateLaporanPengeluaran();
    });

    db.ref('barang_titipan').on('value', snapshot => {
        let val = snapshot.val();
        dataTitipanFirebase = val ? Object.values(val) : [];
        renderBarangTitipan();
    });

    db.ref('pembelian').on('value', snapshot => {
        let val = snapshot.val();
        if(val) {
            pembelianList = Object.values(val);
            renderPembelian();
        }
    });

    db.ref('menu_tambahan').on('value', snapshot => {
        let val = snapshot.val();
        if(val && typeof databaseMenu !== 'undefined') {
            Object.values(val).forEach(newItem => {
                let idx = databaseMenu.findIndex(m => String(m.id) === String(newItem.id));
                if(idx !== -1) databaseMenu[idx] = newItem;
                else databaseMenu.push(newItem);
            });
            renderMasterData();
            renderMenu();
        }
    });
}

// INITIAL LOAD SAAT APLIKASI PERTAMA DIBUKA
document.addEventListener('DOMContentLoaded', () => {
    terapkanSettingPrinter();
    setTanggalHariIniIfEmpty();
    renderMenu();
    inisialisasiFirebaseListeners();
});