import { supabase } from "@/integrations/supabase/client";
import { devConsole } from "@/utils/consoleCleanup";
import { RateLimitService } from "./RateLimitService";

export interface StorageUploadResult {
  success: boolean;
  fileUrl?: string;
  filePath?: string;
  error?: string;
  fileId?: string;
}

export interface StorageAccessLog {
  bucket_name: string;
  file_path: string;
  action: 'upload' | 'download' | 'delete';
  file_size?: number;
  content_type?: string;
  success: boolean;
  error_message?: string;
}

export class EnhancedStorageService {
  private static readonly ALLOWED_MIME_TYPES = {
    documents: [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    images: [
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/webp',
      'image/gif'
    ]
  };

  private static readonly MAX_FILE_SIZES = {
    documents: 10 * 1024 * 1024, // 10MB
    images: 5 * 1024 * 1024, // 5MB
    general: 20 * 1024 * 1024 // 20MB
  };

  static async uploadFile(
    bucket: string,
    file: File,
    userId: string,
    options: {
      path?: string;
      category?: 'documents' | 'images' | 'general';
      isPublic?: boolean;
    } = {}
  ): Promise<StorageUploadResult> {
    const startTime = Date.now();
    
    try {
      // Rate limiting check
      const rateLimitResult = await RateLimitService.checkRateLimit('file_upload', userId);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: 'Upload rate limit exceeded. Please try again later.'
        };
      }

      // Validate file
      const validationResult = this.validateFile(file, options.category);
      if (!validationResult.valid) {
        await this.logStorageAccess({
          bucket_name: bucket,
          file_path: options.path || file.name,
          action: 'upload',
          file_size: file.size,
          content_type: file.type,
          success: false,
          error_message: validationResult.error
        }, userId);

        return {
          success: false,
          error: validationResult.error
        };
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const timestamp = Date.now();
      const fileName = options.path || `${userId}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get URL (public or signed)
      let fileUrl: string;
      if (options.isPublic) {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
        fileUrl = urlData.publicUrl;
      } else {
        const { data: urlData, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(fileName, 3600); // 1 hour expiry

        if (urlError) throw urlError;
        fileUrl = urlData.signedUrl;
      }

      // Log successful upload
      await this.logStorageAccess({
        bucket_name: bucket,
        file_path: fileName,
        action: 'upload',
        file_size: file.size,
        content_type: file.type,
        success: true
      }, userId);

      devConsole.log(`File uploaded successfully: ${fileName} (${Date.now() - startTime}ms)`);

      return {
        success: true,
        fileUrl,
        filePath: uploadData.path,
        fileId: uploadData.id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      
      await this.logStorageAccess({
        bucket_name: bucket,
        file_path: options.path || file.name,
        action: 'upload',
        file_size: file.size,
        content_type: file.type,
        success: false,
        error_message: errorMessage
      }, userId);

      devConsole.error('File upload failed:', error);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static async downloadFile(
    bucket: string,
    filePath: string,
    userId?: string
  ): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (error) throw error;

      await this.logStorageAccess({
        bucket_name: bucket,
        file_path: filePath,
        action: 'download',
        success: true
      }, userId);

      return { success: true, blob: data };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      
      await this.logStorageAccess({
        bucket_name: bucket,
        file_path: filePath,
        action: 'download',
        success: false,
        error_message: errorMessage
      }, userId);

      return { success: false, error: errorMessage };
    }
  }

  static async deleteFile(
    bucket: string,
    filePath: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;

      await this.logStorageAccess({
        bucket_name: bucket,
        file_path: filePath,
        action: 'delete',
        success: true
      }, userId);

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      
      await this.logStorageAccess({
        bucket_name: bucket,
        file_path: filePath,
        action: 'delete',
        success: false,
        error_message: errorMessage
      }, userId);

      return { success: false, error: errorMessage };
    }
  }

  static async getStorageUsage(userId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byBucket: Record<string, { files: number; size: number }>;
  }> {
    try {
      let query = supabase
        .from('storage_access_logs')
        .select('bucket_name, file_size')
        .eq('action', 'upload')
        .eq('success', true);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const usage = {
        totalFiles: 0,
        totalSize: 0,
        byBucket: {} as Record<string, { files: number; size: number }>
      };

      data?.forEach(log => {
        const size = log.file_size || 0;
        
        usage.totalFiles++;
        usage.totalSize += size;

        if (!usage.byBucket[log.bucket_name]) {
          usage.byBucket[log.bucket_name] = { files: 0, size: 0 };
        }
        
        usage.byBucket[log.bucket_name].files++;
        usage.byBucket[log.bucket_name].size += size;
      });

      return usage;

    } catch (error) {
      devConsole.error('Failed to get storage usage:', error);
      return { totalFiles: 0, totalSize: 0, byBucket: {} };
    }
  }

  private static validateFile(
    file: File, 
    category: 'documents' | 'images' | 'general' = 'general'
  ): { valid: boolean; error?: string } {
    // Check file size
    const maxSize = this.MAX_FILE_SIZES[category];
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`
      };
    }

    // Check MIME type
    if (category !== 'general') {
      const allowedTypes = this.ALLOWED_MIME_TYPES[category];
      if (!allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `File type ${file.type} not allowed for ${category}`
        };
      }
    }

    // Check file name
    if (file.name.length > 255) {
      return {
        valid: false,
        error: 'File name too long (max 255 characters)'
      };
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.sh', '.ps1', '.vbs'];
    const fileExt = file.name.toLowerCase().split('.').pop();
    if (fileExt && suspiciousExtensions.includes(`.${fileExt}`)) {
      return {
        valid: false,
        error: 'File type not allowed for security reasons'
      };
    }

    return { valid: true };
  }

  private static async logStorageAccess(
    log: StorageAccessLog,
    userId?: string
  ): Promise<void> {
    try {
      await supabase
        .from('storage_access_logs')
        .insert({
          user_id: userId || null,
          ...log,
          ip_address: null, // Could be populated from request headers
          user_agent: navigator.userAgent
        });
    } catch (error) {
      devConsole.error('Failed to log storage access:', error);
    }
  }
}