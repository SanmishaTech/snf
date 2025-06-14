import type React from "react"
import { Leaf, Heart, Users, MapPin, Phone, MessageCircle } from "lucide-react"

const AboutUsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Main Card */}
          <div className="bg-white/80 backdrop-blur-sm p-8 md:p-12 shadow-2xl rounded-3xl border border-green-100 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200 to-green-300 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-300 to-green-400 rounded-full translate-y-12 -translate-x-12 opacity-20"></div>

            {/* Header */}
            <div className="text-center mb-12 relative z-10">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-r from-green-600 to-green-700 rounded-full shadow-lg">
                  <Leaf className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-700 via-green-600 to-green-800 bg-clip-text text-transparent mb-4 tracking-wide">
                ABOUT US
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-green-600 to-green-700 mx-auto mb-6 rounded-full"></div>
              <h2 className="text-lg md:text-xl font-medium text-gray-600 tracking-wider">
                🙏 NAMASTE, WELCOME TO SARKHOT NATURAL FARMS FAMILY
              </h2>
            </div>

            {/* Content Sections */}
            <div className="space-y-8 relative z-10">
              {/* Mission Section */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 md:p-8 rounded-2xl border-l-4 border-green-600">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-600 rounded-lg flex-shrink-0 mt-1">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-green-800 mb-3">Our Mission</h3>
                    <p className="text-gray-700 text-base md:text-lg leading-relaxed">
                      Sarkhot Natural farms denote the community of natural farmers. Natural means{" "}
                      <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">100%</span> chemical free,
                      preservative free and poison free. Only cow dung and cow urine based homemade preparations are
                      used by farmers in cultivation. This means you get the same produce / products that your
                      grandparents once ate.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quality Promise */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 md:p-8 rounded-2xl border-l-4 border-blue-600">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0 mt-1">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-blue-800 mb-3">Quality Promise</h3>
                    <p className="text-gray-700 text-base md:text-lg leading-relaxed">
                      This produce is thoroughly checked, cleaned, sorted, and made available to our Natural Family
                      Members (consumers). We also have our own farm (Sarkhot Farm) at Kambe, Shahpur, Maharashtra,
                      where we practice Natural farming.
                    </p>
                  </div>
                </div>
              </div>

              {/* Visit Us Section */}
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 md:p-8 rounded-2xl border-l-4 border-amber-600">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-600 rounded-lg flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-amber-800 mb-3">Visit Our Farm</h3>
                    <p className="text-gray-700 text-base md:text-lg leading-relaxed">
                      You may visit our farm to see the beauty of Natural farming. We are confident that you will love
                      our products. Experience the difference of truly natural produce firsthand.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            {/* <div className="mt-12 pt-8 border-t border-gray-200 relative z-10">
              <h3 className="text-2xl font-semibold text-center text-gray-800 mb-6">Get In Touch</h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 font-medium">Call Us</span>
                </div>
                <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 font-medium">WhatsApp</span>
                </div>
                <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 font-medium">Dombivali East</span>
                </div>
              </div>
              <p className="text-center text-gray-600 mt-4 font-medium">Happy to help! 🌱</p>
            </div> */}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg text-center border border-green-100">
              <div className="text-3xl font-bold text-green-600 mb-2">100%</div>
              <div className="text-gray-600 font-medium">Chemical Free</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg text-center border border-green-100">
              <div className="text-3xl font-bold text-green-600 mb-2">🐄</div>
              <div className="text-gray-600 font-medium">Cow-Based Farming</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg text-center border border-green-100">
              <div className="text-3xl font-bold text-green-600 mb-2">🌱</div>
              <div className="text-gray-600 font-medium">Natural Family</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutUsPage
