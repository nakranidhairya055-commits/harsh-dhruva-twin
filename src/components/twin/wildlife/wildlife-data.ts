import type { StationSlug } from "@/lib/station";

/**
 * Antarctic wildlife layer.
 *
 * Species, colony placements and the one expedition member who walks the site.
 *
 * Placement is honest to the geography: Bharati sits on the Larsemann Hills
 * coast, so it gets the marine fauna — penguins, seals, whales, dolphins and
 * the shoals they feed on. Maitri is about 100 km inland in the Schirmacher
 * Oasis, so it gets what actually lives there: the flyers that nest on inland
 * nunataks and the invertebrates in the oasis lakes. Every species card states
 * where it is seen, and a coastal species can be followed across to Bharati in
 * one click.
 */

export type CreatureGroup =
  | "penguin"
  | "seal"
  | "whale"
  | "dolphin"
  | "bird"
  | "fish"
  | "invertebrate";

/** How a colony is drawn and animated. */
export type ColonyKind =
  | "waddle"
  | "huddle"
  | "rest"
  | "cruise"
  | "nest"
  | "fly"
  | "surface"
  | "leap"
  | "swim";

export interface SpeciesDef {
  id: string;
  name: string;
  latin: string;
  group: CreatureGroup;
  /** One-line description used on the hover label and the card header. */
  blurb: string;
  facts: string[];
  length: string;
  mass: string;
  diet: string;
  /** IUCN Red List status. */
  status: string;
  /** Where the twin places it, and why. */
  seen: string;
  /** Station that hosts the colony. */
  station: StationSlug;
}

export interface ColonyDef {
  id: string;
  speciesId: string;
  station: StationSlug;
  position: [number, number, number];
  count: number;
  kind: ColonyKind;
  /** Birds circle around the centre instead of standing on it. */
  radius?: number;
  height?: number;
  chicks?: number;
  label: string;
}

