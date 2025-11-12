import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AutomatedComplianceService, ComplianceReport } from "@/services/AutomatedComplianceService";
import { FileText, Download, Send, CheckCircle, AlertTriangle, Calendar as CalendarIcon, FileBarChart } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ComplianceReporting() {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedReportType, setSelectedReportType] = useState<string>("");

  useEffect(() => {
    loadReports();
  }, [selectedReportType]);

  const loadReports = async () => {
    setIsLoading(true);
    const data = await AutomatedComplianceService.getReports(selectedReportType || undefined);
    setReports(data);
    setIsLoading(false);
  };

  const handleGenerateReport = async (type: 'aml' | 'kyc_audit') => {
    setIsLoading(true);
    toast.info(`Generating ${type.toUpperCase()} report...`);

    let report: ComplianceReport | null = null;
    if (type === 'aml') {
      report = await AutomatedComplianceService.generateAMLReport(startDate, endDate);
    } else {
      report = await AutomatedComplianceService.generateKYCReport(startDate, endDate);
    }

    if (report) {
      toast.success("Report generated successfully");
      await loadReports();
    } else {
      toast.error("Failed to generate report");
    }
    setIsLoading(false);
  };

  const handleDownload = (report: ComplianceReport, format: 'csv' | 'json') => {
    AutomatedComplianceService.downloadReport(report, format);
    toast.success(`Report downloaded as ${format.toUpperCase()}`);
  };

  const handleFinalize = async (reportId: string) => {
    const success = await AutomatedComplianceService.finalizeReport(reportId);
    if (success) {
      toast.success("Report finalized");
      await loadReports();
    } else {
      toast.error("Failed to finalize report");
    }
  };

  const handleSubmit = async (reportId: string) => {
    const authority = prompt("Enter the authority name to submit to:");
    if (!authority) return;

    const success = await AutomatedComplianceService.submitReport(reportId, authority);
    if (success) {
      toast.success("Report submitted to authorities");
      await loadReports();
    } else {
      toast.error("Failed to submit report");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      finalized: "default",
      submitted: "outline",
      archived: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      aml: "AML Report",
      kyc_audit: "KYC Audit",
      suspicious_activity: "Suspicious Activity",
      transaction_monitoring: "Transaction Monitoring",
      regulatory_filing: "Regulatory Filing"
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compliance Reporting</h2>
        <p className="text-muted-foreground">
          Generate and manage regulatory reports for AML, KYC, and suspicious activities
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Report</CardTitle>
              <CardDescription>Create regulatory compliance reports for authorities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={() => handleGenerateReport('aml')} disabled={isLoading} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate AML Report
                </Button>
                <Button onClick={() => handleGenerateReport('kyc_audit')} disabled={isLoading} variant="secondary" className="w-full">
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Generate KYC Audit
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>View and manage previously generated reports</CardDescription>
              <div className="pt-4">
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All report types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="aml">AML Reports</SelectItem>
                    <SelectItem value="kyc_audit">KYC Audits</SelectItem>
                    <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading reports...</p>
                ) : reports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No reports found</p>
                ) : (
                  reports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{getReportTypeLabel(report.report_type)}</h4>
                              {getStatusBadge(report.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(report.report_period_start), "MMM dd, yyyy")} -{" "}
                              {format(new Date(report.report_period_end), "MMM dd, yyyy")}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {report.total_items} items
                              </span>
                              {report.flagged_items > 0 && (
                                <span className="flex items-center gap-1 text-warning">
                                  <AlertTriangle className="h-3 w-3" />
                                  {report.flagged_items} flagged
                                </span>
                              )}
                              {report.critical_items > 0 && (
                                <span className="flex items-center gap-1 text-destructive">
                                  <AlertTriangle className="h-3 w-3" />
                                  {report.critical_items} critical
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-2">{report.summary}</p>
                            {report.submitted_to && (
                              <p className="text-sm text-muted-foreground">
                                Submitted to: {report.submitted_to} on{" "}
                                {format(new Date(report.submitted_at!), "PPP")}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleDownload(report, 'csv')}>
                              <Download className="h-4 w-4 mr-1" />
                              CSV
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDownload(report, 'json')}>
                              <Download className="h-4 w-4 mr-1" />
                              JSON
                            </Button>
                            {report.status === 'draft' && (
                              <Button variant="secondary" size="sm" onClick={() => handleFinalize(report.id)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Finalize
                              </Button>
                            )}
                            {report.status === 'finalized' && (
                              <Button variant="default" size="sm" onClick={() => handleSubmit(report.id)}>
                                <Send className="h-4 w-4 mr-1" />
                                Submit
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
