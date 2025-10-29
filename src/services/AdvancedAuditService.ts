import { supabase } from "@/integrations/supabase/client";

export interface AuditEvent {
  id: string;
  userId: string;
  sessionId?: string;
  eventType: AuditEventType;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  metadata?: Record<string, any>;
  complianceRelevant: boolean;
  retentionDate: Date;
}

export type AuditEventType = 
  | 'authentication' 
  | 'authorization' 
  | 'data_access' 
  | 'data_modification' 
  | 'financial_transaction' 
  | 'administrative' 
  | 'system_event' 
  | 'security_event';

export type AuditAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'approve' 
  | 'reject' 
  | 'transfer' 
  | 'trade' 
  | 'export' 
  | 'import';

export interface AuditQuery {
  userId?: string;
  eventType?: AuditEventType;
  action?: AuditAction;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: string[];
  complianceRelevant?: boolean;
  limit?: number;
  offset?: number;
}

export interface ComplianceReport {
  id: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  totalEvents: number;
  criticalEvents: number;
  failedLogins: number;
  dataAccesses: number;
  financialTransactions: number;
  adminActions: number;
  securityEvents: number;
  complianceViolations: AuditEvent[];
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    recommendations: string[];
  };
}

export class AdvancedAuditService {
  /**
   * Log an audit event
   */
  static async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'riskScore' | 'retentionDate'>): Promise<void> {
    try {
      const riskScore = this.calculateRiskScore(event);
      const retentionDate = this.calculateRetentionDate(event.eventType, event.complianceRelevant);
      
      const auditEvent: Partial<AuditEvent> = {
        ...event,
        timestamp: new Date(),
        riskScore,
        retentionDate
      };

      const { error } = await supabase
        .from('audit_events' as any)
        .insert({
          user_id: auditEvent.userId,
          session_id: auditEvent.sessionId,
          event_type: auditEvent.eventType,
          entity_type: auditEvent.entityType,
          entity_id: auditEvent.entityId,
          action: auditEvent.action,
          old_values: auditEvent.oldValues,
          new_values: auditEvent.newValues,
          ip_address: auditEvent.ipAddress,
          user_agent: auditEvent.userAgent,
          timestamp: auditEvent.timestamp,
          severity: auditEvent.severity,
          risk_score: auditEvent.riskScore,
          metadata: auditEvent.metadata,
          compliance_relevant: auditEvent.complianceRelevant,
          retention_date: auditEvent.retentionDate
        });

      if (error) throw error;

      // Real-time risk assessment
      if (riskScore > 70) {
        await this.triggerSecurityAlert(event.userId, auditEvent as AuditEvent);
      }

      // Check for compliance violations
      await this.checkComplianceViolations(auditEvent as AuditEvent);

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  /**
   * Log authentication event
   */
  static async logAuthEvent(
    userId: string,
    action: 'login' | 'logout' | 'failed_login' | 'password_change' | '2fa_enabled' | '2fa_disabled',
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'authentication',
      entityType: 'user_session',
      entityId: userId,
      action: action as AuditAction,
      ipAddress,
      userAgent,
      severity: action === 'failed_login' ? 'medium' : 'low',
      metadata,
      complianceRelevant: true
    });
  }

  /**
   * Log financial transaction
   */
  static async logFinancialTransaction(
    userId: string,
    transactionId: string,
    action: 'trade' | 'transfer' | 'deposit' | 'withdrawal',
    amount: number,
    currency: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'financial_transaction',
      entityType: 'transaction',
      entityId: transactionId,
      action: action as AuditAction,
      ipAddress,
      userAgent,
      severity: amount > 10000 ? 'high' : 'medium',
      metadata: {
        ...metadata,
        amount,
        currency
      },
      complianceRelevant: true
    });
  }

  /**
   * Log data access event
   */
  static async logDataAccess(
    userId: string,
    entityType: string,
    entityId: string,
    action: 'read' | 'export',
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'data_access',
      entityType,
      entityId,
      action: action as AuditAction,
      ipAddress,
      userAgent,
      severity: action === 'export' ? 'medium' : 'low',
      metadata,
      complianceRelevant: true
    });
  }

  /**
   * Log administrative action
   */
  static async logAdminAction(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    ipAddress: string,
    userAgent: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      eventType: 'administrative',
      entityType,
      entityId,
      action,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
      severity: 'high',
      metadata,
      complianceRelevant: true
    });
  }

  /**
   * Query audit events
   */
  static async queryEvents(query: AuditQuery): Promise<{ events: AuditEvent[]; totalCount: number }> {
    try {
      let supabaseQuery = supabase
        .from('audit_events' as any)
        .select('*', { count: 'exact' });

      // Apply filters
      if (query.userId) {
        supabaseQuery = supabaseQuery.eq('user_id', query.userId);
      }
      if (query.eventType) {
        supabaseQuery = supabaseQuery.eq('event_type', query.eventType);
      }
      if (query.action) {
        supabaseQuery = supabaseQuery.eq('action', query.action);
      }
      if (query.entityType) {
        supabaseQuery = supabaseQuery.eq('entity_type', query.entityType);
      }
      if (query.startDate) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.startDate.toISOString());
      }
      if (query.endDate) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.endDate.toISOString());
      }
      if (query.severity && query.severity.length > 0) {
        supabaseQuery = supabaseQuery.in('severity', query.severity);
      }
      if (query.complianceRelevant !== undefined) {
        supabaseQuery = supabaseQuery.eq('compliance_relevant', query.complianceRelevant);
      }

      // Apply pagination
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(query.offset, (query.offset + (query.limit || 50)) - 1);
      } else if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }

      // Order by timestamp descending
      supabaseQuery = supabaseQuery.order('timestamp', { ascending: false });

      const { data, error, count } = await supabaseQuery;

      if (error) throw error;

      return {
        events: (data || []) as any as AuditEvent[],
        totalCount: count || 0
      };
    } catch (error) {
      console.error('Failed to query audit events:', error);
      return { events: [], totalCount: 0 };
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    try {
      const query: AuditQuery = {
        startDate,
        endDate,
        complianceRelevant: true
      };

      const { events, totalCount } = await this.queryEvents(query);

      // Calculate metrics
      const criticalEvents = events.filter(e => e.severity === 'critical').length;
      const failedLogins = events.filter(e => e.eventType === 'authentication' && e.action === 'login' && e.metadata?.success === false).length;
      const dataAccesses = events.filter(e => e.eventType === 'data_access').length;
      const financialTransactions = events.filter(e => e.eventType === 'financial_transaction').length;
      const adminActions = events.filter(e => e.eventType === 'administrative').length;
      const securityEvents = events.filter(e => e.eventType === 'security_event').length;

      // Identify compliance violations
      const complianceViolations = events.filter(e => this.isComplianceViolation(e));

      // Risk assessment
      const riskAssessment = this.performRiskAssessment(events);

      const report: ComplianceReport = {
        id: crypto.randomUUID(),
        reportType,
        generatedAt: new Date(),
        periodStart: startDate,
        periodEnd: endDate,
        totalEvents: totalCount,
        criticalEvents,
        failedLogins,
        dataAccesses,
        financialTransactions,
        adminActions,
        securityEvents,
        complianceViolations,
        riskAssessment
      };

      // Store report
      await this.storeComplianceReport(report);

      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Calculate risk score for an event
   */
  private static calculateRiskScore(event: Partial<AuditEvent>): number {
    let score = 0;

    // Base score by event type
    const eventTypeScores: Record<AuditEventType, number> = {
      'authentication': 20,
      'authorization': 30,
      'data_access': 25,
      'data_modification': 40,
      'financial_transaction': 50,
      'administrative': 45,
      'system_event': 15,
      'security_event': 60
    };

    score += eventTypeScores[event.eventType!] || 10;

    // Severity multiplier
    const severityMultipliers = {
      'low': 1,
      'medium': 1.5,
      'high': 2,
      'critical': 3
    };

    score *= severityMultipliers[event.severity!] || 1;

    // Failed actions increase risk
    if (event.metadata?.success === false) {
      score *= 1.5;
    }

    // High-value transactions increase risk
    if (event.eventType === 'financial_transaction' && event.metadata?.amount > 10000) {
      score *= 1.3;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate retention date based on event type and compliance requirements
   */
  private static calculateRetentionDate(eventType: AuditEventType, complianceRelevant: boolean): Date {
    const now = new Date();
    let retentionYears = 1; // Default retention

    // Compliance-relevant events have longer retention
    if (complianceRelevant) {
      retentionYears = 7; // Financial regulations typically require 7 years
    }

    // Specific retention by event type
    const retentionPolicies: Record<AuditEventType, number> = {
      'authentication': 2,
      'authorization': 2,
      'data_access': 3,
      'data_modification': 5,
      'financial_transaction': 7,
      'administrative': 5,
      'system_event': 1,
      'security_event': 3
    };

    retentionYears = Math.max(retentionYears, retentionPolicies[eventType] || 1);

    const retentionDate = new Date(now);
    retentionDate.setFullYear(now.getFullYear() + retentionYears);
    
    return retentionDate;
  }

  /**
   * Trigger security alert for high-risk events
   */
  private static async triggerSecurityAlert(userId: string, event: AuditEvent): Promise<void> {
    try {
      await supabase
        .from('notifications' as any)
        .insert({
          user_id: userId,
          type: 'security_alert',
          title: 'High-Risk Activity Detected',
          message: `High-risk ${event.eventType} event detected: ${event.action} on ${event.entityType}`,
          data: {
            eventId: event.id,
            riskScore: event.riskScore,
            eventType: event.eventType,
            action: event.action
          }
        });
    } catch (error) {
      console.error('Failed to trigger security alert:', error);
    }
  }

  /**
   * Check for compliance violations
   */
  private static async checkComplianceViolations(event: AuditEvent): Promise<void> {
    const violations: string[] = [];

    // Check for unauthorized data access
    if (event.eventType === 'data_access' && event.action === 'export') {
      // This would check against user permissions and data classification
      violations.push('Potential unauthorized data export detected');
    }

    // Check for unusual financial transactions
    if (event.eventType === 'financial_transaction' && event.metadata?.amount > 50000) {
      violations.push('Large financial transaction requires additional review');
    }

    // Check for administrative actions outside business hours
    if (event.eventType === 'administrative') {
      const hour = event.timestamp.getHours();
      if (hour < 6 || hour > 22) {
        violations.push('Administrative action performed outside business hours');
      }
    }

    // Log violations
    for (const violation of violations) {
      await this.logEvent({
        userId: event.userId,
        eventType: 'security_event',
        entityType: 'compliance_violation',
        entityId: event.id,
        action: 'create',
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        severity: 'high',
        metadata: {
          violation,
          originalEvent: event.id
        },
        complianceRelevant: true
      });
    }
  }

  /**
   * Check if event is a compliance violation
   */
  private static isComplianceViolation(event: AuditEvent): boolean {
    // This would implement specific compliance rules
    return event.eventType === 'security_event' && 
           event.entityType === 'compliance_violation';
  }

  /**
   * Perform risk assessment
   */
  private static performRiskAssessment(events: AuditEvent[]): ComplianceReport['riskAssessment'] {
    const totalRisk = events.reduce((sum, e) => sum + e.riskScore, 0);
    const averageRisk = events.length > 0 ? totalRisk / events.length : 0;

    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (averageRisk < 25) overallRisk = 'low';
    else if (averageRisk < 50) overallRisk = 'medium';
    else if (averageRisk < 75) overallRisk = 'high';
    else overallRisk = 'critical';

    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Analyze patterns
    const failedLogins = events.filter(e => e.eventType === 'authentication' && e.metadata?.success === false).length;
    if (failedLogins > 10) {
      riskFactors.push('High number of failed login attempts');
      recommendations.push('Implement stronger authentication controls');
    }

    const highValueTransactions = events.filter(e => 
      e.eventType === 'financial_transaction' && 
      e.metadata?.amount > 25000
    ).length;
    if (highValueTransactions > 5) {
      riskFactors.push('Multiple high-value transactions');
      recommendations.push('Implement transaction monitoring thresholds');
    }

    return {
      overallRisk,
      riskFactors,
      recommendations
    };
  }

  /**
   * Store compliance report
   */
  private static async storeComplianceReport(report: ComplianceReport): Promise<void> {
    try {
      const { error } = await supabase
        .from('compliance_reports' as any)
        .insert({
          report_type: report.reportType,
          generated_at: report.generatedAt.toISOString(),
          period_start: report.periodStart.toISOString(),
          period_end: report.periodEnd.toISOString(),
          total_events: report.totalEvents,
          critical_events: report.criticalEvents,
          failed_logins: report.failedLogins,
          data_accesses: report.dataAccesses,
          financial_transactions: report.financialTransactions,
          admin_actions: report.adminActions,
          security_events: report.securityEvents,
          compliance_violations: report.complianceViolations,
          risk_assessment: report.riskAssessment
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store compliance report:', error);
    }
  }

  /**
   * Clean up expired audit events
   */
  static async cleanupExpiredEvents(): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_events' as any)
        .delete()
        .lt('retention_date', new Date().toISOString());

      if (error) throw error;
    } catch (error) {
      console.error('Failed to cleanup expired audit events:', error);
    }
  }
}