/** Species catalogue. Facts are the standard field-guide ones. */
export const SPECIES: Record<string, SpeciesDef> = {
  "adelie-penguin": {
    id: "adelie-penguin",
    name: "Adelie penguin",
    latin: "Pygoscelis adeliae",
    group: "penguin",
    blurb: "Chunky, curious and the easiest penguin to recognise: black back, white belly, white eye ring.",
    facts: [
      "Builds a pebble nest on exposed rock and will steal a neighbour's pebble when nobody is looking.",
      "Toboggans on its belly across the snow when walking gets tiring.",
      "Huddles shoulder to shoulder in a tight pack to survive katabatic wind, rotating the pack so nobody stays on the outside.",
      "Winter is spent at the sea ice edge, hundreds of kilometres from the colony.",
    ],
    length: "70 cm",
    mass: "4 to 6 kg",
    diet: "Krill, silverfish and small squid",
    status: "Least concern",
    seen: "Shoreline beside the Bharati seawater pump house.",
    station: "bharati",
  },
  "emperor-penguin": {
    id: "emperor-penguin",
    name: "Emperor penguin",
    latin: "Aptenodytes forsteri",
    group: "penguin",
    blurb: "The tallest penguin alive, with a soft yellow-orange neck patch that reads even at distance.",
    facts: [
      "Breeds in the middle of the polar winter on stable fast ice, tens of kilometres from open water.",
      "Balances a single egg on its feet under a brood pouch for about two months while it fasts.",
      "Huddles in tens of thousands; the pack moves in slow waves so every bird takes a turn in the warm centre.",
      "The nearest well-known colony to Bharati is in the Prydz Bay region, which is why the fjord flock is a plausible sighting.",
    ],
    length: "1.1 m",
    mass: "22 to 45 kg",
    diet: "Fish, squid and krill",
    status: "Near threatened",
    seen: "Fast ice at the head of Thala Fjord.",
    station: "bharati",
  },
  "weddell-seal": {
    id: "weddell-seal",
    name: "Weddell seal",
    latin: "Leptonychotes weddellii",
    group: "seal",
    blurb: "Round, calm and startlingly loud underwater: the southernmost breeding mammal on Earth.",
    facts: [
      "Keeps breathing holes open through the winter by rasping the ice with its teeth.",
      "Dives past 600 m and stays under for over an hour; its song carries for kilometres through the ice.",
      "Pups are born on fast ice in spring and can swim within a week, with big dark eyes and a fluffy first coat.",
      "Completely unbothered by people, which makes it the easiest animal on the continent to watch.",
    ],
    length: "2.9 m",
    mass: "400 to 600 kg",
    diet: "Fish, squid and Antarctic cod",
    status: "Least concern",
    seen: "Fast ice in Quilty Bay, a short walk from the station apron.",
    station: "bharati",
  },
  "crabeater-seal": {
    id: "crabeater-seal",
    name: "Crabeater seal",
    latin: "Lobodon carcinophaga",
    group: "seal",
    blurb: "Sleek pale seal with a name that lies: it eats krill, not crabs, and lots of it.",
    facts: [
      "Probably the most abundant large wild mammal on Earth, with a population in the millions.",
      "Its teeth interlock into a sieve to strain krill out of the water.",
      "Often carries the scars of an orca or leopard seal encounter along its flanks.",
      "Travels far from the pack ice in winter, sometimes ending up on sub-Antarctic beaches.",
    ],
    length: "2.4 m",
    mass: "200 to 300 kg",
    diet: "Almost entirely Antarctic krill",
    status: "Least concern",
    seen: "Drifting ice edge at the mouth of Thala Fjord.",
    station: "bharati",
  },
  "snow-petrel": {
    id: "snow-petrel",
    name: "Snow petrel",
    latin: "Pagodroma nivea",
    group: "bird",
    blurb: "A pure white seabird with black eyes and a black beak: snow given wings.",
    facts: [
      "Nests on inland nunataks like the Schirmacher Hills, which is why it is the bird actually visible from Maitri.",
      "Flies on stiff wings close to the rock face, then rides the updraught along the ice edge.",
      "Said to be one of only three birds ever seen at the South Pole, alongside the skua and the Antarctic petrel.",
      "Spits stomach oil at intruders when a nest is threatened, which is as unpleasant as it sounds.",
    ],
    length: "35 cm, wingspan 75 cm",
    mass: "250 to 460 g",
    diet: "Fish, squid, krill and carrion",
    status: "Least concern",
    seen: "Circling the oasis rock outcrops above Maitri's lake.",
    station: "maitri",
  },
  "south-polar-skua": {
    id: "south-polar-skua",
    name: "South polar skua",
    latin: "Stercorarius mccormicki",
    group: "bird",
    blurb: "Brown, broad-shouldered pirate of the ice, and the reason you guard your lunch.",
    facts: [
      "Takes eggs, chicks and carrion, and harasses other birds until they drop their catch.",
      "Dives on anyone approaching its nest, usually from behind and usually without warning.",
      "One of the few birds seen at the South Pole, having flown far inland on summer storms.",
      "Pairs stay together for years and defend a territory around the nest scrape.",
    ],
    length: "53 cm, wingspan 1.2 m",
    mass: "1 to 1.6 kg",
    diet: "Carrion, eggs, chicks, fish and station waste",
    status: "Least concern",
    seen: "Patrolling the open ground around both stations.",
    station: "bharati",
  },
  "antarctic-petrel": {
    id: "antarctic-petrel",
    name: "Antarctic petrel",
    latin: "Thalassoica antarctica",
    group: "bird",
    blurb: "Brown and white, with a crisp white trailing edge on broad wings.",
    facts: [
      "Breeds on steep cliffs and nunataks, almost always within sight of sea ice.",
      "Feeds in tight flocks at the ice edge, often in the same water as penguins and whales.",
      "Rides the wind with almost no flapping, which makes it hard to read the species at a distance.",
      "Sightings from an icebreaker usually mean the ship has reached good nesting water.",
    ],
    length: "43 cm, wingspan 1.5 m",
    mass: "600 to 800 g",
    diet: "Krill, fish and squid",
    status: "Least concern",
    seen: "Gliding over the ridge line between station and coast.",
    station: "bharati",
  },
  "humpback-whale": {
    id: "humpback-whale",
    name: "Humpback whale",
    latin: "Megaptera novaeangliae",
    group: "whale",
    blurb: "Very large, very curious, with absurdly long pectoral fins and a habit of rolling over to look at boats.",
    facts: [
      "Feeds on swarms of krill and small fish in polar water, then fasts on tropical breeding grounds.",
      "Works krill into a bubble net, blowing a spiral of bubbles to concentrate the swarm before lunging through it.",
      "Males sing in structured phrases that change a little each season and spread between populations.",
      "Southern Ocean numbers have recovered well since commercial whaling ended.",
    ],
    length: "14 to 17 m",
    mass: "up to 30 tonnes",
    diet: "Krill and small schooling fish",
    status: "Least concern",
    seen: "Surfacing in Thala Fjord, usually pairs this close to the ice.",
    station: "bharati",
  },
  orca: {
    id: "orca",
    name: "Killer whale",
    latin: "Orcinus orca",
    group: "whale",
    blurb: "Black and white icon with the tallest dorsal fin in the sea and a family pod that never splits.",
    facts: [
      "Hunts in coordinated pods, and in these waters is known for wave-washing seals off floes.",
      "Ecotypes differ so much in feeding and acoustics that they may be separate species.",
      "Females lead the pod and live decades after their last calf is weaned.",
      "Almost impossible to mistake for anything else, which makes them the prize sighting in Quilty Bay.",
    ],
    length: "6 to 8 m",
    mass: "3 to 6 tonnes",
    diet: "Fish, seals, penguins and other whales",
    status: "Data deficient",
    seen: "Patrolling the Quilty Bay ice edge.",
    station: "bharati",
  },
  "hourglass-dolphin": {
    id: "hourglass-dolphin",
    name: "Hourglass dolphin",
    latin: "Lagenorhynchus cruciger",
    group: "dolphin",
    blurb: "Small, fast and patterned in black with a white hourglass on each flank.",
    facts: [
      "The only dolphin that is genuinely a Southern Ocean species, and one of the least studied.",
      "Leaps clean out of the water in low arcs, often in pods of five to ten.",
      "Follows cool currents and the ice edge, so a sighting is a good indicator of the water mass.",
      "Almost everything known about its behaviour comes from ship-based observation.",
    ],
    length: "1.6 to 1.9 m",
    mass: "80 to 120 kg",
    diet: "Small fish, squid and crustaceans",
    status: "Least concern",
    seen: "Running the outer edge of Quilty Bay.",
    station: "bharati",
  },
  "icefish-shoal": {
    id: "icefish-shoal",
    name: "Antarctic icefish",
    latin: "Channichthyidae",
    group: "fish",
    blurb: "Translucent, pale and weird: the only vertebrate with no haemoglobin in its blood.",
    facts: [
      "Carries oxygen dissolved directly in blood plasma, which is why it looks almost colourless.",
      "Natural antifreeze proteins keep its body fluid liquid at minus 1.8 C.",
      "Big heart, low-oxygen lifestyle, and a favourite prey of Weddell seals.",
      "Sampled by the Bharati laboratory as part of the coastal fish programme.",
    ],
    length: "up to 40 cm",
    mass: "up to 1 kg",
    diet: "Krill, mysids and small fish",
    status: "Not evaluated",
    seen: "Shoaling in the shallows of Quilty Bay.",
    station: "bharati",
  },
  "antarctic-krill": {
    id: "antarctic-krill",
    name: "Antarctic krill",
    latin: "Euphausia superba",
    group: "fish",
    blurb: "Six centimetres long, glowing softly, and the hub the entire Southern Ocean food web turns on.",
    facts: [
      "Swarms in densities that turn the water pink and can be read on a ship's echo sounder.",
      "The combined biomass of the species is among the largest of any wild animal on the planet.",
      "Bioluminescent organs let swarms coordinate in the dark of the polar night.",
      "Feeds whales, seals, penguins, fish and seabirds in one calendar year of ice-edge production.",
    ],
    length: "up to 6 cm",
    mass: "around 1 gram",
    diet: "Diatoms and phytoplankton",
    status: "Least concern",
    seen: "Dense swarm along the fjord ice edge.",
    station: "bharati",
  },
  "chinstrap-penguin": {
    id: "chinstrap-penguin",
    name: "Chinstrap penguin",
    latin: "Pygoscelis antarcticus",
    group: "penguin",
    blurb: "A white face with one thin black line under the chin, and about as much attitude as a penguin can carry.",
    facts: [
      "Named for the helmet-strap line that runs under the chin and up behind the cheeks.",
      "One of the most numerous penguins on Earth, with millions of breeding pairs on the Antarctic islands.",
      "Nests on steep rocky slopes, where it defends a pebble nest with a fast, accurate peck.",
      "Favourite prey of leopard seals, which patrol exactly this kind of shoreline.",
    ],
    length: "71 to 76 cm",
    mass: "3 to 5 kg",
    diet: "Krill, small fish and squid",
    status: "Least concern",
    seen: "Rocky shoreline above the Bharati pump house, counted on the summer penguin survey.",
    station: "bharati",
  },
  "gentoo-penguin": {
    id: "gentoo-penguin",
    name: "Gentoo penguin",
    latin: "Pygoscelis papua",
    group: "penguin",
    blurb: "The white bonnet patch above each eye makes it the easiest of the brush-tailed penguins to pick out.",
    facts: [
      "Fastest penguin underwater, recorded at over 30 km/h on a foraging dive.",
      "Third largest penguin alive, after the emperor and the king.",
      "Nests on ice-free pebble ground and flat ridges close to the shore.",
      "Colonies near the Indian stations are monitored as an indicator of krill availability.",
    ],
    length: "70 to 80 cm",
    mass: "4.5 to 8.5 kg",
    diet: "Krill, fish and squid",
    status: "Least concern",
    seen: "Pebble ridge on the ice-free apron north of the Bharati modules.",
    station: "bharati",
  },
  "leopard-seal": {
    id: "leopard-seal",
    name: "Leopard seal",
    latin: "Hydrurga leptonyx",
    group: "seal",
    blurb: "Sleek, grey and spotted, with a reptilian head and the widest gape of any Antarctic seal.",
    facts: [
      "Takes penguins, other seals and fish, and still sieves krill through three-cusped side teeth.",
      "Almost always solitary outside the breeding season, and usually found close to penguin colonies.",
      "Females are noticeably larger than males, up to 3.4 m and over 500 kg.",
      "Emits a low descending song underwater that carries for kilometres and reads clearly on a hydrophone.",
    ],
    length: "2.4 to 3.4 m",
    mass: "350 to 600 kg",
    diet: "Penguins, other seals, fish and krill",
    status: "Least concern",
    seen: "Cruising the waterline in front of the penguin colony, which is exactly where it hunts.",
    station: "bharati",
  },
  "minke-whale": {
    id: "minke-whale",
    name: "Antarctic minke whale",
    latin: "Balaenoptera bonaerensis",
    group: "whale",
    blurb: "The smallest and most numerous baleen whale in these waters, with a white band across each flipper.",
    facts: [
      "Normally 7 to 10 m long, with a sharply pointed rostrum and a single central ridge on the head.",
      "Works the ice edge and pushes into narrow leads in the fast ice, sometimes ahead of an icebreaker.",
      "Its blow is said to smell of krill, which is what it has been feeding on.",
      "Calls include a metallic, machine-like pulse that acoustic surveys use to count the population.",
    ],
    length: "7 to 10 m",
    mass: "5 to 10 tonnes",
    diet: "Antarctic krill, mostly taken at the ice edge",
    status: "Near threatened",
    seen: "Working the Thala Fjord ice edge, usually in pairs.",
    station: "bharati",
  },
  "antarctic-tern": {
    id: "antarctic-tern",
    name: "Antarctic tern",
    latin: "Sterna vittata",
    group: "bird",
    blurb: "A small white tern with a black cap and long tail streamers, and the loudest thing on the shoreline.",
    facts: [
      "Replaces the Arctic tern in the far south, and unlike it never crosses the planet: these birds only disperse as far as the winter pack ice allows.",
      "Flies well inland to bathe and drink at freshwater lakes, which is why it appears over the oasis.",
      "Dives from a hover to take small fish and krill just below the surface.",
      "Nests in small, very noisy colonies on rocky islets and the tops of low rocks.",
    ],
    length: "35 cm, wingspan 80 cm",
    mass: "150 to 200 g",
    diet: "Small fish, krill and crustaceans",
    status: "Least concern",
    seen: "Skimming the meltwater margin of the oasis lakes, and along the Bharati shoreline.",
    station: "maitri",
  },
  "cape-petrel": {
    id: "cape-petrel",
    name: "Cape petrel",
    latin: "Daption capense",
    group: "bird",
    blurb: "Black and white checkered across the back, so it is often compared to a pintado pony.",
    facts: [
      "Commonest bird that follows ships in the Southern Ocean, and the easiest one to identify in flight.",
      "Nests on cliffs and rock ledges right along this coast, well within sight of the station.",
      "Feeds at the surface by pattering and dipping, often in the same flock as penguins and whales.",
      "Spits stomach oil at anyone who reaches into its nesting ledge.",
    ],
    length: "39 cm, wingspan 86 cm",
    mass: "340 to 480 g",
    diet: "Krill, fish, squid and discarded catch",
    status: "Least concern",
    seen: "Nesting on the coastal rock ledges, and gliding over the bay behind the station.",
    station: "bharati",
  },
  "wilsons-storm-petrel": {
    id: "wilsons-storm-petrel",
    name: "Wilson's storm petrel",
    latin: "Oceanites oceanicus",
    group: "bird",
    blurb: "Sparrow-sized, sooty brown with a bright white rump, and it seems to walk on the water.",
    facts: [
      "Hovers a few centimetres above the sea and patters the surface with both feet to hold position.",
      "The smallest of the common Antarctic seabirds, and one of the most abundant birds in the world.",
      "Nests in rock crevices and boulder piles, including the coastal oasis outcrops inland of the ice shelf.",
      "Often flies at night, which is how it avoids the skuas that raid its nest.",
    ],
    length: "16 to 19 cm, wingspan 40 cm",
    mass: "35 to 50 g",
    diet: "Plankton, small fish, squid and animal oil",
    status: "Least concern",
    seen: "Pattering over the meltwater margin of Lake Priyadarshini, and off the Bharati shore.",
    station: "maitri",
  },
  "antarctic-toothfish": {
    id: "antarctic-toothfish",
    name: "Antarctic toothfish",
    latin: "Dissostichus mawsoni",
    group: "fish",
    blurb: "A metre-long, near-freezing-water predator with antifreeze in its blood and a very large mouth.",
    facts: [
      "Grows past 2 m and over 100 kg, and lives for more than forty years.",
      "Antifreeze glycoproteins keep its blood liquid well below the freezing point of seawater.",
      "Main prey of Weddell seals and sperm whales in these latitudes, hunted far below the ice.",
      "The fishery for toothfish is managed under CCAMLR catch limits, watched closely from the station.",
    ],
    length: "up to 2 m",
    mass: "up to 100 kg",
    diet: "Fish, squid and large krill",
    status: "Not evaluated at species level; fishery under CCAMLR management",
    seen: "Deep water off the fjord shelf, sampled by the Bharati coastal programme.",
    station: "bharati",
  },
  "antarctic-sea-spider": {
    id: "antarctic-sea-spider",
    name: "Antarctic sea spider",
    latin: "Colossendeis, Pycnogonida",
    group: "invertebrate",
    blurb: "Not a spider at all, but one of the giants of the polar seafloor, standing on eight long legs.",
    facts: [
      "Sea spiders are not spiders: they are a separate class of marine animals, with the gut and even the heart extending into the legs.",
      "Southern Ocean species reach up to 70 cm across, a textbook case of polar gigantism in cold, oxygen-rich water.",
      "They breathe through the body surface and feed by sucking liquids out of anemones, hydroids and worms.",
      "The male carries the fertilised eggs on a specialised pair of legs until they hatch.",
    ],
    length: "up to 70 cm leg span",
    mass: "tens of grams",
    diet: "Sea anemones, hydroids and worms",
    status: "Not evaluated",
    seen: "Walking the boulder seafloor below the Bharati intake line.",
    station: "bharati",
  },
  "oasis-lake-invertebrates": {
    id: "oasis-lake-invertebrates",
    name: "Oasis lake invertebrates",
    latin: "Copepods, rotifers and tardigrades",
    group: "invertebrate",
    blurb: "Millimetre-scale survivors that freeze solid for the winter and simply thaw out in spring.",
    facts: [
      "Lake Priyadarshini holds copepods, rotifers and tardigrades rather than fish: too cold and too short a season for vertebrates.",
      "Tardigrades enter anhydrobiosis, losing almost all their water and pausing metabolism, then resume when meltwater returns.",
      "The community is fed by cyanobacterial mats on the lake bed, which are the base of the oasis food web.",
      "Sampled each summer as part of the oasis limnology programme.",
    ],
    length: "0.2 to 2 mm",
    mass: "micrograms",
    diet: "Cyanobacterial mats and phytoplankton",
    status: "Not evaluated",
    seen: "Shallow margin of Lake Priyadarshini beside Maitri.",
    station: "maitri",
  },
};

