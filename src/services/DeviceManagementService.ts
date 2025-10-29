import { supabase } from "@/integrations/supabase/client";

export interface UserDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  operatingSystem: string;
  browser: string;
  ipAddress: string;
  location?: {
    country: string;
    city: string;
    coordinates?: { lat: number; lng: number; };
  };
  isTrusted: boolean;
  lastActive: Date;
  firstSeen: Date;
  userAgent: string;
  fingerprint: string;
  isActive: boolean;
}

export interface SuspiciousActivity {
  id: string;
  userId: string;
  deviceId: string;
  activityType: 'unusual_location' | 'new_device' | 'multiple_failed_logins' | 'unusual_hours' | 'ip_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolved: boolean;
  metadata?: any;
}

export interface LoginAttempt {
  id: string;
  userId?: string;
  email: string;
  success: boolean;
  ipAddress: string;
  deviceFingerprint: string;
  userAgent: string;
  location?: any;
  timestamp: Date;
  failureReason?: string;
}

export class DeviceManagementService {
  /**
   * Register a new device for a user
   */
  static async registerDevice(userId: string, deviceInfo: Partial<UserDevice>): Promise<UserDevice> {
    try {
      const deviceId = deviceInfo.deviceId || this.generateDeviceId(deviceInfo.userAgent || '');
      
      const device: Partial<UserDevice> = {
        userId,
        deviceId,
        deviceName: deviceInfo.deviceName || this.getDeviceName(deviceInfo.userAgent || ''),
        deviceType: deviceInfo.deviceType || this.detectDeviceType(deviceInfo.userAgent || ''),
        operatingSystem: deviceInfo.operatingSystem || this.getOperatingSystem(deviceInfo.userAgent || ''),
        browser: deviceInfo.browser || this.getBrowser(deviceInfo.userAgent || ''),
        ipAddress: deviceInfo.ipAddress || '',
        isTrusted: false,
        lastActive: new Date(),
        firstSeen: new Date(),
        userAgent: deviceInfo.userAgent || '',
        fingerprint: deviceInfo.fingerprint || this.generateFingerprint(deviceInfo),
        isActive: true
      };

      // Get location data from IP
      if (device.ipAddress) {
        device.location = await this.getLocationFromIP(device.ipAddress);
      }

      const { data, error } = await supabase
        .from('user_devices' as any)
        .insert(device as any)
        .select()
        .single();

      if (error) throw error;

      // Check for suspicious activity
      await this.checkForSuspiciousActivity(userId, device as UserDevice);

      return data as any as UserDevice;
    } catch (error) {
      console.error('Failed to register device:', error);
      throw error;
    }
  }

  /**
   * Update device last active timestamp
   */
  static async updateDeviceActivity(deviceId: string, ipAddress?: string): Promise<void> {
    try {
      const updates: any = {
        last_active: new Date().toISOString()
      };

      if (ipAddress) {
        updates.ip_address = ipAddress;
        
        // Check if IP changed significantly
        const { data: device } = await supabase
          .from('user_devices' as any)
          .select('ip_address, user_id')
          .eq('device_id', deviceId)
          .single();

        if (device && (device as any).ip_address !== ipAddress) {
          await this.logSuspiciousActivity((device as any).user_id, deviceId, 'ip_change', {
            oldIp: (device as any).ip_address,
            newIp: ipAddress
          });
        }
      }

      const { error } = await supabase
        .from('user_devices' as any)
        .update(updates)
        .eq('device_id', deviceId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update device activity:', error);
    }
  }

  /**
   * Get all devices for a user
   */
  static async getUserDevices(userId: string): Promise<UserDevice[]> {
    try {
      const { data, error } = await supabase
        .from('user_devices' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_active', { ascending: false });

      if (error) throw error;
      return (data || []) as any as UserDevice[];
    } catch (error) {
      console.error('Failed to get user devices:', error);
      return [];
    }
  }

  /**
   * Trust a device
   */
  static async trustDevice(userId: string, deviceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_devices' as any)
        .update({ is_trusted: true } as any)
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to trust device:', error);
      throw error;
    }
  }

  /**
   * Revoke device access
   */
  static async revokeDevice(userId: string, deviceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_devices' as any)
        .update({ is_active: false } as any)
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (error) throw error;

      // Also revoke any active sessions for this device
      // This would require integration with Supabase Auth to invalidate sessions
    } catch (error) {
      console.error('Failed to revoke device:', error);
      throw error;
    }
  }

