import React, { useState } from 'react';
import { MapPin, Phone, Mail, Send } from 'lucide-react';

const ContactUsPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle form submission logic here (e.g., send data to an API)
    console.log('Form data submitted:', formData);
    alert('Message sent (simulated)!');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white p-6 md:p-10 shadow-xl rounded-xl border border-gray-200">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left Column: Shop Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">Our Shop</h2>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 mt-1 text-green-600 flex-shrink-0" />
                  <span>
                    Sarkhot Natural Farms, Shop no 3, Chidghan society, Opp. Maharashtra Steel, Tilak cross Phadke Road, Dombivli East : 421201
                    <br />
                    <span className="text-sm text-gray-500">Landmark - Near Brahman Sabha hall.</span>
                  </span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />
                  <a href="tel:+919920999100" className="hover:text-green-700">+91 9920999100</a>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />
                  <a href="mailto:Sarkhotnaturalfarms@gmail.com" className="hover:text-green-700">Sarkhotnaturalfarms@gmail.com</a>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">Opening Time</h2>
              <div className="space-y-1 text-gray-700">
                <p>Monday – Friday: 8.00 AM – 7.00 PM</p>
                <p>Saturday, Sunday: 9.00 AM – 8.00 PM</p>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-1">Get In Touch</h2>
            <p className="text-gray-600">Questions?</p>
            <p className="text-gray-600 -mt-4">Suggestions?</p>
            
            <h3 className="text-xl font-medium text-gray-700 pt-2">Write Us</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="sr-only">Name</label>
                <input 
                  type="text" 
                  name="name" 
                  id="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="Name" 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  placeholder="Email" 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="message" className="sr-only">Message</label>
                <textarea 
                  name="message" 
                  id="message" 
                  rows={4} 
                  value={formData.message} 
                  onChange={handleChange} 
                  placeholder="Message" 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 shadow-sm"
                />
              </div>
              {/* Placeholder for reCAPTCHA */}
              {/* <div className="p-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500 flex items-center justify-between">
                <span>Protected by reCAPTCHA (visual placeholder)</span>
                <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA logo" className="h-8" />
              </div> */}
              <div>
                <button 
                  type="submit" 
                  className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md transition duration-150 ease-in-out"
                >
                  <Send className="w-5 h-5 mr-2" /> Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUsPage;
