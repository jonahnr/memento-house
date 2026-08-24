# Supabase email branding

In Supabase, open Authentication → Email Templates → Reset password, paste `reset-password.html`, and save. Then configure a Memento House SMTP sender under Authentication → SMTP so messages use your domain instead of the default Supabase sender. Keep `{{ .ConfirmationURL }}` unchanged.
