// Global State
let keranjang = [];
let daftarBelanja = [];
let daftarPembelian = [];
let metodeBayarPilihan = 'TUNAI';
let currentKategori = 'topping';
let activeChartProduk = null;

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
    switchTab('transaksi');
    renderMenuKasir();
    initFilterTanggalDefault();
    
    // Set default tanggal pengeluaran & laporan hari ini
    const today = new Date().toISOString().split('T')[0];
    if(document.getElementById('filterPengeluaranMulai')) document.getElementById('filterPengeluaranMulai').value = today;
    if(document.getElementById('filterPengeluaranSelesai')) document.getElementById('filterPengeluaranSelesai').value = today;
    if(document.getElementById('filterTanggalMulai')) document.getElementById('filterTanggalMulai').value = today;
    if(document.getElementById('filterTanggalSelesai')) document.getElementById('filterTanggalSelesai').value = today;

    // Load initial views if functions exist
    updateTabelMaster();
    updateListSupplierPelanggan();
    updateTabelTitipan();
    muatDataPengeluaran();
    muatDataPembelian();
    muatLaporanRekap();
    initSelectMasterPembelian();
});

// Fungsi Navigasi Utama Antar Tab
function switchTab(tabId) {
    const tabs = ['transaksi', 'master', 'rekan', 'titipan', 'laporan'];
    tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        if (el) {
            if (t === tabId) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });

    if(tabId === 'laporan') {
        muatLaporanRekap();
    }
}

// Navigasi Sub-Tab Transaksi (Kasir, Pembelian, Pengeluaran)
function switchSubTransaksi(subId) {
    const subs = ['kasir', 'pembelian', 'pengeluaran'];
    subs.forEach(s => {
        const el = document.getElementById('sub-transaksi-' + s);
        const btn = document.getElementById('btn-sub-' + s);
        if (el) {
            if (s === subId) {
                el.classList.remove('hidden');
                if(btn) btn.className = "px-4 py-2 bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-lg shadow transition cursor-pointer";
            } else {
                el.classList.add('hidden');
                if(btn) btn.className = "px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm rounded-lg transition cursor-pointer";
            }
        }
    });
}

// ==================== KASIR MODULE ====================
function filterKategori(kategori) {
    currentKategori = kategori;
    ['topping', 'makanan', 'dingin', 'panas', 'jajanan'].forEach(kat => {
        const btn = document.getElementById('btn-kat-' + kat);
        if(btn) {
            if(kat === kategori) {
                btn.className = "px-4 py-2 bg-orange-500 text-white font-bold text-xs sm:text-sm rounded-lg shadow transition cursor-pointer whitespace-nowrap";
            } else {
                btn.className = "px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm rounded-lg transition cursor-pointer whitespace-nowrap";
            }
        }
    });
    renderMenuKasir();
}

function renderMenuKasir() {
    const container = document.getElementById('container-menu');
    if(!container) return;
    container.innerHTML = '';

    const keyword = document.getElementById('cariMenuKasir') ? document.getElementById('cariMenuKasir').value.toLowerCase() : '';
    let masterStorage = JSON.parse(localStorage.getItem('aya_master_barang')) || databaseMenu;
    
    const filtered = masterStorage.filter(item => {
        const matchKat = item.kategori === currentKategori;
        const matchKeyword = item.nama.toLowerCase().includes(keyword) || (item.sku && item.sku.toLowerCase().includes(keyword));
        return keyword ? matchKeyword : matchKat;
    });

    if(filtered.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-400 py-6 text-xs italic">Tidak ada menu ditemukan.</p>`;
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = "bg-orange-50/60 hover:bg-orange-100 border border-orange-200 p-3 rounded-xl flex flex-col justify-between cursor-pointer transition shadow-sm";
        card.onclick = () => tambahKeKeranjang(item);
        card.innerHTML = `
            <div>
                <span class="text-[10px] bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded font-bold">${item.kategori.toUpperCase()}</span>
                <h4 class="font-bold text-xs text-gray-800 mt-1">${item.nama}</h4>
            </div>
            <div class="flex justify-between items-end mt-3">
                <span class="text-orange-600 font-extrabold text-xs">Rp ${Number(item.harga).toLocaleString('id-ID')}</span>
                <span class="text-[10px] text-gray-500">/${item.satuan || 'pcs'}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function cariMenuKasir() {
    renderMenuKasir();
}

function tambahKeKeranjang(item) {
    const existing = keranjang.find(i => i.id === item.id || i.nama === item.nama);
    if(existing) {
        existing.qty += 1;
    } else {
        keranjang.push({
            id: item.id || Date.now(),
            nama: item.nama,
            harga: Number(item.harga),
            modal: Number(item.hargaBeli || 0),
            qty: 1,
            satuan: item.satuan || 'pcs',
            kategori: item.kategori || 'umum'
        });
    }
    updateKeranjang();
}

function updateKeranjang() {
    const container = document.getElementById('tabelKeranjang');
    if(!container) return;

    if(keranjang.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4 text-xs">Belum ada item dipilih</p>`;
        hitungTotalBelanja();
        return;
    }

    container.innerHTML = '';
    keranjang.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center py-2 border-b border-gray-100 text-xs";
        row.innerHTML = `
            <div class="flex-1 pr-2">
                <div class="font-bold text-gray-800">${item.nama}</div>
                <div class="text-gray-500 text-[10px]">Rp ${item.harga.toLocaleString('id-ID')} x ${item.qty} ${item.satuan}</div>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="ubahQty(${index}, -1)" class="w-6 h-6 bg-gray-200 rounded font-bold hover:bg-gray-300">-</button>
                <span class="w-6 text-center font-bold">${item.qty}</span>
                <button onclick="ubahQty(${index}, 1)" class="w-6 h-6 bg-orange-500 text-white rounded font-bold hover:bg-orange-600">+</button>
                <button onclick="hapusItemKeranjang(${index})" class="ml-2 text-red-500 font-bold px-1">✕</button>
            </div>
        `;
        container.appendChild(row);
    });
    hitungTotalBelanja();
}

