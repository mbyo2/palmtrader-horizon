
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LocalBusiness {
  id: string;
  symbol: string;
  company_name: string;
  description: string | null;
  sector: string | null;
  verification_status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_additional_info';
  documents_submitted: boolean;
  financial_statements_submitted: boolean;
  share_capital: number;
  total_shares: number;
  public_shares_percentage: number;
  total_shareholders: number;
  profit_history: any;
  management_experience_details: string | null;
  corporate_governance_details: string | null;
  business_operations_details: string | null;
  sponsoring_broker: string | null;
  underwriter: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessDocument {
  id: string;
  business_id: string;
  document_type: 'incorporation_certificate' | 'tax_clearance' | 'pacra_certificate' | 'financial_statements' | 'memorandum_articles' | 'board_resolution' | 'share_register';
  file_path: string;
  notes: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  submitted_at: string;
}

export interface BusinessApplicationData {
  symbol: string;
  company_name: string;
  description?: string;
  sector?: string;
  share_capital: number;
  total_shares: number;
  public_shares_percentage: number;
  total_shareholders: number;
  management_experience_details?: string;
  corporate_governance_details?: string;
  business_operations_details?: string;
  sponsoring_broker?: string;
  underwriter?: string;
  profit_history?: any;
}

export class LocalBusinessService {
  // Submit business listing application
  static async submitBusinessApplication(applicationData: BusinessApplicationData): Promise<string | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("local_businesses")
        .insert({
          ...applicationData,
          submitted_by: user.user.id
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("Business application submitted successfully");
      return data.id;
    } catch (error) {
      console.error("Error submitting business application:", error);
      toast.error("Failed to submit business application");
      return null;
    }
  }

  // Get approved local businesses
  static async getApprovedBusinesses(): Promise<LocalBusiness[]> {
    try {
      const { data, error } = await supabase
        .from("local_businesses")
        .select("*")
        .eq("verification_status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LocalBusiness[];
    } catch (error) {
      console.error("Error fetching approved businesses:", error);
      return [];
    }
  }

  // Get user's submitted businesses
  static async getUserBusinesses(): Promise<LocalBusiness[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("local_businesses")
        .select("*")
        .eq("submitted_by", user.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LocalBusiness[];
    } catch (error) {
      console.error("Error fetching user businesses:", error);
      return [];
    }
  }

  // Get business details
  static async getBusinessDetails(businessId: string): Promise<LocalBusiness | null> {
    try {
      const { data, error } = await supabase
        .from("local_businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as LocalBusiness | null;
    } catch (error) {
      console.error("Error fetching business details:", error);
      return null;
    }
  }

  // Upload business document
  static async uploadBusinessDocument(
    businessId: string,
    file: File,
    documentType: BusinessDocument['document_type'],
    notes?: string
  ): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileName = `${businessId}/${documentType}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("business-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: docError } = await supabase
        .from("business_documents")
        .insert({
          business_id: businessId,
          document_type: documentType,
          file_path: uploadData.path,
          notes
        });

      if (docError) throw docError;

      toast.success("Document uploaded successfully");
      return true;
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
      return false;
    }
  }

  // Get business documents
  static async getBusinessDocuments(businessId: string): Promise<BusinessDocument[]> {
    try {
      const { data, error } = await supabase
        .from("business_documents")
        .select("*")
        .eq("business_id", businessId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return (data || []) as BusinessDocument[];
    } catch (error) {
      console.error("Error fetching business documents:", error);
      return [];
    }
  }

  // Check if business symbol is available
  static async isSymbolAvailable(symbol: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("local_businesses")
        .select("id")
        .eq("symbol", symbol.toUpperCase())
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !data;
    } catch (error) {
      console.error("Error checking symbol availability:", error);
      return false;
    }
  }

  // Get business listing requirements
  static getListingRequirements(): {
    financial: string[];
    documentation: string[];
    governance: string[];
  } {
    return {
      financial: [
        "Minimum share capital of K500,000",
        "At least 25% of shares offered to public",
        "Minimum 100 shareholders",
        "3 years of audited financial statements",
        "Profitable for at least 2 of the last 3 years"
      ],
      documentation: [
        "Certificate of Incorporation",
        "Tax Clearance Certificate",
        "PACRA Certificate",
        "Audited Financial Statements (3 years)",
        "Memorandum and Articles of Association",
        "Board Resolution for Listing",
        "Share Register"
      ],
      governance: [
        "Independent directors (minimum 2)",
        "Audit committee established",
        "Risk management framework",
        "Corporate governance policy",
        "Experienced management team"
      ]
    };
  }
}
