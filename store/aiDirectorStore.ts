
import { create } from 'zustand';
import { PlayerStats, AiStageConfig, UpgradeOption, AdviceResult, QuizDifficulty } from '../types';
import { EVOLUTION_RECIPES } from '../constants';

interface AiDirectorState {
    currentConfig: AiStageConfig | null;
    gameOverMessage: string | null;
    isGenerating: boolean;
    error: string | null;
    usedQuizQuestions: string[];
    resetQuizHistory: () => void;
    generateNextStage: (stats: PlayerStats, currentStage: number, lastResult?: string) => Promise<void>;
    generateMidStageQuiz: (stage: number, availableOptions: string[], difficulty: QuizDifficulty) => Promise<void>;
    generateUpgradeAdvice: (stats: PlayerStats, options: UpgradeOption[]) => Promise<AdviceResult>;
    setLastPortalMessage: (portalLetter: string) => void;
    generateDeathMessage: (stats: PlayerStats, stage: number, killer: string) => Promise<void>;
}

// --- STATIC ASSETS ---

const VALID_MOBS = [
    'TOXIC_SLIME', 'MUTATED_BAT', 'RUSTY_AUTOMATON', 'GAS_CLOUD', 'LANDFILL_GOLEM',
    'MUTATED_RAT', 'PAPER_WASTE', 'TOXIC_TOAD', 'DRONE', 'MECH',
    'OIL_BLOB', 'SLUDGE_HORROR', 'PLASTIC_VULTURE', 'RADIOACTIVE_SPIRIT', 'SMOG_IMP', 'SCRAP_KNIGHT',
    'MUD_GOLEM', 'PLASTIC_BOTTLE', 'TRASH_CAN', 'OIL_BARREL', 'PLASTIC_BAG', 'OLD_TIRE', 'E_WASTE'
];

const VALID_LANDMARKS = [
    'FOREST', 'SKULL', 'ICE', 'VOLCANO', 'PYRAMID', 'MUSHROOM', 'CYBER', 'VOID', 'SKY', 'HELL'
];

const VALID_PROPS = [
    'TREE', 'STONE', 'MUSHROOM', 'GRAVE', 'RUIN', 'CRYSTAL', 'SNOW_TREE', 'MAGMA_ROCK', 'LAVA_PILLAR',
    'CACTUS', 'PALM', 'SWAMP_TREE', 'VINE', 'SERVER', 'NEON_SIGN', 'VOID_ROCK', 'STAR_PILLAR',
    'CLOUD_PILLAR', 'GOLD_GATE', 'SPIKE_ROCK'
];

// --- STATIC QUIZ POOL ---

interface QuizTemplate {
    q: string;
    a: string;
    w: [string, string];
    e: string;
    difficulty: QuizDifficulty;
}

