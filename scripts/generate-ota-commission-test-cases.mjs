import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const HEADERS = [
  'Test Case ID',
  'Module',
  'Functionality Type',
  'Test Scenario',
  'Test Steps',
  'Input Data',
  'Expected Result',
  'Actual Result',
  'Status',
  'Remarks',
];

/** @param {string} id @param {string} module @param {string} type @param {string} scenario @param {string} steps @param {string} input @param {string} expected @param {string} [remarks] */
function tc(id, module, type, scenario, steps, input, expected, remarks = '') {
  return [id, module, type, scenario, steps, input, expected, '', 'Pending', remarks];
}

const otaCommission = [
  // --- Admin: Commission rule setup (drives OTA commission) ---
  tc(
    'TC-OTA-001',
    'OTA Commission',
    'UI / Navigation',
    'Access Commission & Tax management from Super Admin',
    '1. Log in as Super Admin (COMMISSION_TAX permission)\n2. Open Super Admin dashboard\n3. Click Commission & Tax\n4. Verify Commissions tab is default/active',
    'User with COMMISSION_TAX module access',
    'Commission and Tax Management page loads with Commissions, Taxes, and Service Fee tabs; Commission Rules card visible.',
  ),
  tc(
    'TC-OTA-002',
    'OTA Commission',
    'UI / Navigation',
    'Open Create Commission modal',
    '1. On Commissions tab click Add Commission\n2. Verify modal title and fields',
    'N/A',
    'Create Commission modal opens with Scope, Scope Value (conditional), Commission Type, Commission Value, Effective From.',
  ),
  tc(
    'TC-OTA-003',
    'OTA Commission',
    'Functional',
    'Create channel-scoped OTA commission (percentage) for B2C',
    '1. Click Add Commission\n2. Scope = Channel\n3. Channel Name = B2C\n4. Commission Type = Percentage\n5. Commission Value = 15\n6. Effective From = today or future date\n7. Submit',
    'POST /admin/commission\n{\n  "scope": "CHANNEL",\n  "scopeValue": "B2C",\n  "commissionType": "PERCENTAGE",\n  "commissionValue": 15,\n  "effectiveFrom": "2026-05-25"\n}',
    'API success; new row in commission table: Scope CHANNEL, Scope Value B2C, Type Percentage, Value 15%, Status Active; modal closes.',
    'B2C channel commission typically applies to retail/OTA bookings.',
  ),
  tc(
    'TC-OTA-004',
    'OTA Commission',
    'Functional',
    'Create channel-scoped commission (flat amount) for B2B',
    '1. Add Commission\n2. Scope = Channel, Channel Name = B2B\n3. Type = Flat, Value = 500\n4. Effective From = valid future date\n5. Submit',
    'POST /admin/commission\n{\n  "scope": "CHANNEL",\n  "scopeValue": "B2B",\n  "commissionType": "FLAT",\n  "commissionValue": 500,\n  "effectiveFrom": "2026-05-25"\n}',
    'Commission saved; table shows FLAT ₹500.00 for B2B channel.',
  ),
  tc(
    'TC-OTA-005',
    'OTA Commission',
    'Functional',
    'Create global commission rule (fallback for OTA calculation)',
    '1. Add Commission\n2. Scope = Global (no scope value field)\n3. Type = Percentage, Value = 12\n4. Submit',
    'POST /admin/commission\n{\n  "scope": "GLOBAL",\n  "scopeValue": null,\n  "commissionType": "PERCENTAGE",\n  "commissionValue": 12,\n  "effectiveFrom": "2026-05-25"\n}',
    'Global commission created; Scope Value shows N/A in list.',
  ),
  tc(
    'TC-OTA-006',
    'OTA Commission',
    'Functional',
    'Create hotel-specific OTA commission override',
    '1. Add Commission\n2. Scope = Hotel\n3. Select approved hotel from dropdown\n4. Percentage = 10\n5. Submit',
    'scope=HOTEL; scopeValue=<hotelId>; commissionType=PERCENTAGE; commissionValue=10',
    'Hotel-scoped commission saved; hotel name/code visible in Scope Value column.',
  ),
  tc(
    'TC-OTA-007',
    'OTA Commission',
    'Functional',
    'Create agency-tier commission (agent bookings)',
    '1. Add Commission\n2. Scope = Agency Tier\n3. Tier = Gold\n4. Flat value = 200\n5. Submit',
    'scope=AGENCY_TIER; scopeValue=GOLD; commissionType=FLAT; commissionValue=200',
    'Agency tier commission listed; used for agent commission on booking detail when applicable.',
  ),
  tc(
    'TC-OTA-008',
    'OTA Commission',
    'Validation',
    'Block create when scope value missing (non-global)',
    '1. Open Add Commission\n2. Scope = Channel\n3. Leave Channel Name empty\n4. Fill other required fields\n5. Submit',
    'scope=CHANNEL; scopeValue=null',
    'Inline error "Scope value is required"; no API call.',
  ),
  tc(
    'TC-OTA-009',
    'OTA Commission',
    'Validation',
    'Block create when commission value is zero or negative',
    '1. Fill valid scope and dates\n2. Set Commission Value = 0 or -5\n3. Submit',
    'commissionValue <= 0',
    'Error "Commission value must be greater than 0"; form not submitted.',
  ),
  tc(
    'TC-OTA-010',
    'OTA Commission',
    'Validation',
    'Block create when effective from date is in the past',
    '1. Set Effective From to yesterday\n2. Fill all other fields valid\n3. Submit',
    'effectiveFrom < today',
    'Error "Effective from date cannot be in the past."; no create API.',
  ),
  tc(
    'TC-OTA-011',
    'OTA Commission',
    'Validation',
    'Block submit when commission type not selected',
    '1. Clear or omit commission type if possible\n2. Submit',
    'commissionType empty',
    'Error "Commission type is required".',
  ),
  tc(
    'TC-OTA-012',
    'OTA Commission',
    'Functional',
    'Search commission list by scope or channel',
    '1. Ensure multiple commissions exist (GLOBAL, CHANNEL B2C)\n2. Type "B2C" in search box',
    'commissionSearch = "b2c"',
    'Table filters to rows matching scope, scope value, type, or value containing B2C.',
  ),
  tc(
    'TC-OTA-013',
    'OTA Commission',
    'Functional',
    'Paginate commission list',
    '1. Ensure >20 commission records\n2. Change rows per page to 10\n3. Click Next / Previous',
    'page=0,1; size=10|20|50',
    'GET /admin/commission/list?page=&size= returns correct page; UI shows page X of Y and enables/disables nav buttons.',
  ),
  tc(
    'TC-OTA-014',
    'OTA Commission',
    'Functional',
    'Deactivate active commission rule',
    '1. Locate active commission row\n2. Click Deactivate\n3. Confirm in modal\n4. Refresh list',
    'DELETE /admin/commission/{id}',
    'Commission status becomes inactive; Deactivate button disabled for inactive row.',
  ),
  tc(
    'TC-OTA-015',
    'OTA Commission',
    'Negative',
    'Cancel deactivate commission',
    '1. Click Deactivate on active rule\n2. Cancel confirmation modal',
    'N/A',
    'Modal closes; commission remains active; no DELETE API.',
  ),
  tc(
    'TC-OTA-016',
    'OTA Commission',
    'Negative',
    'API validation error displayed on create',
    '1. Submit duplicate or invalid payload (per backend rules)\n2. Observe modal error',
    'Backend returns field errors in response.data',
    'Red API error banner and/or field-level messages shown; modal stays open.',
  ),
  tc(
    'TC-OTA-017',
    'OTA Commission',
    'UI',
    'Empty state when no commissions configured',
    '1. Open Commissions tab with zero records (or filtered empty)\n2. Verify empty UI',
    'GET /admin/commission/list returns empty',
    'Message "No commissions yet" and Add Commission CTA displayed.',
  ),
  tc(
    'TC-OTA-018',
    'OTA Commission',
    'UI',
    'Hotel dropdown loads approved hotels for HOTEL scope',
    '1. Add Commission\n2. Select Scope = Hotel\n3. Wait for dropdown',
    'GET approved hotels API',
    'Dropdown lists approved hotels as "Name (Code)"; shows loading then options or "No hotels available".',
  ),

  // --- Booking detail: OTA commission display ---
  tc(
    'TC-OTA-019',
    'OTA Commission',
    'UI / Navigation',
    'View OTA commission section on booking detail (retail rate)',
    '1. Open booking with hotelPricingComputation = RETAIL_RATE\n2. Open Rate breakup card\n3. Scroll to Commission section',
    'Booking id with rateBreakup and RETAIL_RATE',
    'Section "Commission" visible with rows: 5. OTA commission, 6. GST on commission @18%, (B) Commission including GST (5+6).',
  ),
  tc(
    'TC-OTA-020',
    'OTA Commission',
    'Functional',
    'OTA commission amounts match API rate breakup',
    '1. Open booking detail\n2. Compare UI values to API response rateBreakup fields',
    'rateBreakup.commissionAmount, commissionGst, commissionTotal from GET booking detail',
    'Row 5 = commissionAmount; Row 6 = commissionGst; Row B = commissionTotal; currency formatted correctly (INR).',
  ),
  tc(
    'TC-OTA-021',
    'OTA Commission',
    'Functional',
    'OTA commission hidden for package-rate bookings',
    '1. Open booking with hotelPricingComputation = PACKAGE_RATE\n2. View Rate breakup',
    'hotelPricingComputation = PACKAGE_RATE',
    'Commission section (rows 5, 6, B) NOT shown; service charges row 4 also hidden per package UI rules.',
  ),
  tc(
    'TC-OTA-022',
    'OTA Commission',
    'Functional',
    'Property gross and payable to hotel reflect OTA commission deduction (retail)',
    '1. Open RETAIL_RATE booking with full rate breakup\n2. Verify (A) Property gross and final payable',
    'rateBreakup.hotelGrossCharges, commissionTotal, payableToHotel',
    'Payable to hotel = (A) − (B) − (C) per UI labels; amounts consistent with backend calculation.',
  ),
  tc(
    'TC-OTA-023',
    'OTA Commission',
    'Functional',
    'Tax deduction section shown with TCS and TDS (retail OTA booking)',
    '1. Open RETAIL_RATE booking detail\n2. Locate Tax deduction section after Commission',
    'rateBreakup.tcsAmount, tdsAmount, taxDeductions',
    'Rows 7. TCS @ 0.5%, 8. TDS @ 0.1%, (C) Tax deduction (7+8) displayed with correct amounts.',
  ),
  tc(
    'TC-OTA-024',
    'OTA Commission',
    'Functional',
    'Agent commission row when agent booking data present',
    '1. Open booking with rateBreakup.agentCommission and agencyTier\n2. Find agent section in breakup',
    'agentCommission: number; agencyTier: e.g. GOLD',
    'Agent commission and agency tier labels shown with formatted currency.',
  ),
  tc(
    'TC-OTA-025',
    'OTA Commission',
    'Negative',
    'Booking detail without rate breakup',
    '1. Open booking where rateBreakup is null/undefined\n2. View Rate breakup card',
    'rateBreakup missing',
    'OTA commission rows not shown or breakup shows safe empty/— values without crash.',
  ),
  tc(
    'TC-OTA-026',
    'OTA Commission',
    'Functional',
    'Promotion breakup does not remove OTA commission section',
    '1. Open booking with applied promotions AND RETAIL_RATE\n2. Verify promotion lines then Commission section',
    'appliedPromotions[] non-empty; RETAIL_RATE',
    'Promotion lines shown above property charges; OTA commission section still visible below property gross.',
  ),

  // --- Pricing / channel integration ---
  tc(
    'TC-OTA-027',
    'OTA Commission',
    'Functional',
    'Pricing quote with OTA customer type',
    '1. Open Pricing Quote page\n2. Select Customer Type = OTA\n3. Enter valid search criteria\n4. Run quote',
    'customerType = OTA in pricing request',
    'Quote returns rates; OTA channel pricing applied per backend rules.',
  ),
  tc(
    'TC-OTA-028',
    'OTA Commission',
    'Integration',
    'Active commission rules used for new OTA booking calculation',
    '1. Configure active CHANNEL B2C percentage commission\n2. Create or fetch OTA/retail booking after effective date\n3. Verify commission in rate breakup',
    'Active B2C PERCENTAGE rule; booking on/after effectiveFrom',
    'commissionAmount ≈ applicable base × percentage (per business rules); GST on commission @18% on commissionAmount.',
  ),
  tc(
    'TC-OTA-029',
    'OTA Commission',
    'Integration',
    'Hotel-specific commission overrides global for that hotel',
    '1. Set GLOBAL 12% and HOTEL-specific 8% for same hotel\n2. Create booking for that hotel\n3. Compare commission',
    'Two active rules; hotel booking',
    'Hotel-scoped rule takes precedence over global (per backend priority); commission matches 8% not 12%.',
    'Confirm priority with backend team if ambiguous.',
  ),
  tc(
    'TC-OTA-030',
    'OTA Commission',
    'Integration',
    'Deactivated commission not applied to new bookings',
    '1. Deactivate B2C channel commission\n2. Create new OTA booking\n3. Check rate breakup',
    'Previously active rule now inactive',
    'New booking uses fallback rule (e.g. GLOBAL) or zero commission per policy; deactivated rule not used.',
  ),

  // --- Permissions & edge cases ---
  tc(
    'TC-OTA-031',
    'OTA Commission',
    'Security',
    'User without COMMISSION_TAX cannot manage commission rules',
    '1. Log in as role without COMMISSION_TAX\n2. Attempt to open /admin/commission-tax',
    'User lacking module permission',
    'Access denied or menu hidden; cannot create/deactivate commissions.',
  ),
  tc(
    'TC-OTA-032',
    'OTA Commission',
    'Boundary',
    'Maximum percentage commission value (100%)',
    '1. Create CHANNEL commission with Percentage = 100\n2. Save and verify display',
    'commissionValue = 100; commissionType = PERCENTAGE',
    'Saved and displayed as 100%; booking commission calculation capped per business rules.',
  ),
  tc(
    'TC-OTA-033',
    'OTA Commission',
    'Boundary',
    'Large flat commission amount',
    '1. Create FLAT commission with large value (e.g. 999999)\n2. Save\n3. Use in booking breakup if applicable',
    'commissionValue = 999999; FLAT',
    'Value stored and displayed; booking payable calculation handles large amount without UI overflow.',
  ),
  tc(
    'TC-OTA-034',
    'OTA Commission',
    'UI',
    'Commission type toggle updates value label (₹ vs %)',
    '1. Open Add Commission\n2. Switch Type Percentage → Flat\n3. Observe value field label and icon',
    'Toggle PERCENTAGE / FLAT',
    'Label changes between "Commission Value (%)" and "Commission Value (₹)"; placeholder and icon update.',
  ),
  tc(
    'TC-OTA-035',
    'OTA Commission',
    'Regression',
    'GET active commissions API for downstream pricing',
    '1. Call GET /admin/commission/active\n2. Verify response shape',
    'Authenticated admin or service account',
    'Returns active commissions array; includes CHANNEL/GLOBAL rules used for OTA commission engine.',
  ),
];

const allRows = [HEADERS, ...otaCommission];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(allRows);

ws['!cols'] = [
  { wch: 14 },
  { wch: 18 },
  { wch: 18 },
  { wch: 48 },
  { wch: 58 },
  { wch: 52 },
  { wch: 48 },
  { wch: 18 },
  { wch: 10 },
  { wch: 28 },
];

XLSX.utils.book_append_sheet(wb, ws, 'OTA Commission');

const outDir = join(root, 'docs', 'test-cases');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'OTA_Commission_Test_Cases.xlsx');
XLSX.writeFile(wb, outPath);

console.log(`Generated: ${outPath}`);
console.log(`Total test cases: ${otaCommission.length}`);
