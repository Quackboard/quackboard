import { MessageCircleQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function FeedbackButton() {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Help & Feedback"
          >
            <MessageCircleQuestion className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-64 p-4">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Help & Feedback</h4>
            <p className="text-xs text-muted-foreground">
              Found a bug or have a question? We'd love to hear from you.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="default"
                className="w-full"
                onClick={() => {
                  window.location.href = "mailto:hello@quackboard.com?subject=Bug Report&body=Hi! I found an issue:%0A%0AWhat happened:%0A%0AWhat I expected:";
                }}
              >
                🐛 Report a Bug
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = "mailto:hello@quackboard.com?subject=Question about Quackboard";
                }}
              >
                💬 Ask a Question
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