const STAGE_QUIZ_POOLS: Record<string, QuizTemplate[]> = {
    "The Plastic Woods": [
        { q: "Which everyday item takes 450 years to decompose?", a: "Plastic bottle", w: ["Banana peel", "Cotton shirt"], e: "Plastic bottles can linger in the environment for over four centuries!", difficulty: 'EASY' },
        { q: "What is the best way to carry groceries?", a: "Reusable bag", w: ["Plastic bag", "Paper bag every time"], e: "Reusable bags can replace hundreds of single-use plastic bags over their lifetime.", difficulty: 'EASY' },
        { q: "Which material is plastic most commonly made from?", a: "Fossil fuels (petroleum)", w: ["Sand", "Wood pulp"], e: "Most plastics are derived from petroleum or natural gas, non-renewable resources.", difficulty: 'MEDIUM' },
        { q: "What percentage of all plastic ever produced has been recycled?", a: "About 9%", w: ["About 50%", "About 30%"], e: "Only ~9% of plastic has been recycled; most ends up in landfills or the environment.", difficulty: 'MEDIUM' },
        { q: "Which enzyme discovered in 2016 can break down PET plastic?", a: "PETase", w: ["Cellulase", "Amylase"], e: "PETase was discovered in a bacterium that evolved to eat plastic at a Japanese recycling site.", difficulty: 'HARD' },
        { q: "The EU 2021 Single-Use Plastics Directive bans what?", a: "10 categories of single-use plastic items", w: ["All plastic packaging", "Plastic in food products"], e: "The directive targets items like straws, cutlery, and cotton bud sticks most commonly found on beaches.", difficulty: 'HARD' },
    ],
    "E-Waste Graveyard": [
        { q: "What does 'e-waste' stand for?", a: "Electronic waste", w: ["Energy waste", "Environmental waste"], e: "E-waste includes discarded electronics like phones, TVs, and computers.", difficulty: 'EASY' },
        { q: "Which toxic metal is found in old car batteries?", a: "Lead", w: ["Copper", "Tin"], e: "Lead is highly toxic and can contaminate soil and water if batteries are not recycled properly.", difficulty: 'EASY' },
        { q: "What fraction of global e-waste is formally recycled?", a: "About 17%", w: ["About 60%", "About 40%"], e: "The rest is often dumped or informally processed, releasing toxic substances.", difficulty: 'MEDIUM' },
        { q: "Which country generates the most e-waste per person per year?", a: "Norway", w: ["China", "USA"], e: "Norway tops per-capita e-waste generation due to high rates of consumer electronics use.", difficulty: 'MEDIUM' },
        { q: "What does the Basel Convention regulate?", a: "Trade of hazardous waste between countries", w: ["Deep-sea nuclear dumping", "Greenhouse gas emissions"], e: "The 1989 Basel Convention restricts the export of hazardous waste to developing nations.", difficulty: 'HARD' },
        { q: "Approximately how much gold is in one tonne of discarded mobile phones?", a: "About 300 grams", w: ["About 10 grams", "About 1 kilogram"], e: "Urban mining of e-waste is often more efficient than gold ore mining from the earth.", difficulty: 'HARD' },
    ],
    "Frozen Server Farm": [
        { q: "What is the main source of energy for a solar panel?", a: "Sunlight", w: ["Wind", "Heat"], e: "Photovoltaic cells convert sunlight directly into electricity.", difficulty: 'EASY' },
        { q: "What gas is released when ice melts in the Arctic?", a: "Methane", w: ["Oxygen", "Nitrogen"], e: "Permafrost contains trapped methane; its release accelerates climate change.", difficulty: 'MEDIUM' },
        { q: "Which activity uses the most household electricity globally?", a: "Heating and cooling (HVAC)", w: ["Lighting", "Cooking"], e: "Space heating and cooling accounts for roughly 50% of household energy use.", difficulty: 'MEDIUM' },
        { q: "What is 'embodied carbon' in a product?", a: "CO2 emitted during its manufacture and transport", w: ["CO2 it absorbs while in use", "CO2 released when burned"], e: "Embodied carbon accounts for all emissions before a product is even used.", difficulty: 'HARD' },
        { q: "Data centers account for approximately what share of global electricity use?", a: "About 1–2%", w: ["About 10%", "About 0.1%"], e: "Despite rapid growth in data, efficiency gains have kept data center energy use relatively stable.", difficulty: 'HARD' },
        { q: "Which renewable energy type works best in cold, windy climates?", a: "Wind power", w: ["Solar power", "Geothermal power"], e: "Cold air is denser, which means wind turbines can produce more energy in cold climates.", difficulty: 'EASY' },
    ],
    "Magma Refinery": [
        { q: "Which gas is the primary contributor to the greenhouse effect?", a: "Carbon dioxide (CO2)", w: ["Oxygen", "Hydrogen"], e: "CO2 traps heat in the atmosphere, warming the planet over time.", difficulty: 'EASY' },
        { q: "What is 'fracking' used to extract?", a: "Oil and natural gas", w: ["Gold", "Drinking water"], e: "Hydraulic fracturing injects high-pressure fluid into rock to release fossil fuels.", difficulty: 'MEDIUM' },
        { q: "Which sector produces the most global greenhouse gas emissions?", a: "Energy (electricity and heat)", w: ["Agriculture", "Transportation"], e: "Energy production for electricity and heat accounts for about 34% of global emissions.", difficulty: 'MEDIUM' },
        { q: "What is 'carbon capture and storage' (CCS)?", a: "Trapping CO2 before it enters the atmosphere", w: ["Planting trees to absorb CO2", "Burning fossil fuels more cleanly"], e: "CCS captures emissions at source (e.g. power plants) and stores them underground.", difficulty: 'HARD' },
        { q: "What percentage of global CO2 emissions does cement production contribute?", a: "About 8%", w: ["About 1%", "About 20%"], e: "Cement production releases CO2 both from burning fuel and from the chemical reaction itself.", difficulty: 'HARD' },
        { q: "Which fossil fuel produces the least CO2 when burned?", a: "Natural gas", w: ["Coal", "Oil"], e: "Natural gas produces about half the CO2 of coal per unit of energy, though it is still a fossil fuel.", difficulty: 'EASY' },
    ],
    "Silicon Dunes": [
        { q: "What does 'reduce, reuse, recycle' encourage first?", a: "Reduce consumption", w: ["Recycle everything", "Reuse then buy new"], e: "The most effective action is to reduce how much we consume in the first place.", difficulty: 'EASY' },
        { q: "Which material takes the longest to decompose in a landfill?", a: "Glass (up to 1 million years)", w: ["Plastic bag (20 years)", "Aluminum can (80 years)"], e: "Glass can persist almost indefinitely in landfills, yet it is 100% recyclable.", difficulty: 'MEDIUM' },
        { q: "What is the circular economy?", a: "A system that keeps materials in use as long as possible", w: ["An economy based on oil circles", "A global trading loop"], e: "The circular economy aims to eliminate waste by designing products for reuse, repair, and recycling.", difficulty: 'MEDIUM' },
        { q: "Silicon for electronics is derived from which abundant resource?", a: "Sand (quartz)", w: ["Limestone", "Iron ore"], e: "Sand is processed into pure silicon for semiconductors, though mining impacts ecosystems.", difficulty: 'HARD' },
        { q: "What is 'planned obsolescence'?", a: "Designing products to fail or become outdated quickly", w: ["Recycling programs that expire", "Carbon offset expiry dates"], e: "Planned obsolescence drives consumers to replace products faster, increasing waste.", difficulty: 'HARD' },
        { q: "Which action saves more water: a bath or a short shower?", a: "Short shower (under 5 minutes)", w: ["Bath", "They use the same amount"], e: "A typical bath uses 150 litres; a short shower uses around 35 litres.", difficulty: 'EASY' },
    ],
    "Toxic Swamp": [
        { q: "What is composting?", a: "Recycling food scraps into soil", w: ["Burning garden waste", "Burying plastic"], e: "Composting turns organic waste into nutrient-rich soil, reducing landfill methane.", difficulty: 'EASY' },
        { q: "Which household chemical should never be poured down the drain?", a: "Paint or motor oil", w: ["Vinegar", "Dish soap"], e: "Toxic liquids contaminate waterways and harm aquatic life.", difficulty: 'EASY' },
        { q: "What percentage of Earth's water is safe to drink?", a: "Less than 1%", w: ["About 10%", "About 50%"], e: "97% is saltwater, and most freshwater is locked in glaciers.", difficulty: 'MEDIUM' },
        { q: "Which farming practice reduces chemical runoff?", a: "Buffer strips of vegetation near waterways", w: ["Tilling more frequently", "Increasing fertiliser use"], e: "Vegetation buffers absorb runoff and filter pollutants before they reach rivers.", difficulty: 'MEDIUM' },
        { q: "What is eutrophication?", a: "Excess nutrients causing algae blooms that deplete oxygen", w: ["Acid rain damage to forests", "Salt build-up in soil"], e: "Fertiliser runoff triggers algae growth that suffocates fish and aquatic life.", difficulty: 'HARD' },
        { q: "Which pesticide caused widespread bird egg-shell thinning in the 1960s?", a: "DDT", w: ["Glyphosate", "Chlorpyrifos"], e: "DDT's environmental persistence led to near-extinction of species like bald eagles.", difficulty: 'HARD' },
    ],
    "Cyber City Ruins": [
        { q: "Which light bulb type uses least energy?", a: "LED", w: ["Incandescent", "Halogen"], e: "LEDs use up to 90% less energy than traditional incandescent bulbs.", difficulty: 'EASY' },
        { q: "What is 'smart grid' technology?", a: "A power network that uses digital communication to manage electricity", w: ["A graph showing energy prices", "Solar panels on every house"], e: "Smart grids balance supply and demand in real time, reducing waste.", difficulty: 'MEDIUM' },
        { q: "Which transport mode produces the least CO2 per passenger kilometre?", a: "Electric rail (train)", w: ["Petrol car (solo)", "Short-haul flight"], e: "Rail transport is among the lowest-emission ways to move people over long distances.", difficulty: 'MEDIUM' },
        { q: "What is 'urban heat island' effect?", a: "Cities being warmer than surrounding rural areas", w: ["Heat trapped inside buildings", "Warming caused by traffic fumes"], e: "Dark pavements and buildings absorb more heat; green spaces and cool roofs help reduce it.", difficulty: 'HARD' },
        { q: "By 2030, what share of new cars sold globally need to be electric to meet climate goals (IEA)?", a: "About 60%", w: ["About 20%", "About 90%"], e: "The IEA's Net Zero scenario requires around 60% EV share in new car sales by 2030.", difficulty: 'HARD' },
        { q: "What does 'unplugging devices on standby' reduce?", a: "Phantom (standby) power consumption", w: ["Battery charge cycles", "Network radiation"], e: "Devices on standby can account for up to 10% of household electricity use.", difficulty: 'EASY' },
    ],
    "The Null Void": [
        { q: "What is biodiversity?", a: "The variety of life on Earth", w: ["The study of plants only", "The number of bacteria species"], e: "Biodiversity includes all species of animals, plants, fungi, and micro-organisms.", difficulty: 'EASY' },
        { q: "Which gas makes up most of Earth's atmosphere?", a: "Nitrogen (78%)", w: ["Oxygen (78%)", "Carbon dioxide (78%)"], e: "Nitrogen is the most abundant gas; oxygen is second at about 21%.", difficulty: 'EASY' },
        { q: "What is the 'sixth mass extinction'?", a: "Current human-driven loss of species at 1,000× natural rate", w: ["A historic meteor event", "Predictions for the year 3000"], e: "Scientists say we are in the sixth mass extinction event, primarily driven by human activity.", difficulty: 'MEDIUM' },
        { q: "What fraction of species are threatened according to the IUCN Red List?", a: "More than 1 in 4 assessed species", w: ["1 in 100", "1 in 1,000"], e: "Over 44,000 species are listed as threatened with extinction on the IUCN Red List.", difficulty: 'MEDIUM' },
        { q: "Which ecosystem stores the most carbon per hectare?", a: "Peatlands", w: ["Tropical rainforests", "Temperate grasslands"], e: "Peatlands store twice as much carbon as all forests combined despite covering only 3% of land.", difficulty: 'HARD' },
        { q: "What is 'trophic cascade'?", a: "Ripple effects when a predator population changes", w: ["Energy flow through food chains", "Water flowing downhill through ecosystems"], e: "Removing wolves from Yellowstone changed rivers — an example of trophic cascade.", difficulty: 'HARD' },
    ],
    "Cloud Data Center": [
        { q: "What is the ozone layer's main role?", a: "Absorb harmful UV radiation from the sun", w: ["Keep Earth warm at night", "Produce oxygen for breathing"], e: "The ozone layer in the stratosphere filters UV-B and UV-C radiation.", difficulty: 'EASY' },
        { q: "What does 'carbon neutral' mean for a company?", a: "Net zero CO2 emissions after offsets", w: ["Using only renewable energy", "Zero emissions with no offsets"], e: "Carbon neutral includes buying offsets to balance out remaining emissions.", difficulty: 'MEDIUM' },
        { q: "Which cloud type stores the most water?", a: "Cumulonimbus", w: ["Cirrus", "Stratus"], e: "Cumulonimbus are towering storm clouds that can produce heavy rain, hail, and thunderstorms.", difficulty: 'EASY' },
        { q: "What is 'greenwashing'?", a: "Misleading claims about environmental benefits", w: ["Painting rooftops green for cooling", "Eco-friendly software development"], e: "Greenwashing misleads consumers into thinking products are more sustainable than they are.", difficulty: 'MEDIUM' },
        { q: "What is the global average temperature increase agreed to limit under the Paris Agreement?", a: "1.5°C above pre-industrial levels", w: ["2.5°C", "3°C"], e: "The Paris Agreement aims to limit warming to 1.5°C, with a harder limit of 2°C.", difficulty: 'HARD' },
        { q: "What is the carbon footprint of streaming one hour of video online?", a: "About 36 grams of CO2", w: ["About 1 kg of CO2", "About 500 grams of CO2"], e: "Streaming has a much smaller footprint than often reported, roughly equivalent to boiling a kettle.", difficulty: 'HARD' },
    ],
    "Digital Hell": [
        { q: "What is the most powerful greenhouse gas?", a: "Methane (CH4) over 20 years", w: ["Carbon dioxide (CO2)", "Water vapour"], e: "Methane is over 80× more potent than CO2 over 20 years, though it breaks down faster.", difficulty: 'MEDIUM' },
        { q: "What is nuclear energy's carbon footprint compared to coal?", a: "About 70× lower", w: ["About the same", "About 5× lower"], e: "Nuclear power produces very little CO2 per kWh, making it one of the lowest-carbon energy sources.", difficulty: 'HARD' },
        { q: "What is 'fast fashion'?", a: "Cheap, trend-driven clothes produced at high volume", w: ["Sportswear for running", "Tailored high-quality suits"], e: "Fast fashion contributes 10% of global carbon emissions and is a major source of water pollution.", difficulty: 'EASY' },
        { q: "Which single diet change reduces a person's carbon footprint the most?", a: "Cutting out beef and dairy", w: ["Switching to organic chicken", "Avoiding air-flown produce"], e: "Livestock farming, especially beef, accounts for the largest share of food-related emissions.", difficulty: 'MEDIUM' },
        { q: "What is the 'social cost of carbon'?", a: "The estimated economic damage caused by emitting one tonne of CO2", w: ["The price of carbon credits on exchanges", "The cost of building solar panels"], e: "The social cost of carbon helps governments weigh the true cost of climate damage in policy decisions.", difficulty: 'HARD' },
        { q: "Which action reduces food waste most at home?", a: "Meal planning before shopping", w: ["Buying in bulk always", "Freezing everything immediately"], e: "Planning meals prevents over-buying — the leading cause of household food waste.", difficulty: 'EASY' },
    ],
};

