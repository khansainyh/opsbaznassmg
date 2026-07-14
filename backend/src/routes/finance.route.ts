import { Router } from 'express';
import {
   getCOAs,
   createCOA,
   updateCOA,
   deleteCOA,
   getAccounts,
   createAccount,
   updateAccount,
   deleteAccount,
   getMappingRules,
   createMappingRule,
   updateMappingRule,
   deleteMappingRule,
   checkAvailability,
   checkAvailabilityBatch,
   previewDisbursement,
   executeDisbursement,
   executeReplenishment,
   getJournalEntries,
   createManualExpense,
   checkLedgerHealth,
   getReplenishments,
   migrateBukuBesar
 } from '../controllers/finance.controller';

const router = Router();

// COA Routes
router.get('/coa', getCOAs);
router.post('/coa', createCOA);
router.put('/coa/:coa_code', updateCOA);
router.delete('/coa/:coa_code', deleteCOA);

// Bank & Kas Account Routes
router.get('/accounts', getAccounts);
router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);
router.delete('/accounts/:id', deleteAccount);

// COA Mapping Rules Routes
router.get('/mapping-rules', getMappingRules);
router.post('/mapping-rules', createMappingRule);
router.put('/mapping-rules/:id', updateMappingRule);
router.delete('/mapping-rules/:id', deleteMappingRule);

// Double Guard & Auto Journaling Routes
router.get('/check-availability/:proposalId', checkAvailability);
router.post('/check-availability-batch', checkAvailabilityBatch);
router.post('/disburse/preview', previewDisbursement);
router.post('/disburse/execute', executeDisbursement);
router.get('/replenish', getReplenishments);
router.post('/replenish', executeReplenishment);
router.post('/manual-expense', createManualExpense);

// Journal Entries Ledger Route
router.get('/ledger', getJournalEntries);
router.get('/ledger/health-check', checkLedgerHealth);
router.post('/ledger/migrate', migrateBukuBesar);

export default router;
