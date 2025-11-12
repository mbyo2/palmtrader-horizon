import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ComplianceReport {
  id: string;
  report_type: 'aml' | 'kyc_audit' | 'suspicious_activity' | 'transaction_monitoring' | 'regulatory_filing';
  report_period_start: string;
  report_period_end: string;
  generated_by: string;
  report_data: any;
  summary: string;
  total_items: number;
  flagged_items: number;
  critical_items: number;
  status: 'draft' | 'finalized' | 'submitted' | 'archived';
  submitted_to?: string;
  submitted_at?: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
}

export interface SuspiciousActivity {
  id: string;
  user_id: string;
  activity_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  related_transaction_id?: string;
  risk_score: number;
  status: 'pending' | 'investigating' | 'cleared' | 'escalated' | 'reported';
  assigned_to?: string;
  investigated_by?: string;
  investigation_notes?: string;
  resolution?: string;
  resolved_at?: string;
  reported_to_authorities: boolean;
  report_reference?: string;
  created_at: string;
  updated_at: string;
}

export class AutomatedComplianceService {
  // Generate AML Report
  static async generateAMLReport(startDate: Date, endDate: Date): Promise<ComplianceReport | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Fetch KYC verifications for AML checks
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (kycError) throw kycError;

      // Fetch suspicious activities
      const { data: suspiciousActivities, error: saError } = await supabase
        .from('suspicious_activities')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (saError) throw saError;

      const flaggedItems = kycData?.filter(k => 
        k.sanctions_check || k.pep_check || k.risk_score > 70
      ).length || 0;

      const criticalItems = suspiciousActivities?.filter(s => 
        s.severity === 'critical'
      ).length || 0;

      const reportData = {
        kyc_checks: kycData?.length || 0,
        sanctions_hits: kycData?.filter(k => k.sanctions_check).length || 0,
        pep_matches: kycData?.filter(k => k.pep_check).length || 0,
        high_risk_users: kycData?.filter(k => k.risk_score > 70).length || 0,
        suspicious_activities: suspiciousActivities?.length || 0,
        critical_alerts: criticalItems,
        details: {
          kyc_data: kycData,
          suspicious_activities: suspiciousActivities
        }
      };

      const summary = `AML Report for ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}. 
        Total KYC checks: ${reportData.kyc_checks}, Sanctions hits: ${reportData.sanctions_hits}, 
        PEP matches: ${reportData.pep_matches}, Critical alerts: ${criticalItems}.`;

      // Save report
      const { data: report, error: reportError } = await supabase
        .from('compliance_reports')
        .insert({
          report_type: 'aml',
          report_period_start: startDate.toISOString(),
          report_period_end: endDate.toISOString(),
          generated_by: user.user.id,
          report_data: reportData,
          summary,
          total_items: (kycData?.length || 0) + (suspiciousActivities?.length || 0),
          flagged_items: flaggedItems,
          critical_items: criticalItems,
          status: 'draft'
        })
        .select()
        .single();

