
import React from 'react';
import { ArrowLeft, Shield, Cookie, RefreshCw, FileText } from 'lucide-react';

interface PolicyPageProps {
  type: 'privacy' | 'cookie' | 'refund' | 'terms';
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
          text: `If you have any questions about this Privacy Policy, please contact us at dsa.smart.start@gmail.com or by phone at +381 65 886 9930.`
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
          text: `If you have any questions about our refund policy, please contact us at dsa.smart.start@gmail.com or by phone at +381 65 886 9930.`
        }
      ]
    },
    terms: {
      title: 'Terms & Conditions',
      icon: FileText,
      lastUpdated: 'February 2026',
      content: [
        {
          heading: '1. General Provisions',
          text: `These Terms & Conditions ("Terms") govern the purchase and use of digital educational products and services offered through the website www.dsasmartstart.com (the "Website").

Seller:
ANA MILATOVIĆ PR CENTAR ZA EDUKACIJE EDUWAY BEOGRAD (ZVEZDARA)
Address: Vladana Desnice 28, Beograd, Republic of Serbia
Company Registration Number (Matični broj): 68375720
Tax Identification Number (PIB): 115450214
Business Activity Code (Šifra delatnosti): 8559
Email: dsa.smart.start@gmail.com
Phone: +381 65 886 9930

By placing an order on the Website, you confirm that you have read, understood, and accepted these Terms in full.`
        },
        {
          heading: '2. Subject of Sale',
          text: `The Website offers digital educational content, including but not limited to:

• Online courses (service-based programs with specialist support)
• Interactive self-paced courses (e-learning modules)
• E-books and digital teaching materials

All products are delivered digitally. No physical goods are shipped.`
        },
        {
          heading: '3. Ordering and Purchase Process',
          text: `To purchase a product:\n\n1. Browse the course catalog and select products to add to your Cart.\n2. Review the items in your Cart, including any teaching material add-ons.\n3. Proceed to Checkout, where you will provide your name and email address.\n4. Select your preferred payment method (credit/debit card or PayPal).\n5. Accept these Terms & Conditions and our Privacy Policy.\n6. Complete payment through the secure payment gateway.\n7. Upon successful payment, you will receive immediate digital access to the purchased content via your Dashboard.\n\nYou must create an account or log in before completing your purchase.`
        },
        {
          heading: '4. Prices and Payment',
          text: `All prices on the Website are displayed in EUR (Euros).

Payment is accepted via:\n• Credit/Debit cards (Visa, MasterCard, DinaCard) — processed securely through Raiffeisen Banka a.d. Beograd\n• PayPal

Currency Conversion Notice: For payments made by cards issued in the Republic of Serbia, the transaction amount is converted into RSD (Serbian Dinars) by your card-issuing bank at their applicable exchange rate on the date the transaction is processed. EDUWAY has no influence over the exchange rate applied.

All prices displayed are final. The seller is not currently registered for VAT (PDV) — the prices shown are not subject to VAT. Should this status change, these Terms will be updated accordingly.`
        },
        {
          heading: '5. Digital Delivery',
          text: `All products are delivered digitally. Upon successful payment confirmation, the purchased content becomes immediately accessible through your personal Dashboard on the Website.

No physical delivery or shipping is involved. Access is granted for the duration specified in the product description (typically lifetime access for purchased courses).`
        },
        {
          heading: '6. Right of Withdrawal (Pravo na odustanak)',
          text: `In accordance with the Law on Consumer Protection of the Republic of Serbia (Zakon o zaštiti potrošača, Službeni glasnik RS), you have the right to withdraw from the purchase within 14 days from the date of purchase, without providing a reason.

To exercise this right, you must notify us in writing at dsa.smart.start@gmail.com with your order number and a clear statement of your intention to withdraw.

Important exception for digital content: In accordance with Article 37 of the Consumer Protection Law, the right of withdrawal does not apply if the delivery of digital content has begun with your explicit prior consent and your acknowledgment that you thereby lose the right of withdrawal. By accessing the purchased digital content, you consent to immediate delivery and acknowledge the loss of withdrawal rights.

If you have not accessed more than 20% of the purchased content, you remain eligible for a full refund within the 14-day period.`
        },
        {
          heading: '7. Complaints Procedure (Reklamacije)',
          text: `If you are dissatisfied with your purchase or experience any issues, you have the right to file a complaint.

How to submit a complaint:
• Send an email to: dsa.smart.start@gmail.com
• Include: your full name, order number, email address used for purchase, and a detailed description of the issue

Response timeline: In accordance with the Consumer Protection Law of the Republic of Serbia, we will acknowledge your complaint within 8 days of receipt and provide a resolution or a reasoned response within 15 days.

Resolution options may include:
• Technical support to resolve access issues
• Full or partial refund
• Replacement access or credit

If you are not satisfied with our resolution, you may contact:
• The Ministry of Trade, Tourism and Telecommunications of the Republic of Serbia
• The relevant trade inspection authority (Tržišna inspekcija)
• An alternative dispute resolution body

All complaints are recorded and treated confidentially.`
        },
        {
          heading: '8. Refund Policy',
          text: `Refunds are processed in accordance with our Refund and Return Policy. Key terms:

• Refund requests must be submitted within 14 days of purchase
• You must not have accessed more than 20% of the course content
• Approved refunds are processed within 5–10 business days to the original payment method
• Promotional or heavily discounted purchases may not be eligible for refunds (unless required by law)

For full details, please refer to our Refund and Return Policy page.`
        },
        {
          heading: '9. Intellectual Property',
          text: `All content on the Website — including courses, e-books, video materials, text, images, and software — is the intellectual property of EDUWAY or its licensors and is protected by copyright and intellectual property laws.

Purchasing a product grants you a personal, non-transferable, non-exclusive license to access and use the content for your own educational purposes. You may not:

• Copy, reproduce, distribute, or share purchased content with third parties
• Modify, create derivative works from, or reverse-engineer any content
• Use the content for commercial purposes or resale
• Share your account credentials with others`
        },
        {
          heading: '10. Limitation of Liability',
          text: `EDUWAY provides educational content on an "as is" basis. While we strive for accuracy and quality, we do not guarantee specific learning outcomes or results.

To the maximum extent permitted by law, EDUWAY shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our products or services.`
        },
        {
          heading: '11. Privacy and Data Protection',
          text: `We are committed to protecting your personal data in accordance with applicable data protection laws. For complete details on how we collect, use, and protect your information, please refer to our Privacy Policy.

Payment data is processed directly by the payment service provider (Raiffeisen Banka a.d. Beograd / PayPal) and is not stored on our servers.`
        },
        {
          heading: '12. Governing Law and Disputes',
          text: `These Terms are governed by the laws of the Republic of Serbia. Any disputes arising from or related to these Terms shall be resolved by the competent court in Belgrade, Republic of Serbia.

Before initiating legal proceedings, the parties agree to attempt to resolve any dispute amicably through direct communication.`
        },
        {
          heading: '13. Changes to These Terms',
          text: `We reserve the right to update these Terms at any time. Changes take effect upon publication on the Website. Continued use of the Website after changes constitutes acceptance of the updated Terms.

The date of the last update is indicated at the top of this page.`
        },
        {
          heading: '14. Contact Information',
          text: `For any questions regarding these Terms & Conditions, please contact us:

ANA MILATOVIĆ PR CENTAR ZA EDUKACIJE EDUWAY
Address: Vladana Desnice 28, Beograd, Srbija
Email: dsa.smart.start@gmail.com
Phone: +381 65 886 9930
Website: www.dsasmartstart.com`
        }
      ]
    }
  };

  const policy = policies[type];
  const Icon = policy.icon;

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-purple-400 mb-8 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
            <Icon size={40} className="text-purple-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            {policy.title}
          </h1>
          <p className="text-gray-500 font-medium">
            Last updated: {policy.lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/5 rounded-3xl shadow-xl shadow-purple-500/10 p-8 md:p-12 border border-white/10">
          <div className="space-y-10">
            {policy.content.map((section, index) => (
              <div key={index}>
                <h2 className="text-xl font-bold text-white mb-4">
                  {section.heading}
                </h2>
                <p className="text-gray-400 leading-relaxed whitespace-pre-line">
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
            className="inline-flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors"
          >
            Contact us at dsa.smart.start@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
