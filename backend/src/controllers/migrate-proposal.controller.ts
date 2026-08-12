import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../utils/prisma';
import { Prisma, StatusPengajuan } from '@prisma/client';

function parseExcelDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('-') && !String(val).includes('/'))) {
    const num = Number(val);
    if (num > 10000 && num < 100000) {
      // Excel serial date formula (convert days since 1899-12-30 to MS)
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }
  }
  const parsed = new Date(String(val));
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

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
        const rawId = String(
          row.ID_Proposal || row['ID Proposal'] ||
          row.No_Proposal || row['No Proposal'] ||
          row.No_Agenda || row['No Agenda'] ||
          row.Agenda_No || row['Agenda No'] ||
          row.No || row['No'] ||
          ''
        ).trim();

        const pic = String(row.PIC_Pemohon || row['PIC Pemohon'] || row.PIC || '').trim();
        const nominalVal = Number(row.Nominal_Global || row['Nominal Global'] || row.Nominal || row['Total Nominal'] || 0);
        const sumberDana = String(row.Sumber_Dana || row['Sumber Dana'] || 'Zakat').trim();
        const rkatCode = String(
          row.Kode_RKAT || row['Kode RKAT'] ||
          row.No_RKAT || row['No RKAT'] ||
          row.Kode_Kegiatan || row['Kode Kegiatan'] ||
          row.Program_RKAT || row['Program RKAT'] ||
          row.RKAT ||
          row.Jenis_Permohonan || row['Jenis Permohonan'] ||
          row.Jenis_Pengajuan || row['Jenis Pengajuan'] ||
          row.Program || row['Program'] ||
          row['Program / Jenis Permohonan'] || row['Program/Jenis Permohonan'] ||
          row['Jenis Permohonan / Kode Kegiatan'] ||
          row.Kegiatan || row['Kegiatan'] ||
          ''
        ).trim();
        const coaCode = String(row.Kode_COA || row['Kode COA'] || row.COA || '').trim();

        // Dates
        const tglPropRaw = row.Tanggal_Proposal || row['Tanggal Proposal'] || row.Tanggal || new Date();
        const tglCairRaw = row.Tanggal_Pencairan || row['Tanggal Pencairan'] || row.Tanggal_Realisasi || tglPropRaw;

        const validTglProp = parseExcelDate(tglPropRaw);
        const validTglCair = parseExcelDate(tglCairRaw);
        const yearVal = validTglProp.getFullYear();

        // Auto-generate standardized ID_Proposal (e.g. "1" -> "PROP_2026_0001")
        let idProposal = '';
        if (!rawId) {
          idProposal = `PROP_${yearVal}_${String(i + 1).padStart(4, '0')}`;
        } else if (/^\d+$/.test(rawId)) {
          idProposal = `PROP_${yearVal}_${String(rawId).padStart(4, '0')}`;
        } else if (rawId.toUpperCase().startsWith('PROP')) {
          idProposal = rawId.toUpperCase().replace(/-/g, '_');
        } else {
          idProposal = `PROP_${yearVal}_${rawId}`;
        }

        // Check matching RKAT Penyaluran (Program table) first!
        let programObj: any = null;
        let rkatObj: any = null;
        let matchedAsnafId: string | null = null;

        const targetCode = rkatCode || coaCode;
        if (targetCode) {
          // 1. Fetch all RKAT Penyaluran Programs
          const allPrograms = await prisma.program.findMany({
            orderBy: [{ code: 'asc' }, { created_at: 'asc' }]
          });

          // A. Check exact Program.code match first!
          programObj = allPrograms.find(prog => prog.code === targetCode || prog.pilar_code === targetCode);

          // B. Check if targetCode matches any rkat_details item ID or code/no/name directly
          if (!programObj) {
            for (const prog of allPrograms) {
              const rkatDetailsArr = (Array.isArray(prog.rkat_details) ? prog.rkat_details : []) as any[];
              const foundItem = rkatDetailsArr.find((item: any) =>
                item.id === targetCode ||
                item.asnafTargetId === targetCode ||
                item.code === targetCode ||
                item.kode === targetCode ||
                item.no === targetCode ||
                (item.name && item.name.toLowerCase() === targetCode.toLowerCase())
              );
              if (foundItem) {
                programObj = prog;
                matchedAsnafId = foundItem.id;
                break;
              }
            }
          }

          // C. If targetCode is a small number (like "1", "2", "3"), match by 1-based index across all rkat_details sub-activities!
          if (!programObj && /^\d{1,3}$/.test(targetCode)) {
            const numericIndex = Number(targetCode) - 1;
            let globalIndex = 0;
            for (const prog of allPrograms) {
              const rkatDetailsArr = (Array.isArray(prog.rkat_details) ? prog.rkat_details : []) as any[];
              if (rkatDetailsArr.length > 0) {
                for (const item of rkatDetailsArr) {
                  if (globalIndex === numericIndex) {
                    programObj = prog;
                    matchedAsnafId = item.id;
                    break;
                  }
                  globalIndex++;
                }
              } else {
                if (globalIndex === numericIndex) {
                  programObj = prog;
                  matchedAsnafId = prog.code;
                  break;
                }
                globalIndex++;
              }
              if (programObj) break;
            }
          }

          // D. Name substring match (ONLY if targetCode is not a pure number)
          if (!programObj && !/^\d+$/.test(targetCode)) {
            programObj = allPrograms.find(prog => prog.name.toLowerCase().includes(targetCode.toLowerCase()));
          }

          // E. Fallback to 1-based program index if small number didn't match sub-activity list
          if (!programObj && /^\d{1,3}$/.test(targetCode)) {
            const idx = Number(targetCode) - 1;
            if (idx >= 0 && idx < allPrograms.length) {
              programObj = allPrograms[idx];
            }
          }

          // F. Fallback to RKAT Operasional if matching
          if (!programObj) {
            rkatObj = await prisma.rkatOperasional.findFirst({
              where: {
                OR: [
                  { no: { contains: targetCode } },
                  { nama: { contains: targetCode } }
                ]
              }
            });
          }
        }

        // Foreign-key safe fields:
        const validProgramCode = programObj ? programObj.code : (targetCode || null);
        const validRkatOperasionalId = rkatObj ? rkatObj.id : null;
        const displayRkatActivityId = matchedAsnafId || (programObj ? programObj.code : (rkatObj ? rkatObj.no : (targetCode || null)));

        // Get linked mustahik details
        const linkedDetails = detailsByProposalId.get(rawId) || detailsByProposalId.get(idProposal) || [];

        // Raw fields from Excel for applicant, instansi, & jenis pengajuan
        const explicitJenisPengajuan = String(
          row.Jenis_Pengajuan || row['Jenis Pengajuan'] ||
          row.Jenis_Ajuan || row['Jenis Ajuan'] ||
          row.Kategori || row['Kategori'] ||
          ''
        ).trim();

        const rawPemohon = String(
          row.Nama_Pemohon || row['Nama Pemohon'] ||
          row.Pemohon || row.PIC_Pemohon || row['PIC Pemohon'] ||
          row.PIC || row.Nama_Mustahik || row['Nama Mustahik'] ||
          row.Mustahik || row.Nama || pic ||
          ''
        ).trim();

        const rawInstansi = String(
          row.Nama_Instansi || row['Nama Instansi'] ||
          row.Nama_Lembaga || row['Nama Lembaga'] ||
          row.Instansi || row.Lembaga ||
          ''
        ).trim();

        const pimpinanOrganisasiVal = String(row.Pimpinan_Organisasi || row['Pimpinan Organisasi'] || row.Nama_Pimpinan || row['Nama Pimpinan'] || row.Pimpinan || '').trim() || null;

        // Determine final jenis_pengajuan
        let finalJenisPengajuan = 'Perorangan';
        if (explicitJenisPengajuan) {
          if (explicitJenisPengajuan.toLowerCase().includes('lembaga') || explicitJenisPengajuan.toLowerCase().includes('kelompok')) {
            finalJenisPengajuan = 'Lembaga';
          } else {
            finalJenisPengajuan = 'Perorangan';
          }
        } else if (rawInstansi && rawInstansi.toLowerCase() !== rawPemohon.toLowerCase() && rawInstansi !== 'Lembaga Tanpa Nama') {
          finalJenisPengajuan = 'Lembaga';
        } else if (linkedDetails.length > 1) {
          finalJenisPengajuan = 'Lembaga';
        }

        const finalNamaInstansi = rawInstansi && !rawInstansi.toLowerCase().includes('tanpa nama') ? rawInstansi : (finalJenisPengajuan === 'Lembaga' ? (rawPemohon && !rawPemohon.toLowerCase().includes('tanpa nama') ? rawPemohon : null) : null);
        const finalNamaPemohon = rawPemohon && !rawPemohon.toLowerCase().includes('tanpa nama') ? rawPemohon : (pimpinanOrganisasiVal || finalNamaInstansi || 'Mustahik');
        const namaLembaga = finalNamaInstansi || finalNamaPemohon;
        const keterangan = String(row.Keterangan || row.Peruntukan || `Migrasi Proposal: ${namaLembaga}`).trim();

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

        if (mustahikSummary.length === 0) {
          mustahikSummary = [{
            nama: finalNamaPemohon,
            nik: String(row.NIK || row.nik || '-').trim(),
            no_kk: String(row.No_KK || row.no_kk || '-').trim(),
            asnaf: String(row.Asnaf || row.asnaf || 'Miskin').trim(),
            alamat: String(row.Alamat || row.alamat || '-').trim(),
            kecamatan: String(row.Kecamatan || row.kecamatan || '-').trim(),
            kelurahan: String(row.Kelurahan || row.kelurahan || '-').trim(),
            nominal: nominalVal
          }];
        }

        const namaAnakVal = String(row.Nama_Anak || row['Nama Anak'] || row.Nama_Siswa || row['Nama Siswa'] || row.Anak || '').trim() || null;
        const nikVal = String(row.NIK || row['No NIK'] || row.nik || row['NIK Pemohon'] || '').trim() || null;
        const noKkVal = String(row.No_KK || row['No KK'] || row.no_kk || '').trim() || null;
        const alamatVal = String(row.Alamat || row['Alamat Lengkap'] || row.alamat || '').trim() || null;
        const kelurahanVal = String(row.Kelurahan || row.kelurahan || '').trim() || null;
        const kecamatanVal = String(row.Kecamatan || row.kecamatan || '').trim() || null;
        const noTelponVal = String(row.No_Telpon || row['No Telpon'] || row.No_HP || row['No HP'] || row.no_telpon || '').trim() || null;
        const asnafVal = String(row.Asnaf || row.asnaf || '').trim() || null;
        
        // Smart Status Defaulting
        const statusRaw = String(row.Status || row.status || '').trim();
        const statusVal = statusRaw ? statusRaw : (nominalVal > 0 ? 'Selesai & Arsip' : 'Registrasi');

        // Execute DB Insertion in a transaction
        await prisma.$transaction(async (tx) => {
          const noPengajuan = idProposal;
          
          const createdPengajuan = await tx.pengajuanPencairan.upsert({
            where: { no_pengajuan: noPengajuan },
            update: {
              tanggal: validTglCair,
              keterangan: `${keterangan} (Pemohon: ${finalNamaPemohon}${pic ? ` - PIC: ${pic}` : ''})`,
              nominal: new Prisma.Decimal(nominalVal),
              rkat_id: validRkatOperasionalId,
              status: StatusPengajuan.CAIR,
              sumber_dana: sumberDana
            },
            create: {
              no_pengajuan: noPengajuan,
              tanggal: validTglCair,
              pengaju_id: defaultUser.id,
              kategori_biaya: 'Penyaluran ZIS',
              keterangan: `${keterangan} (Pemohon: ${finalNamaPemohon}${pic ? ` - PIC: ${pic}` : ''})`,
              nominal: new Prisma.Decimal(nominalVal),
              rkat_id: validRkatOperasionalId,
              status: StatusPengajuan.CAIR,
              sumber_dana: sumberDana
            }
          });

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

          await tx.realisasi.create({
            data: {
              rkat_id: displayRkatActivityId,
              tanggal: validTglCair,
              keterangan: `[MIGRASI PROPOSAL] ${namaLembaga} - ${keterangan}`
            }
          });

          const agendaNoVal = /^\d+$/.test(rawId) ? Number(rawId) : undefined;

          const searchConditions: any[] = [
            { keterangan: { startsWith: `${idProposal}:` } },
            { id: idProposal }
          ];
          if (agendaNoVal) {
            searchConditions.push({ agenda_no: agendaNoVal });
          }

          const existingProposal = await tx.proposal.findFirst({
            where: {
              OR: searchConditions
            }
          });

          if (existingProposal) {
            await tx.proposal.update({
              where: { id: existingProposal.id },
              data: {
                ...(agendaNoVal ? { agenda_no: agendaNoVal } : {}),
                tanggal_masuk: validTglProp,
                updated_at: validTglCair,
                nama_pemohon: finalNamaPemohon,
                nama_instansi: finalNamaInstansi,
                pimpinan_organisasi: pimpinanOrganisasiVal || existingProposal.pimpinan_organisasi,
                nama_anak: namaAnakVal || existingProposal.nama_anak,
                nik: nikVal || existingProposal.nik,
                no_kk: noKkVal || existingProposal.no_kk,
                alamat: alamatVal || existingProposal.alamat,
                kelurahan: kelurahanVal || existingProposal.kelurahan,
                kecamatan: kecamatanVal || existingProposal.kecamatan,
                no_telpon: noTelponVal || existingProposal.no_telpon,
                jenis_permohonan: validProgramCode || existingProposal.jenis_permohonan,
                rkat_activity_id: displayRkatActivityId || existingProposal.rkat_activity_id,
                nominal: nominalVal > 0 ? Math.round(nominalVal) : existingProposal.nominal,
                asnaf: asnafVal || existingProposal.asnaf,
                keterangan: `${idProposal}: ${keterangan}`,
                jenis_pengajuan: finalJenisPengajuan,
                status: statusVal || existingProposal.status
              }
            });
          } else {
            await tx.proposal.create({
              data: {
                ...(agendaNoVal ? { agenda_no: agendaNoVal } : {}),
                tanggal_masuk: validTglProp,
                updated_at: validTglCair,
                nama_pemohon: finalNamaPemohon,
                nama_instansi: finalNamaInstansi,
                pimpinan_organisasi: pimpinanOrganisasiVal,
                nama_anak: namaAnakVal,
                nik: nikVal,
                no_kk: noKkVal,
                alamat: alamatVal,
                kelurahan: kelurahanVal,
                kecamatan: kecamatanVal,
                no_telpon: noTelponVal,
                jenis_permohonan: validProgramCode,
                rkat_activity_id: displayRkatActivityId,
                nominal: nominalVal > 0 ? Math.round(nominalVal) : null,
                asnaf: asnafVal,
                keterangan: `${idProposal}: ${keterangan}`,
                jenis_pengajuan: finalJenisPengajuan,
                status: statusVal
              }
            });
          }
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
