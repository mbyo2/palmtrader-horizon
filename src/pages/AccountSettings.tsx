import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CurrencySelector } from '@/components/CurrencySelector';

const profileFormSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  display_name: z.string().optional(),
  bio: z.string().max(160).optional(),
  phone: z.string().optional(),
  investment_experience: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  risk_tolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
  investment_goals: z.enum(['retirement', 'growth', 'income']).default('retirement'),
});

const preferencesFormSchema = z.object({
  currency: z.string().default('USD'),
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  market_updates: z.boolean().default(true),
  price_alerts: z.boolean().default(true),
  trade_confirmations: z.boolean().default(true),
  account_activity: z.boolean().default(true),
  marketing_communications: z.boolean().default(false),
});

const securityFormSchema = z.object({
  two_factor_enabled: z.boolean().default(false),
  login_notifications: z.boolean().default(true),
  allow_data_collection: z.boolean().default(true),
});

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, accountDetails, loading } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      first_name: '',
      last_name: '',
      display_name: '',
      bio: '',
      phone: '',
      investment_experience: 'beginner',
      risk_tolerance: 'moderate',
      investment_goals: 'retirement',
    },
  });

  const preferencesForm = useForm<z.infer<typeof preferencesFormSchema>>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      currency: 'USD',
      email_notifications: true,
      push_notifications: true,
      market_updates: true,
      price_alerts: true,
      trade_confirmations: true,
      account_activity: true,
      marketing_communications: false,
    },
  });

  const securityForm = useForm<z.infer<typeof securityFormSchema>>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      two_factor_enabled: false,
      login_notifications: true,
      allow_data_collection: true,
    },
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoadingProfile(true);
    try {
      // Fetch user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Fetch user profile details (additional fields)
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Fetch user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        throw preferencesError;
      }

      // Combine profile data
      const combinedProfile = {
        ...profileData,
        ...(userProfileData || {}),
      };

      setUserProfile(combinedProfile);
      setUserPreferences(preferencesData);
      setAvatarUrl(profileData?.avatar_url);

      // Set form values
      profileForm.reset({
        username: profileData?.username || '',
        first_name: userProfileData?.first_name || '',
        last_name: userProfileData?.last_name || '',
        display_name: userProfileData?.display_name || '',
        bio: userProfileData?.bio || '',
        phone: userProfileData?.phone || '',
        investment_experience: userProfileData?.investment_experience || 'beginner',
        risk_tolerance: userProfileData?.risk_tolerance || 'moderate',
        investment_goals: userProfileData?.investment_goals?.[0] || 'retirement',
      });

      if (preferencesData) {
        preferencesForm.reset({
          currency: preferencesData.currency || 'USD',
          email_notifications: preferencesData.email_notifications ?? true,
          push_notifications: preferencesData.push_notifications ?? true,
          market_updates: preferencesData.market_updates ?? true,
          price_alerts: preferencesData.price_alerts ?? true,
          trade_confirmations: preferencesData.trade_confirmations ?? true,
          account_activity: preferencesData.account_activity ?? true,
          marketing_communications: preferencesData.marketing_communications ?? false,
        });

        securityForm.reset({
          two_factor_enabled: preferencesData.two_factor_enabled ?? false,
          login_notifications: preferencesData.login_notifications ?? true,
          allow_data_collection: preferencesData.allow_data_collection ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user profile data',
        variant: 'destructive',
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    try {
      // Update profiles table (basic user info)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: values.username,
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Check if user_profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user?.id)
        .single();

      // Update or insert user_profiles
      const profileData = {
        first_name: values.first_name,
        last_name: values.last_name,
        display_name: values.display_name,
        bio: values.bio,
        phone: values.phone,
        investment_experience: values.investment_experience,
        risk_tolerance: values.risk_tolerance,
        investment_goals: [values.investment_goals],
        updated_at: new Date().toISOString(),
      };

      let userProfileError;
      if (existingProfile) {
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user?.id);
        userProfileError = error;
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user?.id,
            ...profileData,
          });
        userProfileError = error;
      }

      if (userProfileError) throw userProfileError;

      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been updated successfully.',
      });

      fetchUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile information',
        variant: 'destructive',
      });
    }
  };

  const onPreferencesSubmit = async (values: z.infer<typeof preferencesFormSchema>) => {
    try {
      // Check if user_preferences exists
      const { data: existingPreferences } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', user?.id)
        .single();

      // Update or insert user_preferences
      const preferencesData = {
        currency: values.currency,
        email_notifications: values.email_notifications,
        push_notifications: values.push_notifications,
        market_updates: values.market_updates,
        price_alerts: values.price_alerts,
        trade_confirmations: values.trade_confirmations,
        account_activity: values.account_activity,
        marketing_communications: values.marketing_communications,
        updated_at: new Date().toISOString(),
      };

      let preferencesError;
      if (existingPreferences) {
        const { error } = await supabase
          .from('user_preferences')
          .update(preferencesData)
          .eq('user_id', user?.id);
        preferencesError = error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user?.id,
            ...preferencesData,
          });
        preferencesError = error;
      }

      if (preferencesError) throw preferencesError;

      toast({
        title: 'Preferences Updated',
        description: 'Your preferences have been updated successfully.',
      });

      fetchUserData();
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    }
  };

  const onSecuritySubmit = async (values: z.infer<typeof securityFormSchema>) => {
    try {
      // Check if user_preferences exists
      const { data: existingPreferences } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', user?.id)
        .single();

      // Update or insert security settings in user_preferences
      const securityData = {
        two_factor_enabled: values.two_factor_enabled,
        login_notifications: values.login_notifications,
        allow_data_collection: values.allow_data_collection,
        updated_at: new Date().toISOString(),
      };

      let securityError;
      if (existingPreferences) {
        const { error } = await supabase
          .from('user_preferences')
          .update(securityData)
          .eq('user_id', user?.id);
        securityError = error;
      } else {
        const { error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user?.id,
            ...securityData,
          });
        securityError = error;
      }

      if (securityError) throw securityError;

      toast({
        title: 'Security Settings Updated',
        description: 'Your security settings have been updated successfully.',
      });

      fetchUserData();
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update security settings',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl.publicUrl);
      toast({
        title: 'Avatar Updated',
        description: 'Your avatar has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading || loadingProfile) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar>
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Avatar" />
                  ) : (
                    <AvatarFallback>{userProfile?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <FormLabel htmlFor="avatar">Update Avatar</FormLabel>
                  <Input type="file" id="avatar" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                  {uploading && <p>Uploading...</p>}
                </div>
              </div>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={profileForm.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Display Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Write something about yourself."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Max 160 characters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="investment_experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Experience</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Your level of investment experience.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="risk_tolerance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Tolerance</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="aggressive">Aggressive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Your risk tolerance level.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="investment_goals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Goals</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="retirement">Retirement</SelectItem>
                            <SelectItem value="growth">Growth</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Your primary investment goal.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Update Profile</Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="preferences" className="space-y-4">
              <Form {...preferencesForm}>
                <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-4">
                  <FormField
                    control={preferencesForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                          <CurrencySelector {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={preferencesForm.control}
                      name="email_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Email Notifications</FormLabel>
                            <FormDescription>Receive email notifications for important updates.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={preferencesForm.control}
                      name="push_notifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Push Notifications</FormLabel>
                            <FormDescription>Receive push notifications on your device.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={preferencesForm.control}
                      name="market_updates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Market Updates</FormLabel>
                            <FormDescription>Receive updates on market trends and news.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={preferencesForm.control}
                      name="price_alerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Price Alerts</FormLabel>
                            <FormDescription>Get notified when stocks reach your target prices.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={preferencesForm.control}
                      name="trade_confirmations"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Trade Confirmations</FormLabel>
                            <FormDescription>Receive confirmations for your trades.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={preferencesForm.control}
                      name="account_activity"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Account Activity</FormLabel>
                            <FormDescription>Get notified about unusual account activity.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={preferencesForm.control}
                    name="marketing_communications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Marketing Communications</FormLabel>
                          <FormDescription>Receive marketing communications and promotional offers.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Update Preferences</Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="security" className="space-y-4">
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4">
                  <FormField
                    control={securityForm.control}
                    name="two_factor_enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Two-Factor Authentication</FormLabel>
                          <FormDescription>Enable two-factor authentication for added security.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={securityForm.control}
                    name="login_notifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Login Notifications</FormLabel>
                          <FormDescription>Receive notifications when a new login is detected.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={securityForm.control}
                    name="allow_data_collection"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Allow Data Collection</FormLabel>
                          <FormDescription>Allow us to collect data to improve our services.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Update Security</Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;
