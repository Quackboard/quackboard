import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ProducerPage from "./pages/ProducerPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import CreateMic from "./pages/CreateMic";
import EditMic from "./pages/EditMic";
import DuplicateMic from "./pages/DuplicateMic";
import EventLineup from "./pages/EventLineup";
import CancelBooking from "./pages/CancelBooking";
import NotFound from "./pages/NotFound";
import { EditProfile } from "./pages/EditProfile";
import EmbedWidgetPage from "./pages/EmbedWidgetPage";
import EmbedPreviewPage from "./pages/EmbedPreviewPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import EmailPreview from "./pages/EmailPreview";
import { FeedbackButton } from "./components/FeedbackButton";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FeedbackButton />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/producer/:slug" element={<ProducerPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreateMic /></ProtectedRoute>} />
            <Route path="/events/:id/edit" element={<ProtectedRoute><EditMic /></ProtectedRoute>} />
            <Route path="/events/:id/duplicate" element={<ProtectedRoute><DuplicateMic /></ProtectedRoute>} />
            <Route path="/events/:id/lineup" element={<ProtectedRoute><EventLineup /></ProtectedRoute>} />
            <Route path="/cancel/:token" element={<CancelBooking />} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

            <Route path="/embed/:slug" element={<EmbedWidgetPage />} />
            <Route path="/preview/embed/:slug" element={<EmbedPreviewPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
