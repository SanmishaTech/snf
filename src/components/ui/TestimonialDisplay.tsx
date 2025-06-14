import React from 'react';

export interface Testimonial {
  id: string | number;
  text: string;
  author?: string;
  // Optional: Add author's avatar or other relevant fields if needed later
  // authorAvatar?: string;
}

interface TestimonialDisplayProps {
  testimonials: Testimonial[];
  title?: string;
}

const TestimonialDisplay: React.FC<TestimonialDisplayProps> = ({ testimonials, title = "Testimonials" }) => {
  if (!testimonials || testimonials.length === 0) {
    return null; // Don't render anything if there are no testimonials
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-3 max-h-72 overflow-y-auto p-2 bg-gray-50 rounded-md shadow-inner">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="p-3 bg-white rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <p className="text-sm text-gray-800 italic leading-relaxed">"{testimonial.text}"</p>
            {testimonial.author && (
              <p className="text-xs text-gray-500 mt-2 text-right font-medium">- {testimonial.author}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestimonialDisplay;
