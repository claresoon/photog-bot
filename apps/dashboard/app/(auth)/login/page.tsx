const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Telegram login couldn't be verified. Please try again.",
  not_authorized: "This Telegram account isn't set up as an IC. Ask an existing IC to add you.",
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Churchlife Photography Roster</h1>
        <p className="muted">IC login via Telegram.</p>
        {botUsername ? (
          <script
            async
            src="https://telegram.org/js/telegram-widget.js?22"
            data-telegram-login={botUsername}
            data-size="large"
            data-auth-url="/api/auth/telegram/callback"
            data-request-access="write"
          />
        ) : (
          <p className="error-banner">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not configured.</p>
        )}
        {searchParams.error && (
          <p className="error-banner">{ERROR_MESSAGES[searchParams.error] ?? "Login failed."}</p>
        )}
      </div>
    </main>
  );
}
