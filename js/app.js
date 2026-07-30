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
let keranjangPengeluaran = []; 
let keranjangPembelian = []; 
let riwayatTransaksi = JSON.parse(localStorage.getItem('aya_transaksi_v3')) || [];
let riwayatPembelian = JSON.parse(localStorage.getItem('aya_pembelian_v3')) || [];
let pengeluaran = JSON.parse(localStorage.getItem('aya_pengeluaran_v3')) || [];
let barangTitipan = JSON.parse(localStorage.getItem('aya_titipan_v3')) || [];
let suppliers = JSON.parse(localStorage.getItem('aya_suppliers_v3')) || [];
let pelanggan = JSON.parse(localStorage.getItem('aya_pelanggan_v3')) || [];
let daftarKomposisi = JSON.parse(localStorage.getItem('aya_komposisi_v3')) || {};

let keranjangBahanBaku = [];
let kategoriAktif = 'semua';
let metodePembayaran = 'TUNAI';
let myChart = null;
let currentGambarBase64 = ''; 

function dapatkanTanggalLokal() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const lokal = new Date(d.getTime() - (offset * 60 * 1000));
    return lokal.toISOString().split('T')[0];
}

window.addEventListener('DOMContentLoaded', () => {
    // Muat data dari Firebase jika tersedia
    if (db) {
        db.ref('menu_tambahan').on('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                databaseMenu = Object.values(data);
            }
            renderMenu();
            renderMasterData();
        });
    }
    
    switchTab('kasir');
    renderPelanggan();
    renderSupplier();
    renderMasterData();
});

/* NAVIGASI TAB UTAMA */
function switchTab(tabName) {
    const listTab = ['kasir', 'transaksi', 'master', 'komposisi', 'titipan', 'pengeluaran', 'laporan'];
    listTab.forEach(tab => {
        const el = document.getElementById('tab-' + tab);
        const btn = document.getElementById('nav-' + tab);
        if (el) {
            if (tab === tabName) {
                el.classList.remove('hidden');
                if (btn) btn.className = "nav-btn w-full text-left px-3 py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-orange-700 transition flex items-center gap-2 cursor-pointer bg-orange-800 shadow";
            } else {
                el.classList.add('hidden');
                if (btn) btn.className = "nav-btn w-full text-left px-3 py-2.5 rounded-lg font-semibold text-xs sm:text-sm hover:bg-orange-700 transition flex items-center gap-2 cursor-pointer";
            }
        }
    });

    if (tabName === 'kasir') {
        renderMenu();
        updateKeranjang();
    } else if (tabName === 'transaksi') {
        renderPembelianRinci();
        renderPenjualanRinci();
    } else if (tabName === 'master') {
        switchSubMaster('barang');
    } else if (tabName === 'komposisi') {
        renderDropdownKomposisi();
        renderTabelDaftarKomposisi();
    } else if (tabName === 'titipan') {
        hitungOtomatisTerjualTitipan();
    } else if (tabName === 'pengeluaran') {
        renderPengeluaran();
    } else if (tabName === 'laporan') {
        updateLaporan();
    }
}

/* KASIR & KATEGORI */
function filterKategori(kategori) {
    kategoriAktif = kategori;
    document.querySelectorAll('.btn-kat').forEach(b => {
        b.className = "px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm rounded-lg transition cursor-pointer whitespace-nowrap btn-kat";
    });
    const selectedBtn = document.getElementById('btn-kat-' + kategori);
    if(selectedBtn) {
        selectedBtn.className = "px-4 py-2 bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-lg shadow transition cursor-pointer whitespace-nowrap btn-kat";
    }
    renderMenu();
}

function cariMenuKasir() {
    renderMenu();
}

