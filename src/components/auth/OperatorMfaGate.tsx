import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MfaMethod,
  OperatorRole,
  OperatorSession,
} from '../../types/spicebridge';

interface OperatorMfaGateProps {
  onVerified: (session: OperatorSession) => void;
  onResetWorkspace?: () => void;
}

const OPERATOR_ROLES: OperatorRole[] = [
  'Founder',
  'Procurement Lead',
  'Quality Assaying Lead',
  'Operations Lead',
];

const RESEND_COOLDOWN_SECONDS = 30;
const CODE_VALIDITY_SECONDS = 300; // 5 minutes

const DEMO_OPERATOR = {
  email: 'arjun.mehta@spicebridge.in',
  name: 'Arjun Mehta',
  role: 'Founder' as OperatorRole,
  mfaMethod: 'email_otp' as MfaMethod,
};

function generateSixDigitCode(): string {
  const randomInt = Math.floor(100000 + Math.random() * 900000);
  return String(randomInt);
}

function isValidEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function OperatorMfaGate({
  onVerified,
  onResetWorkspace,
}: OperatorMfaGateProps) {
  const [step, setStep] = useState<'sign-in' | 'mfa'>('sign-in');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetSuccessNotice, setResetSuccessNotice] = useState(false);

  // Step 1 form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<OperatorRole>('Founder');
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>('email_otp');
  const [demoAutofillActive, setDemoAutofillActive] = useState(false);

  // Validation & inline feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Dispatched OTP / MFA code state
  const [dispatchedCode, setDispatchedCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number>(0);
  const [resendAvailableAt, setResendAvailableAt] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedCode, setCopiedCode] = useState(false);

  // Step 2 six-digit code boxes
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const digitInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Tick timer while in MFA step for resend cooldown & code expiration
  useEffect(() => {
    if (step !== 'mfa') return;
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [step]);

  // Focus first digit box upon transitioning to MFA verification
  useEffect(() => {
    if (step === 'mfa') {
      const timer = window.setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [step]);

  const resendSecondsRemaining = useMemo(
    () => Math.max(0, Math.ceil((resendAvailableAt - nowMs) / 1000)),
    [resendAvailableAt, nowMs],
  );

  const expirySecondsRemaining = useMemo(
    () => Math.max(0, Math.ceil((codeExpiresAt - nowMs) / 1000)),
    [codeExpiresAt, nowMs],
  );

  const isCodeExpired = Boolean(dispatchedCode) && expirySecondsRemaining <= 0;

  const dispatchCodeAndEnterMfa = (targetEmail: string) => {
    const code = generateSixDigitCode();
    const current = Date.now();
    setDispatchedCode(code);
    setCodeExpiresAt(current + CODE_VALIDITY_SECONDS * 1000);
    setResendAvailableAt(current + RESEND_COOLDOWN_SECONDS * 1000);
    setNowMs(current);
    setDigits(['', '', '', '', '', '']);
    setMfaError(null);
    setFormError(null);
    setCopiedCode(false);
    setEmail(targetEmail.trim());
    setStep('mfa');
  };

  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setFormError('Please enter your work or operator email address.');
      return;
    }
    if (!isValidEmailFormat(trimmedEmail)) {
      setFormError('Please enter a valid email address (for example, name@company.in).');
      return;
    }
    if (!trimmedName) {
      setFormError('Please enter your operator name.');
      return;
    }

    dispatchCodeAndEnterMfa(trimmedEmail);
  };

  const handleToggleQuickDemoAutofill = () => {
    const nextEnabled = !demoAutofillActive;
    setDemoAutofillActive(nextEnabled);

    if (nextEnabled) {
      setEmail(DEMO_OPERATOR.email);
      setName(DEMO_OPERATOR.name);
      setRole(DEMO_OPERATOR.role);
      setMfaMethod(DEMO_OPERATOR.mfaMethod);
      dispatchCodeAndEnterMfa(DEMO_OPERATOR.email);
    } else {
      setEmail('');
      setName('');
      setRole('Founder');
      setMfaMethod('email_otp');
      setDispatchedCode(null);
      setDigits(['', '', '', '', '', '']);
      setFormError(null);
      setMfaError(null);
      setStep('sign-in');
    }
  };

  const handleResendCode = () => {
    if (resendSecondsRemaining > 0) return;
    const code = generateSixDigitCode();
    const current = Date.now();
    setDispatchedCode(code);
    setCodeExpiresAt(current + CODE_VALIDITY_SECONDS * 1000);
    setResendAvailableAt(current + RESEND_COOLDOWN_SECONDS * 1000);
    setNowMs(current);
    setDigits(['', '', '', '', '', '']);
    setMfaError(null);
    setCopiedCode(false);
    digitInputRefs.current[0]?.focus();
  };

  const handleCopyCode = async () => {
    if (!dispatchedCode) return;
    try {
      await navigator.clipboard.writeText(dispatchedCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback: keep copy state brief even if clipboard permission is blocked in iframe
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleChangeEmail = () => {
    setStep('sign-in');
    setMfaError(null);
    setDigits(['', '', '', '', '', '']);
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, '');
    setMfaError(null);

    if (!cleaned) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    // Handle multi-digit entry or mobile OTP autofill into a single box
    if (cleaned.length > 1) {
      const nextDigits = [...digits];
      for (let offset = 0; offset < cleaned.length && index + offset < 6; offset += 1) {
        nextDigits[index + offset] = cleaned[offset];
      }
      setDigits(nextDigits);
      const nextFocusIndex = Math.min(5, index + cleaned.length);
      digitInputRefs.current[nextFocusIndex]?.focus();
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });

    if (index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        e.preventDefault();
        setDigits((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
      } else if (index > 0) {
        e.preventDefault();
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
        digitInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    setMfaError(null);
    const sliced = pasted.slice(0, 6).split('');
    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < sliced.length; i += 1) {
      nextDigits[i] = sliced[i];
    }
    setDigits(nextDigits);
    const focusIndex = Math.min(5, Math.max(0, sliced.length - 1));
    digitInputRefs.current[focusIndex]?.focus();
  };

  const enteredCode = digits.join('');

  const handleVerifyMfa = (e: FormEvent) => {
    e.preventDefault();
    if (!dispatchedCode) {
      setMfaError('No active verification code found. Please request a new code.');
      return;
    }
    if (isCodeExpired) {
      setMfaError(
        'This verification code has expired. Click “Resend Code” to issue a fresh 6-digit code.',
      );
      return;
    }
    if (enteredCode.length !== 6) {
      setMfaError('Please enter all 6 numeric digits of your verification code.');
      return;
    }
    if (enteredCode !== dispatchedCode) {
      setMfaError(
        'Invalid verification code. Check the 6-digit code in the Demo Verification Dispatch banner and try again.',
      );
      return;
    }

    onVerified({
      email: email.trim(),
      name: name.trim() || 'SpiceBridge Operator',
      role,
      mfaMethod,
      mfaVerified: true,
      verifiedAt: new Date().toISOString(),
    });
  };

  const methodLabel =
    mfaMethod === 'email_otp'
      ? 'Email Verification Code (6-digit OTP)'
      : 'Authenticator / Backup Passcode (6-digit MFA code)';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Left Panel — SpiceBridge Operator Gate Context */}
          <aside className="lg:col-span-5 rounded-xl bg-forest-800 text-white p-6 sm:p-7 flex flex-col justify-between gap-6 border border-forest-900">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest-700 text-amber-300 border border-forest-600/60">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 16c4-6 12-6 16 0" />
                    <path d="M12 11V4" />
                    <path d="M12 4c2.5 0 4.5 1.5 5 4-2.5.5-4.5-1-5-4Z" />
                    <path d="M12 7c-2.5 0-4.5 1.5-5 4 2.5.5 4.5-1 5-4Z" />
                  </svg>
                </div>
                <div>
                  <p className="font-display text-xl font-bold tracking-tight text-white">
                    SpiceBridge
                  </p>
                  <p className="text-xs text-emerald-100/80">
                    Gujarat &amp; Rajasthan Spice Supply Chain
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-5">
                <h1 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl text-balance">
                  SpiceBridge Operator Access &amp; MFA Gate
                </h1>
                <p className="text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
                  Verify your operator identity and second factor before entering the
                  procurement assay bank, competitor research lab, positioning map, and
                  strategy challenge workspace.
                </p>
              </div>

              {/* Clean 2-Step Verification Checklist */}
              <div className="space-y-3 pt-1">
                <div
                  className={`rounded-lg border px-3.5 py-3 transition-colors ${
                    step === 'sign-in'
                      ? 'border-amber-300/60 bg-forest-900/70'
                      : 'border-emerald-400/30 bg-forest-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">
                      1. Email &amp; Operator Sign-In
                    </span>
                    {step === 'mfa' ? (
                      <CheckCircle2
                        className="h-4 w-4 text-amber-300 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="font-mono text-[11px] font-semibold text-amber-300 tabular-nums">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-100/75 leading-relaxed">
                    Work email, operator role, and preferred 6-digit second factor.
                  </p>
                </div>

                <div
                  className={`rounded-lg border px-3.5 py-3 transition-colors ${
                    step === 'mfa'
                      ? 'border-amber-300/60 bg-forest-900/70'
                      : 'border-white/10 bg-forest-900/30 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">
                      2. Multi-Factor Verification (MFA)
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-emerald-100/80 tabular-nums">
                      {step === 'mfa' ? 'Active' : 'Next'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-100/75 leading-relaxed">
                    Confirm the 6-digit verification code to unlock your workspace.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 text-[11px] leading-relaxed text-emerald-100/80">
              Your saved lots, competitor matrix, Battlefield Map scores, positioning
              statement, and AI Strategy Challenge records remain preserved in browser
              storage across sign-ins and locks.
            </div>
          </aside>

          {/* Right Panel — Step 1 or Step 2 Gate Form */}
          <section
            aria-label="Operator Authentication Form"
            className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 sm:p-7 flex flex-col justify-between gap-5"
          >
            {/* Header + Quick Demo Autofill Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="font-mono text-[11px] font-semibold text-forest-700 tabular-nums">
                  {step === 'sign-in' ? 'Step 1 of 2' : 'Step 2 of 2'}
                </p>
                <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
                  {step === 'sign-in'
                    ? 'Email & Operator Sign-In'
                    : 'Multi-Factor Verification (MFA)'}
                </h2>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={demoAutofillActive}
                onClick={handleToggleQuickDemoAutofill}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  demoAutofillActive
                    ? 'border-amber-300 bg-turmeric-50 text-amber-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`inline-flex h-4 w-7 items-center rounded-full p-0.5 transition-colors ${
                    demoAutofillActive ? 'bg-amber-600 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                  aria-hidden="true"
                >
                  <span className="h-3 w-3 rounded-full bg-white" />
                </span>
                <span>Quick Demo Autofill</span>
              </button>
            </div>

            {step === 'sign-in' ? (
              <form onSubmit={handleStep1Submit} noValidate className="space-y-4">
                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="operator-email"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Work / Operator Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="operator-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="operator@spicebridge.in"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="operator-name"
                      className="block text-xs font-semibold text-slate-800"
                    >
                      Operator Name
                    </label>
                    <input
                      id="operator-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g., Arjun Mehta"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-forest-600 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="operator-role"
                      className="block text-xs font-semibold text-slate-800"
                    >
                      Operator Role
                    </label>
                    <select
                      id="operator-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as OperatorRole)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-forest-600 focus:outline-none cursor-pointer"
                    >
                      {OPERATOR_ROLES.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <fieldset className="space-y-2 pt-1">
                  <legend className="text-xs font-semibold text-slate-800">
                    Preferred Second Factor Method
                  </legend>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMfaMethod('email_otp')}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                        mfaMethod === 'email_otp'
                          ? 'border-forest-600 bg-forest-50/70'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Mail
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          mfaMethod === 'email_otp' ? 'text-forest-700' : 'text-slate-500'
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          Email Verification Code
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          6-digit OTP dispatched to demo inbox preview
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMfaMethod('authenticator_backup')}
                      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                        mfaMethod === 'authenticator_backup'
                          ? 'border-forest-600 bg-forest-50/70'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          mfaMethod === 'authenticator_backup'
                            ? 'text-forest-700'
                            : 'text-slate-500'
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          Authenticator / Backup Passcode
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          6-digit MFA code shown in preview dispatch
                        </p>
                      </div>
                    </button>
                  </div>
                </fieldset>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    <span>Send Verification Code</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyMfa} noValidate className="space-y-4">
                {/* Operator & Email Summary + Change Email */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {name.trim()} · {role}
                    </p>
                    <p className="text-slate-600 truncate">
                      {email} · {methodLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                    <span>Change Email</span>
                  </button>
                </div>

                {/* Non-Intrusive Demo Verification Dispatch / Inbox Preview Banner */}
                {dispatchedCode && (
                  <div
                    aria-live="polite"
                    className="rounded-xl border border-amber-300 bg-turmeric-50/80 p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          Demo Verification Dispatch / Inbox Preview
                        </p>
                        <p className="text-[11px] text-amber-900/80">
                          Browser prototype preview for {email} ·{' '}
                          <span className="font-mono tabular-nums">
                            {isCodeExpired
                              ? 'Expired'
                              : `Expires in ${formatCountdown(expirySecondsRemaining)}`}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100/70 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-forest-700" aria-hidden="true" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3.5 py-2.5">
                      <span className="text-xs text-slate-600">
                        Your 6-digit verification code:
                      </span>
                      <span className="font-mono text-lg font-bold tracking-[0.22em] text-slate-900 tabular-nums select-all">
                        {dispatchedCode}
                      </span>
                    </div>
                  </div>
                )}

                {mfaError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{mfaError}</span>
                  </div>
                )}

                {/* 6-Digit Numeric Code Entry Boxes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="mfa-digit-0"
                      className="text-xs font-semibold text-slate-800"
                    >
                      Enter 6-Digit Verification Code
                    </label>
                    <button
                      type="button"
                      disabled={resendSecondsRemaining > 0}
                      onClick={handleResendCode}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        resendSecondsRemaining > 0
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-forest-700 hover:text-forest-800 cursor-pointer'
                      }`}
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      <span className="tabular-nums">
                        {resendSecondsRemaining > 0
                          ? `Resend Code (${resendSecondsRemaining}s)`
                          : 'Resend Code'}
                      </span>
                    </button>
                  </div>

                  <div
                    className="grid grid-cols-6 gap-2 sm:gap-3"
                    role="group"
                    aria-label="6-digit verification code"
                  >
                    {digits.map((digit, index) => (
                      <input
                        key={index}
                        id={`mfa-digit-${index}`}
                        ref={(el) => {
                          digitInputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        maxLength={6}
                        aria-label={`Verification digit ${index + 1} of 6`}
                        value={digit}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(index, e)}
                        onPaste={handleDigitPaste}
                        className="h-12 w-full rounded-lg border border-slate-300 bg-white text-center font-mono text-lg font-bold text-slate-900 tabular-nums focus:border-forest-600 focus:outline-none"
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Supports direct typing with auto-advance or pasting a 6-digit code.
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Verify &amp; Enter SpiceBridge</span>
                  </button>
                </div>
              </form>
            )}

            <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>SpiceBridge Operator Security Gate</span>

              {onResetWorkspace && (
                <div className="flex items-center gap-2">
                  {resetSuccessNotice ? (
                    <span className="font-semibold text-forest-700">
                      Workspace reset to start
                    </span>
                  ) : confirmingReset ? (
                    <>
                      <span className="text-amber-800 font-semibold">
                        Clear saved work?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onResetWorkspace();
                          setConfirmingReset(false);
                          setResetSuccessNotice(true);
                          window.setTimeout(() => setResetSuccessNotice(false), 3000);
                        }}
                        className="font-semibold text-red-700 hover:underline cursor-pointer"
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingReset(false)}
                        className="font-semibold text-slate-600 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(true)}
                      className="font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                    >
                      Reset Workspace &amp; Start Fresh
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
