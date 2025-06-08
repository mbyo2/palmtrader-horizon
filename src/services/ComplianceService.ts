
import { supabase } from "@/integrations/supabase/client";

export interface ComplianceEvent {
  id: string;
  user_id: string;
  event_type: "kyc_update" | "aml_check" | "suspicious_activity" | "large_transaction" | "identity_change";
  event_data: any;
  risk_level: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "escalated";
  assigned_to?: string;
  notes?: string;
}

export class ComplianceService {
  // Monitor for suspicious activities
  static async monitorTransaction(userId: string, transactionData: any) {
    try {
      const risks = await this.analyzeTransactionRisk(userId, transactionData);
      
      for (const risk of risks) {
        if (risk.level !== "low") {
          await this.createComplianceEvent({
            user_id: userId,
            event_type: risk.type,
            event_data: risk.data,
            risk_level: risk.level
          });
        }
      }
    } catch (error) {
      console.error("Transaction monitoring error:", error);
    }
  }

  private static async analyzeTransactionRisk(userId: string, transaction: any) {
    const risks = [];

    // Large transaction check
    if (transaction.amount > 10000) {
      risks.push({
        type: "large_transaction" as const,
        level: transaction.amount > 50000 ? "high" as const : "medium" as const,
        data: { amount: transaction.amount, transaction_id: transaction.id }
      });
    }

    // Velocity check - multiple large transactions in short period
    const { data: recentTx } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const dayTotal = recentTx?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
    if (dayTotal > 25000) {
      risks.push({
        type: "suspicious_activity" as const,
        level: "high" as const,
        data: { daily_total: dayTotal, transaction_count: recentTx?.length }
      });
    }

    // Geographic anomaly (simplified)
    if (transaction.metadata?.ip_country && transaction.metadata.ip_country !== "US") {
      risks.push({
        type: "suspicious_activity" as const,
        level: "medium" as const,
        data: { anomaly: "geographic", country: transaction.metadata.ip_country }
      });
    }

    return risks;
  }

  private static async createComplianceEvent(eventData: Omit<ComplianceEvent, "id" | "status" | "created_at" | "updated_at">) {
    try {
      await supabase.from("compliance_events").insert({
        ...eventData,
        status: "open"
      });
    } catch (error) {
      console.error("Error creating compliance event:", error);
    }
  }

  // AML screening
  static async performAMLCheck(userId: string, userProfile: any) {
    try {
      // Simulate AML API call
      await new Promise(resolve => setTimeout(resolve, 3000));

      const amlResult = {
        sanctions_match: Math.random() > 0.98, // 2% chance of sanctions match
        pep_match: Math.random() > 0.95, // 5% chance of PEP match
        adverse_media: Math.random() > 0.90, // 10% chance of adverse media
        risk_score: Math.floor(Math.random() * 100)
      };

      // Update KYC verification with AML results
      await supabase
        .from("kyc_verifications")
        .update({
          aml_status: amlResult.sanctions_match ? "flagged" : "clear",
          sanctions_check: !amlResult.sanctions_match,
          pep_check: !amlResult.pep_match,
          risk_score: amlResult.risk_score
        })
        .eq("user_id", userId);

      // Create compliance events for any matches
      if (amlResult.sanctions_match || amlResult.pep_match || amlResult.adverse_media) {
        await this.createComplianceEvent({
          user_id: userId,
          event_type: "aml_check",
          event_data: amlResult,
          risk_level: amlResult.sanctions_match ? "critical" : "high"
        });
      }

      return amlResult;
    } catch (error) {
      console.error("AML check error:", error);
      return { error: "AML check failed" };
    }
  }

  // Generate compliance reports
  static async generateComplianceReport(startDate: string, endDate: string) {
    try {
      const { data: events, error } = await supabase
        .from("compliance_events")
        .select(`
          *,
          kyc_verifications:user_id (verification_level, risk_score)
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Aggregate compliance metrics
      const metrics = {
        total_events: events?.length || 0,
        high_risk_events: events?.filter(e => e.risk_level === "high" || e.risk_level === "critical").length || 0,
        open_events: events?.filter(e => e.status === "open").length || 0,
        resolved_events: events?.filter(e => e.status === "resolved").length || 0,
        average_resolution_time: this.calculateAverageResolutionTime(events || [])
      };

      return { events, metrics };
    } catch (error) {
      console.error("Error generating compliance report:", error);
      return { events: [], metrics: {} };
    }
  }

  private static calculateAverageResolutionTime(events: any[]): number {
    const resolvedEvents = events.filter(e => e.status === "resolved" && e.updated_at);
    if (resolvedEvents.length === 0) return 0;

    const totalTime = resolvedEvents.reduce((sum, event) => {
      const created = new Date(event.created_at).getTime();
      const resolved = new Date(event.updated_at).getTime();
      return sum + (resolved - created);
    }, 0);

    return totalTime / resolvedEvents.length / (1000 * 60 * 60); // Convert to hours
  }

  // Update compliance event status
  static async updateComplianceEvent(eventId: string, updates: {
    status?: ComplianceEvent["status"];
    assigned_to?: string;
    notes?: string;
  }) {
    try {
      const { error } = await supabase
        .from("compliance_events")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", eventId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error updating compliance event:", error);
      return { success: false, error: "Update failed" };
    }
  }

  // Get compliance dashboard data
  static async getComplianceDashboard() {
    try {
      const [eventsResult, verificationResult] = await Promise.all([
        supabase
          .from("compliance_events")
          .select("*")
          .eq("status", "open"),
        supabase
          .from("kyc_verifications")
          .select("verification_level, aml_status, risk_score")
      ]);

      const openEvents = eventsResult.data || [];
      const verifications = verificationResult.data || [];

      const dashboard = {
        open_events: openEvents.length,
        high_risk_events: openEvents.filter(e => e.risk_level === "high" || e.risk_level === "critical").length,
        flagged_users: verifications.filter(v => v.aml_status === "flagged").length,
        pending_verifications: verifications.filter(v => v.verification_level === "none").length,
        average_risk_score: verifications.reduce((sum, v) => sum + (v.risk_score || 0), 0) / verifications.length
      };

      return dashboard;
    } catch (error) {
      console.error("Error loading compliance dashboard:", error);
      return {};
    }
  }
}
