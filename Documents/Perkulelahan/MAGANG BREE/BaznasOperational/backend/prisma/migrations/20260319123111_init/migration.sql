-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('Relawan', 'Kapel_Distribusi', 'Pimpinan', 'Waka_Keuangan', 'Keuangan', 'Admin') NOT NULL DEFAULT 'Relawan',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warga` (
    `id` VARCHAR(191) NOT NULL,
    `nik` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `status_zakat` ENUM('Mustahik', 'Muzakki') NOT NULL DEFAULT 'Mustahik',
    `ai_urgency_score` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Warga_nik_key`(`nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Proposal` (
    `id` VARCHAR(191) NOT NULL,
    `agenda_no` VARCHAR(191) NOT NULL,
    `warga_id` VARCHAR(191) NOT NULL,
    `status` ENUM('Masuk', 'Survei', 'Cek_Syarat', 'ACC_Pimpinan', 'Penentuan_Nominal', 'Pencairan', 'Selesai') NOT NULL DEFAULT 'Masuk',
    `ai_survey_score` DOUBLE NULL,
    `nominal_pengajuan` DECIMAL(65, 30) NULL,
    `nominal_disetujui` DECIMAL(65, 30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Proposal_agenda_no_key`(`agenda_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Upz` (
    `id` VARCHAR(191) NOT NULL,
    `kategori` ENUM('Masjid', 'Sekolah', 'OPD') NOT NULL,
    `nama_upz` VARCHAR(191) NOT NULL,
    `alamat` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Proposal` ADD CONSTRAINT `Proposal_warga_id_fkey` FOREIGN KEY (`warga_id`) REFERENCES `Warga`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
