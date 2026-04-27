
import { create } from 'zustand';
import { PlayerStats, AiStageConfig, UpgradeOption, AdviceResult, QuizDifficulty, EnemyMobType } from '../types';
import { EVOLUTION_RECIPES } from '../constants';
import { ALL_ENEMY_TYPES, STAGE_ENEMY_POOLS } from '../components/game/enemyDrawing';
import { ASSET_PATHS } from '../assets';

interface AiDirectorState {
    currentConfig: AiStageConfig | null;
    gameOverMessage: string | null;
    isGenerating: boolean;
    error: string | null;
    usedQuizQuestions: string[];
    resetQuizHistory: () => void;
    generateNextStage: (stats: PlayerStats, currentStage: number, lastResult?: string, quizSeedKey?: string | null) => Promise<void>;
    generateMidStageQuiz: (stage: number, availableOptions: string[], difficulty: QuizDifficulty, quizSeedKey?: string | null) => Promise<void>;
    generateUpgradeAdvice: (stats: PlayerStats, options: UpgradeOption[]) => Promise<AdviceResult>;
    generateDeathMessage: (stats: PlayerStats, stage: number, killer: string) => Promise<void>;
}

// --- STATIC ASSETS ---

const VALID_MOBS: EnemyMobType[] = [...ALL_ENEMY_TYPES];

const VALID_LANDMARKS = [
    'FOREST', 'SKULL', 'ICE', 'VOLCANO', 'PYRAMID', 'MUSHROOM', 'CYBER', 'VOID', 'SKY', 'HELL'
];

const VALID_PROPS = [
    'TREE', 'STONE', 'MUSHROOM', 'GRAVE', 'RUIN', 'CRYSTAL', 'SNOW_TREE', 'MAGMA_ROCK', 'LAVA_PILLAR',
    'CACTUS', 'PALM', 'SWAMP_TREE', 'VINE', 'SERVER', 'NEON_SIGN', 'VOID_ROCK', 'STAR_PILLAR',
    'CLOUD_PILLAR', 'GOLD_GATE', 'SPIKE_ROCK', 'TREE_STUMP', 'PLASTIC_BAG_SHRUB', 'BOTTLE_PILE',
    'BATTERY_GRAVE', 'CABLE_ROOTS', 'FROZEN_SERVER', 'ICE_SHARD', 'OIL_DRUM', 'EMBER_VENT',
    'GLASS_DUNE', 'SILICON_SPIRE', 'TOXIC_BARREL', 'SLUDGE_POOL', 'CABLE_POST', 'TRASH_CAN',
    'BILLBOARD_RUIN', 'NULL_CRYSTAL', 'STATIC_RIFT', 'SKY_SERVER', 'SATELLITE_DISH',
    'HELL_OBELISK', 'BURNED_SERVER'
];

// --- YES/NO QUESTION POOL ---

interface YesNoTemplate {
    q: string;          // question text
    a: 'YES' | 'NO';   // correct answer
    e: string;          // explanation shown after answering
}