function renderMenu() {
    const container = document.getElementById('container-menu');
    if (!container) return;

    const inputCari = document.getElementById('cariMenuKasir');
    const keyword = inputCari ? inputCari.value.toLowerCase().trim() : '';

    let items = (typeof databaseMenu !== 'undefined' && Array.isArray(databaseMenu)) ? databaseMenu : [];

    if (kategoriAktif && kategoriAktif !== 'semua') {
        items = items.filter(m => String(m.kategori).toLowerCase() === String(kategoriAktif).toLowerCase());
    }

    if (keyword) {
        items = items.filter(m => m.nama && m.nama.toLowerCase().includes(keyword));
    }

    if (items.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-gray-400 italic">Menu tidak ditemukan.</div>`;
        return;
    }

    let html = '';
    items.forEach(m => {
        let imgHtml = m.gambar 
            ? `<img src="${m.gambar}" class="w-full h-24 object-cover rounded-md mb-2" alt="${m.nama}">` 
            : `<div class="w-full h-24 bg-orange-100 text-orange-400 rounded-md mb-2 flex items-center justify-center font-bold text-2xl">🍔</div>`;

        html += `
            <div onclick="tambahItem('${m.id}')" class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-400 transition cursor-pointer flex flex-col justify-between">
                <div>
                    ${imgHtml}
                    <h4 class="font-bold text-xs text-gray-800 uppercase line-clamp-1">${m.nama}</h4>
                    <p class="text-[10px] text-gray-400">Stok: ${m.stok || 0}</p>
                </div>
                <div class="mt-2 flex justify-between items-center">
                    <span class="font-black text-xs text-orange-600">Rp ${(m.harga || 0).toLocaleString('id-ID')}</span>
                    <button class="bg-orange-500 text-white w-6 h-6 rounded-full font-bold text-xs hover:bg-orange-600 shadow">+</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

/* KERANJANG KASIR */
function tambahItem(id) {
    let item = databaseMenu.find(m => String(m.id) === String(id));
    if (!item) return;

    let ada = keranjang.find(k => String(k.id) === String(id));
    if (ada) {
        ada.qty += 1;
    } else {
        keranjang.push({
            id: item.id,
            nama: item.nama,
            harga: item.harga,
            hargaBeli: item.hargaBeli || 0,
            qty: 1
        });
    }
    updateKeranjang();
}

function ubahQtyItem(id, delta) {
    let item = keranjang.find(k => String(k.id) === String(id));
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        keranjang = keranjang.filter(k => String(k.id) !== String(id));
    }
    updateKeranjang();
}

function hapusItemKeranjang(id) {
    keranjang = keranjang.filter(k => String(k.id) !== String(id));
    updateKeranjang();
}

function setMetodePembayaran(metode) {
    metodePembayaran = metode;
    const btns = document.querySelectorAll('.btn-metode-bayar');
    btns.forEach(b => {
        if (b.dataset.metode === metode) {
            b.className = "btn-metode-bayar py-2 text-center text-[10px] font-bold rounded-lg bg-orange-600 text-white shadow border border-orange-600 cursor-pointer transition";
        } else {
            b.className = "btn-metode-bayar py-2 text-center text-[10px] font-bold rounded-lg bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer transition";
        }
    });

    const wrapperPilihPelanggan = document.getElementById('wrapperPilihPelanggan');
    if (wrapperPilihPelanggan) {
        if (metode === 'HUTANG') {
            wrapperPilihPelanggan.classList.remove('hidden');
        } else {
            wrapperPilihPelanggan.classList.add('hidden');
        }
    }
}

function updateKeranjang() {
    let container = document.getElementById('tabelKeranjang');
    let textTotal = document.getElementById('textTotal');
    if (!container) return;

    if (keranjang.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4">Belum ada item dipilih</p>`;
        if (textTotal) textTotal.innerText = 'Rp 0';
        hitungKembalian();
        return;
    }

    let html = '';
    let subtotal = 0;

    keranjang.forEach(item => {
        let totalItem = item.harga * item.qty;
        subtotal += totalItem;
        html += `
            <div class="flex justify-between items-center py-2 border-b border-gray-100 text-xs">
                <div class="flex-1">
                    <p class="font-bold text-gray-800 uppercase">${item.nama}</p>
                    <p class="text-[10px] text-gray-500">Rp ${item.harga.toLocaleString('id-ID')} x ${item.qty}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-orange-600">Rp ${totalItem.toLocaleString('id-ID')}</span>
                    <div class="flex items-center gap-1 bg-gray-100 rounded p-0.5">
                        <button onclick="ubahQtyItem('${item.id}', -1)" class="w-5 h-5 bg-white rounded shadow text-xs font-bold hover:bg-orange-100">-</button>
                        <span class="px-1 font-bold text-xs">${item.qty}</span>
                        <button onclick="ubahQtyItem('${item.id}', 1)" class="w-5 h-5 bg-white rounded shadow text-xs font-bold hover:bg-orange-100">+</button>
                    </div>
                    <button onclick="hapusItemKeranjang('${item.id}')" class="text-red-500 font-bold hover:text-red-700 text-xs ml-1">❌</button>
                </div>
            </div>
        `;
    });

    let styrofoam = (parseInt(document.getElementById('inputStyrofoam')?.value) || 0) * 1000;
    let ongkir = parseInt(document.getElementById('inputOngkir')?.value) || 0;
    let grandTotal = subtotal + styrofoam + ongkir;

    container.innerHTML = html;
    if (textTotal) textTotal.innerText = 'Rp ' + grandTotal.toLocaleString('id-ID');
    hitungKembalian();
}

function hitungKembalian() {
    let textTotal = document.getElementById('textTotal')?.innerText.replace(/[^0-9]/g, '') || 0;
    let total = parseInt(textTotal) || 0;
    let bayar = parseInt(document.getElementById('inputBayar')?.value) || 0;
    let kembalian = bayar - total;
    let textKembalian = document.getElementById('textKembalian');

    if (textKembalian) {
        if (kembalian >= 0) {
            textKembalian.className = "text-emerald-600 font-bold";
            textKembalian.innerText = 'Rp ' + kembalian.toLocaleString('id-ID');
        } else {
            textKembalian.className = "text-red-500 font-bold";
            textKembalian.innerText = '- Rp ' + Math.abs(kembalian).toLocaleString('id-ID');
        }
    }
}

function prosesSimpanTransaksi(isCetak = false) {
    if (keranjang.length === 0) return alert('Keranjang belanjaan masih kosong!');

    let styrofoamQty = parseInt(document.getElementById('inputStyrofoam')?.value) || 0;
    let ongkir = parseInt(document.getElementById('inputOngkir')?.value) || 0;
    let totalBelanja = keranjang.reduce((sum, i) => sum + (i.harga * i.qty), 0) + (styrofoamQty * 1000) + ongkir;

    let pelangganId = '';
    let pelangganNama = '';
    let pelangganKontak = '';

    if (metodePembayaran === 'HUTANG') {
        let selectP = document.getElementById('selectPelangganKasir');
        pelangganId = selectP?.value;
        if (!pelangganId) return alert('Silakan pilih Pelanggan Kasbon terlebih dahulu!');
        let pObj = pelanggan.find(p => String(p.id) === String(pelangganId));
        if (pObj) {
            pelangganNama = pObj.nama;
            pelangganKontak = pObj.kontak;
        }
    }

    let idNota = 'NOTA-' + Date.now();
    let tglLokal = dapatkanTanggalLokal();

    let dataTransaksi = {
        id: idNota,
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: tglLokal,
        items: [...keranjang],
        styrofoamQty: styrofoamQty,
        ongkir: ongkir,
        total: totalBelanja,
        metodePembayaran: metodePembayaran,
        pelangganId: pelangganId,
        pelangganNama: pelangganNama,
        pelangganKontak: pelangganKontak,
        sudahDibayar: (metodePembayaran === 'HUTANG') ? 0 : totalBelanja
    };

    keranjang.forEach(itemBeli => {
        let mItem = databaseMenu.find(m => String(m.id) === String(itemBeli.id));
        if (mItem && typeof mItem.stok !== 'undefined') {
            mItem.stok = Math.max(0, (mItem.stok || 0) - itemBeli.qty);
            if (db) db.ref('menu_tambahan/' + mItem.id).set(mItem);
        }
    });

    if (db) {
        db.ref('transaksi/' + idNota).set(dataTransaksi);
    } else {
        riwayatTransaksi.unshift(dataTransaksi);
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
    }

    if (isCetak) {
        cetakStrukThermal(dataTransaksi);
    }

    keranjang = [];
    if(document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = '';
    if(document.getElementById('inputOngkir')) document.getElementById('inputOngkir').value = '';
    if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
    updateKeranjang();
    alert('Transaksi berhasil disimpan!');
}

function tombolSimpanSaja() {
    prosesSimpanTransaksi(false);
}

function cetakNota() {
    prosesSimpanTransaksi(true);
}

function cetakUlangNota(id) {
    let t = riwayatTransaksi.find(x => x.id === id);
    if (t) cetakStrukThermal(t);
}

function cetakStrukThermal(transaksi) {
    let areaNota = document.getElementById('areaNota');
    if (!areaNota) {
        areaNota = document.createElement('div');
        areaNota.id = 'areaNota';
        document.body.appendChild(areaNota);
    }

    let itemsHtml = (transaksi.items || []).map(i => `
        <div class="nota-item-row">
            <div><strong>${i.nama}</strong></div>
            <div class="nota-item-detail">
                <span>${i.qty} x ${i.harga.toLocaleString('id-ID')}</span>
                <span>Rp ${(i.qty * i.harga).toLocaleString('id-ID')}</span>
            </div>
        </div>
    `).join('');

    areaNota.innerHTML = `
        <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">
            AYA GROUP KASIR<br>
            --------------------------------
        </div>
        <div style="font-size: 11px; margin-bottom: 5px;">
            ID: ${transaksi.id}<br>
            Tgl: ${transaksi.waktu}<br>
            Metode: ${transaksi.metodePembayaran}
            ${transaksi.pelangganNama ? '<br>Pelanggan: ' + transaksi.pelangganNama : ''}
        </div>
        --------------------------------
        ${itemsHtml}
        --------------------------------
        ${transaksi.styrofoamQty ? `<div class="nota-item-detail"><span>Styrofoam (${transaksi.styrofoamQty})</span><span>Rp ${(transaksi.styrofoamQty * 1000).toLocaleString('id-ID')}</span></div>` : ''}
        ${transaksi.ongkir ? `<div class="nota-item-detail"><span>Ongkir</span><span>Rp ${transaksi.ongkir.toLocaleString('id-ID')}</span></div>` : ''}
        <div class="nota-item-detail" style="font-weight: bold; font-size: 12px; margin-top: 5px;">
            <span>TOTAL</span>
            <span>Rp ${transaksi.total.toLocaleString('id-ID')}</span>
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 10px;">
            Terima Kasih atas Kunjungan Anda!
        </div>
    `;

    window.print();
}

/* SUB MASTER DATA NAVIGASI */
function switchSubMaster(sub) {
    const listSub = ['barang', 'supplier', 'pelanggan', 'hutang'];
    listSub.forEach(s => {
        const el = document.getElementById('submaster-' + s);
        const btn = document.getElementById('btn-submaster-' + s);
        if(el) {
            if(s === sub) {
                el.classList.remove('hidden');
                if(btn) btn.className = "px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-lg shadow cursor-pointer transition";
            } else {
                el.classList.add('hidden');
                if(btn) btn.className = "px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-200 cursor-pointer transition";
            }
        }
    });

    if (sub === 'barang') renderMasterData();
    else if (sub === 'supplier') renderSupplier();
    else if (sub === 'pelanggan') renderPelanggan();
    else if (sub === 'hutang') renderHutangPelanggan();
}

/* FITUR KOMPOSISI BAHAN & PERHITUNGAN HPP */
function renderDropdownKomposisi() {
    let select = document.getElementById('komposisiSelectMenu');
    if (!select) return;
    let html = '<option value="">-- Pilih Barang dari Master --</option>';
    databaseMenu.forEach(m => {
        html += `<option value="${m.id}">${m.nama} (Harga Jual: Rp ${(m.harga || 0).toLocaleString('id-ID')})</option>`;
    });
    select.innerHTML = html;
}

function muatKomposisiMenu() {
    let select = document.getElementById('komposisiSelectMenu');
    if (!select) return;

    let menuId = select.value;
    if (!menuId) {
        keranjangBahanBaku = [];
        updateTabelDetailKomposisi();
        return;
    }

    let itemMenu = databaseMenu.find(m => String(m.id) === String(menuId));
    if (daftarKomposisi[menuId]) {
        keranjangBahanBaku = [...daftarKomposisi[menuId]];
    } else {
        keranjangBahanBaku = [];
    }

    if (itemMenu) {
        if(document.getElementById('labelMenuKomposisi')) document.getElementById('labelMenuKomposisi').innerText = itemMenu.nama;
        if(document.getElementById('labelHargaJualKomposisi')) document.getElementById('labelHargaJualKomposisi').innerText = 'Rp ' + (itemMenu.harga || 0).toLocaleString('id-ID');
    }

    updateTabelDetailKomposisi();
}

function tambahBahanBaku() {
    let menuId = document.getElementById('komposisiSelectMenu')?.value;
    if (!menuId) return alert('Silakan pilih Produk / Menu terlebih dahulu!');

    let nama = document.getElementById('inputBahanNama')?.value.trim();
    let qty = parseFloat(document.getElementById('inputBahanQty')?.value) || 0;
    let satuan = document.getElementById('inputBahanSatuan')?.value.trim() || 'pcs';
    let harga = parseInt(document.getElementById('inputBahanHarga')?.value) || 0;

    if (!nama || qty <= 0 || harga <= 0) {
        return alert('Mohon isi nama bahan, kuantitas/qty, dan harga beli dengan benar!');
    }

    keranjangBahanBaku.push({
        nama: nama,
        qty: qty,
        satuan: satuan,
        harga: harga,
        subtotal: qty * harga
    });

    document.getElementById('inputBahanNama').value = '';
    document.getElementById('inputBahanQty').value = '';
    document.getElementById('inputBahanSatuan').value = '';
    document.getElementById('inputBahanHarga').value = '';

    updateTabelDetailKomposisi();
}

function hapusBahanBaku(index) {
    keranjangBahanBaku.splice(index, 1);
    updateTabelDetailKomposisi();
}

function updateTabelDetailKomposisi() {
    let tbody = document.getElementById('tabelDetailKomposisi');
    if (!tbody) return;

    if (keranjangBahanBaku.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">Belum ada bahan baku ditambahkan.</td></tr>`;
        hitungTotalHppKomposisi(0);
        return;
    }

    let html = '';
    let totalHpp = 0;
    keranjangBahanBaku.forEach((b, idx) => {
        let subtotal = b.qty * b.harga;
        totalHpp += subtotal;
        html += `
            <tr class="hover:bg-orange-50/40 border-b border-gray-100">
                <td class="p-2.5 font-bold text-gray-800 uppercase">${b.nama}</td>
                <td class="p-2.5 text-center font-semibold text-gray-700">${b.qty} ${b.satuan}</td>
                <td class="p-2.5 text-right text-gray-600">Rp ${b.harga.toLocaleString('id-ID')}</td>
                <td class="p-2.5 text-right font-bold text-red-600">Rp ${subtotal.toLocaleString('id-ID')}</td>
                <td class="p-2.5 text-center">
                    <button onclick="hapusBahanBaku(${idx})" class="text-red-500 font-bold hover:text-red-700 cursor-pointer text-xs">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    hitungTotalHppKomposisi(totalHpp);
}

function hitungTotalHppKomposisi(totalHpp) {
    let menuId = document.getElementById('komposisiSelectMenu')?.value;
    let itemMenu = databaseMenu.find(m => String(m.id) === String(menuId));
    let hargaJual = itemMenu ? itemMenu.harga || 0 : 0;
    let profit = hargaJual - totalHpp;

    if (document.getElementById('labelTotalHppKomposisi')) document.getElementById('labelTotalHppKomposisi').innerText = 'Rp ' + Math.round(totalHpp).toLocaleString('id-ID');
    if (document.getElementById('labelProfitKomposisi')) {
        let el = document.getElementById('labelProfitKomposisi');
        el.innerText = 'Rp ' + Math.round(profit).toLocaleString('id-ID');
        el.className = profit >= 0 ? "text-emerald-600 text-base font-black" : "text-red-600 text-base font-black";
    }
}

function simpanKomposisi() {
    let menuId = document.getElementById('komposisiSelectMenu')?.value;
    if (!menuId) return alert('Silakan pilih produk yang akan disimpan komposisinya!');
    if (keranjangBahanBaku.length === 0) return alert('Komposisi bahan baku masih kosong!');

    daftarKomposisi[menuId] = [...keranjangBahanBaku];

    if (db) {
        db.ref('komposisi_bahan/' + menuId).set(keranjangBahanBaku);
    } else {
        localStorage.setItem('aya_komposisi_v3', JSON.stringify(daftarKomposisi));
    }

    renderTabelDaftarKomposisi();
    alert('Komposisi resep berhasil disimpan!');
}

function updateHppKeMaster() {
    let menuId = document.getElementById('komposisiSelectMenu')?.value;
    if (!menuId) return alert('Pilih produk terlebih dahulu!');

    let itemMenu = databaseMenu.find(m => String(m.id) === String(menuId));
    if (!itemMenu) return;

    let totalHpp = keranjangBahanBaku.reduce((sum, b) => sum + (b.qty * b.harga), 0);
    if (totalHpp <= 0) return alert('Total HPP masih Rp 0! Tambahkan bahan terlebih dahulu.');

    itemMenu.hargaBeli = Math.round(totalHpp);
    itemMenu.hargaBeliTotal = Math.round(totalHpp);

    if (db) {
        db.ref('menu_tambahan/' + itemMenu.id).set(itemMenu);
    } else {
        let idx = databaseMenu.findIndex(m => String(m.id) === String(itemMenu.id));
        if (idx !== -1) databaseMenu[idx] = itemMenu;
    }

    renderMasterData();
    renderMenu();
    alert(`HPP / Modal awal barang [ ${itemMenu.nama} ] berhasil di-update menjadi Rp ${Math.round(totalHpp).toLocaleString('id-ID')}!`);
}

function renderTabelDaftarKomposisi() {
    let tbody = document.getElementById('tabelDaftarKomposisi');
    if (!tbody) return;

    let keys = Object.keys(daftarKomposisi);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400 italic">Belum ada komposisi bahan tersimpan.</td></tr>`;
        return;
    }

    let html = '';
    keys.forEach(menuId => {
        let m = databaseMenu.find(x => String(x.id) === String(menuId));
        let namaMenu = m ? m.nama : ('ID: ' + menuId);
        let hargaJual = m ? m.harga || 0 : 0;

        let itemsBahan = daftarKomposisi[menuId] || [];
        let totalHpp = itemsBahan.reduce((sum, b) => sum + (b.qty * b.harga), 0);
        let profit = hargaJual - totalHpp;

        let detailBahanText = itemsBahan.map(b => `• ${b.nama} (${b.qty} ${b.satuan} @ Rp ${b.harga.toLocaleString('id-ID')})`).join('<br>');

        html += `
            <tr class="hover:bg-orange-50/40 border-b border-gray-100">
                <td class="p-3 font-bold text-gray-800 uppercase">${namaMenu}</td>
                <td class="p-3 text-[11px] text-gray-600">${detailBahanText}</td>
                <td class="p-3 text-right font-bold text-gray-800">Rp ${hargaJual.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-bold text-red-600">Rp ${Math.round(totalHpp).toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-extrabold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}">Rp ${Math.round(profit).toLocaleString('id-ID')}</td>
                <td class="p-3 text-center">
                    <button onclick="hapusResepKomposisi('${menuId}')" class="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold hover:bg-red-600 cursor-pointer">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function hapusResepKomposisi(menuId) {
    if (!confirm('Apakah Anda yakin ingin menghapus resep komposisi ini?')) return;
    delete daftarKomposisi[menuId];
    if (db) {
        db.ref('komposisi_bahan/' + menuId).remove();
    } else {
        localStorage.setItem('aya_komposisi_v3', JSON.stringify(daftarKomposisi));
    }
    renderTabelDaftarKomposisi();
}

/* LAPORAN & GRAFIK */
function updateLaporan() {
    let totalOmset = 0;
    let totalPengeluaran = 0;
    let mapPenjualanHarian = {};

    let tMulai = document.getElementById('filterTanggalMulai')?.value;
    let tSelesai = document.getElementById('filterTanggalSelesai')?.value;

    riwayatTransaksi.forEach(t => {
        let tgl = t.tanggalISO || (t.waktu ? t.waktu.split(',')[0] : 'Lainnya');
        if ((!tMulai || tgl >= tMulai) && (!tSelesai || tgl <= tSelesai)) {
            totalOmset += (t.total || 0);
            mapPenjualanHarian[tgl] = (mapPenjualanHarian[tgl] || 0) + (t.total || 0);
        }
    });

    pengeluaran.forEach(p => {
        let tgl = p.tanggalISO || (p.waktu ? p.waktu.split(',')[0] : 'Lainnya');
        if ((!tMulai || tgl >= tMulai) && (!tSelesai || tgl <= tSelesai)) {
            totalPengeluaran += (p.nominal || 0);
        }
    });

    let profitLimpah = totalOmset - totalPengeluaran;

    if (document.getElementById('laporanOmset')) document.getElementById('laporanOmset').innerText = 'Rp ' + totalOmset.toLocaleString('id-ID');
    if (document.getElementById('laporanPengeluaran')) document.getElementById('laporanPengeluaran').innerText = 'Rp ' + totalPengeluaran.toLocaleString('id-ID');
    if (document.getElementById('laporanProfit')) document.getElementById('laporanProfit').innerText = 'Rp ' + profitLimpah.toLocaleString('id-ID');

    renderGrafikLaporan(mapPenjualanHarian);
}

function terapkanFilterTanggal() {
    updateLaporan();
}

function resetFilterTanggal() {
    if (document.getElementById('filterTanggalMulai')) document.getElementById('filterTanggalMulai').value = '';
    if (document.getElementById('filterTanggalSelesai')) document.getElementById('filterTanggalSelesai').value = '';
    updateLaporan();
}

function renderGrafikLaporan(mapData) {
    const canvas = document.getElementById('chartPenjualan');
    if (!canvas) return;

    const labels = Object.keys(mapData).sort();
    const dataValues = labels.map(lbl => mapData[lbl]);

    if (myChart) {
        myChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['Belum Ada Data'],
            datasets: [{
                label: 'Omset Penjualan (Rp)',
                data: dataValues.length ? dataValues : [0],
                backgroundColor: 'rgba(234, 88, 12, 0.6)',
                borderColor: 'rgba(234, 88, 12, 1)',
                borderWidth: 2,
                borderRadius: 6
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

/* SUB TAB TRANSAKSI */
function switchSubTabTransaksi(sub) {
    const btnPem = document.getElementById('btn-subtab-pembelian');
    const btnPen = document.getElementById('btn-subtab-penjualan');
    const subPem = document.getElementById('subtab-pembelian');
    const subPen = document.getElementById('subtab-penjualan');

    if (sub === 'pembelian') {
        if(subPem) subPem.classList.remove('hidden');
        if(subPen) subPen.classList.add('hidden');
        if(btnPem) btnPem.className = "px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer";
        if(btnPen) btnPen.className = "px-4 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-300 transition cursor-pointer";
        renderPembelianRinci();
    } else {
        if(subPem) subPem.classList.add('hidden');
        if(subPen) subPen.classList.remove('hidden');
        if(btnPem) btnPem.className = "px-4 py-2 bg-gray-200 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-300 transition cursor-pointer";
        if(btnPen) btnPen.className = "px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer";
        renderPenjualanRinci();
    }
}

function isiOtomatisItemPembelian() {
    let select = document.getElementById('pembelianSelectBarang');
    let hargaInput = document.getElementById('pembelianHargaItem');
    if (!select || !hargaInput) return;

    let idSelected = select.value;
    let item = databaseMenu.find(m => String(m.id) === String(idSelected));
    if (item) {
        hargaInput.value = item.hargaBeliTotal || item.hargaBeli || 0;
    } else {
        hargaInput.value = '';
    }
}

function tambahItemPembelian() {
    let select = document.getElementById('pembelianSelectBarang');
    let hargaInput = document.getElementById('pembelianHargaItem');
    let qtyInput = document.getElementById('pembelianQtyItem');

    let idBarang = select.value;
    let harga = parseInt(hargaInput.value) || 0;
    let qty = parseInt(qtyInput.value) || 1;

    if (!idBarang || harga <= 0 || qty <= 0) {
        return alert('Silakan pilih barang, masukkan harga beli, dan kuantitas dengan benar!');
    }

    let itemMenu = databaseMenu.find(m => String(m.id) === String(idBarang));
    if (!itemMenu) return;

    let ada = keranjangPembelian.find(k => String(k.idBarang) === String(idBarang));
    if (ada) {
        ada.qty += qty;
        ada.harga = harga;
        ada.subtotal = ada.harga * ada.qty;
    } else {
        keranjangPembelian.push({
            idBarang: itemMenu.id,
            nama: itemMenu.nama,
            harga: harga,
            qty: qty,
            satuan: itemMenu.satuan || 'pcs',
            subtotal: harga * qty
        });
    }

    select.value = '';
    hargaInput.value = '';
    qtyInput.value = '1';
    updateKeranjangPembelian();
}

function hapusItemPembelian(idBarang) {
    keranjangPembelian = keranjangPembelian.filter(k => String(k.idBarang) !== String(idBarang));
    updateKeranjangPembelian();
}

function updateKeranjangPembelian() {
    let tbody = document.getElementById('tabelKeranjangPembelian');
    let totalEl = document.getElementById('textTotalPembelian');
    if (!tbody) return;

    if (keranjangPembelian.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">Belum ada item ditambahkan ke nota pembelian.</td></tr>`;
        if (totalEl) totalEl.innerText = 'Rp 0';
        return;
    }

    let html = '';
    let total = 0;
    keranjangPembelian.forEach(item => {
        total += item.subtotal;
        html += `
            <tr class="hover:bg-orange-50/40 border-b border-gray-100">
                <td class="p-2 font-bold text-gray-800 uppercase">${item.nama}</td>
                <td class="p-2 text-right text-gray-600">Rp ${item.harga.toLocaleString('id-ID')}</td>
                <td class="p-2 text-center font-bold text-gray-700">${item.qty} ${item.satuan}</td>
                <td class="p-2 text-right font-bold text-orange-600">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                <td class="p-2 text-center">
                    <button onclick="hapusItemPembelian('${item.idBarang}')" class="text-red-500 font-bold hover:text-red-700 cursor-pointer text-xs">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    if (totalEl) totalEl.innerText = 'Rp ' + total.toLocaleString('id-ID');
}

function resetFormPembelian() {
    keranjangPembelian = [];
    if(document.getElementById('pembelianId')) document.getElementById('pembelianId').value = '';
    if(document.getElementById('pembelianSupplier')) document.getElementById('pembelianSupplier').value = '';
    if(document.getElementById('pembelianNoFaktur')) document.getElementById('pembelianNoFaktur').value = '';
    if(document.getElementById('pembelianStatus')) document.getElementById('pembelianStatus').value = 'LUNAS';
    if(document.getElementById('pembelianSelectBarang')) document.getElementById('pembelianSelectBarang').value = '';
    if(document.getElementById('pembelianHargaItem')) document.getElementById('pembelianHargaItem').value = '';
    if(document.getElementById('pembelianQtyItem')) document.getElementById('pembelianQtyItem').value = '1';
    if(document.getElementById('titleFormPembelian')) document.getElementById('titleFormPembelian').innerText = '➕ Input Transaksi Pembelian Baru';
    updateKeranjangPembelian();
}

function simpanPembelianRinci() {
    if (keranjangPembelian.length === 0) return alert('Daftar barang pembelian masih kosong!');

    let supplierId = document.getElementById('pembelianSupplier').value;
    let noFaktur = document.getElementById('pembelianNoFaktur').value.trim();
    let status = document.getElementById('pembelianStatus').value;
    let supObj = suppliers.find(s => String(s.id) === String(supplierId));

    let totalBiaya = keranjangPembelian.reduce((sum, item) => sum + item.subtotal, 0);
    let idPembelian = document.getElementById('pembelianId').value || ('PEMBELIAN-' + Date.now());
    let tglLokal = dapatkanTanggalLokal();

    let dataPembelian = {
        id: idPembelian,
        noFaktur: noFaktur || 'FAKTUR-' + Date.now().toString().slice(-6),
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: tglLokal,
        supplierId: supplierId,
        supplierNama: supObj ? supObj.nama : 'Tanpa Supplier',
        status: status,
        total: totalBiaya,
        items: [...keranjangPembelian]
    };

    keranjangPembelian.forEach(itemBeli => {
        let mItem = databaseMenu.find(m => String(m.id) === String(itemBeli.idBarang));
        if (mItem) {
            mItem.stok = (mItem.stok || 0) + itemBeli.qty;
            if (db) db.ref('menu_tambahan/' + mItem.id).set(mItem);
        }
    });

    if (db) {
        db.ref('pembelian/' + idPembelian).set(dataPembelian);
    } else {
        let idx = riwayatPembelian.findIndex(p => p.id === idPembelian);
        if (idx !== -1) riwayatPembelian[idx] = dataPembelian;
        else riwayatPembelian.unshift(dataPembelian);
        localStorage.setItem('aya_pembelian_v3', JSON.stringify(riwayatPembelian));
        renderPembelianRinci();
    }

    resetFormPembelian();
    alert('Transaksi Pembelian berhasil disimpan!');
}

function renderPembelianRinci() {
    let selectBarang = document.getElementById('pembelianSelectBarang');
    let selectSupplier = document.getElementById('pembelianSupplier');

    if (selectSupplier) {
        let opts = '<option value="">-- Pilih Supplier --</option>';
        suppliers.forEach(s => { opts += `<option value="${s.id}">${s.nama}</option>`; });
        selectSupplier.innerHTML = opts;
    }

    if (selectBarang) {
        let opts = '<option value="">-- Pilih Barang --</option>';
        databaseMenu.forEach(m => { opts += `<option value="${m.id}">${m.nama} (${m.satuan || 'pcs'})</option>`; });
        selectBarang.innerHTML = opts;
    }

    let tbody = document.getElementById('tabelRiwayatPembelian');
    if (!tbody) return;

    if (riwayatPembelian.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400 italic">Belum ada data transaksi pembelian.</td></tr>`;
        return;
    }

    let html = '';
    riwayatPembelian.forEach(p => {
        let detailItems = p.items ? p.items.map(i => `• ${i.nama} (${i.qty} ${i.satuan} @ Rp ${i.harga.toLocaleString('id-ID')})`).join('<br>') : '';
        let badgeStatus = p.status === 'LUNAS' 
            ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">LUNAS</span>`
            : `<span class="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">HUTANG</span>`;

        html += `
            <tr class="hover:bg-orange-50/40 border-b border-gray-100">
                <td class="p-3 font-bold text-gray-800">${p.id}<br><span class="text-[10px] text-gray-400 font-normal">Faktur: ${p.noFaktur}</span></td>
                <td class="p-3 text-gray-500">${p.waktu}</td>
                <td class="p-3 font-semibold text-gray-700 uppercase">${p.supplierNama || '-'}</td>
                <td class="p-3 text-[11px] text-gray-600">${detailItems}</td>
                <td class="p-3 text-right font-extrabold text-orange-600">Rp ${p.total.toLocaleString('id-ID')}</td>
                <td class="p-3 text-center">${badgeStatus}</td>
                <td class="p-3 text-center">
                    <button onclick="hapusPembelian('${p.id}')" class="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold hover:bg-red-600 cursor-pointer">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function hapusPembelian(id) {
    if(!confirm('Apakah Anda yakin ingin menghapus riwayat pembelian ini?')) return;
    if (db) {
        db.ref('pembelian/' + id).remove();
    } else {
        riwayatPembelian = riwayatPembelian.filter(p => p.id !== id);
        localStorage.setItem('aya_pembelian_v3', JSON.stringify(riwayatPembelian));
        renderPembelianRinci();
    }
}

function renderPenjualanRinci() {
    let container = document.getElementById('riwayatPenjualanRinci');
    if (!container) return;

    let keyword = (document.getElementById('cariPenjualan')?.value || '').toLowerCase().trim();
    let list = riwayatTransaksi.filter(t => t.metodePembayaran !== 'MODAL_MASUK');

    if (keyword) {
        list = list.filter(t => t.id.toLowerCase().includes(keyword) || (t.pelangganNama && t.pelangganNama.toLowerCase().includes(keyword)));
    }

    if (list.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-xs italic col-span-full text-center py-4">Data penjualan tidak ditemukan.</p>';
        return;
    }

    let html = '';
    list.forEach(t => {
        let itemsText = t.items ? t.items.map(i => `<div>• ${i.nama} x${i.qty} = Rp ${(i.harga * i.qty).toLocaleString('id-ID')}</div>`).join('') : '';
        html += `
            <div class="p-4 bg-white rounded-xl border border-orange-100 shadow-sm text-xs text-gray-600 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center font-bold text-gray-800 mb-1">
                        <span>🧾 ${t.id}</span>
                        <span class="text-emerald-600 text-base font-extrabold">Rp ${t.total.toLocaleString('id-ID')}</span>
                    </div>
                    <p class="text-gray-400 text-[10px] mb-2">📅 ${t.waktu} | Metode: <strong class="text-gray-700">${t.metodePembayaran}</strong></p>
                    <div class="bg-gray-50 p-2 rounded border border-gray-100 space-y-0.5 text-[11px] text-gray-700 mb-2">
                        ${itemsText}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button onclick="cetakUlangNota('${t.id}')" class="px-3 py-1 bg-blue-600 text-white font-bold rounded text-[10px] hover:bg-blue-700 cursor-pointer">🖨️ Cetak Nota</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

/* MASTER DATA BARANG */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentGambarBase64 = e.target.result;
            showImagePreview(currentGambarBase64);
            const inputUrl = document.getElementById('masterGambarUrl');
            if (inputUrl) inputUrl.value = '';
        };
        reader.readAsDataURL(file);
    }
}

function handleUrlImage(val) {
    currentGambarBase64 = val.trim();
    showImagePreview(currentGambarBase64);
}

function showImagePreview(src) {
    const imgEl = document.getElementById('masterGambarPreview');
    const emptyEl = document.getElementById('masterGambarEmpty');
    const btnHapus = document.getElementById('btnHapusGambar');

    if (src) {
        if (imgEl) {
            imgEl.src = src;
            imgEl.classList.remove('hidden');
        }
        if (emptyEl) emptyEl.classList.add('hidden');
        if (btnHapus) btnHapus.classList.remove('hidden');
    } else {
        if (imgEl) {
            imgEl.src = '';
            imgEl.classList.add('hidden');
        }
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (btnHapus) btnHapus.classList.add('hidden');
    }
}

function hapusGambarPreview() {
    currentGambarBase64 = '';
    const fileInput = document.getElementById('masterFileInput');
    if (fileInput) fileInput.value = '';
    const inputUrl = document.getElementById('masterGambarUrl');
    if (inputUrl) inputUrl.value = '';
    showImagePreview('');
}

function hitungEstimasiProfitMaster() {
    let isi = parseInt(document.getElementById('masterIsi')?.value) || 1;
    let hargaBeliTotal = parseInt(document.getElementById('masterHargaBeli')?.value) || 0;
    let hargaJual = parseInt(document.getElementById('masterHargaJual')?.value) || 0;

    let hppSatuan = Math.round(hargaBeliTotal / (isi > 0 ? isi : 1));
    let profitSatuan = hargaJual - hppSatuan;

    let elProfit = document.getElementById('masterEstimasiProfit');
    if (!elProfit) return;

    let satuanVal = document.getElementById('masterSatuan')?.value || 'pcs';

    if (profitSatuan >= 0) {
        elProfit.className = "p-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded border border-emerald-300";
        elProfit.innerText = `Rp ${profitSatuan.toLocaleString('id-ID')} / ${satuanVal} (HPP: Rp ${hppSatuan.toLocaleString('id-ID')})`;
    } else {
        elProfit.className = "p-2 bg-red-100 text-red-800 text-xs font-bold rounded border border-red-300";
        elProfit.innerText = `Rugi: Rp ${profitSatuan.toLocaleString('id-ID')} / ${satuanVal} (HPP: Rp ${hppSatuan.toLocaleString('id-ID')})`;
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
    let stok = parseInt(document.getElementById('masterStok').value) || 0;
    let supplierId = document.getElementById('masterSupplier').value || '';

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
        hargaBeli: hppSatuan,
        harga: hargaJual,
        stok: stok,
        supplierId: supplierId,
        gambar: currentGambarBase64 || ''
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
        cariMasterData();
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
    if(document.getElementById('masterStok')) document.getElementById('masterStok').value = item.stok || 0;
    if(document.getElementById('masterSupplier')) document.getElementById('masterSupplier').value = item.supplierId || '';

    currentGambarBase64 = item.gambar || '';
    const inputUrl = document.getElementById('masterGambarUrl');
    if (inputUrl) {
        if (item.gambar && item.gambar.startsWith('http')) {
            inputUrl.value = item.gambar;
        } else {
            inputUrl.value = '';
        }
    }
    showImagePreview(currentGambarBase64);

    if(document.getElementById('masterFormTitle')) {
        document.getElementById('masterFormTitle').innerText = '✏️ Edit Master Barang: ' + item.nama;
    }
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

    cariMasterData();
    renderMenu();
    alert("Data berhasil dihapus!");
}

function resetFormMaster() {
    if(document.getElementById('masterId')) document.getElementById('masterId').value = '';
    if(document.getElementById('masterNama')) document.getElementById('masterNama').value = '';
    if(document.getElementById('masterIsi')) document.getElementById('masterIsi').value = '1';
    if(document.getElementById('masterHargaBeli')) document.getElementById('masterHargaBeli').value = '';
    if(document.getElementById('masterHargaJual')) document.getElementById('masterHargaJual').value = '';
    if(document.getElementById('masterStok')) document.getElementById('masterStok').value = '0';
    if(document.getElementById('masterSupplier')) document.getElementById('masterSupplier').value = '';
    
    currentGambarBase64 = '';
    showImagePreview('');
    if(document.getElementById('masterFormTitle')) document.getElementById('masterFormTitle').innerText = '➕ Input Master Barang Baru';
    hitungEstimasiProfitMaster();
}

function renderMasterData(dataToRender = null) {
    let tbody = document.getElementById('tabelMasterData');
    if (!tbody) return;

    let list = dataToRender;
    if (!list) {
        const inputCari = document.getElementById('cariMasterData');
        const keyword = inputCari ? inputCari.value.toLowerCase().trim() : '';
        if (keyword) {
            list = databaseMenu.filter(item => 
                (item.nama && item.nama.toLowerCase().includes(keyword)) || 
                (item.kategori && item.kategori.toLowerCase().includes(keyword))
            );
        } else {
            list = databaseMenu;
        }
    }

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-gray-400 italic">Data barang tidak ditemukan.</td></tr>`;
        return;
    }

    let html = '';
    list.forEach(item => {
        let isi = item.isi || 1;
        let hBeliSatuan = item.hargaBeli || 0;
        let profit = (item.harga || 0) - hBeliSatuan;
        let imgHtml = item.gambar 
            ? `<div class="w-10 h-10 bg-gray-50 rounded border overflow-hidden mx-auto flex items-center justify-center p-0.5"><img src="${item.gambar}" class="w-full h-full object-contain" alt="${item.nama}"></div>` 
            : `<div class="w-10 h-10 bg-gray-100 rounded mx-auto flex items-center justify-center text-[10px] text-gray-400">No Img</div>`;

        html += `
            <tr class="hover:bg-orange-50/40 transition border-b border-gray-100">
                <td class="p-2 text-center">${imgHtml}</td>
                <td class="p-3 font-bold text-gray-800 uppercase">${item.nama}</td>
                <td class="p-3 text-center">
                    <span class="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase">${item.kategori || 'umum'}</span>
                </td>
                <td class="p-3 text-center font-bold text-gray-600">${item.stok || 0}</td>
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

function cariMasterData() {
    renderMasterData();
}

/* SUPPLIER & PELANGGAN */
function simpanSupplier() {
    let id = document.getElementById('supplierId').value;
    let nama = document.getElementById('supplierNama').value.trim();
    let kontak = document.getElementById('supplierKontak').value.trim();
    let alamat = document.getElementById('supplierAlamat').value.trim();
    let ket = document.getElementById('supplierKeterangan').value.trim();

    if (!nama || !kontak) return alert('Nama dan Kontak Supplier wajib diisi!');

    let idSup = id ? id : 'SUP-' + Date.now();
    let data = { id: idSup, nama: nama, kontak: kontak, alamat: alamat, keterangan: ket };

    if (db) {
        db.ref('suppliers/' + idSup).set(data);
    } else {
        let idx = suppliers.findIndex(s => s.id === idSup);
        if (idx !== -1) suppliers[idx] = data;
        else suppliers.push(data);
        localStorage.setItem('aya_suppliers_v3', JSON.stringify(suppliers));
        renderSupplier();
    }
    resetFormSupplier();
    alert('Data Supplier berhasil disimpan!');
}

function resetFormSupplier() {
    if(document.getElementById('supplierId')) document.getElementById('supplierId').value = '';
    if(document.getElementById('supplierNama')) document.getElementById('supplierNama').value = '';
    if(document.getElementById('supplierKontak')) document.getElementById('supplierKontak').value = '';
    if(document.getElementById('supplierAlamat')) document.getElementById('supplierAlamat').value = '';
    if(document.getElementById('supplierKeterangan')) document.getElementById('supplierKeterangan').value = '';
    if(document.getElementById('titleFormSupplier')) document.getElementById('titleFormSupplier').innerText = '🏢 Tambah Data Supplier Baru';
}

function editSupplier(id) {
    let sup = suppliers.find(s => s.id === id);
    if (!sup) return;
    document.getElementById('supplierId').value = sup.id;
    document.getElementById('supplierNama').value = sup.nama;
    document.getElementById('supplierKontak').value = sup.kontak;
    document.getElementById('supplierAlamat').value = sup.alamat || '';
    document.getElementById('supplierKeterangan').value = sup.keterangan || '';
    if(document.getElementById('titleFormSupplier')) document.getElementById('titleFormSupplier').innerText = '✏️ Edit Supplier: ' + sup.nama;
}

function hapusSupplier(id) {
    if (!confirm('Hapus supplier ini?')) return;
    if (db) {
        db.ref('suppliers/' + id).remove();
    } else {
        suppliers = suppliers.filter(s => s.id !== id);
        localStorage.setItem('aya_suppliers_v3', JSON.stringify(suppliers));
        renderSupplier();
    }
}

function renderSupplier() {
    let container = document.getElementById('tabelSupplier');
    let dropdownMaster = document.getElementById('masterSupplier');
    if (dropdownMaster) {
        let optHtml = '<option value="">-- Tanpa Supplier --</option>';
        suppliers.forEach(s => {
            optHtml += `<option value="${s.id}">${s.nama}</option>`;
        });
        dropdownMaster.innerHTML = optHtml;
    }

    if (!container) return;
    if (suppliers.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">Belum ada data supplier.</td></tr>`;
        return;
    }

    let html = '';
    suppliers.forEach(s => {
        html += `
            <tr class="hover:bg-orange-50/40 transition border-b border-gray-100">
                <td class="p-3 font-bold text-gray-800 uppercase">${s.nama}</td>
                <td class="p-3 text-gray-600">${s.kontak}</td>
                <td class="p-3 text-gray-600">${s.alamat || '-'}</td>
                <td class="p-3 text-gray-600">${s.keterangan || '-'}</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editSupplier('${s.id}')" class="px-2 py-1 bg-blue-500 text-white text-[10px] rounded font-bold hover:bg-blue-600 cursor-pointer">✏️ Edit</button>
                    <button onclick="hapusSupplier('${s.id}')" class="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold hover:bg-red-600 cursor-pointer">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    container.innerHTML = html;
}

function simpanPelanggan() {
    let id = document.getElementById('pelangganId').value;
    let nama = document.getElementById('pelangganNama').value.trim();
    let kontak = document.getElementById('pelangganKontak').value.trim();
    let alamat = document.getElementById('pelangganAlamat').value.trim();

    if (!nama || !kontak) return alert('Nama dan No Kontak Pelanggan wajib diisi!');

    let idPel = id ? id : 'PEL-' + Date.now();
    let data = { id: idPel, nama: nama, kontak: kontak, alamat: alamat };

    if (db) {
        db.ref('pelanggan/' + idPel).set(data);
    } else {
        let idx = pelanggan.findIndex(p => p.id === idPel);
        if (idx !== -1) pelanggan[idx] = data;
        else pelanggan.push(data);
        localStorage.setItem('aya_pelanggan_v3', JSON.stringify(pelanggan));
        renderPelanggan();
    }
    resetFormPelanggan();
    alert('Data Pelanggan berhasil disimpan!');
}

function resetFormPelanggan() {
    if(document.getElementById('pelangganId')) document.getElementById('pelangganId').value = '';
    if(document.getElementById('pelangganNama')) document.getElementById('pelangganNama').value = '';
    if(document.getElementById('pelangganKontak')) document.getElementById('pelangganKontak').value = '';
    if(document.getElementById('pelangganAlamat')) document.getElementById('pelangganAlamat').value = '';
    if(document.getElementById('titleFormPelanggan')) document.getElementById('titleFormPelanggan').innerText = '👥 Tambah Data Pelanggan Baru';
}

function editPelanggan(id) {
    let pel = pelanggan.find(p => p.id === id);
    if (!pel) return;
    document.getElementById('pelangganId').value = pel.id;
    document.getElementById('pelangganNama').value = pel.nama;
    document.getElementById('pelangganKontak').value = pel.kontak;
    document.getElementById('pelangganAlamat').value = pel.alamat || '';
    if(document.getElementById('titleFormPelanggan')) document.getElementById('titleFormPelanggan').innerText = '✏️ Edit Pelanggan: ' + pel.nama;
}

function hapusPelanggan(id) {
    if (!confirm('Hapus pelanggan ini?')) return;
    if (db) {
        db.ref('pelanggan/' + id).remove();
    } else {
        pelanggan = pelanggan.filter(p => p.id !== id);
        localStorage.setItem('aya_pelanggan_v3', JSON.stringify(pelanggan));
        renderPelanggan();
    }
}

function renderPelanggan() {
    let container = document.getElementById('tabelPelanggan');
    let selectKasir = document.getElementById('selectPelangganKasir');

    if (selectKasir) {
        let opts = '<option value="">-- Pilih Nama Pelanggan --</option>';
        pelanggan.forEach(p => {
            opts += `<option value="${p.id}">${p.nama} (${p.kontak})</option>`;
        });
        selectKasir.innerHTML = opts;
    }

    if (!container) return;
    if (pelanggan.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400 italic">Belum ada data pelanggan.</td></tr>`;
        return;
    }

    let hutangPelangganMap = {};
    riwayatTransaksi.forEach(t => {
        if (t.metodePembayaran === 'HUTANG' && t.pelangganId) {
            let sisa = t.total - (t.sudahDibayar || 0);
            if (sisa > 0) {
                hutangPelangganMap[t.pelangganId] = (hutangPelangganMap[t.pelangganId] || 0) + sisa;
            }
        }
    });

    let html = '';
    pelanggan.forEach(p => {
        let totalHutang = hutangPelangganMap[p.id] || 0;
        html += `
            <tr class="hover:bg-orange-50/40 transition border-b border-gray-100">
                <td class="p-3 font-bold text-gray-800 uppercase">${p.nama}</td>
                <td class="p-3 text-gray-600">${p.kontak}</td>
                <td class="p-3 text-gray-600">${p.alamat || '-'}</td>
                <td class="p-3 text-right font-black ${totalHutang > 0 ? 'text-red-600' : 'text-emerald-600'}">Rp ${totalHutang.toLocaleString('id-ID')}</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editPelanggan('${p.id}')" class="px-2 py-1 bg-blue-500 text-white text-[10px] rounded font-bold hover:bg-blue-600 cursor-pointer">✏️ Edit</button>
                    <button onclick="hapusPelanggan('${p.id}')" class="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold hover:bg-red-600 cursor-pointer">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    container.innerHTML = html;
}

/* MANAJEMEN HUTANG PELANGGAN */
function renderHutangPelanggan() {
    let tbody = document.getElementById('tabelHutangPelanggan');
    if (!tbody) return;

    let keyword = (document.getElementById('cariHutang')?.value || '').toLowerCase().trim();
    let listHutang = riwayatTransaksi.filter(t => t.metodePembayaran === 'HUTANG');

    if (keyword) {
        listHutang = listHutang.filter(t => (t.pelangganNama && t.pelangganNama.toLowerCase().includes(keyword)));
    }

    let totalSisa = 0;
    let totalDibayar = 0;

    riwayatTransaksi.forEach(t => {
        if (t.metodePembayaran === 'HUTANG') {
            let dibayar = t.sudahDibayar || 0;
            let sisa = t.total - dibayar;
            totalDibayar += dibayar;
            if (sisa > 0) totalSisa += sisa;
        }
    });

    if (document.getElementById('statTotalHutang')) document.getElementById('statTotalHutang').innerText = 'Rp ' + totalSisa.toLocaleString('id-ID');
    if (document.getElementById('statTotalHutangDibayar')) document.getElementById('statTotalHutangDibayar').innerText = 'Rp ' + totalDibayar.toLocaleString('id-ID');
    if (document.getElementById('statJumlahKasbon')) document.getElementById('statJumlahKasbon').innerText = listHutang.length + ' Transaksi';

    if (listHutang.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">Belum ada transaksi hutang / kasbon.</td></tr>`;
        return;
    }

    let html = '';
    listHutang.forEach(t => {
        let dibayar = t.sudahDibayar || 0;
        let sisa = t.total - dibayar;
        let statusTag = sisa <= 0 
            ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">LUNAS</span>`
            : `<span class="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold text-[10px]">BELUM LUNAS</span>`;

        html += `
            <tr class="hover:bg-orange-50/40 transition border-b border-gray-100">
                <td class="p-3 font-bold text-gray-700">${t.id}</td>
                <td class="p-3 font-bold text-gray-800 uppercase">${t.pelangganNama || 'Umum'}<br><span class="text-[10px] text-gray-400 font-normal">📞 ${t.pelangganKontak || '-'}</span></td>
                <td class="p-3 text-center text-gray-500">${t.waktu}</td>
                <td class="p-3 text-right font-bold text-gray-800">Rp ${t.total.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right text-emerald-600 font-bold">Rp ${dibayar.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right text-red-600 font-extrabold">Rp ${sisa.toLocaleString('id-ID')}</td>
                <td class="p-3 text-center">${statusTag}</td>
                <td class="p-3 text-center">
                    ${sisa > 0 ? `<button onclick="bayarHutang('${t.id}')" class="px-2 py-1 bg-emerald-600 text-white text-[10px] rounded font-bold hover:bg-emerald-700">💳 Pelunasan</button>` : '-'}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function bayarHutang(idNota) {
    let t = riwayatTransaksi.find(x => x.id === idNota);
    if (!t) return;
    let sisa = t.total - (t.sudahDibayar || 0);
    let bayar = prompt(`Masukkan nominal pelunasan hutang untuk ${t.pelangganNama} (Sisa: Rp ${sisa.toLocaleString('id-ID')}):`, sisa);
    if (!bayar) return;

    let nominal = parseInt(bayar) || 0;
    if (nominal <= 0) return alert('Nominal bayar tidak valid!');

    t.sudahDibayar = (t.sudahDibayar || 0) + nominal;
    localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
    renderHutangPelanggan();
    alert('Pelunasan hutang telah berhasil diperbarui!');
}

/* PENGELUARAN & TITIPAN BARANG */
function tambahKeDaftarBelanja() {
    let nama = document.getElementById('namaPengeluaran')?.value.trim();
    let harga = parseInt(document.getElementById('hargaPengeluaran')?.value) || 0;
    let qty = parseInt(document.getElementById('qtyPengeluaran')?.value) || 1;
    let satuan = document.getElementById('satuanPengeluaran')?.value || 'pcs';

    if (!nama || harga <= 0) return alert('Lengkapi data pengeluaran dengan benar!');

    keranjangPengeluaran.push({ nama, harga, qty, satuan, subtotal: harga * qty });
    document.getElementById('namaPengeluaran').value = '';
    document.getElementById('hargaPengeluaran').value = '';
    document.getElementById('qtyPengeluaran').value = '1';

    renderDaftarBelanjaPengeluaran();
}

function renderDaftarBelanjaPengeluaran() {
    let container = document.getElementById('tabelBelanjaPengeluaran');
    let totalEl = document.getElementById('totalBelanjaPengeluaran');
    if (!container) return;

    if (keranjangPengeluaran.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4 text-xs">Belum ada barang di daftar belanja</p>';
        if (totalEl) totalEl.innerText = 'Rp 0';
        return;
    }

    let total = 0;
    let html = '';
    keranjangPengeluaran.forEach((item, index) => {
        total += item.subtotal;
        html += `
            <div class="flex justify-between items-center py-1 border-b text-xs">
                <span>${item.nama} (${item.qty} ${item.satuan} x Rp ${item.harga.toLocaleString('id-ID')})</span>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-red-600">Rp ${item.subtotal.toLocaleString('id-ID')}</span>
                    <button onclick="keranjangPengeluaran.splice(${index},1); renderDaftarBelanjaPengeluaran();" class="text-red-500 font-bold text-xs">❌</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    if (totalEl) totalEl.innerText = 'Rp ' + total.toLocaleString('id-ID');
}

function simpanPengeluaran() {
    if (keranjangPengeluaran.length === 0) return alert('Daftar pengeluaran kosong!');

    let totalNominal = keranjangPengeluaran.reduce((sum, item) => sum + item.subtotal, 0);
    let ket = keranjangPengeluaran.map(i => `${i.nama} (${i.qty} ${i.satuan})`).join(', ');

    let data = {
        id: 'EXP-' + Date.now(),
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: dapatkanTanggalLokal(),
        keterangan: ket,
        nominal: totalNominal
    };

    pengeluaran.unshift(data);
    localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(pengeluaran));
    keranjangPengeluaran = [];
    renderDaftarBelanjaPengeluaran();
    renderPengeluaran();
    alert('Pengeluaran berhasil dicatat!');
}

function simpanModalTambahan() {
    let input = parseInt(document.getElementById('inputModalTambahan')?.value) || 0;
    if (input <= 0) return alert('Nominal modal harus lebih besar dari 0!');

    let data = {
        id: 'MODAL-' + Date.now(),
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: dapatkanTanggalLokal(),
        keterangan: 'INPUT MODAL CASH TAMBAHAN',
        nominal: -input
    };

    pengeluaran.unshift(data);
    localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(pengeluaran));
    document.getElementById('inputModalTambahan').value = '';
    renderPengeluaran();
    alert('Modal cash berhasil ditambahkan!');
}

function renderPengeluaran() {
    let tbody = document.getElementById('tabelPengeluaran');
    if (!tbody) return;

    if (pengeluaran.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400 italic">Belum ada catatan pengeluaran.</td></tr>`;
        return;
    }

    let html = '';
    pengeluaran.forEach(p => {
        html += `
            <tr class="hover:bg-orange-50/40 border-b border-gray-100">
                <td class="p-3 text-gray-500 text-xs">${p.waktu}</td>
                <td class="p-3 font-bold text-gray-800 text-xs uppercase">${p.keterangan}</td>
                <td class="p-3 text-right font-bold text-red-600 text-xs">Rp ${(p.nominal || 0).toLocaleString('id-ID')}</td>
                <td class="p-3 text-center">
                    <button onclick="hapusPengeluaran('${p.id}')" class="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold hover:bg-red-600 cursor-pointer">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function hapusPengeluaran(id) {
    if (!confirm('Hapus catatan pengeluaran ini?')) return;
    pengeluaran = pengeluaran.filter(p => p.id !== id);
    localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(pengeluaran));
    renderPengeluaran();
}

function hitungOtomatisTerjualTitipan() {
    let tbody = document.getElementById('tabelDaftarTitipan');
    if (!tbody) return;

    if (barangTitipan.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-gray-400 italic">Belum ada data barang titipan.</td></tr>`;
        return;
    }

    let html = '';
    barangTitipan.forEach(b => {
        let hBeli = b.hargaBeli || 0;
        let hJual = b.hargaJual || 0;
        let terjual = b.terjual || 0;
        let sisa = b.jumlah - terjual - (b.retur || 0);
        let hutangKeTitip = terjual * hBeli;
        let profit = terjual * (hJual - hBeli);

        html += `
            <tr class="hover:bg-orange-50/40 border-b border-gray-100">
                <td class="p-3 font-bold text-gray-800 uppercase">${b.nama}</td>
                <td class="p-3 text-center">${b.jumlah}</td>
                <td class="p-3 text-center font-bold text-emerald-600">${terjual}</td>
                <td class="p-3 text-center text-red-500">${b.retur || 0}</td>
                <td class="p-3 text-center font-bold text-gray-700">${sisa}</td>
                <td class="p-3 text-right">Rp ${hBeli.toLocaleString('id-ID')} / Rp ${hJual.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-bold text-red-600">Rp ${hutangKeTitip.toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-bold text-emerald-600">Rp ${(b.sudahDibayar || 0).toLocaleString('id-ID')}</td>
                <td class="p-3 text-right font-extrabold text-blue-600">Rp ${profit.toLocaleString('id-ID')}</td>
                <td class="p-3 text-center">
                    <button onclick="hapusTitipan('${b.id}')" class="px-2 py-1 bg-red-500 text-white text-[10px] rounded font-bold hover:bg-red-600 cursor-pointer">❌ Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function tambahBarangTitipan() {
    let nama = document.getElementById('titipanNama')?.value.trim();
    let jumlah = parseInt(document.getElementById('titipanJumlah')?.value) || 0;
    let kontak = document.getElementById('titipanKontak')?.value.trim();
    let hargaBeli = parseInt(document.getElementById('titipanHargaBeli')?.value) || 0;
    let hargaJual = parseInt(document.getElementById('titipanHargaJual')?.value) || 0;

    if (!nama || jumlah <= 0 || hargaJual <= 0) return alert('Data barang titipan belum lengkap!');

    let data = {
        id: 'TITIP-' + Date.now(),
        nama, jumlah, kontak, hargaBeli, hargaJual, terjual: 0, retur: 0, sudahDibayar: 0
    };

    barangTitipan.push(data);
    localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));
    hitungOtomatisTerjualTitipan();
    alert('Barang titipan berhasil ditambahkan!');
}

function hapusTitipan(id) {
    if (!confirm('Hapus barang titipan ini?')) return;
    barangTitipan = barangTitipan.filter(b => b.id !== id);
    localStorage.setItem('aya_titipan_v3', JSON.stringify(barangTitipan));
    hitungOtomatisTerjualTitipan();
}