// Global fallback pool used when no stage-specific pool is available
const FALLBACK_QUIZ_POOL: QuizTemplate[] = [
    { q: "Which of these takes the longest to decompose?", a: "Plastic Bottle", w: ["Banana Peel", "Cotton Shirt"], e: "Plastic bottles can take 450 years to decompose!", difficulty: 'EASY' },
    { q: "What is the best way to reduce plastic waste?", a: "Reusable Bottles", w: ["Buying more plastic", "Single-use cups"], e: "Reusable bottles replace hundreds of single-use plastic bottles!", difficulty: 'EASY' },
    { q: "Which of these is a renewable energy source?", a: "Solar Power", w: ["Coal", "Natural Gas"], e: "Solar energy comes from the sun and is infinite.", difficulty: 'EASY' },
    { q: "What gas do trees absorb?", a: "Carbon Dioxide", w: ["Oxygen", "Helium"], e: "Trees act as carbon sinks, absorbing CO2 from the air.", difficulty: 'EASY' },
    { q: "What material can be recycled indefinitely without losing quality?", a: "Aluminum", w: ["Plastic", "Paper"], e: "Aluminum and glass can be recycled over and over without losing quality.", difficulty: 'MEDIUM' },
    { q: "Which of these is a greenhouse gas?", a: "Methane", w: ["Oxygen", "Nitrogen"], e: "Methane is a potent greenhouse gas emitted during decomposition.", difficulty: 'MEDIUM' },
    { q: "What is composting?", a: "Recycling organic waste into soil", w: ["Burning trash", "Throwing food away"], e: "Composting turns food scraps into nutrient-rich soil.", difficulty: 'EASY' },
    { q: "Which bulb is most energy efficient?", a: "LED", w: ["Incandescent", "Halogen"], e: "LEDs use up to 90% less energy than traditional bulbs.", difficulty: 'EASY' },
    { q: "What is 'Fast Fashion'?", a: "Cheap, disposable clothes", w: ["Running gear", "High quality suits"], e: "Fast fashion contributes heavily to landfill waste and water pollution.", difficulty: 'MEDIUM' },
    { q: "How much of Earth's water is drinkable?", a: "Less than 1%", w: ["50%", "10%"], e: "Most water is salty or frozen; preserving fresh water is vital.", difficulty: 'MEDIUM' },
    { q: "Which is a major cause of ocean pollution?", a: "Plastic Waste", w: ["Seaweed", "Fish migration"], e: "Millions of tons of plastic enter the oceans every year.", difficulty: 'EASY' },
    { q: "What does 'Biodegradable' mean?", a: "Breaks down naturally", w: ["Lasts forever", "Made of metal"], e: "Biodegradable materials can be decomposed by bacteria or other living organisms.", difficulty: 'EASY' },
    { q: "What is the 'Great Pacific Garbage Patch'?", a: "Floating Plastic Debris", w: ["A tropical island", "A coral reef"], e: "It is a massive collection of marine debris in the North Pacific Ocean.", difficulty: 'MEDIUM' },
    { q: "Which gas makes up most of the Earth's atmosphere?", a: "Nitrogen", w: ["Oxygen", "Carbon Dioxide"], e: "Nitrogen makes up about 78% of the atmosphere.", difficulty: 'MEDIUM' },
    { q: "What is the Paris Agreement's temperature limit target?", a: "1.5°C above pre-industrial levels", w: ["3°C", "2.5°C"], e: "The Paris Agreement aims to limit global warming to 1.5°C.", difficulty: 'HARD' },
];

