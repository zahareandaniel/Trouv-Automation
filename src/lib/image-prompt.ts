const vehicleList = [
  {
    chassis: "W223",
    name: "Mercedes-Benz S-Class W223",
    body: "4-door full-size luxury saloon / sedan",
    visualDescription:
      "long wheelbase 4-door saloon with a gently sloping fastback roofline, wide split-bar front grille with a prominent three-pointed star, slim horizontal LED headlights that wrap around the front corners, large smooth bonnet, and chrome body trim. NOT an SUV, NOT a coupe, NOT a sports car.",
    notThisVehicle:
      "Do NOT draw an E-Class, C-Class, CLS, AMG GT, or any SUV.",
  },
  {
    chassis: "W447",
    name: "Mercedes-Benz V-Class W447",
    body: "large premium MPV / people carrier",
    visualDescription:
      "tall boxy van-based MPV body with a high roofline, two sliding rear passenger doors on each side, a flat vertical front fascia with a Mercedes three-pointed star on the grille, and a long wheelbase. It looks like a luxury minivan or large people carrier. NOT a saloon, NOT an SUV.",
    notThisVehicle:
      "Do NOT draw an S-Class, GLS, Sprinter van, or any saloon car.",
  },
  {
    chassis: "L460",
    name: "Range Rover L460 (fifth generation)",
    body: "large full-size luxury SUV",
    visualDescription:
      "boxy square-shouldered full-size SUV with a flat clamshell bonnet, flush pop-out door handles, thin split LED headlights, a smooth uninterrupted side profile with no visible door handles, upright D-pillar, and 'RANGE ROVER' lettering spaced across the tailgate. NOT a Sport, NOT a Defender, NOT a Velar.",
    notThisVehicle:
      "Do NOT draw a Range Rover Sport, Defender, Discovery, Evoque, or Velar.",
  },
  {
    chassis: "G70",
    name: "BMW 7 Series i7 G70",
    body: "4-door full-size luxury saloon / sedan",
    visualDescription:
      "large 4-door luxury saloon with a very large upright split two-piece kidney grille, long smooth bonnet, upright traditional saloon roofline (NOT a fastback), split LED headlights, and a formal three-box sedan shape similar to a Mercedes S-Class in size. It is a SALOON, NOT a sports car, NOT a coupe, NOT an i8, NOT an i5, NOT an M5.",
    notThisVehicle:
      "Do NOT draw a BMW i8, i5, M5, M3, 5 Series, or any coupe or sports car.",
  },
];

export function buildImagePrompt(input: {
  topic: string;
  audience: string;
  contentType: string;
}): string {
  const chosen = vehicleList[Math.floor(Math.random() * vehicleList.length)];

  const scenes = [
    "The chauffeur holds a small white name board with a client name, greeting a business traveller who is stepping out of the rear passenger door with a carry-on suitcase. The rear door is open. Shot from the rear three-quarter angle so both the car's rear and the chauffeur are visible.",
    "The chauffeur opens the rear passenger door for a corporate client carrying a briefcase, at a luxury hotel entrance with a canopy visible overhead. Shot from a side angle showing the full length of the car.",
    "The chauffeur stands at the front of the car with hands clasped, waiting beside the arrivals exit of an airport terminal. Travellers and signage are visible in the background. Shot from a wide angle showing the full scene.",
    "The chauffeur assists a client with luggage at the boot/trunk of the car, in front of a modern glass office building. Shot from a three-quarter rear angle.",
    "The chauffeur walks alongside a client toward the parked car on a prestigious London street with period architecture. Both are in motion, natural and candid. Shot from a medium distance.",
  ];
  const scene = scenes[Math.floor(Math.random() * scenes.length)];

  return `Photorealistic black-and-white documentary-style editorial photograph for a premium London chauffeur service. This should look like a real moment captured by a professional photographer — natural, authentic, not posed or over-stylised.

SCENE (this describes exactly what is happening in the image):
${scene}

CHAUFFEUR APPEARANCE (strict rules):
- Male, well-groomed, clean-shaven or neatly trimmed
- Wearing a well-fitted dark charcoal or black modern slim-cut suit, crisp white shirt, dark tie, polished black shoes
- MUST NOT wear a hat, cap, or any headwear — bare head only
- MUST NOT wear gloves — bare hands only
- He looks like a real high-end private driver — modern, professional, not a costume character
- No old-fashioned chauffeur uniforms, no peaked caps, no white gloves

VEHICLE IDENTITY (most important visual instruction):
- Chassis code: ${chosen.chassis}
- Full name: ${chosen.name}
- Body style: ${chosen.body}
- Exact visual appearance: ${chosen.visualDescription}
- ${chosen.notThisVehicle}
- Render ONLY this exact vehicle. If unsure, default to chassis code ${chosen.chassis}.

Context:
- Brand: Trouv Chauffeurs, premium London chauffeur company
- Topic: ${input.topic}
- Audience: ${input.audience}

Photography style:
- BLACK AND WHITE / MONOCHROME — every element in greyscale, absolutely no colour
- Vehicle: gloss black, rendered in deep charcoal tones
- Setting: a real, recognisable London location — Heathrow Terminal 5 forecourt, Mayfair hotel entrance, Canary Wharf, The Shard area, Knightsbridge, or City of London. The environment must look real with visible architecture, signage, other cars, and people in the background
- Lighting: natural daylight or soft overcast London light — clean editorial lighting, not overly dramatic or cinematic
- The photo should feel like it was taken during a real service — a genuine moment, not a studio shoot
- Camera: eye-level, slight wide angle to capture both the vehicle and surroundings
- The vehicle's number plate must read "TROUV" in clear capital letters
- No other text, logos, watermarks, or graphic overlays
- Square 1:1 composition for Instagram / LinkedIn`;
}
