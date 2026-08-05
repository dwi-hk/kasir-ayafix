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

// ================= NAVIGASI TAB AYA GROUP =================
(function(){
    const AYA_TABS = ['master','cabang','kasir','pembelian','pengeluaran','laporan','laporan_pengeluaran','backoffice','user','setting'];

    function setTab(tab, updateHash=true){
        if(!AYA_TABS.includes(tab)) return false;
        try {
            AYA_TABS.forEach(function(name){
                const panel = document.getElementById('tab-' + name);
                const button = document.getElementById('btn-tab-' + name);
                if(panel){
                    panel.classList.remove('hidden','space-y-4');
                    panel.classList.remove('aya-tab-visible','aya-tab-hidden');
                    if(name === tab){
                        panel.classList.add('aya-tab-visible','space-y-4');
                        panel.style.setProperty('display','block','important');
                    } else {
                        panel.classList.add('aya-tab-hidden');
                        panel.style.setProperty('display','none','important');
                    }
                }
                if(button){
                    button.classList.toggle('bg-orange-700', name === tab);
                    button.setAttribute('aria-selected', name === tab ? 'true' : 'false');
                }
            });
            if(updateHash){
                try { history.replaceState(null,'','#' + tab); } catch(e){}
            }
            const target=document.getElementById('tab-' + tab);
            if(target) target.scrollTop=0;
            window.scrollTo(0,0);

            // Rendering bersifat tambahan; tidak boleh menggagalkan navigasi.
            try {
                if(tab==='master'){
                    if(typeof renderMasterData==='function') renderMasterData();
                    if(typeof renderOpsiMasterTitipan==='function') renderOpsiMasterTitipan();
                    if(typeof renderBarangTitipan==='function') renderBarangTitipan();
                }
                if(tab==='cabang' && typeof renderInventaris==='function') renderInventaris();
                if(tab==='pembelian'){
                    if(typeof renderOpsiMasterPembelian==='function') renderOpsiMasterPembelian();
                    if(typeof renderPembelian==='function') renderPembelian();
                }
                if(tab==='pengeluaran' && typeof updateLaporanPengeluaran==='function') updateLaporanPengeluaran();
                if(tab==='laporan' && typeof updateLaporan==='function') updateLaporan();
                if(tab==='laporan_pengeluaran' && typeof updateLaporanPengeluaran==='function') updateLaporanPengeluaran();
            } catch(renderError){ console.error('[AYA] render tab error:',renderError); }
            return false;
        } catch(error){
            console.error('[AYA] navigasi tab error:',error);
            return false;
        }
    }

    window.AYA_switchTab=setTab;
    window.switchTab=setTab;

    function bind(){
        document.querySelectorAll('[data-aya-tab]').forEach(function(btn){
            btn.addEventListener('click',function(e){
                e.preventDefault();
                setTab(btn.getAttribute('data-aya-tab'));
            },true);
        });
        let initial=(location.hash||'').replace('#','');
        if(!AYA_TABS.includes(initial)) initial='kasir';
        setTab(initial,false);
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();

// Kompatibilitas kode lama.
function switchTab(tab){ return window.AYA_switchTab ? window.AYA_switchTab(tab) : false; }

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
    /* Legacy data is never hard-deleted. */
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
        /* Legacy data is never hard-deleted. */
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
        /* Legacy data is never hard-deleted. */
    } else {
        riwayatPengeluaran = riwayatPengeluaran.filter(e => e.id !== id);
        localStorage.setItem('aya_pengeluaran_v3', JSON.stringify(riwayatPengeluaran));
        updateLaporan();
        updateLaporanPengeluaran();
    }
}

/* ================= MANAJEMEN PEMBELIAN / KULAKAN (PERBAIKAN FITUR) ================= */

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
    /* Legacy data is never hard-deleted. */
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
                    kategori: item.kategori || '-',
                    qty: 0,
                    omset: 0
                };
            }
            itemMap[namaItem].qty += qty;
            itemMap[namaItem].omset += (harga * qty);
        });
    });

    // Hitung Pengeluaran Kasir Tunai Hari Ini / Sesuai Filter
    let sumberPengeluaran = (db && dataPengeluaranFirebase.length > 0) ? dataPengeluaranFirebase : riwayatPengeluaran;
    let pengeluaranTunaiFilter = 0;
    
    (sumberPengeluaran || []).forEach(exp => {
        let dateExp = parseTanggalISO(exp);
        let matchDate = true;
        if (tglMulai && tglSelesai) matchDate = (dateExp >= tglMulai && dateExp <= tglSelesai);
        
        let matchCabang = (cabangAktif === 'SEMUA CABANG') || (exp.cabang === cabangAktif);
        let isTunai = (exp.metode || 'TUNAI').toUpperCase() === 'TUNAI';

        if (matchDate && matchCabang && isTunai) {
            pengeluaranTunaiFilter += parseNominalDinamis(exp);
        }
    });

    let cashLaciEstimasi = modalTambahanManual + totalCash - pengeluaranTunaiFilter;

    // Update Elemen Statistik Dashboard
    if(document.getElementById('statOmset')) document.getElementById('statOmset').innerText = 'Rp ' + totalOmset.toLocaleString('id-ID');
    if(document.getElementById('statOmsetQris')) document.getElementById('statOmsetQris').innerText = 'Rp ' + totalQris.toLocaleString('id-ID');
    if(document.getElementById('statUangCash')) document.getElementById('statUangCash').innerText = 'Rp ' + totalCash.toLocaleString('id-ID');
    if(document.getElementById('statCashLaci')) document.getElementById('statCashLaci').innerText = 'Rp ' + cashLaciEstimasi.toLocaleString('id-ID');
    if(document.getElementById('statTotalQty')) document.getElementById('statTotalQty').innerText = totalQty.toLocaleString('id-ID') + ' Pcs';
    if(document.getElementById('statTotalTransaksi')) document.getElementById('statTotalTransaksi').innerText = filtered.length + ' Trx';

    // Render Tabel Rekap Item Terjual
    let tbodyRekap = document.getElementById('tabelRekapItemTerjual');
    if (tbodyRekap) {
        let sortedItems = Object.values(itemMap).sort((a,b) => b.qty - a.qty);
        if (sortedItems.length === 0) {
            tbodyRekap.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-400">Belum ada item terjual pada periode ini</td></tr>`;
        } else {
            let htmlRekap = '';
            sortedItems.forEach((it, idx) => {
                htmlRekap += `
                    <tr class="hover:bg-orange-50 border-b">
                        <td class="p-2 text-center font-bold">${idx + 1}</td>
                        <td class="p-2 font-bold uppercase">${it.nama}</td>
                        <td class="p-2 text-center text-gray-500">${it.kategori}</td>
                        <td class="p-2 text-center font-extrabold text-orange-600">${it.qty}</td>
                        <td class="p-2 text-right font-bold">Rp ${it.omset.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
            tbodyRekap.innerHTML = htmlRekap;
        }
    }

    // Render Tabel Riwayat Transaksi Nota
    let tbodyRiwayat = document.getElementById('tabelRiwayatTransaksi');
    if (tbodyRiwayat) {
        if (filtered.length === 0) {
            tbodyRiwayat.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-400">Tidak ada riwayat transaksi</td></tr>`;
        } else {
            let htmlRiwayat = '';
            filtered.forEach(t => {
                let itemsStr = '';
                let itemList = Array.isArray(t.items) ? t.items : Object.values(t.items || {});
                let totalHppNota = 0;

                itemList.forEach(i => {
                    let qty = i.qty || 1;
                    let hpp = i.hargaBeli || 0;
                    totalHppNota += (hpp * qty);
                    itemsStr += `${i.nama || 'Item'} (${qty}), `;
                });
                itemsStr = itemsStr.replace(/, $/, '');

                let totalNota = parseNominalDinamis(t);
                let labaNota = totalNota - totalHppNota;

                htmlRiwayat += `
                    <tr class="hover:bg-orange-50 border-b text-xs">
                        <td class="p-2 font-mono text-[10px] font-bold">${t.id || '-'}</td>
                        <td class="p-2 text-[10px] text-gray-600">${t.waktu || t.tanggalISO || '-'}</td>
                        <td class="p-2 text-[10px] font-semibold">${t.cabang || 'Utama'}</td>
                        <td class="p-2 text-gray-700 font-medium max-w-xs truncate">${itemsStr}</td>
                        <td class="p-2 text-center font-bold">${t.metodePembayaran || t.metode || 'TUNAI'}</td>
                        <td class="p-2 text-right font-black text-orange-600">Rp ${totalNota.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-right font-bold text-emerald-600">Rp ${labaNota.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center space-x-1">
                            <button onclick="cetakNotaDariRiwayat('${t.id}')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px]">🖨️ Cetak</button>
                        </td>
                    </tr>
                `;
            });
            tbodyRiwayat.innerHTML = htmlRiwayat;
        }
    }

    renderChartPenjualan(Object.values(itemMap));
}

function renderChartPenjualan(itemsArray) {
    let canvas = document.getElementById('chartProdukLaku');
    if (!canvas || typeof Chart === 'undefined') return;

    let topItems = (itemsArray || []).sort((a,b) => b.qty - a.qty).slice(0, 5);
    let labels = topItems.map(i => i.nama);
    let data = topItems.map(i => i.qty);

    if (myChart) myChart.destroy();

    myChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['Belum Ada Data'],
            datasets: [{
                label: 'Qty Terjual',
                data: data.length > 0 ? data : [0],
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

    let sumberData = (db && dataPengeluaranFirebase.length > 0) ? dataPengeluaranFirebase : riwayatPengeluaran;
    
    let filtered = (sumberData || []).filter(exp => {
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

        let matchKat = (katFilter === 'SEMUA') || (exp.kategori === katFilter);
        let matchCabang = (cabangAktif === 'SEMUA CABANG') || (exp.cabang === cabangAktif);

        return matchDate && matchKat && matchCabang;
    });

    let totalExp = 0;
    let totalTunai = 0;
    let totalTransfer = 0;
    let katMap = {};

    filtered.forEach(exp => {
        let nom = parseNominalDinamis(exp);
        totalExp += nom;

        let met = (exp.metode || 'TUNAI').toUpperCase();
        if (met === 'TUNAI') totalTunai += nom;
        else totalTransfer += nom;

        let kat = exp.kategori || 'Lain-lain';
        katMap[kat] = (katMap[kat] || 0) + nom;
    });

    // Hitung Estimasi Arus Kas Bersih (Total Omset Penjualan - Total Pengeluaran)
    let sumberTransaksi = (db && dataTransaksiFirebase.length > 0) ? dataTransaksiFirebase : riwayatTransaksi;
    let omsetTotalPeriode = 0;
    (sumberTransaksi || []).forEach(t => {
        let dateStr = parseTanggalISO(t);
        let matchDate = true;
        if (tglMulai && tglSelesai) matchDate = (dateStr >= tglMulai && dateStr <= tglSelesai);
        let matchCabang = (cabangAktif === 'SEMUA CABANG') || (t.cabang === cabangAktif);

        if (matchDate && matchCabang) omsetTotalPeriode += parseNominalDinamis(t);
    });

    let arusKasBersih = omsetTotalPeriode - totalExp;

    if(document.getElementById('statTotalPengeluaran')) document.getElementById('statTotalPengeluaran').innerText = 'Rp ' + totalExp.toLocaleString('id-ID');
    if(document.getElementById('statPengeluaranTunai')) document.getElementById('statPengeluaranTunai').innerText = 'Rp ' + totalTunai.toLocaleString('id-ID');
    if(document.getElementById('statPengeluaranTransfer')) document.getElementById('statPengeluaranTransfer').innerText = 'Rp ' + totalTransfer.toLocaleString('id-ID');
    if(document.getElementById('statArusKasBersih')) {
        let elArus = document.getElementById('statArusKasBersih');
        elArus.innerText = 'Rp ' + arusKasBersih.toLocaleString('id-ID');
        elArus.className = arusKasBersih >= 0 ? "text-base font-black text-emerald-700" : "text-base font-black text-red-700";
    }

    // Render Tabel Riwayat Pengeluaran
    let tbodyExp = document.getElementById('tabelRiwayatPengeluaran');
    if (tbodyExp) {
        if (filtered.length === 0) {
            tbodyExp.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-400">Tidak ada riwayat pengeluaran pada periode ini</td></tr>`;
        } else {
            let htmlExp = '';
            filtered.forEach(exp => {
                let nom = parseNominalDinamis(exp);
                htmlExp += `
                    <tr class="hover:bg-red-50 border-b text-xs">
                        <td class="p-2 font-mono text-[10px] font-bold">${exp.id || '-'}</td>
                        <td class="p-2 text-[10px] text-gray-600">${exp.waktu || exp.tanggalISO || '-'}</td>
                        <td class="p-2 text-[10px] font-semibold">${exp.cabang || 'Utama'}</td>
                        <td class="p-2 text-gray-700 font-bold">${exp.kategori || 'Operasional'}</td>
                        <td class="p-2 font-bold text-gray-900">${exp.namaBarang || exp.keterangan || '-'}</td>
                        <td class="p-2 text-center">${exp.qty || 1} ${exp.satuan || 'pcs'}</td>
                        <td class="p-2 text-center font-bold">${exp.metode || 'TUNAI'}</td>
                        <td class="p-2 text-right font-black text-red-600">Rp ${nom.toLocaleString('id-ID')}</td>
                        <td class="p-2 text-center">
                            <button onclick="hapusPengeluaranFirebase('${exp.id}')" class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded text-[10px]">❌ Hapus</button>
                        </td>
                    </tr>
                `;
            });
            tbodyExp.innerHTML = htmlExp;
        }
    }

    renderChartPengeluaran(katMap);
}

function renderChartPengeluaran(katMap) {
    let canvas = document.getElementById('chartPengeluaran');
    if (!canvas || typeof Chart === 'undefined') return;

    let labels = Object.keys(katMap || {});
    let data = Object.values(katMap || {});

    if (myExpenseChart) myExpenseChart.destroy();

    myExpenseChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['Belum Ada Data'],
            datasets: [{
                data: data.length > 0 ? data : [1],
                backgroundColor: [
                    '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/* ================= INVENTARIS PER CABANG ================= */

function renderInventaris() {
    let tbody = document.getElementById('tabelInventaris');
    if (!tbody || typeof databaseMenu === 'undefined') return;

    if (databaseMenu.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-400">Belum ada barang di inventaris</td></tr>`;
        return;
    }

    let html = '';
    databaseMenu.forEach(item => {
        html += `
            <tr class="hover:bg-orange-50 border-b text-xs">
                <td class="p-2 font-mono text-[10px]">${item.id || '-'}</td>
                <td class="p-2 font-bold uppercase">${item.nama || '-'}</td>
                <td class="p-2 text-center text-gray-600">${item.kategori || '-'}</td>
                <td class="p-2 text-right font-bold text-orange-600">Rp ${(item.harga || 0).toLocaleString('id-ID')}</td>
                <td class="p-2 text-center"><span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">Tersedia</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

/* ================= KALKULATOR BACKOFFICE ================= */

let calcExpr = '';
function calcInput(v) {
    calcExpr += v;
    let disp = document.getElementById('calcDisplay');
    if(disp) disp.value = calcExpr;
}
function calcOp(op) {
    calcExpr += op;
    let disp = document.getElementById('calcDisplay');
    if(disp) disp.value = calcExpr;
}
function calcClear() {
    calcExpr = '';
    let disp = document.getElementById('calcDisplay');
    if(disp) disp.value = '0';
}
function calcEqual() {
    try {
        let res = eval(calcExpr);
        let disp = document.getElementById('calcDisplay');
        if(disp) disp.value = res;
        calcExpr = String(res);
    } catch(e) {
        let disp = document.getElementById('calcDisplay');
        if(disp) disp.value = 'Error';
        calcExpr = '';
    }
}


/* ================= AYA GROUP – MODULES TAMBAHAN & KONTROL DATA ================= */
function gantiCabang(nama){
  cabangAktif=nama;
  ['lblCabangKasir','txtCabangInv'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=nama;});
  if(typeof renderInventaris==='function')renderInventaris();
  if(typeof updateLaporan==='function')updateLaporan();
  if(typeof updateLaporanPengeluaran==='function')updateLaporanPengeluaran();
}

/* Master: pelanggan */
async function simpanPelanggan(){
  const nama=document.getElementById('pelangganNama')?.value.trim();
  const wa=document.getElementById('pelangganWA')?.value.trim();
  const alamat=document.getElementById('pelangganAlamat')?.value.trim();
  const cp=document.getElementById('pelangganCP')?.value.trim()||'';
  if(!nama)return alert('Nama pelanggan wajib diisi.');
  const id='PLG-'+Date.now();
  const item={id,nama,contactPerson:cp,noWA:wa,alamat,hutang:0,cabang:selectedBranchOrDefault(),dibuat:new Date().toISOString()};
  await saveNode(AYA_PATHS.customers,id,item); await audit('MASTER_PELANGGAN_TAMBAH',{id,nama});
  ['pelangganNama','pelangganWA','pelangganAlamat','pelangganCP'].forEach(x=>{const e=document.getElementById(x);if(e)e.value='';});
}
function renderPelanggan(){
  const tb=document.getElementById('tabelPelanggan'); if(!tb)return;
  const rows=(dataPelangganFirebase||[]).map(p=>`<tr class="border-b"><td class="p-2 font-bold">${esc(p.nama)}</td><td class="p-2">${esc(p.contactPerson||'-')}</td><td class="p-2">${esc(p.noWA||'-')}</td><td class="p-2">${esc(p.alamat||'-')}</td><td class="p-2 text-right font-bold text-red-600">${rupiah(p.hutang)}</td><td class="p-2 text-center"><button class="px-2 py-1 bg-emerald-600 text-white rounded" onclick="bayarHutangPelanggan('${p.id}')">Bayar</button></td></tr>`).join('');
  tb.innerHTML=rows||'<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada pelanggan.</td></tr>';
}
async function bayarHutangPelanggan(id){
  const p=dataPelangganFirebase.find(x=>x.id===id);if(!p)return;
  const nominal=num(prompt(`Hutang ${p.nama}: ${rupiah(p.hutang)}\nMasukkan pembayaran:`,'0'));if(nominal<=0)return;
  const bayar=Math.min(nominal,num(p.hutang));
  await updateNode(AYA_PATHS.customers,id,{hutang:Math.max(0,num(p.hutang)-bayar)});
  await saveNode(AYA_PATHS.payments,'PAY-'+Date.now(),{id:'PAY-'+Date.now(),jenis:'HUTANG_PELANGGAN',referensiId:id,nama:p.nama,nominal:bayar,metode:'TUNAI',cabang:selectedBranchOrDefault(),tanggalISO:todayISO(),waktu:new Date().toISOString()});
}

/* Master: supplier */
async function simpanSupplier(){
  const nama=document.getElementById('supplierNama')?.value.trim(); const wa=document.getElementById('supplierWA')?.value.trim(); const alamat=document.getElementById('supplierAlamat')?.value.trim(); const cp=document.getElementById('supplierCP')?.value.trim()||'';
  if(!nama)return alert('Nama supplier wajib diisi.'); const id='SUP-'+Date.now();
  await saveNode(AYA_PATHS.suppliers,id,{id,nama,contactPerson:cp,noWA:wa,alamat,piutang:0,dibuat:new Date().toISOString()});
  ['supplierNama','supplierWA','supplierAlamat','supplierCP'].forEach(x=>{const e=document.getElementById(x);if(e)e.value='';});
}
function renderSupplier(){
  const tb=document.getElementById('tabelSupplier');if(!tb)return;
  tb.innerHTML=(dataSupplierFirebase||[]).map(s=>`<tr class="border-b"><td class="p-2 font-bold">${esc(s.nama)}</td><td class="p-2">${esc(s.contactPerson||'-')}</td><td class="p-2">${esc(s.noWA||'-')}</td><td class="p-2">${esc(s.alamat||'-')}</td><td class="p-2 text-right font-bold text-red-600">${rupiah(s.piutang)}</td><td class="p-2 text-center"><button class="px-2 py-1 bg-emerald-600 text-white rounded" onclick="bayarHutangSupplier('${s.id}')">Bayar</button></td></tr>`).join('')||'<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada supplier.</td></tr>';
}
async function bayarHutangSupplier(id){
  const s=dataSupplierFirebase.find(x=>x.id===id);if(!s)return;const nominal=num(prompt(`Tagihan ${s.nama}: ${rupiah(s.piutang)}\nMasukkan pembayaran:`,'0'));if(nominal<=0)return;const bayar=Math.min(nominal,num(s.piutang));
  await updateNode(AYA_PATHS.suppliers,id,{piutang:Math.max(0,num(s.piutang)-bayar)});const pid='PAY-'+Date.now();await saveNode(AYA_PATHS.payments,pid,{id:pid,jenis:'HUTANG_SUPPLIER',referensiId:id,nama:s.nama,nominal:bayar,metode:'TUNAI',cabang:selectedBranchOrDefault(),tanggalISO:todayISO(),waktu:new Date().toISOString()});
}

/* Karyawan + absensi */
async function simpanKaryawan(){
  const nama=prompt('Nama karyawan:'); if(!nama)return; const wa=prompt('No. WA:')||''; const alamat=prompt('Alamat:')||''; const gaji=num(prompt('Gaji per hari:','0')); const id='KRY-'+Date.now();
  await saveNode(AYA_PATHS.employees,id,{id,nama,noWA:wa,alamat,gajiPerHari:gaji,kasbon:0,aktif:true,dibuat:new Date().toISOString()});
}
function renderKaryawan(){
  const tb=document.getElementById('tabelKaryawan');if(!tb)return;tb.innerHTML=(dataKaryawanFirebase||[]).map(k=>`<tr class="border-b"><td class="p-2 font-bold">${esc(k.nama)}</td><td class="p-2">${esc(k.noWA||'-')}</td><td class="p-2">${esc(k.alamat||'-')}</td><td class="p-2 text-right">${rupiah(k.gajiPerHari)}</td><td class="p-2 text-right text-red-600">${rupiah(k.kasbon)}</td><td class="p-2"><button onclick="bayarKasbon('${k.id}')" class="px-2 py-1 bg-emerald-600 text-white rounded">Bayar</button></td></tr>`).join('')||'<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada karyawan.</td></tr>';
}
async function tambahKasbon(id){const k=dataKaryawanFirebase.find(x=>x.id===id);if(!k)return;const n=num(prompt(`Kasbon ${k.nama}:`,'0'));if(n<=0)return;await updateNode(AYA_PATHS.employees,id,{kasbon:num(k.kasbon)+n});const pid='PAY-'+Date.now();await saveNode(AYA_PATHS.payments,pid,{id:pid,jenis:'KASBON_TAMBAH',referensiId:id,nama:k.nama,nominal:n,metode:'KAS',cabang:selectedBranchOrDefault(),tanggalISO:todayISO(),waktu:new Date().toISOString()});}
async function bayarKasbon(id){const k=dataKaryawanFirebase.find(x=>x.id===id);if(!k)return;const n=num(prompt(`Kasbon ${k.nama}: ${rupiah(k.kasbon)}\nPotong/bayar:`,'0'));if(n<=0)return;const bayar=Math.min(n,num(k.kasbon));await updateNode(AYA_PATHS.employees,id,{kasbon:num(k.kasbon)-bayar});const pid='PAY-'+Date.now();await saveNode(AYA_PATHS.payments,pid,{id:pid,jenis:'KASBON_BAYAR',referensiId:id,nama:k.nama,nominal:bayar,metode:'KAS',cabang:selectedBranchOrDefault(),tanggalISO:todayISO(),waktu:new Date().toISOString()});}
async function simpanAbsensi(){
  const emp=document.getElementById('absensiKaryawan')?.value; const tanggal=document.getElementById('absensiTanggal')?.value||todayISO(); const masuk=document.getElementById('absensiMasuk')?.value||''; const pulang=document.getElementById('absensiPulang')?.value||''; const k=dataKaryawanFirebase.find(x=>x.id===emp);if(!k)return alert('Pilih karyawan.');const id=`${emp}-${tanggal}`;await saveNode(AYA_PATHS.attendance,id,{id,employeeId:emp,namaKaryawan:k.nama,tanggal,jamMasuk:masuk,jamPulang:pulang,gajiPerHari:num(document.getElementById('absensiGaji')?.value)||num(k.gajiPerHari),kasbonSaatItu:num(k.kasbon),cabang:selectedBranchOrDefault()});
}
function renderAttendance(){const tb=document.getElementById('attendanceTable');if(!tb)return;tb.innerHTML=(dataAbsensiFirebase||[]).filter(a=>cabangAktif==='SEMUA CABANG'||a.cabang===cabangAktif).sort((a,b)=>String(b.tanggal).localeCompare(a.tanggal)).map(a=>`<tr class="border-b"><td class="p-2">${esc(a.tanggal)}</td><td class="p-2 font-bold">${esc(a.namaKaryawan)}</td><td class="p-2">${esc(a.jamMasuk||'-')}</td><td class="p-2">${esc(a.jamPulang||'-')}</td><td class="p-2 text-right">${rupiah(a.gajiPerHari)}</td><td class="p-2 text-right text-red-600">${rupiah(a.kasbonSaatItu)}</td></tr>`).join('')||'<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada absensi.</td></tr>';}

/* Stok per cabang */
function stockFor(branch,productId){const s=dataStokFirebase.find(x=>x.cabang===branch&&String(x.productId)===String(productId));return num(s?.qty);}
async function adjustStock(productId,delta,reason='KOREKSI'){
  if(!ensureDb())return; const branch=selectedBranchOrDefault(); const id=`${branch}__${productId}`; const ref=db.ref(`${AYA_PATHS.stock}/${id}`);
  await ref.transaction(cur=>{const x=cur||{id,cabang:branch,productId,qty:0};x.qty=Math.max(0,num(x.qty)+num(delta));x.updatedAt=new Date().toISOString();x.lastReason=reason;return x;});
  await audit('STOCK_ADJUST',{productId,delta,reason});
};

/* Transfer stok: request -> approved -> received. */
async function buatTransferStok(){
  const tujuan=document.getElementById('transferTujuan')?.value;const pid=document.getElementById('transferProduk')?.value;const qty=num(document.getElementById('transferQty')?.value);if(!tujuan||!pid||qty<=0)return alert('Lengkapi tujuan, produk dan qty.');const dari=selectedBranchOrDefault();if(tujuan===dari)return alert('Cabang tujuan harus berbeda.');if(stockFor(dari,pid)<qty)return alert('Stok tidak mencukupi.');const p=databaseMenu.find(x=>String(x.id)===String(pid));const id='TRF-'+Date.now();await saveNode(AYA_PATHS.transfers,id,{id,dari,tujuan,productId:pid,nama:p?.nama||pid,qty,status:'MENUNGGU_APPROVAL',dibuat:new Date().toISOString(),dibuatOleh:currentUserEmail||'local'});alert('Transfer dibuat. Menunggu persetujuan Supervisor/Owner.');}
async function approveTransfer(id){if(!can('SUPERVISOR'))return alert('Hanya Supervisor/Owner yang dapat menyetujui.');const t=dataTransferFirebase.find(x=>x.id===id);if(!t)return;await updateNode(AYA_PATHS.transfers,id,{status:'DISETUJUI',approvedBy:currentUserEmail||'local',approvedAt:new Date().toISOString()});}
async function terimaTransfer(id){const t=dataTransferFirebase.find(x=>x.id===id);if(!t||t.status!=='DISETUJUI')return alert('Transfer belum disetujui.');if(stockFor(t.dari,t.productId)<num(t.qty))return alert('Stok cabang asal sudah tidak mencukupi.');await adjustStockForBranch(t.dari,t.productId,-num(t.qty),'TRANSFER_KELUAR');await adjustStockForBranch(t.tujuan,t.productId,num(t.qty),'TRANSFER_MASUK');await updateNode(AYA_PATHS.transfers,id,{status:'DITERIMA',diterimaAt:new Date().toISOString(),diterimaOleh:currentUserEmail||'local'});}
async function adjustStockForBranch(branch,productId,delta,reason){
  if(!ensureDb())return; const id=`${branch}__${productId}`; const ref=db.ref(`${AYA_PATHS.stock}/${id}`);
  await ref.transaction(cur=>{const x=cur||{id,cabang:branch,productId,qty:0};x.qty=Math.max(0,num(x.qty)+num(delta));x.updatedAt=new Date().toISOString();x.lastReason=reason;return x;});
}

async function tambahCabang(){if(!can('OWNER'))return alert('Hanya Owner yang dapat menambah cabang.');const nama=document.getElementById('branchNewName')?.value.trim();if(!nama)return alert('Nama cabang wajib.');const id='BR-'+Date.now();await saveNode(AYA_PATHS.branches,id,{id,nama,alamat:document.getElementById('branchNewAddress')?.value||'',noWA:document.getElementById('branchNewPhone')?.value||'',aktif:true,dibuat:new Date().toISOString()});alert('Cabang berhasil ditambahkan.');}

async function simpanMasterDatabase(){
  const nama=document.getElementById('masterNama')?.value.trim();const barcode=document.getElementById('masterBarcode')?.value.trim()||'BRG-'+Date.now();const kategori=document.getElementById('masterKategori')?.value||'Umum';const satuan=document.getElementById('masterSatuan')?.value||'pcs';const hargaBeliTotal=num(document.getElementById('masterHargaBeli')?.value);const isi=Math.max(1,num(document.getElementById('masterIsi')?.value)||1);const harga=num(document.getElementById('masterHargaJual')?.value);const komposisi=document.getElementById('masterKomposisi')?.value||'';
  if(!nama||harga<=0)return alert('Nama dan harga jual wajib diisi.');const komposisiItems=komposisi.split('\n').map(x=>x.trim()).filter(Boolean).map(line=>{const a=line.split('|').map(v=>v.trim());return {nama:a[0]||'',qty:num(a[1])||0,harga:num(a[2])||0,total:(num(a[1])||0)*(num(a[2])||0)};});const hppKomposisi=komposisiItems.reduce((s,x)=>s+x.total,0);const hpp=hargaBeliTotal>0?Math.round(hargaBeliTotal/isi):(hppKomposisi>0?hppKomposisi:0);const item={id:barcode,nama,kategori,satuan,isi,hargaBeliTotal,hargaBeli:hpp,harga,komposisi,komposisiItems,hppKomposisi,updatedAt:new Date().toISOString()};await saveNode(AYA_PATHS.legacyMenu,barcode,item);await saveNode(AYA_PATHS.products,barcode,item);mergeIntoMenu([item]);resetFormMaster();renderMasterData();renderOpsiMasterPembelian();renderMenu();alert('Master barang tersimpan.');}

async function simpanTransaksi(){
  if(!keranjang.length)return alert('Keranjang kosong!');const total=num((document.getElementById('textTotal')?.innerText||'0').replace(/[^0-9]/g,''));const metode=metodePembayaran;const bayar=num(document.getElementById('inputBayar')?.value)||0;const pelangganId=document.getElementById('pelangganKasirSelect')?.value||'';const pelanggan=dataPelangganFirebase.find(x=>x.id===pelangganId);
  if(metode==='TUNAI'&&bayar<total)return alert('Uang bayar kurang.');if(metode==='HUTANG'&&!pelanggan)return alert('Pilih pelanggan untuk transaksi HUTANG.');
  const id='NOTA-'+Date.now();const items=keranjang.map(x=>({id:x.id,nama:x.nama,harga:num(x.harga),qty:num(x.qty),hpp:num(x.hargaBeli||x.hppSatuan||0),kategori:x.kategori||''}));const nota={id,cabang:selectedBranchOrDefault(),waktu:new Date().toISOString(),tanggalISO:todayISO(),items,total,bayar,metodePembayaran:metode,pelangganId:pelanggan?.id||'',pelangganNama:pelanggan?.nama||'',kasir:currentUserEmail||currentUserName};await saveNode(AYA_PATHS.sales,id,nota);
  for(const i of items){await adjustStock(i.id,-i.qty,'PENJUALAN');}
  if(metode==='HUTANG'&&pelanggan)await updateNode(AYA_PATHS.customers,pelanggan.id,{hutang:num(pelanggan.hutang)+total});
  await audit('PENJUALAN',{id,total,metode});return true;
}

function cetakNota(){if(!keranjang.length)return alert('Keranjang kosong.');const total=keranjang.reduce((s,i)=>s+num(i.harga)*num(i.qty),0)+(num(document.getElementById('inputStyrofoam')?.value)*1000);const html=keranjang.map(i=>`<div class="nota-item-row"><b>${esc(i.nama)}</b><div class="nota-item-detail"><span>${i.qty} x ${rupiah(i.harga).replace('Rp ','')}</span><span>Rp${(num(i.harga)*num(i.qty)).toLocaleString('id-ID')}</span></div></div>`).join('');document.getElementById('notaItems').innerHTML=html;document.getElementById('notaTotal').innerHTML=`<div class="flex justify-between font-bold"><span>TOTAL</span><span>${rupiah(total)}</span></div>`;document.getElementById('notaWaktu').textContent=new Date().toLocaleString('id-ID');document.getElementById('notaMetode').textContent='Metode: '+metodePembayaran;const a=document.getElementById('areaNota');a.style.display='block';setTimeout(async()=>{window.print();a.style.display='none';if(await simpanTransaksi()){keranjang=[];updateKeranjang();}},300);}

const _oldRenderMenu=renderMenu;renderMenu=function(customList=null){_oldRenderMenu(customList);};
const _oldRenderMasterData=renderMasterData;renderMasterData=function(){_oldRenderMasterData();const tb=document.getElementById('tabelMasterData');if(tb){/* table is intentionally driven by Firebase menu merge */}refreshFormReferences();};
const _oldRenderKaryawan=renderKaryawan;renderKaryawan=function(){_oldRenderKaryawan();refreshFormReferences();};
const _oldRenderPelanggan=renderPelanggan;renderPelanggan=function(){const tb=document.getElementById('tabelPelanggan');if(tb)tb.innerHTML=(dataPelangganFirebase||[]).map(p=>`<tr class="border-b"><td class="p-2 font-bold">${esc(p.nama)}</td><td class="p-2">${esc(p.contactPerson||'-')}</td><td class="p-2">${esc(p.noWA||'-')}</td><td class="p-2">${esc(p.alamat||'-')}</td><td class="p-2 text-right font-bold text-red-600">${rupiah(p.hutang)}</td><td class="p-2"><button onclick="bayarHutangPelanggan('${p.id}')" class="px-2 py-1 bg-emerald-600 text-white rounded">Bayar</button></td></tr>`).join('')||'<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada pelanggan.</td></tr>';refreshFormReferences();};
const _oldRenderSupplier=renderSupplier;renderSupplier=function(){const tb=document.getElementById('tabelSupplier');if(tb)tb.innerHTML=(dataSupplierFirebase||[]).map(p=>`<tr class="border-b"><td class="p-2 font-bold">${esc(p.nama)}</td><td class="p-2">${esc(p.contactPerson||'-')}</td><td class="p-2">${esc(p.noWA||'-')}</td><td class="p-2">${esc(p.alamat||'-')}</td><td class="p-2 text-right font-bold text-red-600">${rupiah(p.piutang)}</td><td class="p-2"><button onclick="bayarHutangSupplier('${p.id}')" class="px-2 py-1 bg-emerald-600 text-white rounded">Bayar</button></td></tr>`).join('')||'<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada supplier.</td></tr>';refreshFormReferences();};

window.addEventListener('aya-ready',refreshFormReferences);

/* Tidak ada hard-delete dari UI: histori lama dipertahankan. */
async function hapusMasterData(id){if(!can('OWNER'))return alert('Hanya Owner.');const p=databaseMenu.find(x=>String(x.id)===String(id));if(!p)return;await updateNode(AYA_PATHS.products,id,{aktif:false,archivedAt:new Date().toISOString()});await updateNode(AYA_PATHS.legacyMenu,id,{aktif:false,archivedAt:new Date().toISOString()});await audit('MASTER_ARCHIVE',{id,nama:p.nama});alert('Barang diarsipkan. Histori transaksi tidak dihapus.');}
async function hapusPembelian(id){if(!can('OWNER'))return alert('Transaksi pembelian tidak boleh dihapus. Gunakan audit/void jika perlu.');await updateNode(AYA_PATHS.purchases,id,{status:'VOID',voidAt:new Date().toISOString(),voidBy:currentUserEmail||'local'});await audit('PEMBELIAN_VOID',{id});alert('Pembelian ditandai VOID, histori tetap tersimpan.');}
async function hapusPengeluaranFirebase(id){if(!can('OWNER'))return alert('Hanya Owner.');await updateNode(AYA_PATHS.expenses,id,{status:'VOID',voidAt:new Date().toISOString(),voidBy:currentUserEmail||'local'});await audit('PENGELUARAN_VOID',{id});alert('Pengeluaran ditandai VOID, histori tetap tersimpan.');}
async function hapusBarangTitipan(id){if(!can('OWNER'))return alert('Hanya Owner.');await updateNode(AYA_PATHS.consign,id,{status:'VOID',voidAt:new Date().toISOString(),voidBy:currentUserEmail||'local'});await audit('TITIPAN_VOID',{id});alert('Barang titipan ditandai VOID, histori tetap tersimpan.');}
function renderKaryawanMaster(){const tb=document.getElementById('tabelKaryawanMaster');if(!tb)return;tb.innerHTML=(dataKaryawanFirebase||[]).map(k=>`<tr class="border-b"><td class="p-2 font-bold">${esc(k.nama)}</td><td class="p-2">${esc(k.noWA||'-')}</td><td class="p-2">${esc(k.alamat||'-')}</td><td class="p-2 text-right">${rupiah(k.gajiPerHari)}</td><td class="p-2 text-right text-red-600">${rupiah(k.kasbon)}</td><td class="p-2 font-mono">${esc(k.id)}</td></tr>`).join('')||'<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada karyawan.</td></tr>';}
window.addEventListener('aya-ready',renderKaryawanMaster);
const _baseRenderKaryawanMasterSync=renderKaryawan;renderKaryawan=function(){_baseRenderKaryawanMasterSync();renderKaryawanMaster();refreshFormReferences();};

/* User / Settings / Printable documents */
function renderUserManagement(){const tb=document.getElementById('userTable');if(!tb)return;tb.innerHTML=(dataUsersFirebase||[]).map(u=>`<tr class="border-b"><td class="p-2 font-bold">${esc(u.nama||'-')}</td><td class="p-2">${esc(u.email||'-')}</td><td class="p-2 font-bold">${esc(u.role||'KASIR')}</td><td class="p-2">${esc(u.cabang||'Semua')}</td></tr>`).join('')||'<tr><td colspan="4" class="p-4 text-center text-gray-400">Belum ada user.</td></tr>';}
async function saveUserProfile(){if(!can('OWNER'))return alert('Hanya Owner.');const email=document.getElementById('userEmail')?.value.trim();const nama=document.getElementById('userName')?.value.trim();const role=document.getElementById('userRole')?.value||'KASIR';const cabang=document.getElementById('userBranch')?.value||'SEMUA CABANG';if(!email||!nama)return alert('Nama dan email wajib.');const id=document.getElementById('userUid')?.value||email.replace(/[.#$\[\]]/g,'_');await saveNode(AYA_PATHS.users,id,{id,nama,email,role,cabang,aktif:true,dibuat:new Date().toISOString()});alert('Profil user tersimpan. Password tidak disimpan di database.');}
async function createFirebaseUserAndProfile(){if(!can('OWNER'))return alert('Hanya Owner.');if(!auth)return alert('Firebase Authentication belum tersedia.');const email=document.getElementById('userEmail')?.value.trim();const pass=document.getElementById('userPassword')?.value;const nama=document.getElementById('userName')?.value.trim();if(!email||!pass||pass.length<6||!nama)return alert('Isi nama, email dan password minimal 6 karakter.');try{const secondary=firebase.initializeApp(AYA_FIREBASE_CONFIG,'ayaUserCreator-'+Date.now());const cred=await secondary.auth().createUserWithEmailAndPassword(email,pass);const role=document.getElementById('userRole')?.value||'KASIR';const cabang=document.getElementById('userBranch')?.value||'SEMUA CABANG';await saveNode(AYA_PATHS.users,cred.user.uid,{id:cred.user.uid,nama,email,role,cabang,aktif:true,dibuat:new Date().toISOString()});await secondary.delete();alert('User Authentication + profil berhasil dibuat.');}catch(e){alert('Gagal membuat user: '+(e.message||e));}}
async function saveNotaSettings(){const data={header:document.getElementById('notaHeaderSetting')?.value||'',phone:document.getElementById('notaPhoneSetting')?.value||'',address:document.getElementById('notaAddressSetting')?.value||'',footer:document.getElementById('notaFooterSetting')?.value||''};await saveNode(AYA_PATHS.settings,'nota',data);applyNotaSettings(data);}
async function loadSettingsForm(){if(!db)return;const s=await db.ref(`${AYA_PATHS.settings}/nota`).once('value');const d=s.val()||{};const ids={header:'notaHeaderSetting',phone:'notaPhoneSetting',address:'notaAddressSetting',footer:'notaFooterSetting'};Object.keys(ids).forEach(k=>{const e=document.getElementById(ids[k]);if(e)e.value=d[k]||'';});applyNotaSettings(d);}
function applyNotaSettings(d){const map={header:'notaHeaderStore',phone:'notaPhone',address:'notaAddress',footer:'notaFooter'};Object.keys(map).forEach(k=>{const e=document.getElementById(map[k]);if(e&&d[k])e.textContent=d[k];});}
function printEmploymentAgreement(){const nama=document.getElementById('contractName')?.value||'________________';const role=document.getElementById('contractRole')?.value||'Karyawan';const cab=document.getElementById('contractBranch')?.value||selectedBranchOrDefault();const w=window.open('','_blank');if(!w)return;w.document.write(`<html><head><title>Perjanjian Kerja</title><style>body{font-family:Arial;padding:30px;line-height:1.6}h1{text-align:center}</style></head><body><h1>PERJANJIAN KERJA KARYAWAN AYA GROUP</h1><p>Perusahaan AYA GROUP dan Saudara/i <b>${esc(nama)}</b> sebagai <b>${esc(role)}</b> pada cabang <b>${esc(cab)}</b> sepakat menjalankan pekerjaan dengan jujur, disiplin, menjaga aset, kerahasiaan usaha, kebersihan, keselamatan kerja, dan SOP yang berlaku.</p><p>Hak dan kewajiban, jam kerja, gaji, kasbon, absensi, sanksi, dan pengakhiran hubungan kerja mengikuti kesepakatan tertulis dan ketentuan yang berlaku.</p><br><br><table style="width:100%"><tr><td>Perusahaan<br><br><br>(________________)</td><td>Karyawan<br><br><br>(${esc(nama)})</td></tr></table><script>window.print()<\/script></body></html>`);w.document.close();}
function printSOP(){const w=window.open('','_blank');if(!w)return;w.document.write(`<html><head><title>SOP AYA GROUP</title><style>body{font-family:Arial;padding:30px;line-height:1.5}h1,h2{text-align:center}li{margin:7px 0}</style></head><body><h1>STANDAR OPERASIONAL PROSEDUR AYA GROUP</h1><h2>Warung, Rumah Makan, Angkringan, Seblak & Retail/Mart</h2><ol><li>Buka toko: cek kebersihan, kas awal, stok, perangkat POS dan printer.</li><li>Penerimaan barang: cocokkan nota supplier, jumlah, satuan, harga, dan kondisi.</li><li>Penjualan: semua transaksi wajib masuk POS; pilih metode pembayaran dengan benar.</li><li>Hutang: wajib mencatat pelanggan dan nominal; histori tidak dihapus.</li><li>Operasional: setiap pengeluaran wajib memiliki nama barang, satuan, harga, qty, total dan keterangan.</li><li>Stok: koreksi harus disertai alasan; transfer antar cabang harus melalui persetujuan dan penerimaan.</li><li>Penutupan: hitung uang riil, cocokkan Tunai/QRIS/Hutang/Personal, cetak laporan dan simpan bukti.</li><li>Kebersihan dan keamanan: makanan tertutup, alat bersih, area kasir aman, dan kas tidak ditinggalkan terbuka.</li><li>Role: Kasir fokus transaksi; Supervisor memeriksa laporan; Owner memiliki akses penuh.</li></ol><script>window.print()<\/script></body></html>`);w.document.close();}

window.addEventListener('aya-ready',()=>{renderUserManagement();loadSettingsForm();});
function renderOpsiMasterPembelian(){const sel=document.getElementById('pembelianNamaBarang');if(!sel)return;const current=sel.value;sel.innerHTML='<option value="">-- Pilih Barang dari Master --</option>'+(databaseMenu||[]).filter(x=>x.aktif!==false).map(p=>`<option value="${esc(p.nama)}" data-id="${esc(p.id)}">${esc(p.nama)} — ${rupiah(p.harga)}</option>`).join('');if(current)sel.value=current;sel.onchange=()=>{const p=databaseMenu.find(x=>String(x.nama).toLowerCase()===String(sel.value).toLowerCase());if(!p)return;const b=document.getElementById('pembelianBarcode');const i=document.getElementById('pembelianIsiBeli');const j=document.getElementById('pembelianHargaJual');const h=document.getElementById('pembelianHargaBeli');if(b)b.value=p.id||'';if(i)i.value=p.isi||1;if(j)j.value=p.harga||0;if(h)h.value=p.hargaBeliTotal||((p.hargaBeli||0)*(p.isi||1));if(typeof hitungEstimasiProfitPembelian==='function')hitungEstimasiProfitPembelian();};}
function syncReportBranchSelectors(){const names=['SEMUA CABANG',...(dataCabangFirebase||[]).filter(x=>x.aktif!==false).map(x=>x.nama),'DAPUR AYA SEMBAKO','AYA SEBLAK DAN ANGKRINGAN'];['filterCabangLaporan','filterCabangPengeluaran'].forEach(id=>{const e=document.getElementById(id);if(!e)return;const cur=e.value;e.innerHTML=[...new Set(names)].map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');if([...e.options].some(o=>o.value===cur))e.value=cur;else e.value=cabangAktif;});}
function cetakLaporan(id,title){const src=document.getElementById(id);if(!src)return;const w=window.open('','_blank');if(!w)return;w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ccc;padding:5px}button,input,select{display:none!important}h1{font-size:18px}</style></head><body><h1>${esc(title)}</h1>${src.innerHTML}<script>window.print()<\/script></body></html>`);w.document.close();}
function updateDetailedProfitReport(){const start=document.getElementById('filterTanggalMulai')?.value||'0000-00-00';const end=document.getElementById('filterTanggalSelesai')?.value||'9999-99-99';const branch=cabangAktif;const sales=(dataTransaksiFirebase||[]).filter(x=>parseTanggalISO(x)>=start&&parseTanggalISO(x)<=end&&(branch==='SEMUA CABANG'||x.cabang===branch));const buys=(dataPembelianFirebase||[]).filter(x=>parseTanggalISO(x)>=start&&parseTanggalISO(x)<=end&&(branch==='SEMUA CABANG'||x.cabang===branch)&&x.status!=='VOID');const ops=(dataOperasionalFirebase||[]).filter(x=>parseTanggalISO(x)>=start&&parseTanggalISO(x)<=end&&(branch==='SEMUA CABANG'||x.cabang===branch));const omzet=sales.reduce((s,x)=>s+num(x.total),0);const pembelian=buys.reduce((s,x)=>s+num(x.hargaBeliTotal),0);const operasional=ops.reduce((s,x)=>s+num(x.total||x.nominal),0);const labaKotor=sales.reduce((s,x)=>s+(x.items||[]).reduce((a,i)=>a+(num(i.harga)-num(i.hpp))*num(i.qty),0),0);const bersih=labaKotor-operasional;[['reportTotalPembelian',pembelian],['reportLabaKotor',labaKotor],['reportOperasional',operasional]].forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=rupiah(v);});const tb=document.getElementById('reportProfitTable');if(tb)tb.innerHTML=`<tr><td class="p-2">${start} s/d ${end}</td><td class="p-2">${esc(branch)}</td><td class="p-2 text-right">${rupiah(omzet)}</td><td class="p-2 text-right">${rupiah(pembelian)}</td><td class="p-2 text-right">${rupiah(operasional)}</td><td class="p-2 text-right font-black">${rupiah(bersih)}</td></tr>`;}
window.addEventListener('aya-ready',syncReportBranchSelectors);window.addEventListener('aya-ready',updateDetailedProfitReport);
const _baseTerapkanFilterLaporan=terapkanFilterLaporan;terapkanFilterLaporan=function(){_baseTerapkanFilterLaporan();updateDetailedProfitReport();};
const _baseGantiCabang=gantiCabang;gantiCabang=function(n){_baseGantiCabang(n);syncReportBranchSelectors();updateDetailedProfitReport();};
const _baseSimpanPengeluaran=simpanPengeluaran;simpanPengeluaran=async function(){const tanggal=document.getElementById('pengeluaranTanggal')?.value||todayISO();const nama=document.getElementById('pengeluaranNamaBarang')?.value.trim()||'';const harga=num(document.getElementById('pengeluaranHarga')?.value);const qty=num(document.getElementById('pengeluaranQty')?.value)||1;const total=num(document.getElementById('pengeluaranNominal')?.value)||harga*qty;const satuan=document.getElementById('pengeluaranSatuan')?.value||'pcs';const kategori=document.getElementById('pengeluaranKategori')?.value||'Operasional';const metode=document.getElementById('pengeluaranMetode')?.value||'TUNAI';const ket=document.getElementById('pengeluaranKeterangan')?.value||'';await _baseSimpanPengeluaran();if(nama&&total>0){const id='OP-'+Date.now();await saveNode(AYA_PATHS.operations,id,{id,cabang:selectedBranchOrDefault(),tanggalISO:tanggal,namaBarang:nama,satuan,harga,qty,total,kategori,metode,keterangan:ket,waktu:new Date().toISOString()});updateDetailedProfitReport();}};
async function tambahPelangganDariKasir(){const nama=prompt('Nama pelanggan:');if(!nama)return;const wa=prompt('Nomor WA:')||'';const alamat=prompt('Alamat:')||'';const cp=prompt('Contact person:')||'';const id='PLG-'+Date.now();await saveNode(AYA_PATHS.customers,id,{id,nama,noWA:wa,alamat,contactPerson:cp,hutang:0,dibuat:new Date().toISOString()});alert('Pelanggan ditambahkan dan tersinkron.');}
function renderAttendance(){const tb=document.getElementById('attendanceTable');if(!tb)return;tb.innerHTML=(dataAbsensiFirebase||[]).filter(a=>cabangAktif==='SEMUA CABANG'||a.cabang===cabangAktif).sort((a,b)=>String(b.tanggal).localeCompare(a.tanggal)).map(a=>{const g=num(a.gajiPerHari),k=num(a.kasbonSaatItu),net=Math.max(0,g-k);return `<tr class="border-b"><td class="p-2">${esc(a.tanggal)}</td><td class="p-2 font-bold">${esc(a.namaKaryawan)}</td><td class="p-2">${esc(a.jamMasuk||'-')}</td><td class="p-2">${esc(a.jamPulang||'-')}</td><td class="p-2 text-right">${rupiah(g)}</td><td class="p-2 text-right text-red-600">${rupiah(k)}</td><td class="p-2 text-right font-black text-emerald-700">${rupiah(net)}</td></tr>`;}).join('')||'<tr><td colspan="7" class="p-4 text-center text-gray-400">Belum ada absensi.</td></tr>';}
function hitungGajiPeriode(){const a=document.getElementById('gajiMulai')?.value||'0000-00-00',b=document.getElementById('gajiSelesai')?.value||'9999-99-99';const total=(dataAbsensiFirebase||[]).filter(x=>x.tanggal>=a&&x.tanggal<=b&&(cabangAktif==='SEMUA CABANG'||x.cabang===cabangAktif)).reduce((s,x)=>s+Math.max(0,num(x.gajiPerHari)-num(x.kasbonSaatItu)),0);const e=document.getElementById('gajiPeriodeTotal');if(e)e.textContent=rupiah(total);}