/** Colonies placed in the twin, in station metres. */
export const COLONIES: Record<StationSlug, ColonyDef[]> = {
  bharati: [
    {
      id: "bharati-adelie",
      speciesId: "adelie-penguin",
      station: "bharati",
      position: [30, 0, 62],
      count: 10,
      chicks: 2,
      kind: "waddle",
      label: "Adelie penguin colony",
    },
    {
      id: "bharati-chinstrap",
      speciesId: "chinstrap-penguin",
      station: "bharati",
      position: [58, 0, 42],
      count: 8,
      chicks: 2,
      kind: "waddle",
      label: "Chinstrap penguin colony",
    },
    {
      id: "bharati-gentoo",
      speciesId: "gentoo-penguin",
      station: "bharati",
      position: [-4, 0, 26],
      count: 6,
      chicks: 2,
      kind: "waddle",
      label: "Gentoo penguin colony",
    },
    {
      id: "bharati-leopard",
      speciesId: "leopard-seal",
      station: "bharati",
      position: [16, 0, 66],
      count: 2,
      kind: "cruise",
      radius: 11,
      label: "Leopard seal on patrol",
    },
    {
      id: "bharati-minke",
      speciesId: "minke-whale",
      station: "bharati",
      position: [-30, 0, 118],
      count: 2,
      kind: "surface",
      label: "Minke whales at the ice edge",
    },
    {
      id: "bharati-tern",
      speciesId: "antarctic-tern",
      station: "bharati",
      position: [-24, 0, 20],
      count: 6,
      kind: "fly",
      radius: 28,
      height: 10,
      label: "Terns over the shoreline",
    },
    {
      id: "bharati-cape-petrel",
      speciesId: "cape-petrel",
      station: "bharati",
      position: [-60, 0, -10],
      count: 6,
      kind: "fly",
      radius: 34,
      height: 14,
      label: "Cape petrels over the bay",
    },
    {
      id: "bharati-cape-nest",
      speciesId: "cape-petrel",
      station: "bharati",
      position: [66, 0, 34],
      count: 5,
      kind: "nest",
      label: "Cape petrel nest ledge",
    },
    {
      id: "bharati-storm-petrel",
      speciesId: "wilsons-storm-petrel",
      station: "bharati",
      position: [-4, 0, 92],
      count: 6,
      kind: "fly",
      radius: 15,
      height: 5,
      label: "Storm petrels pattering the water",
    },
    {
      id: "bharati-toothfish",
      speciesId: "antarctic-toothfish",
      station: "bharati",
      position: [-118, 0, 100],
      count: 8,
      kind: "swim",
      radius: 13,
      label: "Toothfish over the shelf",
    },
    {
      id: "bharati-sea-spider",
      speciesId: "antarctic-sea-spider",
      station: "bharati",
      position: [126, 0, 110],
      count: 8,
      kind: "swim",
      radius: 8,
      label: "Sea spiders on the seafloor",
    },
    {
      id: "bharati-emperor",
      speciesId: "emperor-penguin",
      station: "bharati",
      position: [-48, 0, 92],
      count: 4,
      chicks: 1,
      kind: "huddle",
      label: "Emperor penguin group",
    },
    {
      id: "bharati-weddell",
      speciesId: "weddell-seal",
      station: "bharati",
      position: [100, 0, 76],
      count: 3,
      chicks: 1,
      kind: "rest",
      label: "Weddell seals on the fast ice",
    },
    {
      id: "bharati-crabeater",
      speciesId: "crabeater-seal",
      station: "bharati",
      position: [-92, 0, 118],
      count: 2,
      kind: "rest",
      label: "Crabeater seals at the ice edge",
    },
    {
      id: "bharati-petrel",
      speciesId: "snow-petrel",
      station: "bharati",
      position: [0, 0, 30],
      count: 8,
      kind: "fly",
      radius: 55,
      height: 15,
      label: "Snow petrels over the apron",
    },
    {
      id: "bharati-skua",
      speciesId: "south-polar-skua",
      station: "bharati",
      position: [44, 0, -14],
      count: 3,
      kind: "fly",
      radius: 26,
      height: 9,
      label: "Skua patrol",
    },
    {
      id: "bharati-antarctic-petrel",
      speciesId: "antarctic-petrel",
      station: "bharati",
      position: [-40, 0, -40],
      count: 4,
      kind: "fly",
      radius: 32,
      height: 12,
      label: "Antarctic petrels",
    },
    {
      id: "bharati-humpback",
      speciesId: "humpback-whale",
      station: "bharati",
      position: [-70, 0, 132],
      count: 2,
      kind: "surface",
      label: "Humpback whales in the fjord",
    },
    {
      id: "bharati-orca",
      speciesId: "orca",
      station: "bharati",
      position: [138, 0, 96],
      count: 2,
      kind: "surface",
      label: "Orca pod",
    },
    {
      id: "bharati-dolphin",
      speciesId: "hourglass-dolphin",
      station: "bharati",
      position: [152, 0, 122],
      count: 5,
      kind: "leap",
      radius: 14,
      label: "Hourglass dolphin pod",
    },
    {
      id: "bharati-icefish",
      speciesId: "icefish-shoal",
      station: "bharati",
      position: [112, 0, 86],
      count: 16,
      kind: "swim",
      radius: 12,
      label: "Icefish shoal",
    },
    {
      id: "bharati-krill",
      speciesId: "antarctic-krill",
      station: "bharati",
      position: [-56, 0, 118],
      count: 60,
      kind: "swim",
      radius: 16,
      label: "Krill swarm",
    },
  ],
  maitri: [
    {
      id: "maitri-petrel",
      speciesId: "snow-petrel",
      station: "maitri",
      position: [-34, 0, -26],
      count: 6,
      kind: "fly",
      radius: 40,
      height: 13,
      label: "Snow petrels over the oasis",
    },
    {
      id: "maitri-skua",
      speciesId: "south-polar-skua",
      station: "maitri",
      position: [30, 0, 22],
      count: 2,
      kind: "fly",
      radius: 22,
      height: 8,
      label: "Skua pair",
    },
    {
      id: "maitri-antarctic-petrel",
      speciesId: "antarctic-petrel",
      station: "maitri",
      position: [-64, 0, 58],
      count: 4,
      kind: "fly",
      radius: 30,
      height: 11,
      label: "Antarctic petrels",
    },
    {
      id: "maitri-copepod",
      speciesId: "oasis-lake-invertebrates",
      station: "maitri",
      position: [-58, 0, 36],
      count: 60,
      kind: "swim",
      radius: 16,
      label: "Oasis lake life",
    },
    {
      id: "maitri-tern",
      speciesId: "antarctic-tern",
      station: "maitri",
      position: [-74, 0, 30],
      count: 4,
      kind: "fly",
      radius: 26,
      height: 9,
      label: "Terns bathing at the lake margin",
    },
    {
      id: "maitri-storm-nest",
      speciesId: "wilsons-storm-petrel",
      station: "maitri",
      position: [44, 0, -30],
      count: 5,
      kind: "nest",
      label: "Storm petrel crevice nests",
    },
  ],
};

