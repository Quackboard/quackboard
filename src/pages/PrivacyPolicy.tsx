import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <nav className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">Quackboard</Link>
        </nav>
      </header>

      {/* Content */}
      <main className="px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <article className="prose prose-neutral dark:prose-invert max-w-none">
            <h1>Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

            <h2>1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, 
              sign up for an open mic event, or contact us for support. This may include:
            </p>
            <ul>
              <li>Name and email address</li>
              <li>Instagram handle (optional)</li>
              <li>Event booking information</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our services</li>
              <li>Send you event confirmations and updates</li>
              <li>Respond to your comments and questions</li>
              <li>Send you technical notices and security alerts</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to outside parties. 
              Event producers can see the names and contact information of comics who sign up for their events.
            </p>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. 
              However, no method of transmission over the Internet is 100% secure.
            </p>

            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Cancel event bookings</li>
            </ul>

            <h2>6. Cookies</h2>
            <p>
              We use cookies and similar technologies to maintain your session and remember your preferences.
            </p>

            <h2>7. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes 
              by posting the new policy on this page.
            </p>

            <h2>8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:hello@quackboard.com" className="text-primary hover:underline">
                hello@quackboard.com
              </a>
            </p>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border">
        <div className="max-w-3xl mx-auto text-center text-sm text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} Quackboard. Built for comedy producers.</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
