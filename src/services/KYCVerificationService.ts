
import { supabase } from "@/integrations/supabase/client";

export interface KYCDocument {
  id: string;
  documentType: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
  fileName: string;
  filePath: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
}

export interface KYCStatus {
  level: 'none' | 'basic' | 'intermediate' | 'advanced';
  identityVerified: boolean;
  addressVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  documentsRequired: string[];
  tradingLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    positionLimit: number;
  };
}

export interface IdentityVerificationData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phoneNumber: string;
  email: string;
  occupation: string;
  sourceOfIncome: string;
  investmentExperience: 'none' | 'beginner' | 'intermediate' | 'advanced';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
}

export class KYCVerificationService {
  static async getKYCStatus(userId: string): Promise<KYCStatus> {
    try {
      const { data: verification, error } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (!verification) {
        return this.getDefaultKYCStatus();
      }

      const level = this.determineKYCLevel(verification);
      const tradingLimits = this.getTradingLimits(level);

      return {
        level,
        identityVerified: verification.identity_verified || false,
        addressVerified: verification.address_verified || false,
        phoneVerified: verification.phone_verified || false,
        emailVerified: verification.email_verified || false,
        documentsRequired: this.getRequiredDocuments(level),
        tradingLimits
      };
    } catch (error) {
      console.error('Error fetching KYC status:', error);
      return this.getDefaultKYCStatus();
    }
  }

  static async submitIdentityData(userId: string, data: IdentityVerificationData): Promise<{ success: boolean; error?: string }> {
    try {
      // Update account details
      const { error: accountError } = await supabase
        .from('account_details')
        .upsert({
          id: userId,
          first_name: data.firstName,
          last_name: data.lastName,
          date_of_birth: data.dateOfBirth,
          phone_number: data.phoneNumber
        });

      if (accountError) throw accountError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phoneNumber,
          investment_experience: data.investmentExperience,
          risk_tolerance: data.riskTolerance
        });

      if (profileError) throw profileError;

      // Create or update KYC verification record
      const { error: kycError } = await supabase
        .from('kyc_verifications')
        .upsert({
          user_id: userId,
          verification_level: 'basic',
          email_verified: true, // Assuming email is verified during signup
          last_verification_date: new Date().toISOString()
        });

      if (kycError) throw kycError;

      return { success: true };
    } catch (error) {
      console.error('Error submitting identity data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit identity data'
      };
    }
  }

  static async uploadDocument(
    userId: string,
    file: File,
    documentType: KYCDocument['documentType']
  ): Promise<{ success: boolean; documentId?: string; error?: string }> {
    try {
      // Upload file to Supabase storage
      const fileName = `${userId}/${documentType}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Record document in database
      const { data: documentData, error: documentError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: userId,
          document_type: documentType,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          verification_status: 'pending'
        })
        .select('id')
        .single();

      if (documentError) throw documentError;

      return {
        success: true,
        documentId: documentData.id
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document'
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

      return data.map(doc => ({
        id: doc.id,
        documentType: doc.document_type as KYCDocument['documentType'],
        fileName: doc.file_name,
        filePath: doc.file_path,
        status: doc.verification_status as KYCDocument['status'],
        uploadedAt: new Date(doc.created_at),
        verifiedAt: doc.verified_at ? new Date(doc.verified_at) : undefined,
        rejectionReason: doc.rejection_reason
      }));
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  static async verifyPhone(userId: string, phoneNumber: string, verificationCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, this would verify the code with a SMS service
      // For now, we'll simulate successful verification
      
      const { error } = await supabase
        .from('kyc_verifications')
        .upsert({
          user_id: userId,
          phone_verified: true,
          last_verification_date: new Date().toISOString()
        });

      if (error) throw error;

      // Update account details with verified phone
      await supabase
        .from('account_details')
        .update({
          phone_number: phoneNumber,
          is_phone_verified: true
        })
        .eq('id', userId);

      return { success: true };
    } catch (error) {
      console.error('Error verifying phone:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Phone verification failed'
      };
    }
  }

  private static getDefaultKYCStatus(): KYCStatus {
    return {
      level: 'none',
      identityVerified: false,
      addressVerified: false,
      phoneVerified: false,
      emailVerified: false,
      documentsRequired: ['passport', 'utility_bill'],
      tradingLimits: {
        dailyLimit: 0,
        monthlyLimit: 0,
        positionLimit: 0
      }
    };
  }

  private static determineKYCLevel(verification: any): KYCStatus['level'] {
    if (verification.identity_verified && verification.address_verified && verification.phone_verified) {
      return 'advanced';
    } else if (verification.identity_verified && verification.phone_verified) {
      return 'intermediate';
    } else if (verification.email_verified) {
      return 'basic';
    }
    return 'none';
  }

  private static getTradingLimits(level: KYCStatus['level']): KYCStatus['tradingLimits'] {
    switch (level) {
      case 'advanced':
        return {
          dailyLimit: 100000,
          monthlyLimit: 1000000,
          positionLimit: 500000
        };
      case 'intermediate':
        return {
          dailyLimit: 10000,
          monthlyLimit: 100000,
          positionLimit: 50000
        };
      case 'basic':
        return {
          dailyLimit: 1000,
          monthlyLimit: 10000,
          positionLimit: 5000
        };
      default:
        return {
          dailyLimit: 0,
          monthlyLimit: 0,
          positionLimit: 0
        };
    }
  }

  private static getRequiredDocuments(level: KYCStatus['level']): string[] {
    switch (level) {
      case 'none':
        return ['passport', 'utility_bill'];
      case 'basic':
        return ['passport', 'utility_bill'];
      case 'intermediate':
        return ['bank_statement'];
      case 'advanced':
        return [];
      default:
        return ['passport', 'utility_bill'];
    }
  }
}