const YES_NO_POOLS: Record<string, YesNoTemplate[]> = {
    "The Plastic Woods": [
        { q: "Does using a paper straw meaningfully reduce global CO2 emissions?", a: "NO", e: "You saved a turtle… emotionally. Real emissions come from energy and industry, not your iced latte." },
        { q: "Is most plastic packaging actually recycled?", a: "NO", e: "About 9% gets recycled. The rest is on a long vacation in landfills or oceans." },
        { q: "Can plastic fully biodegrade in nature within a few years?", a: "NO", e: "It doesn't disappear — it just breaks into microplastics and joins the food chain." },
        { q: "Is glass always more eco-friendly than plastic?", a: "NO", e: "Glass is heavier, so transport emissions can actually be higher. Plot twist." },
        { q: "Does recycling plastic guarantee it becomes a new product?", a: "NO", e: "Sometimes yes, often no. Recycling is more like a suggestion than a promise." },
        { q: "Is single-use plastic the biggest driver of climate change?", a: "NO", e: "Bad? Yes. Biggest? No. Energy sector is the final boss." },
        { q: "Do reusable bags always have lower environmental impact?", a: "NO", e: "You need to use them MANY times to break even. That tote better be your personality." },
        { q: "Can sunlight make plastic environmentally harmless?", a: "NO", e: "UV just breaks it into tiny toxic pieces. Congrats, now it's invisible AND worse." },
        { q: "Is burning plastic waste environmentally safe?", a: "NO", e: "Burning plastic releases toxic gases and CO2. That's not a solution, that's a boss summon." },
        { q: "Do microplastics end up in human bodies?", a: "YES", e: "They've been found in blood, lungs, and even placentas. Surprise upgrade: plastic edition." },
        { q: "Does producing plastic release greenhouse gases?", a: "YES", e: "From oil extraction to manufacturing, plastic is basically fossil fuel cosplay." },
        { q: "Is aluminum more energy-intensive to produce than plastic?", a: "YES", e: "But recycling aluminum saves ~95% of that energy. Big redemption arc." },
        { q: "Can plastic be recycled infinitely without quality loss?", a: "NO", e: "Plastic degrades every cycle. It's more like downcycling than recycling." },
        { q: "Is biodegradable plastic always eco-friendly?", a: "NO", e: "Many need industrial composting. In nature, they just… exist longer." },
        { q: "Does plastic pollution affect marine life?", a: "YES", e: "Animals eat it, get trapped in it, or both. It's basically a global trap mechanic." },
        { q: "Can reducing plastic use lower environmental impact?", a: "YES", e: "Less demand = less production = less emissions. Simple but effective." },
        { q: "Is plastic production expected to increase globally?", a: "YES", e: "Unless we change systems, it's projected to keep growing. More plastic DLC incoming." },
        { q: "Does plastic break down into harmless natural materials?", a: "NO", e: "It just becomes smaller plastic. Same villain, smaller form." },
        { q: "Can recycling alone solve plastic pollution?", a: "NO", e: "We need reduction + redesign. Recycling alone is like using a bandage on a boss fight." },
        { q: "Is avoiding unnecessary packaging an effective strategy?", a: "YES", e: "Best waste is the one never created. Zero spawn = zero problem." },
    ],
    "E-Waste Graveyard": [
        { q: "Does a smartphone contain valuable metals like gold?", a: "YES", e: "Tiny treasure chest in your pocket. Urban mining is real." },
        { q: "Is most e-waste properly recycled worldwide?", a: "NO", e: "Only ~17%. The rest goes on a mysterious journey." },
        { q: "Does upgrading your phone every year help the environment?", a: "NO", e: "Your phone isn't expired milk. It still works." },
        { q: "Can batteries leak toxic chemicals in landfills?", a: "YES", e: "Battery acid is not exactly eco-friendly juice." },
        { q: "Is e-waste the fastest growing waste stream?", a: "YES", e: "Tech addiction has consequences." },
        { q: "Can recycling electronics recover rare materials?", a: "YES", e: "Phones are basically mini mines." },
        { q: "Is throwing electronics in regular trash safe?", a: "NO", e: "Congrats, you just spawned toxic pollution." },
        { q: "Does manufacturing electronics create emissions?", a: "YES", e: "Most emissions happen before you even turn it on." },
        { q: "Is repairing devices better than replacing them?", a: "YES", e: "Repair = eco critical hit." },
        { q: "Do old electronics still consume energy when plugged in?", a: "YES", e: "Idle mode is still eating XP." },
        { q: "Is mining rare earth metals environmentally harmless?", a: "NO", e: "Mining is messy business." },
        { q: "Can extending device lifespan reduce emissions?", a: "YES", e: "Longer use = less production = win." },
        { q: "Are refurbished electronics eco-friendly?", a: "YES", e: "Second life = second chance." },
        { q: "Is all e-waste exported safely to other countries?", a: "NO", e: "Sometimes it's just dumped elsewhere." },
        { q: "Do data cables and chargers contain recyclable materials?", a: "YES", e: "Copper and metals still have value." },
        { q: "Is software slowing devices part of waste problems?", a: "YES", e: "Planned obsolescence strikes again." },
        { q: "Can recycling electronics reduce need for mining?", a: "YES", e: "Less digging, more recovering." },
        { q: "Is buying fewer electronics environmentally beneficial?", a: "YES", e: "Less demand = less production." },
        { q: "Do screens contain hazardous materials?", a: "YES", e: "Not something you want in soil." },
        { q: "Is e-waste harmless if stored at home?", a: "NO", e: "Clutter + hidden toxins = bad combo." },
    ],
    "Frozen Server Farm": [
        { q: "Does streaming video produce zero emissions?", a: "NO", e: "Your binge session runs on data centers. The cloud is just someone else's electricity bill." },
        { q: "Do data centers consume electricity?", a: "YES", e: "Yes — a lot. Your memes are powered by servers somewhere." },
        { q: "Is renewable energy a major solution to climate change?", a: "YES", e: "This is the main quest, not a side mission." },
        { q: "Are electric cars completely zero-emission?", a: "NO", e: "Cleaner, yes. Zero? Only if powered by pure sunlight and optimism." },
        { q: "Does turning off lights significantly reduce global emissions?", a: "NO", e: "Good habit, but not the final boss damage." },
        { q: "Are LEDs more efficient than traditional bulbs?", a: "YES", e: "Finally, a real upgrade. LEDs carry hard." },
        { q: "Does standby power consume electricity?", a: "YES", e: "Your devices are quietly sipping power like it's happy hour." },
        { q: "Can solar panels generate power on cloudy days?", a: "YES", e: "Less efficient, but still working. Solar doesn't quit that easily." },
        { q: "Is nuclear energy low-carbon?", a: "YES", e: "Low carbon, high debate. Still one of the cleanest options." },
        { q: "Does internet usage have a carbon footprint?", a: "YES", e: "Every scroll, every video, every meme = energy used." },
        { q: "Do heat pumps use less energy than traditional heating?", a: "YES", e: "They move heat instead of generating it. Big efficiency hack." },
        { q: "Is flying a major contributor to personal emissions?", a: "YES", e: "That vacation hits harder than your daily habits." },
        { q: "Is electricity always clean energy?", a: "NO", e: "Depends on the source. Coal-powered electricity is not your friend." },
        { q: "Can improving insulation reduce energy use?", a: "YES", e: "Your house leaking heat = passive XP loss." },
        { q: "Do electric devices become greener as the grid improves?", a: "YES", e: "Cleaner grid = stronger eco build." },
        { q: "Does 4K streaming use more energy than standard definition?", a: "YES", e: "Higher quality = more data = more energy. Your eyes win, planet loses a bit." },
        { q: "Is AI computing energy-free?", a: "NO", e: "Those models run on serious hardware. Intelligence isn't cheap." },
        { q: "Can wind turbines work in cold climates?", a: "YES", e: "They are built for it. Snow is not a debuff." },
        { q: "Does lowering your thermostat reduce emissions?", a: "YES", e: "Small change, real impact. Cozy but efficient." },
        { q: "Is energy efficiency one of the fastest ways to reduce emissions?", a: "YES", e: "Efficiency = instant upgrade without new tech." },
    ],
    "Magma Refinery": [
        { q: "Does burning coal release CO2?", a: "YES", e: "Big time. Coal is final boss fuel." },
        { q: "Is oil a renewable resource?", a: "NO", e: "Takes millions of years. Not exactly fast recharge." },
        { q: "Does natural gas emit less CO2 than coal?", a: "YES", e: "Less, but still not clean." },
        { q: "Is cement production a major emission source?", a: "YES", e: "Around 8% globally. Surprise villain." },
        { q: "Can carbon capture remove emissions?", a: "YES", e: "It works… but expensive DLC." },
        { q: "Is fracking risk-free?", a: "NO", e: "Groundwater and earthquakes say hi." },
        { q: "Do fossil fuels receive subsidies?", a: "YES", e: "Massive ones. Plot twist." },
        { q: "Does oil extraction damage ecosystems?", a: "YES", e: "Spills are not aesthetic." },
        { q: "Is coal still widely used globally?", a: "YES", e: "Old boss still active." },
        { q: "Can switching energy sources reduce emissions?", a: "YES", e: "Huge impact lever." },
        { q: "Does refining oil require energy?", a: "YES", e: "Energy to make energy. Efficient? Not really." },
        { q: "Is methane leakage a concern in gas systems?", a: "YES", e: "Methane is a strong greenhouse gas." },
        { q: "Can renewable energy replace fossil fuels over time?", a: "YES", e: "Endgame strategy unlocked." },
        { q: "Is fossil fuel demand decreasing globally?", a: "NO", e: "Still rising in many areas." },
        { q: "Does drilling impact local wildlife?", a: "YES", e: "Habitat disruption = ecosystem damage." },
        { q: "Is oil transport risk-free?", a: "NO", e: "Spills happen. A lot." },
        { q: "Does burning gas produce CO2?", a: "YES", e: "Cleaner than coal, still emissions." },
        { q: "Is fossil fuel energy carbon neutral?", a: "NO", e: "Very much not." },
        { q: "Can energy efficiency reduce fossil fuel use?", a: "YES", e: "Less demand = less burning." },
        { q: "Is decarbonization easy?", a: "NO", e: "This is a long boss fight." },
    ],
    "Silicon Dunes": [
        { q: "Does manufacturing tech produce emissions?", a: "YES", e: "Most emissions happen before first use." },
        { q: "Is glass infinitely recyclable?", a: "YES", e: "Glass has unlimited respawns." },
        { q: "Does recycling aluminum save energy?", a: "YES", e: "Up to 95% energy saved. Huge win." },
        { q: "Can all plastics be recycled easily?", a: "NO", e: "Only a few types actually are." },
        { q: "Is bamboo a fast renewable resource?", a: "YES", e: "It grows like it's speedrunning life." },
        { q: "Is planned obsolescence real?", a: "YES", e: "Designing things to fail = profit strategy." },
        { q: "Does mining materials impact the environment?", a: "YES", e: "Digging has consequences." },
        { q: "Is producing silicon chips energy intensive?", a: "YES", e: "Clean rooms, big power usage." },
        { q: "Can recycling reduce raw material extraction?", a: "YES", e: "Less mining = better." },
        { q: "Is electronic production low-carbon?", a: "NO", e: "Far from it." },
        { q: "Does packaging add to product emissions?", a: "YES", e: "Everything adds up." },
        { q: "Is reducing consumption effective?", a: "YES", e: "Best strategy: buy less." },
        { q: "Can materials be reused multiple times?", a: "YES", e: "Reuse = efficiency." },
        { q: "Is plastic packaging always necessary?", a: "NO", e: "Often it's just convenience." },
        { q: "Does shipping products emit CO2?", a: "YES", e: "Transport = emissions." },
        { q: "Is digital goods emission-free?", a: "NO", e: "Servers say otherwise." },
        { q: "Does product lifespan matter?", a: "YES", e: "Longer life = less production." },
        { q: "Can circular economy reduce waste?", a: "YES", e: "Reuse + recycle = system win." },
        { q: "Is waste inevitable?", a: "NO", e: "Design can reduce it." },
        { q: "Does efficiency reduce environmental impact?", a: "YES", e: "Efficiency = free upgrade." },
    ],
    "Toxic Swamp": [
        { q: "Does agriculture use most freshwater globally?", a: "YES", e: "About 70%. Big water spender." },
        { q: "Can motor oil contaminate water?", a: "YES", e: "A little goes a long way… in a bad way." },
        { q: "Is most water on Earth drinkable?", a: "NO", e: "Almost all is saltwater." },
        { q: "Does eutrophication harm aquatic life?", a: "YES", e: "Algae bloom = oxygen loss." },
        { q: "Is dumping chemicals into drains safe?", a: "NO", e: "Please don't." },
        { q: "Can pollution affect groundwater?", a: "YES", e: "Out of sight ≠ safe." },
        { q: "Is organic farming always better?", a: "NO", e: "Trade-offs exist." },
        { q: "Does fertilizer runoff harm ecosystems?", a: "YES", e: "It fuels algae blooms." },
        { q: "Can composting reduce waste?", a: "YES", e: "Food → soil. Circle of life." },
        { q: "Is water scarcity a global issue?", a: "YES", e: "Very real problem." },
        { q: "Does pollution affect human health?", a: "YES", e: "Air, water, soil — all connected." },
        { q: "Is freshwater unlimited?", a: "NO", e: "Limited resource." },
        { q: "Can wetlands filter pollution?", a: "YES", e: "Nature's water treatment plant." },
        { q: "Is dumping waste in rivers safe?", a: "NO", e: "That’s how you lose the game." },
        { q: "Does climate change affect water cycles?", a: "YES", e: "More extremes." },
        { q: "Can soil contamination persist long-term?", a: "YES", e: "Years or decades." },
        { q: "Is pollution reversible instantly?", a: "NO", e: "Cleanup takes time." },
        { q: "Does plastic end up in water systems?", a: "YES", e: "Eventually, yes." },
        { q: "Is water conservation important?", a: "YES", e: "Every drop counts." },
        { q: "Can ecosystems recover from pollution?", a: "YES", e: "But only with time and help." },
    ],
    "Cyber City Ruins": [
        { q: "Do LEDs use less energy than incandescent bulbs?", a: "YES", e: "Huge efficiency upgrade." },
        { q: "Is public transport lower emission than cars?", a: "YES", e: "Shared ride = less impact." },
        { q: "Does standby power add up?", a: "YES", e: "Silent energy drain." },
        { q: "Can urban trees cool cities?", a: "YES", e: "Nature AC system." },
        { q: "Are short flights less efficient per km?", a: "YES", e: "Takeoff burns the most fuel." },
        { q: "Is cycling zero-emission transport?", a: "YES", e: "Human-powered OP." },
        { q: "Does urbanization increase emissions?", a: "YES", e: "Depends on design." },
        { q: "Can smart cities reduce emissions?", a: "YES", e: "Better systems, less waste." },
        { q: "Is traffic congestion inefficient?", a: "YES", e: "Idle engines = wasted fuel." },
        { q: "Does infrastructure design matter?", a: "YES", e: "Design shapes behavior." },
        { q: "Is walking eco-friendly?", a: "YES", e: "Hard to beat zero fuel." },
        { q: "Can city planning reduce emissions?", a: "YES", e: "Better layout = less travel." },
        { q: "Does carpooling reduce emissions?", a: "YES", e: "More people, less cars." },
        { q: "Is urban sprawl efficient?", a: "NO", e: "More distance = more emissions." },
        { q: "Does bike infrastructure help?", a: "YES", e: "Encourages low-carbon transport." },
        { q: "Can electric buses reduce pollution?", a: "YES", e: "Cleaner transit option." },
        { q: "Is transport a major emission source?", a: "YES", e: "One of the big sectors." },
        { q: "Does city density reduce emissions?", a: "YES", e: "Closer = less travel." },
        { q: "Is parking demand environmentally neutral?", a: "NO", e: "Encourages car use." },
        { q: "Can green spaces improve urban environments?", a: "YES", e: "Health + cooling benefits." },
    ],
    "The Null Void": [
        { q: "Are we in a mass extinction event?", a: "YES", e: "6th extinction is happening now." },
        { q: "Do peatlands store large amounts of carbon?", a: "YES", e: "More than forests per area." },
        { q: "Is the Amazon still a net absorber?", a: "NO", e: "Some areas emit more than absorb." },
        { q: "Can one species affect ecosystems?", a: "YES", e: "Keystone species matter." },
        { q: "Did wolves change Yellowstone ecosystems?", a: "YES", e: "Trophic cascade in action." },
        { q: "Are many species threatened?", a: "YES", e: "Over 25% at risk." },
        { q: "Does biodiversity matter?", a: "YES", e: "System stability depends on it." },
        { q: "Is extinction reversible?", a: "NO", e: "Once gone, it's gone." },
        { q: "Can ecosystems collapse?", a: "YES", e: "Chain reactions happen." },
        { q: "Does habitat loss drive extinction?", a: "YES", e: "Major factor." },
        { q: "Is biodiversity loss a global issue?", a: "YES", e: "Worldwide problem." },
        { q: "Can conservation help?", a: "YES", e: "Recovery is possible." },
        { q: "Is climate change affecting ecosystems?", a: "YES", e: "Big impact." },
        { q: "Do invasive species harm ecosystems?", a: "YES", e: "Disrupt balance." },
        { q: "Is extinction rate normal?", a: "NO", e: "Much higher than natural." },
        { q: "Can ecosystems recover naturally?", a: "YES", e: "Given time and protection." },
        { q: "Is biodiversity loss visible immediately?", a: "NO", e: "Often gradual." },
        { q: "Does deforestation impact climate?", a: "YES", e: "Less carbon absorption." },
        { q: "Are oceans affected by biodiversity loss?", a: "YES", e: "Coral reefs declining." },
        { q: "Is protecting ecosystems important?", a: "YES", e: "Critical for survival." },
    ],
    "Cloud Data Center": [
        { q: "Does cloud computing use energy?", a: "YES", e: "Servers don’t run on magic." },
        { q: "Is cloud always more efficient?", a: "NO", e: "Depends on energy source." },
        { q: "Can solar panels work in clouds?", a: "YES", e: "Less power, still works." },
        { q: "Is the ozone layer fully recovered?", a: "NO", e: "Still healing." },
        { q: "Does greenwashing exist?", a: "YES", e: "Marketing boss detected." },
        { q: "Is internet infrastructure carbon-free?", a: "NO", e: "Energy heavy system." },
        { q: "Can efficient servers reduce emissions?", a: "YES", e: "Better tech = less energy." },
        { q: "Is cloud storage infinite and free?", a: "NO", e: "Costs energy + hardware." },
        { q: "Does data transfer consume energy?", a: "YES", e: "Every byte counts." },
        { q: "Can renewable-powered servers reduce impact?", a: "YES", e: "Cleaner energy source." },
        { q: "Is deleting unused data helpful?", a: "YES", e: "Less storage demand." },
        { q: "Does AI computing require energy?", a: "YES", e: "Big hardware usage." },
        { q: "Is streaming high-res more energy intensive?", a: "YES", e: "More data = more energy." },
        { q: "Can efficient coding reduce energy use?", a: "YES", e: "Optimization matters." },
        { q: "Is cloud impact invisible?", a: "NO", e: "Just hidden, not gone." },
        { q: "Does server cooling consume energy?", a: "YES", e: "Cooling is expensive." },
        { q: "Is data duplication harmless?", a: "NO", e: "More storage = more energy." },
        { q: "Can server location affect emissions?", a: "YES", e: "Grid matters." },
        { q: "Is digital minimalism helpful?", a: "YES", e: "Less usage = less energy." },
        { q: "Does cloud growth increase emissions?", a: "YES", e: "Scaling has cost." },
    ],
    "Digital Hell": [
        { q: "Is methane more potent than CO2?", a: "YES", e: "80x stronger over 20 years." },
        { q: "Does beef produce more emissions than chicken?", a: "YES", e: "Huge difference." },
        { q: "Is nuclear low carbon?", a: "YES", e: "Comparable to renewables." },
        { q: "Is air travel biggest personal emission source?", a: "NO", e: "Depends on lifestyle." },
        { q: "Does fashion produce large emissions?", a: "YES", e: "About 10% globally." },
        { q: "Have countries run on renewable energy?", a: "YES", e: "Iceland, Costa Rica." },
        { q: "Can climate change be solved instantly?", a: "NO", e: "Long-term battle." },
        { q: "Is individual action enough?", a: "NO", e: "System problem." },
        { q: "Do corporations emit large amounts?", a: "YES", e: "Major contributors." },
        { q: "Is greenwashing harmful?", a: "YES", e: "Misleads progress." },
        { q: "Does climate education help?", a: "YES", e: "Knowledge = power." },
        { q: "Is climate change human-caused?", a: "YES", e: "Scientific consensus." },
        { q: "Can policy reduce emissions?", a: "YES", e: "Big lever." },
        { q: "Is denial slowing progress?", a: "YES", e: "Misinformation matters." },
        { q: "Can innovation help climate?", a: "YES", e: "Tech is key." },
        { q: "Is climate anxiety real?", a: "YES", e: "Many feel it." },
        { q: "Can global cooperation help?", a: "YES", e: "Essential." },
        { q: "Is progress happening?", a: "YES", e: "But not fast enough." },
        { q: "Is climate action urgent?", a: "YES", e: "Time matters." },
        { q: "Can we still make a difference?", a: "YES", e: "Game not over yet." },
    ],
};


