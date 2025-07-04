import type React from "react"
import { Leaf } from "lucide-react"

const AboutUsPage: React.FC = () => {
  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-primary rounded-full shadow-lg mr-3">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                About Us
              </h1>
            </div>
            <div className="w-[12rem] h-1 bg-primary rounded-full mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">
              Namaste, welcome to <a 
                className="hover:text-green-800 font-bold dark:hover:text-green-400 transition-colors"
              href="https://sarkhotnaturalfarms.com/">Sarkhot Natural Farms</a> Family.
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-8">
         
            <p>
            <a 
                className="hover:text-green-800 font-bold dark:hover:text-green-400 transition-colors"
              href="https://sarkhotnaturalfarms.com/">Sarkhot Natural Farms</a> is a dedicated one-stop destination for 100% naturally grown farm produce.

              By "natural," we mean completely chemical-free, preservative-free, and toxin-free food — cultivated using traditional methods passed down through generations.
            </p>
            
            <p>
              Our farming practices rely solely on desi cow dung and cow urine-based homemade inputs, both at our own farm and among our network of like-minded farmers. This ensures that the food you receive is as pure and wholesome as what your grandparents once enjoyed.
            </p>
            
            <p>
              Located in Kambe village, Shahpur district, Maharashtra, our flagship Sarkhot Farm is rooted in the principles of Natural Farming. In addition to our own produce, we also source from a trusted network of natural farmers across India who share our values.
            </p>
            
            <p>
              Our farmer community is diverse — united by purpose but inspired by various philosophies. While most follow Dr. Subhash Palekar's Natural Farming methods, others draw wisdom from Shri Rajiv Dixit, the Varkari tradition, tribal knowledge, and spiritual teachings. Together, they form a powerful movement dedicated to producing nutritious food — free from harmful chemicals and full of life-giving energy.
            </p>
          </div>

          {/* Simple Stats */}
      
        </div>
      </div>
    </div>
  )
}

export default AboutUsPage
