import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, Repeat, Bell, ExternalLink } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Create Mics in Seconds',
    description: 'Set up your open mic with date, time, venue, and spot sections. Publish instantly or schedule for later.',
  },
  {
    icon: Users,
    title: 'Effortless Sign-ups',
    description: 'Comics sign up directly from your public page. No apps to download, no accounts required.',
  },
  {
    icon: Repeat,
    title: 'Recurring Events',
    description: 'Run a weekly mic? Set it once and let Quackboard create future dates automatically.',
  },
  {
    icon: Clock,
    title: 'Scheduled Publishing',
    description: 'Control when your mic goes live and when sign-ups open. Build anticipation for your regulars.',
  },
  {
    icon: Bell,
    title: 'Email Notifications',
    description: 'Keep comics informed with automatic confirmations and updates when spots open up.',
  },
  {
    icon: ExternalLink,
    title: 'Embeddable Widget',
    description: 'Add your upcoming mics to any website with a simple embed code. Keep your audience informed.',
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background bg-texture">
      {/* Hero Section */}
      <header className="px-4 py-6">
        <nav className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-foreground">Quackboard</span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="px-4 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              The simplest way to run your open mic
            </h1>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto font-medium">
              We'll get your ducks in a row, so you can focus on being funny.
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create events, manage sign-ups, and keep your comics informed without hassle.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" asChild>
                <Link to="/signup">Start for Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>


        {/* Features Grid */}
        <section className="px-4 py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-12">
              Everything you need to run a smooth mic
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-lg bg-card border border-border card-hover"
                >
                  <feature.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* CTA Section */}
        <section className="px-4 py-16 md:py-24 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              Ready to simplify your open mic?
            </h2>
            <p className="text-muted-foreground">
              Join producers who are spending less time managing sign-ups and more time on what matters—great comedy.
            </p>
            <Button size="lg" asChild>
              <Link to="/signup">Create Your First Mic</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border">
        <div className="max-w-5xl mx-auto text-center text-sm text-muted-foreground space-y-2">
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
