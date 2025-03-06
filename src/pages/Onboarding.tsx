import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

const investmentFormSchema = z.object({
  investment_experience: z.enum(['beginner', 'intermediate', 'advanced']),
  risk_tolerance: z.enum(['low', 'moderate', 'high']),
  investment_goals: z.enum(['retirement', 'growth', 'income', 'speculation']),
});

const Step1 = ({ form }: { form: any }) => {
  return (
    <div>
      <FormField
        control={form.control}
        name="investment_experience"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Investment Experience</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Select your level of investment experience.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="risk_tolerance"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Risk Tolerance</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select your risk tolerance" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Select your risk tolerance.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="investment_goals"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Investment Goals</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select your investment goals" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="retirement">Retirement</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="speculation">Speculation</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Select your investment goals.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

const Onboarding = () => {
  const { user, accountDetails, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const investmentForm = useForm<z.infer<typeof investmentFormSchema>>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      investment_experience: 'beginner',
      risk_tolerance: 'moderate',
      investment_goals: 'retirement',
    },
  });

  React.useEffect(() => {
    // Redirect if user is not authenticated
    if (!loading && !user) {
      navigate('/auth');
    }
    
    // Redirect if onboarding is already completed
    if (accountDetails?.onboarding_completed) {
      navigate('/');
    }
  }, [user, loading, accountDetails, navigate]);

  const StepButtons = () => (
    <div className="flex justify-between">
      {step > 1 && (
        <Button variant="secondary" onClick={() => setStep(step - 1)}>
          Previous
        </Button>
      )}
      {step < 3 ? (
        <Button onClick={() => setStep(step + 1)}>Next</Button>
      ) : (
        <Button type="submit" isLoading={isSubmitting}>
          Complete
        </Button>
      )}
    </div>
  );

  const handleComplete = async (values: z.infer<typeof investmentFormSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Update account_details to mark onboarding as completed
      const { error: accountError } = await supabase
        .from('account_details')
        .update({
          onboarding_completed: true
        })
        .eq('id', user?.id);
      
      if (accountError) throw accountError;
      
      // Save all the profile information
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user?.id)
        .single();
        
      // Information to save to user_profiles
      const profileData = {
        investment_experience: values.investment_experience,
        risk_tolerance: values.risk_tolerance,
        investment_goals: [values.investment_goals]
      };
      
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('user_id', user?.id);
          
        if (error) throw error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user?.id,
            ...profileData
          });
          
        if (error) throw error;
      }
      
      toast({
        title: 'Onboarding Complete',
        description: 'Welcome to the platform! Your account is now set up.'
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Our Platform</CardTitle>
          <CardDescription>Complete your profile to get started.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form {...investmentForm}>
            <form onSubmit={investmentForm.handleSubmit(handleComplete)} className="space-y-4">
              <Step1 form={investmentForm} />
              <StepButtons />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
