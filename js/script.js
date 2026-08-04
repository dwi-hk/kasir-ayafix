// js/script.js

let keranjang = [];
let transaksiDitahan = [];
let cabangAktif = 'AYA SEBLAK DAN ANGKRINGAN';

let pelangganList = JSON.parse(localStorage.getItem('aya_pelanggan')) || [];
let supplierList = JSON.parse(localStorage.getItem('aya_supplier')) || [];
let karyawanList = JSON.parse(localStorage.getItem('aya_karyawan')) || [];
let absensiList = JSON.parse(localStorage.getItem('aya_absensi')) || [];
let inventarisList = JSON.parse(localStorage.getItem('aya_inventaris')) || [];
let barangTitipan = JSON.parse(localStorage.getItem('aya_titipan_v3')) || [];
let riwayatTransaksi = JSON.parse(localStorage.getItem('aya_transaksi_v3')) || [];

let kategoriAktif = 'topping';
let metodePembayaran = 'TUNAI';
let myChart = null;

// GANTI CABANG MANUAL
function gantiCabang(namaCabang) {
    cabangAktif = namaCabang;
    document.getElementById('lblCabangKasir').innerText = namaCabang;
    document.getElementById('txtCabangInv').innerText = namaCabang;
    renderInventaris();
    updateLaporan();
    alert(`Berhasil beralih ke cabang: ${namaCabang}`);
}

// BUKA DAN TUTUP TAB
function switchTab(tab) {
    ['master', 'cabang', 'kasir', 'backoffice', 'laporan', 'user', 'setting'].forEach(t => {
        document.getElementById('tab-' + t).classList.add('hidden');
        document.getElementById('btn-tab-' + t).classList.remove('bg-orange-700');
    });
    document.getElementById('tab-' + tab).classList.remove('hidden');
    document.getElementById('btn-tab-' + tab).classList.add('bg-orange-700');

    if(tab === 'master') renderMasterData();
    if(tab === 'laporan') updateLaporan();
    if(tab === 'cabang') renderInventaris();
}

function switchSubMaster(sub) {
    ['barang', 'titipan', 'pelanggan', 'supplier', 'karyawan'].forEach(s => {
        document.getElementById('sec-master-' + s).classList.add('hidden');
    });
    document.getElementById('sec-master-' + sub).classList.remove('hidden');
}

/* ================= MANAJEMEN MASTER DATA ================= */
function hitungEstimasiProfitMaster() {
    let isi = parseInt(document.getElementById('masterIsi').value) || 1;
    let hBeliTotal = parseInt(document.getElementById('masterHargaBeli').value) || 0;
    let hJual = parseInt(document.getElementById('masterHargaJual').value) || 0;

    let hppSatuan = Math.round(hBeliTotal / (isi > 0 ? isi : 1));
    let profit = hJual - hppSatuan;

    let el = document.getElementById('masterEstimasiProfit');
    el.innerText = `Rp ${profit.toLocaleString('id-ID')} (HPP: Rp ${hppSatuan.toLocaleString('id-ID')})`;
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
    renderMenu();
}

function renderMenu(customList = null) {
    const container = document.getElementById('container-menu');
    if(!container) return;
    container.innerHTML = '';

    let list = customList || databaseMenu.filter(m => m.kategori === kategoriAktif);
    list.forEach(item => {
        container.innerHTML += `
            <div onclick="tambahItem('${item.id}')" class="p-2 bg-white border border-orange-200 rounded-lg shadow-sm cursor-pointer hover:border-orange-500 transition">
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
                    <button onclick="ubahQty('${item.id}', -1)" class="px-1.5 bg-gray-200 font-bold rounded">-</button>
                    <span class="font-bold">${item.qty}</span>
                    <button onclick="ubahQty('${item.id}', 1)" class="px-1.5 bg-orange-500 text-white font-bold rounded">+</button>
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
        if(el) el.className = "py-1.5 rounded bg-gray-200 text-gray-700";
    });
    let selectedBtn = document.getElementById('btn-bayar-' + m.toLowerCase());
    if(selectedBtn) selectedBtn.className = "py-1.5 rounded bg-orange-600 text-white font-bold";
}

function hitungKembalian() {
    let totalText = document.getElementById('textTotal').innerText.replace('Rp ', '').replace(/\./g, '');
    let total = parseInt(totalText) || 0;
    let bayar = parseInt(document.getElementById('inputBayar').value) || 0;
    let kembalian = bayar - total;
    document.getElementById('textKembalian').innerText = kembalian >= 0 ? 'Rp ' + kembalian.toLocaleString('id-ID') : 'Uang Kurang';
}

// HOLD & RESUME TRANSACTION
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

/* ================= SIMPAN TRANSAKSI & CETAK NOTA THERMAL 58MM ================= */
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
    } else {
        riwayatTransaksi.unshift(nota);
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
    }
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

/* ================= INISIALISASI APPLIKASI ================= */
document.addEventListener('DOMContentLoaded', () => {
    renderMenu();
    renderMasterData();
    
    // Sync Realtime Firebase
    if(db) {
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
    }
});