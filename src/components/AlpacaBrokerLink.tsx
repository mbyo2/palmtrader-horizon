import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlpacaBrokerService, type AlpacaOnboardingPayload } from '@/services/AlpacaBrokerService';
import { CheckCircle, AlertTriangle, Landmark, Loader2, RefreshCw } from 'lucide-react';

/**
 * Self-serve Alpaca brokerage linking.
 *
 * Reuses identity data the app already captured during onboarding/KYC
 * (name, date of birth, phone, tax ID, residence) and only asks for the
 * fields Alpaca's create_account additionally requires: structured
 * address parts, citizenship / birth / tax-residence countries, funding
 * source, disclosures and agreement consent. Nothing is re-asked that
 * the app already holds.
 */

export interface AlpacaLinkPrefill {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  tax_id?: string;
  /** ISO alpha-2 country from onboarding (e.g. "ZM") */
  country?: string;
  /** Free-text address captured in onboarding step 2 */
  address?: string;
  email?: string;
}

const ALPHA2_TO_ALPHA3: Record<string, string> = {
  ZM: 'ZMB', ZW: 'ZWE', KE: 'KEN', NG: 'NGA', ZA: 'ZAF', TZ: 'TZA',
  UG: 'UGA', GH: 'GHA', US: 'USA', GB: 'GBR', BW: 'BWA', MW: 'MWI',
  MZ: 'MOZ', NA: 'NAM', AO: 'AGO', CD: 'COD', RW: 'RWA',
};

const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'ZMB', label: 'Zambia' },
  { code: 'ZWE', label: 'Zimbabwe' },
  { code: 'KEN', label: 'Kenya' },
  { code: 'NGA', label: 'Nigeria' },
  { code: 'ZAF', label: 'South Africa' },
  { code: 'TZA', label: 'Tanzania' },
  { code: 'UGA', label: 'Uganda' },
  { code: 'GHA', label: 'Ghana' },
  { code: 'BWA', label: 'Botswana' },
  { code: 'MWI', label: 'Malawi' },
  { code: 'MOZ', label: 'Mozambique' },
  { code: 'NAM', label: 'Namibia' },
  { code: 'AGO', label: 'Angola' },
  { code: 'COD', label: 'DR Congo' },
  { code: 'RWA', label: 'Rwanda' },
  { code: 'USA', label: 'United States' },
  { code: 'GBR', label: 'United Kingdom' },
];

const FUNDING_SOURCES: Array<{ value: string; label: string }> = [
  { value: 'employment_income', label: 'Employment income' },
  { value: 'savings', label: 'Savings' },
  { value: 'investments', label: 'Investments' },
  { value: 'business_income', label: 'Business income' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'other', label: 'Other' },
];

type LinkState =
  | { phase: 'checking' }
  | { phase: 'unlinked' }
  | { phase: 'linked'; account: Record<string, unknown> };

interface AlpacaBrokerLinkProps {
  prefill?: AlpacaLinkPrefill;
  onStatusChange?: (linked: boolean, status?: string) => void;
}

