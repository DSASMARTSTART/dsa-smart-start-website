
import React from 'react';
import { ArrowLeft, Shield, Cookie, RefreshCw } from 'lucide-react';

interface PolicyPageProps {
  type: 'privacy' | 'cookie' | 'refund';
  onBack: () => void;
}

const PolicyPage: React.FC<PolicyPageProps> = ({ type, onBack }) => {
  const policies = {
    privacy: {
      title: 'Privacy Policy',
      icon: Shield,
      lastUpdated: 'January 2026',
      content: [
        {
          heading: '1. Information We Collect',
          text: `We collect information you provide directly to us, such as when you create an account, enroll in a course, make a purchase, or contact us for support. This information may include your name, email address, and payment information.`
        },
        {
          heading: '2. How We Use Your Information',
          text: `We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions.`
        },
        {
          heading: '3. Information Sharing',
          text: `We do not share your personal information with third parties except as described in this policy. We may share information with service providers who assist us in operating our platform, processing payments, or providing customer support.`
        },
        {
          heading: '4. Data Security',
          text: `We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. All payment information is encrypted and processed through secure payment providers.`
        },
        {
          heading: '5. Your Rights',
          text: `You have the right to access, correct, or delete your personal information. You may also object to or restrict certain processing of your information. To exercise these rights, please contact us at dsa.smart.start@gmail.com.`
        },
        {
          heading: '6. Contact Us',
          text: `If you have any questions about this Privacy Policy, please contact us at dsa.smart.start@gmail.com or via WhatsApp at +39 351 8459607.`
        }
      ]
    },
    cookie: {
      title: 'Cookie Policy',
      icon: Cookie,
      lastUpdated: 'January 2026',
      content: [
        {
          heading: '1. What Are Cookies',
          text: `Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our site.`
        },
        {
          heading: '2. Types of Cookies We Use',
          text: `Essential Cookies: Required for the website to function properly, including authentication and security.\n\nFunctional Cookies: Remember your preferences and settings.\n\nAnalytics Cookies: Help us understand how visitors interact with our website to improve our services.`
        },
        {
          heading: '3. Managing Cookies',
          text: `You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit our site.`
        },
        {
          heading: '4. Third-Party Cookies',
          text: `We may use third-party services such as payment processors and analytics providers that may set their own cookies. We have no control over these cookies, and you should check the respective privacy policies of these third parties.`
        },
        {
          heading: '5. Updates to This Policy',
          text: `We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page with a new "Last Updated" date.`
        }
      ]
    },
    refund: {
      title: 'Refund and Return Policy',
      icon: RefreshCw,
      lastUpdated: 'January 2026',
      content: [
        {
          heading: '1. Digital Products',
          text: `All our courses are digital products delivered electronically. Due to the nature of digital products, we handle refund requests on a case-by-case basis.`
        },
        {
          heading: '2. Refund Eligibility',
          text: `You may request a refund within 14 days of purchase if:\n\n• You have not accessed more than 20% of the course content\n• You experience technical issues that prevent you from accessing the course\n• The course content does not match the description provided`
        },
        {
          heading: '3. How to Request a Refund',
          text: `To request a refund, please contact us at dsa.smart.start@gmail.com with:\n\n• Your order number\n• The reason for your refund request\n• Any relevant screenshots or documentation`
        },
        {
          heading: '4. Refund Processing',
          text: `Once your refund request is approved, we will process the refund within 5-10 business days. The refund will be issued to the original payment method used for the purchase.`
        },
        {
          heading: '5. Non-Refundable Items',
          text: `The following are not eligible for refunds:\n\n• Courses where more than 20% of content has been accessed\n• Promotional or discounted purchases (unless required by law)\n• Courses purchased more than 14 days ago`
        },
        {
          heading: '6. Contact Us',
          text: `If you have any questions about our refund policy, please contact us at dsa.smart.start@gmail.com or via WhatsApp at +39 351 8459607.`
        }
      ]
    }
  };

  const policy = policies[type];
  const Icon = policy.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-8 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Icon size={40} className="text-purple-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            {policy.title}
          </h1>
          <p className="text-gray-500 font-medium">
            Last updated: {policy.lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-xl shadow-purple-100/50 p-8 md:p-12">
          <div className="space-y-10">
            {policy.content.map((section, index) => (
              <div key={index}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {section.heading}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {section.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Have questions about this policy?</p>
          <a
            href="mailto:dsa.smart.start@gmail.com"
            className="inline-flex items-center gap-2 text-purple-600 font-bold hover:text-purple-700 transition-colors"
          >
            Contact us at dsa.smart.start@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
