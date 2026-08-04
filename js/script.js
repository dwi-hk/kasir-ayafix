// js/script.js

function switchTab(tabName) {
    const tabs = ['master', 'transaksi', 'backoffice', 'laporan', 'user', 'setting'];
    tabs.forEach(t => {
        const sec = document.getElementById('tab-' + t);
        const btn = document.getElementById('btn-tab-' + t);
        if(sec) sec.classList.add('hidden');
        if(btn) btn.className = "w-full text-left px-4 py-3 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-orange-600 transition";
    });

    const activeSec = document.getElementById('tab-' + tabName);
    const activeBtn = document.getElementById('btn-tab-' + tabName);
    if(activeSec) activeSec.classList.remove('hidden');
    if(activeBtn) activeBtn.className = "w-full text-left px-4 py-3 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-orange-600 transition bg-orange-800 shadow";
}

// LOGIKA KALKULATOR BACKOFFICE
let calcVal = '';
function calcInput(char) {
    calcVal += char;
    document.getElementById('calcDisplay').value = calcVal;
}
function calcClear() {
    calcVal = '';
    document.getElementById('calcDisplay').value = '0';
}
function calcResult() {
    try {
        calcVal = eval(calcVal).toString();
        document.getElementById('calcDisplay').value = calcVal;
    } catch(e) {
        document.getElementById('calcDisplay').value = 'Error';
        calcVal = '';
    }
}

// CETAK SURAT PERJANJIAN KERJA KARYAWAN
function cetakSuratPerjanjianKerja() {
    let nama = document.getElementById('spkNama').value;
    let jabatan = document.getElementById('spkJabatan').value;
    let gaji = document.getElementById('spkGaji').value;

    if(!nama || !jabatan || !gaji) return alert('Mohon lengkapi data surat perjanjian kerja!');

    let win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head><title>Surat Perjanjian Kerja - ${nama}</title></head>
        <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
            <h2 style="text-align: center;">SURAT PERJANJIAN KERJA KARYAWAN</h2>
            <hr>
            <p>Yang bertanda tangan di bawah ini:</p>
            <p><strong>Pihak Pertama:</strong> AYA GROUP (Pemilik / Owner)</p>
            <p><strong>Pihak Kedua:</strong> ${nama} (Jabatan: ${jabatan})</p>
            <p>Dengan ini sepakat bahwa Pihak Kedua bekerja pada unit bisnis AYA GROUP dengan Upah/Gaji Harian sebesar <strong>Rp ${parseInt(gaji).toLocaleString('id-ID')} / Hari</strong>.</p>
            <br><br>
            <table width="100%">
                <tr>
                    <td text-align="center">Pihak Pertama,<br><br><br><br>( Owner AYA GROUP )</td>
                    <td text-align="center">Pihak Kedua,<br><br><br><br>( ${nama} )</td>
                </tr>
            </table>
        </body>
        </html>
    `);
    win.print();
}

// SIMPAN SETTING NOTA & PRINTER
function simpanSettingNota() {
    let header = document.getElementById('settingHeader').value;
    let alamat = document.getElementById('settingAlamat').value;
    let hp = document.getElementById('settingHP').value;
    let footer = document.getElementById('settingFooter').value;

    document.getElementById('notaHeaderTitle').innerText = header;
    document.getElementById('notaHeaderAlamat').innerText = alamat;
    document.getElementById('notaHeaderHP').innerText = hp;
    document.getElementById('notaFooter').innerText = footer;

    alert('Pengaturan Nota Thermal 58mm berhasil disimpan!');
}