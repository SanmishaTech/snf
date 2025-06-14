import React from 'react';

const ShippingPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg p-6 md:p-8 lg:p-10 prose dark:prose-invert max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center text-green-700 dark:text-green-500">
            Shipping and Delivery Policy
          </h1>

          <p className="lead text-lg">
            Namaste! We are glad to have you here. Our Shipping and Delivery Policy will guide you with a clear understanding of how items are shipped, delivery timelines, the nature of goods available, delivery locations, and where to reach out in case of any assistance.
          </p>

          <h2>Accuracy of Address</h2>
          <p>
            To ship your items accurately, we require your precise details. Kindly ensure that your pin code, postal address, email ID, and contact number are correct before you place your order.
          </p>

          <h2>Shipping Mode</h2>
          <p>
            We deliver through transport vehicles, courier services, train, and traveler van facilities.
          </p>
          <h3>For Mumbai, Mumbai Suburbs, Thane, Navi Mumbai, Dombivali & Kalyan</h3>
          <p>
            We deliver through goods vehicles on most days. Delivery rates are provided separately in the ‘Delivery Charges’ section.
          </p>
          <p>
            In exceptional situations, we may use train, courier, or traveler bus facilities. In such cases, delivery costs may vary from the general rates. We will coordinate with you to decide the best option based on actual shipping rates and feasibility.
          </p>
          <h3>For Rest of India</h3>
          <p>
            We use courier, traveler bus, and train facilities to deliver to the Rest of India.
          </p>
          <p>
            Dry grocery items are delivered throughout India.
          </p>
          <p>
            Some fruits can also be delivered, e.g., Mangoes, Grapes, Pomegranate, Apples, Mosambi (Sweet lime), etc.
          </p>
          <p>
            Drop us an email at <a href="mailto:contact@sarkhotnaturalfarms.com">contact@sarkhotnaturalfarms.com</a> or SMS/WhatsApp us on <a href="tel:9920999100">9920999100</a>, and we will guide you if delivery of items is possible. We can then decide on the best route and delivery fee together.
          </p>

          <h2>Timeline</h2>
          <h3>For Grocery (dry items)</h3>
          <p>
            Once a product is shipped, it will typically be delivered on the same day for local areas.
          </p>
          <p>
            The tentative delivery date is updated on our website. In case of any changes, we shall reach out to you via WhatsApp, call, or email.
          </p>
          <p>
            For far-off locations, delivery time will depend on the mode of transport. We will share a tracking link or timeline on WhatsApp/Email for your reference.
          </p>
          <h3>For Fresh Fruits & Vegetables</h3>
          <p>
            The availability of fruits and vegetables depends on the climate and their respective harvesting times.
          </p>
          <p>
            The tentative delivery date is updated on our website. In case of any changes, we shall reach out to you via WhatsApp, call, or email.
          </p>

          <h2>Free Shipping</h2>
          <p>
            Free shipping applies to orders that are above a certain cart value for a specific delivery location. The following limits apply:
          </p>
          <ul>
            <li><strong>For KDMC (Kalyan-Dombivli Municipal Corporation):</strong> Order value of INR 299 and above is eligible for free shipping.</li>
            <li><strong>For Mumbai, Mumbai Suburbs, Thane, Navi Mumbai:</strong> Order value of INR 799 and above is eligible for free shipping.</li>
            <li><strong>For Rest of India:</strong> At present, there is no free delivery limit. We promise to provide you with the best items at the most effective rates. Email us at <a href="mailto:contact@sarkhotnaturalfarms.com">contact@sarkhotnaturalfarms.com</a> or call <a href="tel:9920999100">9920999100</a> to inquire about shipping rates.</li>
          </ul>

          <h2>Delivery Charges</h2>
          <p>
            Delivery charges apply for order values below the free shipping limits as follows:
          </p>
          <ul>
            <li><strong>For KDMC:</strong> Rs 25/- for order value below INR 299.</li>
            <li><strong>For Mumbai, Mumbai Suburbs, Thane, Navi Mumbai:</strong> Rs 80/- for order value below INR 799.</li>
            <li>
              <strong>For Rest of India:</strong> Email us at <a href="mailto:contact@sarkhotnaturalfarms.com">contact@sarkhotnaturalfarms.com</a> or call <a href="tel:9920999100">9920999100</a> to know the shipping rates. We will update you about the diverse options with rates, considering the safety of the parcel. Delivery charges will be at actuals and will depend on the mode of transport you agree to.
            </li>
          </ul>

          <h2>Minimum Cart Value to Place Order</h2>
          <p>
            A minimum cart value is required to accept an order:
          </p>
          <ul>
            <li><strong>For KDMC:</strong> A minimum cart value of INR 99/- is required.</li>
            <li><strong>For Mumbai, Mumbai Suburbs, Thane, Navi Mumbai:</strong> A minimum cart value of INR 399/- is required.</li>
            <li><strong>For Rest of India:</strong> There is no minimum cart value, but we recommend you buy a decent value to make it cost-effective. Email us at <a href="mailto:contact@sarkhotnaturalfarms.com">contact@sarkhotnaturalfarms.com</a> or call <a href="tel:9920999100">9920999100</a> for shipping rates.</li>
          </ul>

          <h2>Summary of Shipping / Delivery Charges</h2>
          <div className="overflow-x-auto my-6">
            <table className="min-w-full text-left border-collapse border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 font-semibold">Location / Type</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 font-semibold">Free Delivery Limit (FDL)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 font-semibold">Delivery Fee (Below FDL)</th>
                  <th className="border border-gray-300 dark:border-gray-600 p-2 font-semibold">Minimum Cart Value (MCV)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">KDMC</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">INR 299</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">INR 25</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">INR 99</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">Mumbai, Mumbai Suburbs, Thane, Navi Mumbai</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">INR 799</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">INR 80</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">INR 399</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">Rest of India</td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2" colSpan={3}>Contact <a href="mailto:contact@sarkhotnaturalfarms.com">contact@sarkhotnaturalfarms.com</a> or <a href="tel:9920999100">9920999100</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="mt-6">Notes</h2>
          <ul>
            <li><strong>Courier mode of delivery:</strong> Our courier partners will deliver goods between Monday to Saturday, 9 am to 7 pm. Working days exclude public holidays, festival holidays, and Sundays. Courier cost depends on weight, and we will let you know the options to choose from.</li>
            <li><strong>Traveler bus or train mode of delivery:</strong> These facilities are far cheaper than courier. However, the delivery is only up to a certain stop, and you will have to pick up the parcel from a train/road location.</li>
            <li>Delivery time is subject to factors beyond our control, including unexpected travel delays from our courier partners and transporters due to climate conditions or any urgency.</li>
            <li>We shall send you an update as soon as we dispatch your package.</li>
          </ul>

          <h2 className="mt-6">Need Help?</h2>
          <p>
            <a href="mailto:contact@sarkhotnaturalfarms.com">contact@sarkhotnaturalfarms.com</a> – is our email for general enquiries or for any assistance.
          </p>
          <p>
            <a href="mailto:Support@sarkhotnaturalfarms.com">Support@sarkhotnaturalfarms.com</a> – is our email for any queries, complaints, or grievances.
          </p>
          <p>
            <strong><a href="tel:9920999100">9920999100</a></strong> is our contact number for both WhatsApp and calls. However, it may not always be feasible to answer your call immediately, so we request you to drop us an SMS or WhatsApp message so that we can get back to you at the earliest.
          </p>

          <p className="mt-8 text-sm italic">
            Sarkhot Natural Farms denotes the community of natural farmers. Natural means 💯% chemical-free, preservative-free, and poison-free.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicyPage;
