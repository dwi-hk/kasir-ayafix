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
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch(e) { 
    console.error("Firebase initialization failed", e); 
}

let keranjang = [];
let keranjangPengeluaran = []; 
let riwayatTransaksi = JSON.parse(localStorage.getItem('aya_transaksi_v3')) || [];
let pengeluaran = JSON.parse(localStorage.getItem('aya_pengeluaran_v3')) || [];
let barangTitipan = JSON.parse(localStorage.getItem('aya_titipan_v3')) || [];

let kategoriAktif = 'topping';
let metodePembayaran = 'TUNAI';
let myChart = null;
let tanggalMulaiTerpilih = null;
let tanggalSelesaiTerpilih = null;

let tglPengeluaranMulai = null;
let tglPengeluaranSelesai = null;

let dataRekapItemGlobal = []; 

const UANG_MODAL_HARIAN = 70000;

function dapatkanTanggalLokal() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const lokal = new Date(d.getTime() - (offset * 60 * 1000));
    return lokal.toISOString().split('T')[0];
}

/* ========================================================
   FUNGSI MANAJEMEN MASTER DATA BARANG & PROFIT
   ======================================================== */

function hitungEstimasiProfitMaster() {
    let isi = parseInt(document.getElementById('masterIsi').value) || 1;
    let hargaBeliTotal = parseInt(document.getElementById('masterHargaBeli').value) || 0;
    let hargaJual = parseInt(document.getElementById('masterHargaJual').value) || 0;

    let hppSatuan = Math.round(hargaBeliTotal / (isi > 0 ? isi : 1));
    let profitSatuan = hargaJual - hppSatuan;

    let elProfit = document.getElementById('masterEstimasiProfit');
    if (profitSatuan >= 0) {
        elProfit.className = "p-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded border border-emerald-300";
        elProfit.innerText = `Rp ${profitSatuan.toLocaleString('id-ID')} / ${document.getElementById('masterSatuan').value} (HPP: Rp ${hppSatuan.toLocaleString('id-ID')})`;
    } else {
        elProfit.className = "p-2 bg-red-100 text-red-800 text-xs font-bold rounded border border-red-300";
        elProfit.innerText = `Rugi: Rp ${profitSatuan.toLocaleString('id-ID')} / ${document.getElementById('masterSatuan').value} (HPP: Rp ${hppSatuan.toLocaleString('id-ID')})`;
    }
}

function simpanMasterDatabase() {
    let id = document.getElementById('masterId').value;
    let nama = document.getElementById('masterNama').value.trim();
    let kategori = document.getElementById('masterKategori').value;
    let satuan = document.getElementById('masterSatuan').value || 'pcs';
    let isi = parseInt(document.getElementById('masterIsi').value) || 1;
    let hargaBeliTotal = parseInt(document.getElementById('masterHargaBeli').value) || 0;
    let hargaJual = parseInt(document.getElementById('masterHargaJual').value) || 0;

    if (!nama || hargaJual <= 0) {
        return alert('Mohon isi nama barang dan harga jual dengan benar!');
    }

    let hppSatuan = Math.round(hargaBeliTotal / (isi > 0 ? isi : 1));
    let idBarang = id ? id : 'MENU-' + Date.now();

    let dataBarang = {
        id: idBarang,
        nama: nama,
        kategori: kategori,
        satuan: satuan,
        isi: isi,
        hargaBeliTotal: hargaBeliTotal,
        hargaBeli: hppSatuan, // HPP per satuan
        harga: hargaJual
    };

    if (db) {
        db.ref('menu_tambahan/' + idBarang).set(dataBarang);
    } else {
        let idx = databaseMenu.findIndex(m => String(m.id) === String(idBarang));
        if (idx !== -1) {
            databaseMenu[idx] = dataBarang;
        } else {
            databaseMenu.push(dataBarang);
        }
        renderMasterData();
        renderMenu();
    }

    resetFormMaster();
    alert('Master data barang berhasil disimpan!');
}

function editMasterData(id) {
    let item = databaseMenu.find(m => String(m.id) === String(id));
    if (!item) return alert("Barang tidak ditemukan!");

    document.getElementById('masterId').value = item.id;
    document.getElementById('masterNama').value = item.nama;
    document.getElementById('masterKategori').value = item.kategori || 'topping';
    document.getElementById('masterSatuan').value = item.satuan || 'pcs';
    document.getElementById('masterIsi').value = item.isi || 1;
    document.getElementById('masterHargaBeli').value = item.hargaBeliTotal || ((item.hargaBeli || 0) * (item.isi || 1));
    document.getElementById('masterHargaJual').value = item.harga || 0;

    document.getElementById('masterFormTitle').innerText = '✏️ Edit Master Barang: ' + item.nama;
    hitungEstimasiProfitMaster();
}

function hapusMasterData(id) {
    let item = databaseMenu.find(m => String(m.id) === String(id));
    if (!item) return;

    if (!confirm(`Apakah Anda yakin ingin menghapus barang [ ${item.nama} ] dari Master Data?`)) return;

    let idx = databaseMenu.findIndex(m => String(m.id) === String(id));
    if (idx !== -1) databaseMenu.splice(idx, 1);

    if (db) {
        db.ref('menu_tambahan/' + id).remove();
    }

    renderMasterData();
    renderMenu();
    alert("Data berhasil dihapus!");
}

function resetFormMaster() {
    document.getElementById('masterId').value = '';
    document.getElementById('masterNama').value = '';
    document.getElementById('masterIsi').value = '1';
    document.getElementById('masterHargaBeli').value = '';
    document.getElementById('masterHargaJual').value = '';
    document.getElementById('masterFormTitle').innerText = '➕ Input Master Barang Baru';
    hitungEstimasiProfitMaster();
}

