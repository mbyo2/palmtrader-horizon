import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ComplianceAlertRequest {
  alertType: "suspicious_activity" | "aml_alert" | "kyc_failure";
  severity: "low" | "medium" | "high" | "critical";
  userId: string;
  description: string;
  details: Record<string, unknown>;
  riskScore?: number;
  complianceOfficerEmail: string;
}

const VALID_ALERT_TYPES = ["suspicious_activity", "aml_alert", "kyc_failure"];
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case "critical": return "#DC2626";
    case "high": return "#EA580C";
    case "medium": return "#CA8A04";
    default: return "#2563EB";
  }
};

const getAlertTypeLabel = (alertType: string): string => {
  switch (alertType) {
    case "suspicious_activity": return "Suspicious Activity Report";
    case "aml_alert": return "AML Alert";
    case "kyc_failure": return "KYC Verification Failure";
    default: return "Compliance Alert";
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check admin role using service role client
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Validate input
    const body: ComplianceAlertRequest = await req.json();
    const { alertType, severity, userId, description, details, riskScore, complianceOfficerEmail } = body;

    if (!alertType || !VALID_ALERT_TYPES.includes(alertType)) {
      return new Response(
        JSON.stringify({ error: "Invalid alertType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!severity || !VALID_SEVERITIES.includes(severity)) {
      return new Response(
        JSON.stringify({ error: "Invalid severity" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!userId || !description || !complianceOfficerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, description, complianceOfficerEmail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(complianceOfficerEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.id} sending compliance alert: ${alertType} - ${severity} for user ${userId}`);

    const severityColor = getSeverityColor(severity);
    const alertLabel = getAlertTypeLabel(alertType);
    const timestamp = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "long",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background-color: ${severityColor}; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ ${alertLabel}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
                Severity: <strong style="text-transform: uppercase;">${severity}</strong>
              </p>
            </div>
            <div style="padding: 24px;">
              <div style="background-color: #fef2f2; border-left: 4px solid ${severityColor}; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; color: #991b1b; font-weight: 600;">Immediate Attention Required</p>
                <p style="margin: 8px 0 0 0; color: #7f1d1d;">${description}</p>
              </div>
              <h2 style="color: #1f2937; font-size: 18px; margin: 20px 0 12px 0;">Alert Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">User ID</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-family: monospace;">${userId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Alert Type</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${alertType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Timestamp</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${timestamp}</td>
                </tr>
                ${riskScore !== undefined ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Risk Score</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="background-color: ${riskScore > 70 ? '#fef2f2' : riskScore > 40 ? '#fefce8' : '#f0fdf4'}; color: ${riskScore > 70 ? '#991b1b' : riskScore > 40 ? '#854d0e' : '#166534'}; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${riskScore}/100</span>
                  </td>
                </tr>
                ` : ''}
              </table>
              ${details && Object.keys(details).length > 0 ? `
              <h3 style="color: #1f2937; font-size: 16px; margin: 24px 0 12px 0;">Additional Information</h3>
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; font-family: monospace; font-size: 13px; overflow-x: auto;">
                <pre style="margin: 0; white-space: pre-wrap; word-break: break-word;">${JSON.stringify(details, null, 2)}</pre>
              </div>
              ` : ''}
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  This is an automated alert from the compliance monitoring system. 
                  Please review this activity immediately and take appropriate action.
                </p>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Trading Platform Compliance System • Confidential
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Compliance Alerts <onboarding@resend.dev>",
      to: [complianceOfficerEmail],
      subject: `[${severity.toUpperCase()}] ${alertLabel} - Immediate Action Required`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending compliance alert:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
