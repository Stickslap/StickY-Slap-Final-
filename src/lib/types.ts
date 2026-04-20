
export type UserRole = "Owner" | "Admin" | "Ops Manager" | "Production" | "Support" | "Content" | "Read-only" | "Customer" | "Vendor";

export type AccountTier = 'Standard' | 'Gold' | 'Platinum' | 'Elite';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  isPrintShop?: boolean;
  printShopDetails?: {
    businessName: string;
    specialty: string;
    monthlyVolume: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  role?: UserRole;
  accountTier?: AccountTier;
  storeCredit?: number;
  verificationStatus?: VerificationStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
  preferences?: {
    density?: 'standard' | 'compact';
    theme?: string;
    language?: string;
    timezone?: string;
    notifications?: Record<string, boolean>;
  };
}

export interface Role {
  id: string;
  role: UserRole;
}

export type OrderStatus = 
  | "Draft" 
  | "PendingPayment"
  | "Submitted" 
  | "Proofing" 
  | "Approved" 
  | "Rejected"
  | "In Production" 
  | "QC" 
  | "Ready" 
  | "Shipped" 
  | "Delivered" 
  | "Closed" 
  | "On Hold" 
  | "Cancelled" 
  | "Refunded";

export interface Order {
  id: string;
  userId: string; 
  customerEmail: string;
  customerName?: string;
  status: OrderStatus;
  items: OrderItem[];
  pricing: PricingBreakdown;
  shippingDetails: ShippingDetails;
  billingDetails?: ShippingDetails;
  paymentMethod?: string;
  checkoutInfo?: Record<string, any>;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  supportTicketIds?: string[];
  
  proofs?: Proof[];
  proofApproval?: {
    approvedByUid: string;
    approvedByEmail: string;
    approvedAt: string;
    comment?: string;
  };

  trackingNumbers?: TrackingInfo[];
  shippingUpdates?: ShippingUpdate[];
  
  shippingOptionId?: string;
  estimate?: ShippingEstimate;
  shippedAt?: string;
  deliveredAt?: string;
  contractSignature?: DigitalSignature;
  metadata?: {
    isImported?: boolean;
    [key: string]: any;
  };
}

export interface DigitalSignature {
  fullName: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  signedAt: string;
  contractVersion: string;
  billingAddress: string;
  shippingAddress: string;
  agreementText: string;
}

export interface Proof {
  id: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  version: number;
  status: 'pendingApproval' | 'approved' | 'rejected';
  feedback?: string;
}

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  addedAt: string;
}

export interface ShippingUpdate {
  message: string;
  status: string;
  createdAt: string;
}

export interface ShippingEstimate {
  processingDaysMin: number;
  processingDaysMax: number;
  transitDaysMin: number;
  transitDaysMax: number;
  estimatedShipDateMin: string;
  estimatedShipDateMax: string;
  estimatedDeliveryDateMin: string;
  estimatedDeliveryDateMax: string;
  version: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  options: Record<string, string | number>;
  artworkUrl?: string;
  productThumbnail?: string;
  proofUrl?: string;
}

