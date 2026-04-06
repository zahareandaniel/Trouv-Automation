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
  const chosen2 = vehicleList[Math.floor(Math.random() * vehicleList.length)];

  // Scenes with chauffeur + single vehicle (use chosen vehicle)
  const driverScenes = [
    { scene: "AIRPORT WAITING: The chauffeur stands ALONE near the arrivals exit holding a small white name board with a client name. He is waiting — the passenger has NOT arrived yet. NO passenger visible. Setting: Heathrow or Gatwick airport terminal forecourt with 'ARRIVALS' signage visible. The car is parked behind him.", hasDriver: true },
    { scene: "STATION WAITING: The chauffeur stands ALONE holding a small white name board, waiting for a client at a London train station entrance (e.g. St Pancras, Paddington). NO passenger visible. The car is parked nearby.", hasDriver: true },
    { scene: "AIRPORT WITH PASSENGER: The CHAUFFEUR is loading luggage into the boot/trunk — only the chauffeur handles the bags, NEVER the passenger. The passenger stands nearby with hands free, watching or checking their phone. NO name board. Setting: airport terminal forecourt.", hasDriver: true },
    { scene: "STATION WITH PASSENGER: The CHAUFFEUR opens the rear door for a corporate client at a London train station. The chauffeur holds the door — the passenger does NOT touch the door. NO name board. The car is parked at the station entrance.", hasDriver: true },
    { scene: "HOTEL DROP-OFF: The CHAUFFEUR opens the rear passenger door for a corporate client at a luxury hotel entrance with a canopy overhead. The chauffeur holds the door — the passenger simply steps out. NO name board.", hasDriver: true },
    { scene: "OFFICE COLLECTION: The CHAUFFEUR is loading a briefcase or luggage into the boot/trunk — only the chauffeur handles the bags, NEVER the passenger. The client stands nearby with hands free. In front of a modern glass office building in Canary Wharf or The City. NO name board.", hasDriver: true },
    { scene: "STREET TRANSFER: The chauffeur walks alongside a client toward the parked car on a prestigious London street (Mayfair, Knightsbridge). NO name board. Both are walking, natural and candid.", hasDriver: true },
    { scene: "WAITING: The chauffeur stands beside the car with hands clasped in front, outside a corporate building entrance. NO name board, no client visible. Clean, composed.", hasDriver: true },
  ];

  // Fleet and landscape scenes — no specific driver, wider shots
  const fleetScenes = [
    { scene: `EVENT FLEET: Three or four black luxury vehicles (mix of ${chosen.name} and ${chosen2.name}) parked in a line outside a grand London venue or hotel entrance (e.g. The Savoy, Claridge's, The Dorchester). Chauffeurs in dark suits stand beside each car. Red carpet or event signage visible. Shot from a wide angle showing the full fleet lineup.`, hasDriver: false },
    { scene: `MOTORWAY CONVOY: Two or three black luxury vehicles (${chosen.name} leading, followed by ${chosen2.name}) driving in convoy on a motorway or dual carriageway. Shot from a slightly elevated angle or roadside showing the cars in motion. Road markings, other traffic, and green English countryside or motorway infrastructure visible. Dynamic sense of movement.`, hasDriver: false },
    { scene: `LONDON LINEUP: Three black luxury vehicles parked in a row on a prestigious London street — Mayfair, Belgravia, or Knightsbridge. Period architecture, black railings, and London townhouses in the background. No people — just the fleet, clean and pristine. Shot from a three-quarter front angle.`, hasDriver: false },
    { scene: `AIRPORT PARKING: Two black luxury vehicles (${chosen.name} and ${chosen2.name}) parked at the airport terminal forecourt, front-facing view with the terminal building and 'ARRIVALS' / 'DEPARTURES' signage visible behind them. Clean, professional, like a fleet showcase photo. No people.`, hasDriver: false },
    { scene: `PRIVATE JET REAR VIEW: A black ${chosen.name} seen from the rear three-quarter angle parked on the apron or VIP parking area of a real private jet aerodrome only (Farnborough Airport, Signature Aviation, Harrods Aviation, Inflite Aviation, or Biggin Hill). A business jet is on the GROUND in the background — parked, taxiing on tarmac, or rolling on the runway. Runway / taxiway / apron and FBO building visible. NEVER show a jet flying low over a town or street.`, hasDriver: false },
    { scene: `PRIVATE JET AT AIRFIELD: A business jet on the ground at Farnborough, Biggin Hill, or another listed private jet airport — either stationary on the apron or rolling on the runway after landing. A black ${chosen.name} is parked on the apron in the foreground. The scene is entirely within the airport: tarmac, runway markings, perimeter grass, small FBO / hangar. Do NOT depict final approach over houses, villages, high streets, or any urban area — no aircraft low over a town.`, hasDriver: false },
    { scene: "TOWER BRIDGE: A black luxury vehicle driving across or parked near Tower Bridge, London. The iconic bridge towers and suspension cables are prominent in the background. Other traffic and pedestrians visible. Classic London landmark shot.", hasDriver: false },
    { scene: "THE SHARD: A black luxury vehicle parked or driving near London Bridge with The Shard skyscraper towering in the background. Modern London skyline visible. Shot from street level looking up.", hasDriver: false },
    { scene: "BIG BEN & PARLIAMENT: A black luxury vehicle driving past the Houses of Parliament and Big Ben (Elizabeth Tower). Westminster Bridge partially visible. Iconic London establishing shot.", hasDriver: false },
    { scene: "CANARY WHARF: Two black luxury vehicles parked outside one of the glass towers in Canary Wharf business district. Modern corporate architecture, reflective glass facades. Shot from a low angle emphasising the height of the buildings.", hasDriver: false },
    { scene: `NIGHT FLEET: Three black luxury vehicles (${chosen.name}, ${chosen2.name}) parked in a line on a well-lit London street at dusk or blue hour. Street lights, building lights, and reflections on the wet pavement. Moody, premium atmosphere.`, hasDriver: false },
  ];

  const allScenes = [...driverScenes, ...fleetScenes];
  const picked = allScenes[Math.floor(Math.random() * allScenes.length)];
  const scene = picked.scene;
  const hasDriver = picked.hasDriver;

  return `Generate a COMPLETE social media card image with the following EXACT layout. The final image must be 4:5 portrait ratio (1080×1350 pixels). This is a branded marketing card, NOT just a photograph.

=== CARD LAYOUT (top to bottom) ===

SECTION 1 — TOP BAR (dark background #111111, approximately top 20% of image):
- Top-left: The text "TROUV" in bold white letters, with "CHAUFFEURS" in smaller grey letters next to it
- Below that: The headline "${input.topic}" in large bold white text (this is the main title)
- Below that: "${input.contentType.toUpperCase()}" in small grey uppercase letters with wide letter spacing

SECTION 2 — PHOTOGRAPH (middle 46% of the image):
A photorealistic black-and-white editorial photograph showing:
${scene}

AIRCRAFT AND AIRPORT REALISM (mandatory whenever any airplane or jet appears):
- Aircraft must ONLY appear at a real airport or aerodrome setting: runway, taxiway, apron, hangar, or parked / taxiing on the ground.
- NEVER show an aircraft on low approach or landing over a town, village, city street, residential rooftops, shop fronts, church spires, or any built-up urban area beneath the jet.
- NEVER mix a private jet in the sky directly above streets, cars in traffic, or pedestrian zones — that is unrealistic and forbidden.
- If a jet is moving, show it on the runway or taxiway at the airfield, or high in the sky over open countryside well away from the airfield — not buzzing a town.

${hasDriver ? `CHAUFFEUR APPEARANCE:
- Male, well-groomed, clean-shaven or neatly trimmed
- Wearing a well-fitted dark charcoal or black modern slim-cut suit, crisp white shirt, dark tie, polished black shoes
- MUST NOT wear a hat, cap, or any headwear — bare head only
- MUST NOT wear gloves — bare hands only
- CRITICAL SERVICE RULE: The chauffeur ALWAYS handles all luggage, doors, and bags — the passenger NEVER carries, loads, or touches their own luggage or opens their own door. The passenger's hands should be free (holding phone, handbag, or nothing).

VEHICLE (in the photograph):
- ${chosen.name} (chassis ${chosen.chassis})
- Body style: ${chosen.body}
- ${chosen.visualDescription}
- ${chosen.notThisVehicle}` : `VEHICLES (in the photograph):
All vehicles must be from the Trouv fleet — only these models: Mercedes-Benz S-Class W223, Mercedes-Benz V-Class W447, Range Rover L460, BMW 7 Series G70.`}
- ALL vehicles MUST be BLACK colour only — gloss black bodywork, black paint. No white, silver, grey, blue, or any other colour. ONLY black.
- Number plates read "TROUV"

The photograph must be STRICTLY BLACK AND WHITE / MONOCHROME — pure greyscale.
Background must match the scene: London streets and landmarks where the scene says London; real airport apron / runway / FBO for private-jet scenes; motorways and countryside for convoy scenes. Real architecture or airfield infrastructure — never fake composite locations.
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
