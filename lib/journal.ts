export const editorialPhotos = {
  forest: {
    src: 'https://images.unsplash.com/photo-1636616545758-dc607547f405?auto=format&fit=crop&w=1800&q=85',
    alt: 'Motorcyclist following a winding road through a forest',
    source: 'https://unsplash.com/photos/a-man-riding-a-motorcycle-down-a-curvy-road-J253LxGxkTw',
  },
  pause: {
    src: 'https://images.unsplash.com/photo-1658064273537-84ae941402b1?auto=format&fit=crop&w=1800&q=85',
    alt: 'Red cruiser motorcycle parked beside a tree-lined road',
    source: 'https://unsplash.com/photos/a-motorcycle-parked-on-the-side-of-a-road-fHiPKJpOtpk',
  },
  city: {
    src: 'https://images.unsplash.com/photo-1670995985786-0c6c49faa2ca?auto=format&fit=crop&w=1800&q=85',
    alt: 'Black motorcycle parked beside a pale brick wall',
    source:
      'https://unsplash.com/photos/a-black-motorcycle-parked-next-to-a-brick-wall-vtSMC0eYr34',
  },
};
export const journalArticles = [
  {
    slug: 'make-room-for-the-long-way',
    category: 'Ride rituals',
    title: 'Make room for the long way.',
    time: '3 min read',
    photo: editorialPhotos.forest,
    summary:
      'A weekend ride doesn’t need a packed itinerary. A little space in the plan can be the best part.',
    sections: [
      {
        title: 'Start with one good reason to go.',
        text: 'A breakfast stop. A familiar stretch of countryside. A friend you haven’t caught up with in a while. Choose one anchor for the day and let the rest of the plan stay simple. You don’t need a long list of destinations to make a ride feel worthwhile.',
      },
      {
        title: 'Leave space between the stops.',
        text: 'Build your schedule around daylight, breaks and an unhurried return. Check current weather and road conditions before leaving, and keep a shorter alternative in mind. A route is a plan you can change, not a promise you have to keep.',
      },
      {
        title: 'Make the pause part of the ride.',
        text: 'Pick places where you can park properly and step away from traffic. Put the phone down for a moment, stretch your legs and take in the view. If you want a photograph, stop first and take your time with it.',
      },
      {
        title: 'Keep a small record.',
        text: 'After you get home, write down what worked: a good stop, a useful packing choice or something you would do differently. Those small notes turn a one-off outing into a personal collection of rides worth repeating.',
      },
    ],
  },
  {
    slug: 'pack-for-a-weekend',
    category: 'Weekend notes',
    title: 'Less luggage. More weekend.',
    time: '3 min read',
    photo: editorialPhotos.pause,
    summary:
      'A thoughtful packing routine for an overnight escape, with a checklist you can make your own.',
    sections: [
      {
        title: 'Pack for the plan you actually have.',
        text: 'Start with the length of your trip, the forecast and where you’ll be staying. Lay everything out before putting it into a bag. This makes duplicate chargers, extra outfits and just-in-case items easier to spot.',
      },
      {
        title: 'Give small essentials a home.',
        text: 'Keep your phone, wallet, travel documents and booking details together. Store digital copies where you can reach them offline. Use a separate pouch for charging cables so they don’t disappear beneath everything else.',
      },
      {
        title: 'Keep tomorrow simple.',
        text: 'Choose a compact change of clothes and the toiletries you will use. Separate clean clothing from used items. Think about what you’ll want first at your destination, then pack it somewhere easy to reach.',
      },
      {
        title: 'Use the list, then adapt it.',
        text: 'Our weekend checklist is a starting point for personal items. Add trip-specific essentials to your own notes and follow your motorcycle and luggage manufacturer’s instructions for load limits and securing bags. Revisit the list after the trip and remove what you never used.',
      },
    ],
  },
  {
    slug: 'everyday-ride-ritual',
    category: 'Everyday riding',
    title: 'A little ritual for the everyday ride.',
    time: '3 min read',
    photo: editorialPhotos.city,
    summary:
      'From a dedicated gear shelf to a quieter departure, small habits make leaving home feel easier.',
    sections: [
      {
        title: 'Give your gear a place.',
        text: 'Create a clean, dry space for your helmet and riding kit, following the care and storage instructions supplied with each item. Keep your keys and everyday essentials nearby. A consistent home for everything means fewer last-minute searches.',
      },
      {
        title: 'Prepare the evening before.',
        text: 'Charge your phone, check the next day’s weather and gather what you need for work or errands. If your plans have changed, adjust what you carry. The aim is a calmer morning, not another complicated routine.',
      },
      {
        title: 'Keep a note of the little things.',
        text: 'A loose bag zip, a misplaced cable or an item that needs attention is easy to forget after you arrive. Make a short note once you’re parked, and deal with it before your next trip. Follow the manufacturer’s maintenance guidance for your motorcycle and equipment.',
      },
      {
        title: 'Finish as thoughtfully as you started.',
        text: 'Take a moment to put your kit away and prepare for next time. Let care labels and manufacturer instructions guide cleaning and drying. A few repeatable habits can make even a familiar journey feel more considered.',
      },
    ],
  },
];