export interface PricingBreakdown {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface ShippingDetails {
  address: string;
  city: string;
  state: string;
  zip: string;
  method: string;
  trackingNumber?: string;
  carrier?: string;
  service?: string;
  phone?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  customerEmail: string;
  orderId?: string;
  message: string;
  category: "Damaged Item" | "Artwork Submission" | "General Inquiry" | "Shipping Issue";
  fileUrls: string[];
  status: "open" | "closed" | "pending" | "Waiting" | "Resolved";
  createdAt: string;
  updatedAt: string;
  messages?: SupportMessage[];
  assignedAgent?: string;
  subject?: string;
  priority?: string;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  isAdmin: boolean;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  title: string;
  url: string;
  type: 'Image' | 'Video' | 'Document' | 'Archive';
  category: string;
  isPublic: boolean;
  description: string;
  fileSize?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'poll';
  content?: string; 
  url?: string; 
  caption?: string;
  provider?: 'youtube' | 'vimeo' | 'tiktok';
  question?: string;
  options?: { id: string; label: string; votes: number }[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: BlogBlock[];
  featuredImage?: string;
  authorId: string;
  authorName: string;
  status: 'Draft' | 'Published' | 'Archived';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: BlogBlock[];
  status: 'Draft' | 'Published';
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
  isDefault: boolean;
  pricing: {
    strategy: 'Flat' | 'Subtotal' | 'Weight';
    baseRate: number;
    freeThreshold: number;
    tiers: { min: number; max: number; price: number }[];
  };
  transit: {
    minDays: number;
    maxDays: number;
    carrier: string;
    service: string;
  };
  processing: {
    minDays: number;
    maxDays: number;
    rushEnabled: boolean;
    rushMinDays?: number;
    rushMaxDays?: number;
    startRule: 'Immediate' | 'Payment' | 'Proof' | 'Artwork';
  };
  rules: {
    allowedTypes: ('Ship' | 'Pickup')[];
    domesticOnly: boolean;
    allowedProductIds?: string[];
    allowedCategories?: string[];
  };
  cutoffTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingSettings {
  businessDays: number[];
  holidays: string[];
  defaultCutoffTime: string;
  timezone: string;
}

export interface CheckoutField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'number' | 'textarea';
  placeholder?: string;
  required: boolean;
  options?: string[]; 
  order: number;
}

export interface CheckoutSettings {
  fields: CheckoutField[];
  theme: 'light' | 'dark';
  updatedAt: string;
}

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  status: 'Draft' | 'Active' | 'Scheduled' | 'Paused';
  priority: number;
  stackBehavior: 'Stackable' | 'Exclusive';
  scope: {
    type: 'Global' | 'Category' | 'Product';
    targetIds: string[];
  };
  conditions: PricingCondition[];
  effects: PricingEffect[];
  createdAt: string;
  updatedAt: string;
}

export interface PricingCondition {
  id: string;
  type: 'Quantity' | 'Option' | 'Rush' | 'Subtotal' | 'CustomerSegment';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
  value: any;
}

export interface PricingEffect {
  id: string;
  type: 'Percent' | 'Fixed' | 'Multiplier' | 'OverrideUnitPrice' | 'WaiveFee';
  target: 'Base' | 'Option' | 'Rush' | 'Setup' | 'Total';
  value: number;
}

export interface Discount {
  id: string;
  name: string;
  label: string;
  description: string;
  status: 'Draft' | 'Active' | 'Scheduled' | 'Paused' | 'Archived' | 'Expired';
  priority: number;
  type: 'Percent' | 'Fixed' | 'Tiered' | 'FreeShipping' | 'RushDiscount' | 'SetupWaiver';
  value: number;
  scope: 'Order' | 'LineItem';
  targets: ('Product' | 'Options' | 'Rush' | 'Setup' | 'Shipping')[];
  rules: {
    includeProducts: string[];
    excludeProducts: string[];
    includeCategories: string[];
    excludeCategories: string[];
    customerSegments: string[];
    minOrderSubtotal: number;
    minItemSubtotal: number;
    minItemQuantity: number;
    shippingMethods: string[];
    domesticOnly: boolean;
  };
  mode: 'Code' | 'Auto';
  code?: string;
  limits: {
    maxTotalUses: number;
    maxPerCustomer: number;
    oneTimeUse: boolean;
    stackable: boolean;
    maxDiscountAmount: number;
  };
  startAt?: string;
  endAt?: string;
  stats?: {
    totalUses: number;
    totalSaved: number;
    revenueInfluenced: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type ProductSegment = 'DTF' | 'Screen Printing' | 'Vinyl Printing' | 'Roll Printing';

export interface RollInventoryUnit {
  id: string;
  originalYards: number;
  remainingYards: number;
  status: 'full' | 'partial' | 'depleted';
  dateAdded: string;
  trait?: string; // e.g. "15-inch", "Premium", "Gloss White"
}

export interface YardTierPrice {
  id: string;
  minYards: number;
  pricePerYard: number;
}

export interface RollPreset {
  id: string;
  label: string;
  yards: number;
  price: number;
}

export interface RollSizeConfig {
  id: string;
  label: string;
  fullRollYards: number;
  fullRollPrice: number;
  baseYardPrice: number;
  allowYardage: boolean;
  inventoryTrait: string;
  inventoryCount?: number; 
  maxYardage?: number;
  vinylFinish?: string;
}

export interface ProductionSpecs {
  showChart: boolean;
  outdoorLife: string;
  thickness: string;
  pressureSensitive: boolean;
  airRelease: boolean;
  compatibility: {
    ecoSolvent: boolean;
    latex: boolean;
    solvent: boolean;
    uvInk: boolean;
    regularInkjet: boolean;
  };
}

export interface ProductTemplate {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  status: 'Draft' | 'Active' | 'Archived';
  segment: ProductSegment;
  uiTemplate?: 'Standard' | 'Rolls / DTF';
  subtype?: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  isFeatured: boolean;
  images: string[];
  imageURLs?: string[]; 
  thumbnail: string;
  optionGroups: OptionGroup[];
  pricingModel: {
    basePrice: number;
    tiers: { min: number; price: number }[];
    minPrice: number;
    costPerUnit: number;
  };
  productionSpecs?: ProductionSpecs;
  marketing?: {
    qualityPromiseTitle: string;
    qualityPromiseDescription: string;
    qualityPromiseButtonText: string;
    qualityPromiseButtonLink: string;
  };
  segmentConfig?: {
    dtf?: {
      baseRatePerSqIn: number;
      setupFee: number;
      setupFeeThreshold: number;
      hotPeelModifier: number;
      gangSheetPrice: number;
    };
    screen?: {
      baseGarmentPrice: number;
      printPricePerColor: number;
      setupFeePerColor: number;
      screenFee: number;
    };
    vinyl?: {
      basePricePerSqFt?: number; 
      minAreaSqIn?: number; 
      measurementUnit: 'inches';
      pricingModel: 'square_inches';
      presetSizes: { 
        label: string; 
        width: number; 
        height: number;
        price?: number;
        discount?: number;
        imageUrl?: string;
      }[];
      customSizeEnabled: boolean;
      minSize: number;
      maxSize: number;
      shapeOptions: { id: string; name: string; multiplier: number; thumbnail?: string }[];
      materialOptions: { id: string; name: string; description: string; baseRatePerSqIn: number; multiplier: number; thumbnail?: string }[];
      laminateOptions: { id: string; name: string; multiplier: number; thumbnail?: string }[];
      smartQuantityTiers: { min: number; max: number | null; discountMultiplier: number }[];
    };
    roll?: {
      displayType?: 'panels' | 'dropdown';
      sellByRoll: boolean;
      sellByYard: boolean;
      yardsPerRoll: number;
      costPerRoll: number;
      pricePerRoll: number;
      basePricePerYard: number;
      tierPricing: YardTierPrice[];
      rollPresets: RollPreset[];
      rollSizes: RollSizeConfig[];
      inventory: RollInventoryUnit[];
      lowInventoryThreshold: number;
    };
  };
  videoSection?: {
    url: string;
    thumbnailUrl: string;
    title?: string;
    tagline?: string;
    description: string;
    isActive: boolean;
    autoPlay?: boolean;
    loop?: boolean;
    badge1?: string;
    badge2?: string;
  };
  artworkRequirements: {
    required: boolean;
    acceptedFormats: string[];
    minDpi: number;
    bleed: string;
    safeArea: string;
    maxFileSizeMb: number;
    filesCount: number;
    hasDesignServices: boolean;
    templateUrls: string[];
  };
  proofing: {
    required: boolean;
    proofType: 'PDF' | 'JPG' | 'PNG';
  };
  production: {
    turnaroundDays: number;
    hasRushOption: boolean;
    rushSurchargePercent: number;
    internalNotes: string;
    packagingNotes: string;
    shippingEligibility: 'Ship' | 'Pickup' | 'Both';
    department: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OptionGroup {
  id: string;
  name: string;
  displayType: 'buttons' | 'dropdown' | 'radio';
  isRequired: boolean;
  helpText?: string;
  defaultSelectionId?: string;
  options: OptionValue[];
}

export interface OptionValue {
  id: string;
  label: string;
  code: string;
  imageUrl?: string;
  priceImpact: {
    type: 'fixed' | 'percent' | 'multiplier';
    value: number;
  };
  inventoryTrait?: string; 
  isActive: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface FAQSettings {
  items: FAQItem[];
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  order: number;
}

export interface TeamSettings {
  members: TeamMember[];
  updatedAt: string;
}

export interface PartnerLogo {
  id: string;
  name: string;
  imageUrl: string;
  order: number;
}

export interface AboutSettings {
  mission: {
    title: string;
    tagline: string;
    description1: string;
    description2: string;
    videoUrl: string;
    videoThumbnailUrl?: string;
    highlights: string[];
  };
  partners: PartnerLogo[];
  updatedAt: string;
}

export interface ContactSettings {
  directLines: {
    email: string;
    phone: string;
    address: string;
  };
  officeHours: {
    mondayFriday: string;
    saturday: string;
    sunday: string;
  };
  socials: {
    instagram: string;
    twitter: string;
  };
  connectSection?: {
    title: string;
    description: string;
  };
  updatedAt: string;
}

export interface LandingSettings {
  heroSection: {
    title: string;
    tagline: string;
    description: string;
    buttonText: string;
    isActive: boolean;
  };
  videoSection: {
    title: string;
    tagline: string;
    description: string;
    buttonText: string;
    videoUrl: string;
    thumbnailUrl: string;
    isActive: boolean;
    backgroundStyle: 'light' | 'dark';
  };
  featuredImage: string;
  updatedAt: string;
}

export interface CatalogSettings {
  title: string;
  tagline: string;
  description: string;
  backgroundStyle: 'light' | 'dark';
  updatedAt: string;
}

export interface BlogSettings {
  title: string;
  tagline: string;
  description: string;
  backgroundStyle: 'light' | 'dark';
  updatedAt: string;
}

export interface ShareableLink {
  id: string;
  shortCode: string;
  fullUrl?: string;
  targetEntityId: string;
  targetEntityType: 'Proof' | 'Artwork' | 'Cart' | 'DesignLibraryEntry' | 'Onboarding';
  creatorId: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  accessCount: number;
  description?: string;
}

export interface NewsletterSettings {
  title: string;
  description: string;
  buttonText: string;
  placeholder: string;
  updatedAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}

export type EmailTemplateTrigger = 
  | 'order_confirmed'
  | 'order_status_changed'
  | 'artwork_submitted'
  | 'artwork_approved'
  | 'artwork_rejected'
  | 'payment_received'
  | 'order_shipped'
  | 'order_ready'
  | 'proof_reminder'
  | 'order_completed'
  | 'order_refunded'
  | 'order_cancelled'
  | 'support_reply'
  | 'ticket_received'
  | 'welcome_member';

export interface EmailBlock {
  id: string;
  type: 'logo' | 'text' | 'image' | 'divider' | 'button' | 'product_list' | 'order_summary' | 'countdown' | 'artwork_preview' | 'customer_info';
  content?: string; 
  url?: string; 
  label?: string; 
  link?: string; 
  alignment?: 'left' | 'center' | 'right';
  style?: Record<string, any>;
  timerLabel?: string;
  endDateSource?: 'dynamic' | 'fixed';
  endDateFixed?: string;
  color?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  trigger: EmailTemplateTrigger;
  subject: string;
  previewText: string;
  senderName: string;
  replyTo: string;
  enabled: boolean;
  header: {
    logoUrl?: string;
    bgColor?: string;
    text?: string;
    navLinks?: { label: string; url: string }[];
  };
  blocks: EmailBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName: string;
  websiteUrl: string;
  websiteTraffic: string;
  annualRevenue: string;
  currentPlatform: string;
  printingField: string;
  customBuildBudget: string;
  appointmentDate: string | null;
  assignedStaffId?: string;
  assignedStaffName?: string;
  notes?: string;
  activityLog?: {
    action: string;
    staffName: string;
    timestamp: string;
    details?: string;
  }[];
  status: "New" | "Contacted" | "Call Scheduled" | "Qualified" | "Unqualified" | "Onboarding" | "Live" | "Partner Active";
  onboarding?: {
    tier?: 'Tier A' | 'Tier B';
    status?: 'Pending' | 'In-Progress' | 'Completed';
    migrationSource?: string;
    trialStartDate?: string;
    paymentToken?: string;
    lastFour?: string;
    isTrialActive?: boolean;
    buildFeeCharged?: boolean;
    membershipStarted?: boolean;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface ClientProof {
  id: string;
  customerEmail: string;
  customerName?: string;
  projectName: string;
  fileUrl: string;
  fileName: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejectionReason?: string;
  shareableLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorProduct {
  id: string;
  vendorId: string;
  name: string;
  size: string;
  materialType?: 'Vinyl' | 'Banner' | 'Cast' | 'Lamination' | 'Other';
  thickness?: string;
  adhesiveType?: string;
  feetPerRoll: number;
  pricePerRoll: number;
  quantityAvailable: number;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  unitType: 'roll' | 'sheet' | 'piece' | 'pack' | 'yard' | 'kg' | 'ml';
  quantityOnHand: number;
  costPerUnit: number;
  sellingPricePerUnit: number;
  purchaseDate: string;
  reorderLevel: number;
  location: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedProductCosting {
  id: string; 
  productId: string;
  variantId?: string; 
  isLinked: boolean;
  laborCost: number; 
  laborHours?: number; 
  hourlyRate?: number; 
  packagingCost: number;
  shippingCost: number;
  platformFee: number;
  paymentFee: number;
  otherFees: number;
  overheadAllocationRate?: number; 
  targetProfitMargin: number; 
  createdAt: string;
  updatedAt: string;
}

export interface MaterialUsage {
  id: string;
  productId: string;
  variantId?: string;
  materialId: string;
  quantityRequired: number;
  wastePercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitReport {
  id: string;
  periodType: 'Month' | 'Quarter' | 'Year' | 'Custom';
  startDate: string;
  endDate: string;
  totals: {
    revenue: number;
    cogs: number;
    materials: number;
    shipping: number;
    packaging: number;
    labor: number;
    fees: number;
    refunds: number;
    expenses: number;
    netProfit: number;
  };
  createdAt: string;
}
