import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Terms: React.FC = () => {
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
        
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-muted-foreground mb-4">Last updated: January 2025</p>
        
        <div className="space-y-6 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using MonEX ("the App"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the App.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p>
              MonEX is a personal finance management application that helps users track expenses, 
              income, budgets, and financial goals. The App provides AI-powered insights and 
              recommendations to help users make informed financial decisions.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access to your account</li>
              <li>You may not share your account with others or transfer it to another person</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Responsibilities</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use the App for any illegal purposes</li>
              <li>Attempt to gain unauthorized access to the App or its systems</li>
              <li>Transmit any viruses, malware, or harmful code</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Use the App to harass, abuse, or harm others</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Financial Information Disclaimer</h2>
            <p className="mb-2">
              <strong>Important:</strong> MonEX provides tools and insights for personal finance 
              management, but does NOT provide:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Professional financial advice</li>
              <li>Investment recommendations</li>
              <li>Tax advice</li>
              <li>Legal advice</li>
            </ul>
            <p className="mt-2">
              Always consult qualified professionals for financial, tax, and legal decisions.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Accuracy</h2>
            <p>
              You are solely responsible for the accuracy of the financial data you enter into 
              the App. MonEX is not responsible for any errors or inaccuracies in your data.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the App, including but not limited to 
              text, graphics, logos, and software, are owned by MonEX and protected by 
              intellectual property laws.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, MonEX shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages resulting from your use of 
              the App, including but not limited to financial losses based on app data or recommendations.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">9. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access 
              to the App. We may temporarily suspend the service for maintenance, updates, or 
              other operational reasons.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account at any time for violations 
              of these Terms. You may also delete your account at any time through the app settings.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Continued use of the App after changes 
              constitutes acceptance of the new Terms. Significant changes will be communicated 
              via the App or email.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, 
              without regard to conflict of law principles.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contact Information</h2>
            <p>
              For questions about these Terms, please contact us at:
            </p>
            <p className="mt-2 font-medium">support@monex.app</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
