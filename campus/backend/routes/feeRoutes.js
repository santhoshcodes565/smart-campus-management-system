const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Import controllers
const {
    createFeeStructure,
    getAllFeeStructures,
    getFeeStructure,
    updateFeeStructure,
    approveFeeStructure,
    activateFeeStructure,
    createNewVersion,
    archiveFeeStructure,
    getFeeHeadsMaster
} = require('../controllers/feeStructureController');

const {
    createStudentLedger,
    bulkAssignStructure,
    getAllLedgers,
    getLedgerDetails,
    getStudentOwnLedger,
    getStudentFeeSummary,
    getLedgersByStudent,
    closeLedger,
    getAcademicYears
} = require('../controllers/feeLedgerController');

const {
    createReceipt,
    getAllReceipts,
    getReceiptDetails,
    reverseReceipt,
    getStudentOwnReceipts,
    getReceiptByNumber,
    getReceiptsByLedger,
    getTodayReceipts,
    verifyReceipt
} = require('../controllers/feeReceiptController');

const {
    getDashboard,
    getAgingReport,
    getDepartmentRegister,
    getCollectionSummary,
    getDefaultersList,
    getStudentLedgerReport,
    exportReport,
    getAuditLogs,
    getSummaryStats
} = require('../controllers/feeReportController');

// ==================== ADMIN ROUTES ====================
// All admin routes require authentication and admin role

// Fee Structure Routes (Admin Only)
router.route('/structures')
    .get(protect, authorize('admin'), getAllFeeStructures)
    .post(protect, authorize('admin'), createFeeStructure);

router.get('/structures/fee-heads', protect, authorize('admin'), getFeeHeadsMaster);

router.route('/structures/:id')
    .get(protect, authorize('admin'), getFeeStructure)
    .put(protect, authorize('admin'), updateFeeStructure);

router.put('/structures/:id/approve', protect, authorize('admin'), approveFeeStructure);
router.put('/structures/:id/activate', protect, authorize('admin'), activateFeeStructure);
router.put('/structures/:id/archive', protect, authorize('admin'), archiveFeeStructure);
router.post('/structures/:id/version', protect, authorize('admin'), createNewVersion);

// Student Ledger Routes (Admin Only)
router.route('/ledgers')
    .get(protect, authorize('admin'), getAllLedgers)
    .post(protect, authorize('admin'), createStudentLedger);

router.get('/ledgers/academic-years', protect, authorize('admin'), getAcademicYears);
router.post('/ledgers/bulk-assign', protect, authorize('admin'), bulkAssignStructure);

router.route('/ledgers/:id')
    .get(protect, authorize('admin'), getLedgerDetails);

router.put('/ledgers/:id/close', protect, authorize('admin'), closeLedger);
router.get('/ledgers/student/:studentId', protect, authorize('admin'), getLedgersByStudent);

// Receipt Routes (Admin Only for creation/modification)
router.route('/receipts')
    .get(protect, authorize('admin'), getAllReceipts)
    .post(protect, authorize('admin'), createReceipt);

router.get('/receipts/today', protect, authorize('admin'), getTodayReceipts);
router.get('/receipts/number/:receiptNumber', protect, authorize('admin'), getReceiptByNumber);
router.get('/receipts/ledger/:ledgerId', protect, authorize('admin'), getReceiptsByLedger);

router.route('/receipts/:id')
    .get(protect, authorize('admin'), getReceiptDetails);

router.post('/receipts/:id/reverse', protect, authorize('admin'), reverseReceipt);
router.put('/receipts/:id/verify', protect, authorize('admin'), verifyReceipt);

// Dashboard & Reports (Admin Only)
router.get('/dashboard', protect, authorize('admin'), getDashboard);
router.get('/reports/summary', protect, authorize('admin'), getSummaryStats);
router.get('/reports/aging', protect, authorize('admin'), getAgingReport);
router.get('/reports/collection', protect, authorize('admin'), getCollectionSummary);
router.get('/reports/defaulters', protect, authorize('admin'), getDefaultersList);
router.get('/reports/department/:deptId', protect, authorize('admin'), getDepartmentRegister);
router.get('/reports/student/:studentId', protect, authorize('admin'), getStudentLedgerReport);
router.get('/reports/export/:type', protect, authorize('admin'), exportReport);
router.get('/reports/audit', protect, authorize('admin'), getAuditLogs);

// ==================== STUDENT ROUTES (READ-ONLY) ====================
// Students can only view their own fee information

router.get('/student/ledger', protect, authorize('student'), getStudentOwnLedger);
router.get('/student/summary', protect, authorize('student'), getStudentFeeSummary);
router.get('/student/receipts', protect, authorize('student'), getStudentOwnReceipts);

module.exports = router;