function ubahQty(index, delta) {
    keranjang[index].qty += delta;
    if(keranjang[index].qty <= 0) {
        keranjang.splice(index, 1);
    }
    updateKeranjang();
}

function hapusItemKeranjang(index) {
    keranjang.splice(index, 1);
    updateKeranjang();
}

function hitungTotalBelanja() {
    let subtotal = keranjang.reduce((sum, item) => sum + (item.harga * item.qty), 0);
    const styrofoam = Number(document.getElementById('inputStyrofoam')?.value || 0) * 1000;
    const ongkir = Number(document.getElementById('inputOngkir')?.value || 0);
    const total = subtotal + styrofoam + ongkir;

    const textTotal = document.getElementById('textTotal');
    if(textTotal) textTotal.innerText = `Rp ${total.toLocaleString('id-ID')}`;
    hitungKembalian();
    return total;
}

function setMetodePembayaran(metode) {
    metodeBayarPilihan = metode;
    ['TUNAI', 'QRIS', 'KONSUMSI'].forEach(m => {
        const btn = document.getElementById('btn-bayar-' + m.toLowerCase());
        if(btn) {
            if(m === metode) {
                btn.className = "py-2 text-center text-[10px] font-bold rounded-lg bg-orange-600 text-white shadow border border-orange-600 cursor-pointer transition";
            } else {
                btn.className = "py-2 text-center text-[10px] font-bold rounded-lg bg-gray-100 text-gray-700 border border-gray-200 cursor-pointer transition";
            }
        }
    });
}

function hitungKembalian() {
    const total = hitungTotalBelanja();
    const bayar = Number(document.getElementById('inputBayar')?.value || 0);
    const kembalian = bayar - total;
    const textKembalian = document.getElementById('textKembalian');
    if(textKembalian) {
        textKembalian.innerText = `Rp ${kembalian >= 0 ? kembalian.toLocaleString('id-ID') : 0}`;
    }
}

function bersihkanKeranjang() {
    keranjang = [];
    if(document.getElementById('inputStyrofoam')) document.getElementById('inputStyrofoam').value = '';
    if(document.getElementById('inputOngkir')) document.getElementById('inputOngkir').value = '';
    if(document.getElementById('inputBayar')) document.getElementById('inputBayar').value = '';
    updateKeranjang();
}

function tombolSimpanSaja() {
    simpanTransaksi(false);
}

function cetakNota() {
    simpanTransaksi(true);
}

function simpanTransaksi(isPrint) {
    if(keranjang.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }

    const total = hitungTotalBelanja();
    const bayar = Number(document.getElementById('inputBayar')?.value || 0);
    if(metodeBayarPilihan === 'TUNAI' && bayar < total) {
        alert("Uang bayar kurang dari total belanja!");
        return;
    }

    const transaksi = {
        id: 'NOTA-' + Date.now(),
        tanggal: new Date().toISOString(),
        items: [...keranjang],
        total: total,
        metode: metodeBayarPilihan,
        bayar: bayar,
        kembalian: bayar - total,
        pelanggan: document.getElementById('kasirPelanggan')?.value || 'Guest'
    };

    let riwayat = JSON.parse(localStorage.getItem('aya_riwayat_transaksi')) || [];
    riwayat.push(transaksi);
    localStorage.setItem('aya_riwayat_transaksi', JSON.stringify(riwayat));

    if(isPrint) {
        isiDanCetakNota(transaksi);
    } else {
        alert("Transaksi berhasil disimpan!");
    }

    bersihkanKeranjang();
    muatLaporanRekap();
}

function isiDanCetakNota(trx) {
    document.getElementById('notaWaktu').innerText = new Date(trx.tanggal).toLocaleString('id-ID');
    document.getElementById('notaPelanggan').innerText = `Pelanggan: ${trx.pelanggan}`;
    document.getElementById('notaMetode').innerText = `Bayar: ${trx.metode}`;
    
    const itemsContainer = document.getElementById('notaItems');
    itemsContainer.innerHTML = '';
    trx.items.forEach(i => {
        const div = document.createElement('div');
        div.className = "nota-item-row";
        div.innerHTML = `
            <div>${i.nama}</div>
            <div class="nota-item-detail">
                <span>${i.qty} x ${i.harga.toLocaleString('id-ID')}</span>
                <span><b>Rp ${(i.qty * i.harga).toLocaleString('id-ID')}</b></span>
            </div>
        `;
        itemsContainer.appendChild(div);
    });

    document.getElementById('notaTotal').innerHTML = `
        <div style="display:flex; justify-content:space-between; font-weight:bold;">
            <span>TOTAL:</span>
            <span>Rp ${trx.total.toLocaleString('id-ID')}</span>
        </div>
    `;

    window.print();
}

