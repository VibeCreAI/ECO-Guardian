
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

// --- YES/NO QUESTION POOL ---

interface YesNoTemplate {
    q: string;          // question text
    a: 'YES' | 'NO';   // correct answer
    e: string;          // explanation shown after answering
}

const YES_NO_POOLS: Record<string, YesNoTemplate[]> = {
    "The Plastic Woods": [
        { q: "Does a plastic bag take more than 100 years to break down?", a: "YES", e: "Plastic bags can take up to 1,000 years to decompose — they just fragment into microplastics." },
        { q: "Is most plastic packaging recycled after use?", a: "NO", e: "Only about 9% of all plastic ever produced has been recycled. Most ends up in landfill or the ocean." },
        { q: "Can you recycle a greasy pizza box in standard recycling?", a: "NO", e: "Grease contaminates paper recycling. Tear off the clean lid — that part can be recycled." },
        { q: "Are bioplastics always better for the environment than regular plastic?", a: "NO", e: "Many bioplastics need industrial composting facilities to break down, and still emit CO2 when they do." },
        { q: "Does sunlight eventually make plastic safe for the environment?", a: "NO", e: "UV light just breaks plastic into microplastics — tiny fragments that enter the food chain." },
        { q: "Does plastic production contribute to greenhouse gas emissions?", a: "YES", e: "Making plastic from fossil fuels releases CO2 at every stage: extraction, refining, and manufacturing." },
    ],
    "E-Waste Graveyard": [
        { q: "Does one old smartphone contain toxic metals like lead and mercury?", a: "YES", e: "Old phones contain lead solder, mercury switches, and cadmium batteries — all hazardous if landfilled." },
        { q: "Is most electronic waste formally recycled worldwide?", a: "NO", e: "Only about 17% of e-waste is formally recycled. The rest is often dumped or informally processed." },
        { q: "Can rare earth metals in phones be recovered through recycling?", a: "YES", e: "Urban mining of e-waste can recover gold, silver, and rare earths more efficiently than mining virgin ore." },
        { q: "Does buying a new phone every year help the environment?", a: "NO", e: "Manufacturing a smartphone produces the equivalent of 70kg of CO2 — most of a phone's lifetime emissions." },
        { q: "Is e-waste the fastest growing waste stream in the world?", a: "YES", e: "Global e-waste grew to 53.6 million tonnes in 2019 and is increasing by about 2 million tonnes per year." },
        { q: "Can you safely throw household batteries in regular bins?", a: "NO", e: "Batteries contain toxic chemicals that leak into soil and groundwater. Always use battery recycling points." },
    ],
    "Frozen Server Farm": [
        { q: "Can wind turbines work in freezing temperatures?", a: "YES", e: "Modern turbines are designed for Arctic conditions and can operate down to -40°C using heated components." },
        { q: "Does streaming video online produce zero carbon emissions?", a: "NO", e: "Streaming uses data centers and network infrastructure — it produces roughly 36g of CO2 per hour of viewing." },
        { q: "Is nuclear energy considered low-carbon by the IPCC?", a: "YES", e: "The IPCC classifies nuclear as one of the lowest lifecycle carbon energy sources, comparable to wind." },
        { q: "Does keeping your home 1°C cooler in winter save energy?", a: "YES", e: "Lowering your thermostat by 1°C typically reduces heating energy use by about 8–10%." },
        { q: "Are heat pumps more efficient than gas boilers for heating?", a: "YES", e: "Heat pumps move heat rather than create it — they deliver 3–4 units of heat for every unit of electricity used." },
        { q: "Do data centers use more electricity than the entire airline industry?", a: "NO", e: "Data centers use about 1–2% of global electricity; aviation uses around 2–3%. But both are growing fast." },
    ],
    "Magma Refinery": [
        { q: "Is cement production responsible for about 8% of global CO2 emissions?", a: "YES", e: "Cement releases CO2 both from burning fuel and from the chemical conversion of limestone — making it hard to decarbonise." },
        { q: "Does natural gas produce less CO2 than coal when burned?", a: "YES", e: "Natural gas produces about half the CO2 of coal per unit of energy — though it is still a fossil fuel." },
        { q: "Is fracking considered safe for local groundwater?", a: "NO", e: "Multiple studies link hydraulic fracturing to methane contamination of groundwater and induced earthquakes." },
        { q: "Do fossil fuels still receive more global subsidies than renewables?", a: "YES", e: "The IMF estimated fossil fuel subsidies at $5.9 trillion globally in 2020 when implicit costs are included." },
        { q: "Can carbon capture technology remove CO2 from power plant emissions?", a: "YES", e: "CCS can capture up to 90% of CO2 at the point of emission, though large-scale deployment remains expensive." },
        { q: "Is oil a finite, non-renewable resource?", a: "YES", e: "Oil takes millions of years to form from organic matter under extreme heat and pressure — we cannot replace what we burn." },
    ],
    "Silicon Dunes": [
        { q: "Does manufacturing a smartphone produce more CO2 than a year of using it?", a: "YES", e: "About 80% of a smartphone's lifetime carbon footprint comes from manufacturing, not usage — buy less, keep longer." },
        { q: "Is glass 100% recyclable without quality loss?", a: "YES", e: "Glass can be recycled endlessly without losing clarity or purity — unlike plastic, which degrades each cycle." },
        { q: "Does recycling aluminium save 95% of the energy needed to make it from ore?", a: "YES", e: "Aluminium smelting is extremely energy-intensive. Recycling the same aluminium uses only a fraction of that energy." },
        { q: "Can you recycle most types of plastic in standard household bins?", a: "NO", e: "Most recycling systems only accept PET (#1) and HDPE (#2). Other plastic types often go to landfill." },
        { q: "Is bamboo a faster-growing material than most timber?", a: "YES", e: "Some bamboo species grow up to 91cm per day — making it one of the most renewable building materials available." },
        { q: "Is 'planned obsolescence' a strategy used by some manufacturers?", a: "YES", e: "Designing products to fail or become outdated quickly drives consumers to buy replacements, increasing waste." },
    ],
    "Toxic Swamp": [
        { q: "Does agriculture account for most of the world's freshwater use?", a: "YES", e: "Irrigation for crops uses roughly 70% of all freshwater withdrawn globally each year." },
        { q: "Can you pour motor oil down a household drain safely?", a: "NO", e: "One litre of motor oil can contaminate one million litres of drinking water. Always take it to a hazardous waste site." },
        { q: "Is less than 1% of Earth's total water available as fresh drinking water?", a: "YES", e: "97% is saltwater, and most freshwater is locked in glaciers. Only about 0.5% is accessible for humans." },
        { q: "Does eutrophication mean oceans getting warmer?", a: "NO", e: "Eutrophication is nutrient pollution causing algae blooms that deplete oxygen and suffocate aquatic life." },
        { q: "Is organic farming always better for biodiversity than conventional?", a: "NO", e: "Organic farming has complex trade-offs — it often uses more land per unit of food, which can reduce biodiversity overall." },
        { q: "Is composting meat and dairy at home always safe?", a: "NO", e: "Home composting meat attracts pests and creates odour. Industrial composting handles it safely at high temperatures." },
    ],
    "Cyber City Ruins": [
        { q: "Do LED bulbs use around 90% less energy than traditional incandescent bulbs?", a: "YES", e: "LEDs convert most electricity directly to light. Incandescents waste 90% as heat — basically a heater that glows." },
        { q: "Is electric rail the lowest-emission form of long-distance passenger transport?", a: "YES", e: "Electric trains running on clean grids produce less than 15g CO2 per passenger-km — far below cars or planes." },
        { q: "Do devices left on standby use meaningful electricity over a year?", a: "YES", e: "Standby power can account for up to 10% of household electricity use. Switching off saves real money and emissions." },
        { q: "Does planting trees in cities reduce local temperatures?", a: "YES", e: "Urban trees provide shade and evaporative cooling, reducing temperatures by 2–8°C in their immediate vicinity." },
        { q: "Do short-haul flights have a higher per-km carbon footprint than long-haul flights?", a: "YES", e: "Takeoff and landing burn the most fuel. A 1-hour flight produces almost as much CO2 per seat as a 3-hour one." },
        { q: "Is cycling to work always a zero-emission form of transport?", a: "YES", e: "Cycling produces no direct emissions — the only carbon cost is in manufacturing the bike and the extra food you eat." },
    ],
    "The Null Void": [
        { q: "Are scientists saying we are currently in a mass extinction event?", a: "YES", e: "The 6th mass extinction is underway, driven by habitat loss, pollution, and climate change — at 1,000× the natural rate." },
        { q: "Do peatlands store more carbon per hectare than tropical rainforests?", a: "YES", e: "Peatlands cover only 3% of land but store twice the carbon of all forests combined." },
        { q: "Is the Amazon rainforest still a net carbon absorber overall?", a: "NO", e: "Parts of the Amazon now emit more CO2 than they absorb due to deforestation and fires — a critical tipping point." },
        { q: "Can a single species going extinct trigger ecosystem collapse?", a: "YES", e: "Keystone species like wolves, bees, and sharks regulate entire ecosystems. Their loss causes cascading failures." },
        { q: "Did reintroducing wolves to Yellowstone change how rivers flow?", a: "YES", e: "Wolves changed deer grazing patterns, allowing riverbank vegetation to recover and reshape river courses — a trophic cascade." },
        { q: "Is more than 1 in 4 assessed species currently threatened with extinction?", a: "YES", e: "The IUCN Red List shows over 44,000 of the 147,500 assessed species are threatened with extinction." },
    ],
    "Cloud Data Center": [
        { q: "Does the Paris Agreement aim to limit warming to 1.5°C above pre-industrial levels?", a: "YES", e: "The 2015 Paris Agreement set 1.5°C as the aspirational limit, with 2°C as the harder backstop." },
        { q: "Is greenwashing currently illegal in all countries?", a: "NO", e: "Greenwashing regulations vary widely. The EU is introducing stricter rules, but enforcement remains inconsistent globally." },
        { q: "Can solar panels generate electricity on a cloudy day?", a: "YES", e: "Solar panels work on diffuse light, not just direct sunlight — output drops 10–25% on cloudy days, but they still produce power." },
        { q: "Is the ozone layer fully recovered from CFC damage?", a: "NO", e: "The ozone layer is recovering but won't fully heal until around 2066 — the Montreal Protocol was a huge success, but it takes time." },
        { q: "Does cloud computing always reduce a company's carbon footprint?", a: "NO", e: "Cloud efficiency depends entirely on the data center's energy source. Coal-powered clouds can be worse than local servers." },
        { q: "Do airlines currently offset all their carbon emissions through voluntary schemes?", a: "NO", e: "Voluntary offsets cover only a fraction of aviation emissions, and many offset projects have been found ineffective." },
    ],
    "Digital Hell": [
        { q: "Is methane more potent than CO2 as a greenhouse gas over 20 years?", a: "YES", e: "Methane is over 80× more potent than CO2 over a 20-year period, making livestock and landfill methane critical targets." },
        { q: "Does beef production produce more CO2 per kg than chicken?", a: "YES", e: "Beef produces about 60kg CO2e per kg of food; chicken is around 6kg. Switching to chicken cuts footprint by 10×." },
        { q: "Can nuclear power be considered a genuinely low-carbon energy source?", a: "YES", e: "Nuclear produces about 12g CO2 per kWh over its lifecycle — comparable to wind and solar, far below gas or coal." },
        { q: "Is air travel the single biggest contributor to most people's personal carbon footprint?", a: "NO", e: "Diet and home energy use are typically larger. One transatlantic flight is roughly equivalent to months of plant-based eating." },
        { q: "Does the fashion industry produce more CO2 than aviation and shipping combined?", a: "YES", e: "Fashion accounts for roughly 10% of global carbon emissions — more than international flights and maritime shipping together." },
        { q: "Has any country run on 100% renewable electricity for extended periods?", a: "YES", e: "Iceland runs almost entirely on geothermal and hydro; Costa Rica has hit 100% renewable electricity for months at a time." },
    ],
};

