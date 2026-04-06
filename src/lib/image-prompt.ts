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
    name: "Range Rover Autobiography L460 (fifth generation, 2023-2026 model)",
    body: "large full-size luxury SUV — the CURRENT generation, NOT any previous model",
    visualDescription:
      "This is the LATEST 2023-2026 fifth-generation Range Rover L460. Key identifying features that MUST all be present: (1) very clean minimalist flush bodywork with no visible door handles — the handles are flush pop-out type hidden in the door surface, (2) ultra-thin split LED headlights with a slim horizontal DRL bar on top and the main beam unit below separated by a body-colour strip, (3) a completely flat clamshell bonnet that extends all the way to the base of the windscreen with no shut-lines, (4) a smooth slab-sided profile with sharp square shoulders and a perfectly straight horizontal waistline from nose to tail, (5) an upright near-vertical D-pillar with a signature 'floating roof' effect — the roof appears detached from the body via a gloss black pillar, (6) 'RANGE ROVER' individual spaced-out capital letters across the bonnet and tailgate — NOT a badge. The overall shape is a tall refined box on wheels — it should look like a luxury yacht, NOT a chunky off-roader. The PREVIOUS L405 generation (2012-2022) has visible protruding door handles, more rounded headlights, a less flat bonnet, and a less clean side profile — do NOT draw that older model.",
    notThisVehicle:
      "Do NOT draw the previous L405 Range Rover (2012-2022). Do NOT draw a Range Rover Sport, Defender, Discovery, Evoque, or Velar. The L460 looks dramatically cleaner and more modern than any previous Range Rover.",
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

/**
 * Generates a prompt for a complete branded social media card:
 * dark background, TROUV branding, headline, photo scene, key points, website.
 * The AI generates the full card as a single image — no server-side compositing.
 */
export function buildImagePrompt(input: {
  topic: string;
  audience: string;
  contentType: string;
}): string {
  const chosen = vehicleList[Math.floor(Math.random() * vehicleList.length)];

  const scenes = [
    "AIRPORT PICKUP: The chauffeur holds a small white name board with a client name, greeting a business traveller stepping out of the rear passenger door with a carry-on suitcase. Setting: Heathrow or Gatwick airport terminal forecourt with 'ARRIVALS' signage visible.",
    "STATION PICKUP: The chauffeur holds a small white name board, waiting for a client at a London train station entrance (e.g. St Pancras, Paddington). The car is parked nearby.",
    "HOTEL DROP-OFF: The chauffeur opens the rear passenger door for a corporate client carrying a briefcase, at a luxury hotel entrance with a canopy overhead. NO name board.",
    "OFFICE COLLECTION: The chauffeur assists a client with luggage at the boot/trunk of the car, in front of a modern glass office building in Canary Wharf or The City. NO name board.",
    "STREET TRANSFER: The chauffeur walks alongside a client toward the parked car on a prestigious London street (Mayfair, Knightsbridge). NO name board. Both are walking, natural and candid.",
    "WAITING: The chauffeur stands beside the car with hands clasped in front, outside a corporate building entrance. NO name board, no client visible. Clean, composed.",
  ];
  const scene = scenes[Math.floor(Math.random() * scenes.length)];

  return `Generate a COMPLETE social media card image with the following EXACT layout. The final image must be 4:5 portrait ratio (1080×1350 pixels). This is a branded marketing card, NOT just a photograph.

=== CARD LAYOUT (top to bottom) ===

SECTION 1 — TOP BAR (dark background #111111, approximately top 20% of image):
- Top-left: The text "TROUV" in bold white letters, with "CHAUFFEURS" in smaller grey letters next to it
- Below that: The headline "${input.topic}" in large bold white text (this is the main title)
- Below that: "${input.contentType.toUpperCase()}" in small grey uppercase letters with wide letter spacing

SECTION 2 — PHOTOGRAPH (middle 46% of the image):
A photorealistic black-and-white editorial photograph showing:
${scene}

CHAUFFEUR APPEARANCE:
- Male, well-groomed, clean-shaven or neatly trimmed
- Wearing a well-fitted dark charcoal or black modern slim-cut suit, crisp white shirt, dark tie, polished black shoes
- MUST NOT wear a hat, cap, or any headwear — bare head only
- MUST NOT wear gloves — bare hands only

VEHICLE (in the photograph):
- ${chosen.name} (chassis ${chosen.chassis})
- Body style: ${chosen.body}
- ${chosen.visualDescription}
- ${chosen.notThisVehicle}
- Number plate reads "TROUV"

The photograph must be STRICTLY BLACK AND WHITE / MONOCHROME — pure greyscale.
London location background — real architecture, signage, pedestrians visible.
Natural daylight, documentary/editorial style, NOT posed.

SECTION 3 — BOTTOM BAR (dark background #111111, approximately bottom 34% of image):
- 2-3 bullet points in light grey text, each starting with a bullet dot "•"
  These should be short relevant points about ${input.topic} for ${input.audience}
  Example bullet points: "• Professional drivers available 24/7" "• Seamless airport and city transfers" "• Dedicated account management"
- At the very bottom center: "www.trouv.co.uk" in small dark grey text

=== STYLE RULES ===
- The dark sections (#111111 background) frame the photograph — like a professional marketing card
- Text must be clean, sharp, and perfectly readable — use a modern sans-serif font
- The photograph section is the visual centrepiece
- The overall look should match premium corporate marketing materials
- Portrait 4:5 ratio (taller than wide)
- The card should look like it was designed by a professional graphic designer`;
}
