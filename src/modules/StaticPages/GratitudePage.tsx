import React from 'react';

const GratitudePage: React.FC = () => {
  const gratitudePoints = [
    {
      title: 'Our Mentor',
      text: 'Shri Prashant Sarkhot, helps us to find the direction and keeps us grounded.',
      icon: '👨‍🏫'
    },
    {
      title: 'Our dear staff',
      text: 'have spent long hours meeting deadlines. They have kept their calm while delivering items even at odd places and at odd times. They have made sure that the quality control is always at its best and have been receptive and eager to improve with feedback. Our team is our backbone, and we are grateful to have them.',
      icon: '👨‍💼'
    },
    {
      title: 'Our consumers',
      text: 'have helped in improving the quality of service, packing, delivery schedules, and adding various products with their valuable feedback which was always constructive. The faith that they have kept in us, their appreciation, and respect have helped us in having the clarity of WHY IS THERE A NEED OF SNF?',
      icon: '👥'
    },
    {
      title: 'Nature (This Universe)',
      text: 'has been so helpful and supportive to make us meet the right people at the right time. It has helped us to get the answers when we were full of doubts and questions.',
      icon: '🌿'
    },
    {
      title: 'Swami Vivekanand, Dr. Subhash Palekar, Shri Rajeev Dixit and our Freedom Fighters',
      text: 'Their teachings have shaped SNF as well as the life of many farmers. This farming technique is also spiritual due to the presence of spiritual teachers. Their direction helped us to understand nature more deeply.',
      icon: '📜'
    },
    {
      title: 'Our Network farmers',
      text: 'have been instrumental in supplying naturally grown food. Despite problems, they have made natural farming successful and helped so many of us to lead healthy lives. They have listened to consumer feedback and improved their quality with consistent efforts.',
      icon: '👨‍🌾'
    },
    {
      title: 'Our Friends & Family',
      text: 'have been instrumental in our growth. Their love keeps us going and is the best example of Unconditional love.',
      icon: '👨‍👩‍👧‍👦'
    },
    {
      title: 'Innumerable People',
      text: 'have met us and influenced us in day-to-day life. Many ideas were generated due to them, and we are grateful to learn from them.',
      icon: '🤝'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50 py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block bg-gradient-to-r from-amber-400 to-green-500 p-1 rounded-full mb-6">
              <div className="bg-white rounded-full p-3">
                <div className="bg-gradient-to-r from-amber-400 to-green-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl text-white">🙏</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-600 to-green-700 bg-clip-text text-transparent mb-4">
              GRATITUDE
            </h1>
            
            <div className="max-w-2xl mx-auto">
              <p className="text-lg text-gray-700 leading-relaxed bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-amber-100 shadow-sm">
                We have come a long way from where we started. From having a little sense of direction, 
                we now have a clear path that is becoming clearer day by day. This is due to the presence 
                of so many people and we are happy to recognize them.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gratitudePoints.map((point, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl border border-amber-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col h-full"
              >
                <div className="p-5 pb-4 flex items-start">
                  <div className="flex-shrink-0 bg-gradient-to-br from-amber-100 to-green-100 w-12 h-12 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <span className="text-xl">{point.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{point.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{point.text}</p>
                  </div>
                </div>
                <div className="mt-auto px-5 pb-4 pt-2">
                  <div className="h-1 w-full bg-gradient-to-r from-amber-300/30 to-green-400/30 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center text-gray-700">
            <h3 className="text-xl font-semibold mb-2">still have questions?</h3>
            <p className="mb-1">
              Please drop an email at <a href="mailto:contact@sarkhotnaturalfarms.com" className="text-green-600 hover:underline">contact@sarkhotnaturalfarms.com</a>
            </p>
            <p className="mb-1">Connect on WhatsApp / Call: <span className="font-medium">9920999100</span></p>
            <p>We will get back to you within 48 hours</p>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center justify-center bg-gradient-to-r from-amber-400 to-green-500 text-white py-2 px-6 rounded-full">
              <span className="mr-2">❤️</span>
              <span className="font-medium">With heartfelt appreciation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GratitudePage;