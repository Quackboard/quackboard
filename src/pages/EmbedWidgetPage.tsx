import { useParams } from "react-router-dom";
import CalendarWidget from "@/components/embed/CalendarWidget";
import { SUPABASE_URL_PUBLIC } from "@/integrations/supabase/client";

const EmbedWidgetPage = () => {
    const { slug } = useParams();
    const supabaseUrl = SUPABASE_URL_PUBLIC;

    if (!slug) {
        return (
            <div style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                padding: '20px',
                textAlign: 'center',
                color: '#dc2626'
            }}>
                Error: Producer slug missing
            </div>
        );
    }

    return (
        <div style={{
            width: '100%',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: '0',
            margin: '0',
            backgroundColor: 'transparent'
        }}>
            <CalendarWidget
                producerSlug={slug}
                supabaseUrl={supabaseUrl}
                maxEvents={5}
            />
        </div>
    );
};

export default EmbedWidgetPage;
