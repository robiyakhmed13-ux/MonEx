import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Privacy: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background text-foreground p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">Last updated: January 2025</p>
        
        <div className="space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="mb-2">MonEX collects the following types of information:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Account Information:</strong> Email address, name (optional), and password when you create an account</li>
              <li><strong>Financial Data:</strong> Transactions, income, expenses, budgets, and goals you enter into the app</li>
              <li><strong>Device Information:</strong> Device type, operating system, and app version for debugging purposes</li>
              <li><strong>Telegram Data:</strong> If you connect Telegram, we store your Telegram ID and username</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>To provide and maintain the MonEX service</li>
              <li>To sync your financial data across devices</li>
              <li>To provide AI-powered insights and recommendations</li>
              <li>To send notifications about budgets, goals, and spending patterns</li>
              <li>To improve our services and develop new features</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data Storage and Security</h2>
            <p className="mb-2">
              Your data is securely stored using Supabase, a trusted cloud database provider with:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>End-to-end encryption for data in transit</li>
              <li>Encryption at rest for stored data</li>
              <li>Row-level security policies to ensure data isolation</li>
              <li>Regular security audits and compliance checks</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
            <p className="mb-2">MonEX uses the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Supabase:</strong> For authentication and data storage</li>
              <li><strong>Google OAuth:</strong> For optional Google sign-in</li>
              <li><strong>Telegram:</strong> For optional Telegram integration</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Access your personal data</li>
              <li>Export your financial data</li>
              <li>Delete your account and all associated data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. Upon account deletion, 
              all your personal data and financial records are permanently deleted within 30 days.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Children's Privacy</h2>
            <p>
              MonEX is not intended for children under 13. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of 
              any changes by posting the new Privacy Policy on this page and updating the 
              "Last updated" date.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2 font-medium">support@monex.app</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
