import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
            <h1>Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Quackboard, you accept and agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Quackboard provides a platform for open mic producers to create and manage events, 
              and for comics to sign up for available spots. We act as a facilitator between producers and comics.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              To use certain features of our service, you must create an account. You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and current information</li>
            </ul>

            <h2>4. User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for any unlawful purpose</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the service</li>
              <li>Attempt to gain unauthorized access to any portion of the service</li>
              <li>Sign up for spots you do not intend to use</li>
            </ul>

            <h2>5. Event Bookings</h2>
            <p>
              When you sign up for an open mic spot, you agree to show up for your assigned slot. 
              If you cannot attend, please cancel your booking in advance so the spot can be offered to others.
            </p>

            <h2>6. Producer Responsibilities</h2>
            <p>Event producers are responsible for:</p>
            <ul>
              <li>Providing accurate event information</li>
              <li>Managing their events and lineups</li>
              <li>Communicating any changes to signed-up comics</li>
            </ul>

            <h2>7. Intellectual Property</h2>
            <p>
              The Quackboard service, including its design, features, and content, is owned by Quackboard 
              and protected by intellectual property laws.
            </p>

            <h2>8. Disclaimer of Warranties</h2>
            <p>
              The service is provided "as is" without warranties of any kind. We do not guarantee 
              the accuracy, completeness, or reliability of any content or events listed on the platform.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              Quackboard shall not be liable for any indirect, incidental, special, or consequential damages 
              arising from your use of the service.
            </p>

            <h2>10. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service 
              after changes constitutes acceptance of the new terms.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{' '}
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