const AlpacaBrokerLink = ({ prefill, onStatusChange }: AlpacaBrokerLinkProps) => {
  const { toast } = useToast();
  const [linkState, setLinkState] = useState<LinkState>({ phase: 'checking' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreedToBrokerage, setAgreedToBrokerage] = useState(false);

  const [form, setForm] = useState({
    given_name: '',
    family_name: '',
    email_address: '',
    phone_number: '',
    date_of_birth: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'ZMB',
    tax_id: '',
    country_of_citizenship: 'ZMB',
    country_of_birth: 'ZMB',
    country_of_tax_residence: 'ZMB',
    funding_source: 'employment_income',
    is_control_person: false,
    is_affiliated_exchange_or_finra: false,
    is_politically_exposed: false,
    immediate_family_exposed: false,
  });

  const set = (key: keyof typeof form) => (value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const checkLinked = useCallback(async () => {
    try {
      const res = await AlpacaBrokerService.getAccount();
      if (res.linked && res.account) {
        setLinkState({ phase: 'linked', account: res.account });
        onStatusChange?.(true, String(res.account.status ?? ''));
      } else {
        setLinkState({ phase: 'unlinked' });
        onStatusChange?.(false);
      }
    } catch {
      // Read-back failed (network/function error) — fall back to the form;
      // a duplicate create is refused by Alpaca itself and surfaced below.
      setLinkState({ phase: 'unlinked' });
      onStatusChange?.(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    checkLinked();
  }, [checkLinked]);

  // Prefill from props (live onboarding form state) layered over whatever
  // account_details already holds, so the user never re-types known data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let stored: Record<string, string | null> = {};
      if (user) {
        const { data } = await supabase
          .from('account_details')
          .select('first_name, last_name, phone_number, date_of_birth, tax_id, country, address')
          .eq('id', user.id)
          .maybeSingle();
        if (data) stored = data as Record<string, string | null>;
      }
      if (cancelled) return;
      const merged: AlpacaLinkPrefill = {
        first_name: prefill?.first_name || stored.first_name || '',
        last_name: prefill?.last_name || stored.last_name || '',
        phone_number: prefill?.phone_number || stored.phone_number || '',
        date_of_birth: prefill?.date_of_birth || stored.date_of_birth || '',
        tax_id: prefill?.tax_id || stored.tax_id || '',
        country: prefill?.country || stored.country || 'ZM',
        address: prefill?.address || stored.address || '',
        email: prefill?.email || user?.email || '',
      };
      const alpha3 = ALPHA2_TO_ALPHA3[(merged.country || 'ZM').toUpperCase()] || 'ZMB';
      setForm(prev => ({
        ...prev,
        given_name: merged.first_name || prev.given_name,
        family_name: merged.last_name || prev.family_name,
        email_address: merged.email || prev.email_address,
        phone_number: merged.phone_number || prev.phone_number,
        date_of_birth: merged.date_of_birth || prev.date_of_birth,
        tax_id: merged.tax_id || prev.tax_id,
        street_address: merged.address || prev.street_address,
        country: alpha3,
        country_of_citizenship: alpha3,
        country_of_birth: alpha3,
        country_of_tax_residence: alpha3,
      }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.first_name, prefill?.last_name, prefill?.phone_number, prefill?.date_of_birth, prefill?.tax_id, prefill?.country, prefill?.address, prefill?.email]);

  const formValid =
    form.given_name.trim() !== '' &&
    form.family_name.trim() !== '' &&
    form.email_address.trim() !== '' &&
    form.phone_number.trim() !== '' &&
    form.date_of_birth !== '' &&
    form.street_address.trim() !== '' &&
    form.city.trim() !== '' &&
    form.postal_code.trim() !== '' &&
    form.tax_id.trim().length >= 2 &&
    agreedToBrokerage;

  const handleLink = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Best-effort client IP for the agreement record; the sandbox accepts
      // the loopback placeholder when the lookup is unavailable.
      let ipAddress = '127.0.0.1';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        if (ipRes.ok) {
          const ipJson = await ipRes.json();
          if (ipJson?.ip) ipAddress = String(ipJson.ip);
        }
      } catch { /* keep placeholder */ }

      const signedAt = new Date().toISOString();
      const payload: AlpacaOnboardingPayload = {
        contact: {
          email_address: form.email_address.trim(),
          phone_number: form.phone_number.trim(),
          street_address: [form.street_address.trim()],
          city: form.city.trim(),
          ...(form.state.trim() ? { state: form.state.trim() } : {}),
          postal_code: form.postal_code.trim(),
          country: form.country,
        },
        identity: {
          given_name: form.given_name.trim(),
          family_name: form.family_name.trim(),
          date_of_birth: form.date_of_birth,
          tax_id: form.tax_id.trim(),
          tax_id_type: form.country_of_tax_residence === 'USA' ? 'USA_SSN' : 'NOT_SPECIFIED',
          country_of_citizenship: form.country_of_citizenship,
          country_of_birth: form.country_of_birth,
          country_of_tax_residence: form.country_of_tax_residence,
          funding_source: [form.funding_source],
        },
        disclosures: {
          is_control_person: form.is_control_person,
          is_affiliated_exchange_or_finra: form.is_affiliated_exchange_or_finra,
          is_politically_exposed: form.is_politically_exposed,
          immediate_family_exposed: form.immediate_family_exposed,
        },
        agreements: [
          { agreement: 'account_agreement', signed_at: signedAt, ip_address: ipAddress },
          { agreement: 'customer_agreement', signed_at: signedAt, ip_address: ipAddress },
          { agreement: 'crypto_agreement', signed_at: signedAt, ip_address: ipAddress },
        ],
      };

      await AlpacaBrokerService.createAccount(payload);

      // Read the account back from Alpaca — the linked state shown to the
      // user comes from the read-back, never from the create response alone.
      const readBack = await AlpacaBrokerService.getAccount();
      if (readBack.linked && readBack.account) {
        setLinkState({ phase: 'linked', account: readBack.account });
        onStatusChange?.(true, String(readBack.account.status ?? ''));
        toast({
          title: 'Brokerage account linked',
          description: `Your Alpaca account is ${String(readBack.account.status ?? 'ACTIVE')}. You can trade US stocks and crypto once onboarding completes.`,
        });
      } else {
        throw new Error('Alpaca accepted the application but the account did not read back as linked. Please try refreshing the status.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSubmitError(message);
      toast({
        title: 'Alpaca could not link your account',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (linkState.phase === 'checking') {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your brokerage link status…
        </CardContent>
      </Card>
    );
  }

  if (linkState.phase === 'linked') {
    const account = linkState.account;
    const status = String(account.status ?? 'UNKNOWN');
    const cryptoStatus = account.crypto_status ? String(account.crypto_status) : null;
    const legacyCrypto = cryptoStatus !== null && cryptoStatus !== 'ACTIVE';
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" /> US Brokerage — Alpaca
          </CardTitle>
          <CardDescription>Your Alpaca brokerage account is linked to Palm Cacia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
                <CheckCircle className="h-3 w-3 mr-1" /> LINKED — {status}
              </Badge>
              {cryptoStatus && (
                <Badge variant={legacyCrypto ? 'outline' : 'secondary'}>Crypto: {cryptoStatus}</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Account number:</span> <strong>{String(account.account_number ?? '—')}</strong></div>
              <div><span className="text-muted-foreground">Cash:</span> <strong>${String(account.cash ?? '0.00')}</strong></div>
              <div><span className="text-muted-foreground">Buying power:</span> <strong>${String(account.buying_power ?? '0.00')}</strong></div>
              <div><span className="text-muted-foreground">Currency:</span> <strong>{String(account.currency ?? 'USD')}</strong></div>
            </div>
          </div>
          {legacyCrypto && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Crypto not yet enabled on this account</AlertTitle>
              <AlertDescription>
                This account was linked before crypto support was added, so US stocks are available now and
                crypto enablement is pending on Alpaca's side. No action is needed from you here.
              </AlertDescription>
            </Alert>
          )}
          <Button variant="outline" onClick={checkLinked} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh status
          </Button>
        </CardContent>
      </Card>
    );
  }

  const disclosureItems: Array<{ key: 'is_control_person' | 'is_affiliated_exchange_or_finra' | 'is_politically_exposed' | 'immediate_family_exposed'; label: string }> = [
    { key: 'is_control_person', label: 'I am a control person of a publicly traded company (director, officer or 10%+ shareholder)' },
    { key: 'is_affiliated_exchange_or_finra', label: 'I am affiliated with a stock exchange or FINRA' },
    { key: 'is_politically_exposed', label: 'I am a politically exposed person (senior political figure)' },
    { key: 'immediate_family_exposed', label: 'An immediate family member of mine is politically exposed' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" /> Link your US brokerage account
        </CardTitle>
        <CardDescription>
          US stocks and exchange crypto on Palm Cacia trade through Alpaca. Your name, date of birth,
          phone and address from the earlier steps are already filled in — we only ask for what Alpaca
          still needs. You can skip this step and link later from the KYC page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="alpaca_given_name">First name *</Label>
            <Input id="alpaca_given_name" value={form.given_name} onChange={(e) => set('given_name')(e.target.value)} placeholder="Legal first name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alpaca_family_name">Last name *</Label>
            <Input id="alpaca_family_name" value={form.family_name} onChange={(e) => set('family_name')(e.target.value)} placeholder="Legal last name" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="alpaca_email">Email *</Label>
            <Input id="alpaca_email" type="email" value={form.email_address} onChange={(e) => set('email_address')(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alpaca_phone">Phone *</Label>
            <Input id="alpaca_phone" value={form.phone_number} onChange={(e) => set('phone_number')(e.target.value)} placeholder="+260 97X XXX XXX" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="alpaca_dob">Date of birth *</Label>
            <Input id="alpaca_dob" type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth')(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alpaca_tax_id">Tax ID / NRC *</Label>
            <Input id="alpaca_tax_id" value={form.tax_id} onChange={(e) => set('tax_id')(e.target.value)} placeholder="Tax ID or NRC number" />
            <p className="text-xs text-muted-foreground">Alpaca requires a tax ID to open the account.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="alpaca_street">Street address *</Label>
          <Input id="alpaca_street" value={form.street_address} onChange={(e) => set('street_address')(e.target.value)} placeholder="Plot / street address" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="alpaca_city">City *</Label>
            <Input id="alpaca_city" value={form.city} onChange={(e) => set('city')(e.target.value)} placeholder="Lusaka" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alpaca_state">Province / State</Label>
            <Input id="alpaca_state" value={form.state} onChange={(e) => set('state')(e.target.value)} placeholder="Lusaka" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alpaca_postal">Postal code *</Label>
            <Input id="alpaca_postal" value={form.postal_code} onChange={(e) => set('postal_code')(e.target.value)} placeholder="10101" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Country of residence *</Label>
            <Select value={form.country} onValueChange={set('country')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Main source of funds *</Label>
            <Select value={form.funding_source} onValueChange={set('funding_source')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUNDING_SOURCES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Country of citizenship</Label>
            <Select value={form.country_of_citizenship} onValueChange={set('country_of_citizenship')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country of birth</Label>
            <Select value={form.country_of_birth} onValueChange={set('country_of_birth')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country of tax residence</Label>
            <Select value={form.country_of_tax_residence} onValueChange={set('country_of_tax_residence')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Disclosures — tick any that apply to you</p>
          {disclosureItems.map(item => (
            <label key={item.key} className="flex items-start space-x-3 cursor-pointer p-2 rounded-md hover:bg-muted transition-colors">
              <Checkbox
                checked={form[item.key]}
                onCheckedChange={(checked) => set(item.key)(!!checked)}
                className="mt-0.5"
              />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>

        <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-muted transition-colors">
          <Checkbox
            checked={agreedToBrokerage}
            onCheckedChange={(checked) => setAgreedToBrokerage(!!checked)}
            className="mt-0.5"
          />
          <div>
            <p className="text-sm font-medium">Alpaca brokerage agreements *</p>
            <p className="text-xs text-muted-foreground">
              I agree to Alpaca's Account Agreement, Customer Agreement and Crypto Agreement, and I
              authorise Palm Cacia to open a brokerage account with Alpaca in my name.
            </p>
          </div>
        </label>

        {submitError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alpaca declined the link request</AlertTitle>
            <AlertDescription className="break-words">
              {submitError} Check the details above and try again — nothing was linked.
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleLink} disabled={!formValid || submitting} className="w-full gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
          {submitting ? 'Linking with Alpaca…' : 'Link my Alpaca account'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Linking is optional at this step — you can continue onboarding and link later from the KYC page.
        </p>
      </CardContent>
    </Card>
  );
};

export default AlpacaBrokerLink;
