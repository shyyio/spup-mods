// Built by tools/build-mod.js — do not edit.

let __coreModules = null;

function __coreOf(sdk) {
    if (__coreModules === null) {
        var __part = (function (exports, _sdk) {
        
            // Shared numeric constants and enums for the Logistics mod.
        
            // Maximum tiles an underground belt may span.
            const MAX_UNDERGROUND_LENGTH = 4;
        
            // ---- Belt types ----
            const BELT_NORMAL = 0;
            const BELT_RAMP_DOWN = 1;
            const BELT_RAMP_UP = 2;
            const BELT_UNDERGROUND = 3;
        
            /**
             * A belt kind ordinal (one of the BELT_* constants).
             * @typedef {number} BeltType
             */
        
            // Underground position layers, one per axis (LAYERS_UNDERGROUND_AXIS[direction % 2]), so a
            // surface belt and two crossing tunnels coexist on a tile.
            const LAYERS_UNDERGROUND_AXIS = ["U0", "U1"];
        
            /**
             * The position layer a belt sits on: undergrounds get their axis layer, everything else SURFACE.
             * @param {BeltType} type
             * @param {Direction} direction
             * @returns {string}
             */
            function beltPositionLayer(type, direction) {
                if (type === BELT_UNDERGROUND) {
                    return LAYERS_UNDERGROUND_AXIS[direction % 2];
                }
                return _sdk.LAYER_SURFACE;
            }
        
            /**
             * Per-step (dx, dy) for walking a ramp's tunnel: RAMP_UP steps against its facing, RAMP_DOWN along it.
             * @param {number} rampType BELT_RAMP_UP or BELT_RAMP_DOWN
             * @param {Direction} direction the ramp's facing
             * @returns {{dx: number, dy: number}}
             */
            function tunnelStep(rampType, direction) {
                const sign = rampType === BELT_RAMP_UP ? -1 : 1;
                return {dx: sign * _sdk.Direction.dx(direction), dy: sign * _sdk.Direction.dy(direction)};
            }
        
            /**
             * A belt bend ordinal.
             * @typedef {number} BeltBend
             */
        
            const BeltBend = {
                STRAIGHT: 0,
                LEFT: 1,
                RIGHT: 2,
            };
        
            // ---- Workers ----
            // Workers one Housing contributes to its road network.
            const HOUSING_WORKER_SUPPLY = 5;
        
            // Map-mode tile colors.
            const MAP_COLOR_HOUSING = 0x55a355;
            const MAP_COLOR_ROAD = 0xFFBF00;
            const MAP_COLOR_BELT = 0xf7df9e;
            const MAP_COLOR_BELT_RAMP = 0xc8a16e;
        
            // Roads draw below the worker figures (19) and the default object sprites (20).
            const DRAW_LAYER_ROAD = 18;
        
            // ---- System ordering ----
            // Splitter's POST_RESOLVE seam reads shared ports before belt transport (default order 0) writes pops.
            const ORDER_BEFORE_TRANSPORT = -10;
        
            var m1 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                BELT_NORMAL: BELT_NORMAL,
                BELT_RAMP_DOWN: BELT_RAMP_DOWN,
                BELT_RAMP_UP: BELT_RAMP_UP,
                BELT_UNDERGROUND: BELT_UNDERGROUND,
                BeltBend: BeltBend,
                DRAW_LAYER_ROAD: DRAW_LAYER_ROAD,
                HOUSING_WORKER_SUPPLY: HOUSING_WORKER_SUPPLY,
                LAYERS_UNDERGROUND_AXIS: LAYERS_UNDERGROUND_AXIS,
                MAP_COLOR_BELT: MAP_COLOR_BELT,
                MAP_COLOR_BELT_RAMP: MAP_COLOR_BELT_RAMP,
                MAP_COLOR_HOUSING: MAP_COLOR_HOUSING,
                MAP_COLOR_ROAD: MAP_COLOR_ROAD,
                MAX_UNDERGROUND_LENGTH: MAX_UNDERGROUND_LENGTH,
                ORDER_BEFORE_TRANSPORT: ORDER_BEFORE_TRANSPORT,
                beltPositionLayer: beltPositionLayer,
                tunnelStep: tunnelStep
            });
        
            /**
             * 1x2 splitter routing in_X -> int_X -> out_Y through internal buffer ports at belt speed,
             * submitting managed=0 intents so the resolver only links and the POST_RESOLVE seam does the moves.
             */
            class SplitterBehavior extends _sdk.AbstractBehavior {
        
                install(engine, placed) {
                    engine.defineComponent("Splitter", [
                        {name: "in_a", kind: "eid", fill: _sdk.NO_EID},
                        {name: "in_b", kind: "eid", fill: _sdk.NO_EID},
                        {name: "out_a", kind: "eid", fill: _sdk.NO_EID},
                        {name: "out_b", kind: "eid", fill: _sdk.NO_EID},
                        {name: "int_a", kind: "eid", fill: _sdk.NO_EID},
                        {name: "int_b", kind: "eid", fill: _sdk.NO_EID},
                        {name: "state"},
                    ], {sparse: true});
                    engine.registerSystem(_sdk.TickPhase.SUBMIT_INTENTS, () => this._submitIntents(engine));
                    // Seam must read shared ports before the belt transport writes pops.
                    engine.registerSystem(_sdk.TickPhase.POST_RESOLVE, () => this._runSeam(engine), ORDER_BEFORE_TRANSPORT);
                }
        
                onSpawn(engine, placed, eid, type, message) {
                    const inA = engine.portFor(type.inputPorts[0], message.x, message.y, message.direction);
                    const inB = engine.portFor(type.inputPorts[1], message.x, message.y, message.direction);
                    const outA = engine.portFor(type.outputPorts[0], message.x, message.y, message.direction);
                    const outB = engine.portFor(type.outputPorts[1], message.x, message.y, message.direction);
                    this._wire(engine, eid, {in_a: inA.port, in_b: inB.port, out_a: outA.port, out_b: outB.port});
                    engine.registerRenderedPort(outA.port, outA.tile.x, outA.tile.y);
                    engine.registerRenderedPort(outB.port, outB.tile.x, outB.tile.y);
                }
        
                onDespawn(engine, placed, eid) {
                    const def = engine.component("Splitter");
                    const row = def.row(eid);
                    engine.unregisterRenderedPort(def.store.out_a[row]);
                    engine.unregisterRenderedPort(def.store.out_b[row]);
                }
        
                syncData(engine, placed, eid) {
                    const def = engine.component("Splitter");
                    const row = def.row(eid);
                    return {portIds: [def.store.out_a[row], def.store.out_b[row]], lastOutput: null};
                }
        
                resyncRenderedPorts(engine, placed, eid) {
                    const def = engine.component("Splitter");
                    const row = def.row(eid);
                    for (const out of [def.store.out_a[row], def.store.out_b[row]]) {
                        engine.registerRenderedPort(out, engine.Position.x[out], engine.Position.y[out]);
                    }
                }
        
                /**
                 * Attaches the Splitter component to `eid` and wires its ports (internal ports created fresh).
                 * @private
                 * @param {GameEngine} engine
                 * @param {number} eid
                 * @param {{in_a:number, in_b:number, out_a:number, out_b:number}} ports
                 * @returns {{id:number, in_a:number, in_b:number, out_a:number, out_b:number, int_a:number, int_b:number}}
                 */
                _wire(engine, eid, ports) {
                    const int_a = engine.createPort();
                    const int_b = engine.createPort();
                    const def = engine.component("Splitter");
                    engine.attachComponent(def, eid);
                    const splitter = def.store;
                    const row = def.row(eid);
                    splitter.in_a[row] = ports.in_a;
                    splitter.in_b[row] = ports.in_b;
                    splitter.out_a[row] = ports.out_a;
                    splitter.out_b[row] = ports.out_b;
                    splitter.int_a[row] = int_a;
                    splitter.int_b[row] = int_b;
                    splitter.state[row] = 0;
                    return {id: eid, in_a: ports.in_a, in_b: ports.in_b, out_a: ports.out_a, out_b: ports.out_b, int_a, int_b};
                }
        
                /**
                 * Creates a sim-only splitter for specs and debugging; ports fresh unless given in `wiring`.
                 * @param {GameEngine} engine
                 * @param {{in_a?:number, in_b?:number, out_a?:number, out_b?:number}} [wiring]
                 * @returns {{id:number, in_a:number, in_b:number, out_a:number, out_b:number, int_a:number, int_b:number}}
                 */
                addSplitter(engine, wiring={}) {
                    const port = given => given === undefined ? engine.createPort() : given;
                    // Ports first so their eids stay contiguous from 1.
                    const ports = {
                        in_a: port(wiring.in_a),
                        in_b: port(wiring.in_b),
                        out_a: port(wiring.out_a),
                        out_b: port(wiring.out_b),
                    };
                    const eid = engine.createEntity(engine.component("Splitter"));
                    return this._wire(engine, eid, ports);
                }
        
                /**
                 * Places a sim-only UP-facing splitter at (x, y) adopting adjacent belts' edge ports; for specs and debugging.
                 * @param {GameEngine} engine
                 * @param {number} x
                 * @param {number} y
                 * @returns {{id:number, in_a:number, in_b:number, out_a:number, out_b:number, int_a:number, int_b:number}}
                 */
                placeSplitter(engine, x, y) {
                    return this.addSplitter(engine, {
                        in_a: engine.portAt(x, y, _sdk.Direction.UP),
                        in_b: engine.portAt(x + 1, y, _sdk.Direction.UP),
                        out_a: engine.portAt(x, y - 1, _sdk.Direction.UP),
                        out_b: engine.portAt(x + 1, y - 1, _sdk.Direction.UP),
                    });
                }
        
                /**
                 * Submits managed=0 intents: each loaded input to its internal port, each loaded internal port
                 * fanned out to both outputs ranked by the round-robin state.
                 * @private
                 * @param {GameEngine} engine
                 * @returns {void}
                 */
                _submitIntents(engine) {
                    const item = engine.Port.item;
                    const def = engine.component("Splitter");
                    const splitter = def.store;
                    for (let row = 0; row < def.count; row += 1) {
                        if (item[splitter.in_a[row]] !== _sdk.EMPTY) {
                            engine.submitTransfer(splitter.in_a[row], splitter.int_a[row], item[splitter.int_a[row]] === _sdk.EMPTY, false);
                        }
                        if (item[splitter.in_b[row]] !== _sdk.EMPTY) {
                            engine.submitTransfer(splitter.in_b[row], splitter.int_b[row], item[splitter.int_b[row]] === _sdk.EMPTY, false);
                        }
                        const preferA = splitter.state[row] === 0 ? 1 : 2;
                        const preferB = splitter.state[row] === 0 ? 2 : 1;
                        if (item[splitter.int_a[row]] !== _sdk.EMPTY) {
                            engine.submitTransfer(splitter.int_a[row], splitter.out_a[row], item[splitter.out_a[row]] === _sdk.EMPTY, false, preferA);
                            engine.submitTransfer(splitter.int_a[row], splitter.out_b[row], item[splitter.out_b[row]] === _sdk.EMPTY, false, preferB);
                        }
                        if (item[splitter.int_b[row]] !== _sdk.EMPTY) {
                            engine.submitTransfer(splitter.int_b[row], splitter.out_b[row], item[splitter.out_b[row]] === _sdk.EMPTY, false, preferA);
                            engine.submitTransfer(splitter.int_b[row], splitter.out_a[row], item[splitter.out_a[row]] === _sdk.EMPTY, false, preferB);
                        }
                    }
                }
        
                /**
                 * POST_RESOLVE seam: record resolved hops, clear drained sources, then fill destinations — in
                 * that order so items cross at belt speed — and advance routed splitters' round-robin state.
                 * @private
                 * @param {GameEngine} engine
                 * @returns {void}
                 */
                _runSeam(engine) {
                    const item = engine.Port.item;
                    const def = engine.component("Splitter");
                    const splitter = def.store;
                    const stage1 = [];
                    const stage2 = [];
        
                    for (let row = 0; row < def.count; row += 1) {
                        for (const intPort of [splitter.int_a[row], splitter.int_b[row]]) {
                            if (item[intPort] === _sdk.EMPTY) {
                                continue;
                            }
                            const dest = engine.resolvedDestFor(intPort);
                            if (dest !== _sdk.EMPTY) {
                                stage2.push({outPort: dest, item: item[intPort], intPort: intPort});
                            }
                        }
                        for (const inPort of [splitter.in_a[row], splitter.in_b[row]]) {
                            if (item[inPort] === _sdk.EMPTY) {
                                continue;
                            }
                            const dest = engine.resolvedDestFor(inPort);
                            if (dest !== _sdk.EMPTY) {
                                stage1.push({intPort: dest, item: item[inPort], inPort: inPort});
                            }
                        }
                    }
        
                    for (const record of stage2) {
                        engine.setPortItem(record.intPort, _sdk.EMPTY);
                    }
                    for (const record of stage1) {
                        engine.setPortItem(record.inPort, _sdk.EMPTY);
                    }
                    for (const record of stage1) {
                        engine.setPortItem(record.intPort, record.item);
                    }
                    for (const record of stage2) {
                        engine.setPortItem(record.outPort, record.item);
                    }
        
                    for (let row = 0; row < def.count; row += 1) {
                        if (engine.resolvedDestFor(splitter.int_a[row]) !== _sdk.EMPTY || engine.resolvedDestFor(splitter.int_b[row]) !== _sdk.EMPTY) {
                            splitter.state[row] = 1 - splitter.state[row];
                        }
                    }
                }
            }
        
            var m8 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                SplitterBehavior: SplitterBehavior
            });
        
            /**
             * Whether a feeder feeds forward on the surface: ramp entrances/undergrounds bury the flow, any non-belt feeds forward.
             * @param {object} data - a feeder record's data
             * @returns {boolean}
             */
            function feedsForward(data) {
                if (isBeltType(data.type)) {
                    return data.type.beltKind === BELT_NORMAL || data.type.beltKind === BELT_RAMP_UP;
                }
                return true;
            }
        
            /**
             * The tile a belt at (tileX, tileY) facing `direction` is fed from, or nulls; the highest-id
             * forward feeder wins, mirroring Belts._chosenUpstream.
             * @param {ObjectsView} cache
             * @param {number} tileX
             * @param {number} tileY
             * @param {Direction} direction
             * @returns {{parentX: number|null, parentY: number|null}}
             */
            function inferBeltParent(cache, tileX, tileY, direction) {
                // Stand-in record with a normal belt's ports for the port-connection query.
                const belt = {tileX, tileY, data: {type: BeltDefinition, direction}};
        
                let parent = null;
                for (const connection of cache.connectedPorts(belt)) {
                    if (connection.isOutput || !feedsForward(connection.neighbor.data)) {
                        continue;
                    }
                    if (parent === null || connection.neighbor.id > parent.neighbor.id) {
                        parent = connection;
                    }
                }
        
                if (parent === null) {
                    return {parentX: null, parentY: null};
                }
                return {parentX: parent.neighborX, parentY: parent.neighborY};
            }
        
            /**
             * The surface (non-underground) belt entry at a tile, or null.
             * @param {ObjectsView} index
             * @param {number} tileX
             * @param {number} tileY
             * @returns {CacheEntry|null}
             */
            function surfaceBeltAt(index, tileX, tileY) {
                const entries = index.getAtTile(tileX, tileY);
                const surface = entries.find(record =>
                    isBeltType(record.data.type) && record.data.type.beltKind !== BELT_UNDERGROUND);
                if (surface === undefined) {
                    return null;
                }
                return surface;
            }
        
            /**
             * Walks `ramp`'s tunnel along its axis, returning the buried tiles and the paired opposite ramp (or null).
             * @param {ObjectsView} index
             * @param {CacheEntry} ramp
             * @returns {{tiles: {x: number, y: number}[], pair: CacheEntry|null}}
             */
            function walkTunnel(index, ramp) {
                const {dx, dy} = tunnelStep(ramp.data.type.beltKind, ramp.data.direction);
                const pairType = ramp.data.type.beltKind === BELT_RAMP_UP ? BELT_RAMP_DOWN : BELT_RAMP_UP;
        
                let x = ramp.tileX;
                let y = ramp.tileY;
                const tiles = [];
                for (let i = 0; i < MAX_UNDERGROUND_LENGTH + 1; i += 1) {
                    x += dx;
                    y += dy;
                    const records = index.getAtTile(x, y);
                    // A tunnel's undergrounds face its ramps' direction, so skip a crossing tunnel's.
                    const underground = records.find(record =>
                        record.data.type.beltKind === BELT_UNDERGROUND && record.data.direction === ramp.data.direction
                    );
                    if (underground !== undefined) {
                        tiles.push({x, y});
                        continue;
                    }
                    const pair = records.find(record =>
                        record.data.type.beltKind === pairType && record.data.direction === ramp.data.direction
                    );
                    if (pair === undefined) {
                        return {tiles, pair: null};
                    }
                    return {tiles, pair};
                }
                return {tiles, pair: null};
            }
        
            // ---- Underground belt helpers ----
        
            /**
             * Whether a belt type is a ramp entrance or exit.
             * @param {number} type
             * @returns {boolean}
             */
            function isRamp(type) {
                return type === BELT_RAMP_UP || type === BELT_RAMP_DOWN;
            }
        
            /**
             * Scans from (x, y) along a `kind` ramp's tunnel axis for its partner ramp; a same-kind ramp in
             * between blocks the pairing. Shared by the sim (`Belts.rampPartner`) and the client tool
             * (`UndergroundBeltTool`), each supplying its own belt lookup.
             * @param {number} x
             * @param {number} y
             * @param {Direction} direction
             * @param {BeltType} kind - BELT_RAMP_DOWN or BELT_RAMP_UP
             * @param {function(number, number): {type: BeltType, direction: Direction}[]} beltsAt - candidates on a tile
             * @returns {object|null} the matched partner-kind belt (whatever shape `beltsAt` returns), or null
             */
            function findRampPartner(x, y, direction, kind, beltsAt) {
                const {dx, dy} = tunnelStep(kind, direction);
                const partnerKind = kind === BELT_RAMP_UP ? BELT_RAMP_DOWN : BELT_RAMP_UP;
                let cx = x;
                let cy = y;
                for (let i = 1; i < MAX_UNDERGROUND_LENGTH + 2; i += 1) {
                    cx += dx;
                    cy += dy;
                    for (const belt of beltsAt(cx, cy)) {
                        if (belt.type === kind) {
                            return null;
                        }
                        if (belt.type === partnerKind && belt.direction === direction) {
                            return belt;
                        }
                    }
                }
                return null;
            }
        
            /**
             * @param rampParent {{x: number, y: number, type: number, direction: Direction}}
             * @param options {{x: number, y: number, type: number, direction: Direction}}
             * @returns {{x: number, y: number}[]}
             */
            function getUndergroundBeltsToCreate(rampParent, options) {
                if (rampParent === null || rampParent.direction !== options.direction
                    || !isRamp(rampParent.type)
                    || (rampParent.x !== options.x && rampParent.y !== options.y)) {
                    throw new Error("Invalid ramp parent for underground belt creation");
                }
        
                const x1 = rampParent.type === BELT_RAMP_UP ? options.x : rampParent.x;
                const y1 = rampParent.type === BELT_RAMP_UP ? options.y : rampParent.y;
                let x2 = rampParent.type === BELT_RAMP_UP ? rampParent.x : options.x;
                let y2 = rampParent.type === BELT_RAMP_UP ? rampParent.y : options.y;
        
                let dx = 0;
                if (x2 !== x1) {
                    if (x2 < x1) {
                        dx = -1;
                    } else {
                        dx = 1;
                    }
                }
                let dy = 0;
                if (y2 !== y1) {
                    if (y2 < y1) {
                        dy = -1;
                    } else {
                        dy = 1;
                    }
                }
        
                x2 -= dx;
                y2 -= dy;
        
                let x = x1;
                let y = y1;
        
                const undergrounds = [];
                while (x !== x2 || y !== y2) {
                    x += dx;
                    y += dy;
                    undergrounds.push({x, y});
                }
        
                if (undergrounds.length > MAX_UNDERGROUND_LENGTH) {
                    return [];
                }
        
                return undergrounds;
            }
        
            var m3 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                findRampPartner: findRampPartner,
                getUndergroundBeltsToCreate: getUndergroundBeltsToCreate,
                inferBeltParent: inferBeltParent,
                isRamp: isRamp,
                surfaceBeltAt: surfaceBeltAt,
                walkTunnel: walkTunnel
            });
        
            // Sentinel for a path feeding nothing, keeping `outPortIds` a plain int column; per-path events use null.
            const NO_OUT_PORT = 0;
        
            class BeltPathRecalculateEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    x: "sint32",
                    y: "sint32",
                    parts: "int64[]",
                    outPortId: "int64?",
                };
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number[]} parts - belt ids in path order, head last
                 * @param {number|null} [outPortId] - the path's out-port id
                 */
                constructor(x, y, parts, outPortId=null) {
                    super(x, y);
                    this.parts = parts;
                    this.outPortId = outPortId;
                }
            }
        
            // Item events: `gap` = empty half-tiles ahead of the item; positions are relative, so one gap
            // change shifts every item behind it. (x, y) is the path head, routes the event to its chunk
            // topic only and stays off the wire — `chunk` is meaningless on a decoded item event.
        
            /**
             * Inserts one of a path's items or restates its gap; the client glides the moved items.
             */
            class BeltItemUpsertEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    pathId: "int64",
                    itemId: "int64",
                    gap: "int32",
                    itemType: "int32",
                };
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number} pathId
                 * @param {number} itemId
                 * @param {number} gap
                 * @param {number} itemType
                 */
                constructor(x, y, pathId, itemId, gap, itemType) {
                    super(x, y);
                    this.pathId = pathId;
                    this.itemId = itemId;
                    this.gap = gap;
                    this.itemType = itemType;
                }
            }
        
            /**
             * BeltItemUpsertEvent payload as a re-key after a reset; the client snaps in place, not animates.
             */
            class BeltItemSyncEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    pathId: "int64",
                    itemId: "int64",
                    gap: "int32",
                    itemType: "int32",
                };
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number} pathId
                 * @param {number} itemId
                 * @param {number} gap
                 * @param {number} itemType
                 */
                constructor(x, y, pathId, itemId, gap, itemType) {
                    super(x, y);
                    this.pathId = pathId;
                    this.itemId = itemId;
                    this.gap = gap;
                    this.itemType = itemType;
                }
            }
        
            /**
             * Drops one of a path's items.
             */
            class BeltItemDeleteEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    pathId: "int64",
                    itemId: "int64",
                };
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number} pathId
                 * @param {number} itemId
                 */
                constructor(x, y, pathId, itemId) {
                    super(x, y);
                    this.pathId = pathId;
                    this.itemId = itemId;
                }
            }
        
            /**
             * Clears a path's items before an edit re-emits them as syncs.
             */
            class BeltItemResetEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    pathId: "int64",
                };
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number} pathId
                 */
                constructor(x, y, pathId) {
                    super(x, y);
                    this.pathId = pathId;
                }
            }
        
        
            /**
             * One chunk's item deltas for a move pass, as parallel upsert/delete columns.
             */
            class BeltItemBatchEvent extends _sdk.AbstractBatchEvent {
        
                static wireFields = {
                    upsertPathIds: "int64[]",
                    upsertItemIds: "int64[]",
                    upsertGaps: "int32[]",
                    upsertItemTypes: "int32[]",
                    deletePathIds: "int64[]",
                    deleteItemIds: "int64[]",
                };
        
                /**
                 * @param {number} x - a path head in the batched chunk, routes the batch to that topic
                 * @param {number} y
                 */
                constructor(x, y) {
                    super(x, y);
                    this.upsertPathIds = [];
                    this.upsertItemIds = [];
                    this.upsertGaps = [];
                    this.upsertItemTypes = [];
                    this.deletePathIds = [];
                    this.deleteItemIds = [];
                }
        
                /**
                 * @param {number} pathId
                 * @param {number} itemId
                 * @param {number} gap
                 * @param {number} itemType
                 * @returns {void}
                 */
                addUpsert(pathId, itemId, gap, itemType) {
                    this.upsertPathIds.push(pathId);
                    this.upsertItemIds.push(itemId);
                    this.upsertGaps.push(gap);
                    this.upsertItemTypes.push(itemType);
                }
        
                /**
                 * @param {number} pathId
                 * @param {number} itemId
                 * @returns {void}
                 */
                addDelete(pathId, itemId) {
                    this.deletePathIds.push(pathId);
                    this.deleteItemIds.push(itemId);
                }
        
                /**
                 * Deletes come first: a path pops before it ingests, so this replays deltas in emission order.
                 * @returns {(BeltItemUpsertEvent|BeltItemDeleteEvent)[]}
                 */
                explode() {
                    const events = [];
                    for (let i = 0; i < this.deletePathIds.length; i += 1) {
                        events.push(new BeltItemDeleteEvent(this.x, this.y, this.deletePathIds[i], this.deleteItemIds[i]));
                    }
                    for (let i = 0; i < this.upsertPathIds.length; i += 1) {
                        events.push(new BeltItemUpsertEvent(
                            this.x,
                            this.y,
                            this.upsertPathIds[i],
                            this.upsertItemIds[i],
                            this.upsertGaps[i],
                            this.upsertItemTypes[i],
                        ));
                    }
                    return events;
                }
            }
        
            /**
             * One chunk's path recalcs as packed columns: path `i` heads at (`tileX[i]`, `tileY[i]`) and owns
             * the next `partCounts[i]` entries of `parts`; NO_OUT_PORT marks a path feeding nothing.
             */
            class BeltPathBatchEvent extends _sdk.AbstractBatchEvent {
        
                static wireFields = {
                    originX: "sint32",
                    originY: "sint32",
                    tileX: "sint32[]",
                    tileY: "sint32[]",
                    partCounts: "int32[]",
                    parts: "int64[]",
                    outPortIds: "int64[]",
                };
        
                /**
                 * @param {number} originX - the batched chunk's origin tile, also routes the batch
                 * @param {number} originY
                 */
                constructor(originX, originY) {
                    super(originX, originY);
                    this.originX = originX;
                    this.originY = originY;
                    this.tileX = [];
                    this.tileY = [];
                    this.partCounts = [];
                    this.parts = [];
                    this.outPortIds = [];
                }
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number[]} parts - belt ids in path order, head last
                 * @param {number|null} outPortId
                 * @returns {void}
                 */
                add(x, y, parts, outPortId) {
                    this.tileX.push(x - this.originX);
                    this.tileY.push(y - this.originY);
                    this.partCounts.push(parts.length);
                    this.parts.push(...parts);
                    let wiredOutPortId = outPortId;
                    if (outPortId === null) {
                        wiredOutPortId = NO_OUT_PORT;
                    }
                    this.outPortIds.push(wiredOutPortId);
                }
        
                /**
                 * @returns {BeltPathRecalculateEvent[]}
                 */
                explode() {
                    const events = [];
                    let partAt = 0;
                    for (let i = 0; i < this.tileX.length; i += 1) {
                        const parts = this.parts.slice(partAt, partAt + this.partCounts[i]);
                        partAt += this.partCounts[i];
                        const outPortId = this.outPortIds[i] === NO_OUT_PORT ? null : this.outPortIds[i];
                        events.push(new BeltPathRecalculateEvent(
                            this.originX + this.tileX[i],
                            this.originY + this.tileY[i],
                            parts,
                            outPortId,
                        ));
                    }
                    return events;
                }
            }
        
            var m2 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                BeltItemBatchEvent: BeltItemBatchEvent,
                BeltItemDeleteEvent: BeltItemDeleteEvent,
                BeltItemResetEvent: BeltItemResetEvent,
                BeltItemSyncEvent: BeltItemSyncEvent,
                BeltItemUpsertEvent: BeltItemUpsertEvent,
                BeltPathBatchEvent: BeltPathBatchEvent,
                BeltPathRecalculateEvent: BeltPathRecalculateEvent
            });
        
            // Initial arena size in item slots; grows by doubling.
            const ARENA_CAPACITY = 4096;
        
        
            /**
             * The in-flight items of every belt path, in three shared public columns the move loop indexes
             * directly (avoiding a dependent cache miss per path per tick); each path owns a fixed
             * `length`-slot slab used as a ring. An item's `gap` is the empty half-tiles ahead of it (the lead
             * item's distance from the output edge): decrementing one gap advances it and everything behind
             * it, and popping the lead leaves the next one's stored gap already correct.
             */
            class ItemStore {
        
                constructor() {
                    this.capacity = ARENA_CAPACITY;
                    this.ids = new Float64Array(ARENA_CAPACITY);
                    this.types = new Int32Array(ARENA_CAPACITY);
                    this.gaps = new Int32Array(ARENA_CAPACITY);
                    // Bump pointer plus freed slabs keyed by exact size; path lengths repeat, so exact-size reuse curbs arena growth.
                    this._used = 0;
                    this._freeBySlots = new Map();
                }
        
                /**
                 * Reserves a slab of `slots` contiguous item slots.
                 * @param {number} slots
                 * @returns {number} the slab's base index into the columns
                 */
                allocate(slots) {
                    const free = this._freeBySlots.get(slots);
                    if (free !== undefined && free.length > 0) {
                        return free.pop();
                    }
                    this._reserve(this._used + slots);
                    const base = this._used;
                    this._used += slots;
                    return base;
                }
        
                /**
                 * Returns a slab for reuse; contents are left for the next taker to overwrite.
                 * @param {number} base
                 * @param {number} slots
                 * @returns {void}
                 */
                free(base, slots) {
                    const free = this._freeBySlots.get(slots);
                    if (free === undefined) {
                        this._freeBySlots.set(slots, [base]);
                        return;
                    }
                    free.push(base);
                }
        
                /**
                 * Grows the columns so `needed` slots fit, carrying the live slabs across.
                 * @private
                 * @param {number} needed
                 * @returns {void}
                 */
                _reserve(needed) {
                    if (needed <= this.capacity) {
                        return;
                    }
                    let capacity = this.capacity;
                    while (capacity < needed) {
                        capacity *= 2;
                    }
                    const ids = new Float64Array(capacity);
                    ids.set(this.ids);
                    this.ids = ids;
                    for (const name of ["types", "gaps"]) {
                        const grown = new Int32Array(capacity);
                        grown.set(this[name]);
                        this[name] = grown;
                    }
                    this.capacity = capacity;
                }
            }
        
            var m7 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                ItemStore: ItemStore
            });
        
            // An empty half-tile in a path's occupancy.
            const GAP = 0;
        
            // Initial slot count for the per-path hot columns; grows by doubling.
            const PATH_CAPACITY = 1024;
        
            // Slot column value for a port that feeds no path.
            const NO_SLOT = -1;
        
        
            // Marks a live path entity; one shared object, since the world keys components by identity.
            const PATH_MARKER = {};
        
            /**
             * Belt path movement on the ECS engine; a path carries a slab of the shared {@link ItemStore},
             * ordered output-edge -> input-edge, each item holding the empty half-tiles ahead of it.
             */
            class Belts {
        
                /**
                 * @param {GameEngine} engine
                 */
                constructor(engine) {
                    this.engine = engine;
                    // Path records; `items` is held only while a path is not live (seed before tracking, snapshot after drop).
                    this.paths = [];
                    // Port eid -> slot of the path it feeds, so a path finds its downstream across a shared seam port.
                    this._slotByInPort = this.engine.registerPortColumn(NO_SLOT);
                    // Tile key -> covering paths, and belt id -> its path; keeps edits off a scan of every path.
                    this._pathsByTile = new Map();
                    this._pathByBeltId = new Map();
                    // Hot per-path columns indexed by slot (records carry their slot, so a drop is a swap-pop).
                    // `_colLeadGap` is the lead item's gap (-1 when empty), `_colFirstGap` the first item with
                    // room ahead; both updated in place by the tick phases.
                    this._pathCapacity = PATH_CAPACITY;
                    this._colInPort = new Int32Array(PATH_CAPACITY);
                    this._colOutPort = new Int32Array(PATH_CAPACITY);
                    this._colHeadGap = new Int32Array(PATH_CAPACITY);
                    this._colCount = new Int32Array(PATH_CAPACITY);
                    this._colLeadGap = new Int32Array(PATH_CAPACITY);
                    this._colFirstGap = new Int32Array(PATH_CAPACITY);
                    // Whether the path's chunk has a watcher, cached at an observation generation (0 = never).
                    this._colObserved = new Uint8Array(PATH_CAPACITY);
                    this._colObservedGen = new Int32Array(PATH_CAPACITY);
                    // The path's slab in the shared item store: base, span, and the slot holding the lead item.
                    this._colItemBase = new Int32Array(PATH_CAPACITY);
                    this._colItemSlab = new Int32Array(PATH_CAPACITY);
                    this._colItemHead = new Int32Array(PATH_CAPACITY);
                    // Out-port writes _move defers to its last phase, reused tick to tick.
                    this._popCapacity = PATH_CAPACITY;
                    this._popPorts = new Int32Array(PATH_CAPACITY);
                    this._popTypes = new Int32Array(PATH_CAPACITY);
                    // Placed belts by tile key; a tile can hold belts on different axes/layers, disambiguated by direction.
                    this._belts = new Map();
                    /**
                     * Belt id -> belt.
                     * @type {Map<number, {x:number, y:number, direction:number, type:number, id:number}>}
                     */
                    this._beltById = new Map();
                    // Chunk -> the paths (by head tile) it holds; paths never cross a chunk seam.
                    this._pathsByChunk = new Map();
                    // Every live path's items, in three shared columns.
                    this._items = new ItemStore();
                    // Stable item id, the client's sprite key for continuity/glide.
                    this._nextItemId = 1;
        
                    // Runtime state lives in the JS maps above; these snapshotOnly components mirror it only at save/load.
                    this._pathDef = engine.defineComponent("BeltPath", [
                        {name: "inPort", kind: "eid", fill: _sdk.NO_EID},
                        {name: "outPort", kind: "eid", fill: _sdk.NO_EID},
                        {name: "headGap"},
                        {name: "length"},
                    ], {snapshotOnly: true});
                    // Path membership only; a belt's position/direction/kind ride the PlacedObject snapshot.
                    this._beltDef = engine.defineComponent("BeltPathMember", [
                        {name: "path", kind: "eid", fill: _sdk.NO_EID},
                        {name: "seq"},
                        {name: "objectId", fill: _sdk.NO_EID},
                    ], {snapshotOnly: true});
                    this._itemDef = engine.defineComponent("BeltItem", [
                        {name: "path", kind: "eid", fill: _sdk.NO_EID},
                        {name: "seq"},
                        {name: "gap"},
                        {name: "type"},
                        {name: "itemId", fill: _sdk.NO_EID},
                    ], {snapshotOnly: true});
                    engine.globals.beltNextItemId = this._nextItemId;
        
                    // Underground axis layers, so crossing tunnels and a surface belt coexist on a tile.
                    for (const layer of LAYERS_UNDERGROUND_AXIS) {
                        engine.registerPositionLayer(layer);
                    }
        
                    engine.registerSystem(_sdk.TickPhase.SUBMIT_INTENTS, () => this._submitIntents());
                    engine.registerSystem(_sdk.TickPhase.POST_RESOLVE, () => this._move());
                    engine.registerSerializeHook(() => this._materialize());
                    engine.registerRebuildHook(() => this._reconstruct());
                    engine.registerPortPin(() => this._pinnedPorts());
                    engine.registerChunkSync(chunk => this.chunkSync(chunk));
                }
        
                /**
                 * @private
                 * @param {number} x
                 * @param {number} y
                 * @returns {object[]} the belts on tile (x, y)
                 */
                _beltsAt(x, y) {
                    const held = this._belts.get(_sdk.tileId(x, y));
                    if (held === undefined) {
                        return [];
                    }
                    if (Array.isArray(held)) {
                        return held;
                    }
                    return [held];
                }
        
                /**
                 * The belt on tile (x, y) facing `direction`, or undefined (same-axis overlap is disallowed).
                 * @private
                 * @param {number} x
                 * @param {number} y
                 * @param {number} direction
                 * @returns {object|undefined}
                 */
                _beltAt(x, y, direction) {
                    return this._beltsAt(x, y).find(belt => belt.direction === direction);
                }
        
                /**
                 * The belt `belt` flows into: the one continuing the flow on the tile ahead.
                 * @private
                 * @param {object} belt
                 * @returns {object|undefined}
                 */
                _flowInto(belt) {
                    const ax = belt.x + _sdk.Direction.dx(belt.direction);
                    const ay = belt.y + _sdk.Direction.dy(belt.direction);
                    const ahead = this._beltsAt(ax, ay);
                    // A tunnel continues on its own axis into an underground or ramp-up; everything else feeds a surface belt.
                    if (belt.type === BELT_UNDERGROUND || belt.type === BELT_RAMP_DOWN) {
                        return ahead.find(candidate =>
                            (candidate.type === BELT_UNDERGROUND || candidate.type === BELT_RAMP_UP)
                            && _sdk.Direction.axis(candidate.direction) === _sdk.Direction.axis(belt.direction));
                    }
                    return ahead.find(candidate => candidate.type !== BELT_UNDERGROUND);
                }
        
                /**
                 * The belt feeding `belt`: the highest-id feeder wins, so a new belt steals a junction.
                 * @private
                 * @param {object} belt
                 * @returns {object|undefined}
                 */
                _chosenUpstream(belt) {
                    let chosen;
                    for (const direction of [_sdk.Direction.UP, _sdk.Direction.RIGHT, _sdk.Direction.DOWN, _sdk.Direction.LEFT]) {
                        const fx = belt.x - _sdk.Direction.dx(direction);
                        const fy = belt.y - _sdk.Direction.dy(direction);
                        for (const feeder of this._beltsAt(fx, fy)) {
                            if (this._flowInto(feeder) === belt && (chosen === undefined || feeder.id > chosen.id)) {
                                chosen = feeder;
                            }
                        }
                    }
                    return chosen;
                }
        
                /**
                 * @private
                 * @param {object} belt
                 * @returns {void}
                 */
                _addBelt(belt) {
                    const key = _sdk.tileId(belt.x, belt.y);
                    const held = this._belts.get(key);
                    if (held === undefined) {
                        this._belts.set(key, belt);
                    } else if (Array.isArray(held)) {
                        held.push(belt);
                    } else {
                        this._belts.set(key, [held, belt]);
                    }
                    this._beltById.set(belt.id, belt);
                }
        
                /**
                 * @private
                 * @param {object} belt
                 * @returns {void}
                 */
                _removeBeltObject(belt) {
                    const key = _sdk.tileId(belt.x, belt.y);
                    const remaining = this._beltsAt(belt.x, belt.y).filter(candidate => candidate !== belt);
                    if (remaining.length === 0) {
                        this._belts.delete(key);
                    } else if (remaining.length === 1) {
                        this._belts.set(key, remaining[0]);
                    } else {
                        this._belts.set(key, remaining);
                    }
                    this._beltById.delete(belt.id);
                }
        
                /**
                 * @returns {number}
                 */
                get beltCount() {
                    return this._beltById.size;
                }
        
                /**
                 * Registers a placed belt, (re)building the maximal in-line run it belongs to into one path.
                 * @param {number} x
                 * @param {number} y
                 * @param {Direction} direction
                 * @param {BeltType} [type]
                 * @param {number} [id] - the belt's object id, allocated by the generic spawn path
                 * @returns {{id:number, inPort:number, outPort:number, length:number, segments:number[]}|null} null
                 *     when the target cell is taken
                 */
                placeBelt(x, y, direction, type=BELT_NORMAL, id=undefined) {
                    // An underground occupies its axis layer, so it can cross under a surface belt.
                    const layer = beltPositionLayer(type, direction);
                    if (!this.engine.cellsFree([{x, y, layer}])) {
                        return null;
                    }
                    const placed = {x, y, direction, type, id: id === undefined ? this.engine.createObjectId() : id};
                    this.engine.occupy([{x, y, layer}], placed.id);
        
                    this._addBelt(placed);
        
                    // Dropped overlapped paths can orphan belts outside this run; each rebuilds into its own path.
                    const run = this._collectRun(placed);
                    const {removed, orphans} = this._removePathsOverlapping(run);
                    const result = this._buildRun(run, placed, removed);
                    const rebuilt = this._rebuildOrphans(orphans, run, removed);
        
                    // Recalc + item rows for every changed path (the run and any split-off orphan).
                    const affected = [...run, ...rebuilt].map(belt => _sdk.tileId(belt.x, belt.y));
                    this._emitPathRecalcs(affected);
                    this._emitPathItems(affected);
                    return result;
                }
        
                /**
                 * The ramp this placement would tunnel to; a same-kind ramp in between blocks the pairing.
                 * @param {number} x
                 * @param {number} y
                 * @param {Direction} direction
                 * @param {BeltType} kind - BELT_RAMP_DOWN or BELT_RAMP_UP
                 * @returns {{x:number, y:number, direction:number, type:number}|null}
                 */
                rampPartner(x, y, direction, kind) {
                    const belt = findRampPartner(x, y, direction, kind, (cx, cy) => this._beltsAt(cx, cy));
                    if (belt === null) {
                        return null;
                    }
                    return {x: belt.x, y: belt.y, direction: belt.direction, type: belt.type};
                }
        
                /**
                 * Builds the run into one path, or empty seam-connected per-chunk paths (paths never cross a chunk border).
                 * @private
                 * @param {object[]} run - the run's belts, head -> tail
                 * @param {object} placed - the belt just placed
                 * @param {object[]} [removed] - the paths just dropped
                 * @returns {{id:number, inPort:number, outPort:number, length:number, segments:number[]}}
                 */
                _buildRun(run, placed, removed=[]) {
                    const segments = this._segmentByChunk(run);
                    if (segments.length === 1) {
                        return this._buildSingleChunk(run, placed, removed);
                    }
                    return this._buildEmptyChain(segments);
                }
        
                /**
                 * Rebuilds each uncovered orphaned belt into its own path, carrying the items that sat on its belts.
                 * @private
                 * @param {object[]} orphans - belts dropped from removed paths, not in the run
                 * @param {object[]} run - the run's belts (already rebuilt)
                 * @param {object[]} removed - the source paths
                 * @returns {object[]} the belts of the rebuilt orphan paths
                 */
                _rebuildOrphans(orphans, run, removed) {
                    const covered = new Set(run.map(belt => belt.id));
                    const rebuilt = [];
                    for (const orphan of orphans) {
                        if (covered.has(orphan.id)) {
                            continue;
                        }
                        const orphanRun = this._collectRun(orphan);
                        this._rebuildSubrun(orphanRun, removed);
                        for (const belt of orphanRun) {
                            covered.add(belt.id);
                            rebuilt.push(belt);
                        }
                    }
                    return rebuilt;
                }
        
                /**
                 * Rebuilds a split-off sub-run, keeping items only when single-chunk and fully contained by one source path.
                 * @private
                 * @param {object[]} run - the sub-run's belts, head -> tail
                 * @param {object[]} sourcePaths - the dropped paths to carry items from
                 * @returns {void}
                 */
                _rebuildSubrun(run, sourcePaths) {
                    const segments = this._segmentByChunk(run);
                    if (segments.length === 1) {
                        const from = sourcePaths.find(path => run.every(runBelt => path.beltIds.includes(runBelt.id)));
                        const state = from === undefined ? {items: []} : this._carryItemsForSubrun(from, run);
                        this._trackPath(this._makePath(run, state));
                    } else {
                        this._buildEmptyChain(segments);
                    }
                }
        
                /**
                 * Emits a path-recalc event for every path covering one of `tileKeys`.
                 * @private
                 * @param {number[]} tileKeys
                 * @returns {void}
                 */
                _emitPathRecalcs(tileKeys) {
                    for (const path of this._pathsCovering(tileKeys)) {
                        this.engine.emitEvent(this._pathRecalcEvent(path));
                    }
                }
        
                /**
                 * Re-emits the item rows of every path covering one of `tileKeys`, after the path-recalc.
                 * @private
                 * @param {number[]} tileKeys
                 * @returns {void}
                 */
                _emitPathItems(tileKeys) {
                    for (const path of this._pathsCovering(tileKeys)) {
                        // Re-sync (snap), not upsert (glide): the edit re-rowed the items but didn't move them.
                        for (const item of this._unloadItems(path.slot)) {
                            this.engine.emitEvent(this._itemSyncEvent(path, item.id, item.gap, item.type));
                        }
                    }
                }
        
                /**
                 * The path-recalc event: belt ids in path order (head last) and out-port id, routed by the head tile.
                 * @private
                 * @param {object} path
                 * @returns {BeltPathRecalculateEvent}
                 */
                _pathRecalcEvent(path) {
                    const parts = [...path.beltIds].reverse();
                    return new BeltPathRecalculateEvent(path.headX, path.headY, parts, path.outPort);
                }
        
                /**
                 * The client path id (head belt id) and head tile.
                 * @private
                 * @param {object} path
                 * @returns {{pathId: number, x: number, y: number}}
                 */
                _headInfo(path) {
                    return {
                        pathId: path.beltIds[0],
                        x: path.headX,
                        y: path.headY,
                    };
                }
        
                /**
                 * Buffers the upsert for the item in store cell `cell`; an unobserved path reads none of its fields.
                 * @private
                 * @param {Map<number, BeltItemBatchEvent>} batches
                 * @param {number} slot
                 * @param {number} cell
                 * @returns {void}
                 */
                _bufferItemAt(batches, slot, cell) {
                    if (!this._observedAt(slot)) {
                        return;
                    }
                    const head = this._headInfo(this.paths[slot]);
                    this._itemBatch(batches, head).addUpsert(
                        head.pathId,
                        this._items.ids[cell],
                        this._items.gaps[cell],
                        this._items.types[cell],
                    );
                }
        
                /**
                 * The batch collecting a path head's chunk, created on first use.
                 * @private
                 * @param {Map<number, BeltItemBatchEvent>} batches
                 * @param {{pathId: number, x: number, y: number}} head
                 * @returns {BeltItemBatchEvent}
                 */
                _itemBatch(batches, head) {
                    const chunk = _sdk.chunkId(head.x, head.y);
                    const existing = batches.get(chunk);
                    if (existing !== undefined) {
                        return existing;
                    }
                    const batch = new BeltItemBatchEvent(head.x, head.y);
                    batches.set(chunk, batch);
                    return batch;
                }
        
        
                /**
                 * Whether the path in `slot` has a watcher, cached per observation generation.
                 * @private
                 * @param {number} slot
                 * @returns {boolean}
                 */
                _observedAt(slot) {
                    const generation = this.engine.observerGeneration;
                    if (this._colObservedGen[slot] === generation) {
                        return this._colObserved[slot] === 1;
                    }
                    const path = this.paths[slot];
                    const observed = path.belts !== undefined && this.engine.observesTile(path.headX, path.headY);
                    this._colObservedGen[slot] = generation;
                    this._colObserved[slot] = observed ? 1 : 0;
                    return observed;
                }
        
                /**
                 * The re-sync for one of a path's items: a snap in place.
                 * @private
                 * @param {object} path
                 * @param {number} itemId
                 * @param {number} gap
                 * @param {number} type
                 * @returns {BeltItemSyncEvent}
                 */
                _itemSyncEvent(path, itemId, gap, type) {
                    const head = this._headInfo(path);
                    return new BeltItemSyncEvent(head.x, head.y, head.pathId, itemId, gap, type);
                }
        
                /**
                 * Buffers the delete for the popping lead item; an unobserved path reads nothing.
                 * @private
                 * @param {Map<number, BeltItemBatchEvent>} batches
                 * @param {number} slot
                 * @param {number} cell
                 * @returns {void}
                 */
                _bufferPoppedItem(batches, slot, cell) {
                    if (!this._observedAt(slot)) {
                        return;
                    }
                    const head = this._headInfo(this.paths[slot]);
                    this._itemBatch(batches, head).addDelete(head.pathId, this._items.ids[cell]);
                }
        
                /**
                 * @private
                 * @param {object} path
                 * @returns {void}
                 */
                _emitItemReset(path) {
                    const head = this._headInfo(path);
                    this.engine.emitEvent(new BeltItemResetEvent(head.x, head.y, head.pathId));
                }
        
                /**
                 * Removes the belt at (x, y) facing `direction`, rebuilding the surviving runs on each side.
                 * @param {number} x
                 * @param {number} y
                 * @param {number} direction
                 * @returns {void}
                 */
                removeBelt(x, y, direction) {
                    const belt = this._beltAt(x, y, direction);
                    if (belt === undefined) {
                        return;
                    }
                    const removedId = belt.id;
                    this.engine.destroyCells([{x, y, layer: beltPositionLayer(belt.type, direction)}]);
        
                    // Anchors for the surviving runs, captured while the flow links are intact.
                    const neighbors = [];
                    const ahead = this._flowInto(belt);
                    if (ahead !== undefined) {
                        neighbors.push(ahead);
                    }
                    for (const d of [_sdk.Direction.UP, _sdk.Direction.RIGHT, _sdk.Direction.DOWN, _sdk.Direction.LEFT]) {
                        for (const feeder of this._beltsAt(x - _sdk.Direction.dx(d), y - _sdk.Direction.dy(d))) {
                            if (this._flowInto(feeder) === belt) {
                                neighbors.push(feeder);
                            }
                        }
                    }
        
                    // Capture the holding path before dropping it, so each sub-run keeps the items on its belts.
                    const held = this._pathByBeltId.get(removedId);
                    const source = held === undefined ? [] : [held];
                    if (held !== undefined) {
                        this._forgetPath(held);
                    }
                    this._removeBeltObject(belt);
        
                    // Rebuild each surviving neighbor's run into its own path, carrying its items.
                    const covered = new Set();
                    const affected = [];
                    for (const neighbor of neighbors) {
                        if (covered.has(neighbor.id) || this.beltById(neighbor.id) === null) {
                            continue;
                        }
                        const run = this._collectRun(neighbor);
                        const {removed, orphans} = this._removePathsOverlapping(run);
                        const sources = [...source, ...removed];
                        this._rebuildSubrun(run, sources);
                        for (const runBelt of run) {
                            covered.add(runBelt.id);
                            affected.push(_sdk.tileId(runBelt.x, runBelt.y));
                        }
                        for (const runBelt of this._rebuildOrphans(orphans, run, sources)) {
                            affected.push(_sdk.tileId(runBelt.x, runBelt.y));
                        }
                    }
                    this._emitPathRecalcs(affected);
                    this._emitPathItems(affected);
                }
        
                /**
                 * Removes the belt with client-facing `id`, if it is one of this module's belts.
                 * @param {number} id
                 * @returns {boolean} whether a belt was removed
                 */
                removeBeltById(id) {
                    const target = this.beltById(id);
                    if (target === null) {
                        return false;
                    }
                    this.removeBelt(target.x, target.y, target.direction);
                    return true;
                }
        
                /**
                 * The undergrounds buried in `ramp`'s tunnel (not the paired ramp).
                 * @param {object} ramp
                 * @returns {object[]}
                 */
                tunnelUndergrounds(ramp) {
                    const undergrounds = [];
                    const step = ramp.type === BELT_RAMP_DOWN
                        ? belt => this._flowInto(belt)
                        : belt => this._chosenUpstream(belt);
                    let current = step(ramp);
                    while (current !== undefined && current.type === BELT_UNDERGROUND) {
                        undergrounds.push(current);
                        current = step(current);
                    }
                    return undergrounds;
                }
        
                /**
                 * The placed belt with client-facing `id`, or null.
                 * @param {number} id
                 * @returns {{x:number, y:number, direction:number, type:number, id:number}|null}
                 */
                beltById(id) {
                    const found = this._beltById.get(id);
                    if (found === undefined) {
                        return null;
                    }
                    return found;
                }
        
                /**
                 * Splits a run (ordered head -> tail) into maximal contiguous same-chunk segments.
                 * @private
                 * @param {{x:number, y:number}[]} run
                 * @returns {{x:number, y:number}[][]}
                 */
                _segmentByChunk(run) {
                    const segments = [];
                    let current = [];
                    let currentChunk = null;
                    for (const cell of run) {
                        const chunk = _sdk.chunkId(cell.x, cell.y);
                        if (chunk !== currentChunk && current.length > 0) {
                            segments.push(current);
                            current = [];
                        }
                        currentChunk = chunk;
                        current.push(cell);
                    }
                    if (current.length > 0) {
                        segments.push(current);
                    }
                    return segments;
                }
        
                /**
                 * The path's per-half-tile occupancy, indexed from the input edge.
                 * @private
                 * @param {object} path
                 * @returns {number[]}
                 */
                _occupancyFromInput(path) {
                    const occ = new Array(path.length).fill(GAP);
                    // Item gaps count from the output edge inward, so walk that way and mirror each index.
                    let pos = 0;
                    for (const item of path.items) {
                        pos += item.gap;
                        occ[path.length - 1 - pos] = item.type;
                        pos += 1;
                    }
                    return occ;
                }
        
                /**
                 * Rebuilds `{items, headGap}` from an input-indexed occupancy slice, walking in from the output edge.
                 * @private
                 * @param {number[]} occ
                 * @returns {{items:object[], headGap:number}}
                 */
                _itemsFromOccupancy(occ) {
                    const items = [];
                    let gap = 0;
                    for (let i = occ.length - 1; i >= 0; i -= 1) {
                        if (occ[i] === GAP) {
                            gap += 1;
                            continue;
                        }
                        items.push({id: this._nextItemId, type: occ[i], gap});
                        this._nextItemId += 1;
                        gap = 0;
                    }
                    return {items, headGap: gap};
                }
        
                /**
                 * The items for a run merging removed paths; a buried resting port item re-enters at its internal boundary.
                 * @private
                 * @param {object[]} run - the merged run's belts, head -> tail
                 * @param {object[]} removed - the paths folded into it
                 * @returns {{items:object[], headGap:number}}
                 */
                _mergedItems(run, removed) {
                    const newIndex = new Map(run.map((belt, i) => [belt.id, i]));
                    const occ = new Array(run.length * 2 - 1).fill(GAP);
        
                    for (const path of removed) {
                        const sourceOcc = this._occupancyFromInput(path);
                        for (const [oldIdx, id] of path.beltIds.entries()) {
                            const j = newIndex.get(id);
                            if (j === undefined) {
                                continue;
                            }
                            // Output half carries the content; an input half carries over only when both runs have one.
                            let newSlot = 2 * j;
                            if (j === 0) {
                                newSlot = 0;
                            }
                            let oldSlot = 2 * oldIdx;
                            if (oldIdx === 0) {
                                oldSlot = 0;
                            }
                            occ[newSlot] = sourceOcc[oldSlot];
                            if (j > 0 && oldIdx > 0) {
                                occ[2 * j - 1] = sourceOcc[2 * oldIdx - 1];
                            }
                        }
        
                        // A resting out-port item buried by the merge re-enters at the downstream belt's input half.
                        const outItem = this.engine.Port.item[path.outPort];
                        const tail = newIndex.get(path.beltIds[path.beltIds.length - 1]);
                        if (outItem !== _sdk.EMPTY && tail !== undefined && tail + 1 < run.length) {
                            occ[2 * (tail + 1) - 1] = outItem;
                            this.engine.setPortItem(path.outPort, _sdk.EMPTY);
                        }
                        // A resting in-port item buried by the merge re-enters at the head belt's input half.
                        const inItem = this.engine.Port.item[path.inPort];
                        const head = newIndex.get(path.beltIds[0]);
                        if (inItem !== _sdk.EMPTY && head !== undefined && head > 0) {
                            occ[2 * head - 1] = inItem;
                            this.engine.setPortItem(path.inPort, _sdk.EMPTY);
                        }
                    }
        
                    return this._itemsFromOccupancy(occ);
                }
        
                /**
                 * The items carried onto a sub-run split off `sourcePath`; empty unless a contiguous slice of the source.
                 * @private
                 * @param {object} sourcePath
                 * @param {object[]} subRunBelts
                 * @returns {{items:object[], headGap?:number}}
                 */
                _carryItemsForSubrun(sourcePath, subRunBelts) {
                    const indices = subRunBelts.map(belt => sourcePath.beltIds.indexOf(belt.id));
                    const a = Math.min(...indices);
                    const b = Math.max(...indices);
                    if (indices.some(index => index < 0) || indices.length !== b - a + 1) {
                        return {items: []};
                    }
                    const occ = this._occupancyFromInput(sourcePath);
                    const startSlot = a === 0 ? 0 : 2 * a;
                    return this._itemsFromOccupancy(occ.slice(startSlot, 2 * b + 1));
                }
        
                /**
                 * A new path record over `runBelts` (head -> tail) with the given items/head-gap.
                 * @private
                 * @param {object[]} runBelts
                 * @param {{items:{id:number, type:number, gap:number}[], headGap?:number}} state
                 * @returns {object}
                 */
                _makePath(runBelts, {items, headGap}) {
                    const ports = this._pathPorts(runBelts);
                    let inPort = ports.inPort;
                    const outPort = ports.outPort;
                    // A closed loop shares one port for both ends, so the popped lead re-ingests and items circulate.
                    if (runBelts.length > 1 && this._flowInto(runBelts[runBelts.length - 1]) === runBelts[0]) {
                        inPort = outPort;
                    }
                    const length = runBelts.length * 2 - 1;
                    let initialHeadGap = headGap;
                    if (headGap === undefined) {
                        initialHeadGap = length;
                    }
                    const eid = this.engine.world.addEntity();
                    this.engine.world.addComponent(eid, PATH_MARKER);
                    return {
                        id: eid,
                        belts: runBelts.map(belt => _sdk.tileId(belt.x, belt.y)),
                        beltIds: runBelts.map(belt => belt.id),
                        headX: runBelts[0].x,
                        headY: runBelts[0].y,
                        tailX: runBelts[runBelts.length - 1].x,
                        tailY: runBelts[runBelts.length - 1].y,
                        inPort,
                        outPort,
                        length,
                        initialHeadGap,
                        items,
                    };
                }
        
                /**
                 * Builds a per-chunk chain of empty seam-connected paths (each segment's out-port is the next's in-port).
                 * @private
                 * @param {object[][]} segments - the run's belts split into per-chunk segments, head -> tail
                 * @returns {{id:number, inPort:number, outPort:number, length:number, segments:number[]}}
                 */
                _buildEmptyChain(segments) {
                    const built = segments.map(segment => this._makePath(segment, {items: []}));
                    for (const path of built) {
                        this._trackPath(path);
                    }
        
                    return {
                        id: built[0].id,
                        inPort: built[0].inPort,
                        outPort: built[built.length - 1].outPort,
                        length: built.reduce((sum, path) => sum + path.length, 0),
                        segments: built.map(path => path.id),
                    };
                }
        
                /**
                 * The run's in/out edge ports via {@link GameEngine#portAt}, so seams and adjacent objects adopt them.
                 * @private
                 * @param {object[]} runBelts - the run's belts, head -> tail
                 * @returns {{inPort:number, outPort:number}}
                 */
                _pathPorts(runBelts) {
                    const head = runBelts[0];
                    const tail = runBelts[runBelts.length - 1];
                    return {
                        inPort: this.engine.portAt(head.x, head.y, head.direction),
                        outPort: this.engine.portAt(
                            tail.x + _sdk.Direction.dx(tail.direction),
                            tail.y + _sdk.Direction.dy(tail.direction),
                            tail.direction,
                        ),
                    };
                }
        
                /**
                 * Builds the single-chunk run into one path, preserving items when it end-extends one removed path.
                 * @private
                 * @param {object[]} run - the run's belts, head -> tail
                 * @param {object} placed - the belt just placed
                 * @param {object[]} removed - the paths just dropped
                 * @returns {{id:number, inPort:number, outPort:number, length:number, segments:number[]}}
                 */
                _buildSingleChunk(run, placed, removed) {
                    const runKeys = run.map(belt => _sdk.tileId(belt.x, belt.y));
                    const newKey = _sdk.tileId(placed.x, placed.y);
        
                    // Only extending one path at an end preserves its in-flight items; anything else rebuilds empty.
                    let items = [];
                    let headGap = run.length * 2 - 1;
                    const extension = removed.length === 1 && this._isEndExtension(runKeys, removed[0].belts, newKey)
                        ? removed[0]
                        : null;
                    if (extension !== null) {
                        const old = extension;
                        if (runKeys[0] === newKey) {
                            // Head extension: the new belt is headroom; items keep their distance from the output edge.
                            items = old.items;
                            headGap = old.initialHeadGap + 2;
                        } else {
                            // Tail extension: items keep their distance from the input edge.
                            const carried = old.items;
                            const resting = this.engine.Port.item[old.outPort];
                            if (resting !== _sdk.EMPTY) {
                                // A resting out-port item re-enters one half-tile from the moved out-port, keeping its position.
                                items = [{id: this._nextItemId, type: resting, gap: 1}, ...carried];
                                this._nextItemId += 1;
                                headGap = old.initialHeadGap;
                                this.engine.setPortItem(old.outPort, _sdk.EMPTY);
                            } else if (carried.length === 0) {
                                // Empty path: all the new space is headroom.
                                items = [];
                                headGap = old.initialHeadGap + 2;
                            } else {
                                // In-flight items: the two new half-tiles widen the lead item's gap.
                                carried[0].gap += 2;
                                items = carried;
                                headGap = old.initialHeadGap;
                            }
                        }
                    } else if (removed.length > 0) {
                        // A merge: reconstruct the items from each belt's half-tile content.
                        ({items, headGap} = this._mergedItems(run, removed));
                    }
        
                    // Renumber in array order: the client sorts items by id, ascending = output -> input.
                    items = items.map(item => {
                        const renumbered = {id: this._nextItemId, type: item.type, gap: item.gap};
                        this._nextItemId += 1;
                        return renumbered;
                    });
        
                    const path = this._makePath(run, {items, headGap});
                    this._trackPath(path);
        
                    return {id: path.id, inPort: path.inPort, outPort: path.outPort, length: path.length, segments: [path.id]};
                }
        
                /**
                 * Whether `runKeys` is `oldBelts` plus `newKey` appended at one end (a pure extension).
                 * @private
                 * @param {number[]} runKeys - the run ordered head -> tail
                 * @param {number[]} oldBelts
                 * @param {number} newKey
                 * @returns {boolean}
                 */
                _isEndExtension(runKeys, oldBelts, newKey) {
                    if (runKeys.length !== oldBelts.length + 1) {
                        return false;
                    }
                    const withoutNew = runKeys.filter(key => key !== newKey);
                    return withoutNew.every((key, index) => key === oldBelts[index]);
                }
        
                /**
                 * The path currently covering tile (x, y), or null.
                 * @param {number} x
                 * @param {number} y
                 * @returns {{id:number, inPort:number, outPort:number}|null}
                 */
                pathAt(x, y) {
                    const held = this._pathsByTile.get(_sdk.tileId(x, y));
                    const path = Array.isArray(held) ? held[0] : held;
                    if (path === undefined) {
                        return null;
                    }
                    return {id: path.id, inPort: path.inPort, outPort: path.outPort};
                }
        
                /**
                 * The run through `belt`, head -> tail; a junction ends the run where the downstream's chosen upstream diverges.
                 * @private
                 * @param {object} belt
                 * @returns {object[]} the run's belts, head -> tail
                 */
                _collectRun(belt) {
                    // Walk upstream to the head, stopping at a loop or a diverging chosen upstream.
                    let head = belt;
                    const upstream = new Set([head.id]);
                    for (;;) {
                        const up = this._chosenUpstream(head);
                        if (up === undefined || this._flowInto(up) !== head || upstream.has(up.id)) {
                            break;
                        }
                        upstream.add(up.id);
                        head = up;
                    }
        
                    // Collect downstream from the head, stopping where the flow leaves the run.
                    const run = [];
                    const seen = new Set();
                    let current = head;
                    while (current !== undefined && !seen.has(current.id)) {
                        seen.add(current.id);
                        run.push(current);
                        const next = this._flowInto(current);
                        if (next === undefined || this._chosenUpstream(next) !== current) {
                            break;
                        }
                        current = next;
                    }
                    return run;
                }
        
                /**
                 * Drops any path sharing a belt id with `run` (a crossing perpendicular path survives).
                 * @private
                 * @param {object[]} run - the run's belts
                 * @returns {{removed: object[], orphans: object[]}}
                 */
                _removePathsOverlapping(run) {
                    const runIds = new Set(run.map(belt => belt.id));
                    const overlapping = new Set();
                    for (const belt of run) {
                        const path = this._pathByBeltId.get(belt.id);
                        if (path !== undefined) {
                            overlapping.add(path);
                        }
                    }
                    if (overlapping.size === 0) {
                        return {removed: [], orphans: []};
                    }
        
                    const removed = [];
                    const orphans = [];
                    for (const path of overlapping) {
                        for (const id of path.beltIds) {
                            if (!runIds.has(id)) {
                                const belt = this.beltById(id);
                                if (belt !== null) {
                                    orphans.push(belt);
                                }
                            }
                        }
                        this._forgetPath(path);
                        removed.push(path);
                    }
                    return {removed, orphans};
                }
        
                /**
                 * The port eids the live paths still reference, so the engine's port sweep keeps them.
                 * @private
                 * @returns {number[]}
                 */
                _pinnedPorts() {
                    const ports = [];
                    for (const path of this.paths) {
                        ports.push(path.inPort, path.outPort);
                    }
                    return ports;
                }
        
                /**
                 * Records a new path and registers its out-port for item rendering (drawn at the tail tile).
                 * @private
                 * @param {object} path
                 * @returns {void}
                 */
                _trackPath(path) {
                    this._pushPath(path);
                    this._slotByInPort.column[path.inPort] = path.slot;
                    this._indexPath(path);
                    this.engine.registerRenderedPort(path.outPort, path.tailX, path.tailY);
                }
        
                /**
                 * Appends a path to `paths`, recording its slot.
                 * @private
                 * @param {object} path
                 * @returns {void}
                 */
                _pushPath(path) {
                    const slot = this.paths.length;
                    this._growColumns(slot);
                    path.slot = slot;
                    this.paths.push(path);
                    this._colInPort[slot] = path.inPort;
                    this._colOutPort[slot] = path.outPort;
                    this._colHeadGap[slot] = path.initialHeadGap;
                    this._colObservedGen[slot] = 0;
                    this._loadItems(slot, path);
                }
        
                /**
                 * Moves seed items into a slab as wide as the path (it can never hold more items than half-tiles).
                 * @private
                 * @param {number} slot
                 * @param {object} path
                 * @returns {void}
                 */
                _loadItems(slot, path) {
                    const seed = path.items;
                    const base = this._items.allocate(path.length);
                    this._colItemBase[slot] = base;
                    this._colItemSlab[slot] = path.length;
                    this._colItemHead[slot] = 0;
                    this._colCount[slot] = seed.length;
                    const ids = this._items.ids;
                    const types = this._items.types;
                    const gaps = this._items.gaps;
                    for (let index = 0; index < seed.length; index += 1) {
                        ids[base + index] = seed[index].id;
                        types[base + index] = seed[index].type;
                        gaps[base + index] = seed[index].gap;
                    }
                    path.items = null;
                    this._refreshLeadColumns(slot);
                }
        
                /**
                 * The path's items output edge -> input edge, read out of its slab.
                 * @private
                 * @param {number} slot
                 * @returns {{id:number, type:number, gap:number}[]}
                 */
                _unloadItems(slot) {
                    const base = this._colItemBase[slot];
                    const slab = this._colItemSlab[slot];
                    const head = this._colItemHead[slot];
                    const count = this._colCount[slot];
                    const items = [];
                    for (let index = 0; index < count; index += 1) {
                        let at = head + index;
                        if (at >= slab) {
                            at -= slab;
                        }
                        items.push({
                            id: this._items.ids[base + at],
                            type: this._items.types[base + at],
                            gap: this._items.gaps[base + at],
                        });
                    }
                    return items;
                }
        
                /**
                 * The items of `path`, live or dropped.
                 * @param {object} path
                 * @returns {{id:number, type:number, gap:number}[]} ordered output edge -> input edge
                 */
                itemsOf(path) {
                    const slot = path.slot;
                    return slot === undefined ? path.items : this._unloadItems(slot);
                }
        
                /**
                 * @param {object} path
                 * @returns {number} how many items `path` carries
                 */
                itemCountOf(path) {
                    const slot = path.slot;
                    return slot === undefined ? path.items.length : this._colCount[slot];
                }
        
                /**
                 * Grows the hot columns so `slot` is addressable.
                 * @private
                 * @param {number} slot
                 * @returns {void}
                 */
                _growColumns(slot) {
                    if (slot < this._pathCapacity) {
                        return;
                    }
                    let capacity = this._pathCapacity;
                    while (capacity <= slot) {
                        capacity *= 2;
                    }
                    for (const name of ["_colInPort", "_colOutPort", "_colHeadGap", "_colCount", "_colLeadGap", "_colFirstGap", "_colObservedGen", "_colItemBase", "_colItemSlab", "_colItemHead"]) {
                        const grown = new Int32Array(capacity);
                        grown.set(this[name]);
                        this[name] = grown;
                    }
                    const grownObserved = new Uint8Array(capacity);
                    grownObserved.set(this._colObserved);
                    this._colObserved = grownObserved;
                    this._pathCapacity = capacity;
                }
        
                /**
                 * The first item at or after `from` with room ahead, or -1; it only walks forward, so amortized O(1).
                 * @private
                 * @param {number} slot
                 * @param {number} from
                 * @returns {number}
                 */
                _nextPositiveGap(slot, from) {
                    const base = this._colItemBase[slot];
                    const slab = this._colItemSlab[slot];
                    const head = this._colItemHead[slot];
                    const count = this._colCount[slot];
                    const gaps = this._items.gaps;
                    for (let index = from; index < count; index += 1) {
                        let at = head + index;
                        if (at >= slab) {
                            at -= slab;
                        }
                        if (gaps[base + at] > 0) {
                            return index;
                        }
                    }
                    return -1;
                }
        
                /**
                 * Recomputes lead columns by scanning the slab; only for wholesale item sets, the tick updates in place.
                 * @private
                 * @param {number} slot
                 * @returns {void}
                 */
                _refreshLeadColumns(slot) {
                    const count = this._colCount[slot];
                    if (count === 0) {
                        this._colLeadGap[slot] = -1;
                        this._colFirstGap[slot] = -1;
                        return;
                    }
                    const base = this._colItemBase[slot];
                    const slab = this._colItemSlab[slot];
                    const head = this._colItemHead[slot];
                    const gaps = this._items.gaps;
                    this._colLeadGap[slot] = gaps[base + head];
                    this._colFirstGap[slot] = -1;
                    for (let index = 0; index < count; index += 1) {
                        let at = head + index;
                        if (at >= slab) {
                            at -= slab;
                        }
                        if (gaps[base + at] > 0) {
                            this._colFirstGap[slot] = index;
                            return;
                        }
                    }
                }
        
                /**
                 * Drops a path from `paths` by moving the last entry into its slot.
                 * @private
                 * @param {object} path
                 * @returns {void}
                 */
                _popPath(path) {
                    const slot = path.slot;
                    if (slot === undefined) {
                        return;
                    }
                    // Snapshot live head-gap and items onto the record; the replacing edit still reads a dropped path.
                    path.initialHeadGap = this._colHeadGap[slot];
                    path.items = this._unloadItems(slot);
                    this._items.free(this._colItemBase[slot], this._colItemSlab[slot]);
                    const lastSlot = this.paths.length - 1;
                    const last = this.paths[lastSlot];
                    this.paths[slot] = last;
                    last.slot = slot;
                    this._colInPort[slot] = this._colInPort[lastSlot];
                    this._colOutPort[slot] = this._colOutPort[lastSlot];
                    this._colHeadGap[slot] = this._colHeadGap[lastSlot];
                    this._colObserved[slot] = this._colObserved[lastSlot];
                    this._colObservedGen[slot] = this._colObservedGen[lastSlot];
                    this._colCount[slot] = this._colCount[lastSlot];
                    this._colLeadGap[slot] = this._colLeadGap[lastSlot];
                    this._colFirstGap[slot] = this._colFirstGap[lastSlot];
                    this._colItemBase[slot] = this._colItemBase[lastSlot];
                    this._colItemSlab[slot] = this._colItemSlab[lastSlot];
                    this._colItemHead[slot] = this._colItemHead[lastSlot];
                    // The moved path's in-port now maps to its new slot.
                    this._slotByInPort.column[last.inPort] = slot;
                    this.paths.pop();
                    // Last, so popping the tail (where the path is its own `last`) still leaves it slotless.
                    path.slot = undefined;
                }
        
                /**
                 * Adds a path to the tile and belt-id indexes.
                 * @private
                 * @param {object} path
                 * @returns {void}
                 */
                _indexPath(path) {
                    for (const key of path.belts) {
                        const covering = this._pathsByTile.get(key);
                        if (covering === undefined) {
                            this._pathsByTile.set(key, path);
                        } else if (Array.isArray(covering)) {
                            if (!covering.includes(path)) {
                                covering.push(path);
                            }
                        } else if (covering !== path) {
                            this._pathsByTile.set(key, [covering, path]);
                        }
                    }
                    for (const id of path.beltIds) {
                        this._pathByBeltId.set(id, path);
                    }
                    _sdk.getOrCreate(this._pathsByChunk, _sdk.chunkId(path.headX, path.headY), () => new Set()).add(path);
                }
        
                /**
                 * @private
                 * @param {object} path
                 * @returns {void}
                 */
                _unindexPath(path) {
                    for (const key of path.belts) {
                        const covering = this._pathsByTile.get(key);
                        if (covering === undefined) {
                            continue;
                        }
                        if (!Array.isArray(covering)) {
                            if (covering === path) {
                                this._pathsByTile.delete(key);
                            }
                            continue;
                        }
                        const at = covering.indexOf(path);
                        if (at !== -1) {
                            covering.splice(at, 1);
                        }
                        if (covering.length === 1) {
                            this._pathsByTile.set(key, covering[0]);
                        } else if (covering.length === 0) {
                            this._pathsByTile.delete(key);
                        }
                    }
                    _sdk.removeFromGroup(this._pathsByChunk, _sdk.chunkId(path.headX, path.headY), path);
                    for (const id of path.beltIds) {
                        if (this._pathByBeltId.get(id) === path) {
                            this._pathByBeltId.delete(id);
                        }
                    }
                }
        
                /**
                 * The distinct paths covering any of `tileKeys`.
                 * @private
                 * @param {number[]} tileKeys
                 * @returns {object[]}
                 */
                _pathsCovering(tileKeys) {
                    const covering = new Set();
                    for (const key of new Set(tileKeys)) {
                        const held = this._pathsByTile.get(key);
                        if (held === undefined) {
                            continue;
                        }
                        if (Array.isArray(held)) {
                            for (const path of held) {
                                covering.add(path);
                            }
                        } else {
                            covering.add(held);
                        }
                    }
                    return [...covering];
                }
        
                /**
                 * Drops a path's indexes, render registration, and its entity.
                 * @private
                 * @param {object} path
                 * @returns {void}
                 */
                _forgetPath(path) {
                    this._popPath(path);
                    this._slotByInPort.column[path.inPort] = NO_SLOT;
                    this._unindexPath(path);
                    this.engine.unregisterRenderedPort(path.outPort);
                    // Clear the client's item sprites for the stale path id.
                    this._emitItemReset(path);
                    this.engine.destroyEntity(path.id);
                }
        
                /**
                 * SUBMIT_INTENTS: a lead item submits its out-port shift; a path with room declares its in-port drainable.
                 * @private
                 * @returns {void}
                 */
                _submitIntents() {
                    const P = this.engine.Port.item;
                    const engine = this.engine;
                    const inPortCol = this._colInPort;
                    const outPortCol = this._colOutPort;
                    const headGapCol = this._colHeadGap;
                    const firstGapCol = this._colFirstGap;
                    const leadGapCol = this._colLeadGap;
                    const slotByInPort = this._slotByInPort.column;
                    const count = this.paths.length;
                    for (let slot = 0; slot < count; slot += 1) {
                        const firstGap = firstGapCol[slot];
                        const inPort = inPortCol[slot];
                        const outPort = outPortCol[slot];
                        const leadIsItem = leadGapCol[slot] === 0;
                        // A fluid port ahead never links: the path holds its lead instead of stranding an item there.
                        if (leadIsItem && !engine.isFluidPort(outPort)) {
                            // Free if empty or the downstream can ingest, so the resolver's chain shifts a packed run at once.
                            const downstream = slotByInPort[outPort];
                            const downstreamCanIngest = downstream !== NO_SLOT
                                && (headGapCol[downstream] > 0 || firstGapCol[downstream] !== -1);
                            engine.submitTransfer(
                                inPort,
                                outPort,
                                P[outPort] === _sdk.EMPTY || downstreamCanIngest,
                                false,
                            );
                        }
                        // A resting fluid payload is refused, so its producer backs up.
                        if (P[inPort] !== _sdk.EMPTY && !engine.isFluid(P[inPort]) && (headGapCol[slot] > 0 || firstGap !== -1)) {
                            engine.submitDrain(inPort, false);
                        }
                    }
                }
        
                /**
                 * POST_RESOLVE: move each path one half-tile, then ingest a resting in-port item at the input edge.
                 * @private
                 * @returns {void}
                 */
                _move() {
                    const P = this.engine.Port.item;
        
                    // Phase 1: move each path one half-tile; out-port writes deferred so a shared seam still
                    // holds last tick's value.
                    const engine = this.engine;
                    const inPortCol = this._colInPort;
                    const outPortCol = this._colOutPort;
                    const headGapCol = this._colHeadGap;
                    const countCol = this._colCount;
                    const leadGapCol = this._colLeadGap;
                    const firstGapCol = this._colFirstGap;
                    const baseCol = this._colItemBase;
                    const slabCol = this._colItemSlab;
                    const headCol = this._colItemHead;
                    const itemTypes = this._items.types;
                    const itemGaps = this._items.gaps;
                    const count = this.paths.length;
                    // Deferred out-port writes, reused across ticks.
                    let popCount = 0;
                    // One batch per chunk, flushed at the end so the pass stays ordered against outside emits.
                    const batches = new Map();
        
                    for (let slot = 0; slot < count; slot += 1) {
                        const firstGap = firstGapCol[slot];
                        const canPop = leadGapCol[slot] === 0 && engine.resolvedUnmanagedDest(outPortCol[slot]);
                        if (!canPop && firstGap === -1) {
                            continue;
                        }
        
                        // Only a moving path reaches into the item store.
                        const base = baseCol[slot];
                        const slab = slabCol[slot];
                        const head = headCol[slot];
                        if (canPop) {
                            this._growPops(popCount);
                            this._popPorts[popCount] = outPortCol[slot];
                            this._popTypes[popCount] = itemTypes[base + head];
                            popCount += 1;
                            this._bufferPoppedItem(batches, slot, base + head);
                            // Gaps are relative: dropping the lead advances everything behind it.
                            const nextHead = head + 1 === slab ? 0 : head + 1;
                            const remaining = countCol[slot] - 1;
                            headCol[slot] = nextHead;
                            countCol[slot] = remaining;
                            leadGapCol[slot] = remaining === 0 ? -1 : itemGaps[base + nextHead];
                            firstGapCol[slot] = firstGap === -1 ? -1 : firstGap - 1;
                        } else {
                            // Gaps are relative: one write advances this item and everything behind it.
                            let at = head + firstGap;
                            if (at >= slab) {
                                at -= slab;
                            }
                            const gap = itemGaps[base + at] - 1;
                            itemGaps[base + at] = gap;
                            this._bufferItemAt(batches, slot, base + at);
                            if (firstGap === 0) {
                                leadGapCol[slot] = gap;
                            }
                            // Amortized O(1): the walk never revisits an item.
                            if (gap === 0) {
                                firstGapCol[slot] = this._nextPositiveGap(slot, firstGap + 1);
                            }
                        }
                        headGapCol[slot] += 1;
                    }
        
                    // Phase 2: ingest each path's resting in-port item at the input edge; fluids are refused.
                    const itemIds = this._items.ids;
                    for (let slot = 0; slot < count; slot += 1) {
                        const inPort = inPortCol[slot];
                        if (headGapCol[slot] === 0 || P[inPort] === _sdk.EMPTY || engine.isFluid(P[inPort])) {
                            continue;
                        }
                        const type = P[inPort];
                        // The item lands on the input edge, carrying the headroom ahead of it.
                        const gap = headGapCol[slot] - 1;
                        const id = this._nextItemId;
                        this._nextItemId += 1;
                        const slab = slabCol[slot];
                        const items = countCol[slot];
                        if (firstGapCol[slot] === -1 && gap > 0) {
                            firstGapCol[slot] = items;
                        }
                        let at = headCol[slot] + items;
                        if (at >= slab) {
                            at -= slab;
                        }
                        const cell = baseCol[slot] + at;
                        itemIds[cell] = id;
                        itemTypes[cell] = type;
                        itemGaps[cell] = gap;
                        countCol[slot] = items + 1;
                        if (items === 0) {
                            leadGapCol[slot] = gap;
                        }
                        this._bufferItemAt(batches, slot, cell);
                        headGapCol[slot] = 0;
                        engine.setPortItem(inPort, _sdk.EMPTY);
                    }
        
                    // Phase 3: write this tick's pops into their out-ports.
                    for (let i = 0; i < popCount; i += 1) {
                        engine.setPortItem(this._popPorts[i], this._popTypes[i]);
                    }
        
                    for (const batch of batches.values()) {
                        engine.emitEvent(batch);
                    }
                }
        
                /**
                 * Grows the deferred-pop columns so row `count` is addressable.
                 * @private
                 * @param {number} count
                 * @returns {void}
                 */
                _growPops(count) {
                    if (count < this._popCapacity) {
                        return;
                    }
                    let capacity = this._popCapacity;
                    while (capacity <= count) {
                        capacity *= 2;
                    }
                    for (const name of ["_popPorts", "_popTypes"]) {
                        const grown = new Int32Array(capacity);
                        grown.set(this[name]);
                        this[name] = grown;
                    }
                    this._popCapacity = capacity;
                }
        
                /**
                 * The events recreating `chunk`'s paths and in-flight items for a just-subscribed session.
                 * @param {number} chunk
                 * @returns {object[]}
                 */
                chunkSync(chunk) {
                    const origin = _sdk.chunkOrigin(chunk);
                    let paths = null;
                    let items = null;
                    let chunkPaths = this._pathsByChunk.get(chunk);
                    if (chunkPaths === undefined) {
                        chunkPaths = [];
                    }
                    for (const path of chunkPaths) {
                        const head = this._headInfo(path);
                        if (paths === null) {
                            paths = new BeltPathBatchEvent(origin.x, origin.y);
                        }
                        paths.add(path.headX, path.headY, [...path.beltIds].reverse(), path.outPort);
                        for (const item of this._unloadItems(path.slot)) {
                            if (items === null) {
                                items = new BeltItemBatchEvent(head.x, head.y);
                            }
                            items.addUpsert(head.pathId, item.id, item.gap, item.type);
                        }
                    }
                    // Paths before items: the client positions a path's items against the path.
                    return [paths, items].filter(batch => batch !== null);
                }
        
                /**
                 * Serialize hook: flushes the JS path runtime into the snapshot components, clearing prior save entities.
                 * @private
                 * @returns {void}
                 */
                _materialize() {
                    for (const def of [this._itemDef, this._beltDef, this._pathDef]) {
                        for (const eid of this.engine.entitiesWith(def)) {
                            this.engine.destroyEntity(eid);
                        }
                    }
        
                    const BP = this._pathDef.store;
                    const B = this._beltDef.store;
                    const I = this._itemDef.store;
                    for (const path of this.paths) {
                        const pathEid = this.engine.createEntity(this._pathDef);
                        BP.inPort[pathEid] = path.inPort;
                        BP.outPort[pathEid] = path.outPort;
                        BP.headGap[pathEid] = this._colHeadGap[path.slot];
                        BP.length[pathEid] = path.length;
        
                        for (const [index, beltId] of path.beltIds.entries()) {
                            const memberEid = this.engine.createEntity(this._beltDef);
                            B.path[memberEid] = pathEid;
                            B.seq[memberEid] = index;
                            B.objectId[memberEid] = beltId;
                        }
        
                        for (const [seq, item] of this._unloadItems(path.slot).entries()) {
                            const itemEid = this.engine.createEntity(this._itemDef);
                            I.path[itemEid] = pathEid;
                            I.seq[itemEid] = seq;
                            I.gap[itemEid] = item.gap;
                            I.type[itemEid] = item.type;
                            I.itemId[itemEid] = item.id;
                        }
                    }
        
                    this.engine.globals.beltNextItemId = this._nextItemId;
                }
        
                /**
                 * Clears the belt indexes ahead of a rebuild; belts re-register before the path hook re-links.
                 * @returns {void}
                 */
                resetBelts() {
                    this._belts = new Map();
                    this._beltById = new Map();
                }
        
                /**
                 * Re-registers one placed belt after a load.
                 * @param {{x:number, y:number, direction:number, type:number, id:number}} belt
                 * @returns {void}
                 */
                registerBelt(belt) {
                    this._addBelt(belt);
                }
        
                /**
                 * Rebuild hook: re-links each path from the snapshot components over the re-registered belts.
                 * @private
                 * @returns {void}
                 */
                _reconstruct() {
                    this.paths = [];
                    this._slotByInPort.clear();
                    this._pathsByTile = new Map();
                    this._pathByBeltId = new Map();
                    this._pathsByChunk = new Map();
                    this._nextItemId = this.engine.globals.beltNextItemId;
        
                    const BP = this._pathDef.store;
                    const B = this._beltDef.store;
                    const I = this._itemDef.store;
        
                    const beltsByPath = new Map();
                    for (const eid of this.engine.entitiesWith(this._beltDef)) {
                        const belt = this.beltById(B.objectId[eid]);
                        const pathEid = B.path[eid];
                        if (!beltsByPath.has(pathEid)) {
                            beltsByPath.set(pathEid, []);
                        }
                        beltsByPath.get(pathEid).push({seq: B.seq[eid], belt});
                    }
        
                    const itemsByPath = new Map();
                    for (const eid of this.engine.entitiesWith(this._itemDef)) {
                        const pathEid = I.path[eid];
                        if (!itemsByPath.has(pathEid)) {
                            itemsByPath.set(pathEid, []);
                        }
                        itemsByPath.get(pathEid).push({seq: I.seq[eid], item: {id: I.itemId[eid], type: I.type[eid], gap: I.gap[eid]}});
                    }
        
                    for (const pathEid of this.engine.entitiesWith(this._pathDef)) {
                        const belts = (beltsByPath.get(pathEid) || []).sort((a, b) => a.seq - b.seq).map(entry => entry.belt);
                        const items = (itemsByPath.get(pathEid) || []).sort((a, b) => a.seq - b.seq).map(entry => entry.item);
                        const path = {
                            id: pathEid,
                            belts: belts.map(belt => _sdk.tileId(belt.x, belt.y)),
                            beltIds: belts.map(belt => belt.id),
                            headX: belts[0].x,
                            headY: belts[0].y,
                            tailX: belts[belts.length - 1].x,
                            tailY: belts[belts.length - 1].y,
                            inPort: BP.inPort[pathEid],
                            outPort: BP.outPort[pathEid],
                            length: BP.length[pathEid],
                            initialHeadGap: BP.headGap[pathEid],
                            items,
                        };
                        this._trackPath(path);
                    }
                }
        
        
                /**
                 * Debug helper: drops an item onto the first belt path's in-port.
                 * @returns {void}
                 */
                debugInsertItem() {
                    if (this.paths.length > 0) {
                        this.engine.setPortItem(this.paths[0].inPort, 1);
                    }
                }
            }
        
            var m6 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                Belts: Belts
            });
        
            /**
             * A belt cell of one kind: spawn/despawn feed the shared Belts path engine; a ramp pair's tunnel
             * is derived sim-side (spawn fills the span, despawn collapses it).
             */
            class BeltBehavior extends _sdk.AbstractBehavior {
        
                /**
                 * @param {object} config
                 * @param {BeltType} config.beltKind
                 */
                constructor({beltKind}) {
                    super();
                    this.beltKind = beltKind;
                }
        
                install(engine, placed) {
                    engine.provide(Belts, new Belts(engine));
                }
        
                onSpawn(engine, placed, eid, type, message) {
                    const belts = engine.resolve(Belts);
                    if (isRamp(this.beltKind)) {
                        this._fillTunnel(engine, belts, message);
                    }
                    belts.placeBelt(message.x, message.y, message.direction, this.beltKind, placed.objectIdOf(eid));
                }
        
                onDespawn(engine, placed, eid) {
                    const belts = engine.resolve(Belts);
                    const belt = belts.beltById(placed.objectIdOf(eid));
                    if (belt === null) {
                        return;
                    }
                    if (isRamp(belt.type)) {
                        // Buried undergrounds go first, while the ramp's run is still intact to walk.
                        for (const underground of belts.tunnelUndergrounds(belt)) {
                            engine.applyMessage(new _sdk.DeleteObjectMessage(underground.id));
                        }
                    }
                    belts.removeBelt(belt.x, belt.y, belt.direction);
                }
        
                /**
                 * Spawns the undergrounds between a just-placed ramp and its partner; a span past the maximum
                 * length stays unfilled, leaving the ramps unlinked, and occupied cells are skipped.
                 * @private
                 * @param {GameEngine} engine
                 * @param {Belts} belts
                 * @param {CreateObjectMessage} message
                 * @returns {void}
                 */
                _fillTunnel(engine, belts, message) {
                    const partner = belts.rampPartner(message.x, message.y, message.direction, this.beltKind);
                    if (partner === null) {
                        return;
                    }
                    const span = getUndergroundBeltsToCreate(partner, {
                        x: message.x,
                        y: message.y,
                        direction: message.direction,
                        type: this.beltKind,
                    });
                    for (const cell of span) {
                        engine.applyMessage(new _sdk.CreateObjectMessage(BeltUndergroundDefinition.typeId, cell.x, cell.y, message.direction));
                    }
                }
        
                /**
                 * Re-registers every placed belt with the path engine after a load.
                 * @param {GameEngine} engine
                 * @param {PlacedObjects} placed
                 * @returns {void}
                 */
                onRebuild(engine, placed) {
                    const belts = engine.resolve(Belts);
                    belts.resetBelts();
                    const def = placed.def;
                    const placedObject = def.store;
                    const position = engine.Position;
                    for (let row = 0; row < def.count; row += 1) {
                        const behavior = placed.behaviorFor(placedObject.typeId[row]);
                        if (!(behavior instanceof BeltBehavior)) {
                            continue;
                        }
                        const eid = def.eids[row];
                        belts.registerBelt({
                            x: position.x[eid],
                            y: position.y[eid],
                            direction: position.direction[eid],
                            type: behavior.beltKind,
                            id: placedObject.objectId[row],
                        });
                    }
                }
            }
        
            var m5 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                BeltBehavior: BeltBehavior
            });
        
            // One ObjectType per belt kind (the typeId carries the kind on the wire); `bespokeClient` opts
            // out of the derived bundles since BeltDrawLayer/BeltTool stay bespoke.
            class BeltObjectType extends _sdk.ObjectType {
        
                /**
                 * @param {object} config - ObjectType config plus `beltKind`
                 */
                constructor(config) {
                    const {beltKind, ...base} = config;
                    super({
                        ...base,
                        geometry: "1x1",
                        behavior: new BeltBehavior({beltKind}),
                        bespokeClient: true,
                        placement: new _sdk.PlacementRule({conveyor: beltKind === BELT_NORMAL}),
                        inputPorts: [
                            new _sdk.PortDefinition("virtual_left", {x: 0, y: 0, direction: _sdk.Direction.RIGHT}),
                            new _sdk.PortDefinition("virtual_down", {x: 0, y: 0, direction: _sdk.Direction.UP}),
                            new _sdk.PortDefinition("virtual_right", {x: 0, y: 0, direction: _sdk.Direction.LEFT}),
                        ],
                        outputPorts: [
                            new _sdk.PortDefinition("virtual_up", {x: 0, y: -1, direction: _sdk.Direction.UP}, false),
                        ],
                    });
                    this.beltKind = beltKind;
                }
        
                // An underground occupies its axis layer, so it can cross under a surface belt.
                positionLayerTiles(direction) {
                    return [{layer: beltPositionLayer(this.beltKind, direction), cells: this.geometry.tiles(direction)}];
                }
        
                // A ramp/underground never merges from the side: only its straight-axis input (local UP)
                // stays active; outputs are unchanged.
                activePorts(portKind) {
                    if (portKind === "inputPorts" && this.beltKind !== BELT_NORMAL) {
                        return this.inputPorts.filter(port => port.direction === _sdk.Direction.UP);
                    }
                    return this[portKind];
                }
        
                // Ports a surface neighbor can connect to: a ramp buries one end, so RAMP_DOWN exposes only
                // its input, RAMP_UP only its output, and an underground nothing (fully buried).
                surfacePorts(portKind) {
                    if (this.beltKind === BELT_RAMP_DOWN) {
                        if (portKind === "inputPorts") {
                            return this.activePorts(portKind);
                        }
                        return [];
                    }
                    if (this.beltKind === BELT_RAMP_UP) {
                        if (portKind === "outputPorts") {
                            return this.outputPorts;
                        }
                        return [];
                    }
                    if (this.beltKind === BELT_UNDERGROUND) {
                        return [];
                    }
                    return this.activePorts(portKind);
                }
            }
        
            /**
             * Whether an ObjectType is one of the belt kinds.
             * @param {ObjectType} type
             * @returns {boolean}
             */
            function isBeltType(type) {
                return type instanceof BeltObjectType;
            }
        
            const BeltDefinition = new BeltObjectType({
                name: "Belt",
                beltKind: BELT_NORMAL,
                mapColor: MAP_COLOR_BELT,
            });
        
            const BeltRampDownDefinition = new BeltObjectType({
                name: "BeltRampDown",
                beltKind: BELT_RAMP_DOWN,
                mapColor: MAP_COLOR_BELT_RAMP,
            });
        
            const BeltRampUpDefinition = new BeltObjectType({
                name: "BeltRampUp",
                beltKind: BELT_RAMP_UP,
                mapColor: MAP_COLOR_BELT_RAMP,
            });
        
            const BeltUndergroundDefinition = new BeltObjectType({
                name: "BeltUnderground",
                beltKind: BELT_UNDERGROUND,
                overworldVisible: false,
            });
        
            // A 1x2 router; each item flows in_X -> int_X -> out_Y, resting a tick in int_X so it crosses at
            // belt speed.
            const SplitterDefinition = new _sdk.ObjectType({
                name: "Splitter",
                toolId: 4,
                inputPorts: [
                    new _sdk.PortDefinition("in_a", {x: 0, y: 0, direction: _sdk.Direction.UP}),
                    new _sdk.PortDefinition("in_b", {x: 1, y: 0, direction: _sdk.Direction.UP}),
                ],
                outputPorts: [
                    new _sdk.PortDefinition("out_a", {x: 0, y: -1, direction: _sdk.Direction.UP}),
                    new _sdk.PortDefinition("out_b", {x: 1, y: -1, direction: _sdk.Direction.UP}),
                ],
                internalPorts: [
                    new _sdk.PortDefinition("int_a"),
                    new _sdk.PortDefinition("int_b"),
                ],
                geometry: "1x2",
                renderConnections: true,
                textureName: "splitter/1",
                label: "Splitter",
                behavior: new SplitterBehavior(),
            });
        
            // A road cell of the worker network; workers walk it from Housing to machines.
            const RoadDefinition = new _sdk.ObjectType({
                name: "Road",
                toolId: 5,
                geometry: "1x1",
                textureName: "road/0",
                mapColor: MAP_COLOR_ROAD,
                drawLayerIndex: DRAW_LAYER_ROAD,
                directional: false,
                label: "Road",
                behavior: new _sdk.RoadBehavior(),
                placement: new _sdk.PlacementRule({replaceSameKind: true, dragToPlace: true}),
            });
        
            const HousingDefinition = new _sdk.ObjectType({
                name: "Housing",
                toolId: 6,
                geometry: "2x2",
                textureName: "housing/0",
                mapColor: MAP_COLOR_HOUSING,
                directional: false,
                label: "Housing",
                behavior: new _sdk.HousingBehavior({workerSupply: HOUSING_WORKER_SUPPLY}),
                placement: new _sdk.PlacementRule({advanceOnPlace: false}),
            });
        
            var m4 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                BeltDefinition: BeltDefinition,
                BeltRampDownDefinition: BeltRampDownDefinition,
                BeltRampUpDefinition: BeltRampUpDefinition,
                BeltUndergroundDefinition: BeltUndergroundDefinition,
                HousingDefinition: HousingDefinition,
                RoadDefinition: RoadDefinition,
                SplitterDefinition: SplitterDefinition,
                isBeltType: isBeltType
            });
        
            class LogisticsDeclaration extends _sdk.AbstractModDeclaration {
        
                /**
                 * @returns {string}
                 */
                get name() {
                    return "Logistics";
                }
        
                get objectTypes() {
                    // The ramp/underground kinds append after the originals, keeping prior typeIds stable.
                    return [
                        BeltDefinition,
                        SplitterDefinition,
                        RoadDefinition,
                        HousingDefinition,
                        BeltRampDownDefinition,
                        BeltRampUpDefinition,
                        BeltUndergroundDefinition,
                    ];
                }
        
                get wireClasses() {
                    return [
                        BeltPathRecalculateEvent,
                        BeltItemUpsertEvent,
                        BeltItemSyncEvent,
                        BeltItemDeleteEvent,
                        BeltItemResetEvent,
                        BeltItemBatchEvent,
                        BeltPathBatchEvent,
                    ];
                }
        
                get items() {
                    return {3: new _sdk.ItemDefinition("Cargo", "items/1")};
                }
            }
        
            var m0 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                LogisticsDeclaration: LogisticsDeclaration
            });
        
            const coreModules = [m0, m1, m2, m3, m4, m5, m6, m7, m8];
        
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

