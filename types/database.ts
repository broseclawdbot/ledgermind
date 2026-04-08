export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  plan: "trial" | "starter" | "pro" | "business";
  trial_ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  entity_type: string;
  industry: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  type: "income" | "expense" | "transfer";
  parent_id: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface Upload {
  id: string;
  business_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  upload_id: string;
  business_id: string;
  user_id: string;
  vendor_name: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  transaction_type: "income" | "expense" | "transfer";
  ai_confidence: number;
  ai_reasoning: string | null;
  extracted_data: Record<string, unknown>;
  review_status: "pending" | "auto_approved" | "approved" | "rejected" | "corrected";
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  user_id: string;
  document_id: string | null;
  vendor_name: string | null;
  vendor_id: string | null;
  amount: number;
  date: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  transaction_type: "income" | "expense" | "transfer";
  source: "manual" | "upload" | "import";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategorizationRule {
  id: string;
  business_id: string;
  vendor_pattern: string;
  category_id: string;
  transaction_type: string;
  times_applied: number;
  source: "manual" | "ai_learned";
  is_active: boolean;
  created_at: string;
}