// ==================== PEMBELIAN / KULAKAN MODULE ====================
function initSelectMasterPembelian() {
    const selectMaster = document.getElementById('pembelianMasterItem');
    if(!selectMaster) return;
    let masterStorage = JSON.parse(localStorage.getItem('aya_master_barang')) || databaseMenu;
    let opts = '<option value="">-- Manual / Ketik Nama Baru --</option>';
    masterStorage.forEach(item => {
        opts += `<option value="${item.id}">${item.nama} (${item.satuan || 'pcs'})</option>`;
    });
    selectMaster.innerHTML = opts;

    selectMaster.onchange = function() {
        const val = this.value;
        if(val) {
            const item = masterStorage.find(m => m.id == val);
            if(item) {
                if(document.getElementById('skuPembelian')) document.getElementById('skuPembelian').value = item.sku || '';
                if(document.getElementById('namaPembelian')) document.getElementById('namaPembelian').value = item.nama || '';
                if(document.getElementById('kategoriPembelian')) document.getElementById('kategoriPembelian').value = item.kategori || 'topping';
                if(document.getElementById('isiPembelian')) document.getElementById('isiPembelian').value = item.isi || 1;
                if(document.getElementById('hargaPembelian')) document.getElementById('hargaPembelian').value = item.hargaBeli || 0;
                if(document.getElementById('hargaJualPembelian')) document.getElementById('hargaJualPembelian').value = item.harga || 0;
                hitungPembelian();
            }
        }
    };
}

function hitungPembelian() {
    const hgGrosir = Number(document.getElementById('hargaGrosirPembelian')?.value || 0);
    const qtyDUS = Number(document.getElementById('qtyPembelian')?.value || 1);
    const isiPerBks = Number(document.getElementById('isiPembelian')?.value || 1);
    const hgJualPcs = Number(document.getElementById('hargaJualPembelian')?.value || 0);

    const hgBeliPcs = isiPerBks > 0 ? hgGrosir / isiPerBks : hgGrosir;
    if(document.getElementById('hargaPembelian')) {
        document.getElementById('hargaPembelian').value = Math.round(hgBeliPcs);
    }

    const totalStok = qtyDUS * isiPerBks;
    if(document.getElementById('textTotalStokPcs')) {
        document.getElementById('textTotalStokPcs').innerText = `${totalStok} pcs`;
    }

    const profitPcs = hgJualPcs - hgBeliPcs;
    if(document.getElementById('textProfitPcs')) {
        document.getElementById('textProfitPcs').innerText = `Rp ${Math.round(profitPcs).toLocaleString('id-ID')}`;
    }
}

function tambahKeDaftarPembelian() {
    const sku = document.getElementById('skuPembelian')?.value || '';
    const nama = document.getElementById('namaPembelian')?.value;
    const kategori = document.getElementById('kategoriPembelian')?.value || 'topping';
    const qtyGrosir = Number(document.getElementById('qtyPembelian')?.value || 1);
    const hgGrosir = Number(document.getElementById('hargaGrosirPembelian')?.value || 0);
    const isiPcs = Number(document.getElementById('isiPembelian')?.value || 1);
    const hgBeliPcs = Number(document.getElementById('hargaPembelian')?.value || 0);
    const hgJualPcs = Number(document.getElementById('hargaJualPembelian')?.value || 0);

    if(!nama || hgGrosir <= 0) { alert("Nama barang dan harga grosir wajib diisi!"); return; }

    daftarPembelian.push({
        sku: sku,
        nama: nama,
        kategori: kategori,
        qtyGrosir: qtyGrosir,
        hargaGrosir: hgGrosir,
        isiPcs: isiPcs,
        hargaBeliPcs: hgBeliPcs,
        hargaJualPcs: hgJualPcs,
        totalStokPcs: qtyGrosir * isiPcs,
        subtotal: hgGrosir * qtyGrosir
    });
    renderDaftarPembelian();
}

