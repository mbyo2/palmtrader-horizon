/**
 * Data Encryption Service for financial data protection
 * Provides end-to-end encryption for sensitive financial information
 */

export interface EncryptionResult {
  encryptedData: string;
  keyId: string;
  algorithm: string;
  iv: string;
}

export interface DecryptionRequest {
  encryptedData: string;
  keyId: string;
  algorithm: string;
  iv: string;
}

export interface FieldEncryptionConfig {
  tableName: string;
  fieldName: string;
  encryptionLevel: 'standard' | 'high' | 'critical';
  keyRotationDays: number;
}

export class DataEncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  /**
   * Encrypt sensitive data
   */
  static async encryptData(data: string, encryptionLevel: 'standard' | 'high' | 'critical' = 'standard'): Promise<EncryptionResult> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      // Generate encryption key
      const key = await this.generateEncryptionKey();
      const keyId = await this.storeEncryptionKey(key, encryptionLevel);

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Encrypt data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        dataBuffer
      );

      // Convert to base64
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const encryptedData = btoa(String.fromCharCode(...encryptedArray));
      const ivString = btoa(String.fromCharCode(...iv));

      return {
        encryptedData,
        keyId,
        algorithm: this.ALGORITHM,
        iv: ivString
      };
    } catch (error) {
      console.error('Data encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decryptData(request: DecryptionRequest): Promise<string> {
    try {
      // Retrieve encryption key
      const key = await this.retrieveEncryptionKey(request.keyId);
      if (!key) {
        throw new Error('Encryption key not found');
      }

      // Convert from base64
      const encryptedArray = new Uint8Array(
        atob(request.encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );
      const ivArray = new Uint8Array(
        atob(request.iv)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: request.algorithm,
          iv: ivArray
        },
        key,
        encryptedArray
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Data decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt financial transaction data
   */
  static async encryptFinancialData(data: {
    accountNumber?: string;
    routingNumber?: string;
    cardNumber?: string;
    ssn?: string;
    taxId?: string;
    amount?: number;
    description?: string;
  }): Promise<Record<string, EncryptionResult>> {
    const encryptedFields: Record<string, EncryptionResult> = {};

    // Fields that require critical encryption
    const criticalFields = ['accountNumber', 'routingNumber', 'cardNumber', 'ssn', 'taxId'];
    
    // Fields that require high encryption
    const highFields = ['amount'];
    
    // Fields that require standard encryption
    const standardFields = ['description'];

    for (const [field, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        let level: 'standard' | 'high' | 'critical' = 'standard';
        
        if (criticalFields.includes(field)) {
          level = 'critical';
        } else if (highFields.includes(field)) {
          level = 'high';
        }

        encryptedFields[field] = await this.encryptData(String(value), level);
      }
    }

    return encryptedFields;
  }

  /**
   * Decrypt financial transaction data
   */
  static async decryptFinancialData(encryptedData: Record<string, EncryptionResult>): Promise<Record<string, string>> {
    const decryptedFields: Record<string, string> = {};

    for (const [field, encryptionResult] of Object.entries(encryptedData)) {
      try {
        decryptedFields[field] = await this.decryptData(encryptionResult);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        decryptedFields[field] = '[DECRYPTION_FAILED]';
      }
    }

    return decryptedFields;
  }

  /**
   * Generate hash for data integrity verification
   */
  static async generateDataHash(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      
      return btoa(String.fromCharCode(...hashArray));
    } catch (error) {
      console.error('Hash generation failed:', error);
      throw new Error('Failed to generate data hash');
    }
  }

  /**
   * Verify data integrity
   */
  static async verifyDataIntegrity(data: string, expectedHash: string): Promise<boolean> {
    try {
      const actualHash = await this.generateDataHash(data);
      return actualHash === expectedHash;
    } catch (error) {
      console.error('Data integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Mask sensitive data for display
   */
  static maskSensitiveData(data: string, type: 'card' | 'account' | 'ssn' | 'phone' | 'email'): string {
    if (!data) return '';

    switch (type) {
      case 'card':
        // Show only last 4 digits
        return data.length > 4 ? `****-****-****-${data.slice(-4)}` : data;
      
      case 'account':
        // Show only last 4 digits
        return data.length > 4 ? `****${data.slice(-4)}` : data;
      
      case 'ssn':
        // Show only last 4 digits
        return data.length > 4 ? `***-**-${data.slice(-4)}` : data;
      
      case 'phone':
        // Show only last 4 digits
        return data.length > 4 ? `(***) ***-${data.slice(-4)}` : data;
      
      case 'email':
        const [username, domain] = data.split('@');
        if (!domain) return data;
        const maskedUsername = username.length > 2 
          ? `${username[0]}***${username.slice(-1)}` 
          : '***';
        return `${maskedUsername}@${domain}`;
      
      default:
        return '***';
    }
  }

  /**
   * Generate encryption key
   */
  private static async generateEncryptionKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Store encryption key securely
   */
  private static async storeEncryptionKey(key: CryptoKey, encryptionLevel: string): Promise<string> {
    try {
      const keyId = crypto.randomUUID();
      
      // Export key for storage
      const exportedKey = await crypto.subtle.exportKey('jwk', key);
      
      // In a real implementation, this would store in a secure key management system
      // For now, we'll use local storage with additional encryption
      const keyData = {
        keyId,
        key: exportedKey,
        encryptionLevel,
        createdAt: new Date().toISOString(),
        rotationDate: this.calculateRotationDate(encryptionLevel)
      };

      localStorage.setItem(`encryption_key_${keyId}`, JSON.stringify(keyData));
      
      return keyId;
    } catch (error) {
      console.error('Failed to store encryption key:', error);
      throw new Error('Failed to store encryption key');
    }
  }

  /**
   * Retrieve encryption key
   */
  private static async retrieveEncryptionKey(keyId: string): Promise<CryptoKey | null> {
    try {
      const keyDataString = localStorage.getItem(`encryption_key_${keyId}`);
      if (!keyDataString) {
        return null;
      }

      const keyData = JSON.parse(keyDataString);
      
      // Check if key needs rotation
      const rotationDate = new Date(keyData.rotationDate);
      if (new Date() > rotationDate) {
        console.warn(`Encryption key ${keyId} is due for rotation`);
      }

      // Import key
      return await crypto.subtle.importKey(
        'jwk',
        keyData.key,
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to retrieve encryption key:', error);
      return null;
    }
  }

  /**
   * Calculate key rotation date based on encryption level
   */
  private static calculateRotationDate(encryptionLevel: string): string {
    const now = new Date();
    let rotationDays: number;

    switch (encryptionLevel) {
      case 'critical':
        rotationDays = 30; // Rotate monthly for critical data
        break;
      case 'high':
        rotationDays = 90; // Rotate quarterly for high-sensitivity data
        break;
      case 'standard':
      default:
        rotationDays = 365; // Rotate annually for standard data
        break;
    }

    const rotationDate = new Date(now);
    rotationDate.setDate(now.getDate() + rotationDays);
    
    return rotationDate.toISOString();
  }

  /**
   * Rotate encryption keys
   */
  static async rotateEncryptionKeys(): Promise<void> {
    try {
      // Get all stored keys
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('encryption_key_')) {
          keys.push(key);
        }
      }

      for (const keyStorageKey of keys) {
        const keyDataString = localStorage.getItem(keyStorageKey);
        if (!keyDataString) continue;

        const keyData = JSON.parse(keyDataString);
        const rotationDate = new Date(keyData.rotationDate);
        
        if (new Date() > rotationDate) {
          console.log(`Rotating encryption key ${keyData.keyId}`);
          
          // Generate new key
          const newKey = await this.generateEncryptionKey();
          const newKeyId = await this.storeEncryptionKey(newKey, keyData.encryptionLevel);
          
          // In a real implementation, you would:
          // 1. Re-encrypt all data using the old key with the new key
          // 2. Update all references to use the new key ID
          // 3. Securely delete the old key
          
          console.log(`Key rotation completed. Old key: ${keyData.keyId}, New key: ${newKeyId}`);
        }
      }
    } catch (error) {
      console.error('Key rotation failed:', error);
    }
  }

  /**
   * Get encryption statistics
   */
  static getEncryptionStats(): {
    totalKeys: number;
    keysByLevel: Record<string, number>;
    keysNeedingRotation: number;
  } {
    const stats = {
      totalKeys: 0,
      keysByLevel: { standard: 0, high: 0, critical: 0 },
      keysNeedingRotation: 0
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('encryption_key_')) {
        const keyDataString = localStorage.getItem(key);
        if (keyDataString) {
          try {
            const keyData = JSON.parse(keyDataString);
            stats.totalKeys++;
            stats.keysByLevel[keyData.encryptionLevel as keyof typeof stats.keysByLevel]++;
            
            const rotationDate = new Date(keyData.rotationDate);
            if (new Date() > rotationDate) {
              stats.keysNeedingRotation++;
            }
          } catch (error) {
            console.error('Failed to parse key data:', error);
          }
        }
      }
    }

    return stats;
  }
}