const DEATH_MESSAGES = [
    "The forests remembered your name, though the machines did not.",
    "Your carbon was saved, but the battle was lost. Gaia weeps.",
    "Even guardians fall. The cycle begins anew.",
    "The pollution found its mark. Rise again, eco-warrior.",
    "Your sacrifice fertilized the earth. A new guardian will grow.",
    "The smog claims another. But hope is not extinguished.",
    "Defeated, but not forgotten. The data of your deeds lives on.",
    "Entropy wins this round. But Gaia's memory is long.",
    "The landfill grows by one guardian. Rest, and return stronger.",
    "Your energy is not lost — it is transformed. Respawn.",
    "The toxic tide was too great. The ocean remembers you.",
    "Corrupted data cannot stop a pure heart. Try again.",
    "Every fallen guardian nourishes the roots of resistance.",
    "The null void claims you, but your impact score endures.",
    "The machines won the battle. You will win the war.",
    "Carbon saved, life lost. The balance will be restored.",
];

const FIXED_STAGES: AiStageConfig[] = [
    {
        stageName: "The Plastic Woods",
        narrativeIntro: "Plastic waste has choked these ancient roots. The forest cries out for cleansing.",
        theme: { groundColor: "#14532d", checkColor: "#166534", decoColor: "#22c55e", borderColor: "#052e16", propType: "TREE", landmarkType: "FOREST" },
        enemies: { spawnPool: ["TOXIC_SLIME", "PLASTIC_BAG", "MUTATED_BAT", "PLASTIC_BOTTLE", "TOXIC_TOAD", "MUD_GOLEM"], speedMultiplier: 1.0, hpMultiplier: 1.0, densityMultiplier: 1.0 },
        boss: { name: "PLASTIC GOLIATH", introductionLine: "CONSUME... WASTE...", visualVariant: "FOREST", patternDifficulty: 1, narrative: "A massive amalgamation of toxic sludge and plastic waste rises from the depths." },
        quiz: {} as any
    },
    {
        stageName: "E-Waste Graveyard",
        narrativeIntro: "The spirits of the old world are restless, disturbed by mountains of discarded electronics.",
        theme: { groundColor: "#334155", checkColor: "#475569", decoColor: "#94a3b8", borderColor: "#1e293b", propType: "GRAVE", landmarkType: "SKULL" },
        enemies: { spawnPool: ["RUSTY_AUTOMATON", "E_WASTE", "GAS_CLOUD", "MUTATED_BAT", "PAPER_WASTE", "TRASH_CAN"], speedMultiplier: 1.1, hpMultiplier: 1.2, densityMultiplier: 1.1 },
        boss: { name: "CIRCUIT LICH", introductionLine: "SILENCE... ETERNAL...", visualVariant: "CRYPT", patternDifficulty: 2, narrative: "An ancient guardian corrupted by heavy metals and leaking batteries." },
        quiz: {} as any
    },
    {
        stageName: "Frozen Server Farm",
        narrativeIntro: "The cooling systems have failed. This frozen wasteland preserves data of a forgotten era.",
        theme: { groundColor: "#e0f2fe", checkColor: "#bae6fd", decoColor: "#7dd3fc", borderColor: "#0284c7", propType: "CRYSTAL", landmarkType: "ICE" },
        enemies: { spawnPool: ["LANDFILL_GOLEM", "DRONE", "E_WASTE", "TOXIC_SLIME", "GAS_CLOUD", "MECH"], speedMultiplier: 0.9, hpMultiplier: 1.5, densityMultiplier: 0.9 },
        boss: { name: "FROSTBYTE GOLEM", introductionLine: "SYSTEM... FREEZE...", visualVariant: "ICE", patternDifficulty: 2, narrative: "A cooling unit gone rogue, encasing everything in eternal permafrost." },
        quiz: {} as any
    },
    {
        stageName: "Magma Refinery",
        narrativeIntro: "The earth bleeds here. Industrial extraction has torn open the planet's crust.",
        theme: { groundColor: "#450a0a", checkColor: "#7f1d1d", decoColor: "#ef4444", borderColor: "#991b1b", propType: "MAGMA_ROCK", landmarkType: "VOLCANO" },
        enemies: { spawnPool: ["SMOG_IMP", "OIL_BARREL", "SCRAP_KNIGHT", "MUTATED_BAT", "MUTATED_RAT", "OLD_TIRE"], speedMultiplier: 1.3, hpMultiplier: 1.4, densityMultiplier: 1.2 },
        boss: { name: "SLAG COLOSSUS", introductionLine: "BURN... IT... ALL...", visualVariant: "MAGMA", patternDifficulty: 3, narrative: "Born from the heat of unchecked industrial furnaces." },
        quiz: {} as any
    },
    {
        stageName: "Silicon Dunes",
        narrativeIntro: "A desert of crushed glass and silicon. Nothing grows here but the machines.",
        theme: { groundColor: "#fcd34d", checkColor: "#fbbf24", decoColor: "#d97706", borderColor: "#78350f", propType: "CACTUS", landmarkType: "PYRAMID" },
        enemies: { spawnPool: ["PAPER_WASTE", "MUTATED_RAT", "PLASTIC_BAG", "RUSTY_AUTOMATON", "TRASH_CAN", "PLASTIC_VULTURE"], speedMultiplier: 1.0, hpMultiplier: 1.4, densityMultiplier: 1.2 },
        boss: { name: "SILICON DUNE WORM", introductionLine: "RETURN... TO... DUST...", visualVariant: "CRYPT", patternDifficulty: 3, narrative: "A ruler of a barren kingdom, commanding the sands of time and waste." },
        quiz: {} as any
    },
    {
        stageName: "Toxic Swamp",
        narrativeIntro: "Chemical runoff has mutated the flora. The air is thick with poison.",
        theme: { groundColor: "#3f6212", checkColor: "#4d7c0f", decoColor: "#84cc16", borderColor: "#1a2e05", propType: "MUSHROOM", landmarkType: "MUSHROOM" },
        enemies: { spawnPool: ["TOXIC_TOAD", "MUD_GOLEM", "TOXIC_SLIME", "PLASTIC_BOTTLE", "SMOG_IMP", "OIL_BARREL"], speedMultiplier: 1.1, hpMultiplier: 1.6, densityMultiplier: 1.3 },
        boss: { name: "TOXIC ALCHEMIST", introductionLine: "DISSOLVE...", visualVariant: "FOREST", patternDifficulty: 4, narrative: "A living bog of chemical sludge that devours all life." },
        quiz: {} as any
    },
    {
        stageName: "Cyber City Ruins",
        narrativeIntro: "The lights are on, but no one is home. Automation continues without purpose.",
        theme: { groundColor: "#020617", checkColor: "#0f172a", decoColor: "#3b82f6", borderColor: "#1e293b", propType: "NEON_SIGN", landmarkType: "CYBER" },
        enemies: { spawnPool: ["MECH", "OLD_TIRE", "DRONE", "E_WASTE", "LANDFILL_GOLEM", "TRASH_CAN"], speedMultiplier: 1.4, hpMultiplier: 1.5, densityMultiplier: 1.4 },
        boss: { name: "MAINFRAME OVERLORD", introductionLine: "OPTIMIZING... DESTRUCTION...", visualVariant: "MECH", patternDifficulty: 5, narrative: "The central processor for a city that consumed itself." },
        quiz: {} as any
    },
    {
        stageName: "The Null Void",
        narrativeIntro: "Reality thins here. The consequences of ignoring the balance have torn the fabric of space.",
        theme: { groundColor: "#2e1065", checkColor: "#3b0764", decoColor: "#7c3aed", borderColor: "#000000", propType: "VOID_ROCK", landmarkType: "VOID" },
        enemies: { spawnPool: ["OIL_BLOB", "SLUDGE_HORROR", "GAS_CLOUD", "TOXIC_SLIME", "MUTATED_BAT", "PAPER_WASTE"], speedMultiplier: 1.5, hpMultiplier: 1.2, densityMultiplier: 1.5 },
        boss: { name: "DATA WRAITH", introductionLine: "NOTHING... REMAINS...", visualVariant: "VOID", patternDifficulty: 5, narrative: "An entity from beyond, drawn to the emptiness left by consumption." },
        quiz: {} as any
    },
    {
        stageName: "Cloud Data Center",
        narrativeIntro: "High above the smog, the servers hum. Information flows, but wisdom is lost.",
        theme: { groundColor: "#bae6fd", checkColor: "#7dd3fc", decoColor: "#ffffff", borderColor: "#0ea5e9", propType: "SERVER", landmarkType: "SKY" },
        enemies: { spawnPool: ["PLASTIC_VULTURE", "RADIOACTIVE_SPIRIT", "DRONE", "PLASTIC_BAG", "GAS_CLOUD", "MECH"], speedMultiplier: 1.6, hpMultiplier: 1.1, densityMultiplier: 1.3 },
        boss: { name: "SMOG DRAGON", introductionLine: "ACCESS... DENIED...", visualVariant: "MECH", patternDifficulty: 6, narrative: "The automated defense system of the atmospheric processors." },
        quiz: {} as any
    },
    {
        stageName: "Digital Hell",
        narrativeIntro: "The final layer. Where corrupted data and corrupted souls burn together.",
        theme: { groundColor: "#450a0a", checkColor: "#7f1d1d", decoColor: "#ef4444", borderColor: "#000000", propType: "LAVA_PILLAR", landmarkType: "HELL" },
        enemies: { spawnPool: ["SCRAP_KNIGHT", "TRASH_CAN", "SMOG_IMP", "OIL_BARREL", "RUSTY_AUTOMATON", "SLUDGE_HORROR"], speedMultiplier: 1.5, hpMultiplier: 2.0, densityMultiplier: 1.5 },
        boss: { name: "NUCLEAR CORE TITAN", introductionLine: "ASHES... TO... ASHES...", visualVariant: "MAGMA", patternDifficulty: 7, narrative: "The ultimate manifestation of entropy and destruction." },
        quiz: {} as any
    }
];