function renderDaftarPembelian() {
    const container = document.getElementById('tabelBelanjaPembelian');
    if(!container) return;
    if(daftarPembelian.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4">Belum ada barang di daftar kulakan</p>`;
        document.getElementById('totalBelanjaPembelian').innerText = 'Rp 0';
        return;
    }
    let total = 0;
    container.innerHTML = daftarPembelian.map((b) => {
        total += b.subtotal;
        return `<div class="flex justify-between py-1 border-b">
            <div>
                <b>${b.nama}</b> <span class="text-gray-500">(${b.qtyGrosir} Bks/Dus @Rp ${b.hargaGrosir.toLocaleString('id-ID')})</span><br>
                <span class="text-[10px] text-gray-500">Stok: +${b.totalStokPcs} pcs | HPP/Pcs: Rp ${Math.round(b.hargaBeliPcs).toLocaleString('id-ID')} | Jual/Pcs: Rp ${b.hargaJualPcs.toLocaleString('id-ID')}</span>
            </div>
            <b class="text-orange-600">Rp ${b.subtotal.toLocaleString('id-ID')}</b>
        </div>`;
    }).join('');
    document.getElementById('totalBelanjaPembelian').innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

function simpanPembelian() {
    if(daftarPembelian.length === 0) { alert("Daftar kulakan masih kosong!"); return; }
    
    let riwayat = JSON.parse(localStorage.getItem('aya_pembelian')) || [];
    let masterStorage = JSON.parse(localStorage.getItem('aya_master_barang')) || databaseMenu;

    const record = {
        id: Date.now(),
        tanggal: new Date().toISOString(),
        supplier: document.getElementById('pembelianSupplier')?.value || 'Umum',
        items: [...daftarPembelian],
        total: daftarPembelian.reduce((s, b) => s + b.subtotal, 0)
    };
    
    // Update atau tambahkan barang ke Master Database secara otomatis
    daftarPembelian.forEach(item => {
        let existingMaster = masterStorage.find(m => (m.sku && m.sku === item.sku) || m.nama.toLowerCase() === item.nama.toLowerCase());
        if(existingMaster) {
            existingMaster.hargaBeli = item.hargaBeliPcs;
            existingMaster.harga = item.hargaJualPcs;
            existingMaster.isi = item.isiPcs;
            existingMaster.stok = (Number(existingMaster.stok) || 0) + item.totalStokPcs;
        } else {
            masterStorage.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                sku: item.sku,
                nama: item.nama,
                kategori: item.kategori,
                satuan: 'pcs',
                isi: item.isiPcs,
                hargaBeli: item.hargaBeliPcs,
                harga: item.hargaJualPcs,
                stok: item.totalStokPcs
            });
        }
    });

    localStorage.setItem('aya_master_barang', JSON.stringify(masterStorage));
    riwayat.push(record);
    localStorage.setItem('aya_pembelian', JSON.stringify(riwayat));

    daftarPembelian = [];
    renderDaftarPembelian();
    muatDataPembelian();
    updateTabelMaster();
    renderMenuKasir();
    initSelectMasterPembelian();
    muatLaporanRekap();
    alert("Transaksi kulakan berhasil disimpan dan Stok/Harga di Master Barang berhasil diperbarui!");
}

function muatDataPembelian() {
    const container = document.getElementById('listPembelian');
    if(!container) return;
    let riwayat = JSON.parse(localStorage.getItem('aya_pembelian')) || [];
    container.innerHTML = riwayat.slice().reverse().map(r => `
        <div class="p-3 bg-orange-50/50 rounded border flex justify-between items-center text-xs">
            <div>
                <b class="text-orange-700">${new Date(r.tanggal).toLocaleString('id-ID')}</b> <span class="text-gray-500">(${r.supplier})</span>
                <div class="text-gray-600">${r.items.map(i => `${i.nama} (+${i.totalStokPcs} pcs)`).join(', ')}</div>
            </div>
            <span class="font-bold text-orange-600">Rp ${r.total.toLocaleString('id-ID')}</span>
        </div>
    `).join('') || '<p class="text-gray-400 italic text-center">Belum ada kulakan tercatat.</p>';
}

