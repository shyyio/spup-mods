// Built by tools/build-mod.js — do not edit.

let __coreModules = null;

function __coreOf(sdk) {
    if (__coreModules === null) {
        var __part = (function (exports, _sdk) {
        
            // Every id a mod invents lives in one place. Item types are global: pick a range that no other mod
            // you run alongside uses, and keep it here so a collision is one file to look at.
        
            const ITEM_TYPE_PEBBLE = 9000;
        
            // How long the collector takes to produce one pebble, in ticks (a tick is 600ms by default).
            const COLLECTOR_TICKS = 8;
        
            var m1 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                COLLECTOR_TICKS: COLLECTOR_TICKS,
                ITEM_TYPE_PEBBLE: ITEM_TYPE_PEBBLE
            });
        
            /**
             * One placeable: a 1x1 machine that needs no input and pushes a pebble out of its top port.
             *
             * The pieces worth knowing:
             *   toolId       a number unique within your mod; it orders the toolbar.
             *   geometry     "1x1", "2x2", "1x2", "3x3" — how many tiles it occupies.
             *   textureName  a frame in an atlas the loadout has. "demo-machine/0" comes from the base
             *                textures; ship your own atlas (sprites.png + sprites.json beside this file's mod
             *                root) and name its frames instead.
             *   behavior     what it does each tick. GeneratorBehavior produces from nothing; MachineBehavior
             *                consumes inputs by recipe; ExtractorBehavior sits on a resource.
             */
            const CollectorType = new _sdk.ObjectType({
                name: "PebbleCollector",
                toolId: 1,
                outputPorts: [new _sdk.PortDefinition("out", {x: 0, y: -1, direction: _sdk.Direction.UP})],
                geometry: "1x1",
                renderConnections: true,
                textureName: "demo-machine/0",
                label: "Pebble Collector",
                inspectable: true,
                placement: new _sdk.PlacementRule({replaceSameKind: true}),
                behavior: new _sdk.GeneratorBehavior({
                    processingTicks: COLLECTOR_TICKS,
                    output: ITEM_TYPE_PEBBLE,
                }),
            });
        
            var m2 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                CollectorType: CollectorType
            });
        
            /**
             * The whole mod, as data: what it is called, what it adds, and what those things are made of. A
             * declaration is pure — no side effects, no engine access — which is why the same file describes
             * the mod to a server, a client, and the registry's checks.
             *
             * Add a sim.js for behavior the ObjectType model cannot express, or a client.js for bespoke
             * rendering and input. Neither is needed for a mod like this one.
             */
            class TemplateDeclaration extends _sdk.AbstractModDeclaration {
        
                /**
                 * @returns {string}
                 */
                get name() {
                    return "Template";
                }
        
                /**
                 * @returns {ObjectType[]}
                 */
                get objectTypes() {
                    return [CollectorType];
                }
        
                /**
                 * Item type -> what it is called and how it draws.
                 * @returns {Object.<number, ItemDefinition>}
                 */
                get items() {
                    return {
                        [ITEM_TYPE_PEBBLE]: new _sdk.ItemDefinition("Pebble", "items/1-gray", 0x9AA0A6),
                    };
                }
            }
        
            var m0 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                TemplateDeclaration: TemplateDeclaration
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
