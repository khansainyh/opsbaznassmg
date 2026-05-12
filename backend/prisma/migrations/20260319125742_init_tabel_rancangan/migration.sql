/*
  Warnings:

  - You are about to drop the column `ai_survey_score` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `nominal_disetujui` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `nominal_pengajuan` on the `Proposal` table. All the data in the column will be lost.
  - You are about to drop the column `warga_id` on the `Proposal` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `Proposal` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(3))`.
  - You are about to drop the column `createdAt` on the `Upz` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `role` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(3))` to `Enum(EnumId(0))`.
  - You are about to drop the column `createdAt` on the `Warga` table. All the data in the column will be lost.
  - Added the required column `jenis_permohonan` to the `Proposal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nama_pemohon` to the `Proposal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tanggal_masuk` to the `Proposal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Proposal` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Proposal` DROP FOREIGN KEY `Proposal_warga_id_fkey`;

-- DropIndex
DROP INDEX `Proposal_warga_id_fkey` ON `Proposal`;

-- AlterTable
ALTER TABLE `Proposal` DROP COLUMN `ai_survey_score`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `nominal_disetujui`,
    DROP COLUMN `nominal_pengajuan`,
    DROP COLUMN `warga_id`,
    ADD COLUMN `alamat` TEXT NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `has_memo` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `jam_pengajuan` VARCHAR(191) NULL,
    ADD COLUMN `jenis_permohonan` VARCHAR(191) NOT NULL,
    ADD COLUMN `kecamatan` VARCHAR(191) NULL,
    ADD COLUMN `kelurahan` VARCHAR(191) NULL,
    ADD COLUMN `memo_source` VARCHAR(191) NULL,
    ADD COLUMN `nama_anak` VARCHAR(191) NULL,
    ADD COLUMN `nama_instansi` VARCHAR(191) NULL,
    ADD COLUMN `nama_pemohon` VARCHAR(191) NOT NULL,
    ADD COLUMN `nik` VARCHAR(191) NULL,
    ADD COLUMN `no_telpon` VARCHAR(191) NULL,
    ADD COLUMN `pekerjaan` VARCHAR(191) NULL,
    ADD COLUMN `pimpinan_organisasi` VARCHAR(191) NULL,
    ADD COLUMN `tanggal_masuk` DATETIME(3) NOT NULL,
    ADD COLUMN `ttl` VARCHAR(191) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `yang_mengajukan` VARCHAR(191) NULL,
    MODIFY `status` ENUM('Registrasi', 'Proses_Disposisi', 'Review_Kabag_Administrasi', 'Survei_Assessment', 'Review_Kepala_Pelaksana', 'Penentuan_Nominal', 'Persetujuan_Nominal', 'Pencairan_Dana', 'Arsip', 'Selesai', 'Ditolak') NOT NULL DEFAULT 'Registrasi';

-- AlterTable
ALTER TABLE `Upz` DROP COLUMN `createdAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `kategori` ENUM('Masjid', 'Yayasan_Lembaga', 'Sekolah', 'OPD') NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `createdAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `role` ENUM('Super_Admin', 'Pimpinan', 'Kabag_Administrasi', 'Kepala_Pelaksana', 'Staf_Administrasi', 'Staf_Distribusi', 'Keuangan', 'Relawan', 'Relawan_Sementara') NOT NULL DEFAULT 'Super_Admin';

-- AlterTable
ALTER TABLE `Warga` DROP COLUMN `createdAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `Pilar` (
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'Aktif',

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Program` (
    `code` VARCHAR(191) NOT NULL,
    `pilar_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Surat` (
    `id` VARCHAR(191) NOT NULL,
    `agenda_no` VARCHAR(191) NOT NULL,
    `tanggal_masuk` DATETIME(3) NOT NULL,
    `nama_instansi` VARCHAR(191) NULL,
    `pimpinan_organisasi` VARCHAR(191) NULL,
    `alamat` TEXT NULL,
    `kelurahan` VARCHAR(191) NULL,
    `kecamatan` VARCHAR(191) NULL,
    `keperluan` TEXT NOT NULL,
    `no_telpon` VARCHAR(191) NULL,
    `jam_pengajuan` VARCHAR(191) NULL,
    `yang_mengajukan` VARCHAR(191) NULL,
    `arsip` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Baru',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Surat_agenda_no_key`(`agenda_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Program` ADD CONSTRAINT `Program_pilar_code_fkey` FOREIGN KEY (`pilar_code`) REFERENCES `Pilar`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Proposal` ADD CONSTRAINT `Proposal_jenis_permohonan_fkey` FOREIGN KEY (`jenis_permohonan`) REFERENCES `Program`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
