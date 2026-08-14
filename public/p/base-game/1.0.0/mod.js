// Built by tools/build-mod.js — do not edit.

let __coreModules = null;

function __coreOf(sdk) {
    if (__coreModules === null) {
        var __part = (function (exports, _sdk) {
        
            // Resource body types, extracted via the shared Extractor into an item.
            const RESOURCE_WATER = 300;
            const RESOURCE_GRAVEYARD = 301;
            const RESOURCE_OXIDE = 302;
            const RESOURCE_COAL = 303;
            const RESOURCE_QUARTZ = 304;
        
            // Item types, following the production chain.
            const ITEM_TYPE_WATER = 310;
            const ITEM_TYPE_SOUL = 311;
            const ITEM_TYPE_SOYBEAN_SEEDS = 312;
            const ITEM_TYPE_SOYBEAN = 313;
            const ITEM_TYPE_MUSHROOM_SPORE = 314;
            const ITEM_TYPE_MUSHROOM = 315;
            const ITEM_TYPE_NUTRIENT_SLOP = 316;
            const ITEM_TYPE_CREATURE = 317;
            const ITEM_TYPE_ADRENOCHROME = 318;
            const ITEM_TYPE_BASIC_POTION_BASE = 319;
            const ITEM_TYPE_OVERLOAD_MIX = 320;
            const ITEM_TYPE_IRON_ORE = 321;
            const ITEM_TYPE_COAL = 322;
            const ITEM_TYPE_COKE = 323;
            const ITEM_TYPE_OXYGEN = 325;
            const ITEM_TYPE_RAW_STEEL = 326;
            const ITEM_TYPE_STEEL_PARTS = 327;
            const ITEM_TYPE_SAND = 328;
            const ITEM_TYPE_GLASS = 329;
            const ITEM_TYPE_EMPTY_SYRINGE = 330;
            const ITEM_TYPE_STIMPACK = 331;
        
            // Fallback output for mis-fed machine inputs.
            const ITEM_TYPE_WASTE = 399;
        
            // Placeholder NPC prices for Trading Terminal seed items.
            const NPC_PRICE_SOYBEAN_SEEDS = 5;
            const NPC_PRICE_MUSHROOM_SPORE = 8;
        
            // Torment Chamber's Soul byproduct roll.
            const TORMENT_CHAMBER_SOUL_CHANCE = 0.5;
        
            // Workers the Blender consumes when road-connected to housing.
            const BLENDER_WORKER_COST = 2;
        
            var m1 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                BLENDER_WORKER_COST: BLENDER_WORKER_COST,
                ITEM_TYPE_ADRENOCHROME: ITEM_TYPE_ADRENOCHROME,
                ITEM_TYPE_BASIC_POTION_BASE: ITEM_TYPE_BASIC_POTION_BASE,
                ITEM_TYPE_COAL: ITEM_TYPE_COAL,
                ITEM_TYPE_COKE: ITEM_TYPE_COKE,
                ITEM_TYPE_CREATURE: ITEM_TYPE_CREATURE,
                ITEM_TYPE_EMPTY_SYRINGE: ITEM_TYPE_EMPTY_SYRINGE,
                ITEM_TYPE_GLASS: ITEM_TYPE_GLASS,
                ITEM_TYPE_IRON_ORE: ITEM_TYPE_IRON_ORE,
                ITEM_TYPE_MUSHROOM: ITEM_TYPE_MUSHROOM,
                ITEM_TYPE_MUSHROOM_SPORE: ITEM_TYPE_MUSHROOM_SPORE,
                ITEM_TYPE_NUTRIENT_SLOP: ITEM_TYPE_NUTRIENT_SLOP,
                ITEM_TYPE_OVERLOAD_MIX: ITEM_TYPE_OVERLOAD_MIX,
                ITEM_TYPE_OXYGEN: ITEM_TYPE_OXYGEN,
                ITEM_TYPE_RAW_STEEL: ITEM_TYPE_RAW_STEEL,
                ITEM_TYPE_SAND: ITEM_TYPE_SAND,
                ITEM_TYPE_SOUL: ITEM_TYPE_SOUL,
                ITEM_TYPE_SOYBEAN: ITEM_TYPE_SOYBEAN,
                ITEM_TYPE_SOYBEAN_SEEDS: ITEM_TYPE_SOYBEAN_SEEDS,
                ITEM_TYPE_STEEL_PARTS: ITEM_TYPE_STEEL_PARTS,
                ITEM_TYPE_STIMPACK: ITEM_TYPE_STIMPACK,
                ITEM_TYPE_WASTE: ITEM_TYPE_WASTE,
                ITEM_TYPE_WATER: ITEM_TYPE_WATER,
                NPC_PRICE_MUSHROOM_SPORE: NPC_PRICE_MUSHROOM_SPORE,
                NPC_PRICE_SOYBEAN_SEEDS: NPC_PRICE_SOYBEAN_SEEDS,
                RESOURCE_COAL: RESOURCE_COAL,
                RESOURCE_GRAVEYARD: RESOURCE_GRAVEYARD,
                RESOURCE_OXIDE: RESOURCE_OXIDE,
                RESOURCE_QUARTZ: RESOURCE_QUARTZ,
                RESOURCE_WATER: RESOURCE_WATER,
                TORMENT_CHAMBER_SOUL_CHANCE: TORMENT_CHAMBER_SOUL_CHANCE
            });
        
            // ---- Resource bodies ----
            // Simple 1x1 non-solid tile; shared Extractor sits on top.
        
            function resourceBody(name, label, resourceType, toolId) {
                return new _sdk.ObjectType({
                    name,
                    geometry: "1x1",
                    textureName: "resource/placeholder",
                    directional: false,
                    label,
                    extractionTiles: [{x: 0, y: 0}],
                    placement: new _sdk.PlacementRule({solid: false}),
                    behavior: new _sdk.ResourceBehavior({resourceType}),
                    toolId,
                });
            }
        
            const WaterResourceType = resourceBody("WaterResource", "Water", RESOURCE_WATER, 10);
            const GraveyardResourceType = resourceBody("Graveyard", "Graveyard", RESOURCE_GRAVEYARD, 11);
            const OxideDepositResourceType = resourceBody("OxideDeposit", "Oxide Ore Deposit", RESOURCE_OXIDE, 12);
            const CoalDepositResourceType = resourceBody("CoalDeposit", "Coal Deposit", RESOURCE_COAL, 13);
            const QuartzDepositResourceType = resourceBody("QuartzDeposit", "Quartz Deposit", RESOURCE_QUARTZ, 14);
        
            const RESOURCE_TYPES = [
                WaterResourceType,
                GraveyardResourceType,
                OxideDepositResourceType,
                CoalDepositResourceType,
                QuartzDepositResourceType,
            ];
        
            // ---- Primary extraction ----
            // Shared Extractor type: the "Primary Extraction" agent, reused for every resource.
        
            const ExtractorType = new _sdk.ObjectType({
                name: "Extractor",
                toolId: 15,
                outputPorts: [new _sdk.PortDefinition("out", {x: 0, y: -1, direction: _sdk.Direction.UP})],
                geometry: "1x1",
                renderConnections: true,
                textureName: "demo-machine/0",
                label: "Extractor",
                inspectable: true,
                placement: new _sdk.PlacementRule({replaceSameKind: true, placeOn: RESOURCE_TYPES}),
                behavior: new _sdk.ExtractorBehavior({
                    processingTicks: 4,
                    recipes: [
                        new _sdk.RecipeDefinition([RESOURCE_WATER], ITEM_TYPE_WATER),
                        new _sdk.RecipeDefinition([RESOURCE_GRAVEYARD], ITEM_TYPE_SOUL),
                        new _sdk.RecipeDefinition([RESOURCE_OXIDE], ITEM_TYPE_IRON_ORE),
                        new _sdk.RecipeDefinition([RESOURCE_COAL], ITEM_TYPE_COAL),
                        new _sdk.RecipeDefinition([RESOURCE_QUARTZ], ITEM_TYPE_SAND),
                    ],
                }),
            });
        
            // ---- Machines ----
            // Ports face bottom (inputs) or top (outputs), never a side. Single port at column x=0 on 1x1;
            // second port widens footprint to "1x2" at column x=1.
        
            const IN_A = new _sdk.PortDefinition("in_a", {x: 0, y: 0, direction: _sdk.Direction.UP});
            const IN_B = new _sdk.PortDefinition("in_b", {x: 1, y: 0, direction: _sdk.Direction.UP});
            const OUT_A = new _sdk.PortDefinition("out_a", {x: 0, y: -1, direction: _sdk.Direction.UP});
            new _sdk.PortDefinition("out_b", {x: 1, y: -1, direction: _sdk.Direction.UP});
        
            // 2x2 footprint: bottom row is y=1. `fluid` flag (4th PortDefinition arg) opts a port into
            // engine.markFluidPort (see MachineBehavior.onSpawn/onDespawn).
            const IN2_A = new _sdk.PortDefinition("in_a", {x: 0, y: 1, direction: _sdk.Direction.UP});
            const IN2_B = new _sdk.PortDefinition("in_b", {x: 1, y: 1, direction: _sdk.Direction.UP});
            const IN2_B_FLUID = new _sdk.PortDefinition("in_b", {x: 1, y: 1, direction: _sdk.Direction.UP}, true, true);
            const OUT2_A = new _sdk.PortDefinition("out_a", {x: 0, y: -1, direction: _sdk.Direction.UP});
            const OUT2_B = new _sdk.PortDefinition("out_b", {x: 1, y: -1, direction: _sdk.Direction.UP});
        
            // 3x3 footprint (Greenhouse/SpawningPool/BlastFurnace): bottom row is y=2, three columns available;
            // a single output centers at x=1.
            const IN3_A = new _sdk.PortDefinition("in_a", {x: 0, y: 2, direction: _sdk.Direction.UP});
            const IN3_A_FLUID = new _sdk.PortDefinition("in_a", {x: 0, y: 2, direction: _sdk.Direction.UP}, true, true);
            const IN3_MID = new _sdk.PortDefinition("in_mid", {x: 1, y: 2, direction: _sdk.Direction.UP});
            const IN3_B = new _sdk.PortDefinition("in_b", {x: 2, y: 2, direction: _sdk.Direction.UP});
            const IN3_B_FLUID = new _sdk.PortDefinition("in_b", {x: 2, y: 2, direction: _sdk.Direction.UP}, true, true);
            const OUT3_A = new _sdk.PortDefinition("out_a", {x: 1, y: -1, direction: _sdk.Direction.UP});
        
            // Placeholder texture per footprint size. 1x2/3x3 frames are Housing's 2x2 art 9-sliced to size —
            // see src/mods/BaseTextures/sprites/main/housing/.
            const TEXTURE_BY_GEOMETRY = {
                "1x1": "demo-machine/0",
                "1x2": "housing/0-1x2",
                "2x2": "housing/0",
                "3x3": "housing/0-3x3",
            };
        
            function machine(name, label, {toolId, inputPorts, outputPorts, recipes, processingTicks, workerCost=0, geometry="1x1"}) {
                return new _sdk.ObjectType({
                    name,
                    toolId,
                    inputPorts,
                    outputPorts,
                    geometry,
                    renderConnections: true,
                    textureName: TEXTURE_BY_GEOMETRY[geometry],
                    label,
                    inspectable: true,
                    placement: new _sdk.PlacementRule({replaceSameKind: true}),
                    behavior: new _sdk.MachineBehavior({processingTicks, recipes, fallback: ITEM_TYPE_WASTE, workerCost}),
                });
            }
        
            const GreenhouseType = machine("Greenhouse", "Greenhouse", {
                toolId: 16,
                inputPorts: [IN3_A, IN3_B_FLUID],
                outputPorts: [OUT3_A],
                geometry: "3x3",
                processingTicks: 6,
                recipes: [
                    new _sdk.RecipeDefinition([ITEM_TYPE_SOYBEAN_SEEDS, ITEM_TYPE_WATER], ITEM_TYPE_SOYBEAN),
                    new _sdk.RecipeDefinition([ITEM_TYPE_MUSHROOM_SPORE, ITEM_TYPE_WATER], ITEM_TYPE_MUSHROOM),
                ],
            });
        
            const BlenderType = machine("Blender", "Blender", {
                toolId: 17,
                inputPorts: [IN2_A],
                outputPorts: [OUT2_A],
                geometry: "2x2",
                processingTicks: 2,
                recipes: [new _sdk.RecipeDefinition([ITEM_TYPE_SOYBEAN], ITEM_TYPE_NUTRIENT_SLOP)],
                workerCost: BLENDER_WORKER_COST,
            });
        
            const SpawningPoolType = machine("SpawningPool", "Spawning Pool", {
                toolId: 18,
                inputPorts: [IN3_A_FLUID, IN3_B],
                outputPorts: [OUT3_A],
                geometry: "3x3",
                processingTicks: 8,
                recipes: [new _sdk.RecipeDefinition([ITEM_TYPE_NUTRIENT_SLOP, ITEM_TYPE_SOUL], ITEM_TYPE_CREATURE)],
            });
        
            const TormentChamberType = machine("TormentChamber", "Torment Chamber", {
                toolId: 19,
                inputPorts: [IN2_A],
                outputPorts: [OUT2_A, OUT2_B],
                geometry: "2x2",
                processingTicks: 6,
                recipes: [
                    new _sdk.RecipeDefinition(
                        [ITEM_TYPE_CREATURE],
                        ITEM_TYPE_ADRENOCHROME,
                        new _sdk.RecipeByproduct(ITEM_TYPE_SOUL, TORMENT_CHAMBER_SOUL_CHANCE),
                    ),
                ],
            });
        
            // Fluid-side port carries Water or BasicPotionBase, both fluids — no port-role conflict.
            const BrewType = machine("Brew", "Brew", {
                toolId: 20,
                inputPorts: [IN2_A, IN2_B_FLUID],
                outputPorts: [OUT2_A],
                geometry: "2x2",
                processingTicks: 6,
                recipes: [
                    new _sdk.RecipeDefinition([ITEM_TYPE_MUSHROOM, ITEM_TYPE_WATER], ITEM_TYPE_BASIC_POTION_BASE),
                    new _sdk.RecipeDefinition([ITEM_TYPE_ADRENOCHROME, ITEM_TYPE_BASIC_POTION_BASE], ITEM_TYPE_OVERLOAD_MIX),
                ],
            });
        
            const BakeType = machine("Bake", "Bake", {
                toolId: 21,
                inputPorts: [IN_A],
                outputPorts: [OUT_A],
                processingTicks: 5,
                recipes: [
                    new _sdk.RecipeDefinition([ITEM_TYPE_COAL], ITEM_TYPE_COKE),
                    new _sdk.RecipeDefinition([ITEM_TYPE_SAND], ITEM_TYPE_GLASS),
                ],
            });
        
            // Coke (solid) and Oxygen (fluid) can't share a port role, so one recipe gets three dedicated
            // ports (3x3) instead of two recipes. PigIron isn't a transportable item, just the in-between state.
            const BlastFurnaceType = machine("BlastFurnace", "Blast Furnace", {
                toolId: 22,
                inputPorts: [IN3_A, IN3_MID, IN3_B_FLUID],
                outputPorts: [OUT3_A],
                geometry: "3x3",
                processingTicks: 8,
                recipes: [new _sdk.RecipeDefinition([ITEM_TYPE_IRON_ORE, ITEM_TYPE_COKE, ITEM_TYPE_OXYGEN], ITEM_TYPE_RAW_STEEL)],
            });
        
            const FormingMachineType = machine("FormingMachine", "Forming Machine", {
                toolId: 23,
                inputPorts: [IN2_A],
                outputPorts: [OUT2_A],
                geometry: "2x2",
                processingTicks: 5,
                recipes: [new _sdk.RecipeDefinition([ITEM_TYPE_RAW_STEEL], ITEM_TYPE_STEEL_PARTS)],
            });
        
            const DelicateAssemblyType = machine("DelicateAssembly", "Delicate Assembly", {
                toolId: 24,
                inputPorts: [IN2_A, IN2_B],
                outputPorts: [OUT2_A],
                geometry: "2x2",
                processingTicks: 6,
                recipes: [new _sdk.RecipeDefinition([ITEM_TYPE_STEEL_PARTS, ITEM_TYPE_GLASS], ITEM_TYPE_EMPTY_SYRINGE)],
            });
        
            const FillType = machine("Fill", "Fill", {
                toolId: 25,
                inputPorts: [IN_A, IN_B],
                outputPorts: [OUT_A],
                geometry: "1x2",
                processingTicks: 4,
                recipes: [new _sdk.RecipeDefinition([ITEM_TYPE_EMPTY_SYRINGE, ITEM_TYPE_OVERLOAD_MIX], ITEM_TYPE_STIMPACK)],
            });
        
            // ---- Air Filter ----
            // No input: passive generator (filters ambient air). Oxygen main output, Water a slow trickle.
        
            const AirFilterType = new _sdk.ObjectType({
                name: "AirFilter",
                toolId: 26,
                outputPorts: [OUT2_A, OUT2_B],
                geometry: "2x2",
                renderConnections: true,
                textureName: TEXTURE_BY_GEOMETRY["2x2"],
                label: "Air Filter",
                inspectable: true,
                placement: new _sdk.PlacementRule({replaceSameKind: true}),
                behavior: new _sdk.GeneratorBehavior({
                    processingTicks: 4,
                    output: ITEM_TYPE_OXYGEN,
                    secondaryOutput: {itemType: ITEM_TYPE_WATER, processingTicks: 40},
                }),
            });
        
            const MACHINE_TYPES = [
                GreenhouseType,
                BlenderType,
                SpawningPoolType,
                TormentChamberType,
                BrewType,
                BakeType,
                BlastFurnaceType,
                FormingMachineType,
                DelicateAssemblyType,
                FillType,
                AirFilterType,
            ];
        
            var m2 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                AirFilterType: AirFilterType,
                BakeType: BakeType,
                BlastFurnaceType: BlastFurnaceType,
                BlenderType: BlenderType,
                BrewType: BrewType,
                CoalDepositResourceType: CoalDepositResourceType,
                DelicateAssemblyType: DelicateAssemblyType,
                ExtractorType: ExtractorType,
                FillType: FillType,
                FormingMachineType: FormingMachineType,
                GraveyardResourceType: GraveyardResourceType,
                GreenhouseType: GreenhouseType,
                MACHINE_TYPES: MACHINE_TYPES,
                OxideDepositResourceType: OxideDepositResourceType,
                QuartzDepositResourceType: QuartzDepositResourceType,
                RESOURCE_TYPES: RESOURCE_TYPES,
                SpawningPoolType: SpawningPoolType,
                TormentChamberType: TormentChamberType,
                WaterResourceType: WaterResourceType
            });
        
            /**
             * The real game content: the whole production chain, from primary extraction through the
             * Biotech (food/adrenochrome/potion) and Industry (steel/glass) chains to the final Stimpack assembly.
             */
            class BaseGameDeclaration extends _sdk.AbstractModDeclaration {
        
                /**
                 * @returns {string}
                 */
                get name() {
                    return "BaseGame";
                }
        
                get objectTypes() {
                    return [...RESOURCE_TYPES, ExtractorType, ...MACHINE_TYPES];
                }
        
                get items() {
                    return {
                        // Fluids never render as a port item sprite; texture unused, tint irrelevant.
                        [ITEM_TYPE_WATER]: new _sdk.ItemDefinition("Water", "items/1-gray"),
                        [ITEM_TYPE_NUTRIENT_SLOP]: new _sdk.ItemDefinition("Nutrient Slop", "items/1-gray"),
                        [ITEM_TYPE_OXYGEN]: new _sdk.ItemDefinition("Oxygen", "items/2-gray"),
                        [ITEM_TYPE_BASIC_POTION_BASE]: new _sdk.ItemDefinition("Basic Potion Base", "items/2-gray"),
        
                        [ITEM_TYPE_SOUL]: new _sdk.ItemDefinition("Soul", "items/3-gray", 0xC8D8FF),
                        [ITEM_TYPE_SOYBEAN_SEEDS]: new _sdk.ItemDefinition("Soybean Seeds", "items/3-gray", 0xD8C878),
                        [ITEM_TYPE_MUSHROOM_SPORE]: new _sdk.ItemDefinition("Mushroom Spore", "items/3-gray", 0x9B7FBF),
        
                        [ITEM_TYPE_SOYBEAN]: new _sdk.ItemDefinition("Soybean", "items/4-gray", 0x8FBF5A),
                        [ITEM_TYPE_MUSHROOM]: new _sdk.ItemDefinition("Mushroom", "items/4-gray", 0xC98A4B),
                        [ITEM_TYPE_CREATURE]: new _sdk.ItemDefinition("Creature", "items/4-gray", 0xE8A0A0),
                        [ITEM_TYPE_WASTE]: new _sdk.ItemDefinition("Waste", "items/4-gray", 0x6B6B47),
        
                        [ITEM_TYPE_IRON_ORE]: new _sdk.ItemDefinition("Iron Ore", "items/2-gray", 0xA0522D),
                        [ITEM_TYPE_COAL]: new _sdk.ItemDefinition("Coal", "items/2-gray", 0x3A3A3A),
                        [ITEM_TYPE_COKE]: new _sdk.ItemDefinition("Coke", "items/2-gray", 0x708090),
                        [ITEM_TYPE_SAND]: new _sdk.ItemDefinition("Sand", "items/2-gray", 0xE0C878),
        
                        [ITEM_TYPE_ADRENOCHROME]: new _sdk.ItemDefinition("Adrenochrome", "items/1-gray", 0xFF3EA5),
                        [ITEM_TYPE_OVERLOAD_MIX]: new _sdk.ItemDefinition("Overload Mix", "items/1-gray", 0x4BE04B),
                        [ITEM_TYPE_RAW_STEEL]: new _sdk.ItemDefinition("Raw Steel", "items/1-gray", 0xB0B8C0),
                        [ITEM_TYPE_STEEL_PARTS]: new _sdk.ItemDefinition("Steel Parts", "items/1-gray", 0x5B7FA6),
                        [ITEM_TYPE_GLASS]: new _sdk.ItemDefinition("Glass", "items/1-gray", 0xBEEAF0),
                        [ITEM_TYPE_EMPTY_SYRINGE]: new _sdk.ItemDefinition("Empty Syringe", "items/1-gray", 0xD9D9D9),
                        [ITEM_TYPE_STIMPACK]: new _sdk.ItemDefinition("Stimpack", "items/1-gray", 0xE63946),
                    };
                }
        
                get marketListings() {
                    return [
                        new _sdk.MarketListingEntry(ITEM_TYPE_SOYBEAN_SEEDS, NPC_PRICE_SOYBEAN_SEEDS),
                        new _sdk.MarketListingEntry(ITEM_TYPE_MUSHROOM_SPORE, NPC_PRICE_MUSHROOM_SPORE),
                    ];
                }
        
                // Water, Oxygen, Nutrient Slop, Basic Potion Base fill pipes, never render as a port item sprite.
                get fluidTypes() {
                    return [ITEM_TYPE_WATER, ITEM_TYPE_OXYGEN, ITEM_TYPE_NUTRIENT_SLOP, ITEM_TYPE_BASIC_POTION_BASE];
                }
            }
        
            var m0 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                BaseGameDeclaration: BaseGameDeclaration
            });
        
            const coreModules = [m0, m1, m2];
        
            exports.coreModules = coreModules;
        
            return exports;
        
        })({}, sdk);
        
        __coreModules = __part.coreModules;
    }
    return __coreModules;
}

function __only(namespace, part) {
    const names = Object.keys(namespace);
    if (names.length !== 1) {
        throw new Error("A mod's " + part + " module must export exactly one class, found " + names.length);
    }
    return namespace[names[0]];
}

export function createDeclaration(sdk) {
    return new (__only(__coreOf(sdk)[0], "declaration"))();
}
