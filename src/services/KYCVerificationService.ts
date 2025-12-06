
import { supabase } from "@/integrations/supabase/client";

export interface KYCStatus {
  level: 'none' | 'basic' | 'intermediate' | 'advanced';
  identityVerified: boolean;
  addressVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  amlStatus: 'pending' | 'approved' | 'rejected';
  riskScore: number;
  tradingLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    positionLimit: number;
  };
  lastVerificationDate?: Date;
  expiryDate?: Date;
}

export interface KYCDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  uploadedAt: Date;
}

export class KYCVerificationService {
  static async getKYCStatus(userId: string): Promise<KYCStatus | null> {
    try {
      // Get KYC verification data
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get account details
      const { data: accountData, error: accountError } = await supabase
        .from('account_details')
        .select('*')
        .eq('id', userId)
        .single();

      if (kycError && kycError.code !== 'PGRST116') throw kycError;
      if (accountError) throw accountError;

      // If no KYC record exists, create default status
      if (!kycData) {
        return {
          level: 'none',
          identityVerified: false,
          addressVerified: false,
          phoneVerified: accountData?.is_phone_verified || false,
          emailVerified: accountData?.is_email_verified || false,
          amlStatus: 'pending',
          riskScore: 0,
          tradingLimits: {
            dailyLimit: 0,
            monthlyLimit: 0,
            positionLimit: 0
          }
        };
      }

      // Determine verification level based on checks
      let level: KYCStatus['level'] = 'none';
      if (kycData.identity_verified && kycData.address_verified) {
        level = 'advanced';
      } else if (kycData.identity_verified || kycData.address_verified) {
        level = 'intermediate';
      } else if (kycData.phone_verified || kycData.email_verified) {
        level = 'basic';
      }

      // Set trading limits based on verification level
      const tradingLimits = this.getTradingLimitsByLevel(level);

      return {
        level,
        identityVerified: kycData.identity_verified || false,
        addressVerified: kycData.address_verified || false,
        phoneVerified: kycData.phone_verified || false,
        emailVerified: kycData.email_verified || false,
        amlStatus: kycData.aml_status as 'pending' | 'approved' | 'rejected',
        riskScore: kycData.risk_score || 0,
        tradingLimits,
        lastVerificationDate: kycData.last_verification_date ? new Date(kycData.last_verification_date) : undefined
      };
    } catch (error) {
      console.error('Error fetching KYC status:', error);
      return null;
    }
  }

  static async submitDocument(
    userId: string,
    documentType: string,
    file: File
  ): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      // For demo purposes, we'll just record the document without actual file upload
      const { data, error } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: userId,
          document_type: documentType,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          file_path: `/mock/${file.name}`, // Mock path
          verification_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        documentId: data.id
      };
    } catch (error) {
      console.error('Error submitting document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getDocuments(userId: string): Promise<KYCDocument[]> {
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(doc => ({
        id: doc.id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        status: doc.verification_status as 'pending' | 'approved' | 'rejected',
        rejectionReason: doc.rejection_reason || undefined,
        uploadedAt: new Date(doc.created_at)
      }));
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  static async updateVerificationStatus(
    userId: string,
    verificationType: keyof Pick<KYCStatus, 'identityVerified' | 'addressVerified' | 'phoneVerified' | 'emailVerified'>,
    verified: boolean
  ): Promise<boolean> {
    try {
      const columnMap = {
        identityVerified: 'identity_verified',
        addressVerified: 'address_verified',
        phoneVerified: 'phone_verified',
        emailVerified: 'email_verified'
      };

      // Try to update existing record
      const { error } = await supabase
        .from('kyc_verifications')
        .update({
          [columnMap[verificationType]]: verified,
          last_verification_date: new Date().toISOString()
        })
        .eq('user_id', userId);

      // If no record exists, create one
      if (error && error.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('kyc_verifications')
          .insert({
            user_id: userId,
            [columnMap[verificationType]]: verified,
            last_verification_date: new Date().toISOString()
          });

        if (insertError) throw insertError;
      } else if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating verification status:', error);
      return false;
    }
  }

  private static getTradingLimitsByLevel(level: KYCStatus['level']): KYCStatus['tradingLimits'] {
    switch (level) {
      case 'advanced':
        return {
          dailyLimit: 100000,
          monthlyLimit: 1000000,
          positionLimit: 50000
        };
      case 'intermediate':
        return {
          dailyLimit: 25000,
          monthlyLimit: 100000,
          positionLimit: 10000
        };
      case 'basic':
        return {
          dailyLimit: 5000,
          monthlyLimit: 20000,
          positionLimit: 2000
        };
      default:
        // Demo mode - allow trading with limited amounts for new users
        return {
          dailyLimit: 1000,
          monthlyLimit: 5000,
          positionLimit: 500
        };
    }
  }
}