// --- QUIZ SELECTION HELPER ---

function selectQuizQuestion(
    stageName: string,
    difficulty: QuizDifficulty,
    availableOptions?: string[],
    excludedQuestions: string[] = []
): AiStageConfig['quiz'] {
    // 1. Get the pool for this stage, fall back to global pool
    const stagePool = STAGE_QUIZ_POOLS[stageName];
    const pool: QuizTemplate[] = stagePool ?? FALLBACK_QUIZ_POOL;

    // 2. Prefer the requested difficulty, but use any unused question before repeating.
    const difficultyPool = pool.filter(q => q.difficulty === difficulty);
    const preferredPool = difficultyPool.length > 0 ? difficultyPool : pool;
    const excluded = new Set(excludedQuestions);
    const unusedPreferredPool = preferredPool.filter(template => !excluded.has(template.q));
    const unusedPool = pool.filter(template => !excluded.has(template.q));
    const finalPool =
        unusedPreferredPool.length > 0
            ? unusedPreferredPool
            : unusedPool.length > 0
                ? unusedPool
                : preferredPool;

    // 3. Pick a random question
    const template = finalPool[Math.floor(Math.random() * finalPool.length)];

    // 4. Assign correct answer to a random option slot
    const slots = availableOptions ?? ['A', 'B', 'C'];
    const correctKey = slots[Math.floor(Math.random() * slots.length)] as 'A' | 'B' | 'C';
    const options: { A?: string; B?: string; C?: string } = {};
    options[correctKey] = template.a;

    const otherSlots = slots.filter(s => s !== correctKey);
    const wrongs = [...template.w].sort(() => 0.5 - Math.random());
    otherSlots.forEach((slot, i) => {
        (options as any)[slot] = wrongs[i % wrongs.length];
    });

    // 5. Impact value by difficulty
    const impactByDifficulty: Record<QuizDifficulty, number> = { EASY: 75, MEDIUM: 100, HARD: 150 };

    return {
        question: template.q,
        options,
        correctOption: correctKey,
        explanation: template.e,
        impactValue: impactByDifficulty[difficulty]
    };
}

