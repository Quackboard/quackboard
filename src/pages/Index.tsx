import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, Repeat, Bell, ExternalLink, Mic } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Create Mics in Seconds",
    description: "Date, time, venue, spots. Fill in the blanks and you're live. Seriously, that's it",
  },
  {
    icon: Users,
    title: "Effortless Sign-ups",
    description: "Comics sign up directly from your public page. No app and no account necessary",
  },
  {
    icon: Repeat,
    title: "Recurring Events",
    description: "Run a weekly mic? Set it once and Quackboard handles the rest every single week",
  },
  {
    icon: Clock,
    title: "Scheduled Publishing",
    description: "Post your mic now, open sign-ups later. Great for hype-building",
  },
  {
    icon: Bell,
    title: "Email Notifications",
    description: "Keep comics informed with automatic confirmations and updates when spots open up.",
  },
  {
    icon: ExternalLink,
    title: "Embeddable Widget",
    description: "Have your own site? Drop in one line of code and your mics show up automatically",
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
              <Link to="/browse">Browse Mics</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Comics Banner */}
      <section className="w-full border-b border-primary/15 bg-primary/5 py-3 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm font-medium text-foreground">
              Comics! Quackboard is open. Discover mics that fit your schedule.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link to="/browse">Browse Open Mics →</Link>
          </Button>
        </div>
      </section>

      <main>
        {/* Hero */}
        <section className="px-4 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              The easiest way to run your open mic
            </h1>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto font-medium">
              Less admin. More comedy.
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create events, manage sign-ups, and keep your comics in the loop.
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
              Built for comedy producers who have better things to do.
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="p-6 rounded-lg bg-card border border-border card-hover">
                  <feature.icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 py-16 md:py-24 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">Ready to simplify your open mic?</h2>
            <p className="text-muted-foreground">
              Join producers who are spending less time on sign-ups and more time on great comedy.
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
            <Link to="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