function renderMasterData() {
    let tbody = document.getElementById('tabelMasterData');
    if (!tbody) return;

    if (databaseMenu.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400 italic">Belum ada data master barang.</td></tr>`;
        return;
    }

    let html = '';
    databaseMenu.forEach(item => {
        let isi = item.isi || 1;
        let hBeliSatuan = item.hargaBeli || 0;
        let profit = (item.harga || 0) - hBeliSatuan;

        html += `
            <tr class="hover:bg-orange-50/40 transition border-b border-gray-100">
                <td class="p-3 font-bold text-gray-800 uppercase">${item.nama}</td>
                <td class="p-3 text-center">
                    <span class="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase">${item.kategori || 'umum'}</span>
                </td>
                <td class="p-3 text-center text-gray-600">${isi} ${item.satuan || 'pcs'}</td>
                <td class="p-3 text-right font-medium text-gray-500">Rp ${hBeliSatuan.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-bold text-gray-800">Rp ${(item.harga || 0).toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-extrabold ${profit >= 0 ? 'text-emerald-600 bg-emerald-50/40' : 'text-red-500 bg-red-50/40'}">
                    Rp ${profit.toLocaleString('id-ID')}
                </td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editMasterData('${item.id}')" class="px-2 py-1 bg-blue-500 text-white text-[10px] rounded font-bold hover:bg-blue-600 cursor-pointer">✏️ Edit</button>
                    <button onclick="hapusMasterData('${item.id}')" class="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold hover:bg-red-600 cursor-pointer">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

if (db) {
    db.ref('menu_tambahan').on('value', (snapshot) => {
        const data = snapshot.val();
        if(data) {
            Object.values(data).forEach(m => {
                const adaDiMenu = databaseMenu.find(dm => String(dm.id) === String(m.id));
                if(adaDiMenu) {
                    adaDiMenu.nama = m.nama;
                    adaDiMenu.hargaBeli = m.hargaBeli || 0;
                    adaDiMenu.hargaBeliTotal = m.hargaBeliTotal || 0;
                    adaDiMenu.harga = m.harga;
                    adaDiMenu.isi = m.isi || 1;
                    adaDiMenu.satuan = m.satuan || 'pcs';
                    adaDiMenu.kategori = m.kategori;
                } else {
                    databaseMenu.push(m);
                }
            });
            renderMenu();
            renderMasterData();
        }
    });

    db.ref('transaksi').on('value', (snapshot) => {
        const data = snapshot.val();
        riwayatTransaksi = data ? Object.values(data).sort((a, b) => b.id.localeCompare(a.id)) : [];
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
        hitungOtomatisTerjualTitipan();
        if(!document.getElementById('tab-laporan').classList.contains('hidden')) updateLaporan();
    });

    db.ref('pengeluaran').on('value', (snapshot) => {
        const data = snapshot.val();
        pengeluaran = data ? Object.values(data).sort((a, b) => b.id.localeCompare(a.id)) : [];
        localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(pengeluaran));
        renderPengeluaran();
        if(!document.getElementById('tab-laporan').classList.contains('hidden')) updateLaporan();
    });

    db.ref('barang_titipan').on('value', (snapshot) => {
        const data = snapshot.val();
        barangTitipan = data ? Object.values(data) : [];
        localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));
        hitungOtomatisTerjualTitipan();
    });
}

function tambahBarangTitipan() {
    let nama = document.getElementById('titipanNama').value.trim();
    let jumlah = parseInt(document.getElementById('titipanJumlah').value) || 0;
    let kontak = document.getElementById('titipanKontak').value.trim();
    let hargaBeli = parseInt(document.getElementById('titipanHargaBeli').value) || 0;
    let hargaJual = parseInt(document.getElementById('titipanHargaJual').value) || 0;

    if(!nama || jumlah <= 0 || !kontak || hargaBeli < 0 || hargaJual < 0) {
        return alert('Mohon isi semua data input barang titipan dengan benar!');
    }

    let idBarang = 'TITIP-' + Date.now();
    let dataBaru = {
        id: idBarang,
        nama: nama,
        jumlahAwal: jumlah,
        kontak: kontak,
        hargaBeli: hargaBeli,
        hargaJual: hargaJual,
        sudahDibayar: 0,
        retur: 0
    };

    if(db) {
        db.ref('barang_titipan/' + idBarang).set(dataBaru);
    } else {
        barangTitipan.push(dataBaru);
        localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));
        hitungOtomatisTerjualTitipan();
    }

    document.getElementById('titipanNama').value = '';
    document.getElementById('titipanJumlah').value = '';
    document.getElementById('titipanKontak').value = '';
    document.getElementById('titipanHargaBeli').value = '';
    document.getElementById('titipanHargaJual').value = '';
    alert('Barang titipan berhasil ditambahkan!');
}

function hitungOtomatisTerjualTitipan() {
    barangTitipan.forEach(bt => {
        const adaDiMenu = databaseMenu.find(m => m.id === bt.id || m.nama.toLowerCase() === bt.nama.toLowerCase());
        if (!adaDiMenu) {
            databaseMenu.push({
                id: bt.id,
                nama: bt.nama,
                hargaBeli: bt.hargaBeli,
                harga: bt.hargaJual,
                satuan: 'pcs',
                kategori: 'jajanan'
            });
        }
    });
    renderMenu();

    let container = document.getElementById('tabelDaftarTitipan');
    if(barangTitipan.length === 0) {
        container.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-gray-400 italic">Belum ada data barang titipan.</td></tr>`;
        return;
    }

    let counterTerjual = {};
    riwayatTransaksi.forEach(t => {
        if(t.items) {
            t.items.forEach(i => {
                counterTerjual[i.nama.toLowerCase()] = (counterTerjual[i.nama.toLowerCase()] || 0) + i.qty;
            });
        }
    });

    let html = '';
    barangTitipan.forEach(bt => {
        let terjual = counterTerjual[bt.nama.toLowerCase()] || 0;
        let stok = bt.jumlahAwal - terjual - bt.retur;
        if(stok < 0) stok = 0;

        let profitSatuan = bt.hargaJual - bt.hargaBeli;
        let totalProfit = profitSatuan * terjual;
        let hutangTerjual = bt.hargaBeli * terjual; 

        html += `
            <tr class="hover:bg-orange-50/40 transition border-b border-gray-100">
                <td class="p-3">
                    <p class="font-bold text-gray-800 uppercase">${bt.nama}</p>
                    <p class="text-[10px] text-gray-400">📞 ${bt.kontak}</p>
                </td>
                <td class="p-3 text-center font-medium">${bt.jumlahAwal} pcs</td>
                <td class="p-3 text-center font-bold text-orange-600">${terjual} pcs</td>
                <td class="p-3 text-center font-medium text-red-500">${bt.retur} pcs</td>
                <td class="p-3 text-center font-bold text-emerald-600 bg-emerald-50/50">${stok} pcs</td>
                <td class="p-3 text-right text-gray-500">
                    T: Rp ${bt.hargaBeli.toLocaleString('id-ID')}<br>
                    J: Rp ${bt.hargaJual.toLocaleString('id-ID')}
                </td>
                <td class="p-3 text-right font-bold text-amber-700">Rp ${hutangTerjual.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-bold text-blue-600">Rp ${(bt.sudahDibayar || 0).toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-black text-emerald-700 bg-orange-50/30">Rp ${totalProfit.toLocaleString('id-ID')}</td>
                <td class="p-3 text-center space-y-1">
                    <button onclick="kelolaTitipan('${bt.id}', 'bayar')" class="block w-full text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600 cursor-pointer font-bold">💰 Bayar</button>
                    <button onclick="kelolaTitipan('${bt.id}', 'retur')" class="block w-full text-[9px] bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 cursor-pointer font-bold">🔄 Retur</button>
                    <button onclick="hapusBarangTitipan('${bt.id}')" class="block w-full text-[9px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-300 cursor-pointer font-medium">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    container.innerHTML = html;
}

function kelolaTitipan(id, jenis) {
    let item = barangTitipan.find(b => b.id === id);
    if(!item) return;

    if(jenis === 'bayar') {
        let nominal = parseInt(prompt(`Masukkan nominal pembayaran hutang kepada pengirim barang untuk [ ${item.nama} ]:`)) || 0;
        if(nominal <= 0) return alert('Nominal tidak valid!');
        item.sudahDibayar = (item.sudahDibayar || 0) + nominal;
    } else if (jenis === 'retur') {
        let jmlRetur = parseInt(prompt(`Masukkan kuantitas barang retur/kembali untuk [ ${item.nama} ]:`)) || 0;
        if(jmlRetur < 0) return alert('Jumlah tidak valid!');
        item.retur = jmlRetur;
    }

    if(db) {
        db.ref('barang_titipan/' + id).set(item);
    } else {
        localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));
        hitungOtomatisTerjualTitipan();
    }
}

function hapusBarangTitipan(id) {
    if(!confirm('Apakah Anda yakin ingin menghapus data barang titipan ini?')) return;
    if(db) {
        db.ref('barang_titipan/' + id).remove();
    } else {
        barangTitipan = barangTitipan.filter(b => b.id !== id);
        localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));
        hitungOtomatisTerjualTitipan();
    }
}

function renderMenu() {
    const container = document.getElementById('container-menu');
    if (!container) return;
    container.innerHTML = '';
    const menuTerfilter = databaseMenu.filter(item => item.kategori === kategoriAktif);

    if (menuTerfilter.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-400 py-6 text-xs italic">Belum ada menu di kategori ini.</p>`;
        return;
    }

    menuTerfilter.forEach(item => {
        let hBeli = item.hargaBeli || 0;
        let profit = item.harga - hBeli;
        let satuan = item.satuan || 'pcs';

        container.innerHTML += `
            <div class="p-2 sm:p-3 bg-white border-2 border-orange-200 rounded-xl flex flex-col justify-between shadow-sm relative group hover:border-orange-400 transition">
                <div onclick="tambahItem('${item.id}')" class="cursor-pointer flex flex-col justify-between h-full">
                    <div>
                        <span class="font-bold text-[11px] sm:text-xs text-gray-700 uppercase tracking-tight line-clamp-2">${item.nama}</span>
                        <p class="text-[9px] text-gray-400">Modal: Rp ${hBeli.toLocaleString('id-ID')} / ${satuan}</p>
                    </div>
                    <div class="my-1">
                        <span class="text-orange-600 font-extrabold text-xs sm:text-sm">Rp ${item.harga.toLocaleString('id-ID')}</span>
                        <span class="text-[9px] font-bold text-emerald-600 block">Laba: Rp ${profit.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                <div class="flex justify-between items-center border-t border-gray-100 pt-1.5 mt-1 text-[10px]">
                    <button onclick="editMasterData('${item.id}'); switchTab('master');" class="text-blue-600 font-bold hover:text-blue-800 cursor-pointer flex items-center gap-0.5">✏️ Edit</button>
                    <button onclick="hapusMasterData('${item.id}')" class="text-red-500 font-bold hover:text-red-700 cursor-pointer flex items-center gap-0.5">❌ Hapus</button>
                </div>
            </div>
        `;
    });
}

function filterKategori(kategori) {
    kategoriAktif = kategori;
    ['topping', 'makanan', 'dingin', 'panas', 'jajanan'].forEach(kat => {
        const btn = document.getElementById('btn-kat-' + kat);
        if (btn) {
            btn.className = "px-4 py-2 font-bold text-xs sm:text-sm rounded-lg transition cursor-pointer whitespace-nowrap " + 
                            (kat === kategori ? "bg-orange-500 text-white shadow" : "bg-gray-100 text-gray-700");
        }
    });
    renderMenu();
}

function setMetodePembayaran(metode) {
    let btnTunai = document.getElementById('btn-bayar-tunai');
    let btnQris = document.getElementById('btn-bayar-qris');
    let btnKonsumsi = document.getElementById('btn-bayar-konsumsi');
    let wrapBayar = document.getElementById('wrapperUangBayar');
    let wrapKembali = document.getElementById('wrapperKembalian');

    btnTunai.className = "py-2 text-center text-[10px] font-bold rounded-lg bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer transition";
    btnQris.className = "py-2 text-center text-[10px] font-bold rounded-lg bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer transition";
    btnKonsumsi.className = "py-2 text-center text-[10px] font-bold rounded-lg bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer transition";

    metodePembayaran = metode;
    if (metode === 'TUNAI') {
        btnTunai.className = "py-2 text-center text-[10px] font-bold rounded-lg bg-orange-600 text-white shadow border border-orange-600 cursor-pointer transition";
        wrapBayar.classList.remove('hidden');
        wrapKembali.classList.remove('hidden');
    } else if (metode === 'QRIS') {
        btnQris.className = "py-2 text-center text-[10px] font-bold rounded-lg bg-orange-600 text-white shadow border border-orange-600 cursor-pointer transition";
        wrapBayar.classList.add('hidden');
        wrapKembali.classList.add('hidden');
    } else if (metode === 'KONSUMSI') {
        btnKonsumsi.className = "py-2 text-center text-[10px] font-bold rounded-lg bg-orange-600 text-white shadow border border-orange-600 cursor-pointer transition";
        wrapBayar.classList.add('hidden');
        wrapKembali.classList.add('hidden');
    }
    hitungKembalian();
}

function tambahItem(id) {
    const produk = databaseMenu.find(p => String(p.id) === String(id));
    const ada = keranjang.find(k => String(k.id) === String(id));
    if (ada) {
        ada.qty += 1;
    } else {
        keranjang.push({ ...produk, hargaBeli: produk.hargaBeli || 0, satuan: produk.satuan || 'pcs', qty: 1 });
    }
    updateKeranjang();
}

function ubahQty(id, delta) {
    const ada = keranjang.find(k => String(k.id) === String(id));
    if(ada) {
        ada.qty += delta;
        if(ada.qty <= 0) {
            keranjang = keranjang.filter(k => String(k.id) !== String(id));
        }
    }
    updateKeranjang();
}

function hitungTotalKeseluruhan() {
    let totalBelanja = keranjang.reduce((sum, item) => sum + (item.harga * item.qty), 0);
    if (keranjang.length === 0) return 0;

    let ongkir = parseInt(document.getElementById('inputOngkir').value) || 0;
    let qtyStyrofoam = parseInt(document.getElementById('inputStyrofoam').value) || 0;
    let biayaStyrofoam = qtyStyrofoam * 1000;

    return totalBelanja + ongkir + biayaStyrofoam;
}

function updateKeranjang() {
    const container = document.getElementById('tabelKeranjang');
    if (keranjang.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Belum ada item dipilih</p>';
        document.getElementById('textTotal').innerText = 'Rp 0';
        hitungKembalian();
        return;
    }

    let html = '<div class="space-y-1.5">';
    keranjang.forEach(item => {
        let subtotal = item.harga * item.qty;
        html += `
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                <div class="flex-1 min-w-0 pr-1">
                    <p class="font-bold text-[11px] text-gray-800 uppercase truncate">${item.nama}</p>
                    <p class="text-[10px] text-gray-500">Rp ${item.harga.toLocaleString('id-ID')} / ${item.satuan || 'pcs'}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="ubahQty('${item.id}', -1)" class="w-5 h-5 bg-gray-200 rounded font-bold text-xs flex items-center justify-center text-gray-600 hover:bg-gray-300 cursor-pointer">-</button>
                    <span class="font-bold text-xs text-gray-800 px-1">${item.qty}</span>
                    <button onclick="ubahQty('${item.id}', 1)" class="w-5 h-5 bg-orange-500 text-white rounded font-bold text-xs flex items-center justify-center hover:bg-orange-600 cursor-pointer">+</button>
                </div>
                <span class="font-bold text-xs text-gray-700 w-16 text-right">Rp ${subtotal.toLocaleString('id-ID')}</span>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;

    let totalAkhir = hitungTotalKeseluruhan();
    document.getElementById('textTotal').innerText = 'Rp ' + totalAkhir.toLocaleString('id-ID');
    hitungKembalian();
}

function hitungDanRenderRekapItem(transaksiTerfilter) {
    let rekapMap = {};

    transaksiTerfilter.forEach(n => {
        if (n.metodePembayaran !== 'MODAL_MASUK' && n.items && n.items.length > 0) { 
            n.items.forEach(item => {
                let hBeli = item.hargaBeli || 0;
                let hJual = item.harga || 0;
                let profitSatuan = hJual - hBeli;

                if (!rekapMap[item.nama]) {
                    rekapMap[item.nama] = {
                        nama: item.nama,
                        kategori: item.kategori || 'lainnya',
                        hargaBeli: hBeli,
                        harga: hJual,
                        satuan: item.satuan || 'pcs',
                        qtyTotal: 0,
                        subtotal: 0,
                        totalProfit: 0
                    };
                }
                rekapMap[item.nama].qtyTotal += item.qty;
                rekapMap[item.nama].subtotal += (hJual * item.qty);
                rekapMap[item.nama].totalProfit += (profitSatuan * item.qty);
            });
        }
    });

    dataRekapItemGlobal = Object.values(rekapMap).sort((a, b) => b.qtyTotal - a.qtyTotal);
    renderTabelRekapItem(dataRekapItemGlobal);
}

function renderTabelRekapItem(dataArray) {
    const tbody = document.getElementById('tabelRekapItemTerjual');
    
    if (dataArray.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center text-gray-400 italic text-xs">Tidak ada item yang laku terjual pada periode ini.</td>
            </tr>
        `;
        return;
    }

    let html = '';
    dataArray.forEach(item => {
        html += `
            <tr class="hover:bg-orange-50/50 transition border-b border-gray-100">
                <td class="p-3 font-semibold text-gray-800 uppercase tracking-tight">${item.nama}</td>
                <td class="p-3 text-center">
                    <span class="px-2 py-0.5 bg-orange-100/50 text-orange-700 rounded text-[9px] font-bold uppercase tracking-wider">${item.kategori}</span>
                </td>
                <td class="p-3 text-right font-medium text-gray-400">Rp ${(item.hargaBeli || 0).toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-medium text-gray-600">Rp ${item.harga.toLocaleString('id-ID')}</td>
                <td class="p-3 text-center font-bold text-orange-600 text-sm">${item.qtyTotal.toLocaleString('id-ID')} ${item.satuan}</td>
                <td class="p-3 text-right font-black text-gray-950">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-black text-emerald-600 bg-emerald-50/30">Rp ${item.totalProfit.toLocaleString('id-ID')}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function cariItemDalamRekap() {
    const keyword = document.getElementById('cariItemRekap').value.toLowerCase().trim();
    if (!keyword) {
        renderTabelRekapItem(dataRekapItemGlobal);
        return;
    }

    const dataTerfilter = dataRekapItemGlobal.filter(item => 
        item.nama.toLowerCase().includes(keyword) || 
        item.kategori.toLowerCase().includes(keyword)
    );
    renderTabelRekapItem(dataTerfilter);
}

function hitungKembalian() {
    let total = hitungTotalKeseluruhan();
    if (metodePembayaran === 'QRIS' || metodePembayaran === 'KONSUMSI') {
        document.getElementById('textKembalian').innerText = 'Rp 0';
        return;
    }
    let bayar = parseInt(document.getElementById('inputBayar').value) || 0;
    let kembalian = bayar - total;
    document.getElementById('textKembalian').innerText = kembalian >= 0 ? 'Rp ' + kembalian.toLocaleString('id-ID') : 'Uang Kurang';
}

function bersihkanKeranjang() {
    keranjang = [];
    document.getElementById('inputBayar').value = '';
    document.getElementById('inputOngkir').value = '';
    document.getElementById('inputStyrofoam').value = '';
    setMetodePembayaran('TUNAI');
    updateKeranjang();
}

function simpanTransaksi() {
    if (keranjang.length === 0) { alert('Keranjang kosong!'); return false; }
    let total = hitungTotalKeseluruhan();
    let ongkir = parseInt(document.getElementById('inputOngkir').value) || 0;
    let qtyStyrofoam = parseInt(document.getElementById('inputStyrofoam').value) || 0;
    
    let bayar = total;
    let kembalian = 0;

    if (metodePembayaran === 'TUNAI') {
        bayar = parseInt(document.getElementById('inputBayar').value) || 0;
        if (bayar < total) { alert('Uang pembayaran Anda masih kurang!'); return false; }
        kembalian = bayar - total;
    }

    let idNota = 'NOTA-' + Date.now();
    let tglLokal = dapatkanTanggalLokal();
    let nota = {
        id: idNota,
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: tglLokal,
        items: [...keranjang],
        total: total,
        bayar: bayar,
        kembalian: kembalian,
        metodePembayaran: metodePembayaran,
        ongkir: ongkir,
        qtyStyrofoam: qtyStyrofoam
    };

    if (db) {
        db.ref('transaksi/' + idNota).set(nota);
    } else {
        riwayatTransaksi.unshift(nota);
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
        hitungOtomatisTerjualTitipan();
        updateLaporan();
    }
    return true;
}

function tombolSimpanSaja() {
    let sukses = simpanTransaksi();
    if(sukses) {
        alert('Sukses! Transaksi Berhasil Disimpan.');
        bersihkanKeranjang();
    }
}

function cetakNota() {
    if (keranjang.length === 0) return alert('Keranjang belanja masih kosong!');
    let total = hitungTotalKeseluruhan();
    let ongkir = parseInt(document.getElementById('inputOngkir').value) || 0;
    let qtyStyrofoam = parseInt(document.getElementById('inputStyrofoam').value) || 0;
    
    let bayar = total;
    if (metodePembayaran === 'TUNAI') {
        bayar = parseInt(document.getElementById('inputBayar').value) || 0;
        if (bayar < total) return alert('Input uang bayar dengan benar sebelum mencetak!');
    }

    document.getElementById('notaWaktu').innerHTML = `
        <div>Waktu: ${new Date().toLocaleString('id-ID')}</div>
        <div>No   : REG-${Date.now().toString().slice(-6)}</div>
    `;
    document.getElementById('notaMetode').innerHTML = `METODE PEMBAYARAN: ${metodePembayaran}`;
    
    let htmlItems = '';
    keranjang.forEach(item => {
        let subtotal = item.harga * item.qty;
        htmlItems += `
            <div class="nota-item-row font-bold text-gray-900">
                <span class="truncate uppercase">${item.nama}</span>
                <div class="nota-item-detail font-normal text-gray-700">
                    <span>${item.qty}x${item.harga.toLocaleString('id-ID')}</span>
                    <span>Rp${subtotal.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    });
    
    if(qtyStyrofoam > 0) {
        let subtotalStyrofoam = qtyStyrofoam * 1000;
        htmlItems += `
            <div class="nota-item-row font-bold text-gray-900">
                <span>STYROFOAM</span>
                <div class="nota-item-detail font-normal text-gray-700">
                    <span>${qtyStyrofoam}x1.000</span>
                    <span>Rp${subtotalStyrofoam.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    }
    if(ongkir > 0) {
        htmlItems += `
            <div class="nota-item-row font-bold text-gray-900">
                <span>ONGKOS KIRIM</span>
                <div class="nota-item-detail font-normal text-gray-700">
                    <span>Manual</span>
                    <span>Rp${ongkir.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    }

    document.getElementById('notaItems').innerHTML = htmlItems;
    
    document.getElementById('notaTotal').innerHTML = `
        <div class="flex justify-between font-bold text-[13px] mt-1"><span>TOTAL :</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
        <div class="flex justify-between text-gray-800"><span>BAYAR :</span><span>Rp ${bayar.toLocaleString('id-ID')}</span></div>
        <div class="flex justify-between text-gray-800 font-bold"><span>KEMBALI:</span><span>Rp ${(bayar - total).toLocaleString('id-ID')}</span></div>
    `;
    
    const notaArea = document.getElementById('areaNota');
    notaArea.style.display = 'block';

    setTimeout(() => {
        window.print();
        notaArea.style.display = 'none';

        let sukses = simpanTransaksi();
        if(sukses) {
            bersihkanKeranjang();
        }
    }, 300);
}

function cetakUlangNota(idNota) {
    const notaLama = riwayatTransaksi.find(n => n.id === idNota);
    if (!notaLama) return alert('Nota transaksi tidak ditemukan!');

    document.getElementById('notaWaktu').innerHTML = `
        <div>Waktu: ${notaLama.waktu}</div>
        <div>No   : RE-PRINT</div>
    `;
    document.getElementById('notaMetode').innerHTML = `METODE PEMBAYARAN: ${notaLama.metodePembayaran || 'TUNAI'}`;
    
    let htmlItems = '';
    if (notaLama.items && notaLama.items.length > 0) {
        notaLama.items.forEach(item => {
            let subtotal = item.harga * item.qty;
            htmlItems += `
                <div class="nota-item-row font-bold text-gray-900">
                    <span class="truncate uppercase">${item.nama}</span>
                    <div class="nota-item-detail font-normal text-gray-700">
                        <span>${item.qty}x${item.harga.toLocaleString('id-ID')}</span>
                        <span>Rp${subtotal.toLocaleString('id-ID')}</span>
                    </div>
                </div>
            `;
        });
    }
    
    if(notaLama.qtyStyrofoam > 0) {
        let subtotalStyrofoam = notaLama.qtyStyrofoam * 1000;
        htmlItems += `
            <div class="nota-item-row font-bold text-gray-900">
                <span>STYROFOAM</span>
                <div class="nota-item-detail font-normal text-gray-700">
                    <span>${notaLama.qtyStyrofoam}x1.000</span>
                    <span>Rp${subtotalStyrofoam.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    }
    if(notaLama.ongkir > 0) {
        htmlItems += `
            <div class="nota-item-row font-bold text-gray-900">
                <span>ONGKOS KIRIM</span>
                <div class="nota-item-detail font-normal text-gray-700">
                    <span>Manual</span>
                    <span>Rp${notaLama.ongkir.toLocaleString('id-ID')}</span>
                </div>
            </div>
        `;
    }

    document.getElementById('notaItems').innerHTML = htmlItems;
    
    let bayar = notaLama.bayar || notaLama.total;
    let kembali = notaLama.kembalian || (bayar - notaLama.total);
    if (notaLama.metodePembayaran === 'QRIS' || notaLama.metodePembayaran === 'KONSUMSI') {
        bayar = notaLama.total;
        kembali = 0;
    }

    document.getElementById('notaTotal').innerHTML = `
        <div class="flex justify-between font-bold text-[13px] mt-1"><span>TOTAL :</span><span>Rp ${notaLama.total.toLocaleString('id-ID')}</span></div>
        <div class="flex justify-between text-gray-800"><span>BAYAR :</span><span>Rp ${bayar.toLocaleString('id-ID')}</span></div>
        <div class="flex justify-between text-gray-800 font-bold"><span>KEMBALI:</span><span>Rp ${kembali.toLocaleString('id-ID')}</span></div>
    `;
    
    const notaArea = document.getElementById('areaNota');
    notaArea.style.display = 'block';

    setTimeout(() => {
        window.print();
        notaArea.style.display = 'none';
    }, 300);
}

function tambahKeDaftarBelanja() {
    let nama = document.getElementById('namaPengeluaran').value.trim();
    let harga = parseInt(document.getElementById('hargaPengeluaran').value) || 0;
    let qty = parseInt(document.getElementById('qtyPengeluaran').value) || 1;
    let satuan = document.getElementById('satuanPengeluaran').value;

    if (!nama || harga <= 0 || qty <= 0) {
        return alert('Silakan masukkan nama barang, harga satuan, and quantity dengan benar!');
    }

    let idItem = 'EXP-ITEM-' + Date.now();
    let subtotal = harga * qty;

    keranjangPengeluaran.push({
        id: idItem,
        nama: nama,
        harga: harga,
        qty: qty,
        satuan: satuan,
        subtotal: subtotal
    });

    document.getElementById('namaPengeluaran').value = '';
    document.getElementById('hargaPengeluaran').value = '';
    document.getElementById('qtyPengeluaran').value = '1';
    document.getElementById('satuanPengeluaran').value = 'pcs';

    updateDaftarBelanjaPengeluaran();
}

function hapusItemBelanjaPengeluaran(idItem) {
    keranjangPengeluaran = keranjangPengeluaran.filter(item => item.id !== idItem);
    updateDaftarBelanjaPengeluaran();
}

function updateDaftarBelanjaPengeluaran() {
    let container = document.getElementById('tabelBelanjaPengeluaran');
    let totalEl = document.getElementById('totalBelanjaPengeluaran');

    if (keranjangPengeluaran.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">Belum ada barang di daftar belanja</p>';
        totalEl.innerText = 'Rp 0';
        return;
    }

    let html = '<div class="space-y-1.5">';
    let total = 0;

    keranjangPengeluaran.forEach(item => {
        total += item.subtotal;
        html += `
            <div class="flex justify-between items-center py-1.5 border-b border-gray-100">
                <div class="flex-1">
                    <p class="font-bold text-gray-800 uppercase">${item.nama}</p>
                    <p class="text-[10px] text-gray-500">${item.qty} ${item.satuan} x Rp ${item.harga.toLocaleString('id-ID')}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-gray-700">Rp ${item.subtotal.toLocaleString('id-ID')}</span>
                    <button onclick="hapusItemBelanjaPengeluaran('${item.id}')" class="text-red-500 font-bold hover:text-red-700 cursor-pointer">❌</button>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
    totalEl.innerText = 'Rp ' + total.toLocaleString('id-ID');
}

function simpanPengeluaran() {
    if (keranjangPengeluaran.length === 0) {
        return alert('Silakan tambahkan barang belanjaan ke daftar terlebih dahulu!');
    }

    let totalBiaya = keranjangPengeluaran.reduce((sum, item) => sum + item.subtotal, 0);
    let idPengeluaran = 'EXP-' + Date.now();
    let tglLokal = dapatkanTanggalLokal();

    let namaRingkas = keranjangPengeluaran.map(item => `${item.nama} (${item.qty} ${item.satuan})`).join(', ');
    if (namaRingkas.length > 50) {
        namaRingkas = namaRingkas.slice(0, 47) + '...';
    }

    let dataPengeluaran = { 
        id: idPengeluaran,
        nama: namaRingkas, 
        biaya: totalBiaya, 
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: tglLokal,
        items: [...keranjangPengeluaran]
    };

    if (db) {
        db.ref('pengeluaran/' + idPengeluaran).set(dataPengeluaran);
    } else {
        pengeluaran.unshift(dataPengeluaran);
        localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(pengeluaran));
        renderPengeluaran();
        updateLaporan();
    }

    keranjangPengeluaran = [];
    updateDaftarBelanjaPengeluaran();
    alert('Pengeluaran berhasil dicatat secara detail!');
}

function renderPengeluaran() {
    let container = document.getElementById('listPengeluaran');
    let hariIniISO = dapatkanTanggalLokal();

    let pengeluaranTerfilter = pengeluaran.filter(p => {
        if (tglPengeluaranMulai && tglPengeluaranSelesai) {
            return p.tanggalISO >= tglPengeluaranMulai && p.tanggalISO <= tglPengeluaranSelesai;
        }
        return p.tanggalISO === hariIniISO;
    });

    pengeluaranTerfilter.sort((a, b) => b.id.localeCompare(a.id));

    container.innerHTML = pengeluaranTerfilter.length === 0 ? '<p class="text-gray-400 py-2 text-center text-xs">Tidak ada pengeluaran pada periode ini</p>' : '';
    pengeluaranTerfilter.forEach(p => {
        let detailItemsHtml = '';
        if(p.items && p.items.length > 0) {
            detailItemsHtml = `<div class="mt-1 pl-3 border-l-2 border-orange-300 text-[11px] text-gray-500 space-y-0.5">`;
            p.items.forEach(i => {
                let satuanTampil = i.satuan || 'pcs';
                detailItemsHtml += `<div>• ${i.nama} x ${i.qty} ${satuanTampil} @ Rp ${i.harga.toLocaleString('id-ID')} = Rp ${i.subtotal.toLocaleString('id-ID')}</div>`;
            });
            detailItemsHtml += `</div>`;
        }

        container.innerHTML += `
            <div class="py-2 text-gray-700 border-b border-gray-100 flex flex-col">
                <div class="flex justify-between items-start">
                    <span>
                        📌 <span class="font-semibold">${p.nama}</span>
                        <br><small class="text-gray-400">${p.waktu}</small>
                    </span>
                    <span class="font-bold text-red-500">Rp ${p.biaya.toLocaleString('id-ID')}</span>
                </div>
                ${detailItemsHtml}
            </div>
        `;
    });
}

function simpanModalTambahan() {
    let nominal = parseInt(document.getElementById('inputModalTambahan').value) || 0;
    if (nominal <= 0) return alert('Silakan masukkan nominal modal tambahan yang valid!');

    let idNota = 'NOTA-MODAL-' + Date.now();
    let tglLokal = dapatkanTanggalLokal();
    let dataModalSebagaiPemasukan = {
        id: idNota,
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: tglLokal,
        items: [{ id: 999, nama: "TAMBAHAN MODAL CASH", harga: nominal, qty: 1, kategori: "modal" }],
        total: nominal,
        bayar: nominal,
        kembalian: 0,
        metodePembayaran: 'MODAL_MASUK',
        ongkir: 0,
        qtyStyrofoam: 0
    };

    if (db) {
        db.ref('transaksi/' + idNota).set(dataModalSebagaiPemasukan);
    } else {
        riwayatTransaksi.unshift(dataModalSebagaiPemasukan);
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
        hitungOtomatisTerjualTitipan();
        updateLaporan();
    }

    document.getElementById('inputModalTambahan').value = '';
    alert('Tambahan modal berhasil disimpan langsung ke dalam Kas Pemasukan!');
}

function terapkanFilterTanggal() {
    let mulai = document.getElementById('filterTanggalMulai').value;
    let selesai = document.getElementById('filterTanggalSelesai').value;
    if(!mulai || !selesai) return alert('Silakan pilih rentang tanggal mulai dan selesai!');
    tanggalMulaiTerpilih = mulai;
    tanggalSelesaiTerpilih = selesai;
    updateLaporan();
}

function resetFilterTanggal() {
    document.getElementById('filterTanggalMulai').value = '';
    document.getElementById('filterTanggalSelesai').value = '';
    tanggalMulaiTerpilih = null;
    tanggalSelesaiTerpilih = null;
    updateLaporan();
}

function hitungHariUnik(transaksi, pengeluaran) {
    let setHari = new Set();
    transaksi.forEach(n => setHari.add(n.tanggalISO));
    pengeluaran.forEach(p => setHari.add(p.tanggalISO));
    return setHari.size || 1;
}

function terapkanFilterPengeluaran() {
    let mulai = document.getElementById('filterPengeluaranMulai').value;
    let selesai = document.getElementById('filterPengeluaranSelesai').value;
    if(!mulai || !selesai) return alert('Silakan pilih rentang tanggal mulai dan selesai!');
    tglPengeluaranMulai = mulai;
    tglPengeluaranSelesai = selesai;
    renderPengeluaran();
}

function resetFilterPengeluaran() {
    document.getElementById('filterPengeluaranMulai').value = '';
    document.getElementById('filterPengeluaranSelesai').value = '';
    tglPengeluaranMulai = null;
    tglPengeluaranSelesai = null;
    renderPengeluaran();
}

function updateLaporan() {
    let hariIniISO = dapatkanTanggalLokal();

    let transaksiTerfilter = riwayatTransaksi.filter(n => {
        if (tanggalMulaiTerpilih && tanggalSelesaiTerpilih) {
            return n.tanggalISO >= tanggalMulaiTerpilih && n.tanggalISO <= tanggalSelesaiTerpilih;
        }
        return n.tanggalISO === hariIniISO;
    });

    let pengeluaranTerfilter = pengeluaran.filter(p => {
        if (tanggalMulaiTerpilih && tanggalSelesaiTerpilih) {
            return p.tanggalISO >= tanggalMulaiTerpilih && p.tanggalISO <= tanggalSelesaiTerpilih;
        }
        return p.tanggalISO === hariIniISO;
    });

    transaksiTerfilter.sort((a, b) => b.id.localeCompare(a.id));
    pengeluaranTerfilter.sort((a, b) => b.id.localeCompare(a.id));

    let omsetTunai = 0;
    let omsetQris = 0;
    let omsetKonsumsi = 0;
    let omsetModalMasuk = 0;
    let totalHPPProduk = 0;

    transaksiTerfilter.forEach(n => {
        if (n.metodePembayaran === 'QRIS') {
            omsetQris += n.total;
        } else if (n.metodePembayaran === 'KONSUMSI') {
            omsetKonsumsi += n.total;
        } else if (n.metodePembayaran === 'MODAL_MASUK') {
            omsetModalMasuk += n.total;
        } else {
            omsetTunai += n.total;
        }

        if (n.metodePembayaran !== 'MODAL_MASUK' && n.items) {
            n.items.forEach(i => {
                totalHPPProduk += ((i.hargaBeli || 0) * i.qty);
            });
        }
    });

    let omsetBisnisTotal = omsetTunai + omsetQris;

    let jumlahHari = hitungHariUnik(transaksiTerfilter, pengeluaranTerfilter);
    let totalModalPeriode = UANG_MODAL_HARIAN * jumlahHari;
    let totalBeban = pengeluaranTerfilter.reduce((sum, p) => sum + p.biaya, 0);
    
    // Perhitungan Laba Bersih = Omset Bisnis - HPP Produk Terjual - Pengeluaran Operasional (Beban)
    let labaKotor = omsetBisnisTotal - totalHPPProduk;
    let labaRugiBersih = labaKotor - totalBeban;
    let totalUangCashFisik = totalModalPeriode + omsetModalMasuk + omsetTunai - totalBeban;

    document.getElementById('statOmset').innerText = 'Rp ' + omsetBisnisTotal.toLocaleString('id-ID');
    document.getElementById('statOmsetTunai').innerText = 'Rp ' + omsetTunai.toLocaleString('id-ID');
    document.getElementById('statOmsetQris').innerText = 'Rp ' + omsetQris.toLocaleString('id-ID');
    document.getElementById('statOmsetModalMasuk').innerText = 'Rp ' + omsetModalMasuk.toLocaleString('id-ID');
    document.getElementById('statOmsetKonsumsi').innerText = 'Rp ' + omsetKonsumsi.toLocaleString('id-ID');
    document.getElementById('statPengeluaran').innerText = 'Rp ' + totalBeban.toLocaleString('id-ID');
    document.getElementById('statNota').innerText = transaksiTerfilter.length + ' Item';

    document.getElementById('statUangCash').innerText = 'Rp ' + totalUangCashFisik.toLocaleString('id-ID');
    document.getElementById('statModal').innerText = 'Rp ' + totalModalPeriode.toLocaleString('id-ID');
    document.getElementById('statModalTambahan').innerText = 'Rp ' + omsetModalMasuk.toLocaleString('id-ID');
    document.getElementById('statCashMasuk').innerText = 'Rp ' + omsetTunai.toLocaleString('id-ID');
    document.getElementById('statBebanCash').innerText = 'Rp ' + totalBeban.toLocaleString('id-ID');

    const elBox = document.getElementById('boxLabaRugi');
    const elLabel = document.getElementById('labelLabaRugi');
    const elStat = document.getElementById('statLabaRugi');

    if (labaRugiBersih >= 0) {
        elLabel.innerText = "📈 LABA BERSIH PENJUALAN";
        elStat.innerText = 'Rp ' + labaRugiBersih.toLocaleString('id-ID');
        elBox.className = "p-4 rounded-xl shadow border bg-emerald-50 border-emerald-200 text-emerald-700 flex flex-col justify-between";
    } else {
        elLabel.innerText = "📉 RUGI BERSIH";
        elStat.innerText = '- Rp ' + Math.abs(labaRugiBersih).toLocaleString('id-ID');
        elBox.className = "p-4 rounded-xl shadow border bg-red-50 border-red-200 text-red-700 flex flex-col justify-between";
    }

    let containerRekapPengeluaran = document.getElementById('rekapPengeluaranDetail');
    containerRekapPengeluaran.innerHTML = pengeluaranTerfilter.length === 0 ? '<p class="text-gray-400">Tidak ada pengeluaran pada periode ini</p>' : '';
    pengeluaranTerfilter.forEach(p => {
        let detailTabelItems = '';
        if (p.items && p.items.length > 0) {
            detailTabelItems = `
                <div class="mt-2 border-t border-gray-200 pt-2 text-[11px] text-gray-700">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-gray-400 uppercase text-[9px] tracking-wider border-b border-gray-100">
                                <th class="pb-1 font-semibold">Nama Barang</th>
                                <th class="pb-1 text-center font-semibold">Harga</th>
                                <th class="pb-1 text-center font-semibold">Qty</th>
                                <th class="pb-1 text-right font-semibold">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100/50">
            `;
            p.items.forEach(item => {
                let satuanTampil = item.satuan || 'pcs';
                detailTabelItems += `
                    <tr>
                        <td class="py-1 font-medium text-gray-800">${item.nama}</td>
                        <td class="py-1 text-center text-gray-500">Rp ${item.harga.toLocaleString('id-ID')}</td>
                        <td class="py-1 text-center font-bold text-gray-600">${item.qty} ${satuanTampil}</td>
                        <td class="py-1 text-right font-bold text-gray-800">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
            detailTabelItems += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        containerRekapPengeluaran.innerHTML += `
            <div class="p-4 bg-white rounded-xl border border-orange-100 shadow-sm text-xs text-gray-600 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center font-bold text-gray-800 mb-1">
                        <span class="text-sm">🧾 ${p.id}</span>
                        <span class="text-red-600 text-base font-extrabold">Rp ${p.biaya.toLocaleString('id-ID')}</span>
                    </div>
                    <p class="text-gray-400 text-[10px]">🕒 ${p.waktu}</p>
                    ${detailTabelItems}
                </div>
            </div>
        `;
    });

    let containerNota = document.getElementById('riwayatNota');
    containerNota.innerHTML = transaksiTerfilter.length === 0 ? '<p class="text-gray-400">Tidak ada riwayat pada periode ini</p>' : '';
    
    transaksiTerfilter.forEach(n => {
        let badgeColor = 'bg-green-100 text-green-800';
        if (n.metodePembayaran === 'QRIS') badgeColor = 'bg-blue-100 text-blue-800';
        if (n.metodePembayaran === 'KONSUMSI') badgeColor = 'bg-purple-100 text-purple-800';
        if (n.metodePembayaran === 'MODAL_MASUK') badgeColor = 'bg-teal-600 text-white font-black';
        
        let badgeMetode = n.metodePembayaran === 'MODAL_MASUK' ? 'MODAL MASUK' : (n.metodePembayaran || 'TUNAI');

        let detailItemsHtml = `
            <div class="mt-3 border-t border-gray-200 pt-2 text-[11px] text-gray-700">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-gray-400 uppercase text-[9px] tracking-wider border-b border-gray-100">
                            <th class="pb-1 font-semibold">Nama Item</th>
                            <th class="pb-1 text-center font-semibold">Harga</th>
                            <th class="pb-1 text-center font-semibold">Qty</th>
                            <th class="pb-1 text-right font-semibold">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100/50">
        `;

        if (n.items && n.items.length > 0) {
            n.items.forEach(i => {
                let sub = i.harga * i.qty;
                detailItemsHtml += `
                    <tr>
                        <td class="py-1 font-medium text-gray-800">${i.nama}</td>
                        <td class="py-1 text-center text-gray-500">Rp ${i.harga.toLocaleString('id-ID')}</td>
                        <td class="py-1 text-center font-bold text-gray-600">${i.qty}x</td>
                        <td class="py-1 text-right font-bold text-gray-800">Rp ${sub.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
        }

        if (n.qtyStyrofoam > 0) {
            let subtotalBungkus = n.qtyStyrofoam * 1000;
            detailItemsHtml += `
                <tr class="text-gray-500 italic">
                    <td class="py-1">📦 Styrofoam</td>
                    <td class="py-1 text-center">Rp 1.000</td>
                    <td class="py-1 text-center">${n.qtyStyrofoam}x</td>
                    <td class="py-1 text-right">Rp ${subtotalBungkus.toLocaleString('id-ID')}</td>
                </tr>
            `;
        }

        if (n.ongkir > 0) {
            detailItemsHtml += `
                <tr class="text-gray-500 italic">
                    <td class="py-1">🛵 Ongkos Kirim</td>
                    <td class="py-1 text-center">-</td>
                    <td class="py-1 text-center">-</td>
                    <td class="py-1 text-right">Rp ${n.ongkir.toLocaleString('id-ID')}</td>
                </tr>
            `;
        }

        detailItemsHtml += `
                    </tbody>
                </table>
            </div>
        `;

        containerNota.innerHTML += `
            <div class="p-4 bg-white rounded-xl border border-orange-100 shadow-sm text-xs text-gray-600 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center font-bold text-gray-800 mb-1">
                        <span class="text-sm">🧾 ${n.id} <span class="ml-2 px-2 py-0.5 text-[10px] rounded-md ${badgeColor}">${badgeMetode}</span></span>
                        <span class="text-emerald-600 text-base font-extrabold">Rp ${n.total.toLocaleString('id-ID')}</span>
                    </div>
                    <p class="text-gray-400 text-[10px]">📅 ${n.waktu}</p>
                    ${detailItemsHtml}
                </div>
                <div class="flex justify-end mt-3 pt-2 border-t border-gray-100">
                    <button onclick="cetakUlangNota('${n.id}')" class="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition cursor-pointer text-[10px] flex items-center gap-1">
                        🖨️ Cetak Ulang
                    </button>
                </div>
            </div>
        `;
    });

    hitungDanRenderRekapItem(transaksiTerfilter);
    document.getElementById('cariItemRekap').value = ''; 

    let produkCounts = {};
    transaksiTerfilter.forEach(n => {
        if(n.metodePembayaran !== 'MODAL_MASUK') { 
            n.items.forEach(i => { produkCounts[i.nama] = (produkCounts[i.nama] || 0) + i.qty; });
        }
    });
    let urutProduk = Object.keys(produkCounts).map(name => ({ name, qty: produkCounts[name] })).sort((a,b) => b.qty - a.qty).slice(0, 5);

    if (myChart) myChart.destroy();
    const ctx = document.getElementById('chartProdukLaku').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: urutProduk.map(p => p.name),
            datasets: [{
                label: 'Total Terjual',
                data: urutProduk.map(p => p.qty),
                backgroundColor: '#ea580c',
                borderWidth: 0
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

function switchTab(tab) {
    document.getElementById('tab-kasir').classList.add('hidden');
    document.getElementById('tab-master').classList.add('hidden');
    document.getElementById('tab-titipan').classList.add('hidden');
    document.getElementById('tab-pengeluaran').classList.add('hidden');
    document.getElementById('tab-laporan').classList.add('hidden');
    
    document.getElementById('tab-' + tab).classList.remove('hidden');
    if(tab === 'master') renderMasterData();
    if(tab === 'laporan') updateLaporan();
    if(tab === 'titipan') hitungOtomatisTerjualTitipan();
}

filterKategori('topping');
renderPengeluaran();
renderMasterData();
hitungOtomatisTerjualTitipan();