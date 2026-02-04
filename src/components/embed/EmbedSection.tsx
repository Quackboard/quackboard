import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, Code, Eye, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CalendarWidget from './CalendarWidget';

interface EmbedSectionProps {
  producerSlug: string;
  supabaseUrl: string;
}

// Section component in the dashboard
export function EmbedSection({ producerSlug, supabaseUrl }: EmbedSectionProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'react' | 'embed'>('react');
  const [showPreview, setShowPreview] = useState(false);

  const embedCode = `<div id="quackboard-calendar-${producerSlug}"></div>
<script>
(function() {
  var script = document.createElement('script');
  script.src = '${window.location.origin}/embed.js';
  script.onload = function() {
    QuackBoard.init({
      elementId: 'quackboard-calendar-${producerSlug}',
      producerSlug: '${producerSlug}',
      baseUrl: '${window.location.origin}'
    });
  };
  document.head.appendChild(script);
})();
</script>`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({ title: 'Embed code copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy embed code', variant: 'destructive' });
    }
  };

  return (
    <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">Embed Widget</p>
        <div className="flex items-center gap-2">
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Preview Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Widget Preview
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                {/* Preview Mode Selector */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    variant={previewMode === 'react' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewMode('react')}
                    className="flex-1"
                  >
                    Quick Preview
                  </Button>
                  <Button
                    variant={previewMode === 'embed' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPreviewMode('embed')}
                    className="flex-1"
                  >
                    External Site Preview
                  </Button>
                </div>

                {/* Preview Content */}
                <div className="flex-1 flex justify-center overflow-hidden min-h-0">

                  <div className="w-full max-w-sm h-full flex flex-col border rounded-xl overflow-hidden">

                    {previewMode === 'react' ? (

                      // QUICK PREVIEW (SCROLLABLE)
                      <div className="flex-1 overflow-y-auto p-4">
                        <CalendarWidget
                          producerSlug={producerSlug}
                          supabaseUrl={supabaseUrl}
                          maxEvents={3}
                        />
                      </div>

                    ) : (

                      // EXTERNAL PREVIEW
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 pt-12">
                        <div className="p-4 bg-primary/10 rounded-full">
                          <ExternalLink className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold">External Preview is ready!</p>
                          <p className="text-sm text-muted-foreground">
                            This opens in a new tab to simulate a real website environment.
                          </p>
                        </div>
                        <Button
                          onClick={() => window.open(`/preview/embed/${producerSlug}`, '_blank')}
                          className="mt-4"
                        >
                          Open External Preview <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>

                    )}

                  </div>

                </div>


                {/* Preview Info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  {previewMode === 'react' && (
                    <p><strong>Quick Preview:</strong> Shows how your widget will look with React components.</p>
                  )}
                  {previewMode === 'embed' && (
                    <p><strong>External Site Preview:</strong> Simulates how the widget will appear when embedded on external websites using the embed script.</p>
                  )}
                  <p><strong>Note:</strong> The actual appearance may vary slightly depending on the host website's CSS.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Embed your upcoming events on your website with this calendar widget. Preview how it will look before copying the code.
      </p>

      <div className="space-y-3">
        <Textarea
          value={embedCode}
          readOnly
          className="text-xs font-mono min-h-[120px] resize-y"
          placeholder="Embed code will appear here..."
        />

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyCode}
          className="w-full"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy Embed Code
            </>
          )}
        </Button>
      </div>

      <div className="mt-3 p-3 rounded bg-muted/50 text-xs text-muted-foreground space-y-2">
        <div>
          <strong>Instructions:</strong> Copy and paste this code into your website's HTML where you want the calendar to appear.
          The widget will automatically show your latest upcoming events.
        </div>
        <div>
          <strong>Important:</strong> This widget uses an iframe approach. Ensure your website allows iframes.
          Use the preview above to confirm it looks correct.
        </div>
      </div>
    </div>
  );
}
