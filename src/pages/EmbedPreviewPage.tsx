import { useParams } from "react-router-dom";
import CalendarWidget from "@/components/embed/CalendarWidget";
import Logo from "@/assets/logo-horizontal.png";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { SUPABASE_URL_PUBLIC } from "@/integrations/supabase/client";

const EmbedPreviewPage = () => {
    const { slug } = useParams();
    const supabaseUrl = SUPABASE_URL_PUBLIC;

    if (!slug) return <div className="p-8 text-center">Producer slug missing.</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center">
            {/* Mock Header to simulate a real website */}
            <header className="w-full bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src={Logo} alt="QuackBoard" className="h-8 w-auto object-contain" />
                    </div>
                    <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="flex-1 w-full max-w-4xl px-6 py-12 flex flex-col items-center gap-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-slate-900">External Preview</h1>
                    <p className="text-slate-500">This page simulates how your calendar widget appears on an external website.</p>
                </div>

                {/* Preview Container */}
                <div className="w-full max-w-sm h-[60vh] flex flex-col border rounded-xl overflow-hidden">

                    {/* Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <CalendarWidget
                            producerSlug={slug}
                            supabaseUrl={supabaseUrl}
                            maxEvents={5}
                        />
                    </div>

                </div>

                {/* Info Box */}
                <div className="mt-8 p-6 bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl w-full">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <ExternalLink className="w-5 h-5 text-primary" /> How this works
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-2">
                            <p className="font-medium text-slate-700">1. Integration</p>
                            <p className="text-slate-500">Copy and paste this code into your website's HTML where you want the calendar to appear.
                                The widget will automatically show your latest upcoming events.</p>
                        </div>
                        <div className="space-y-2">
                            <p className="font-medium text-slate-700">2. Live Updates</p>
                            <p className="text-slate-500">When you create or update a mic in QuackBoard, this widget updates automatically everywhere.</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="w-full py-8 border-t border-slate-200 bg-white text-center text-slate-400 text-xs">
                &copy; 2026 QuackBoard. For demonstration purposes only.
            </footer>
        </div>
    );
};

export default EmbedPreviewPage;
