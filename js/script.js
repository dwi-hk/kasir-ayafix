let cabangAktif = "AYA TOKO Sembako";
let keranjang = [];
let transaksiDitahan = [];
let metodePembayaran = "TUNAI";
let userRole = "owner"; 

// Data Realtime dari LocalStorage / Firebase
let riwayatTransaksi = JSON.parse(localStorage.getItem('aya_transaksi_v3')) || [];
let dataInventaris = JSON.parse(localStorage.getItem('aya_inventaris_v1')) || [];
let dataAbsensi = JSON.parse(localStorage.getItem('aya_absensi_v1')) || [];

function gantiCabangManual(namaCabang) {
    cabangAktif = namaCabang;
    alert(`Cabang berhasil dialihkan ke: [ ${cabangAktif} ]`);
    cariMenuKasir();
    updateLaporan();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    
    // Highlight Active Nav
    document.querySelectorAll('#menuSidebarNav button').forEach(btn => {
        btn.classList.remove('bg-orange-800');
    });
    const activeBtn = document.getElementById('tab-btn-' + tabId);
    if(activeBtn) activeBtn.classList.add('bg-orange-800');

    if(tabId === 'laporan') updateLaporan();
}

// LOGIKA KASIR & MULTI PAYMENT
function setMetodePembayaran(metode) {
    metodePembayaran = metode;
    ['TUNAI', 'QRIS', 'HUTANG', 'PERSONAL'].forEach(m => {
        const btn = document.getElementById('btn-bayar-' + m);
        if(btn) {
            btn.className = (m === metode) ? "p-2 bg-orange-600 text-white rounded font-bold" : "p-2 bg-gray-200 text-gray-700 rounded font-bold";
        }
    });
    document.getElementById('wrapperUangBayar').style.display = (metode === 'TUNAI') ? 'block' : 'none';
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
    if (keranjang.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4 text-xs">Belum ada pesanan</p>';
        document.getElementById('textTotal').innerText = 'Rp 0';
        return;
    }

    let total = 0;
    let html = '';
    keranjang.forEach(i => {
        let sub = i.harga * i.qty;
        total += sub;
        html += `
            <div class="flex justify-between items-center py-1.5 text-xs border-b">
                <div>
                    <p class="font-bold uppercase">${i.nama}</p>
                    <p class="text-[10px] text-gray-500">Rp ${i.harga.toLocaleString('id-ID')} x ${i.qty}</p>
                </div>
                <span class="font-bold">Rp ${sub.toLocaleString('id-ID')}</span>
            </div>
        `;
    });
    container.innerHTML = html;
    document.getElementById('textTotal').innerText = 'Rp ' + total.toLocaleString('id-ID');
    hitungKembalian();
}

function tahanTransaksi() {
    if(keranjang.length === 0) return alert('Keranjang kosong!');
    transaksiDitahan.push({ id: Date.now(), items: [...keranjang], cabang: cabangAktif });
    keranjang = [];
    updateKeranjang();
    alert('Transaksi berhasil ditahan!');
}

function simpanTransaksi() {
    if(keranjang.length === 0) return alert('Keranjang kosong!');
    let total = keranjang.reduce((sum, i) => sum + (i.harga * i.qty), 0);
    
    let nota = {
        id: 'NOTA-' + Date.now(),
        cabang: cabangAktif,
        waktu: new Date().toLocaleString('id-ID'),
        tanggalISO: new Date().toISOString().split('T')[0],
        items: [...keranjang],
        total: total,
        metodePembayaran: metodePembayaran
    };

    if (db) {
        db.ref('transaksi/' + nota.id).set(nota);
    } else {
        riwayatTransaksi.unshift(nota);
        localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
    }

    keranjang = [];
    updateKeranjang();
    alert('Transaksi Berhasil Disimpan!');
    return true;
}

function cetakNota() {
    if (keranjang.length === 0) return alert('Keranjang kosong!');
    let total = keranjang.reduce((sum, i) => sum + (i.harga * i.qty), 0);

    document.getElementById('notaHeaderTxt').innerText = document.getElementById('settingHeader').value;
    document.getElementById('notaAlamatTxt').innerText = document.getElementById('settingAlamat').value;
    document.getElementById('notaHpTxt').innerText = "Telp/WA: " + document.getElementById('settingHp').value;
    document.getElementById('notaFooterTxt').innerText = document.getElementById('settingFooter').value;

    document.getElementById('notaWaktu').innerText = "Waktu: " + new Date().toLocaleString('id-ID');
    document.getElementById('notaMetode').innerText = "METODE: " + metodePembayaran + " (" + cabangAktif + ")";

    let html = '';
    keranjang.forEach(i => {
        html += `<div style="display:flex; justify-between; font-size:8px;"><span>${i.nama} x${i.qty}</span><span>Rp ${(i.harga*i.qty).toLocaleString('id-ID')}</span></div>`;
    });
    document.getElementById('notaItems').innerHTML = html;
    document.getElementById('notaTotal').innerHTML = `<b>TOTAL: Rp ${total.toLocaleString('id-ID')}</b>`;

    const area = document.getElementById('areaNota');
    area.style.display = 'block';
    setTimeout(() => {
        window.print();
        area.style.display = 'none';
        simpanTransaksi();
    }, 300);
}

// KALKULATOR
let calcState = '';
function calcInput(v) { calcState += v; document.getElementById('calcDisplay').value = calcState; }
function calcClear() { calcState = ''; document.getElementById('calcDisplay').value = ''; }
function calcEqual() { 
    try { calcState = eval(calcState).toString(); document.getElementById('calcDisplay').value = calcState; } 
    catch { document.getElementById('calcDisplay').value = 'Error'; calcState = ''; }
}

// SPK & SOP PRINT
function cetakSPK() {
    let nama = document.getElementById('spkNama').value || 'Karyawan Baru';
    let jabatan = document.getElementById('spkJabatan').value || 'Staf Operasional';
    
    let win = window.open('', '', 'width=800,height=600');
    win.document.write(`
        <h2 style="text-align:center;">SURAT PERJANJIAN KERJA (SPK)</h2>
        <p>Yang bertanda tangan di bawah ini:</p>
        <p><b>Pihak 1:</b> Owner ${cabangAktif}</p>
        <p><b>Pihak 2:</b> ${nama} (${jabatan})</p>
        <p>Menyatakan sepakat untuk bekerja secara profesional mengikuti Standar Operasional Prosedur (SOP) yang berlaku di AYA GROUP.</p>
        <br><br>
        <table width="100%"><tr><td text-align="center">Pihak 1<br><br><br>Owner</td><td text-align="center">Pihak 2<br><br><br>${nama}</td></tr></table>
    `);
    win.print();
}