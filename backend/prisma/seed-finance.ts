import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const coaData = [
  { coa_code: '111010101', nama_akun: 'Kas Dana Zakat (A)', klasifikasi: 'Aktiva', tipe_dana: 'ZAKAT' },
  { coa_code: '111010102', nama_akun: 'Kas Dana Infak Tidak Terikat (B)', klasifikasi: 'Aktiva', tipe_dana: 'INFAK_TIDAK_TERIKAT' },
  { coa_code: '111010103', nama_akun: 'Kas Dana Amil', klasifikasi: 'Aktiva', tipe_dana: 'AMIL' },
  { coa_code: '111010201', nama_akun: 'Bank Zakat BSI', klasifikasi: 'Aktiva', tipe_dana: 'ZAKAT' },
  { coa_code: '111010202', nama_akun: 'Bank Infak Terikat BSI', klasifikasi: 'Aktiva', tipe_dana: 'INFAK_TERIKAT' },
  { coa_code: '111010203', nama_akun: 'Bank Infak Tidak Terikat BSI', klasifikasi: 'Aktiva', tipe_dana: 'INFAK_TIDAK_TERIKAT' },
  { coa_code: '111010204', nama_akun: 'Bank Amil BSI', klasifikasi: 'Aktiva', tipe_dana: 'AMIL' },
  { coa_code: '111010205', nama_akun: 'Bank APBD BSI', klasifikasi: 'Aktiva', tipe_dana: 'APBD' },
  { coa_code: '51020201', nama_akun: 'Penyaluran Zakat Maal Kas Fakir', klasifikasi: 'Penyaluran', tipe_dana: 'ZAKAT' },
  { coa_code: '51030201', nama_akun: 'Penyaluran Zakat Maal Kas Miskin', klasifikasi: 'Penyaluran', tipe_dana: 'ZAKAT' },
  { coa_code: '519999999', nama_akun: 'Penyaluran Lainnya (Darurat/Lain-lain)', klasifikasi: 'Penyaluran', tipe_dana: 'ZAKAT' }
];

async function main() {
  console.log('Seeding Chart of Accounts (COA)...');
  for (const coa of coaData) {
    await prisma.chartOfAccounts.upsert({
      where: { coa_code: coa.coa_code },
      update: coa,
      create: coa,
    });
  }

  console.log('Seeding Bank Accounts...');
  const bankAccounts = [
    {
      account_id: 'ba-1',
      nama_akun: 'Kas Utama Tunai (A) - Zakat',
      tipe_kas: 'TUNAI',
      kelompok_dana: 'ZAKAT',
      saldo: 50000000.00,
      kode_laci: 'A',
      coa_code: '111010101',
    },
    {
      account_id: 'ba-2',
      nama_akun: 'Kas Utama Tunai (B) - ISTT',
      tipe_kas: 'TUNAI',
      kelompok_dana: 'INFAK_TIDAK_TERIKAT',
      saldo: 119837691.00,
      kode_laci: 'B',
      coa_code: '111010102',
    },
    {
      account_id: 'ba-3',
      nama_akun: 'BSI - Rekening Utama Zakat',
      tipe_kas: 'BANK',
      kelompok_dana: 'PENYIMPANAN',
      saldo: 1850000000.00,
      no_rekening: '05000-800-84',
      coa_code: '111010201',
    },
    {
      account_id: 'ba-4',
      nama_akun: 'BSI - Rekening Utama Infak',
      tipe_kas: 'BANK',
      kelompok_dana: 'PENYIMPANAN',
      saldo: 350000000.00,
      no_rekening: '05000-800-85',
      coa_code: '111010203',
    }
  ];

  for (const account of bankAccounts) {
    await prisma.bankAccount.upsert({
      where: { account_id: account.account_id },
      update: {
        nama_akun: account.nama_akun,
        tipe_kas: account.tipe_kas,
        kelompok_dana: account.kelompok_dana,
        saldo: account.saldo,
        no_rekening: account.no_rekening,
        kode_laci: account.kode_laci,
        coa_code: account.coa_code
      },
      create: account,
    });
  }

  console.log('Seeding COA Mapping Rules...');
  const rules = [
    {
      rule_id: 'rule-1',
      program_code: '1102', // Bantuan Biaya Hidup
      asnaf_id: 'Fakir',
      tipe_kas: 'TUNAI',
      sumber_dana_tag: 'ZAKAT',
      debit_coa_code: '51020201',
      kredit_coa_code: '111010101',
    },
    {
      rule_id: 'rule-2',
      program_code: '1201', // Bantuan Pengobatan
      asnaf_id: 'Miskin',
      tipe_kas: 'BANK',
      sumber_dana_tag: 'ZAKAT',
      debit_coa_code: '51030201',
      kredit_coa_code: '111010201',
    }
  ];

  for (const rule of rules) {
    await prisma.coaMappingRule.upsert({
      where: { rule_id: rule.rule_id },
      update: rule,
      create: rule,
    });
  }

  console.log('✅ Seeding Finance Sukses!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
