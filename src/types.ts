export type Language = 'mr' | 'en';

export type UserRole = 
  | 'admin' 
  | 'user'
  | 'asm' 
  | 'field-officer' 
  | 'sales-officer' 
  | 'sr' 
  | 'sales-executive' 
  | 'dealer';

export interface User {
  id: string;
  fullName: string;
  name: string;
  designation: string;
  village: string;
  address: string;
  phone: string;
  email: string;
  bloodGroup: string;
  loginId: string;
  password?: string;
  role: UserRole;
  territory: string;
  avatar?: string;
  allowedTabs?: NavTab[];
}

export interface BankDetails {
  bankName: string;
  accountNo: string;
  ifsc: string;
  accountHolder: string;
  branch: string;
}

export interface CompanyDetails {
  name: string;
  tagline: string;
  logoUrl?: string;
  cin: string;
  gstNo: string;
  address: string;
  taluka: string;
  district: string;
  pincode: string;
  phone: string;
  email: string;
  bankDetails: BankDetails;
}

export interface MonthTargetRow {
  srNo: number;
  month: string;
  monthMr?: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  targetLakh: number;
  achievementLakh: number;
  percentAchievement: number;
  collectionPercentage?: number;
  collectionLakh: number;
  actualCollectionLakh: number;
  percentCollection?: number;
  notes?: string;
}

export interface TargetItem {
  id: string;
  executiveId: string;
  executiveName: string;
  executiveRole: string;
  personName?: string;
  userId?: string;
  designation?: string;
  headquarter?: string;
  territory: string;
  centre?: string;
  financialYear: string;
  lastYearSale?: number;
  lastYearSalesText?: string;
  salesTargetLakh?: number;
  salesAchievedLakh?: number;
  collectionTargetLakh?: number;
  lastYearAchievement?: number;
  lastYearOpeningOutstanding?: number;
  lastYearOutstanding?: number;
  lastYearCollection?: number;
  currentYearOutstandingPercent?: number;
  collectionTargetPercent?: number;
  year?: number | string;
  monthsData?: MonthTargetRow[];
  month: string;
  productCategory?: string;
  targetUnits?: number;
  unitType?: string;
  targetAmount: number;
  achievedUnits?: number;
  achievedAmount: number;
  collectionAmount?: number;
  notes?: string;
  lastUpdated?: string;
}

export interface DealerOrderBillItem {
  id: string;
  productId: string;
  productName: string;
  packing: string;
  rate: number;
  quantity: number;
  gstRate: number;
  total: number;
}

export interface DealerOrderBill {
  id: string;
  billNumber: string;
  billDate: string;
  dealerId: string;
  dealerName: string;
  dealerCode?: string;
  proprietorName?: string;
  mobile?: string;
  territory?: string;
  officerName?: string;
  items: DealerOrderBillItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  status: 'confirmed' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface DealerCollectionRecord {
  id: string;
  receiptNo: string;
  dealerId: string;
  dealerName: string;
  dealerCode?: string;
  officerName?: string;
  territory?: string;
  collectionDate: string;
  amount: number;
  amountLakh: number;
  targetMonth: string; // e.g. 'April', 'May', 'June', etc.
  paymentMode: 'cash' | 'cheque' | 'rtgs_neft' | 'upi' | 'bank_transfer';
  referenceNo?: string;
  bankName?: string;
  chequeDate?: string;
  remarks?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface PriceListItem {
  id: string;
  code: string;
  nameMr: string;
  nameEn: string;
  category: 'Organic Fertilizers' | 'Bio-Stimulants' | 'Soil Conditioners' | 'Micronutrients' | 'Pest Care' | string;
  packing: string;
  mrp: number;
  dealerPrice: number;
  distributorPrice: number;
  gstRate: number;
  hsnCode: string;
  inStock: boolean;
  minOrderQty: number;
  descriptionMr?: string;
  descriptionEn?: string;
  groupDiscountPercent?: number;
}

export interface DealerApplication {
  id: string;
  dealerCode?: string;
  codeSequence?: number;
  applicationDate: string;
  center?: string;
  shopOpeningDate?: string;
  addressStamp?: string;
  firmName: string;
  proprietorName: string;
  mobile: string;
  email: string;
  aadhaarNo?: string;
  dateOfBirth?: string;
  shopAddress: string;
  taluka: string;
  district: string;
  state: string;
  pincode: string;
  gstNumber: string;
  panNumber: string;
  fertilizerLicense: string;
  seedLicense?: string;
  expectedMonthlyTurnover: number;
  bankName: string;
  bankAddress?: string;
  accountNo: string;
  ifscCode: string;
  chequeNo?: string;
  place?: string;
  date?: string;
  remarks?: string;
  applicantPhotoUrl?: string;
  shopPhotoUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review' | 'cancelled';
  reviewRemarks?: string;
  approvedDate?: string;
  cancelledDate?: string;
  certificateNo?: string;
  assignedOfficer?: string;
  village?: string;
  securityDeposit?: string;
}

export interface TravelExpense {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  travelDate: string;
  fromLocation: string;
  toLocation: string;
  purpose: string;
  travelMode: 'bike' | 'car' | 'bus_train' | 'other';
  totalKm: number;
  kmRate: number;
  fuelAmount: number;
  lodgingAmount: number;
  foodDaAmount: number;
  tollParkingAmount: number;
  otherAmount: number;
  totalClaimAmount: number;
  receiptName?: string;
  receiptData?: string;
  remarks?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvalDate?: string;
  submittedAt: string;
}

export type ActivityType =
  | 'dealer_visit'
  | 'farmer_meeting'
  | 'site_demo'
  | 'collection_followup'
  | 'new_dealer_prospect'
  | 'crop_inspection'
  | 'recovery_visit'
  | 'office_work'
  | 'other';

export interface DailyActivity {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  activityType: ActivityType;
  dealerId?: string;
  dealerName?: string;
  farmerOrPersonName: string;
  contactNumber: string;
  village: string;
  taluka: string;
  district: string;
  purpose: string;
  discussionSummary: string;
  cropName?: string;
  productsDiscussed?: string[];
  orderBooked: boolean;
  orderValueRs?: number;
  paymentCollected: boolean;
  paymentAmountRs?: number;
  collectionMode?: 'cash' | 'cheque' | 'online_upi';
  nextFollowUpDate?: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  remarks?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  actionMr: string;
  module: string;
  details: string;
}

export type NavTab = 
  | 'dashboard'
  | 'daily-activity'
  | 'order-calculator'
  | 'target-sheet'
  | 'price-list'
  | 'dealer-form'
  | 'travel-expenses'
  | 'user-management'
  | 'order-collection'
  | 'scheme'
  | 'reporting'
  | 'settings';