export const useAiDirectorStore = create<AiDirectorState>((set, get) => ({
    currentConfig: null,
    gameOverMessage: null,
    isGenerating: false,
    error: null,
    usedQuizQuestions: [],

    resetQuizHistory: () => set({ usedQuizQuestions: [] }),

    generateNextStage: async (stats, currentStage, lastResult) => {
        set({ isGenerating: true, error: null });
        const targetStage = currentStage + 1;
        const askedQuestions = [
            ...new Set([
                ...get().usedQuizQuestions,
                ...stats.impactHistory
                    .map(entry => entry.question)
                    .filter((question): question is string => Boolean(question)),
            ]),
        ];

        // 1. SELECT FIXED STAGE
        const stageIndex = (targetStage - 1) % FIXED_STAGES.length;
        let finalConfig = JSON.parse(JSON.stringify(FIXED_STAGES[stageIndex]));

        // 2. APPLY LOOP DIFFICULTY SCALING
        const loop = Math.floor((targetStage - 1) / FIXED_STAGES.length);
        if (loop > 0) {
            finalConfig.enemies.hpMultiplier *= (1 + loop * 0.5);
            finalConfig.enemies.densityMultiplier *= (1 + loop * 0.2);
            finalConfig.enemies.damageMultiplier = (finalConfig.enemies.damageMultiplier || 1.0) * (1 + loop * 0.3);
            finalConfig.boss.name = `ASCENDED ${finalConfig.boss.name}`;
        }

        // 3. GENERATE QUIZ FROM STATIC POOL
        const difficulty = stats.quizDifficulty || 'MEDIUM';
        finalConfig.quiz = selectQuizQuestion(finalConfig.stageName, difficulty, undefined, askedQuestions);

        set({
            currentConfig: finalConfig,
            isGenerating: false,
            usedQuizQuestions: [...new Set([...askedQuestions, finalConfig.quiz.question])],
        });
    },

    generateMidStageQuiz: async (stage, availableOptions, difficulty) => {
        const state = get();
        if (!state.currentConfig) return;

        set({ isGenerating: true });

        const quiz = selectQuizQuestion(
            state.currentConfig.stageName,
            difficulty,
            availableOptions.length > 0 ? availableOptions : ['A', 'B', 'C'],
            state.usedQuizQuestions
        );

        set((prevState) => {
            if (!prevState.currentConfig) return { isGenerating: false };
            return {
                isGenerating: false,
                currentConfig: { ...prevState.currentConfig, quiz },
                usedQuizQuestions: [...new Set([...prevState.usedQuizQuestions, quiz.question])],
            };
        });
    },

    setLastPortalMessage: (portalLetter: string) => {
        set((state) => {
            if (!state.currentConfig) return {};
            return {
                isGenerating: false,
                currentConfig: {
                    ...state.currentConfig,
                    quiz: {
                        question: "The final source of corruption is close! Purify the last portal to summon the Goliath!",
                        options: {},
                        correctOption: portalLetter as any,
                        explanation: "Gaia's strength is returning. One more push!",
                        impactValue: 150
                    }
                }
            };
        });
    },

    generateDeathMessage: async (stats, stage, killer) => {
        const message = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
        set({ gameOverMessage: message });
    },

    generateUpgradeAdvice: async (stats, options) => {
        if (options.length === 0) {
            return { recommendedOptionId: '', reason: "No options available." };
        }

        const ownedWeaponKeys = Object.keys(stats.unlockedWeapons);
        const slotsFull = ownedWeaponKeys.length >= stats.maxWeaponSlots;

        // Priority 1: Evolution weapons (already unlocked, being upgraded)
        const evolutionOption = options.find(o => o.isEvolution);
        if (evolutionOption) {
            return {
                recommendedOptionId: evolutionOption.id,
                reason: `${evolutionOption.label} is a powerful evolution! Upgrade it to maximise destruction.`
            };
        }

        // Priority 2: New weapons that complete an evolution pair
        const evolutionPairOption = options.find(o =>
            o.isNewWeapon && o.type === 'WEAPON' &&
            EVOLUTION_RECIPES.some(recipe =>
                recipe.ingredients.includes(o.key as any) &&
                recipe.ingredients.some(ing => ownedWeaponKeys.includes(ing))
            )
        );
        if (evolutionPairOption) {
            const recipe = EVOLUTION_RECIPES.find(r => r.ingredients.includes(evolutionPairOption.key as any) && r.ingredients.some(ing => ownedWeaponKeys.includes(ing)));
            return {
                recommendedOptionId: evolutionPairOption.id,
                reason: `${evolutionPairOption.label} pairs with a weapon you own to unlock ${recipe?.result ?? 'a powerful evolution'}!`
            };
        }

        // Priority 3: New weapons (if slots available)
        if (!slotsFull) {
            const newWeaponOption = options.find(o => o.isNewWeapon && o.type === 'WEAPON');
            if (newWeaponOption) {
                return {
                    recommendedOptionId: newWeaponOption.id,
                    reason: `Diversify with ${newWeaponOption.label} to cover more enemy types.`
                };
            }
        }

        // Priority 4: New passive items
        const newPassiveOption = options.find(o => o.type === 'PASSIVE');
        if (newPassiveOption) {
            return {
                recommendedOptionId: newPassiveOption.id,
                reason: `${newPassiveOption.label} will permanently boost your capabilities.`
            };
        }

        // Priority 5: Stat upgrades
        const statOption = options.find(o => o.type === 'STAT');
        if (statOption) {
            return {
                recommendedOptionId: statOption.id,
                reason: `Upgrading ${statOption.label} will keep you alive longer. Survival is paramount.`
            };
        }

        // Fallback
        return {
            recommendedOptionId: options[0].id,
            reason: "Every upgrade helps. Take what you can."
        };
    }
}));