/** The expedition member placed in both views. */
export const DEV_PROFILE = {
  id: "human-dev",
  name: "Dev Khandhediya",
  role: "Expedition systems and digital twin administrator",
  /** Outdoor standing position per station. */
  positions: {
    bharati: [24, 0, 58],
    maitri: [-28, 0, 46],
  } as Record<StationSlug, [number, number, number]>,
  /** Indoor desk position, in the command room of both stations. */
  deskRoomId: "command",
  blurb:
    "On site with the twin. He stands with the Adelie colony on the shore, and he keeps the digital twin desk in the command room running the rest of the day.",
  facts: [
    "Role: expedition systems and digital twin administrator, on the HackFinity007 team for problem statement 26060 (SIH 2026).",
    "Owns the sensor ingest, the MQTT link and the offline outbox at the station end, so the console keeps reading when the uplink does not.",
    "Keeps the twin model in step with the real buildings: room plans, equipment tags and the survey grid over the apron.",
    "Runs the cascade drills and the FPGA self-healing self-tests, and signs the results into the audit chain.",
    "Uses the Adelie colony as his field test: if he can stand among the penguins without disturbing them, the snow-vehicle route is quiet enough.",
    "On station he works from the admin desk in the command room, second desk past the communications console.",
  ],
  seen: "With the Adelie colony on the shore, or at the admin desk in the command room.",
} as const;

/** Camera pose that frames one colony closely. */
export function colonyFocus(colony: ColonyDef): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const [x, y, z] = colony.position;
  const distance =
    colony.kind === "swim"
      ? 22
      : colony.kind === "cruise"
        ? 26
        : colony.kind === "surface"
          ? 46
          : colony.kind === "nest"
            ? 16
            : 20;
  const height = colony.kind === "surface" ? 24 : colony.kind === "cruise" ? 12 : 9;
  return {
    position: [x + distance, y + height, z + distance],
    target: [x, y + 1.5, z],
  };
}

/** Camera pose that frames the expedition member. */
export function devFocus(station: StationSlug): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const [x, y, z] = DEV_PROFILE.positions[station];
  return { position: [x + 10, 5, z + 10], target: [x, y + 1, z] };
}

/** Species that live at the other station, used for the cross-station link. */
export function speciesAcrossStations(): Record<string, StationSlug> {
  const out: Record<string, StationSlug> = {};
  for (const [id, species] of Object.entries(SPECIES)) out[id] = species.station;
  return out;
}