  /**
   * Log login attempt
   */
  static async logLoginAttempt(attempt: Partial<LoginAttempt>): Promise<void> {
    try {
      const { error } = await supabase
        .from('login_attempts' as any)
        .insert({
          user_id: attempt.userId,
          email: attempt.email,
          success: attempt.success,
          ip_address: attempt.ipAddress,
          device_fingerprint: attempt.deviceFingerprint,
          user_agent: attempt.userAgent,
          location: attempt.location,
          timestamp: attempt.timestamp || new Date(),
          failure_reason: attempt.failureReason
        });

      if (error) throw error;

      // Check for suspicious login patterns
      if (!attempt.success) {
        await this.checkFailedLoginPattern(attempt.email, attempt.ipAddress || '');
      }
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  }

  /**
   * Check for suspicious activity
   */
  private static async checkForSuspiciousActivity(userId: string, device: UserDevice): Promise<void> {
    try {
      // Check for new device from unusual location
      const { data: userDevices } = await supabase
        .from('user_devices' as any)
        .select('location')
        .eq('user_id', userId)
        .eq('is_trusted', true);

      if (userDevices && userDevices.length > 0 && device.location) {
        const knownLocations = userDevices
          .map(d => (d as any).location)
          .filter(Boolean);

        const isUnusualLocation = !knownLocations.some(loc => 
          loc.country === device.location?.country
        );

        if (isUnusualLocation) {
          await this.logSuspiciousActivity(
            userId, 
            device.deviceId, 
            'unusual_location',
            { newLocation: device.location, knownLocations }
          );
        }
      }

      // Check for new device
      const { data: existingDevice } = await supabase
        .from('user_devices' as any)
        .select('id')
        .eq('user_id', userId)
        .eq('device_id', device.deviceId)
        .single();

      if (!existingDevice) {
        await this.logSuspiciousActivity(
          userId,
          device.deviceId,
          'new_device',
          { deviceInfo: device }
        );
      }
    } catch (error) {
      console.error('Failed to check suspicious activity:', error);
    }
  }

  /**
   * Log suspicious activity
   */
  private static async logSuspiciousActivity(
    userId: string,
    deviceId: string,
    activityType: SuspiciousActivity['activityType'],
    metadata?: any
  ): Promise<void> {
    try {
      const severity = this.getSeverityForActivity(activityType);
      const description = this.getDescriptionForActivity(activityType, metadata);

      const { error } = await supabase
        .from('suspicious_activities' as any)
        .insert({
          user_id: userId,
          device_id: deviceId,
          activity_type: activityType,
          severity,
          description,
          detected_at: new Date(),
          resolved: false,
          metadata
        });

      if (error) throw error;

      // Send notification for high/critical severity activities
      if (severity === 'high' || severity === 'critical') {
        await this.notifyUserOfSuspiciousActivity(userId, activityType, description);
      }
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

  /**
   * Check for failed login patterns
   */
  private static async checkFailedLoginPattern(email: string, ipAddress: string): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const { data: recentAttempts } = await supabase
        .from('login_attempts' as any)
        .select('id')
        .eq('email', email)
        .eq('success', false)
        .gte('timestamp', fiveMinutesAgo.toISOString());

      if (recentAttempts && recentAttempts.length >= 5) {
        // Get user ID if exists
        const { data: user } = await supabase
          .from('account_details')
          .select('id')
          .eq('email', email)
          .single();

        if (user) {
          await this.logSuspiciousActivity(
            user.id,
            ipAddress,
            'multiple_failed_logins',
            { attemptCount: recentAttempts.length, timeWindow: '5 minutes' }
          );
        }
      }
    } catch (error) {
      console.error('Failed to check failed login pattern:', error);
    }
  }

  /**
   * Get suspicious activities for user
   */
  static async getSuspiciousActivities(userId: string): Promise<SuspiciousActivity[]> {
    try {
      const { data, error } = await supabase
        .from('suspicious_activities' as any)
        .select('*')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any as SuspiciousActivity[];
    } catch (error) {
      console.error('Failed to get suspicious activities:', error);
      return [];
    }
  }

  // Helper methods
  private static generateDeviceId(userAgent: string): string {
    return btoa(userAgent + Date.now()).slice(0, 32);
  }

  private static generateFingerprint(deviceInfo: Partial<UserDevice>): string {
    const data = `${deviceInfo.userAgent}-${deviceInfo.operatingSystem}-${deviceInfo.browser}`;
    return btoa(data).slice(0, 64);
  }

  private static getDeviceName(userAgent: string): string {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    return 'Unknown Device';
  }

  private static detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    if (userAgent.includes('Mobile') && !userAgent.includes('iPad')) return 'mobile';
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  }

  private static getOperatingSystem(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private static getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private static async getLocationFromIP(ipAddress: string): Promise<any> {
    try {
      // This would integrate with a geolocation service
      // For now, return mock data
      return {
        country: 'Unknown',
        city: 'Unknown'
      };
    } catch (error) {
      return null;
    }
  }

  private static getSeverityForActivity(activityType: SuspiciousActivity['activityType']): SuspiciousActivity['severity'] {
    const severityMap: Record<SuspiciousActivity['activityType'], SuspiciousActivity['severity']> = {
      'unusual_location': 'medium',
      'new_device': 'low',
      'multiple_failed_logins': 'high',
      'unusual_hours': 'low',
      'ip_change': 'medium'
    };
    return severityMap[activityType] || 'low';
  }

  private static getDescriptionForActivity(activityType: SuspiciousActivity['activityType'], metadata?: any): string {
    const descriptions: Record<SuspiciousActivity['activityType'], string> = {
      'unusual_location': `Login from unusual location: ${metadata?.newLocation?.country || 'Unknown'}`,
      'new_device': `New device detected: ${metadata?.deviceInfo?.deviceName || 'Unknown Device'}`,
      'multiple_failed_logins': `Multiple failed login attempts: ${metadata?.attemptCount || 0} attempts`,
      'unusual_hours': 'Login attempt during unusual hours',
      'ip_change': `IP address changed from ${metadata?.oldIp || 'Unknown'} to ${metadata?.newIp || 'Unknown'}`
    };
    return descriptions[activityType] || 'Suspicious activity detected';
  }

  private static async notifyUserOfSuspiciousActivity(userId: string, activityType: string, description: string): Promise<void> {
    try {
      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'security_alert',
          title: 'Suspicious Activity Detected',
          message: description,
          data: { activityType }
        });
    } catch (error) {
      console.error('Failed to notify user of suspicious activity:', error);
    }
  }
}