import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../utils/prisma';
import { Prisma, StatusPengajuan } from '@prisma/client';

export const migrateProposalExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'File Excel wajib diunggah.' });
      return;
    }

    // Read workbook from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
      res.status(400).json({ error: 'File Excel tidak memiliki sheet valid.' });
      return;
    }

    // Get Header Sheet (Sheet 1) and Detail Sheet (Sheet 2)
    const headerSheet = workbook.Sheets[sheetNames[0]];
    const detailSheet = sheetNames.length > 1 ? workbook.Sheets[sheetNames[1]] : null;

    const headersRaw: any[] = XLSX.utils.sheet_to_json(headerSheet);
    const detailsRaw: any[] = detailSheet ? XLSX.utils.sheet_to_json(detailSheet) : [];

    if (headersRaw.length === 0) {
      res.status(400).json({ error: 'Sheet 1 (Header Proposal) kosong atau format tidak sesuai.' });
      return;
    }

    // Fetch default user for assignment
    const defaultUser = await prisma.user.findFirst();

    if (!defaultUser) {
      res.status(400).json({ error: 'User admin tidak ditemukan di database.' });
      return;
    }

    // Map details by ID_Proposal_Terkait
    const detailsByProposalId = new Map<string, any[]>();
    for (const d of detailsRaw) {
      const propId = String(d.ID_Proposal_Terkait || d['ID Proposal Terkait'] || d.ID_Proposal || d['ID Proposal'] || '').trim();
      if (propId) {
        if (!detailsByProposalId.has(propId)) {
          detailsByProposalId.set(propId, []);
        }
        detailsByProposalId.get(propId)!.push(d);
      }
    }

    let importedCount = 0;
    let totalNominalMigrated = 0;
    let totalMustahikMigrated = 0;
    const errorLogs: string[] = [];

    for (let i = 0; i < headersRaw.length; i++) {
      const row = headersRaw[i];
      const rowNum = i + 2;

      try {
        const idProposal = String(row.ID_Proposal || row['ID Proposal'] || row.No_Proposal || row['No Proposal'] || `PROP-MIG-${Date.now()}-${i + 1}`).trim();
        const namaLembaga = String(row.Nama_Lembaga || row['Nama Lembaga'] || row.Instansi || row.Pemohon || 'Lembaga Tanpa Nama').trim();
        const pic = String(row.PIC_Pemohon || row['PIC Pemohon'] || row.PIC || '').trim();
        const nominalVal = Number(row.Nominal_Global || row['Nominal Global'] || row.Nominal || row['Total Nominal'] || 0);
        const keterangan = String(row.Keterangan || row.Peruntukan || `Migrasi Proposal: ${namaLembaga}`).trim();
        const sumberDana = String(row.Sumber_Dana || row['Sumber Dana'] || 'Zakat').trim();
        const rkatCode = String(row.Kode_Kegiatan || row['Kode Kegiatan'] || row.Jenis_Permohonan || row['Jenis Permohonan'] || row.Program_RKAT || row['Program RKAT'] || row.RKAT || '').trim();

        // Dates
        const tglPropRaw = row.Tanggal_Proposal || row['Tanggal Proposal'] || row.Tanggal || new Date();
        const tglCairRaw = row.Tanggal_Pencairan || row['Tanggal Pencairan'] || row.Tanggal_Realisasi || tglPropRaw;

        const tanggalProposal = new Date(tglPropRaw);
        const tanggalPencairan = new Date(tglCairRaw);

        const validTglProp = isNaN(tanggalProposal.getTime()) ? new Date() : tanggalProposal;
        const validTglCair = isNaN(tanggalPencairan.getTime()) ? validTglProp : tanggalPencairan;

        // Check if matching RKAT Operasional exists
        let rkatId: string | null = null;
        if (rkatCode) {
          const rkatObj = await prisma.rkatOperasional.findFirst({
            where: {
              OR: [
                { no: { contains: rkatCode } },
                { nama: { contains: rkatCode } }
              ]
            }
          });
          if (rkatObj) rkatId = rkatObj.id;
        }

        // Get linked mustahik details
        const linkedDetails = detailsByProposalId.get(idProposal) || [];
        let mustahikSummary = linkedDetails.map((md: any) => ({
          nama: String(md.Nama_Mustahik || md['Nama Mustahik'] || md.Nama || '-').trim(),
          nik: String(md.NIK || md['No NIK'] || '-').trim(),
          no_kk: String(md.No_KK || md['No KK'] || '-').trim(),
          asnaf: String(md.Asnaf || 'Miskin').trim(),
          alamat: String(md.Alamat_Lengkap || md.Alamat || '-').trim(),
          kecamatan: String(md.Kecamatan || '-').trim(),
          kelurahan: String(md.Kelurahan || '-').trim(),
          nominal: Number(md.Nominal_Per_Orang || md['Nominal Per Orang'] || md.Nominal || nominalVal || 0)
        }));

        // Fallback for Perorangan / Simple Single-Sheet Proposals (No Sheet 2 required!)
        if (mustahikSummary.length === 0) {
          mustahikSummary = [{
            nama: String(row.Nama_Mustahik || row.Nama_Pemohon || row['Nama Pemohon'] || row.Pemohon || namaLembaga).trim(),
            nik: String(row.NIK || row.nik || '-').trim(),
            no_kk: String(row.No_KK || row.no_kk || '-').trim(),
            asnaf: String(row.Asnaf || row.asnaf || 'Miskin').trim(),
            alamat: String(row.Alamat || row.alamat || '-').trim(),
            kecamatan: String(row.Kecamatan || row.kecamatan || '-').trim(),
            kelurahan: String(row.Kelurahan || row.kelurahan || '-').trim(),
            nominal: nominalVal
          }];
        }

        // Execute DB Insertion in a transaction (BYPASSING GL & Bank Balance changes)
        await prisma.$transaction(async (tx) => {
          // 1. Upsert PengajuanPencairan
          const noPengajuan = idProposal;
          
          const createdPengajuan = await tx.pengajuanPencairan.upsert({
            where: { no_pengajuan: noPengajuan },
            update: {
              tanggal: validTglCair,
              keterangan: `${keterangan} (Pemohon: ${namaLembaga}${pic ? ` - PIC: ${pic}` : ''})`,
              nominal: new Prisma.Decimal(nominalVal),
              rkat_id: rkatId,
              status: StatusPengajuan.CAIR,
              sumber_dana: sumberDana
            },
            create: {
              no_pengajuan: noPengajuan,
              tanggal: validTglCair,
              pengaju_id: defaultUser.id,
              kategori_biaya: 'Penyaluran ZIS',
              keterangan: `${keterangan} (Pemohon: ${namaLembaga}${pic ? ` - PIC: ${pic}` : ''})`,
              nominal: new Prisma.Decimal(nominalVal),
              rkat_id: rkatId,
              status: StatusPengajuan.CAIR,
              sumber_dana: sumberDana
            }
          });

          // 2. Create Log entry detailing the historical migration & By Name list
          await tx.pengajuanLog.create({
            data: {
              pengajuan_id: createdPengajuan.id,
              actor_id: defaultUser.id,
              action: 'MIGRATION_HISTORICAL',
              catatan: JSON.stringify({
                tgl_proposal_asal: validTglProp.toISOString().split('T')[0],
                tgl_pencairan_realisasi: validTglCair.toISOString().split('T')[0],
                nama_lembaga: namaLembaga,
                pic: pic,
                total_mustahik_by_name: mustahikSummary.length,
                mustahik_list: mustahikSummary
              })
            }
          });

          // 3. Create Realisasi record for RKAT tracking (without creating journal entries)
          await tx.realisasi.create({
            data: {
              rkat_id: rkatId,
              tanggal: validTglCair,
              keterangan: `[MIGRASI PROPOSAL] ${namaLembaga} - ${keterangan}`
            }
          });

          // 4. Create Proposal record (so it shows up in Tracking Proposal & Memo views)
          await tx.proposal.create({
            data: {
              tanggal_masuk: validTglProp,
              nama_pemohon: pic || namaLembaga,
              nama_instansi: namaLembaga,
              keterangan: `${idProposal}: ${keterangan}`,
              jenis_pengajuan: mustahikSummary.length > 1 ? 'Lembaga' : 'Perorangan',
              status: 'Selesai & Arsip'
            }
          });
        });

        importedCount++;
        totalNominalMigrated += nominalVal;
        totalMustahikMigrated += mustahikSummary.length;

      } catch (err: any) {
        console.error(`[MIGRATE PROPOSAL ERROR] Baris ${rowNum}:`, err.message || err);
        errorLogs.push(`Baris ${rowNum}: ${err.message || String(err)}`);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Migrasi selesai! ${importedCount} proposal berhasil diimpor.`,
      summary: {
        total_proposal: importedCount,
        total_nominal: totalNominalMigrated,
        total_mustahik_by_name: totalMustahikMigrated,
        errors: errorLogs
      }
    });
  } catch (error: any) {
    console.error('Migrate Proposal Excel Error:', error);
    res.status(500).json({ error: error.message || String(error) });
  }
};
