import { supabase } from "@/integrations/supabase/client";
import { devConsole } from "@/utils/consoleCleanup";
import { EnhancedStorageService } from "./EnhancedStorageService";

export interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  filePath?: string;
  error?: string;
}

export class RealFileUploadService {
  static async uploadKYCDocument(
    userId: string,
    file: File,
    documentType: string
  ): Promise<FileUploadResult> {
    try {
      // Use enhanced storage service with validation and logging
      const uploadResult = await EnhancedStorageService.uploadFile(
        'kyc-documents',
        file,
        userId,
        {
          path: `${userId}/${documentType}_${Date.now()}.${file.name.split('.').pop()}`,
          category: 'documents',
          isPublic: false
        }
      );

      if (!uploadResult.success) {
        return uploadResult;
      }

      // Save document record to database
      const { data: docData, error: docError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: userId,
          document_type: documentType,
          file_path: uploadResult.filePath!,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          verification_status: 'pending'
        })
        .select()
        .single();

      if (docError) throw docError;

      return {
        success: true,
        fileUrl: uploadResult.fileUrl,
        filePath: uploadResult.filePath
      };
    } catch (error) {
      devConsole.error('Error uploading KYC document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  static async uploadBusinessDocument(
    businessId: string,
    file: File,
    documentType: string
  ): Promise<FileUploadResult> {
    try {
      // Use enhanced storage service
      const uploadResult = await EnhancedStorageService.uploadFile(
        'business_documents',
        file,
        businessId, // Using businessId as userId for logging
        {
          path: `business/${businessId}/${documentType}_${Date.now()}.${file.name.split('.').pop()}`,
          category: 'documents',
          isPublic: false
        }
      );

      if (!uploadResult.success) {
        return uploadResult;
      }

      // Save document record to database
      const { data: docData, error: docError } = await supabase
        .from('business_documents')
        .insert({
          business_id: businessId,
          document_type: documentType as any, // Type assertion for flexibility
          file_path: uploadResult.filePath!
        })
        .select()
        .single();

      if (docError) throw docError;

      return {
        success: true,
        fileUrl: uploadResult.fileUrl,
        filePath: uploadResult.filePath
      };
    } catch (error) {
      devConsole.error('Error uploading business document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  static async getUserDocuments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      devConsole.error('Error fetching user documents:', error);
      return [];
    }
  }

  static async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get document details first
      const { data: doc, error: fetchError } = await supabase
        .from('kyc_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('kyc-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('kyc_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      return { success: true };
    } catch (error) {
      devConsole.error('Error deleting document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }
}