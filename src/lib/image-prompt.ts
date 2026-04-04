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

  return `Photorealistic editorial lifestyle photography for a premium London chauffeur service. Black-and-white / monochrome only — no colour, no sepia, no tints.

SCENE COMPOSITION (critical):
- A professional male chauffeur stands beside or near the vehicle, facing the camera or looking toward the client's arrival direction
- The chauffeur wears a well-fitted dark charcoal or black modern slim suit, white shirt, dark tie, and polished black shoes
- STRICT RULES: the chauffeur must NOT wear a hat, cap, or any headwear. He must NOT wear gloves. His hands are bare. He has a clean, modern professional appearance — no old-fashioned or costume-like chauffeur outfits
- The chauffeur should look natural and confident — like a real high-end private driver, not a costume character
- Body language: standing upright with hands clasped in front or one hand on the rear door handle, ready to open it for a client

VEHICLE IDENTITY (this is the most important instruction):
- Chassis code: ${chosen.chassis}
- Full name: ${chosen.name}
- Body style: ${chosen.body}
- Exact visual appearance: ${chosen.visualDescription}
- ${chosen.notThisVehicle}
- Render ONLY this exact vehicle. If unsure, default to chassis code ${chosen.chassis}.

Context:
- Brand: Trouv Chauffeurs, a premium London chauffeur company
- Topic: ${input.topic}
- Audience: ${input.audience}
- Content type: ${input.contentType}

Photographic requirements:
- BLACK AND WHITE / MONOCHROME only — every element in greyscale, zero colour information
- Vehicle exterior: gloss black, deep charcoal and black tones in monochrome
- Setting: a real recognisable London location — Heathrow terminal arrivals/departures forecourt, a Mayfair hotel entrance, Canary Wharf office tower drop-off, Knightsbridge street, or a City of London corporate building entrance
- The background should be clearly identifiable as a real place — not a generic dark void
- Lighting: natural daylight or overcast London light, editorial and clean, not overly dramatic
- Style: lifestyle editorial photography — the kind you'd see in a premium service company's blog or brochure. Natural, authentic, not over-stylised
- Camera angle: three-quarter front view of the vehicle with the chauffeur visible, shot at eye level
- The vehicle's number plate must read "TROUV" in clear capital letters — this is the only text allowed in the image
- No other text, logos, watermarks, or graphic overlays
- Square 1:1 format optimised for Instagram / LinkedIn`;
}
