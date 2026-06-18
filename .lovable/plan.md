## Plan

1. **Turn off the broken custom auth-email sender path**
   - Remove the manual verification-email server function that currently tries to send signup emails through `notify.miyerp-tvet.com`.
   - Change signup back to the platform-managed email verification flow so new users get the default verification email from `no-reply@auth.lovable.cloud`.
   - Change password reset to remain on the platform-managed auth flow from the same default auth sender.

2. **Keep app emails on the verified branded sender**
   - Leave normal trainer/admin/app notification emails on `notify.miyerp-tvet.com`.
   - Keep the existing app-email queue and sending route for non-auth notifications only.

3. **Fix resend behavior**
   - Update the user-facing “Resend email” button to call the platform auth resend method instead of the custom queue.
   - Update the admin “resend verification” action to generate/send a platform auth confirmation email, not a branded app email.
   - Adjust the admin email-status display so it no longer treats auth verification as an app-email queue status if default platform auth emails are used.

4. **Preserve confirmation flow**
   - Keep `/auth/confirm` as the app confirmation page if the platform email contains token links that route through it.
   - Ensure verification links send users back into the app after confirmation.

5. **Backend auth settings and verification**
   - Ensure email signup still requires confirmation; do **not** enable auto-confirm.
   - Keep Google sign-in intact.
   - Check recent auth logs after the change to verify signup/resend requests are accepted by the auth backend.

## Result

Auth emails and app emails will be separated:

```text
Signup verification / password reset / auth links -> no-reply@auth.lovable.cloud
Trainer/admin/app notifications                  -> notify.miyerp-tvet.com
```