// --- YES/NO SELECTION HELPER ---

const QUIZ_AUDIO_STAGE_SLUGS: Record<string, string> = {
    "The Plastic Woods": "plastic_woods",
    "E-Waste Graveyard": "e_waste_graveyard",
    "Frozen Server Farm": "frozen_server_farm",
    "Magma Refinery": "magma_refinery",
    "Silicon Dunes": "silicon_dunes",
    "Toxic Swamp": "toxic_swamp",
    "Cyber City Ruins": "cyber_city_ruins",
    "The Null Void": "null_void",
    "Cloud Data Center": "cloud_data_center",
    "Digital Hell": "digital_hell",
};

const QUIZ_IMAGE_STAGE_SLUGS = new Set([
    'plastic_woods',
    'e_waste_graveyard',
    'frozen_server_farm',
    'magma_refinery',
    'silicon_dunes',
]);

const buildYesNoQuiz = (
    stageName: string,
    stagePool: YesNoTemplate[],
    template: YesNoTemplate,
): AiStageConfig['quiz'] => {
    const correctOption = template.a === 'YES' ? 'A' : 'B';
    const questionIndex = stagePool.findIndex(item => item.q === template.q);
    const questionNumber = Math.max(1, questionIndex + 1);
    const audioSlug = QUIZ_AUDIO_STAGE_SLUGS[stageName];
    const audioId = audioSlug ? `${audioSlug}_${String(questionNumber).padStart(2, '0')}` : undefined;
    const explanationImageSrc = audioSlug && QUIZ_IMAGE_STAGE_SLUGS.has(audioSlug)
        ? ASSET_PATHS.images.quiz.explanation(audioSlug, questionNumber)
        : undefined;

    return {
        question: template.q,
        options: { A: 'YES', B: 'NO' },
        correctOption,
        explanation: template.e,
        impactValue: 100,
        explanationImageSrc,
        audioId,
        audioQuestionSrc: audioSlug ? ASSET_PATHS.audio.quiz.question(audioSlug, questionNumber) : undefined,
        audioExplanationSrc: audioSlug ? ASSET_PATHS.audio.quiz.explanation(audioSlug, questionNumber) : undefined,
    };
};