export function createClient(sdk) {
    const [__c0, __c1, __c2, __c3, __c4, __c5, __c6, __c7, __c8] = __coreOf(sdk);
    var __part = (function (exports, _sdk, constants_js, geometry_js, objectTypes_js, events_js) {
    
        // Every beltFrameBase result except the never-drawn buried underground.
        const BELT_SEQUENCES = [
            "belt-straight",
            "belt-left",
            "belt-right",
            "belt-ramp-up",
            "belt-ramp-down",
        ];
    
        /**
         * The spritesheet base sequence for a belt's bend and type (frames under "<base>/0..7").
         * @param {BeltBend} bend
         * @param {BeltType} type
         * @returns {string}
         */
        function beltFrameBase(bend, type) {
            if (type === constants_js.BELT_UNDERGROUND) {
                return "belt-underground";
            }
            if (type === constants_js.BELT_RAMP_UP) {
                return "belt-ramp-up";
            }
            if (type === constants_js.BELT_RAMP_DOWN) {
                return "belt-ramp-down";
            }
            if (bend === constants_js.BeltBend.LEFT) {
                return "belt-left";
            }
            if (bend === constants_js.BeltBend.RIGHT) {
                return "belt-right";
            }
            return "belt-straight";
        }
    
        class Belt {
    
            /**
             * @param {number} id
             * @param {number} x
             * @param {number} y
             * @param {Direction} direction
             * @param {BeltBend} bend
             * @param {BeltType} type
             */
            constructor(id, x, y, direction, bend, type) {
                this.id = id;
                this.x = x;
                this.y = y;
                this.parentX = x;
                this.parentY = y;
                this.direction = direction;
                this.bend = bend;
                this.type = type;
                // Behind any real epoch, so the first tick derives this belt's bend.
                this.bendEpoch = -1;
            }
    
            static getBend(direction, x, y, parentX, parentY) {
                if (parentX === null) {
                    return constants_js.BeltBend.STRAIGHT;
                }
    
                if (direction === _sdk.Direction.UP && parentX > x) {
                    return constants_js.BeltBend.RIGHT;
                } else if (direction === _sdk.Direction.UP && parentX < x) {
                    return constants_js.BeltBend.LEFT;
                } else if (direction === _sdk.Direction.DOWN && parentX > x) {
                    return constants_js.BeltBend.LEFT;
                } else if (direction === _sdk.Direction.DOWN && parentX < x) {
                    return constants_js.BeltBend.RIGHT;
                } else if (direction === _sdk.Direction.LEFT && parentY < y) {
                    return constants_js.BeltBend.RIGHT;
                } else if (direction === _sdk.Direction.LEFT && parentY > y) {
                    return constants_js.BeltBend.LEFT;
                } else if (direction === _sdk.Direction.RIGHT && parentY < y) {
                    return constants_js.BeltBend.LEFT;
                } else if (direction === _sdk.Direction.RIGHT && parentY > y) {
                    return constants_js.BeltBend.RIGHT;
                }
    
                return constants_js.BeltBend.STRAIGHT;
            }
        }
    
        class BeltDrawLayer extends _sdk.AbstractTileMeshDrawLayer {
    
            constructor() {
                super();
                /**
                 * @type {Map<number, Belt>}
                 */
                this._belts = new Map();
                // The belts each chunk holds.
                this._chunkBelts = new Map();
                // Bumped on structural cache changes; a belt with an older bendEpoch re-derives when next ticked.
                this._bendEpoch = 0;
            }
    
            get layerIndex() {
                return 10;
            }
    
            get meshSequences() {
                return BELT_SEQUENCES;
            }
    
            /**
             * A bend depends on neighbors of any mod, so any structural change flags every bend for a lazy re-derive.
             * @returns {void}
             */
            onCacheStructuralChange() {
                this._bendEpoch += 1;
            }
    
            /**
             * Draws a tile per belt into the chunk's pooled Graphics, one fill per color.
             * @param {number} chunk
             * @param {Graphics} graphics
             * @returns {void}
             */
            _drawChunkGeometry(chunk, graphics) {
                for (const color of [constants_js.MAP_COLOR_BELT, constants_js.MAP_COLOR_BELT_RAMP]) {
                    let drew = false;
                    for (const belt of this._beltsIn(chunk)) {
                        const beltColor = belt.type === constants_js.BELT_NORMAL ? constants_js.MAP_COLOR_BELT : constants_js.MAP_COLOR_BELT_RAMP;
                        if (beltColor !== color) {
                            continue;
                        }
                        graphics.rect(belt.x * _sdk.TILE_SIZE, belt.y * _sdk.TILE_SIZE, _sdk.TILE_SIZE, _sdk.TILE_SIZE);
                        drew = true;
                    }
                    if (drew) {
                        graphics.fill(color);
                    }
                }
            }
    
            /**
             * The mesh tiles of a chunk's belts.
             * @param {number} chunk
             * @returns {AnimatedTile[]}
             */
            _buildTiles(chunk) {
                const tiles = [];
                for (const belt of this._beltsIn(chunk)) {
                    tiles.push(new _sdk.AnimatedTile(
                        belt.x,
                        belt.y,
                        belt.direction,
                        this._slotOf(beltFrameBase(belt.bend, belt.type)),
                    ));
                }
                return tiles;
            }
    
            /**
             * The belts a chunk holds.
             * @param {number} chunk
             * @returns {Iterable<Belt>}
             * @private
             */
            _beltsIn(chunk) {
                const belts = this._chunkBelts.get(chunk);
                if (belts === undefined) {
                    return [];
                }
                return belts;
            }
    
            /**
             * Renders a belt (buried undergrounds skipped); bend added straight, re-derived on the next structural change.
             * @param {number} id
             * @param {number} x
             * @param {number} y
             * @param {Direction} direction
             * @param {BeltType} type
             */
            addBelt(id, x, y, direction, type) {
                if (type === constants_js.BELT_UNDERGROUND) {
                    return;
                }
                const belt = new Belt(id, x, y, direction, constants_js.BeltBend.STRAIGHT, type);
                this._belts.set(id, belt);
    
                const chunk = _sdk.chunkId(x, y);
                _sdk.getOrCreate(this._chunkBelts, chunk, () => new Set()).add(belt);
                this._memberAdded(chunk);
            }
    
            /**
             * Re-derives invalidated bends, marking the chunk for a mesh rebuild when any turned.
             * @param {number} chunk
             * @returns {void}
             * @private
             */
            _refreshBends(chunk) {
                for (const belt of this._beltsIn(chunk)) {
                    if (belt.bendEpoch === this._bendEpoch) {
                        continue;
                    }
                    belt.bendEpoch = this._bendEpoch;
                    if (belt.type === constants_js.BELT_NORMAL && this._applyBend(belt)) {
                        this._dirtyChunks.add(chunk);
                    }
                }
            }
    
            /**
             * Re-derives a normal belt's bend from its cached neighbors.
             * @param {Belt} belt
             * @returns {boolean} whether the bend changed
             * @private
             */
            _applyBend(belt) {
                const {parentX, parentY} = geometry_js.inferBeltParent(this.cache, belt.x, belt.y, belt.direction);
                const bend = Belt.getBend(belt.direction, belt.x, belt.y, parentX, parentY);
                if (bend === belt.bend) {
                    return false;
                }
                belt.bend = bend;
                return true;
            }
    
            /**
             * @param {number} id
             */
            removeBelt(id) {
                const belt = this._belts.get(id);
                if (belt === undefined) {
                    return;
                }
    
                const chunk = _sdk.chunkId(belt.x, belt.y);
                this._belts.delete(id);
    
                _sdk.removeFromGroup(this._chunkBelts, chunk, belt);
                this._memberRemoved(chunk, !this._chunkBelts.has(chunk));
            }
    
            /**
             * Re-derives stale bends, then advances every on-screen belt.
             * @param {number} frame animation frame, in [0, 8)
             * @param {number} deltaMS elapsed ms since the previous tick
             * @returns {void}
             */
            _updateSprites(frame, deltaMS) {
                for (const chunk of this._mounted) {
                    this._refreshBends(chunk);
                }
                super._updateSprites(frame, deltaMS);
            }
    
            /**
             * Bends first: the mesh bakes them in, and a first-mount chunk has never derived them.
             * @param {number} chunk
             * @returns {void}
             */
            _prepareChunkSprites(chunk) {
                this._refreshBends(chunk);
                this._rebuildChunkSprites(chunk);
            }
        }
    
        class BeltSprite extends _sdk.Sprite {
    
            /**
             * @param {number} id
             * @param {number} x
             * @param {number} y
             * @param {Direction} direction
             * @param {BeltBend} bend
             * @param {BeltType} type
             * @param {Texture[]|undefined} frames ordered animation frames
             */
            constructor(id, x, y, direction, bend, type, frames) {
                super(_sdk.Texture.EMPTY);
    
                this.id = id;
                this.tileX = x;
                this.tileY = y;
                this.anchor = 0.5;
                this.angle = _sdk.Direction.angle(direction);
                this.direction = direction;
                this.bend = bend;
                this.type = type;
                this.frames = frames;
                // Behind any real epoch, so the first tick derives this belt's bend.
                this.bendEpoch = -1;
    
                this.position.set(x * _sdk.TILE_SIZE + 32, y * _sdk.TILE_SIZE + 32);
            }
    
            /**
             * Renders this sprite as a placement-preview ghost in the given tint and alpha.
             * @param {number} tint
             * @param {number} [alpha]
             */
            setGhost(tint, alpha=1) {
                this.tint = tint;
                this.alpha = alpha;
            }
    
            /**
             * Shows a frame by index, wrapping modulo the sequence length.
             * @param {number} frame animation frame, in [0, 8)
             */
            setAnimationFrame(frame) {
                if (this.frames === undefined || this.frames.length === 0) {
                    this.texture = _sdk.Texture.EMPTY;
                    return;
                }
                this.texture = this.frames[frame % this.frames.length];
            }
    
            update(x, y, direction, bend) {
                this.direction = direction;
                this.angle = _sdk.Direction.angle(direction);
                this.bend = bend;
                this.tileX = x;
                this.tileY = y;
                this.x = x * _sdk.TILE_SIZE + 32;
                this.y = y * _sdk.TILE_SIZE + 32;
            }
        }
    
        /**
         * Reveals the buried belts of an underground tunnel on hover; driven imperatively by LogisticsClientMod.onInspect.
         */
        class BeltOverlayDrawLayer extends _sdk.AbstractDrawLayer {
    
            constructor() {
                super();
                this._revealSprites = [];
            }
    
            get layerIndex() {
                return 100;
            }
    
            /**
             * Reveals the underground belts of a tunnel as a line of buried-belt sprites.
             * @param {{x: number, y: number}[]} tiles tunnel tiles, in order
             * @param {Direction} direction the tunnel's facing
             */
            showUndergroundReveal(tiles, direction) {
                this.clearUndergroundReveal();
                for (const tile of tiles) {
                    const frames = this.textureRegistry.getAnimation(beltFrameBase(constants_js.BeltBend.STRAIGHT, constants_js.BELT_UNDERGROUND));
                    const sprite = new BeltSprite(
                        0,
                        tile.x,
                        tile.y,
                        direction,
                        constants_js.BeltBend.STRAIGHT,
                        constants_js.BELT_UNDERGROUND,
                        frames,
                    );
                    sprite.setAnimationFrame(_sdk.currentAnimationFrame());
                    this.addChild(sprite);
                    this._revealSprites.push(sprite);
                }
            }
    
            clearUndergroundReveal() {
                for (const sprite of this._revealSprites) {
                    sprite.destroy();
                    this.removeChild(sprite);
                }
                this._revealSprites.splice(0);
            }
        }
    
        // Tints for tool preview ghosts.
        const GHOST_TINT = 0xFFFFFF; // untinted normal preview
        const GHOST_ALPHA = 0.8; // semi-transparent so the world shows through
        const GHOST_AT_MAX_TINT = 0xF2A900; // tunnel at max length (amber)
        const GHOST_BLOCKED_TINT = 0xF23030; // blocked (red), matches PlacementFeedbackLayer
        const GHOST_BLOCKED_ALPHA = 0.8;
    
        /**
         * Renders a belt tool's ghost preview, centered on the cursor (or screen center in center-lock).
         */
        class BeltGhostLayer extends _sdk.AbstractDrawLayer {
    
            constructor() {
                super();
                this._sprites = [];
                // Placed tile's sprite floats onto the cursor.
                this._floatingContainer = new _sdk.Container();
                // Buried tunnel belts stay grid-aligned.
                this._gridContainer = new _sdk.Container();
    
                this.addChild(this._gridContainer);
                this.addChild(this._floatingContainer);
    
                this._centerLock = false;
                // Float anchor: the ghost's primary tile.
                this._anchorTileX = null;
                this._anchorTileY = null;
            }
    
            get layerIndex() {
                return 200;
            }
    
            /**
             * Stays visible in map mode.
             * @param {boolean} value
             */
            set mapMode(value) {}
    
            /**
             * Shows a single ghost belt/ramp at the tile facing `direction`.
             * @param {number} tileX
             * @param {number} tileY
             * @param {Direction} direction
             * @param {BeltType} beltType
             * @param {BeltBend} [bend]
             * @param {boolean} [blocked] tints the ghost red
             */
            showGhost(tileX, tileY, direction, beltType, bend=constants_js.BeltBend.STRAIGHT, blocked=false) {
                this.clear();
                this._anchorTileX = tileX;
                this._anchorTileY = tileY;
                const tint = blocked ? GHOST_BLOCKED_TINT : GHOST_TINT;
                const alpha = blocked ? GHOST_BLOCKED_ALPHA : GHOST_ALPHA;
                this._addSprite(this._floatingContainer, tileX, tileY, direction, beltType, tint, bend, alpha);
                this._updatePin();
            }
    
            /**
             * Shows the ramp at the hover tile plus the buried belts back to its pair.
             * @param {number} rampTileX
             * @param {number} rampTileY
             * @param {Direction} direction
             * @param {BeltType} rampType RAMP_DOWN / RAMP_UP
             * @param {{x: number, y: number}[]} undergroundTiles tunnel tiles between the pair
             * @param {boolean} atMax tints the buried belts amber at maximum tunnel length
             */
            showTunnelPreview(rampTileX, rampTileY, direction, rampType, undergroundTiles, atMax) {
                this.clear();
                this._anchorTileX = rampTileX;
                this._anchorTileY = rampTileY;
                this._addSprite(this._floatingContainer, rampTileX, rampTileY, direction, rampType, GHOST_TINT, constants_js.BeltBend.STRAIGHT);
                const undergroundTint = atMax ? GHOST_AT_MAX_TINT : GHOST_TINT;
                for (const tile of undergroundTiles) {
                    this._addSprite(this._gridContainer, tile.x, tile.y, direction, constants_js.BELT_UNDERGROUND, undergroundTint, constants_js.BeltBend.STRAIGHT);
                }
                this._updatePin();
            }
    
            /**
             * Builds one ghost sprite and adds it to `container`.
             * @param container {Container} floating or grid-aligned
             * @param tileX {number}
             * @param tileY {number}
             * @param direction {Direction}
             * @param beltType {BeltType}
             * @param {number} tint
             * @param {BeltBend} bend
             * @param {number} [alpha]
             * @private
             */
            _addSprite(container, tileX, tileY, direction, beltType, tint, bend, alpha=GHOST_ALPHA) {
                const frames = this.textureRegistry.getAnimation(beltFrameBase(bend, beltType));
                const sprite = new BeltSprite(
                    0,
                    tileX,
                    tileY,
                    direction,
                    bend,
                    beltType,
                    frames,
                );
                sprite.setAnimationFrame(_sdk.currentAnimationFrame());
                sprite.setGhost(tint, alpha);
    
                this._sprites.push(sprite);
                container.addChild(sprite);
            }
    
            clear() {
                for (const sprite of this._sprites) {
                    sprite.destroy();
                    this._floatingContainer.removeChild(sprite);
                    this._gridContainer.removeChild(sprite);
                }
                this._sprites.splice(0);
                this._anchorTileX = null;
                this._anchorTileY = null;
            }
    
            /**
             * Toggles center-lock: the ghost floats onto the screen center instead of the cursor.
             * @param {boolean} enabled
             */
            setCenterLock(enabled) {
                this._centerLock = enabled;
                this._updatePin();
            }
    
            /**
             * Keeps the ghost on the shared animation frame and floating on its target.
             * @param {number} frame in [0, 8)
             * @param {number} deltaMS
             * @param {Set<number>} visibleChunks
             */
            tick(frame, deltaMS, visibleChunks) {
                for (const sprite of this._sprites) {
                    sprite.setAnimationFrame(frame);
                }
                this._updatePin();
            }
    
            /**
             * Offsets the floating container so the anchor tile's center lands on its target.
             * @private
             */
            _updatePin() {
                const target = this._targetPoint();
                if (this._anchorTileX === null || target === null) {
                    this._floatingContainer.position.set(0, 0);
                    return;
                }
                const anchorX = this._anchorTileX * _sdk.TILE_SIZE + _sdk.TILE_SIZE / 2;
                const anchorY = this._anchorTileY * _sdk.TILE_SIZE + _sdk.TILE_SIZE / 2;
                this._floatingContainer.position.set(target.x - anchorX, target.y - anchorY);
            }
    
            /**
             * The world point the ghost centers on: the screen center in center-lock, else the cursor.
             * @private
             * @returns {{x: number, y: number}|null}
             */
            _targetPoint() {
                if (this.viewport === null) {
                    return null;
                }
                if (this._centerLock) {
                    return this.viewport.toWorld(this.viewport.screenWidth / 2, this.viewport.screenHeight / 2);
                }
                if (_sdk.Mouse.currentX === null || _sdk.Mouse.currentY === null) {
                    return null;
                }
                return {x: _sdk.Mouse.currentX, y: _sdk.Mouse.currentY};
            }
        }
    
        // Radius of the circle marking a path's head and tail belts.
        const END_MARKER_RADIUS = 10;
    
        /**
         * Debug overlay drawing each belt path as a colored line (keyed by head belt id) with end markers.
         */
        class PathDebugDrawLayer extends _sdk.AbstractDebugDrawLayer {
    
            /**
             * @param {Map<number, number[]>} paths - shared head id → ordered belt ids (head last), owned by LogisticsClientMod
             */
            constructor(paths) {
                super();
                this._paths = paths;
                this._graphics = new _sdk.Graphics();
                this.addChild(this._graphics);
            }
    
            get layerIndex() {
                return 100;
            }
    
            /**
             * Repaints every tracked path.
             * @private
             * @returns {void}
             */
            _repaint() {
                this._graphics.clear();
                for (const parts of this._paths.values()) {
                    this._drawPath(parts);
                }
            }
    
            /**
             * @param {number[]} parts - belt ids in path order, head last
             * @private
             */
            _drawPath(parts) {
                const records = parts.map(id => this.cache.get(id));
                // A belt left the viewport (or was just deleted): wait for the next recalc.
                if (records.length === 0 || records.some(record => record === null)) {
                    return;
                }
                const color = _sdk.DEBUG_COLOR(parts[parts.length - 1]);
                const points = records.map(record => ({
                    x: record.tileX * _sdk.TILE_SIZE + _sdk.TILE_SIZE / 2,
                    y: record.tileY * _sdk.TILE_SIZE + _sdk.TILE_SIZE / 2,
                }));
    
                for (let i = 0; i < points.length - 1; i += 1) {
                    _sdk.drawLine(this._graphics, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, color);
                }
    
                _sdk.drawCircle(this._graphics, points[0].x, points[0].y, END_MARKER_RADIUS, color);
                if (points.length > 1) {
                    const end = points[points.length - 1];
                    _sdk.drawCircle(this._graphics, end.x, end.y, END_MARKER_RADIUS, color);
                }
            }
        }
    
        class BeltTool extends _sdk.AbstractTool {
    
            /**
             * @param {Client} client
             * @param {BeltGhostLayer} ghostLayer
             */
            constructor(client, ghostLayer) {
                super(client.session);
                this._client = client;
                this._cache = client.objects;
                this._ghostLayer = ghostLayer;
                this._placementFeedbackLayer = client.placementFeedbackLayer;
                this._rotation = client.toolRotation;
                this._prevDragTileX = null;
                this._prevDragTileY = null;
                this._firstDragStep = false;
            }
    
            get label() {
                return "Belt";
            }
    
            get id() {
                return 2;
            }
    
            get textureName() {
                return "belt-straight/0";
            }
    
            onTap(tileX, tileY) {
                const direction = this._rotation.direction;
                const blocked = this._blocked(tileX, tileY);
                this._place(tileX, tileY, direction);
                if (!blocked) {
                    // Advance the center-lock crosshair one tile so consecutive taps lay a line.
                    this._client.advanceCenterLock(tileX, tileY, direction);
                }
            }
    
            onTileEnter(tileX, tileY) {
                this._showGhost(tileX, tileY, this._rotation.direction);
            }
    
            /**
             * Draws the placement ghost, bent from its inferred parent, with per-tile feedback.
             * @private
             */
            _showGhost(tileX, tileY, direction) {
                const occupant = this._cache.at(tileX, tileY, _sdk.LAYER_SURFACE);
                const blocked = this._blocked(tileX, tileY);
                const overwrite = occupant !== null && !blocked;
                const tile = [{x: tileX, y: tileY}];
                let blockedTiles = [];
                if (blocked) {
                    blockedTiles = tile;
                }
                let overwriteTiles = [];
                if (overwrite) {
                    overwriteTiles = tile;
                }
                let clearTiles = tile;
                if (blocked || overwrite) {
                    clearTiles = [];
                }
                this._placementFeedbackLayer.show({
                    blocked: blockedTiles,
                    overwrite: overwriteTiles,
                    clear: clearTiles,
                    showTarget: true,
                });
                const {parentX, parentY} = geometry_js.inferBeltParent(this._cache, tileX, tileY, direction);
                const bend = Belt.getBend(direction, tileX, tileY, parentX, parentY);
                this._ghostLayer.showGhost(tileX, tileY, direction, constants_js.BELT_NORMAL, bend, blocked);
            }
    
            onTileExit(tileX, tileY) {
                this._ghostLayer.clear();
                this._placementFeedbackLayer.clear();
            }
    
            onDragStart(tileX, tileY) {
                this._firstDragStep = true;
            }
    
            /**
             * Whether the tile sits outside buildable chunks or holds something the tool can't overwrite.
             * @private
             * @returns {boolean}
             */
            _blocked(tileX, tileY) {
                if (!this._client.canBuildAt(tileX, tileY)) {
                    return true;
                }
                const occupant = this._cache.at(tileX, tileY, _sdk.LAYER_SURFACE);
                return occupant !== null && !this._overwritable(occupant);
            }
    
            /**
             * Whether the occupant is a conveyor lane the tool may delete to re-lay.
             * @private
             * @returns {boolean}
             */
            _overwritable(occupant) {
                return occupant.data.type.placement.conveyor;
            }
    
            /**
             * Places a normal belt at the tile, replacing any belt already there.
             * @private
             */
            _place(tileX, tileY, direction) {
                this._prevDragTileX = null;
                this._prevDragTileY = null;
                this._placeBelt(tileX, tileY, direction);
            }
    
            /**
             * Lays a normal belt, replacing an overwritable belt but leaving other objects untouched.
             * @private
             */
            _placeBelt(tileX, tileY, direction) {
                // The server would drop an ungated placement anyway.
                if (!this._client.canBuildAt(tileX, tileY)) {
                    return;
                }
                const occupant = this._cache.at(tileX, tileY, _sdk.LAYER_SURFACE);
                if (occupant !== null) {
                    if (!this._overwritable(occupant)) {
                        return;
                    }
                    this.session.sendMessage(new _sdk.DeleteObjectMessage(occupant.id));
                }
                this.session.sendMessage(new _sdk.CreateObjectMessage(objectTypes_js.BeltDefinition.typeId, tileX, tileY, direction));
                _sdk.Haptics.tap();
            }
    
            onDragTile(tileX, tileY, direction) {
                const fromTileX = tileX - _sdk.Direction.dx(direction);
                const fromTileY = tileY - _sdk.Direction.dy(direction);
    
                if (this._firstDragStep) {
                    // First drag step lays two belts: the press tile also gets one, facing the drag.
                    this._firstDragStep = false;
                    this._placeBelt(fromTileX, fromTileY, direction);
                } else if (direction !== this._rotation.direction && this._prevDragTileX === fromTileX && this._prevDragTileY === fromTileY) {
                    // Re-lay the corner tile facing the new direction on a turn.
                    this._placeBelt(fromTileX, fromTileY, direction);
                }
    
                // The drag direction becomes the shared facing.
                this._rotation.direction = direction;
                this._prevDragTileX = tileX;
                this._prevDragTileY = tileY;
    
                this._placeBelt(tileX, tileY, direction);
    
                // Refresh the ghost to face the actual drag step.
                this._showGhost(tileX, tileY, direction);
            }
        }
    
        /**
         * Rotatable single-ramp tool that drops one ramp per tap, pairing it with the ramp it tunnels to.
         */
        class UndergroundBeltTool extends _sdk.AbstractTool {
    
            /**
             * @param {Client} client
             * @param {BeltGhostLayer} ghostLayer
             */
            constructor(client, ghostLayer) {
                super(client.session);
                this._client = client;
                this._cache = client.objects;
                this._ghostLayer = ghostLayer;
                this._placementFeedbackLayer = client.placementFeedbackLayer;
                this._rotation = client.toolRotation;
            }
    
            get label() {
                return "Ramp";
            }
    
            get id() {
                return 3;
            }
    
            get textureName() {
                return "belt-ramp-down/0";
            }
    
            onTap(tileX, tileY) {
                this._placeRamp(tileX, tileY, this._rotation.direction);
            }
    
            onTileEnter(tileX, tileY) {
                const placement = this._resolvePlacement(tileX, tileY, this._rotation.direction);
                const blocked = this._blocked(tileX, tileY, placement.direction);
                // An overwritable same-axis belt is deleted before the ramp lands.
                const overwrite = !blocked && this._surfaceBeltAt(tileX, tileY) !== null;
                const tile = [{x: tileX, y: tileY}];
                let blockedTiles = [];
                if (blocked) {
                    blockedTiles = tile;
                }
                let overwriteTiles = [];
                if (overwrite) {
                    overwriteTiles = tile;
                }
                let clearTiles = tile;
                if (blocked || overwrite) {
                    clearTiles = [];
                }
                this._placementFeedbackLayer.show({
                    blocked: blockedTiles,
                    overwrite: overwriteTiles,
                    clear: clearTiles,
                    showTarget: true,
                });
                if (blocked || placement.parentId === null) {
                    this._ghostLayer.showGhost(tileX, tileY, placement.direction, placement.type, constants_js.BeltBend.STRAIGHT, blocked);
                    return;
                }
                const undergroundTiles = this._undergroundTilesFor(
                    placement.parentId,
                    tileX,
                    tileY,
                    placement.type,
                    placement.direction,
                );
                const atMax = undergroundTiles.length === constants_js.MAX_UNDERGROUND_LENGTH;
                this._ghostLayer.showTunnelPreview(tileX, tileY, placement.direction, placement.type, undergroundTiles, atMax);
            }
    
            onTileExit(tileX, tileY) {
                this._ghostLayer.clear();
                this._placementFeedbackLayer.clear();
            }
    
            onDragTile(tileX, tileY, direction) {
                // No-op: ramps place by tap only.
            }
    
            /**
             * Every belt at a tile (surface or underground), as ramp-partner-scan candidates.
             * @private
             * @returns {{id: number, type: BeltType, direction: Direction}[]}
             */
            _beltCandidatesAt(tileX, tileY) {
                return this._cache.getAtTile(tileX, tileY)
                    .filter(record => objectTypes_js.isBeltType(record.data.type))
                    .map(record => ({id: record.id, type: record.data.type.beltKind, direction: record.data.direction}));
            }
    
            /**
             * The surface belt at the tile (with a `straight` flag), or null.
             * @private
             * @returns {{id: number, type: BeltType, direction: Direction, straight: boolean}|null}
             */
            _surfaceBeltAt(tileX, tileY) {
                const surface = geometry_js.surfaceBeltAt(this._cache, tileX, tileY);
                if (surface === null) {
                    return null;
                }
                const {parentX, parentY} = geometry_js.inferBeltParent(this._cache, surface.tileX, surface.tileY, surface.data.direction);
                const bend = Belt.getBend(surface.data.direction, surface.tileX, surface.tileY, parentX, parentY);
                return {
                    id: surface.id,
                    type: surface.data.type.beltKind,
                    direction: surface.data.direction,
                    straight: bend === constants_js.BeltBend.STRAIGHT,
                };
            }
    
            /**
             * Whether a ramp facing `direction` can overwrite the belt: only a straight normal belt on the ramp's axis.
             * @private
             * @returns {boolean}
             */
            _overwritable(belt, direction) {
                if (belt.type !== constants_js.BELT_NORMAL || !belt.straight) {
                    return false;
                }
                return belt.direction === direction || belt.direction === _sdk.Direction.invert(direction);
            }
    
            /**
             * Whether the tile sits outside buildable chunks, or a surface belt blocks a ramp facing
             * `direction` (unless it's an overwritable same-axis belt).
             * @private
             * @returns {boolean}
             */
            _blocked(tileX, tileY, direction) {
                if (!this._client.canBuildAt(tileX, tileY)) {
                    return true;
                }
                // A non-belt surface object blocks outright.
                const occupant = this._cache.at(tileX, tileY, _sdk.LAYER_SURFACE);
                if (occupant !== null && !objectTypes_js.isBeltType(occupant.data.type)) {
                    return true;
                }
                const belt = this._surfaceBeltAt(tileX, tileY);
                return belt !== null && !this._overwritable(belt, direction);
            }
    
            /**
             * Places one ramp, pairing it with the ramp the tool faces, then flips the facing 180° for the next tap.
             * @private
             */
            _placeRamp(tileX, tileY, direction) {
                // The server would drop an ungated placement anyway.
                if (!this._client.canBuildAt(tileX, tileY)) {
                    return;
                }
                const placement = this._resolvePlacement(tileX, tileY, direction);
    
                const existing = this._surfaceBeltAt(tileX, tileY);
                if (existing !== null) {
                    if (!this._overwritable(existing, placement.direction)) {
                        return;
                    }
                    // Client removes the same-axis belt before laying the ramp.
                    this.session.sendMessage(new _sdk.DeleteObjectMessage(existing.id));
                }
    
                // Tunnel span is derived sim-side; only the ramp is sent.
                const rampType = placement.type === constants_js.BELT_RAMP_UP ? objectTypes_js.BeltRampUpDefinition : objectTypes_js.BeltRampDownDefinition;
                this.session.sendMessage(new _sdk.CreateObjectMessage(
                    rampType.typeId,
                    tileX,
                    tileY,
                    placement.direction,
                ));
                _sdk.Haptics.tap();
    
                this._rotation.invert();
                // Advance the center-lock crosshair: a lone entrance two tiles, a completed tunnel one.
                const completesTunnel = placement.type === constants_js.BELT_RAMP_UP && placement.parentId !== null;
                const loneEntrance = placement.type === constants_js.BELT_RAMP_DOWN && placement.parentId === null;
                if (loneEntrance) {
                    this._client.advanceCenterLock(tileX, tileY, placement.direction, 2);
                }
                else if (completesTunnel) {
                    this._client.advanceCenterLock(tileX, tileY, placement.direction);
                }
                this.onTileEnter(tileX, tileY);
            }
    
            /**
             * Decides what a tap places: a RAMP_DOWN into a downstream exit, a RAMP_UP back to an upstream entrance, or a lone entrance.
             * @private
             * @returns {{type: BeltType, parentId: number|null, direction: Direction}}
             */
            _resolvePlacement(tileX, tileY, direction) {
                const downstreamExit = this._findRampParent(tileX, tileY, direction, constants_js.BELT_RAMP_DOWN);
                if (downstreamExit !== null) {
                    return {type: constants_js.BELT_RAMP_DOWN, parentId: downstreamExit, direction};
                }
                const inverted = _sdk.Direction.invert(direction);
                const upstreamEntrance = this._findRampParent(tileX, tileY, inverted, constants_js.BELT_RAMP_UP);
                if (upstreamEntrance !== null) {
                    return {type: constants_js.BELT_RAMP_UP, parentId: upstreamEntrance, direction: inverted};
                }
                return {type: constants_js.BELT_RAMP_DOWN, parentId: null, direction};
            }
    
            /**
             * Scans along the facing axis for the opposite ramp a `type` ramp here would tunnel to.
             * @private
             * @returns {number|null} the paired ramp's id
             */
            _findRampParent(tileX, tileY, direction, type) {
                const belt = geometry_js.findRampPartner(tileX, tileY, direction, type, (x, y) => this._beltCandidatesAt(x, y));
                if (belt === null) {
                    return null;
                }
                return belt.id;
            }
    
            /**
             * The buried belts laid between the new ramp and its matched `parentId` (empty when adjacent).
             * @private
             * @returns {{x: number, y: number}[]}
             */
            _undergroundTilesFor(parentId, tileX, tileY, type, direction) {
                const parent = this._cache.get(parentId);
                if (parent === null) {
                    return [];
                }
                return geometry_js.getUndergroundBeltsToCreate(
                    {x: parent.tileX, y: parent.tileY, type: parent.data.type.beltKind, direction},
                    {x: tileX, y: tileY, type, direction},
                );
            }
        }
    
        class LogisticsClientMod extends _sdk.AbstractClientMod {
    
            constructor() {
                super();
                // Shared between drawLayers (renders it) and tools (drive it).
                this._ghostLayer = new BeltGhostLayer();
                // Driven imperatively by onEvent.
                this._beltLayer = new BeltDrawLayer();
                // Reveals buried tunnel belts under a hovered ramp.
                this._overlayLayer = new BeltOverlayDrawLayer();
                // Head id → belt ids in path order (head last).
                this._pathParts = new Map();
                // Head id → Map<item id, {gap, type}>, output-to-input; positions derived from gaps.
                this._pathItems = new Map();
                // Out-port id → path head id, so a port-item event (port id only) resolves to a path.
                this._outPortToPath = new Map();
                // Inverse map, so a lead item's DELETE (a pop) hands its sprite to the out-port.
                this._pathToOutPort = new Map();
                // Debug overlay of belt paths.
                this._pathDebugLayer = new PathDebugDrawLayer(this._pathParts);
            }
    
            drawLayers(client) {
                return [
                    this._beltLayer,
                    this._overlayLayer,
                    this._ghostLayer,
                    this._pathDebugLayer,
                ];
            }
    
            tools(client) {
                // TODO: Filter to the tools available for the player (playerSettings state).
                return [
                    new BeltTool(client, this._ghostLayer),
                    new UndergroundBeltTool(client, this._ghostLayer),
                ];
            }
    
            /**
             * Registers cache listeners keeping belt rendering in lockstep with every belt entry.
             * @param {Client} client
             * @returns {void}
             */
            setup(client) {
                client.objects.onSet(entry => {
                    if (objectTypes_js.isBeltType(entry.data.type)) {
                        this._onBeltSet(client, entry);
                    }
                });
                client.objects.onRemove(entry => {
                    if (objectTypes_js.isBeltType(entry.data.type)) {
                        this._onBeltRemoved(client, entry);
                    }
                });
            }
    
            /**
             * Single client-side hub for the belt path/item events.
             * @param {AbstractEvent} event
             * @param {Client} client
             */
            onEvent(event, client) {
                if (event instanceof _sdk.ObjectInsertEvent && objectTypes_js.isBeltType(client.modRegistry.typeById(event.typeId))) {
                    // A live insert's recalc precedes the belt, so repaint once it is cached.
                    this._pathDebugLayer.markStale();
                    return;
                }
                if (event instanceof events_js.BeltPathRecalculateEvent) {
                    this._updatePath(event.parts);
                    if (event.outPortId !== null) {
                        const head = event.parts[event.parts.length - 1];
                        this._outPortToPath.set(event.outPortId, head);
                        this._pathToOutPort.set(head, event.outPortId);
                    }
                    this._pathDebugLayer.markStale();
                    return;
                }
                if (event instanceof _sdk.PortItemSetEvent || event instanceof _sdk.PortItemClearEvent) {
                    this._handlePortItemEvent(client, event);
                    return;
                }
                if (event instanceof events_js.BeltItemUpsertEvent
                    || event instanceof events_js.BeltItemSyncEvent
                    || event instanceof events_js.BeltItemDeleteEvent
                    || event instanceof events_js.BeltItemResetEvent) {
                    this._handleItemEvent(client, event);
                }
            }
    
            /**
             * Records a recalculated path under its head id, dropping any head a merge absorbed.
             * @param {number[]} parts - belt ids in path order, head last
             * @private
             */
            _updatePath(parts) {
                const head = parts[parts.length - 1];
                for (const id of parts) {
                    if (id !== head) {
                        this._pathParts.delete(id);
                    }
                }
                this._pathParts.set(head, parts);
            }
    
            /**
             * Renders or removes an item resting in a path's out-port; untracked ports are engine-rendered splitters.
             * @param {Client} client
             * @param {PortItemSetEvent|PortItemClearEvent} event
             * @private
             */
            _handlePortItemEvent(client, event) {
                const portId = event.portId;
                if (!this._outPortToPath.has(portId)) {
                    return;
                }
                if (event instanceof _sdk.PortItemClearEvent) {
                    client.itemLayer.removeItem(_sdk.PORT_SPRITE_KEY(portId));
                    return;
                }
                this._renderPortItem(client, portId, event.itemType);
            }
    
            /**
             * Places an out-port's item sprite one tile downstream of the tail, on the upstream edge.
             * @param {Client} client
             * @param {number} portId
             * @param {number} type - item type
             * @private
             */
            _renderPortItem(client, portId, type) {
                const port = this._resolvePortBelt(client, portId);
                if (port === null) {
                    return;
                }
                client.itemLayer.moveItem({
                    key: _sdk.PORT_SPRITE_KEY(portId),
                    tileX: port.tileX,
                    tileY: port.tileY,
                    halfTile: true,
                    sourceDirection: port.sourceDirection,
                    type,
                });
            }
    
            /**
             * The tile an out-port's item rests on: one downstream of the tail, facing back at it; null when uncached.
             * @param {Client} client
             * @param {number} portId
             * @returns {{tileX: number, tileY: number, sourceDirection: Direction}|null}
             * @private
             */
            _resolvePortBelt(client, portId) {
                const head = this._outPortToPath.get(portId);
                if (head === undefined) {
                    return null;
                }
                const parts = this._pathParts.get(head);
                if (parts === undefined) {
                    return null;
                }
                const tail = client.objects.get(parts[0]);
                if (tail === null) {
                    return null;
                }
                const direction = tail.data.direction;
                return {
                    tileX: tail.tileX + _sdk.Direction.dx(direction),
                    tileY: tail.tileY + _sdk.Direction.dy(direction),
                    sourceDirection: _sdk.Direction.invert(direction),
                };
            }
    
            /**
             * Applies one item delta and repositions the path's items — gaps are relative, so one change shifts the rest.
             * @param {Client} client
             * @param {BeltItemUpsertEvent|BeltItemSyncEvent|BeltItemDeleteEvent|BeltItemResetEvent} event
             * @private
             */
            _handleItemEvent(client, event) {
                const pathId = event.pathId;
                if (event instanceof events_js.BeltItemResetEvent) {
                    this._resetPathItems(client, pathId);
                    return;
                }
                const itemId = event.itemId;
                if (event instanceof events_js.BeltItemDeleteEvent) {
                    const items = this._pathItems.get(pathId);
                    const item = items === undefined ? undefined : items.get(itemId);
                    this._dropDeletedItem(client, pathId, itemId, item);
                    if (items !== undefined) {
                        items.delete(itemId);
                    }
                    this._recomputePathItems(client, pathId);
                    return;
                }
                let items = this._pathItems.get(pathId);
                if (items === undefined) {
                    items = new Map();
                    this._pathItems.set(pathId, items);
                }
                items.set(itemId, {gap: event.gap, type: event.itemType});
                // A synced item was only re-keyed, not moved, so place its sprite without animating.
                this._recomputePathItems(client, pathId, event instanceof events_js.BeltItemSyncEvent);
            }
    
            /**
             * Destroys a deleted item's sprite; a delete on an out-port path is a pop, so the sprite glides into the port.
             * @param {Client} client
             * @param {number} pathId
             * @param {number} itemId
             * @param {{gap: number, type: number}|undefined} item - the tracked item, if known
             * @private
             */
            _dropDeletedItem(client, pathId, itemId, item) {
                const outPortId = this._pathToOutPort.get(pathId);
                if (item === undefined || outPortId === undefined) {
                    client.itemLayer.removeItem(itemId);
                    return;
                }
                client.itemLayer.renameItem(itemId, _sdk.PORT_SPRITE_KEY(outPortId));
                this._renderPortItem(client, outPortId, item.type);
            }
    
            /**
             * Clears a re-syncing path's sprites under head and merged-in former heads; re-emitted UPSERTs repopulate.
             * @param {Client} client
             * @param {number} pathId
             * @private
             */
            _resetPathItems(client, pathId) {
                const parts = this._pathParts.get(pathId);
                if (parts === undefined) {
                    this._clearPathItems(client, pathId);
                    return;
                }
                for (const id of parts) {
                    this._clearPathItems(client, id);
                }
            }
    
            /**
             * Repositions a path's items: they lie output-to-input, each gap counting the empty half-tiles ahead of it.
             * @param {Client} client
             * @param {number} pathId
             * @param {boolean} [snap] - place sprites without animating
             * @private
             */
            _recomputePathItems(client, pathId, snap=false) {
                const parts = this._pathParts.get(pathId);
                const items = this._pathItems.get(pathId);
                if (parts === undefined || items === undefined) {
                    return;
                }
                const outputSlot = 2 * parts.length - 2;
                let position = 0;
                for (const [itemId, item] of items) {
                    position += item.gap;
                    // `position` counts from the output edge; belt slots count from the input edge.
                    const belt = this._resolveItemBelt(client, pathId, outputSlot - position);
                    if (belt !== null) {
                        client.itemLayer.moveItem({
                            key: itemId,
                            tileX: belt.tileX,
                            tileY: belt.tileY,
                            halfTile: belt.halfTile,
                            sourceDirection: belt.sourceDirection,
                            type: item.type,
                            snap,
                            hidden: belt.hidden,
                        });
                    }
                    position += 1;
                }
            }
    
            /**
             * Drops a path's item sprites and tracked items.
             * @param {Client} client
             * @param {number} pathId
             * @private
             */
            _clearPathItems(client, pathId) {
                const items = this._pathItems.get(pathId);
                if (items === undefined) {
                    return;
                }
                for (const itemId of items.keys()) {
                    client.itemLayer.removeItem(itemId);
                }
                this._pathItems.delete(pathId);
            }
    
            /**
             * Maps an item's slot to its belt: slot counts half-tiles from the input, so the belt is
             * parts[(N-1) - floor((slot+1)/2)] and an odd slot is the half-tile straddle.
             * @param {Client} client
             * @param {number} pathId
             * @param {number} slot
             * @returns {{tileX: number, tileY: number, sourceDirection: Direction, halfTile: boolean, hidden: boolean}|null}
             * @private
             */
            _resolveItemBelt(client, pathId, slot) {
                const parts = this._pathParts.get(pathId);
                if (parts === undefined) {
                    return null;
                }
                const beltIndex = (parts.length - 1) - Math.floor((slot + 1) / 2);
                if (beltIndex < 0 || beltIndex >= parts.length) {
                    return null;
                }
                const record = client.objects.get(parts[beltIndex]);
                if (record === null) {
                    return null;
                }
                const halfTile = slot % 2 === 1;
                // Only the head (fed by an unknown neighbor) needs cache inference.
                const sourceDirection = beltIndex + 1 < parts.length
                    ? this._pathSourceDirection(client, record, parts[beltIndex + 1])
                    : this._sourceDirection(client, record);
                return {
                    tileX: record.tileX,
                    tileY: record.tileY,
                    sourceDirection: sourceDirection,
                    halfTile: halfTile,
                    // Boundary half slots: a ramp-up's is still buried; the first buried tile's renders under the occluders.
                    hidden: (record.data.type.beltKind === constants_js.BELT_UNDERGROUND
                            && !(halfTile && this._rampDownBehind(client, record)))
                        || (record.data.type.beltKind === constants_js.BELT_RAMP_UP && halfTile),
                };
            }
    
            /**
             * Whether the tile behind a buried belt holds the tunnel's entrance ramp (first buried tile).
             * @param {Client} client
             * @param {CacheEntry} record - underground belt cache entry
             * @returns {boolean}
             * @private
             */
            _rampDownBehind(client, record) {
                const direction = record.data.direction;
                const behind = client.objects.getAtTile(
                    record.tileX - _sdk.Direction.dx(direction),
                    record.tileY - _sdk.Direction.dy(direction),
                );
                return behind.some(neighbor =>
                    neighbor.data.type.beltKind === constants_js.BELT_RAMP_DOWN && neighbor.data.direction === direction);
            }
    
            /**
             * The direction toward the path belt feeding `record`; opposite the flow when uncached.
             * @param {Client} client
             * @param {CacheEntry} record - belt cache entry
             * @param {number} feederId - the next part toward the input
             * @returns {Direction}
             * @private
             */
            _pathSourceDirection(client, record, feederId) {
                const feeder = client.objects.get(feederId);
                if (feeder === null) {
                    return _sdk.Direction.invert(record.data.direction);
                }
                return _sdk.Direction.fromDelta(
                    Math.sign(feeder.tileX - record.tileX),
                    Math.sign(feeder.tileY - record.tileY),
                );
            }
    
            /**
             * The direction an item enters a head belt from; opposite the flow when no feeder is cached.
             * @param {Client} client
             * @param {CacheEntry} record - belt cache entry
             * @returns {Direction}
             * @private
             */
            _sourceDirection(client, record) {
                const {parentX, parentY} = geometry_js.inferBeltParent(client.objects, record.tileX, record.tileY, record.data.direction);
                if (parentX !== null && parentY !== null) {
                    return _sdk.Direction.fromDelta(Math.sign(parentX - record.tileX), Math.sign(parentY - record.tileY));
                }
                return _sdk.Direction.invert(record.data.direction);
            }
    
            /**
             * Adds a cached belt entry to the draw layer; a ramp also masks the item layer with its roof.
             * @param {Client} client
             * @param {CacheEntry} entry
             * @private
             */
            _onBeltSet(client, entry) {
                const kind = entry.data.type.beltKind;
                // Added straight; the belt layer re-derives the bend on structural cache changes.
                this._beltLayer.addBelt(entry.id, entry.tileX, entry.tileY, entry.data.direction, kind);
                if (geometry_js.isRamp(kind)) {
                    this._addRampMasks(client, entry);
                }
            }
    
            /**
             * Clears everything hanging off a removed belt entry.
             * @param {Client} client
             * @param {CacheEntry} entry
             * @private
             */
            _onBeltRemoved(client, entry) {
                const id = entry.id;
                this._beltLayer.removeBelt(id);
                if (geometry_js.isRamp(entry.data.type.beltKind)) {
                    this._removeRampMasks(client, id);
                }
                this._clearPathItems(client, id);
                // Sprite goes when the removed belt renders the port item or heads the path; mapping goes only with the head.
                for (const [head, portId] of this._pathToOutPort) {
                    const parts = this._pathParts.get(head);
                    const rendersHere = parts !== undefined && parts[0] === id;
                    if (rendersHere || head === id) {
                        client.itemLayer.removeItem(_sdk.PORT_SPRITE_KEY(portId));
                    }
                    if (head === id) {
                        this._outPortToPath.delete(portId);
                        this._pathToOutPort.delete(head);
                    }
                }
                if (this._pathParts.delete(id)) {
                    this._pathDebugLayer.markStale();
                }
            }
    
            /**
             * Adds a ramp's item occluders: a roof on its own tile and a threshold strip on the buried neighbor.
             * @param {Client} client
             * @param {CacheEntry} entry
             * @private
             */
            _addRampMasks(client, entry) {
                const kind = entry.data.type.beltKind;
                const direction = entry.data.direction;
                // RAMP_DOWN roofs its up edge (tunnel mouth), RAMP_UP its down edge (where items surface).
                const roofY = kind === constants_js.BELT_RAMP_UP ? _sdk.TILE_SIZE - 36 : 0;
                const roof = new _sdk.Rectangle(0, roofY, _sdk.TILE_SIZE, 36);
                client.itemLayer.addMask(`roof:${entry.id}`, entry.tileX, entry.tileY, roof, direction);
                const step = constants_js.tunnelStep(kind, direction);
                // Rotating by the direction back toward the ramp lands the band on the shared edge.
                const edgeDirection = _sdk.Direction.fromDelta(-step.dx, -step.dy);
                const threshold = new _sdk.Rectangle(0, 0, _sdk.TILE_SIZE, _sdk.TILE_SIZE / 4);
                client.itemLayer.addMask(`threshold:${entry.id}`, entry.tileX + step.dx, entry.tileY + step.dy, threshold, edgeDirection);
            }
    
            /**
             * Removes a ramp's roof and threshold occluders.
             * @param {Client} client
             * @param {number} id - the ramp's belt id
             * @private
             */
            _removeRampMasks(client, id) {
                client.itemLayer.removeMask(`roof:${id}`);
                client.itemLayer.removeMask(`threshold:${id}`);
            }
    
            /**
             * Tool-less hover: reveal the buried tunnel under a hovered ramp and return the tiles to highlight.
             * @param {number|null} tileX
             * @param {number|null} tileY
             * @param {Client} client
             * @returns {InspectHighlight[]}
             */
            onInspect(tileX, tileY, client) {
                if (tileX === null) {
                    this._overlayLayer.clearUndergroundReveal();
                    return [];
                }
                const records = client.objects.getAtTile(tileX, tileY);
                const surface = geometry_js.surfaceBeltAt(client.objects, tileX, tileY);
                const ramp = records.find(record => objectTypes_js.isBeltType(record.data.type) && geometry_js.isRamp(record.data.type.beltKind));
                const tunnel = ramp === undefined ? null : geometry_js.walkTunnel(client.objects, ramp);
    
                // Highlight the hovered surface belt/ramp, plus the tunneled-to ramp (alternate highlight).
                const highlights = [];
                if (surface !== null) {
                    highlights.push(new _sdk.InspectHighlight(tileX, tileY, surface.data.direction, surface.data.type));
                }
                if (tunnel !== null && tunnel.pair !== null) {
                    highlights.push(new _sdk.InspectHighlight(tunnel.pair.tileX, tunnel.pair.tileY, tunnel.pair.data.direction, tunnel.pair.data.type, true));
                }
    
                if (tunnel === null) {
                    this._overlayLayer.clearUndergroundReveal();
                } else {
                    this._overlayLayer.showUndergroundReveal(tunnel.tiles, ramp.data.direction);
                }
                return highlights;
            }
    
        }
    
        exports.LogisticsClientMod = LogisticsClientMod;
    
        return exports;
    
    })({}, sdk, __c1, __c3, __c4, __c2);
    
    return new (__only(__part, "client"))();
}
