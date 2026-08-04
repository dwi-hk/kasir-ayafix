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
let cabangAktif = 'AYA SEBLAK DAN ANGKRINGAN';
let dataTransaksiFirebase = []; // Cache transaksi realtime dari Firebase
let dataPengeluaranFirebase = []; // Cache pengeluaran realtime dari Firebase

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
    ['master', 'cabang', 'kasir', 'pengeluaran', 'laporan', 'laporan_pengeluaran', 'backoffice', 'user', 'setting'].forEach(t => {
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
    let isi = parseInt(document.getElementById('masterIsi').value) || 1;
    let hBeliTotal = parseInt(document.getElementById('masterHargaBeli').value) || 0;
    let hJual = parseInt(document.getElementById('masterHargaJual').value) || 0;

    let hppSatuan = Math.round(hBeliTotal / (isi > 0 ? isi : 1));
    let profit = hJual - hppSatuan;

    let el = document.getElementById('masterEstimasiProfit');
    if(el) el.innerText = `Rp ${profit.toLocaleString('id-ID')} (HPP: Rp ${hppSatuan.toLocaleString('id-ID')})`;
}

function simpanMasterDatabase() {
    let nama = document.getElementById('masterNama').value.trim();
    let barcode = document.getElementById('masterBarcode').value.trim() || 'BRG-' + Date.now();
    let hJual = parseInt(document.getElementById('masterHargaJual').value) || 0;
    let hBeliTotal = parseInt(document.getElementById('masterHargaBeli').value) || 0;
    let isi = parseInt(document.getElementById('masterIsi').value) || 1;

    if (!nama || hJual <= 0) return alert('Mohon lengkapi nama dan harga jual!');

    let hppSatuan = Math.round(hBeliTotal / isi);
    let item = {
        id: barcode,
        nama: nama,
        kategori: document.getElementById('masterKategori').value,
        satuan: document.getElementById('masterSatuan').value || 'pcs',
        isi: isi,
        hargaBeliTotal: hBeliTotal,
        hargaBeli: hppSatuan,
        harga: hJual
    };

    if(db) {
        db.ref('menu_tambahan/' + barcode).set(item);
    } else {
        databaseMenu.push(item);
    }
    resetFormMaster();
    renderMasterData();
    renderMenu();
    alert('Master Produk Berhasil Disimpan!');
}

function resetFormMaster() {
    document.getElementById('masterNama').value = '';
    document.getElementById('masterBarcode').value = '';
    document.getElementById('masterHargaBeli').value = '';
    document.getElementById('masterHargaJual').value = '';
}

function renderMasterData() {
    let tbody = document.getElementById('tabelMasterData');
    if (!tbody) return;
    let html = '';
    databaseMenu.forEach(item => {
        let hpp = item.hargaBeli || 0;
        let laba = item.harga - hpp;
        html += `
            <tr class="hover:bg-orange-50 border-b">
                <td class="p-2 font-mono text-[10px]">${item.id}</td>
                <td class="p-2 font-bold uppercase">${item.nama}</td>
                <td class="p-2 text-center">${item.kategori}</td>
                <td class="p-2 text-center">${item.isi || 1} ${item.satuan || 'pcs'}</td>
                <td class="p-2 text-right">Rp ${hpp.toLocaleString('id-ID')}</td>
                <td class="p-2 text-right font-bold">Rp ${item.harga.toLocaleString('id-ID')}</td>
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
    let idx = databaseMenu.findIndex(m => String(m.id) === String(id));
    if(idx !== -1) databaseMenu.splice(idx, 1);
    renderMasterData();
    renderMenu();
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
    let query = document.getElementById('cariMenuKasir').value.toLowerCase().trim();
    if(!query) {
        renderMenu();
        return;
    }
    let filtered = databaseMenu.filter(m => 
        m.nama.toLowerCase().includes(query) || String(m.id).toLowerCase().includes(query)
    );
    renderMenu(filtered);
}

function renderMenu(customList = null) {
    const container = document.getElementById('container-menu');
    if(!container) return;
    container.innerHTML = '';

    let list = customList || databaseMenu.filter(m => m.kategori === kategoriAktif);
    if(list.length === 0) {
        container.innerHTML = '<p class="col-span-3 text-center text-gray-400 py-8 text-xs">Menu tidak ditemukan</p>';
        return;
    }
    list.forEach(item => {
        container.innerHTML += `
            <div onclick="tambahItem('${item.id}')" class="p-2 bg-white border border-orange-200 rounded-lg shadow-sm cursor-pointer hover:border-orange-500 hover:shadow transition">
                <p class="font-bold text-xs uppercase line-clamp-1">${item.nama}</p>
                <p class="text-orange-600 font-black text-xs">Rp ${item.harga.toLocaleString('id-ID')}</p>
            </div>
        `;
    });
}

function tambahItem(id) {
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
        document.getElementById('textTotal').innerText = 'Rp 0';
        return;
    }

    let html = '';
    let total = 0;
    keranjang.forEach(item => {
        let sub = item.harga * item.qty;
        total += sub;
        html += `
            <div class="flex justify-between items-center py-1 border-b text-xs">
                <div class="flex-1 truncate">
                    <p class="font-bold uppercase">${item.nama}</p>
                    <p class="text-[10px] text-gray-500">@ Rp ${item.harga.toLocaleString('id-ID')}</p>
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

    let styro = (parseInt(document.getElementById('inputStyrofoam').value) || 0) * 1000;
    total += styro;

    container.innerHTML = html;
    document.getElementById('textTotal').innerText = 'Rp ' + total.toLocaleString('id-ID');
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
    let totalText = document.getElementById('textTotal').innerText.replace('Rp ', '').replace(/\./g, '');
    let total = parseInt(totalText) || 0;
    let bayar = parseInt(document.getElementById('inputBayar').value) || 0;
    let kembalian = bayar - total;
    document.getElementById('textKembalian').innerText = kembalian >= 0 ? 'Rp ' + kembalian.toLocaleString('id-ID') : 'Uang Kurang';
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
    let totalText = document.getElementById('textTotal').innerText.replace('Rp ', '').replace(/\./g, '');
    let total = parseInt(totalText) || 0;
    let bayar = parseInt(document.getElementById('inputBayar').value) || total;

    let nota = {
        id: 'NOTA-' + Date.now(),
        cabang: cabangAktif,
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
        let sub = i.harga * i.qty;
        total += sub;
        htmlItems += `
            <div class="nota-item-row font-bold">
                <span>${i.nama}</span>
                <div class="nota-item-detail">
                    <span>${i.qty} x ${i.harga.toLocaleString('id-ID')}</span>
                    <span>Rp${sub.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });

    document.getElementById('notaItems').innerHTML = htmlItems;
    document.getElementById('notaWaktu').innerText = "Waktu: " + new Date().toLocaleString('id-ID');
    document.getElementById('notaMetode').innerText = "Metode: " + metodePembayaran;
    document.getElementById('notaTotal').innerHTML = `
        <div class="flex justify-between font-bold"><span>TOTAL :</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
    `;

    const area = document.getElementById('areaNota');
    area.style.display = 'block';
    setTimeout(() => {
        window.print();
        area.style.display = 'none';
        simpanTransaksi();
        keranjang = [];
        updateKeranjang();
    }, 300);
}

/* ================= MANAJEMEN PENGELUARAN (EXPENSES) ================= */
function resetFormPengeluaran() {
    let todayISO = new Date().toISOString().split('T')[0];
    document.getElementById('pengeluaranTanggal').value = todayISO;
    document.getElementById('pengeluaranNominal').value = '';
    document.getElementById('pengeluaranKeterangan').value = '';
}

function simpanPengeluaran() {
    let tanggal = document.getElementById('pengeluaranTanggal').value;
    let kategori = document.getElementById('pengeluaranKategori').value;
    let metode = document.getElementById('pengeluaranMetode').value;
    let nominal = parseInt(document.getElementById('pengeluaranNominal').value) || 0;
    let keterangan = document.getElementById('pengeluaranKeterangan').value.trim();

    if (!tanggal || nominal <= 0 || !keterangan) {
        return alert('Mohon lengkapi tanggal, nominal, dan keterangan pengeluaran!');
    }

    let expenseItem = {
        id: 'EXP-' + Date.now(),
        cabang: cabangAktif,
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

/* ================= LAPORAN TRANSAKSI PENJUALAN ================= */
function setTanggalHariIniIfEmpty() {
    let todayISO = new Date().toISOString().split('T')[0];
    let tglMulai = document.getElementById('filterTanggalMulai');
    let tglSelesai = document.getElementById('filterTanggalSelesai');
    if(tglMulai && !tglMulai.value) tglMulai.value = todayISO;
    if(tglSelesai && !tglSelesai.value) tglSelesai.value = todayISO;

    let tglExpMulai = document.getElementById('filterTglPengeluaranMulai');
    let tglExpSelesai = document.getElementById('filterTglPengeluaranSelesai');
    if(tglExpMulai && !tglExpMulai.value) tglExpMulai.value = todayISO;
    if(tglExpSelesai && !tglExpSelesai.value) tglExpSelesai.value = todayISO;

    let pengeluaranTglInput = document.getElementById('pengeluaranTanggal');
    if(pengeluaranTglInput && !pengeluaranTglInput.value) pengeluaranTglInput.value = todayISO;
}

function terapkanFilterLaporan() {
    updateLaporan();
}

function resetFilterLaporan() {
    let todayISO = new Date().toISOString().split('T')[0];
    document.getElementById('filterTanggalMulai').value = todayISO;
    document.getElementById('filterTanggalSelesai').value = todayISO;
    updateLaporan();
}

function updateLaporan() {
    setTanggalHariIniIfEmpty();
    let tglMulai = document.getElementById('filterTanggalMulai').value;
    let tglSelesai = document.getElementById('filterTanggalSelesai').value;

    let sumberData = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    prosesRenderLaporan(sumberData, tglMulai, tglSelesai);
}

function prosesRenderLaporan(semuaTransaksi, tglMulai, tglSelesai) {
    let filtered = semuaTransaksi.filter(t => {
        let dateStr = t.tanggalISO;
        if (!dateStr && t.waktu) {
            let parts = t.waktu.split(',')[0].split('/');
            if (parts.length === 3) {
                dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        
        let matchDate = true;
        if(tglMulai && tglSelesai && dateStr) {
            matchDate = dateStr >= tglMulai && dateStr <= tglSelesai;
        }
        
        let matchCabang = (cabangAktif === 'SEMUA CABANG') || (t.cabang === cabangAktif);
        return matchDate && matchCabang;
    });

    let totalOmset = 0;
    let totalQris = 0;
    let totalCash = 0;
    let totalQty = 0;
    let itemMap = {};

    filtered.forEach(t => {
        let sumTotal = t.total || 0;
        totalOmset += sumTotal;
        
        if (t.metodePembayaran === 'QRIS') totalQris += sumTotal;
        else if (t.metodePembayaran === 'TUNAI') totalCash += sumTotal;

        if (Array.isArray(t.items)) {
            t.items.forEach(item => {
                let qty = parseInt(item.qty) || 0;
                let harga = parseInt(item.harga) || 0;
                totalQty += qty;

                if (!itemMap[item.nama]) {
                    itemMap[item.nama] = {
                        nama: item.nama,
                        kategori: item.kategori || 'Umum',
                        qty: 0,
                        subtotal: 0
                    };
                }
                itemMap[item.nama].qty += qty;
                itemMap[item.nama].subtotal += (harga * qty);
            });
        }
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
                let detailItemsStr = (t.items || []).map(i => `<span class="inline-block bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded mr-1 mb-1 font-semibold">${i.nama} <b>(x${i.qty})</b></span>`).join('');
                htmlRiwayat += `
                    <tr class="hover:bg-orange-50 border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${t.id}</td>
                        <td class="p-2 text-[11px] whitespace-nowrap">${t.waktu}</td>
                        <td class="p-2 text-[11px] font-bold text-gray-600">${t.cabang || '-'}</td>
                        <td class="p-2">${detailItemsStr}</td>
                        <td class="p-2 text-center font-bold"><span class="px-2 py-0.5 rounded text-[10px] ${t.metodePembayaran === 'QRIS' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">${t.metodePembayaran}</span></td>
                        <td class="p-2 text-right font-black text-orange-700">Rp ${(t.total || 0).toLocaleString('id-ID')}</td>
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
    let tglMulai = document.getElementById('filterTglPengeluaranMulai').value;
    let tglSelesai = document.getElementById('filterTglPengeluaranSelesai').value;
    let katFilter = document.getElementById('filterKategoriPengeluaran').value;

    let sumberData = (db && dataPengeluaranFirebase.length > 0) ? dataPengeluaranFirebase : riwayatPengeluaran;
    prosesRenderLaporanPengeluaran(sumberData, tglMulai, tglSelesai, katFilter);
}

function prosesRenderLaporanPengeluaran(semuaPengeluaran, tglMulai, tglSelesai, katFilter) {
    let filtered = semuaPengeluaran.filter(exp => {
        let dateStr = exp.tanggalISO;
        let matchDate = true;
        if (tglMulai && tglSelesai && dateStr) {
            matchDate = dateStr >= tglMulai && dateStr <= tglSelesai;
        }
        let matchCabang = (cabangAktif === 'SEMUA CABANG') || (exp.cabang === cabangAktif);
        let matchKategori = (katFilter === 'SEMUA') || (exp.kategori === katFilter);
        return matchDate && matchCabang && matchKategori;
    });

    let totalPengeluaran = 0;
    let totalTunai = 0;
    let totalTransfer = 0;
    let mapKategori = {};

    filtered.forEach(exp => {
        let nominal = parseInt(exp.nominal) || 0;
        totalPengeluaran += nominal;

        if (exp.metode === 'TRANSFER') totalTransfer += nominal;
        else totalTunai += nominal;

        if (!mapKategori[exp.kategori]) mapKategori[exp.kategori] = 0;
        mapKategori[exp.kategori] += nominal;
    });

    // Hitung Arus Kas Bersih (Net Cash Flow) dari Total Omset - Total Beban
    let totalOmsetSaatIni = 0;
    let sumberTx = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    sumberTx.filter(t => {
        let dateStr = t.tanggalISO;
        let matchDate = (tglMulai && tglSelesai && dateStr) ? (dateStr >= tglMulai && dateStr <= tglSelesai) : true;
        let matchCabang = (cabangAktif === 'SEMUA CABANG') || (t.cabang === cabangAktif);
        return matchDate && matchCabang;
    }).forEach(t => totalOmsetSaatIni += (t.total || 0));

    let arusKasBersih = totalOmsetSaatIni - totalPengeluaran;

    // Render Stats Pengeluaran
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

    // Render Tabel Riwayat Pengeluaran
    let containerTabel = document.getElementById('tabelRiwayatPengeluaran');
    if (containerTabel) {
        if (filtered.length === 0) {
            containerTabel.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-400">Tidak ada catatan pengeluaran pada periode ini</td></tr>`;
        } else {
            let html = '';
            filtered.forEach(exp => {
                html += `
                    <tr class="hover:bg-red-50 border-b">
                        <td class="p-2 font-mono text-[10px] font-bold text-gray-700">${exp.id}</td>
                        <td class="p-2 text-[11px] whitespace-nowrap">${exp.waktu || exp.tanggalISO}</td>
                        <td class="p-2 text-[11px] font-bold text-gray-600">${exp.cabang || '-'}</td>
                        <td class="p-2 font-semibold text-red-700">${exp.kategori}</td>
                        <td class="p-2 font-medium">${exp.keterangan}</td>
                        <td class="p-2 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${exp.metode === 'TRANSFER' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}">${exp.metode}</span></td>
                        <td class="p-2 text-right font-black text-red-600">Rp ${(exp.nominal || 0).toLocaleString('id-ID')}</td>
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
function calcInput(v) { calcExpr += v; document.getElementById('calcDisplay').value = calcExpr; }
function calcOp(op) { calcExpr += op; document.getElementById('calcDisplay').value = calcExpr; }
function calcClear() { calcExpr = ''; document.getElementById('calcDisplay').value = ''; }
function calcEqual() {
    try {
        calcExpr = eval(calcExpr).toString();
        document.getElementById('calcDisplay').value = calcExpr;
    } catch { document.getElementById('calcDisplay').value = 'Error'; }
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
        // Listener Realtime Database untuk Menu Tambahan
        db.ref('menu_tambahan').on('value', (s) => {
            let val = s.val();
            if(val) {
                Object.values(val).forEach(m => {
                    let idx = databaseMenu.findIndex(dm => String(dm.id) === String(m.id));
                    if(idx !== -1) databaseMenu[idx] = m;
                    else databaseMenu.push(m);
                });
                renderMenu();
                renderMasterData();
            }
        });

        // Listener Realtime Database untuk Transaksi Penjualan
        db.ref('transaksi').on('value', (snapshot) => {
            let data = snapshot.val();
            if (data) {
                dataTransaksiFirebase = Object.values(data);
                dataTransaksiFirebase.sort((a, b) => (b.id > a.id ? 1 : -1));
            } else {
                dataTransaksiFirebase = [];
            }
            updateLaporan();
            updateLaporanPengeluaran();
        });

        // Listener Realtime Database untuk Pengeluaran Kas
        db.ref('pengeluaran').on('value', (snapshot) => {
            let data = snapshot.val();
            if (data) {
                dataPengeluaranFirebase = Object.values(data);
                dataPengeluaranFirebase.sort((a, b) => (b.id > a.id ? 1 : -1));
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