// ==================== MASTER DATA MODULE ====================
function updateTabelMaster() {
    const tbody = document.getElementById('tabelMasterData');
    if(!tbody) return;
    let masterStorage = JSON.parse(localStorage.getItem('aya_master_barang')) || databaseMenu;
    
    if(masterStorage.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">Belum ada data master barang.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    masterStorage.forEach((item, index) => {
        const profit = Number(item.harga) - Number(item.hargaBeli || 0);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3 font-mono">${item.sku || '-'}</td>
            <td class="p-3 font-bold">${item.nama}</td>
            <td class="p-3 text-center"><span class="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[10px]">${item.kategori}</span></td>
            <td class="p-3 text-center">${item.isi || 1} ${item.satuan || 'pcs'}</td>
            <td class="p-3 text-right">Rp ${Math.round(Number(item.hargaBeli || 0)).toLocaleString('id-ID')}</td>
            <td class="p-3 text-right font-bold text-orange-600">Rp ${Number(item.harga).toLocaleString('id-ID')}</td>
            <td class="p-3 text-right text-emerald-600 font-bold">Rp ${Math.round(profit).toLocaleString('id-ID')}</td>
            <td class="p-3 text-center">
                <button onclick="hapusMasterItem(${index})" class="text-red-500 font-bold hover:underline">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function cariMasterData() {
    updateTabelMaster();
}

function toggleManualSatuanMaster() {
    const select = document.getElementById('masterSatuanSelect');
    const manual = document.getElementById('masterSatuanManual');
    if(select && manual) {
        if(select.value === 'MANUAL') {
            manual.classList.remove('hidden');
        } else {
            manual.classList.add('hidden');
        }
    }
}

function hitungEstimasiProfitMaster() {
    const hargaBeli = Number(document.getElementById('masterHargaBeli')?.value || 0);
    const isi = Number(document.getElementById('masterIsi')?.value || 1);
    const hargaJual = Number(document.getElementById('masterHargaJual')?.value || 0);
    
    const hppSatuan = isi > 0 ? hargaBeli / isi : 0;
    if(document.getElementById('masterHargaBeliSatuanManual')) {
        document.getElementById('masterHargaBeliSatuanManual').value = Math.round(hppSatuan);
    }
    const profit = hargaJual - hppSatuan;
    const profitEl = document.getElementById('masterEstimasiProfit');
    if(profitEl) {
        profitEl.innerText = `Rp ${Math.round(profit).toLocaleString('id-ID')}`;
    }
}

function resetFormMaster() {
    if(document.getElementById('masterSku')) document.getElementById('masterSku').value = '';
    if(document.getElementById('masterNama')) document.getElementById('masterNama').value = '';
    if(document.getElementById('masterStok')) document.getElementById('masterStok').value = '0';
    if(document.getElementById('masterIsi')) document.getElementById('masterIsi').value = '1';
    if(document.getElementById('masterHargaBeli')) document.getElementById('masterHargaBeli').value = '';
    if(document.getElementById('masterHargaBeliSatuanManual')) document.getElementById('masterHargaBeliSatuanManual').value = '';
    if(document.getElementById('masterHargaJual')) document.getElementById('masterHargaJual').value = '';
}

function simpanMasterDatabase() {
    const nama = document.getElementById('masterNama')?.value;
    const hargaJual = Number(document.getElementById('masterHargaJual')?.value || 0);
    if(!nama || hargaJual <= 0) {
        alert("Nama barang dan harga jual wajib diisi!");
        return;
    }

    let masterStorage = JSON.parse(localStorage.getItem('aya_master_barang')) || databaseMenu;
    const newItem = {
        id: Date.now(),
        sku: document.getElementById('masterSku')?.value || '',
        nama: nama,
        kategori: document.getElementById('masterKategori')?.value || 'topping',
        satuan: document.getElementById('masterSatuanSelect')?.value === 'MANUAL' ? document.getElementById('masterSatuanManual')?.value : document.getElementById('masterSatuanSelect')?.value,
        isi: Number(document.getElementById('masterIsi')?.value || 1),
        hargaBeli: Number(document.getElementById('masterHargaBeliSatuanManual')?.value || 0),
        harga: hargaJual
    };

    masterStorage.push(newItem);
    localStorage.setItem('aya_master_barang', JSON.stringify(masterStorage));
    resetFormMaster();
    updateTabelMaster();
    renderMenuKasir();
    initSelectMasterPembelian();
    alert("Master barang berhasil disimpan!");
}

function hapusMasterItem(index) {
    let masterStorage = JSON.parse(localStorage.getItem('aya_master_barang')) || databaseMenu;
    masterStorage.splice(index, 1);
    localStorage.setItem('aya_master_barang', JSON.stringify(masterStorage));
    updateTabelMaster();
    renderMenuKasir();
    initSelectMasterPembelian();
}

// ==================== SUPPLIER & PELANGGAN MODULE ====================
function simpanSupplier() {
    const nama = document.getElementById('supplierNama')?.value;
    if(!nama) { alert("Nama supplier wajib diisi!"); return; }
    
    let list = JSON.parse(localStorage.getItem('aya_supplier')) || [];
    list.push({
        id: Date.now(),
        nama: nama,
        kontak: document.getElementById('supplierKontak')?.value || '',
        alamat: document.getElementById('supplierAlamat')?.value || ''
    });
    localStorage.setItem('aya_supplier', JSON.stringify(list));
    document.getElementById('supplierNama').value = '';
    document.getElementById('supplierKontak').value = '';
    document.getElementById('supplierAlamat').value = '';
    updateListSupplierPelanggan();
    alert("Supplier berhasil disimpan!");
}

function simpanPelanggan() {
    const nama = document.getElementById('pelangganNama')?.value;
    if(!nama) { alert("Nama pelanggan wajib diisi!"); return; }

    let list = JSON.parse(localStorage.getItem('aya_pelanggan')) || [];
    list.push({
        id: Date.now(),
        nama: nama,
        kontak: document.getElementById('pelangganKontak')?.value || '',
        alamat: document.getElementById('pelangganAlamat')?.value || ''
    });
    localStorage.setItem('aya_pelanggan', JSON.stringify(list));
    document.getElementById('pelangganNama').value = '';
    document.getElementById('pelangganKontak').value = '';
    document.getElementById('pelangganAlamat').value = '';
    updateListSupplierPelanggan();
    alert("Pelanggan berhasil disimpan!");
}

function updateListSupplierPelanggan() {
    const supDiv = document.getElementById('listSupplier');
    const selectSupMaster = document.getElementById('masterSupplier');
    const selectSupPembelian = document.getElementById('pembelianSupplier');
    let suppliers = JSON.parse(localStorage.getItem('aya_supplier')) || [];

    if(supDiv) {
        supDiv.innerHTML = suppliers.map(s => `<div class="p-2 bg-white rounded border mb-1 flex justify-between"><span><b>${s.nama}</b> (${s.kontak})</span></div>`).join('') || '<p class="text-gray-400 italic">Belum ada supplier.</p>';
    }

    if(selectSupMaster) {
        let options = '<option value="">-- Pilih Supplier --</option>';
        suppliers.forEach(s => { options += `<option value="${s.nama}">${s.nama}</option>`; });
        selectSupMaster.innerHTML = options;
    }

    if(selectSupPembelian) {
        let options = '<option value="">-- Pilih Supplier --</option>';
        suppliers.forEach(s => { options += `<option value="${s.nama}">${s.nama}</option>`; });
        selectSupPembelian.innerHTML = options;
    }

    const pelDiv = document.getElementById('listPelanggan');
    const selectKasir = document.getElementById('kasirPelanggan');
    let pelanggans = JSON.parse(localStorage.getItem('aya_pelanggan')) || [];
    
    if(pelDiv) {
        pelDiv.innerHTML = pelanggans.map(p => `<div class="p-2 bg-white rounded border mb-1 flex justify-between"><span><b>${p.nama}</b> (${p.kontak})</span></div>`).join('') || '<p class="text-gray-400 italic">Belum ada pelanggan.</p>';
    }
    if(selectKasir) {
        let options = '<option value="">-- Pelanggan Umum / Guest --</option>';
        pelanggans.forEach(p => {
            options += `<option value="${p.nama}">${p.nama}</option>`;
        });
        selectKasir.innerHTML = options;
    }
}

// ==================== TITIPAN MODULE ====================
function tambahBarangTitipan() {
    const nama = document.getElementById('titipanNama')?.value;
    const jumlah = Number(document.getElementById('titipanJumlah')?.value || 0);
    if(!nama || jumlah <= 0) { alert("Nama barang dan jumlah titipan wajib diisi!"); return; }

    let titipan = JSON.parse(localStorage.getItem('aya_titipan')) || [];
    titipan.push({
        id: Date.now(),
        sku: document.getElementById('titipanSku')?.value || '-',
        nama: nama,
        jumlah: jumlah,
        terjual: 0,
        retur: 0,
        kontak: document.getElementById('titipanKontak')?.value || '-',
        satuan: document.getElementById('titipanSatuan')?.value || 'pcs',
        hargaBeli: Number(document.getElementById('titipanHargaBeli')?.value || 0),
        hargaJual: Number(document.getElementById('titipanHargaJual')?.value || 0),
        dibayar: 0
    });
    localStorage.setItem('aya_titipan', JSON.stringify(titipan));
    updateTabelTitipan();
    alert("Barang titipan berhasil didaftarkan!");
}

function updateTabelTitipan() {
    const tbody = document.getElementById('tabelDaftarTitipan');
    if(!tbody) return;
    let titipan = JSON.parse(localStorage.getItem('aya_titipan')) || [];
    if(titipan.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-gray-400 italic">Belum ada data barang titipan.</td></tr>`;
        return;
    }
    tbody.innerHTML = titipan.map((t, idx) => `
        <tr class="border-b">
            <td class="p-3"><b>${t.nama}</b><br><span class="text-[10px] text-gray-500">${t.sku} | ${t.kontak}</span></td>
            <td class="p-3 text-center">${t.jumlah} ${t.satuan}</td>
            <td class="p-3 text-center font-bold text-emerald-600">${t.terjual}</td>
            <td class="p-3 text-center">${t.retur}</td>
            <td class="p-3 text-center font-bold">${t.jumlah - t.terjual - t.retur}</td>
            <td class="p-3 text-right">Rp ${t.hargaBeli.toLocaleString('id-ID')} / Rp ${t.hargaJual.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right font-bold text-orange-600">Rp ${(t.terjual * t.hargaBeli).toLocaleString('id-ID')}</td>
            <td class="p-3 text-right">Rp ${t.dibayar.toLocaleString('id-ID')}</td>
            <td class="p-3 text-right font-bold text-emerald-600">Rp ${(t.terjual * (t.hargaJual - t.hargaBeli)).toLocaleString('id-ID')}</td>
            <td class="p-3 text-center"><button onclick="hapusTitipan(${idx})" class="text-red-500 font-bold">Hapus</button></td>
        </tr>
    `).join('');
}

function hapusTitipan(index) {
    let titipan = JSON.parse(localStorage.getItem('aya_titipan')) || [];
    titipan.splice(index, 1);
    localStorage.setItem('aya_titipan', JSON.stringify(titipan));
    updateTabelTitipan();
}

// ==================== PENGELUARAN MODULE ====================
function tambahKeDaftarBelanja() {
    const nama = document.getElementById('namaPengeluaran')?.value;
    const harga = Number(document.getElementById('hargaPengeluaran')?.value || 0);
    const qty = Number(document.getElementById('qtyPengeluaran')?.value || 1);
    if(!nama || harga <= 0) { alert("Nama barang dan harga wajib diisi!"); return; }

    daftarBelanja.push({
        nama: nama,
        harga: harga,
        qty: qty,
        satuan: document.getElementById('satuanPengeluaran')?.value || 'pcs',
        subtotal: harga * qty
    });
    renderDaftarBelanja();
}

function renderDaftarBelanja() {
    const container = document.getElementById('tabelBelanjaPengeluaran');
    if(!container) return;
    if(daftarBelanja.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4">Belum ada barang di daftar belanja</p>`;
        document.getElementById('totalBelanjaPengeluaran').innerText = 'Rp 0';
        return;
    }
    let total = 0;
    container.innerHTML = daftarBelanja.map((b) => {
        total += b.subtotal;
        return `<div class="flex justify-between py-1"><span>${b.nama} (${b.qty} ${b.satuan} @${b.harga.toLocaleString('id-ID')})</span><b>Rp ${b.subtotal.toLocaleString('id-ID')}</b></div>`;
    }).join('');
    document.getElementById('totalBelanjaPengeluaran').innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

function simpanPengeluaran() {
    if(daftarBelanja.length === 0) { alert("Daftar belanja masih kosong!"); return; }
    let riwayat = JSON.parse(localStorage.getItem('aya_pengeluaran')) || [];
    const record = {
        id: Date.now(),
        tanggal: new Date().toISOString(),
        items: [...daftarBelanja],
        total: daftarBelanja.reduce((s, b) => s + b.subtotal, 0)
    };
    riwayat.push(record);
    localStorage.setItem('aya_pengeluaran', JSON.stringify(riwayat));
    daftarBelanja = [];
    renderDaftarBelanja();
    muatDataPengeluaran();
    muatLaporanRekap();
    alert("Pengeluaran berhasil disimpan!");
}

function muatDataPengeluaran() {
    const container = document.getElementById('listPengeluaran');
    if(!container) return;
    let riwayat = JSON.parse(localStorage.getItem('aya_pengeluaran')) || [];
    container.innerHTML = riwayat.slice().reverse().map(r => `
        <div class="p-3 bg-orange-50/50 rounded border flex justify-between items-center text-xs">
            <div>
                <b class="text-orange-700">${new Date(r.tanggal).toLocaleString('id-ID')}</b>
                <div class="text-gray-600">${r.items.map(i => `${i.nama} (${i.qty} ${i.satuan})`).join(', ')}</div>
            </div>
            <span class="font-bold text-red-500">Rp ${r.total.toLocaleString('id-ID')}</span>
        </div>
    `).join('') || '<p class="text-gray-400 italic text-center">Belum ada pengeluaran tercatat.</p>';
}

function terapkanFilterPengeluaran() { muatDataPengeluaran(); }
function resetFilterPengeluaran() { muatDataPengeluaran(); }

// ==================== LAPORAN & REKAP MODULE ====================
function initFilterTanggalDefault() {}
function terapkanFilterTanggal() { muatLaporanRekap(); }
function resetFilterTanggal() { muatLaporanRekap(); }
function simpanModalTambahan() {
    const modalAdd = Number(document.getElementById('inputModalTambahan')?.value || 0);
    localStorage.setItem('aya_modal_tambahan', modalAdd);
    muatLaporanRekap();
    alert("Modal tambahan berhasil disimpan!");
}

function muatLaporanRekap() {
    let riwayatTrx = JSON.parse(localStorage.getItem('aya_riwayat_transaksi')) || [];
    let riwayatExp = JSON.parse(localStorage.getItem('aya_pengeluaran')) || [];
    let riwayatPem = JSON.parse(localStorage.getItem('aya_pembelian')) || [];
    let modalTambahan = Number(localStorage.getItem('aya_modal_tambahan') || 0);

    let totalOmset = 0;
    let omsetTunai = 0;
    let omsetQris = 0;
    let omsetKonsumsi = 0;
    let totalHpp = 0;
    let itemTerjualMap = {};

    riwayatTrx.forEach(trx => {
        totalOmset += trx.total;
        if(trx.metode === 'TUNAI') omsetTunai += trx.total;
        else if(trx.metode === 'QRIS') omsetQris += trx.total;
        else if(trx.metode === 'KONSUMSI') omsetKonsumsi += trx.total;

        trx.items.forEach(i => {
            if(!itemTerjualMap[i.nama]) {
                itemTerjualMap[i.nama] = { nama: i.nama, kategori: i.kategori || 'umum', harga: i.harga, modal: i.modal || 0, terjual: 0, omset: 0 };
            }
            itemTerjualMap[i.nama].terjual += i.qty;
            itemTerjualMap[i.nama].omset += (i.qty * i.harga);
            totalHpp += (i.qty * (i.modal || 0));
        });
    });

    let totalPengeluaran = riwayatExp.reduce((s, e) => s + e.total, 0);
    let totalKulakan = riwayatPem.reduce((s, p) => s + p.total, 0);
    let totalBeban = totalPengeluaran + totalKulakan;

    let labaBersih = totalOmset - totalHpp - totalBeban;
    let modalHarian = 70000;
    let uangCashRiil = modalHarian + modalTambahan + omsetTunai - totalBeban;

    // Update UI Stats
    if(document.getElementById('statOmset')) document.getElementById('statOmset').innerText = `Rp ${totalOmset.toLocaleString('id-ID')}`;
    if(document.getElementById('statOmsetTunai')) document.getElementById('statOmsetTunai').innerText = `Rp ${omsetTunai.toLocaleString('id-ID')}`;
    if(document.getElementById('statOmsetQris')) document.getElementById('statOmsetQris').innerText = `Rp ${omsetQris.toLocaleString('id-ID')}`;
    if(document.getElementById('statOmsetKonsumsi')) document.getElementById('statOmsetKonsumsi').innerText = `Rp ${omsetKonsumsi.toLocaleString('id-ID')}`;
    if(document.getElementById('statUangCash')) document.getElementById('statUangCash').innerText = `Rp ${uangCashRiil.toLocaleString('id-ID')}`;
    if(document.getElementById('statCashMasuk')) document.getElementById('statCashMasuk').innerText = `Rp ${omsetTunai.toLocaleString('id-ID')}`;
    if(document.getElementById('statBebanCash')) document.getElementById('statBebanCash').innerText = `Rp ${totalBeban.toLocaleString('id-ID')}`;
    if(document.getElementById('statModalTambahan')) document.getElementById('statModalTambahan').innerText = `Rp ${modalTambahan.toLocaleString('id-ID')}`;
    if(document.getElementById('statPengeluaran')) document.getElementById('statPengeluaran').innerText = `Rp ${totalBeban.toLocaleString('id-ID')}`;
    if(document.getElementById('statNota')) document.getElementById('statNota').innerText = `${riwayatTrx.length} Nota`;

    const statLaba = document.getElementById('statLabaRugi');
    const boxLaba = document.getElementById('boxLabaRugi');
    if(statLaba && boxLaba) {
        statLaba.innerText = `Rp ${labaBersih.toLocaleString('id-ID')}`;
        boxLaba.className = labaBersih >= 0 ? "p-4 rounded-xl shadow border flex flex-col justify-between bg-emerald-50 border-emerald-200 text-emerald-800" : "p-4 rounded-xl shadow border flex flex-col justify-between bg-red-50 border-red-200 text-red-800";
    }

    // Render Tabel Rekap Item Terjual
    const tbodyRekap = document.getElementById('tabelRekapItemTerjual');
    if(tbodyRekap) {
        const items = Object.values(itemTerjualMap);
        if(items.length === 0) {
            tbodyRekap.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400 italic">Belum ada item terjual.</td></tr>`;
        } else {
            tbodyRekap.innerHTML = items.map(i => {
                const profitTotal = i.omset - (i.terjual * i.modal);
                return `
                    <tr class="border-b">
                        <td class="p-3 font-bold">${i.nama}</td>
                        <td class="p-3 text-center"><span class="bg-gray-100 px-2 py-0.5 rounded text-[10px]">${i.kategori}</span></td>
                        <td class="p-3 text-right">Rp ${Math.round(i.modal).toLocaleString('id-ID')}</td>
                        <td class="p-3 text-right">Rp ${i.harga.toLocaleString('id-ID')}</td>
                        <td class="p-3 text-center font-bold">${i.terjual}</td>
                        <td class="p-3 text-right font-bold text-orange-600">Rp ${i.omset.toLocaleString('id-ID')}</td>
                        <td class="p-3 text-right font-bold text-emerald-600">Rp ${Math.round(profitTotal).toLocaleString('id-ID')}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Render Riwayat Nota di Laporan
    const riwayatNotaDiv = document.getElementById('riwayatNota');
    if(riwayatNotaDiv) {
        riwayatNotaDiv.innerHTML = riwayatTrx.slice().reverse().map(trx => `
            <div class="p-3 bg-gray-50 rounded border text-xs flex justify-between items-center">
                <div>
                    <b>${trx.id}</b> (${new Date(trx.tanggal).toLocaleTimeString('id-ID')})<br>
                    <span class="text-gray-500">${trx.pelanggan} | ${trx.metode}</span>
                </div>
                <div class="text-right">
                    <span class="font-bold text-orange-600">Rp ${trx.total.toLocaleString('id-ID')}</span><br>
                    <button onclick="hapusNota('${trx.id}')" class="text-red-500 text-[10px] hover:underline">Hapus</button>
                </div>
            </div>
        `).join('') || '<p class="text-gray-400 italic text-center">Belum ada transaksi.</p>';
    }

    // Render Riwayat Pengeluaran & Pembelian Detail di Laporan
    const rekapExpDiv = document.getElementById('rekapPengeluaranDetail');
    if(rekapExpDiv) {
        let combinedExp = [
            ...riwayatExp.map(e => ({ ...e, tipe: 'Pengeluaran' })),
            ...riwayatPem.map(p => ({ ...p, tipe: 'Kulakan' }))
        ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        rekapExpDiv.innerHTML = combinedExp.map(e => `
            <div class="p-3 ${e.tipe === 'Kulakan' ? 'bg-orange-50/50' : 'bg-red-50/50'} rounded border text-xs flex justify-between items-center">
                <div>
                    <b>[${e.tipe}] ${new Date(e.tanggal).toLocaleString('id-ID')}</b>
                    <div>${e.items.map(i => `${i.nama} (${i.totalStokPcs ? i.totalStokPcs + ' pcs' : i.qty + ' ' + (i.satuan || 'pcs')})`).join(', ')}</div>
                </div>
                <span class="font-bold ${e.tipe === 'Kulakan' ? 'text-orange-600' : 'text-red-600'}">Rp ${e.total.toLocaleString('id-ID')}</span>
            </div>
        `).join('') || '<p class="text-gray-400 italic text-center">Belum ada pengeluaran/kulakan.</p>';
    }

    renderChartProdukLaku(Object.values(itemTerjualMap));
}

function cariItemDalamRekap() {}

function hapusNota(id) {
    let riwayat = JSON.parse(localStorage.getItem('aya_riwayat_transaksi')) || [];
    riwayat = riwayat.filter(t => t.id !== id);
    localStorage.setItem('aya_riwayat_transaksi', JSON.stringify(riwayat));
    muatLaporanRekap();
}

function renderChartProdukLaku(items) {
    const canvas = document.getElementById('chartProdukLaku');
    if(!canvas || typeof Chart === 'undefined') return;

    items.sort((a, b) => b.terjual - a.terjual);
    const top5 = items.slice(0, 5);

    if(activeChartProduk) {
        activeChartProduk.destroy();
    }

    const ctx = canvas.getContext('2d');
    activeChartProduk = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top5.map(i => i.nama),
            datasets: [{
                label: 'Jumlah Terjual',
                data: top5.map(i => i.terjual),
                backgroundColor: 'rgba(249, 115, 22, 0.7)',
                borderColor: 'rgb(234, 88, 12)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}