      if (reportError) throw reportError;
      return report as ComplianceReport;
    } catch (error) {
      console.error("Error generating AML report:", error);
      return null;
    }
  }

  // Generate KYC Audit Report
  static async generateKYCReport(startDate: Date, endDate: Date): Promise<ComplianceReport | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: kycDocs, error: docsError } = await supabase
        .from('kyc_documents')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (docsError) throw docsError;

      const { data: kycVerifications, error: verError } = await supabase
        .from('kyc_verifications')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (verError) throw verError;

      const pending = kycDocs?.filter(d => d.verification_status === 'pending').length || 0;
      const approved = kycDocs?.filter(d => d.verification_status === 'approved').length || 0;
      const rejected = kycDocs?.filter(d => d.verification_status === 'rejected').length || 0;

      const reportData = {
        total_submissions: kycDocs?.length || 0,
        pending_verification: pending,
        approved: approved,
        rejected: rejected,
        verification_levels: {
          none: kycVerifications?.filter(k => k.verification_level === 'none').length || 0,
          basic: kycVerifications?.filter(k => k.verification_level === 'basic').length || 0,
          intermediate: kycVerifications?.filter(k => k.verification_level === 'intermediate').length || 0,
          full: kycVerifications?.filter(k => k.verification_level === 'full').length || 0
        },
        details: {
          documents: kycDocs,
          verifications: kycVerifications
        }
      };

      const summary = `KYC Audit Report for ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}. 
        Total: ${reportData.total_submissions}, Approved: ${approved}, Rejected: ${rejected}, Pending: ${pending}.`;

      const { data: report, error: reportError } = await supabase
        .from('compliance_reports')
        .insert({
          report_type: 'kyc_audit',
          report_period_start: startDate.toISOString(),
          report_period_end: endDate.toISOString(),
          generated_by: user.user.id,
          report_data: reportData,
          summary,
          total_items: kycDocs?.length || 0,
          flagged_items: rejected,
          critical_items: pending,
          status: 'draft'
        })
        .select()
        .single();

      if (reportError) throw reportError;
      return report as ComplianceReport;
    } catch (error) {
      console.error("Error generating KYC report:", error);
      return null;
    }
  }

  // Monitor suspicious activities
  static async monitorSuspiciousActivities(): Promise<SuspiciousActivity[]> {
    try {
      const { data, error } = await supabase
        .from('suspicious_activities')
        .select('*')
        .in('status', ['pending', 'investigating'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SuspiciousActivity[];
    } catch (error) {
      console.error("Error monitoring suspicious activities:", error);
      return [];
    }
  }

  // Flag suspicious transaction
  static async flagSuspiciousTransaction(
    userId: string,
    activityType: string,
    description: string,
    details: any,
    transactionId?: string
  ): Promise<boolean> {
    try {
      // Calculate risk score based on activity type
      let riskScore = 50;
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

      if (activityType === 'sanctions_hit' || activityType === 'pep_match') {
        riskScore = 95;
        severity = 'critical';
      } else if (activityType === 'large_amount' || activityType === 'high_frequency') {
        riskScore = 75;
        severity = 'high';
      } else if (activityType === 'unusual_transaction') {
        riskScore = 60;
        severity = 'medium';
      }

      const { error } = await supabase
        .from('suspicious_activities')
        .insert({
          user_id: userId,
          activity_type: activityType,
          severity,
          description,
          details,
          related_transaction_id: transactionId,
          risk_score: riskScore,
          status: 'pending'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error flagging suspicious activity:", error);
      return false;
    }
  }

  // Update suspicious activity status
  static async updateSuspiciousActivity(
    activityId: string,
    updates: {
      status?: SuspiciousActivity['status'];
      investigation_notes?: string;
      resolution?: string;
      assigned_to?: string;
      reported_to_authorities?: boolean;
      report_reference?: string;
    }
  ): Promise<boolean> {
    try {
      const updateData: any = { ...updates };
      
      if (updates.status === 'cleared' || updates.status === 'reported') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('suspicious_activities')
        .update(updateData)
        .eq('id', activityId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating suspicious activity:", error);
      return false;
    }
  }

  // Get all reports
  static async getReports(reportType?: string): Promise<ComplianceReport[]> {
    try {
      let query = supabase
        .from('compliance_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportType) {
        query = query.eq('report_type', reportType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ComplianceReport[];
    } catch (error) {
      console.error("Error fetching reports:", error);
      return [];
    }
  }

  // Export report to CSV
  static exportReportToCSV(report: ComplianceReport): string {
    const headers = ['Field', 'Value'];
    const rows = [
      ['Report Type', report.report_type],
      ['Period Start', format(new Date(report.report_period_start), 'PPP')],
      ['Period End', format(new Date(report.report_period_end), 'PPP')],
      ['Total Items', report.total_items.toString()],
      ['Flagged Items', report.flagged_items.toString()],
      ['Critical Items', report.critical_items.toString()],
      ['Status', report.status],
      ['Generated', format(new Date(report.created_at), 'PPP p')],
      ['', ''],
      ['Summary', report.summary],
    ];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csv;
  }

  // Download report as file
  static downloadReport(report: ComplianceReport, fileFormat: 'csv' | 'json' = 'csv'): void {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (fileFormat === 'csv') {
      content = this.exportReportToCSV(report);
      mimeType = 'text/csv';
      extension = 'csv';
    } else {
      content = JSON.stringify(report, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.report_type}_${format(new Date(report.created_at), 'yyyy-MM-dd')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Finalize report
  static async finalizeReport(reportId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('compliance_reports')
        .update({ status: 'finalized' })
        .eq('id', reportId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error finalizing report:", error);
      return false;
    }
  }

  // Submit report to authorities
  static async submitReport(reportId: string, submittedTo: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('compliance_reports')
        .update({ 
          status: 'submitted',
          submitted_to: submittedTo,
          submitted_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error submitting report:", error);
      return false;
    }
  }
}
