import type React from "react"
import { Leaf } from "lucide-react"
 
const Bharwadcow: React.FC = () => {
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
                Bharwad Gir Cow
              </h1>
            </div>
            <div className="w-[12rem] h-1 bg-primary rounded-full mb-4"></div>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-8">
         
            <p>
              The Bharwad are a nomadic tribe with a long-standing tradition of rearing Desi Gir cows across generations. Our Indraai A2 milk comes from these cherished Gir cows, lovingly raised by the Bharwad community settled near Alephata, Pune.
            </p>
            
            <p>
              Deeply devoted to their cows—whom they revere as mothers—the Bharwads follow only traditional, ethical practices. They use gentle hand-milking and never resort to hormones, artificial insemination, steroids, or chemical interventions.
            </p>
            
            <p>
              With Indraai A2 milk, you receive more than just nourishment—you experience the pure, natural essence of milk that supports the body, mind, and soul, just as nature intended.
            </p>
          </div>

       
        </div>
      </div>
    </div>
  )
}

export default Bharwadcow
