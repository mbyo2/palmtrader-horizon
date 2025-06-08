
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface KYCDocument {
  id: string;
  document_type: "passport" | "drivers_license" | "national_id" | "proof_of_address" | "bank_statement" | "utility_bill";
  file_path: string;
  file_name: string;
  verification_status: "pending" | "approved" | "rejected" | "under_review";
  rejection_reason?: string;
}

export interface KYCVerification {
  id: string;
  user_id: string;
  verification_level: "none" | "basic" | "enhanced" | "premium";
  identity_verified: boolean;
  address_verified: boolean;
  phone_verified: boolean;
  email_verified: boolean;
  risk_score: number;
  aml_status: "pending" | "clear" | "flagged" | "blocked";
  sanctions_check: boolean;
  pep_check: boolean;
}

export interface DocumentUploadResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export class KYCService {
  // Upload KYC document
  static async uploadDocument(
    userId: string,
    file: File,
    documentType: KYCDocument["document_type"]
  ): Promise<DocumentUploadResult> {
    try {
      // Validate file
      if (!this.validateDocument(file, documentType)) {
        return { success: false, error: "Invalid document format or size" };
      }

      // Upload file to storage
      const fileName = `${userId}/${documentType}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: document, error: docError } = await supabase
        .from("kyc_documents")
        .insert({
          user_id: userId,
          document_type: documentType,
          file_path: uploadData.path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        })
        .select("id")
        .single();

      if (docError) throw docError;

      // Trigger automated verification
      await this.processDocumentVerification(document.id, uploadData.path);

      return { success: true, documentId: document.id };
    } catch (error) {
      console.error("Document upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Document upload failed"
      };
    }
  }

  private static validateDocument(file: File, documentType: string): boolean {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) return false;

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    return allowedTypes.includes(file.type);
  }

  private static async processDocumentVerification(documentId: string, filePath: string) {
    try {
      // Simulate automated document verification (OCR, AI analysis)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock verification result (85% success rate)
      const isVerified = Math.random() > 0.15;
      const status = isVerified ? "approved" : "rejected";
      const rejectionReason = !isVerified ? "Document quality insufficient or information unclear" : null;

      await supabase
        .from("kyc_documents")
        .update({
          verification_status: status,
          rejection_reason: rejectionReason,
          verified_at: isVerified ? new Date().toISOString() : null
        })
        .eq("id", documentId);

      // Update overall KYC status if document approved
      if (isVerified) {
        await this.updateKYCVerificationStatus(documentId);
      }
    } catch (error) {
      console.error("Document verification error:", error);
    }
  }

  private static async updateKYCVerificationStatus(documentId: string) {
    try {
      // Get document details
      const { data: document } = await supabase
        .from("kyc_documents")
        .select("user_id, document_type")
        .eq("id", documentId)
        .single();

      if (!document) return;

      // Get all approved documents for user
      const { data: approvedDocs } = await supabase
        .from("kyc_documents")
        .select("document_type")
        .eq("user_id", document.user_id)
        .eq("verification_status", "approved");

      const docTypes = new Set(approvedDocs?.map(d => d.document_type) || []);

      // Determine verification level based on approved documents
      let verificationLevel: KYCVerification["verification_level"] = "none";
      let identityVerified = false;
      let addressVerified = false;

      if (docTypes.has("passport") || docTypes.has("drivers_license") || docTypes.has("national_id")) {
        identityVerified = true;
        verificationLevel = "basic";
      }

      if (docTypes.has("proof_of_address") || docTypes.has("utility_bill") || docTypes.has("bank_statement")) {
        addressVerified = true;
        if (identityVerified) verificationLevel = "enhanced";
      }

      if (identityVerified && addressVerified && docTypes.size >= 3) {
        verificationLevel = "premium";
      }

      // Update or create KYC verification record
      await supabase
        .from("kyc_verifications")
        .upsert({
          user_id: document.user_id,
          verification_level: verificationLevel,
          identity_verified: identityVerified,
          address_verified: addressVerified,
          last_verification_date: new Date().toISOString()
        });

      // Trigger compliance checks
      await this.runComplianceChecks(document.user_id);
    } catch (error) {
      console.error("KYC status update error:", error);
    }
  }

  private static async runComplianceChecks(userId: string) {
    try {
      // Simulate AML, sanctions, and PEP checks
      await new Promise(resolve => setTimeout(resolve, 3000));

      const riskScore = Math.floor(Math.random() * 30); // Most users are low risk
      const amlStatus = riskScore > 20 ? "flagged" : "clear";
      const sanctionsCheck = riskScore < 25; // 95% pass sanctions
      const pepCheck = riskScore < 28; // 90% pass PEP check

      await supabase
        .from("kyc_verifications")
        .update({
          risk_score: riskScore,
          aml_status: amlStatus,
          sanctions_check: sanctionsCheck,
          pep_check: pepCheck
        })
        .eq("user_id", userId);

      // Create compliance event if flagged
      if (amlStatus === "flagged" || !sanctionsCheck || !pepCheck) {
        await supabase.from("compliance_events").insert({
          user_id: userId,
          event_type: "aml_check",
          event_data: { risk_score: riskScore, sanctions_check: sanctionsCheck, pep_check: pepCheck },
          risk_level: riskScore > 25 ? "high" : "medium"
        });
      }
    } catch (error) {
      console.error("Compliance check error:", error);
    }
  }

  // Get user's KYC status
  static async getKYCStatus(userId: string): Promise<KYCVerification | null> {
    try {
      const { data, error } = await supabase
        .from("kyc_verifications")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      console.error("Error fetching KYC status:", error);
      return null;
    }
  }

  // Get user's KYC documents
  static async getKYCDocuments(userId: string): Promise<KYCDocument[]> {
    try {
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching KYC documents:", error);
      return [];
    }
  }

  // Verify phone number
  static async verifyPhoneNumber(userId: string, phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Simulate SMS verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock verification (90% success rate)
      const success = Math.random() > 0.1;
      
      if (success) {
        await supabase
          .from("kyc_verifications")
          .upsert({
            user_id: userId,
            phone_verified: true
          });
      }

      return { success, error: success ? undefined : "Phone verification failed" };
    } catch (error) {
      console.error("Phone verification error:", error);
      return { success: false, error: "Phone verification failed" };
    }
  }

  // Generate tax documents
  static async generateTaxDocument(userId: string, taxYear: number, documentType: string) {
    try {
      // Get user's trading data for the tax year
      const { data: trades } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", `${taxYear}-01-01`)
        .lt("created_at", `${taxYear + 1}-01-01`);

      // Generate tax document (simplified)
      const taxData = this.calculateTaxData(trades || []);
      
      // Create tax document record
      const { data: taxDoc, error } = await supabase
        .from("tax_documents")
        .insert({
          user_id: userId,
          tax_year: taxYear,
          document_type: documentType,
          status: "generated",
          generated_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (error) throw error;

      return { success: true, documentId: taxDoc.id, taxData };
    } catch (error) {
      console.error("Tax document generation error:", error);
      return { success: false, error: "Failed to generate tax document" };
    }
  }

  private static calculateTaxData(trades: any[]) {
    // Simplified tax calculation
    let totalGains = 0;
    let totalLosses = 0;
    let dividends = 0;

    trades.forEach(trade => {
      if (trade.type === "sell") {
        const gain = (trade.price - trade.average_price) * trade.shares;
        if (gain > 0) totalGains += gain;
        else totalLosses += Math.abs(gain);
      }
    });

    return {
      total_gains: totalGains,
      total_losses: totalLosses,
      net_gains: totalGains - totalLosses,
      dividends,
      trades_count: trades.length
    };
  }
}
