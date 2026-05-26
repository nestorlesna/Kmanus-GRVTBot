import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';

// Must EXACTLY match SIGNUP_TOS_TEXT in packages/bot/src/server/v2-router.ts.
// The server SHA-256-hashes its copy at signup and stores the hash per
// user — if these texts diverge, the user sees X but the audit log
// records acceptance of Y. Bump SIGNUP_TOS_VERSION when changing.
const TERMS_TEXT = `Terms of Use — please read carefully before creating an account.

1. WHAT THIS SERVICE IS
This is a self-hosted grid trading bot for the GRVT perpetual futures exchange. By signing up, you authorize the bot to place, modify, and cancel orders on your GRVT sub-account using API credentials you provide.

2. WHAT THIS SERVICE IS NOT
The operator is not a broker, custodian, financial advisor, fiduciary, exchange, or registered investment professional. No part of this service constitutes investment, legal, tax, or financial advice. The operator never holds your funds — your funds stay on your GRVT account at all times.

3. YOUR RESPONSIBILITY
You alone are responsible for: (a) every trade the bot executes under your account, (b) the configuration you choose (price range, leverage, grid count, investment size, safeguards), (c) the security of your GRVT account and API credentials, (d) any tax reporting on profits or losses, and (e) verifying that automated trading is legal in your jurisdiction.

4. TRADING RISK — YOU CAN LOSE EVERYTHING
Leveraged perpetual futures trading is extremely risky. You can lose up to 100% of the capital you allocate, and on leverage you can lose more than your initial position via liquidation, funding payments, or sudden market moves. The bot does not eliminate this risk — it automates execution of a strategy you choose. No profit is guaranteed, expected, or implied. Past performance of any sample, backtest, or other user's bot is not a predictor of your results.

5. SOFTWARE PROVIDED "AS IS"
The software is provided "as is" and "as available", without warranty of any kind — express, implied, statutory, or otherwise — including any warranty of merchantability, fitness for a particular purpose, accuracy, completeness, non-infringement, or uninterrupted operation. Bugs, mis-configurations, edge cases, race conditions, dependency vulnerabilities, and undocumented behavior may exist and may cause partial or total loss of funds.

6. NO SERVICE LEVEL — DOWNTIME IS EXPECTED
The operator makes no uptime commitment. The service may be paused, degraded, or shut down at any time, with or without notice, for maintenance, cost reasons, legal reasons, exchange outages, infrastructure failure, or no reason at all. During downtime your bots may stop trading, miss fills, fail to react to price moves, or leave open positions un-managed — any of which may cause loss.

7. THIRD-PARTY DEPENDENCIES
This service depends on: GRVT (exchange, API, matching engine, custody), the underlying blockchain network, internet infrastructure, the cloud provider hosting this server, the operating system, runtime libraries, and email delivery providers. The operator has no control over and accepts no responsibility for any failure, outage, change in terms, downtime, hack, exploit, slippage, or malicious behavior of any of these third parties. Risks include but are not limited to: GRVT outages, GRVT API rate limits or changes, exchange insolvency, smart contract bugs, network congestion, oracle failure, and DNS or TLS provider compromise.

8. DATA HANDLING + ENCRYPTION
The bot stores your email, a bcrypt hash of your password, and your GRVT API credentials encrypted at rest with AES-256-GCM. The master encryption key lives on the server's disk so the bot can decrypt credentials to place orders. THIS MEANS the server operator has technical access to decrypt your credentials, and any party who compromises the server (attacker, employee, hosting provider, law enforcement) may also gain that access. If you require zero third-party access to your keys, self-host your own copy of the software (see the GitHub repository). By using this hosted service you accept this exposure.

9. SECURITY INCIDENTS
In the event of a server compromise, data breach, credential theft, fund loss, or any other security incident — whether caused by an attacker, by a bug, by the operator, by an upstream provider, or by force majeure — you waive any claim against the operator for direct, indirect, incidental, consequential, special, punitive, or exemplary damages, including but not limited to lost funds, lost profits, lost opportunity, missed trades, liquidations, unwanted positions, regulatory fines, or reputational harm. You acknowledge that the operator's only obligation following an incident is to attempt timely notification — there is no compensation, refund, or insurance.

10. LIMITATION OF LIABILITY
To the maximum extent permitted by applicable law, in no event will the operator, contributors, or any affiliated party be liable to you or any third party for any claim, loss, damage, cost, or expense of any kind arising out of or related to your use of this service. This limitation applies regardless of the legal theory of liability (contract, tort, negligence, strict liability, or otherwise), regardless of whether the operator was advised of the possibility of such loss, and even if a remedy is found to have failed of its essential purpose. If any portion of this limitation is held unenforceable, the operator's total aggregate liability to you is capped at USD 1 (one US dollar).

11. INDEMNIFICATION
You agree to indemnify, defend, and hold harmless the operator and all contributors from any claim, demand, loss, liability, cost, or expense (including reasonable attorney fees) brought by any third party arising out of your use of the service, your violation of these terms, your violation of any law, or your infringement of any third party's rights.

12. NO REVERSAL, NO REFUND
There is no chargeback, refund, or rollback mechanism. Trades executed by the bot are final and settled on GRVT. The operator cannot reverse a trade, unwind a liquidation, recover stolen funds, or restore a lost API key.

13. CHANGES TO THESE TERMS
The operator may update these terms at any time. Continued use after an update constitutes acceptance of the new terms. Material changes will be surfaced on next login.

14. TERMINATION
The operator may suspend or terminate your account at any time, with or without cause, with or without notice. You may stop using the service and revoke your GRVT API keys at any time.

15. ACCEPTANCE
By clicking "I have read and accept the terms above" and creating an account, you confirm that you have read, understood, and agree to be bound by every clause above, that you are at least 18 years old, that you are using your own funds, and that you accept all risk of loss.`;

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);

  const passwordError =
    confirm && password !== confirm ? 'Passwords do not match' : undefined;
  const canSubmit =
    !!email && password.length >= 8 && password === confirm && accepted && !pending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    try {
      await signup(email, password);
      toast.success('Account created! Now connect your GRVT credentials.');
      navigate('/onboarding/grvt', { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'Signup failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-bg-base">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Create account
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Free grid trading bot for GRVT perpetual futures
          </p>
        </div>

        {/* GRVT referral callout — shown above the form so new users can
            open the GRVT signup in a new tab BEFORE filling this form.
            Referral is optional; users who already have GRVT just skip. */}
        <div className="rounded-md border border-primary/40 bg-primary/5 p-4 space-y-2">
          <div className="text-xs font-medium text-text-primary">
            ¿Todavía no tenés cuenta en GRVT?
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Este bot opera sobre tu cuenta de GRVT vía API — necesitás una
            antes de poder usarlo. Si te creás la cuenta con nuestro link de
            referido recibís beneficios y nos ayudás a sostener el proyecto.
          </p>
          <a
            href="https://grvt.io/?ref=R3WLGZS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-primary hover:underline"
          >
            → Crear cuenta GRVT (referido)
          </a>
          <p className="text-2xs text-text-muted pt-1 border-t border-border-subtle">
            ¿Ya tenés GRVT? Continuá con el signup abajo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
          <Input
            label="Password (min 8 characters)"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={passwordError}
            disabled={pending}
          />

          {/* Terms */}
          <div className="rounded-md border border-border-subtle bg-bg-surface p-3 space-y-2">
            <div className="text-2xs uppercase tracking-wider text-text-muted">
              Terms of use
            </div>
            <pre className="text-2xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
              {TERMS_TEXT}
            </pre>
            <label className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer pt-1 border-t border-border-subtle">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 size-4 accent-primary"
                disabled={pending}
              />
              <span>I have read and accept the terms above</span>
            </label>
          </div>

          <Button
            variant="primary"
            type="submit"
            disabled={!canSubmit}
            className="w-full"
          >
            {pending ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-xs text-text-muted text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
