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

export function buildImagePrompt(input: {
  topic: string;
  audience: string;
  contentType: string;
}): string {
  const chosen = vehicleList[Math.floor(Math.random() * vehicleList.length)];

  const scenes = [
    "AIRPORT PICKUP: The chauffeur holds a small white name board with a client name, greeting a business traveller who is stepping out of the rear passenger door with a carry-on suitcase. The rear door is open. Setting: Heathrow or Gatwick airport terminal forecourt with 'ARRIVALS' signage visible. Shot from the rear three-quarter angle.",
    "STATION PICKUP: The chauffeur holds a small white name board, waiting for a client at a London train station entrance (e.g. St Pancras, Paddington). The car is parked nearby. Other travellers visible in background. Shot from a wide angle.",
    "HOTEL DROP-OFF: The chauffeur opens the rear passenger door for a corporate client carrying a briefcase, at a luxury hotel entrance with a canopy visible overhead. NO name board. Shot from a side angle showing the full length of the car.",
    "OFFICE COLLECTION: The chauffeur assists a client with luggage at the boot/trunk of the car, in front of a modern glass office building in Canary Wharf or The City. NO name board. Shot from a three-quarter rear angle.",
    "STREET TRANSFER: The chauffeur walks alongside a client toward the parked car on a prestigious London street (Mayfair, Knightsbridge) with period architecture. NO name board. Both are in motion, natural and candid. Shot from a medium distance.",
    "WAITING: The chauffeur stands beside the car with hands clasped in front, waiting for a client outside a corporate building entrance. NO name board, no client visible. Clean, composed shot. Shot from a three-quarter front angle.",
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

Photography style (STRICT):
- STRICTLY BLACK AND WHITE / MONOCHROME — every single pixel must be greyscale, absolutely zero colour anywhere in the image, no warm tones, no sepia, no colour tinting whatsoever
- Vehicle: gloss black bodywork, rendered in deep rich charcoal tones with visible reflections
- Setting: a real, recognisable London location — Heathrow Terminal 5 forecourt, Mayfair hotel entrance, Canary Wharf, The Shard area, Knightsbridge, or City of London. The environment must look real with visible architecture, signage, other cars, and pedestrians in background
- Lighting: natural daylight or soft overcast London light — clean editorial lighting, not overly dramatic or cinematic, good contrast between darks and lights
- The photo should feel like it was taken during a real service — a genuine moment, not a studio shoot, not AI-looking
- Camera: eye-level, slightly wide angle to capture both the vehicle and environment
- The vehicle's number plate must read "TROUV" in clear capital letters
- No text overlays, no logos, no watermarks, no graphic elements — just a clean photograph
- Landscape/wide composition (roughly 16:9 or 2:1) — NOT square, NOT portrait. The image will be placed inside a branded card template so it must be wider than it is tall`;
}
