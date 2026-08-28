# Memento House authentication email branding

Supabase sends account-confirmation and password-reset messages before the Memento House application runs. Configure these two templates in **Supabase Dashboard → Authentication → Email Templates** and use a verified custom SMTP sender such as `Memento House <hello@mementohouse.com>`.

## Confirm signup

Subject: `Confirm your Memento House account`

```html
<div style="margin:0;background:#f7f2e9;padding:40px 16px;color:#26231f;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:auto;background:#fffdf8;border:1px solid #ded4c4;padding:42px">
    <img src="https://mementohouse.com/brand/memento-house-logo.webp" width="88" alt="Memento House" style="display:block;margin:0 auto 26px" />
    <p style="text-align:center;text-transform:uppercase;letter-spacing:3px;font-size:10px;color:#9a7441">Made for the moment. Kept for a lifetime.</p>
    <h1 style="font:40px Georgia,serif;text-align:center;margin:12px 0 20px">Confirm your email address</h1>
    <p style="font-size:16px;line-height:1.7;color:#766f65">Confirm this email to finish creating your private Memento House account. Your account keeps orders, customizations, proofs, approvals, and shipping updates together.</p>
    <p style="text-align:center;margin:30px 0"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#9a7441;color:#fff;text-decoration:none;padding:15px 24px;text-transform:uppercase;letter-spacing:1.5px;font-size:11px;font-weight:bold">Confirm my email →</a></p>
    <p style="font-size:12px;line-height:1.6;color:#766f65">This link is time-sensitive. If it expires, return to the Memento House sign-in page and choose <strong>Resend confirmation email</strong>. If you did not create this account, you can ignore this message.</p>
  </div>
</div>
```

Use the same shell, logo, colors, and sender identity for **Reset Password**, changing the title, explanation, and button label to `Reset my password →`. Keep Supabase's `{{ .ConfirmationURL }}` variable as the button URL.

After saving, send a test email from Supabase and confirm that the logo URL is publicly reachable, the sender domain passes SPF/DKIM, and the link returns to the production `/auth/callback` URL.
