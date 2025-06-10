import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 prose dark:prose-invert max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-green-700 dark:text-green-500">Privacy Policy</h1>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Last updated: August 29, 2022</p>

      <p className="mb-4">
        Namaste! We are glad to have you here. Sarkhot Natural Farms denotes the community of natural farmers.
        Natural means chemical-free, preservative-free, and poison-free. Only cow dung and cow urine-based
        homemade preparations are used by farmers in cultivation. All our products are grown with natural
        farming practices. Our farm is at Kambe, Shahpur, Maharashtra.
      </p>
      <p className="mb-4">
        We and our network farmers are inspired by SPNF, SPK, Natural farming, Freedom fighters and teachings
        of Swami Vivekanand, Shri Rajeev Dixit, Dr. Subhash Palekar and our spiritual Gurus. Visit our
        Gratitude page to know more about us.
      </p>
      <p className="mb-4">
        Our website address is: <a href="https://sarkhotnaturalfarms.com" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">https://sarkhotnaturalfarms.com</a> and our store is located at B/3, Prabhat Society,
        Dr Mukherjee Road, Dombivali East – 421201. Our website showcases our products, e-commerce shop,
        services, our work, our engagement with farmers etc.
      </p>
      <p className="mb-6">
        At SNF, we understand that when you use our services, you trust us with your information. Our privacy
        policy helps to explain what information we may gather about you, and how it may be utilized.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">What Data Do We Collect?</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          We collect personal information such as your first name, last name, contact details, email,
          residence address and all such relevant information that is necessary for our engagement with you.
          We collect information when you buy from us, enquire about us, or engage with us through any mode.
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">Accuracy of information?</h3>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>When you share your personal information with us, we assume it to be accurate and up to date.</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">Do we store your details of Banking/Payment?</h3>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>You may choose to pay in cash, online or wallet transfer.</li>
        <li>
          When you make online payments, third party networks or our processing partners may take certain
          details such as your credit card, debit card, net-banking login etc. We do not access, store, or
          collect such banking/payment details.
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">What about engagement on Website and Social media accounts?</h3>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          When you engage with us through our social media handles, we collect your personal information
          such as name, age, location, gender, area of interest etc. This information is collected so that
          we can work on your feedback, analyze it for market research or suggest relevant products to you
          or as part of our marketing campaigns.
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">What do we do with your Comments?</h3>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          When visitors leave comments on our site/social media handles, we collect the data shown in the
          comments, visitor’s IP address and browser user agent string to help spam detection.
        </li>
        <li>
          An anonymized string created from your email address (also called a hash) may be provided to the
          Gravatar service to see if you are using it. The Gravatar service privacy policy is available here:
          {' '}<a href="https://automatic.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">https://automatic.com/privacy/</a>.
        </li>
        <li>
          After approval of your comment, your profile picture is visible to the public in the context of
          your comment.
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">What is the use of Media (Image/audio/video etc)?</h3>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          If you upload images to the website, you should avoid uploading images with embedded location data
          (EXIF GPS) included. Visitors to the website can download and extract any location data from
          images on the website.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">What are Cookies?</h2>
      <p className="mb-4">
        Cookies are small text files that are placed on your computer by websites that you visit. These files
        may be used to record information about your use of the site and thus may help to improve the
        efficiency of the site.
      </p>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          If you leave a comment on our site, you may opt-in to saving your name, email address and website
          in cookies. These are for your convenience so that you do not have to fill in your details again
          when you leave another comment. These cookies will last for one year.
        </li>
        <li>
          If you visit our login page, we will set a temporary cookie to determine if your browser accepts
          cookies. This cookie contains no personal data and is discarded when you close your browser.
        </li>
        <li>
          When you log in, we will also set up several cookies to save your login information and your screen
          display choices. Login cookies last for two days, and screen options cookies last for a year. If
          you select “Remember Me”, your login will persist for two weeks. If you log out of your account,
          the login cookies will be removed.
        </li>
        <li>
          If you edit or publish an article, an additional cookie will be saved in your browser. This cookie
          includes no personal data and simply indicates the post ID of the article you just edited. It
          expires after 1 day.
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">How does Web Analytics work?</h3>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          Our Website uses Google Analytics, a web analytics service. Google Analytics uses cookies, text
          files that are stored on your computer and enable analysis of your use of the website. The
          information generated by the cookies is stored on third party (Google) server.
        </li>
        <li>
          You may refuse the use of cookies by selecting the relevant settings on your browser software. You
          can also prevent the data generated by the cookie of your use by installing the “Google Analytics
          Opt-out Browser Add-on”.
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">How does Embedded content work?</h3>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          Articles on this site may include embedded content (e.g. videos, images, articles, etc.).
          Embedded content from other websites behaves in the exact same way as if the visitor has visited
          the other website.
        </li>
        <li>
          These websites may collect data about you, use cookies, embed additional third-party tracking, and
          monitor your interaction with that embedded content, including tracking your interaction with the
          embedded content if you have an account and are logged in to that website.
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300">How does E-mail Newsletters work?</h3>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          If you have received one of our e-mail newsletters, we may use some additional cookies to enable
          us to track the open rates of e-mails. This allows us to track the interest levels of our
          newsletters to ensure we are only sending out relevant information. They only work if you have
          downloaded the images. All our e-mail newsletters have the option to unsubscribe, so if you no
          longer wish to receive these e-mails, you can unsubscribe from the list.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">What do we do with your data?</h2>
      <p className="mb-2">We use the details for the following purposes:</p>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>Share product updates, farmer stories, new recipes.</li>
        <li>Create and maintain your unique account on our e-commerce shop;</li>
        <li>Process your orders</li>
        <li>Calculate your bill for the products/services</li>
        <li>Facilitate consumer research</li>
        <li>Respond to requests, enquiries, complaints, and other customer care related activities,</li>
        <li>Maintain internal record and comply with our legal or statutory obligations.</li>
        <li>All other relevant activities which facilitate us to achieve the mission of Sarkhot Natural Farms.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">Who we share your data with?</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>We don’t sell, rent, lease, use or share your data with third parties in a way as to reveal any of your personal information.</li>
        <li>Any contact messages received through this website related to hiring and customer service are also never used for marketing purposes or shared with any third parties.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">How long do we retain your data?</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          If you leave a comment, the comment and its metadata are retained indefinitely. This is so we can
          recognize and approve any follow-up comments automatically instead of holding them in a moderation
          queue.
        </li>
        <li>
          For users that register on our website (if any), we also store the personal information they
          provide in their user profiles. All users can see, edit, or delete their personal information at
          any time (except they cannot change their username). Website administrators can also see and edit
          that information.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">What rights do you have over your data?</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          You have the right to access, rectify, modify, restrict or withdraw your consent of our use of
          your personal information.
        </li>
        <li>
          If you have an account on this site or have left comments, you can request to receive an exported
          file of the personal data we hold about you, including any data you have provided to us.
        </li>
        <li>
          You can also request that we erase any personal data we hold about you. This does not include any
          data we are obliged to keep for administrative, legal, or security purposes.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">What security measures do we follow?</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          Your Personal Information is stored on third-party cloud servers. Although we provide appropriate
          firewalls and protections, we cannot warrant the security of personal information transmitted as
          these systems are not hack proof.
        </li>
        <li>
          Data pilferage due to unauthorized hacking, virus attacks, technical issues is possible, and we
          will take necessary measures to mitigate such events.
        </li>
        <li>
          You are required to be careful to avoid “phishing” scams, where someone may send you an e-mail
          that looks like it is received from us.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">Limitation of liability</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          To the extent permissible under the law, we shall not be liable for any direct, indirect,
          incidental, special, consequential, or exemplary damages, including but not limited to, damages
          for loss of profits, goodwill, data, information, or other intangible losses arising out of this
          Privacy Policy.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">Governing laws and disputes</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          This Privacy Policy shall be construed and governed by the laws of India. The courts in
          Kalyan-Dombivali, Maharashtra India shall have exclusive jurisdiction over such disputes.
        </li>
      </ul>
      
      <p className="mt-8 mb-4 text-sm text-gray-600 dark:text-gray-400">This Privacy Policy was updated on August 29, 2022.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">Need Help?</h2>
      <ul className="list-disc list-inside mb-4 space-y-2">
        <li>
          <a href="mailto:contact@sarkhotnaturalfarms.com" className="text-green-600 hover:underline">contact@sarkhotnaturalfarms.com</a> – is our email for general enquiries or for any assistance.
        </li>
        <li>
          <a href="mailto:Support@sarkhotnaturalfarms.com" className="text-green-600 hover:underline">Support@sarkhotnaturalfarms.com</a> – is our email for any queries, complaints, or grievances.
        </li>
        <li>
          <a href="tel:+919920999100" className="text-green-600 hover:underline">9920999100</a> is our contact number both for WhatsApp and call. However, it may not be
          feasible to meet you always on call and so we request you drop us an SMS or WhatsApp message so
          that we can get back to you at the earliest.
        </li>
      </ul>

      <p className="mt-8 mb-4">
        Sarkhot Natural farms denote the community of natural farmers. Natural means 💯% chemical free,
        preservative free and poison free.
      </p>
      
    </div>
  );
};

export default PrivacyPolicy;
