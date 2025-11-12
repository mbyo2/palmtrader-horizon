import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AutomatedComplianceService, SuspiciousActivity } from "@/services/AutomatedComplianceService";
import { AlertTriangle, CheckCircle, Clock, Shield, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SuspiciousActivityMonitor() {
  const [activities, setActivities] = useState<SuspiciousActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<SuspiciousActivity | null>(null);
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    loadActivities();
    const interval = setInterval(loadActivities, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    const data = await AutomatedComplianceService.monitorSuspiciousActivities();
    setActivities(data);
  };

  const handleUpdateStatus = async () => {
    if (!selectedActivity || !newStatus) return;

    setIsLoading(true);
    const success = await AutomatedComplianceService.updateSuspiciousActivity(
      selectedActivity.id,
      {
        status: newStatus as any,
        investigation_notes: investigationNotes || undefined,
        resolution: resolution || undefined
      }
    );

    if (success) {
      toast.success("Activity status updated");
      await loadActivities();
      setSelectedActivity(null);
      setInvestigationNotes("");
      setResolution("");
      setNewStatus("");
    } else {
      toast.error("Failed to update activity");
    }
    setIsLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: "text-blue-500 bg-blue-500/10",
      medium: "text-yellow-500 bg-yellow-500/10",
      high: "text-orange-500 bg-orange-500/10",
      critical: "text-destructive bg-destructive/10"
    };
    return colors[severity] || colors.medium;
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical') return <AlertTriangle className="h-4 w-4" />;
    if (severity === 'high') return <TrendingUp className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      unusual_transaction: "Unusual Transaction",
      high_frequency: "High Frequency Trading",
      large_amount: "Large Amount",
      geographic_anomaly: "Geographic Anomaly",
      pattern_match: "Pattern Match",
      kyc_mismatch: "KYC Mismatch",
      sanctions_hit: "Sanctions Hit",
      pep_match: "PEP Match"
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      investigating: { variant: "default", icon: Shield },
      cleared: { variant: "outline", icon: CheckCircle },
      escalated: { variant: "destructive", icon: AlertTriangle },
      reported: { variant: "outline", icon: CheckCircle }
    };
    const { variant, icon: Icon } = variants[status] || variants.pending;
    return (
      <Badge variant={variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  // Calculate statistics
  const stats = {
    total: activities.length,
    critical: activities.filter(a => a.severity === 'critical').length,
    investigating: activities.filter(a => a.status === 'investigating').length,
    pending: activities.filter(a => a.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Suspicious Activity Monitor</h2>
        <p className="text-muted-foreground">
          Real-time monitoring and investigation of suspicious activities
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Active monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Investigation</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.investigating}</div>
            <p className="text-xs text-muted-foreground">Being reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Suspicious Activities</CardTitle>
          <CardDescription>Monitor and investigate flagged activities in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No suspicious activities detected</p>
            ) : (
              activities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(activity.severity)}>
                            {getSeverityIcon(activity.severity)}
                            <span className="ml-1">{activity.severity.toUpperCase()}</span>
                          </Badge>
                          {getStatusBadge(activity.status)}
                          <span className="text-sm text-muted-foreground">
                            Risk: {activity.risk_score}/100
                          </span>
                        </div>
                        <h4 className="font-semibold">{getActivityTypeLabel(activity.activity_type)}</h4>
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Detected: {format(new Date(activity.created_at), "PPP p")}
                        </p>
                        {activity.investigation_notes && (
                          <div className="mt-2 p-2 bg-muted rounded-md">
                            <p className="text-xs font-medium">Investigation Notes:</p>
                            <p className="text-xs">{activity.investigation_notes}</p>
                          </div>
                        )}
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedActivity(activity);
                              setNewStatus(activity.status);
                              setInvestigationNotes(activity.investigation_notes || "");
                              setResolution(activity.resolution || "");
                            }}
                          >
                            Investigate
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Investigate Suspicious Activity</DialogTitle>
                            <DialogDescription>
                              Update status and add investigation notes
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Status</label>
                              <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="investigating">Investigating</SelectItem>
                                  <SelectItem value="cleared">Cleared</SelectItem>
                                  <SelectItem value="escalated">Escalated</SelectItem>
                                  <SelectItem value="reported">Reported to Authorities</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Investigation Notes</label>
                              <Textarea
                                value={investigationNotes}
                                onChange={(e) => setInvestigationNotes(e.target.value)}
                                placeholder="Add your investigation findings..."
                                rows={4}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium">Resolution</label>
                              <Textarea
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                placeholder="Document the resolution..."
                                rows={3}
                              />
                            </div>

                            <div className="bg-muted p-4 rounded-lg space-y-2">
                              <p className="text-sm font-medium">Activity Details</p>
                              <pre className="text-xs overflow-auto">
                                {JSON.stringify(activity.details, null, 2)}
                              </pre>
                            </div>

                            <Button 
                              onClick={handleUpdateStatus} 
                              disabled={isLoading}
                              className="w-full"
                            >
                              Update Activity
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