function selectYesNoQuestion(
    stageName: string,
    excludedQuestions: string[] = []
): AiStageConfig['quiz'] {
    const stagePool = YES_NO_POOLS[stageName] ?? [];
    if (stagePool.length === 0) {
        throw new Error(`No YES/NO question pool configured for stage "${stageName}".`);
    }

    const excluded = new Set(excludedQuestions);
    const unusedPool = stagePool.filter(t => !excluded.has(t.q));
    const finalPool = unusedPool.length > 0 ? unusedPool : stagePool;

    const template = finalPool[Math.floor(Math.random() * finalPool.length)];

    return buildYesNoQuiz(stageName, stagePool, template);
}

const stableHash = (input: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

function selectYesNoQuestionDeterministic(
    stageName: string,
    seedKey: string,
    excludedQuestions: string[] = []
): AiStageConfig['quiz'] {
    const stagePool = YES_NO_POOLS[stageName] ?? [];
    if (stagePool.length === 0) {
        throw new Error(`No YES/NO question pool configured for stage "${stageName}".`);
    }

    const excluded = new Set(excludedQuestions);
    const start = stableHash(`${stageName}:${seedKey}`) % stagePool.length;

    let template = stagePool[start];
    for (let i = 0; i < stagePool.length; i++) {
        const candidate = stagePool[(start + i) % stagePool.length];
        if (!excluded.has(candidate.q)) {
            template = candidate;
            break;
        }
    }

    return buildYesNoQuiz(stageName, stagePool, template);
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
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[0]], speedMultiplier: 1.0, hpMultiplier: 1.0, densityMultiplier: 1.0 },
        boss: { name: "PLASTIC GOLIATH", introductionLine: "CONSUME... WASTE...", visualVariant: "FOREST", patternDifficulty: 1, narrative: "A massive amalgamation of toxic sludge and plastic waste rises from the depths." },
        quiz: {} as any
    },
    {
        stageName: "E-Waste Graveyard",
        narrativeIntro: "The spirits of the old world are restless, disturbed by mountains of discarded electronics.",
        theme: { groundColor: "#334155", checkColor: "#475569", decoColor: "#94a3b8", borderColor: "#1e293b", propType: "GRAVE", landmarkType: "SKULL" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[1]], speedMultiplier: 1.1, hpMultiplier: 1.2, densityMultiplier: 1.1 },
        boss: { name: "CIRCUIT LICH", introductionLine: "SILENCE... ETERNAL...", visualVariant: "CRYPT", patternDifficulty: 2, narrative: "An ancient guardian corrupted by heavy metals and leaking batteries." },
        quiz: {} as any
    },
    {
        stageName: "Frozen Server Farm",
        narrativeIntro: "The cooling systems have failed. This frozen wasteland preserves data of a forgotten era.",
        theme: { groundColor: "#e0f2fe", checkColor: "#bae6fd", decoColor: "#7dd3fc", borderColor: "#0284c7", propType: "CRYSTAL", landmarkType: "ICE" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[2]], speedMultiplier: 0.9, hpMultiplier: 1.5, densityMultiplier: 0.9 },
        boss: { name: "FROSTBYTE GOLEM", introductionLine: "SYSTEM... FREEZE...", visualVariant: "ICE", patternDifficulty: 2, narrative: "A cooling unit gone rogue, encasing everything in eternal permafrost." },
        quiz: {} as any
    },
    {
        stageName: "Magma Refinery",
        narrativeIntro: "The earth bleeds here. Industrial extraction has torn open the planet's crust.",
        theme: { groundColor: "#450a0a", checkColor: "#7f1d1d", decoColor: "#ef4444", borderColor: "#991b1b", propType: "MAGMA_ROCK", landmarkType: "VOLCANO" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[3]], speedMultiplier: 1.3, hpMultiplier: 1.4, densityMultiplier: 1.2 },
        boss: { name: "SLAG COLOSSUS", introductionLine: "BURN... IT... ALL...", visualVariant: "MAGMA", patternDifficulty: 3, narrative: "Born from the heat of unchecked industrial furnaces." },
        quiz: {} as any
    },
    {
        stageName: "Silicon Dunes",
        narrativeIntro: "A desert of crushed glass and silicon. Nothing grows here but the machines.",
        theme: { groundColor: "#fcd34d", checkColor: "#fbbf24", decoColor: "#d97706", borderColor: "#78350f", propType: "CACTUS", landmarkType: "PYRAMID" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[4]], speedMultiplier: 1.0, hpMultiplier: 1.4, densityMultiplier: 1.2 },
        boss: { name: "SILICON DUNE WORM", introductionLine: "RETURN... TO... DUST...", visualVariant: "CRYPT", patternDifficulty: 3, narrative: "A ruler of a barren kingdom, commanding the sands of time and waste." },
        quiz: {} as any
    },
    {
        stageName: "Toxic Swamp",
        narrativeIntro: "Chemical runoff has mutated the flora. The air is thick with poison.",
        theme: { groundColor: "#3f6212", checkColor: "#4d7c0f", decoColor: "#84cc16", borderColor: "#1a2e05", propType: "MUSHROOM", landmarkType: "MUSHROOM" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[5]], speedMultiplier: 1.1, hpMultiplier: 1.6, densityMultiplier: 1.3 },
        boss: { name: "TOXIC ALCHEMIST", introductionLine: "DISSOLVE...", visualVariant: "FOREST", patternDifficulty: 4, narrative: "A living bog of chemical sludge that devours all life." },
        quiz: {} as any
    },
    {
        stageName: "Cyber City Ruins",
        narrativeIntro: "The lights are on, but no one is home. Automation continues without purpose.",
        theme: { groundColor: "#020617", checkColor: "#0f172a", decoColor: "#3b82f6", borderColor: "#1e293b", propType: "NEON_SIGN", landmarkType: "CYBER" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[6]], speedMultiplier: 1.4, hpMultiplier: 1.5, densityMultiplier: 1.4 },
        boss: { name: "MAINFRAME OVERLORD", introductionLine: "OPTIMIZING... DESTRUCTION...", visualVariant: "MECH", patternDifficulty: 5, narrative: "The central processor for a city that consumed itself." },
        quiz: {} as any
    },
    {
        stageName: "The Null Void",
        narrativeIntro: "Reality thins here. The consequences of ignoring the balance have torn the fabric of space.",
        theme: { groundColor: "#2e1065", checkColor: "#3b0764", decoColor: "#7c3aed", borderColor: "#000000", propType: "VOID_ROCK", landmarkType: "VOID" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[7]], speedMultiplier: 1.5, hpMultiplier: 1.2, densityMultiplier: 1.5 },
        boss: { name: "DATA WRAITH", introductionLine: "NOTHING... REMAINS...", visualVariant: "VOID", patternDifficulty: 5, narrative: "An entity from beyond, drawn to the emptiness left by consumption." },
        quiz: {} as any
    },
    {
        stageName: "Cloud Data Center",
        narrativeIntro: "High above the smog, the servers hum. Information flows, but wisdom is lost.",
        theme: { groundColor: "#bae6fd", checkColor: "#7dd3fc", decoColor: "#ffffff", borderColor: "#0ea5e9", propType: "SERVER", landmarkType: "SKY" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[8]], speedMultiplier: 1.6, hpMultiplier: 1.1, densityMultiplier: 1.3 },
        boss: { name: "SMOG DRAGON", introductionLine: "ACCESS... DENIED...", visualVariant: "MECH", patternDifficulty: 6, narrative: "The automated defense system of the atmospheric processors." },
        quiz: {} as any
    },
    {
        stageName: "Digital Hell",
        narrativeIntro: "The final layer. Where corrupted data and corrupted souls burn together.",
        theme: { groundColor: "#450a0a", checkColor: "#7f1d1d", decoColor: "#ef4444", borderColor: "#000000", propType: "LAVA_PILLAR", landmarkType: "HELL" },
        enemies: { spawnPool: [...STAGE_ENEMY_POOLS[9]], speedMultiplier: 1.5, hpMultiplier: 2.0, densityMultiplier: 1.5 },
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

    generateNextStage: async (stats, currentStage, lastResult, quizSeedKey) => {
        set({ isGenerating: true, error: null });
        const targetStage = currentStage + 1;
        // 1. SELECT FIXED STAGE
        const stageTemplate = FIXED_STAGES[targetStage - 1];
        if (!stageTemplate) {
            set({
                currentConfig: null,
                isGenerating: false,
                error: 'No further stages are configured.',
            });
            return;
        }
        let finalConfig = JSON.parse(JSON.stringify(stageTemplate));

        // 2. GENERATE YES/NO QUESTION
        // Solo runs should feel fresh. Multiplayer passes a shared group seed so
        // every client gets the same random-looking quiz without using local history.
        finalConfig.quiz = quizSeedKey
            ? selectYesNoQuestionDeterministic(finalConfig.stageName, quizSeedKey, [])
            : selectYesNoQuestion(finalConfig.stageName, get().usedQuizQuestions);

        set({
            currentConfig: finalConfig,
            isGenerating: false,
            usedQuizQuestions: [...new Set([...get().usedQuizQuestions, finalConfig.quiz.question])],
        });
    },

    generateMidStageQuiz: async (stage, availableOptions, difficulty, quizSeedKey) => {
        const state = get();
        if (!state.currentConfig) return;

        set({ isGenerating: true });

        const currentQuestion = state.currentConfig.quiz?.question;
        const syncedExclusions = currentQuestion ? [currentQuestion] : [];
        const localExclusions = [...state.usedQuizQuestions, ...syncedExclusions];

        const quiz = quizSeedKey
            ? selectYesNoQuestionDeterministic(state.currentConfig.stageName, quizSeedKey, syncedExclusions)
            : selectYesNoQuestion(state.currentConfig.stageName, localExclusions);

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
