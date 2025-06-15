
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Smartphone, AlertTriangle, Clock, MapPin } from "lucide-react";
import TwoFactorAuth from "./TwoFactorAuth";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SecurityPreferences {
  loginNotifications: boolean;
  deviceVerification: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  maxDailyTransactions: number;
  requireConfirmationAbove: number;
}

interface LoginSession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActive: Date;
  isCurrent: boolean;
}

const SecuritySettings = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<SecurityPreferences>({
    loginNotifications: true,
    deviceVerification: true,
    sessionTimeout: 30,
    ipWhitelist: [],
    maxDailyTransactions: 10,
    requireConfirmationAbove: 1000
  });
  
  const [activeSessions, setActiveSessions] = useState<LoginSession[]>([]);
  const [newIPAddress, setNewIPAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSecuritySettings();
      loadActiveSessions();
    }
  }, [user]);

  const loadSecuritySettings = async () => {
    try {
      const response = await fetch('/api/user/security-settings');
      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await fetch('/api/user/sessions');
      const data = await response.json();
      setActiveSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSecuritySettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/security-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        toast.success('Security settings updated');
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const addIPToWhitelist = () => {
    if (!newIPAddress.trim()) return;
    
    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIPAddress.trim())) {
      toast.error('Please enter a valid IP address');
      return;
    }

    if (preferences.ipWhitelist.includes(newIPAddress.trim())) {
      toast.error('IP address already in whitelist');
      return;
    }

    setPreferences(prev => ({
      ...prev,
      ipWhitelist: [...prev.ipWhitelist, newIPAddress.trim()]
    }));
    setNewIPAddress('');
  };

  const removeIPFromWhitelist = (ip: string) => {
    setPreferences(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter(address => address !== ip)
    }));
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
        toast.success('Session terminated');
      } else {
        toast.error('Failed to terminate session');
      }
    } catch (error) {
      toast.error('Failed to terminate session');
    }
  };

  const terminateAllOtherSessions = async () => {
    try {
      const response = await fetch('/api/user/sessions/terminate-others', {
        method: 'POST'
      });

      if (response.ok) {
        setActiveSessions(prev => prev.filter(session => session.isCurrent));
        toast.success('All other sessions terminated');
      } else {
        toast.error('Failed to terminate sessions');
      }
    } catch (error) {
      toast.error('Failed to terminate sessions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <TwoFactorAuth />

      {/* Security Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Security Preferences</CardTitle>
          <CardDescription>
            Configure your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="loginNotifications">Login Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone logs into your account
                </p>
              </div>
              <Switch
                id="loginNotifications"
                checked={preferences.loginNotifications}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, loginNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="deviceVerification">Device Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Require verification for new devices
                </p>
              </div>
              <Switch
                id="deviceVerification"
                checked={preferences.deviceVerification}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, deviceVerification: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="5"
                max="240"
                value={preferences.sessionTimeout}
                onChange={(e) => 
                  setPreferences(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 30 }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDailyTransactions">Max Daily Transactions</Label>
              <Input
                id="maxDailyTransactions"
                type="number"
                min="1"
                max="100"
                value={preferences.maxDailyTransactions}
                onChange={(e) => 
                  setPreferences(prev => ({ ...prev, maxDailyTransactions: parseInt(e.target.value) || 10 }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requireConfirmationAbove">Require confirmation above ($)</Label>
              <Input
                id="requireConfirmationAbove"
                type="number"
                min="100"
                step="100"
                value={preferences.requireConfirmationAbove}
                onChange={(e) => 
                  setPreferences(prev => ({ ...prev, requireConfirmationAbove: parseInt(e.target.value) || 1000 }))
                }
              />
            </div>
          </div>

          <Button onClick={saveSecuritySettings} disabled={isLoading}>
            Save Security Settings
          </Button>
        </CardContent>
      </Card>

      {/* IP Whitelist */}
      <Card>
        <CardHeader>
          <CardTitle>IP Address Whitelist</CardTitle>
          <CardDescription>
            Only allow access from specific IP addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Be careful when enabling IP restrictions. You could lock yourself out of your account.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Input
              placeholder="192.168.1.1"
              value={newIPAddress}
              onChange={(e) => setNewIPAddress(e.target.value)}
            />
            <Button onClick={addIPToWhitelist}>Add IP</Button>
          </div>

          {preferences.ipWhitelist.length > 0 && (
            <div className="space-y-2">
              <Label>Allowed IP Addresses</Label>
              <div className="space-y-2">
                {preferences.ipWhitelist.map((ip, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-mono">{ip}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeIPFromWhitelist(ip)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage your active login sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{session.device}</span>
                    {session.isCurrent && (
                      <Badge variant="default">Current Session</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {session.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.lastActive.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {session.ipAddress}
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => terminateSession(session.id)}
                  >
                    Terminate
                  </Button>
                )}
              </div>
            ))}
          </div>

          {activeSessions.filter(s => !s.isCurrent).length > 0 && (
            <Button variant="destructive" onClick={terminateAllOtherSessions}>
              Terminate All Other Sessions
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;