// Global fallback pool
const YES_NO_FALLBACK: YesNoTemplate[] = [
    { q: "Do trees absorb CO2 from the atmosphere?", a: "YES", e: "Trees absorb CO2 through photosynthesis, storing carbon in their wood, roots, and surrounding soil." },
    { q: "Is recycling aluminium more efficient than making it from raw ore?", a: "YES", e: "Recycling aluminium uses 95% less energy than smelting it from bauxite ore." },
    { q: "Does composting food waste reduce methane emissions from landfills?", a: "YES", e: "Food in landfills produces methane as it decomposes without oxygen. Composting prevents this." },
    { q: "Is the Great Pacific Garbage Patch visible from space?", a: "NO", e: "It is mostly microplastics suspended in water — not a visible island. Satellites can only detect it with sensors." },
    { q: "Does meat production use more water per kg than vegetable farming?", a: "YES", e: "1kg of beef requires about 15,000 litres of water. 1kg of wheat needs around 1,500 litres." },
    { q: "Can solar panels generate power at night?", a: "NO", e: "Solar panels require light photons to generate electricity. Batteries store daytime energy for overnight use." },
    { q: "Is tap water generally more eco-friendly than bottled water?", a: "YES", e: "Tap water has a carbon footprint up to 300× lower than bottled water once you account for plastic production and transport." },
    { q: "Are coral reefs threatened by ocean warming?", a: "YES", e: "Coral bleaching occurs when water warms just 1–2°C above normal. About 50% of the world's corals have already been lost." },
    { q: "Does switching to a plant-based diet reduce your carbon footprint?", a: "YES", e: "Food accounts for roughly 25% of global emissions. A vegan diet can cut your food footprint by up to 73%." },
    { q: "Can you recycle a plastic straw in standard household recycling?", a: "NO", e: "Straws are too small for most sorting machines and contaminate other recyclables. They usually end up in landfill." },
    { q: "Does deforestation contribute to climate change?", a: "YES", e: "Forests store vast amounts of carbon. Cutting them releases CO2 and removes a future carbon sink — a double blow." },
    { q: "Is wind energy now more expensive than coal energy in most markets?", a: "NO", e: "Wind power is now cheaper than new coal in most of the world, and often cheaper than running existing coal plants." },
    { q: "Can a single tree absorb roughly 1 tonne of CO2 over its lifetime?", a: "YES", e: "A mature tree absorbs around 22kg of CO2 per year. Over 50+ years that adds up to over a tonne of carbon stored." },
    { q: "Is household food waste a significant source of greenhouse gas emissions?", a: "YES", e: "If food waste were a country, it would be the world's third-largest emitter of greenhouse gases." },
    { q: "Does taking a shower always use less water than a bath?", a: "NO", e: "A short shower (under 5 min) beats a bath, but a 20-minute power shower uses far more water than a typical bath." },
];

// --- YES/NO SELECTION HELPER ---

function selectYesNoQuestion(
    stageName: string,
    excludedQuestions: string[] = []
): AiStageConfig['quiz'] {
    const stagePool = YES_NO_POOLS[stageName] ?? [];
    const combinedPool = [...stagePool, ...YES_NO_FALLBACK];

    const excluded = new Set(excludedQuestions);
    const unusedPool = combinedPool.filter(t => !excluded.has(t.q));
    const finalPool = unusedPool.length > 0 ? unusedPool : combinedPool;

    const template = finalPool[Math.floor(Math.random() * finalPool.length)];

    // A = YES portal (green), B = NO portal (red)
    const correctOption = template.a === 'YES' ? 'A' : 'B';

    return {
        question: template.q,
        options: { A: 'YES', B: 'NO' },
        correctOption,
        explanation: template.e,
        impactValue: 100
    };
}

// --- DEATH MESSAGES ---

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

        // 3. GENERATE YES/NO QUESTION FROM STATIC POOL
        finalConfig.quiz = selectYesNoQuestion(finalConfig.stageName, askedQuestions);

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

        const quiz = selectYesNoQuestion(
            state.currentConfig.stageName,
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
