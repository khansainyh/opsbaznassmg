const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_MAP = [
  { oldAgenda: 98944, newAgenda: 945 },
  { oldAgenda: 98945, newAgenda: 946 },
  { oldAgenda: 98946, newAgenda: 947 },
];

async function main() {
  const isExecute = process.argv.includes('--execute');

  console.log('====================================================');
  console.log(` AUDIT & PERBAIKAN NO. AGENDA PROPOSAL (98xxx -> 94x)`);
  console.log(` Mode: ${isExecute ? '⚡ EXECUTE (APPLYING CHANGES)' : '🔍 DRY RUN (PREVIEW ONLY)'}`);
  console.log('====================================================\n');

  try {
    // 1. Cek proposal yang ada saat ini dengan agenda 98944, 98945, 98946
    const oldAgendas = TARGET_MAP.map(t => t.oldAgenda);
    const newAgendas = TARGET_MAP.map(t => t.newAgenda);

    const targetProposals = await prisma.proposal.findMany({
      where: { agenda_no: { in: oldAgendas } },
      select: {
        id: true,
        agenda_no: true,
        nama_pemohon: true,
        nama_instansi: true,
        tanggal_masuk: true,
        status: true,
        memo_source: true,
        keterangan: true,
        created_at: true,
      },
    });

    console.log(`[1] Ditemukan ${targetProposals.length} proposal dengan No. Agenda 98xxx:`);
    if (targetProposals.length === 0) {
      console.log('    (Tidak ditemukan data proposal dengan nomor agenda 98944, 98945, atau 98946)');
    } else {
      targetProposals.forEach(p => {
        const mapping = TARGET_MAP.find(m => m.oldAgenda === p.agenda_no);
        console.log(`    - ID: ${p.id}`);
        console.log(`      No. Agenda Lama : ${p.agenda_no} -> Target No. Baru: ${mapping ? mapping.newAgenda : '?'}`);
        console.log(`      Nama Pemohon    : ${p.nama_pemohon || '-'}`);
        console.log(`      Nama Instansi   : ${p.nama_instansi || '-'}`);
        console.log(`      Status          : ${p.status}`);
        console.log(`      Memo Source     : ${p.memo_source || '-'}`);
        console.log(`      Keterangan      : ${p.keterangan || '-'}`);
        console.log('    ------------------------------------------------');
      });
    }

    // 2. Cek apakah nomor target 945, 946, 947 sudah terisi oleh proposal lain
    console.log(`\n[2] Memeriksa ketersediaan No. Agenda baru (945, 946, 947):`);
    const existingConflicts = await prisma.proposal.findMany({
      where: { agenda_no: { in: newAgendas } },
      select: {
        id: true,
        agenda_no: true,
        nama_pemohon: true,
        nama_instansi: true,
        status: true,
      },
    });

    if (existingConflicts.length === 0) {
      console.log('    ✅ Nomor agenda 945, 946, 947 saat ini AMAN / KOSONG (tidak ada konflik).');
    } else {
      console.log(`    ⚠️ PERHATIAN: Ditemukan ${existingConflicts.length} proposal yang saat ini sudah memakai nomor target:`);
      existingConflicts.forEach(c => {
        console.log(`    - No. Agenda: ${c.agenda_no} | Pemohon: ${c.nama_pemohon || c.nama_instansi} | Status: ${c.status} | ID: ${c.id}`);
      });
    }

    // 3. Eksekusi jika flag --execute diberikan
    if (isExecute) {
      console.log('\n[3] ⚡ Mengeksekusi perubahan ke database...');
      for (const map of TARGET_MAP) {
        const proposal = targetProposals.find(p => p.agenda_no === map.oldAgenda);
        if (!proposal) {
          console.log(`    - Lewati ${map.oldAgenda}: data tidak ditemukan.`);
          continue;
        }

        // Bersihkan memo_source jika sebelumnya 'DIRECT_PENYALURAN'
        let updatedMemoSource = proposal.memo_source;
        if (updatedMemoSource === 'DIRECT_PENYALURAN') {
          updatedMemoSource = null;
        }

        // Bersihkan keterangan dari tag [DIRECT PENYALURAN] jika ada
        let updatedKeterangan = proposal.keterangan;
        if (updatedKeterangan && updatedKeterangan.includes('[DIRECT PENYALURAN]')) {
          updatedKeterangan = updatedKeterangan.replace(/\[DIRECT PENYALURAN\]\s*/g, '').trim() || null;
        }

        await prisma.proposal.update({
          where: { id: proposal.id },
          data: {
            agenda_no: map.newAgenda,
            memo_source: updatedMemoSource,
            keterangan: updatedKeterangan,
          },
        });

        console.log(`    ✅ Proposal "${proposal.nama_pemohon || proposal.nama_instansi}" (ID: ${proposal.id}):`);
        console.log(`       No. Agenda berhasil diubah dari ${map.oldAgenda} -> ${map.newAgenda}`);
      }
      console.log('\n🎉 SEMUA PERUBAHAN BERHASIL DISIMPAN KE DATABASE!');
    } else {
      console.log('\n[3] ℹ️ Ini adalah DRY RUN. Tidak ada data yang diubah.');
      console.log('    Untuk mengeksekusi perubahan secara permanen, jalankan:');
      console.log('    node scripts/fix-agenda-98k.js --execute\n');
    }
  } catch (err) {
    console.error('❌ Error saat audit / migrasi:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
