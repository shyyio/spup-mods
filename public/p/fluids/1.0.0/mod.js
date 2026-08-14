// Built by tools/build-mod.js — do not edit.

let __coreModules = null;

function __coreOf(sdk) {
    if (__coreModules === null) {
        var __part = (function (exports, _sdk) {
        
            // Shared numeric constants for the Fluids mod.
        
            // Neighbor scan order for network adjacency.
            const DIRECTIONS = [_sdk.Direction.UP, _sdk.Direction.RIGHT, _sdk.Direction.DOWN, _sdk.Direction.LEFT];
        
            /**
             * Folds the fluid-type candidates around a prospective pipe tile; the sim and client feed their
             * own lookups so the join rule lives once.
             * @param {function(Direction): number[]} candidatesAt
             * @returns {number|null} the single joined type (EMPTY when none), or null on a conflict
             */
            function joinedFluidType(candidatesAt) {
                let fluidType = _sdk.EMPTY;
                for (const direction of DIRECTIONS) {
                    for (const candidate of candidatesAt(direction)) {
                        if (candidate === _sdk.EMPTY) {
                            continue;
                        }
                        if (fluidType !== _sdk.EMPTY && fluidType !== candidate) {
                            return null;
                        }
                        fluidType = candidate;
                    }
                }
                return fluidType;
            }
        
            // ---- Fluid types ----
            // Mod-owned numbers, same convention as item types; a network adopts whatever number lands in
            // its ports.
            const FLUID_TYPE_WATER = 230;
            const FLUID_TYPE_OIL = 231;
        
            /**
             * A fluid type ordinal.
             * @typedef {number} FluidType
             */
        
            // Units per port payload per tick; a typical 100-unit recipe is ten payloads.
            const FLUID_UNIT = 10;
        
            // Units one pipe segment buffers; a network's capacity is its segment count times this.
            const PIPE_SEGMENT_CAPACITY = 100;
        
            // Units one tank holds.
            const TANK_CAPACITY = 1000;
        
            // Map-mode / fill colors by fluid type.
            const FLUID_COLORS = {
                [FLUID_TYPE_WATER]: 0x3f8fd2,
                [FLUID_TYPE_OIL]: 0x2b2620,
            };
        
            // Fill color for fluid numbers without an entry.
            const DEFAULT_FLUID_COLOR = 0x62b6cb;
        
            /**
             * The fill color for a fluid type.
             * @param {FluidType} fluidType
             * @returns {number}
             */
            function fluidColor(fluidType) {
                const color = FLUID_COLORS[fluidType];
                if (color === undefined) {
                    return DEFAULT_FLUID_COLOR;
                }
                return color;
            }
        
            // The fluid overlay draws above the default object sprites (20).
            const DRAW_LAYER_PIPE_FLUID = 21;
        
            var m1 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                DIRECTIONS: DIRECTIONS,
                DRAW_LAYER_PIPE_FLUID: DRAW_LAYER_PIPE_FLUID,
                FLUID_TYPE_OIL: FLUID_TYPE_OIL,
                FLUID_TYPE_WATER: FLUID_TYPE_WATER,
                FLUID_UNIT: FLUID_UNIT,
                PIPE_SEGMENT_CAPACITY: PIPE_SEGMENT_CAPACITY,
                TANK_CAPACITY: TANK_CAPACITY,
                fluidColor: fluidColor,
                joinedFluidType: joinedFluidType
            });
        
            // `networkId` = the first member pipe's object id. Fluid events are network-granular, so deltas
            // scale with networks, not pipe tiles.
        
            /**
             * Restates one pipe network's membership after a placement edit.
             */
            class PipeNetworkRecalculateEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    networkId: "int64",
                    parts: "int64[]",
                };
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number} networkId
                 * @param {number[]} parts - member pipe ids, ascending
                 */
                constructor(x, y, networkId, parts) {
                    super(x, y);
                    this.networkId = networkId;
                    this.parts = parts;
                }
            }
        
            /**
             * One chunk's pipe networks as packed columns: network `i` owns the next `partCounts[i]` entries
             * of `parts`.
             */
            class PipeNetworkBatchEvent extends _sdk.AbstractBatchEvent {
        
                static wireFields = {
                    networkIds: "int64[]",
                    partCounts: "int32[]",
                    parts: "int64[]",
                };
        
                /**
                 * @param {number} x - the batched chunk's origin tile, routes the batch to that topic
                 * @param {number} y
                 */
                constructor(x, y) {
                    super(x, y);
                    this.networkIds = [];
                    this.partCounts = [];
                    this.parts = [];
                }
        
                /**
                 * @param {number} networkId
                 * @param {number[]} parts - member pipe ids, ascending
                 * @returns {void}
                 */
                add(networkId, parts) {
                    this.networkIds.push(networkId);
                    this.partCounts.push(parts.length);
                    this.parts.push(...parts);
                }
        
                /**
                 * @returns {PipeNetworkRecalculateEvent[]}
                 */
                explode() {
                    const events = [];
                    let partAt = 0;
                    for (let i = 0; i < this.networkIds.length; i += 1) {
                        const parts = this.parts.slice(partAt, partAt + this.partCounts[i]);
                        partAt += this.partCounts[i];
                        events.push(new PipeNetworkRecalculateEvent(this.x, this.y, this.networkIds[i], parts));
                    }
                    return events;
                }
            }
        
            /**
             * A tank's held fluid type changed; EMPTY (-1) when drained. Amounts stay sim-side.
             */
            class TankFluidSetEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    objectId: "int64",
                    fluidType: "sint32",
                };
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number} objectId
                 * @param {number} fluidType
                 */
                constructor(x, y, objectId, fluidType) {
                    super(x, y);
                    this.objectId = objectId;
                    this.fluidType = fluidType;
                }
            }
        
            /**
             * A pipe network's fluid state changed; fluidType is EMPTY (-1) when drained.
             */
            class PipeFluidSetEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    networkId: "int64",
                    fluidType: "sint32",
                    amount: "int32",
                };
        
                /**
                 * @param {number} x
                 * @param {number} y
                 * @param {number} networkId
                 * @param {number} fluidType
                 * @param {number} amount
                 */
                constructor(x, y, networkId, fluidType, amount) {
                    super(x, y);
                    this.networkId = networkId;
                    this.fluidType = fluidType;
                    this.amount = amount;
                }
            }
        
            /**
             * One chunk's fluid-state deltas for a tick, as parallel columns.
             */
            class PipeFluidBatchEvent extends _sdk.AbstractBatchEvent {
        
                static wireFields = {
                    networkIds: "int64[]",
                    fluidTypes: "sint32[]",
                    amounts: "int32[]",
                };
        
                /**
                 * @param {number} x - a network origin in the batched chunk, routes the batch to that topic
                 * @param {number} y
                 */
                constructor(x, y) {
                    super(x, y);
                    this.networkIds = [];
                    this.fluidTypes = [];
                    this.amounts = [];
                }
        
                /**
                 * @param {number} networkId
                 * @param {number} fluidType
                 * @param {number} amount
                 * @returns {void}
                 */
                add(networkId, fluidType, amount) {
                    this.networkIds.push(networkId);
                    this.fluidTypes.push(fluidType);
                    this.amounts.push(amount);
                }
        
                /**
                 * @returns {PipeFluidSetEvent[]}
                 */
                explode() {
                    const events = [];
                    for (let i = 0; i < this.networkIds.length; i += 1) {
                        events.push(new PipeFluidSetEvent(this.x, this.y, this.networkIds[i], this.fluidTypes[i], this.amounts[i]));
                    }
                    return events;
                }
            }
        
            var m2 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                PipeFluidBatchEvent: PipeFluidBatchEvent,
                PipeFluidSetEvent: PipeFluidSetEvent,
                PipeNetworkBatchEvent: PipeNetworkBatchEvent,
                PipeNetworkRecalculateEvent: PipeNetworkRecalculateEvent,
                TankFluidSetEvent: TankFluidSetEvent
            });
        
            /**
             * One same-chunk connected component of pipe tiles, holding a uniform (fluidType, amount).
             */
            class PipeNetwork {
        
                /**
                 * @param {number} netId
                 * @param {number} chunk
                 * @param {number} originX
                 * @param {number} originY
                 * @param {{x:number, y:number, id:number}[]} pipes
                 * @param {Set<number>} tiles
                 * @param {number} fluidType
                 * @param {number} amount
                 * @param {number} capacity
                 * @param {number[]} inPorts
                 * @param {{x:number, y:number, direction:number, neighborKey:number}[]} outEdges
                 */
                constructor(netId, chunk, originX, originY, pipes, tiles, fluidType, amount, capacity, inPorts, outEdges) {
                    this.netId = netId;
                    this.chunk = chunk;
                    this.originX = originX;
                    this.originY = originY;
                    this.pipes = pipes;
                    this.tiles = tiles;
                    this.fluidType = fluidType;
                    this.amount = amount;
                    this.capacity = capacity;
                    this.inPorts = inPorts;
                    this.outEdges = outEdges;
                    // Last state synced to clients, so POST_RESOLVE emits only changes.
                    this.lastType = fluidType;
                    this.lastAmount = amount;
                    // The fluidSourceGeneration this network last rebound its boundary type against.
                    this.sourceGen = 0;
                }
            }
        
            /**
             * Pipe fluid transport: a network is the same-chunk connected component of pipe tiles (never
             * crossing a seam) holding one uniform (fluidType, amount), so equalization is free. Boundary
             * edges reuse the port-transfer resolver: drain resting payloads at in-ports, create one
             * FLUID_UNIT payload per out-edge port.
             */
            class Pipes {
        
                /**
                 * @param {GameEngine} engine
                 */
                constructor(engine) {
                    this.engine = engine;
                    // Placed pipes by tile key and id; one pipe per tile.
                    this._pipeByTile = new Map();
                    this._pipeById = new Map();
                    /**
                     * Live networks.
                     * @type {PipeNetwork[]}
                     */
                    this.networks = [];
                    // Tile key -> covering network, and chunk -> its networks.
                    this._networkByTile = new Map();
                    this._networksByChunk = new Map();
                    // This tick's emission intents, so POST_RESOLVE decrements only what resolved.
                    this._emittedPorts = [];
                    this._emittedNets = [];
        
                    // snapshotOnly mirrors of the JS records above, written at save/load.
                    this._netDef = engine.defineComponent("PipeNetwork", [
                        {name: "fluidType", fill: _sdk.EMPTY},
                        {name: "amount"},
                    ], {snapshotOnly: true});
                    this._memberDef = engine.defineComponent("PipeNetworkMember", [
                        {name: "network", kind: "eid", fill: _sdk.NO_EID},
                        {name: "objectId", fill: _sdk.NO_EID},
                    ], {snapshotOnly: true});
        
                    engine.registerSystem(_sdk.TickPhase.SUBMIT_INTENTS, () => this._submitIntents());
                    engine.registerSystem(_sdk.TickPhase.POST_RESOLVE, () => this._apply());
                    engine.registerSerializeHook(() => this._materialize());
                    engine.registerRebuildHook(() => this._reconstruct());
                    engine.registerPortPin(() => this._pinnedPorts());
                    engine.registerChunkSync(chunk => this.chunkSync(chunk));
                }
        
                /**
                 * @returns {number}
                 */
                get pipeCount() {
                    return this._pipeById.size;
                }
        
                /**
                 * The placed pipe with client-facing `id`, or null.
                 * @param {number} id
                 * @returns {{x:number, y:number, id:number}|null}
                 */
                pipeById(id) {
                    const found = this._pipeById.get(id);
                    if (found === undefined) {
                        return null;
                    }
                    return found;
                }
        
                /**
                 * The network covering tile (x, y), or null.
                 * @param {number} x
                 * @param {number} y
                 * @returns {{id:number, fluidType:number, amount:number, capacity:number, size:number}|null}
                 */
                networkAt(x, y) {
                    const net = this._networkByTile.get(_sdk.tileId(x, y));
                    if (net === undefined) {
                        return null;
                    }
                    return {id: net.netId, fluidType: net.fluidType, amount: net.amount, capacity: net.capacity, size: net.pipes.length};
                }
        
                /**
                 * Whether a pipe at (x, y) would join at most one fluid type (merged networks plus adopted
                 * producer out-ports).
                 * @param {number} x
                 * @param {number} y
                 * @returns {boolean}
                 */
                canJoin(x, y) {
                    const chunk = _sdk.chunkId(x, y);
                    return joinedFluidType(direction => {
                        const nx = x + _sdk.Direction.dx(direction);
                        const ny = y + _sdk.Direction.dy(direction);
                        const candidates = [];
                        if (_sdk.chunkId(nx, ny) === chunk) {
                            const net = this._networkByTile.get(_sdk.tileId(nx, ny));
                            if (net !== undefined) {
                                candidates.push(net.fluidType);
                            }
                        }
                        const port = this.engine.peekPortAt(x, y, _sdk.Direction.invert(direction));
                        if (port !== null) {
                            candidates.push(this.engine.portFluidSource(port));
                        }
                        return candidates;
                    }) !== null;
                }
        
                /**
                 * Registers a placed pipe, rebuilding its connected component into one network; merged amounts
                 * pool, mixed types must be pre-rejected via {@link canJoin}.
                 * @param {number} x
                 * @param {number} y
                 * @param {number} [id] - the pipe's object id, allocated by the generic spawn path
                 * @returns {number} the network id
                 */
                placePipe(x, y, id=undefined) {
                    const pipe = {x, y, id: id === undefined ? this.engine.createObjectId() : id};
                    this._pipeByTile.set(_sdk.tileId(x, y), pipe);
                    this._pipeById.set(pipe.id, pipe);
        
                    const component = this._collectComponent(pipe);
                    const overlapping = new Set();
                    for (const member of component) {
                        const held = this._networkByTile.get(_sdk.tileId(member.x, member.y));
                        if (held !== undefined) {
                            overlapping.add(held);
                        }
                    }
                    let amount = 0;
                    let fluidType = _sdk.EMPTY;
                    for (const net of overlapping) {
                        amount += net.amount;
                        if (net.fluidType !== _sdk.EMPTY) {
                            if (fluidType !== _sdk.EMPTY && fluidType !== net.fluidType) {
                                throw new Error(`Pipe at (${x}, ${y}) merges networks of different fluid types; guard placement with canJoin`);
                            }
                            fluidType = net.fluidType;
                        }
                        this._dropNetwork(net);
                    }
                    if (amount === 0) {
                        fluidType = _sdk.EMPTY;
                    }
                    const net = this._buildNetwork(component, fluidType, amount);
                    this._emitNetworkEvents(net);
                    return net.netId;
                }
        
                /**
                 * Removes the pipe with client-facing `id`, splitting its network; the amount is shared out by
                 * component size.
                 * @param {number} id
                 * @returns {boolean} whether a pipe was removed
                 */
                removePipe(id) {
                    const pipe = this._pipeById.get(id);
                    if (pipe === undefined) {
                        return false;
                    }
                    const net = this._networkByTile.get(_sdk.tileId(pipe.x, pipe.y));
                    this._dropNetwork(net);
                    this._pipeByTile.delete(_sdk.tileId(pipe.x, pipe.y));
                    this._pipeById.delete(id);
        
                    const covered = new Set();
                    const components = [];
                    for (const survivor of net.pipes) {
                        if (survivor.id === id || covered.has(survivor.id)) {
                            continue;
                        }
                        const component = this._collectComponent(survivor);
                        for (const member of component) {
                            covered.add(member.id);
                        }
                        components.push(component);
                    }
                    if (components.length === 0) {
                        return true;
                    }
        
                    // Floor shares, remainder wherever capacity is left; total capacity covers the amount.
                    const total = net.pipes.length - 1;
                    const shares = components.map(component => Math.floor(net.amount * component.length / total));
                    let leftover = net.amount - shares.reduce((sum, share) => sum + share, 0);
                    for (let i = 0; leftover > 0 && i < components.length; i += 1) {
                        const spare = components[i].length * PIPE_SEGMENT_CAPACITY - shares[i];
                        const grant = Math.min(spare, leftover);
                        shares[i] += grant;
                        leftover -= grant;
                    }
                    for (const [index, component] of components.entries()) {
                        let fluidType = net.fluidType;
                        if (shares[index] === 0) {
                            fluidType = _sdk.EMPTY;
                        }
                        const rebuilt = this._buildNetwork(component, fluidType, shares[index]);
                        this._emitNetworkEvents(rebuilt);
                    }
                    return true;
                }
        
                /**
                 * Pours fluid into the network at (x, y), clamped to free capacity; for tests/debugging.
                 * @param {number} x
                 * @param {number} y
                 * @param {number} fluidType
                 * @param {number} amount
                 * @returns {number} the amount added
                 */
                addFluid(x, y, fluidType, amount) {
                    const net = this._networkByTile.get(_sdk.tileId(x, y));
                    if (net === undefined) {
                        throw new Error(`No pipe network at (${x}, ${y})`);
                    }
                    if (net.fluidType !== _sdk.EMPTY && net.fluidType !== fluidType) {
                        throw new Error(`Network at (${x}, ${y}) already holds fluid type ${net.fluidType}`);
                    }
                    const added = Math.min(amount, net.capacity - net.amount);
                    if (added > 0) {
                        net.amount += added;
                        net.fluidType = fluidType;
                    }
                    return added;
                }
        
                /**
                 * The same-chunk connected component through `pipe`, members ascending by id.
                 * @private
                 * @param {{x:number, y:number, id:number}} pipe
                 * @returns {object[]}
                 */
                _collectComponent(pipe) {
                    const chunk = _sdk.chunkId(pipe.x, pipe.y);
                    const seen = new Set([_sdk.tileId(pipe.x, pipe.y)]);
                    const stack = [pipe];
                    const component = [];
                    while (stack.length > 0) {
                        const current = stack.pop();
                        component.push(current);
                        for (const direction of DIRECTIONS) {
                            const nx = current.x + _sdk.Direction.dx(direction);
                            const ny = current.y + _sdk.Direction.dy(direction);
                            const key = _sdk.tileId(nx, ny);
                            if (seen.has(key) || _sdk.chunkId(nx, ny) !== chunk) {
                                continue;
                            }
                            const neighbor = this._pipeByTile.get(key);
                            if (neighbor !== undefined) {
                                seen.add(key);
                                stack.push(neighbor);
                            }
                        }
                    }
                    return component.sort((a, b) => a.id - b.id);
                }
        
                /**
                 * A new indexed network over `pipes`: in-ports created per boundary edge, out-edges resolved
                 * lazily each tick; emits nothing.
                 * @private
                 * @param {object[]} pipes
                 * @param {number} fluidType
                 * @param {number} amount
                 * @returns {PipeNetwork}
                 */
                _buildNetwork(pipes, fluidType, amount) {
                    const tiles = new Set(pipes.map(pipe => _sdk.tileId(pipe.x, pipe.y)));
                    const inPorts = [];
                    const outEdges = [];
                    for (const pipe of pipes) {
                        for (const direction of DIRECTIONS) {
                            const nx = pipe.x + _sdk.Direction.dx(direction);
                            const ny = pipe.y + _sdk.Direction.dy(direction);
                            if (tiles.has(_sdk.tileId(nx, ny))) {
                                continue;
                            }
                            const inPort = this.engine.portAt(pipe.x, pipe.y, _sdk.Direction.invert(direction));
                            this.engine.markFluidPort(inPort);
                            inPorts.push(inPort);
                            outEdges.push({x: nx, y: ny, direction, neighborKey: _sdk.tileId(nx, ny)});
                        }
                    }
                    const first = pipes[0];
                    const net = new PipeNetwork(
                        first.id,
                        _sdk.chunkId(first.x, first.y),
                        first.x,
                        first.y,
                        pipes,
                        tiles,
                        fluidType,
                        amount,
                        pipes.length * PIPE_SEGMENT_CAPACITY,
                        inPorts,
                        outEdges,
                    );
                    this.networks.push(net);
                    for (const key of tiles) {
                        this._networkByTile.set(key, net);
                    }
                    _sdk.getOrCreate(this._networksByChunk, net.chunk, () => new Set()).add(net);
                    // An adopted producer out-port binds the type before the first payload.
                    net.sourceGen = this.engine.fluidSourceGeneration;
                    if (net.fluidType === _sdk.EMPTY) {
                        const bound = this._boundarySourceType(net);
                        net.fluidType = bound;
                        net.lastType = bound;
                    }
                    return net;
                }
        
                /**
                 * The fluid type produced into one of the network's in-ports, or EMPTY.
                 * @private
                 * @param {PipeNetwork} net
                 * @returns {number}
                 */
                _boundarySourceType(net) {
                    for (const port of net.inPorts) {
                        const source = this.engine.portFluidSource(port);
                        if (source !== _sdk.EMPTY) {
                            return source;
                        }
                    }
                    return _sdk.EMPTY;
                }
        
                /**
                 * @private
                 * @param {PipeNetwork} net
                 * @returns {void}
                 */
                _dropNetwork(net) {
                    this.networks.splice(this.networks.indexOf(net), 1);
                    for (const key of net.tiles) {
                        this._networkByTile.delete(key);
                    }
                    _sdk.removeFromGroup(this._networksByChunk, net.chunk, net);
                    for (const port of net.inPorts) {
                        this.engine.unmarkFluidPort(port);
                    }
                }
        
                /**
                 * @private
                 * @param {PipeNetwork} net
                 * @returns {void}
                 */
                _emitNetworkEvents(net) {
                    this.engine.emitEvent(new PipeNetworkRecalculateEvent(net.originX, net.originY, net.netId, net.pipes.map(pipe => pipe.id)));
                    this.engine.emitEvent(new PipeFluidSetEvent(net.originX, net.originY, net.netId, net.fluidType, net.amount));
                }
        
                /**
                 * The port eids the live networks still reference, so the engine's port sweep keeps them.
                 * @private
                 * @returns {number[]}
                 */
                _pinnedPorts() {
                    const ports = [];
                    for (const net of this.networks) {
                        for (const port of net.inPorts) {
                            ports.push(port);
                        }
                    }
                    return ports;
                }
        
                /**
                 * SUBMIT_INTENTS: drain type-matching payloads at in-ports (a mismatch backs up), then create
                 * one payload per out-edge port, capped by amount; seams push only strictly downhill into a
                 * free or same-type network.
                 * @private
                 * @returns {void}
                 */
                _submitIntents() {
                    const engine = this.engine;
                    const P = engine.Port.item;
                    this._emittedPorts.length = 0;
                    this._emittedNets.length = 0;
                    for (const net of this.networks) {
                        for (const port of net.inPorts) {
                            const resting = P[port];
                            if (resting === _sdk.EMPTY || net.capacity - net.amount < FLUID_UNIT) {
                                continue;
                            }
                            if (net.fluidType !== _sdk.EMPTY && resting !== net.fluidType) {
                                continue;
                            }
                            engine.submitDrain(port, true);
                            net.fluidType = resting;
                            net.amount += FLUID_UNIT;
                        }
        
                        let budget = net.amount;
                        if (budget === 0) {
                            continue;
                        }
                        for (const edge of net.outEdges) {
                            if (budget < FLUID_UNIT) {
                                break;
                            }
                            // Only fluid-flagged ports receive payloads.
                            const dest = engine.peekPortAt(edge.x, edge.y, edge.direction);
                            if (dest === null || !engine.isFluidPort(dest)) {
                                continue;
                            }
                            const neighborNet = this._networkByTile.get(edge.neighborKey);
                            if (neighborNet !== undefined) {
                                if (neighborNet.fluidType !== _sdk.EMPTY && neighborNet.fluidType !== net.fluidType) {
                                    continue;
                                }
                                if (net.amount * neighborNet.capacity <= neighborNet.amount * net.capacity) {
                                    continue;
                                }
                            }
                            engine.submitCreate(dest, net.fluidType, P[dest] === _sdk.EMPTY);
                            this._emittedPorts.push(dest);
                            this._emittedNets.push(net);
                            budget -= FLUID_UNIT;
                        }
                    }
                }
        
                /**
                 * POST_RESOLVE: debit each resolved emission, clear a drained network's type, and batch the
                 * changed fluid states per observed chunk.
                 * @private
                 * @returns {void}
                 */
                _apply() {
                    const engine = this.engine;
                    for (let i = 0; i < this._emittedPorts.length; i += 1) {
                        if (engine.wasResolvedDest(this._emittedPorts[i])) {
                            this._emittedNets[i].amount -= FLUID_UNIT;
                        }
                    }
                    const batches = new Map();
                    const sourceGen = engine.fluidSourceGeneration;
                    for (const net of this.networks) {
                        // A drained network re-binds to a connected producer's type (EMPTY when none) — only
                        // when just drained or a source changed, so idle networks skip the port scan.
                        if (net.amount === 0 && (net.lastAmount !== 0 || net.sourceGen !== sourceGen)) {
                            net.fluidType = this._boundarySourceType(net);
                            net.sourceGen = sourceGen;
                        }
                        if (net.fluidType === net.lastType && net.amount === net.lastAmount) {
                            continue;
                        }
                        net.lastType = net.fluidType;
                        net.lastAmount = net.amount;
                        if (!engine.observesTile(net.originX, net.originY)) {
                            continue;
                        }
                        const batch = _sdk.getOrCreate(batches, net.chunk, () => new PipeFluidBatchEvent(net.originX, net.originY));
                        batch.add(net.netId, net.fluidType, net.amount);
                    }
                    for (const batch of batches.values()) {
                        engine.emitEvent(batch);
                    }
                }
        
                /**
                 * The events recreating `chunk`'s networks and fluid state for a just-subscribed session.
                 * @param {number} chunk
                 * @returns {object[]}
                 */
                chunkSync(chunk) {
                    const nets = this._networksByChunk.get(chunk);
                    if (nets === undefined) {
                        return [];
                    }
                    const origin = _sdk.chunkOrigin(chunk);
                    let topology = null;
                    let fluid = null;
                    for (const net of nets) {
                        if (topology === null) {
                            topology = new PipeNetworkBatchEvent(origin.x, origin.y);
                        }
                        topology.add(net.netId, net.pipes.map(pipe => pipe.id));
                        if (net.amount > 0) {
                            if (fluid === null) {
                                fluid = new PipeFluidBatchEvent(net.originX, net.originY);
                            }
                            fluid.add(net.netId, net.fluidType, net.amount);
                        }
                    }
                    // Topology before fluid: the client fans fluid state out over the membership.
                    return [topology, fluid].filter(batch => batch !== null);
                }
        
                /**
                 * Serialize hook: flushes the JS network runtime into the snapshot components, clearing prior
                 * save entities.
                 * @private
                 * @returns {void}
                 */
                _materialize() {
                    for (const def of [this._memberDef, this._netDef]) {
                        for (const eid of this.engine.entitiesWith(def)) {
                            this.engine.destroyEntity(eid);
                        }
                    }
                    const N = this._netDef.store;
                    const M = this._memberDef.store;
                    for (const net of this.networks) {
                        const netEid = this.engine.createEntity(this._netDef);
                        N.fluidType[netEid] = net.fluidType;
                        N.amount[netEid] = net.amount;
                        for (const pipe of net.pipes) {
                            const memberEid = this.engine.createEntity(this._memberDef);
                            M.network[memberEid] = netEid;
                            M.objectId[memberEid] = pipe.id;
                        }
                    }
                }
        
                /**
                 * Clears the pipe indexes ahead of a rebuild; pipes re-register before the network hook re-links.
                 * @returns {void}
                 */
                resetPipes() {
                    this._pipeByTile = new Map();
                    this._pipeById = new Map();
                }
        
                /**
                 * Re-registers one placed pipe after a load.
                 * @param {{x:number, y:number, id:number}} pipe
                 * @returns {void}
                 */
                registerPipe(pipe) {
                    this._pipeByTile.set(_sdk.tileId(pipe.x, pipe.y), pipe);
                    this._pipeById.set(pipe.id, pipe);
                }
        
                /**
                 * Rebuild hook: re-links each network from the snapshot components over the re-registered pipes.
                 * @private
                 * @returns {void}
                 */
                _reconstruct() {
                    this.networks = [];
                    this._networkByTile = new Map();
                    this._networksByChunk = new Map();
        
                    const N = this._netDef.store;
                    const M = this._memberDef.store;
                    const membersByNet = new Map();
                    for (const eid of this.engine.entitiesWith(this._memberDef)) {
                        const pipe = this.pipeById(M.objectId[eid]);
                        if (pipe === null) {
                            throw new Error(`PipeNetworkMember references unknown pipe ${M.objectId[eid]}`);
                        }
                        _sdk.getOrCreate(membersByNet, M.network[eid], () => []).push(pipe);
                    }
                    for (const netEid of this.engine.entitiesWith(this._netDef)) {
                        const pipes = membersByNet.get(netEid);
                        if (pipes === undefined) {
                            throw new Error(`PipeNetwork entity ${netEid} has no members`);
                        }
                        this._buildNetwork(pipes.sort((a, b) => a.id - b.id), N.fluidType[netEid], N.amount[netEid]);
                    }
                }
            }
        
            var m5 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                Pipes: Pipes
            });
        
            /**
             * A pipe cell: spawn/despawn feed the shared Pipes network engine; placement is rejected when it
             * would merge same-chunk networks holding different fluids.
             */
            class PipeBehavior extends _sdk.AbstractBehavior {
        
                install(engine, placed) {
                    engine.provide(Pipes, new Pipes(engine));
                }
        
                canSpawn(engine, placed, type, message) {
                    return engine.resolve(Pipes).canJoin(message.x, message.y);
                }
        
                onSpawn(engine, placed, eid, type, message) {
                    engine.resolve(Pipes).placePipe(message.x, message.y, placed.objectIdOf(eid));
                }
        
                onDespawn(engine, placed, eid) {
                    engine.resolve(Pipes).removePipe(placed.objectIdOf(eid));
                }
        
                /**
                 * Re-registers every placed pipe with the network engine after a load.
                 * @param {GameEngine} engine
                 * @param {PlacedObjects} placed
                 * @returns {void}
                 */
                onRebuild(engine, placed) {
                    const pipes = engine.resolve(Pipes);
                    pipes.resetPipes();
                    const def = placed.def;
                    const placedObject = def.store;
                    const position = engine.Position;
                    for (let row = 0; row < def.count; row += 1) {
                        if (!(placed.behaviorFor(placedObject.typeId[row]) instanceof PipeBehavior)) {
                            continue;
                        }
                        const eid = def.eids[row];
                        pipes.registerPipe({
                            x: position.x[eid],
                            y: position.y[eid],
                            id: placedObject.objectId[row],
                        });
                    }
                }
            }
        
            var m4 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                PipeBehavior: PipeBehavior
            });
        
            /**
             * A fluid buffer: drains type-matching in-port payloads into an amount counter and creates one
             * out-port payload per tick while holding fluid.
             */
            class TankBehavior extends _sdk.AbstractBehavior {
        
                /**
                 * @param {object} config
                 * @param {number} config.capacity - units the tank holds
                 */
                constructor({capacity}) {
                    super();
                    this.capacity = capacity;
                }
        
                install(engine, placed) {
                    engine.defineComponent("Tank", [
                        {name: "in", kind: "eid", fill: _sdk.NO_EID},
                        {name: "out", kind: "eid", fill: _sdk.NO_EID},
                        {name: "fluidType", fill: _sdk.EMPTY},
                        {name: "amount"},
                        // Denormalized from the behavior so the tick pass stays on the row.
                        {name: "capacity"},
                        // Last type synced to clients, so the tick emits only type changes.
                        {name: "lastType", fill: _sdk.EMPTY},
                    ], {sparse: true});
                    engine.registerSystem(_sdk.TickPhase.SUBMIT_INTENTS, () => TankBehavior._submitIntents(engine));
                    engine.registerSystem(_sdk.TickPhase.POST_RESOLVE, () => TankBehavior._finish(engine, placed));
                }
        
                onSpawn(engine, placed, eid, type, message) {
                    const def = engine.component("Tank");
                    engine.attachComponent(def, eid);
                    const tank = def.store;
                    const row = def.row(eid);
                    tank.in[row] = engine.portFor(type.inputPorts[0], message.x, message.y, message.direction).port;
                    tank.out[row] = engine.portFor(type.outputPorts[0], message.x, message.y, message.direction).port;
                    tank.capacity[row] = this.capacity;
                    engine.markFluidPort(tank.in[row]);
                    engine.markFluidPort(tank.out[row]);
                }
        
                onDespawn(engine, placed, eid) {
                    const def = engine.component("Tank");
                    const row = def.row(eid);
                    const tank = def.store;
                    engine.unmarkFluidPort(tank.in[row]);
                    engine.unmarkFluidPort(tank.out[row]);
                    // The port may outlive the tank (an adjacent pipe pins it); it no longer produces.
                    engine.setPortFluidSource(tank.out[row], _sdk.EMPTY);
                }
        
                /**
                 * The held fluid rides the lastOutput slot, so a subscribing client learns the type.
                 * @param {GameEngine} engine
                 * @param {PlacedObjects} placed
                 * @param {number} eid
                 * @returns {{portIds:number[], lastOutput:number|null}}
                 */
                syncData(engine, placed, eid) {
                    const def = engine.component("Tank");
                    const row = def.row(eid);
                    let lastOutput = null;
                    if (def.store.amount[row] > 0) {
                        lastOutput = def.store.fluidType[row];
                    }
                    return {portIds: [], lastOutput};
                }
        
                /**
                 * Restores the denormalized capacity and the port fluid flags after a load.
                 * @param {GameEngine} engine
                 * @param {PlacedObjects} placed
                 * @returns {void}
                 */
                onRebuild(engine, placed) {
                    const def = engine.component("Tank");
                    const tank = def.store;
                    const eids = def.eids;
                    for (let row = 0; row < def.count; row += 1) {
                        tank.capacity[row] = placed.behaviorFor(placed.typeIdOf(eids[row])).capacity;
                        engine.markFluidPort(tank.in[row]);
                        engine.markFluidPort(tank.out[row]);
                        if (tank.fluidType[row] !== _sdk.EMPTY) {
                            engine.setPortFluidSource(tank.out[row], tank.fluidType[row]);
                        }
                    }
                }
        
                /**
                 * SUBMIT_INTENTS: drain a type-matching in-port payload; create an out-port payload while
                 * fluid is held.
                 * @private
                 * @param {GameEngine} engine
                 * @returns {void}
                 */
                static _submitIntents(engine) {
                    const item = engine.Port.item;
                    const def = engine.component("Tank");
                    const tank = def.store;
                    const count = def.count;
                    for (let row = 0; row < count; row += 1) {
                        const resting = item[tank.in[row]];
                        if (resting !== _sdk.EMPTY
                            && tank.capacity[row] - tank.amount[row] >= FLUID_UNIT
                            && (tank.amount[row] === 0 || resting === tank.fluidType[row])) {
                            engine.submitDrain(tank.in[row], true);
                            tank.fluidType[row] = resting;
                            tank.amount[row] += FLUID_UNIT;
                            engine.setPortFluidSource(tank.out[row], resting);
                        }
                        if (tank.amount[row] >= FLUID_UNIT) {
                            engine.submitCreate(tank.out[row], tank.fluidType[row], item[tank.out[row]] === _sdk.EMPTY);
                        }
                    }
                }
        
                /**
                 * POST_RESOLVE: debit a delivered out-port payload (a drained tank frees its type); sync type
                 * changes to observed chunks.
                 * @private
                 * @param {GameEngine} engine
                 * @param {PlacedObjects} placed
                 * @returns {void}
                 */
                static _finish(engine, placed) {
                    const def = engine.component("Tank");
                    const tank = def.store;
                    const position = engine.Position;
                    const count = def.count;
                    for (let row = 0; row < count; row += 1) {
                        if (engine.wasResolvedDest(tank.out[row])) {
                            tank.amount[row] -= FLUID_UNIT;
                            if (tank.amount[row] === 0) {
                                tank.fluidType[row] = _sdk.EMPTY;
                                engine.setPortFluidSource(tank.out[row], _sdk.EMPTY);
                            }
                        }
                        if (tank.fluidType[row] === tank.lastType[row]) {
                            continue;
                        }
                        tank.lastType[row] = tank.fluidType[row];
                        const eid = def.eids[row];
                        if (!engine.observesTile(position.x[eid], position.y[eid])) {
                            continue;
                        }
                        engine.emitEvent(new TankFluidSetEvent(
                            position.x[eid],
                            position.y[eid],
                            placed.objectIdOf(eid),
                            tank.fluidType[row],
                        ));
                    }
                }
            }
        
            var m6 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                TankBehavior: TankBehavior
            });
        
            // Portless: the network derives boundary ports from adjacency.
            const PipeDefinition = new _sdk.ObjectType({
                name: "Pipe",
                toolId: 7,
                geometry: "1x1",
                textureName: "pipe/0",
                directional: false,
                label: "Pipe",
                behavior: new PipeBehavior(),
                placement: new _sdk.PlacementRule({dragToPlace: true}),
            });
        
            /**
             * Whether an ObjectType is the pipe.
             * @param {ObjectType} type
             * @returns {boolean}
             */
            function isPipeType(type) {
                return type.behavior instanceof PipeBehavior;
            }
        
            /**
             * Whether an ObjectType is the tank.
             * @param {ObjectType} type
             * @returns {boolean}
             */
            function isTankType(type) {
                return type.behavior instanceof TankBehavior;
            }
        
            // Fed from below at its bottom-left tile, emitting above its top-right; the fluid out-port opts
            // out of item rendering.
            const TankDefinition = new _sdk.ObjectType({
                name: "Tank",
                toolId: 8,
                inputPorts: [
                    new _sdk.PortDefinition("in", {x: 0, y: 1, direction: _sdk.Direction.UP}),
                ],
                outputPorts: [
                    new _sdk.PortDefinition("out", {x: 1, y: -1, direction: _sdk.Direction.UP}, false),
                ],
                geometry: "2x2",
                renderConnections: true,
                textureName: "tank/0",
                label: "Tank",
                behavior: new TankBehavior({capacity: TANK_CAPACITY}),
            });
        
            var m3 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                PipeDefinition: PipeDefinition,
                TankDefinition: TankDefinition,
                isPipeType: isPipeType,
                isTankType: isTankType
            });
        
            class FluidsDeclaration extends _sdk.AbstractModDeclaration {
        
                /**
                 * @returns {string}
                 */
                get name() {
                    return "Fluids";
                }
        
                get objectTypes() {
                    return [
                        PipeDefinition,
                        TankDefinition,
                    ];
                }
        
                get wireClasses() {
                    return [
                        PipeNetworkRecalculateEvent,
                        PipeNetworkBatchEvent,
                        PipeFluidSetEvent,
                        PipeFluidBatchEvent,
                        TankFluidSetEvent,
                    ];
                }
        
                get fluidTypes() {
                    return [FLUID_TYPE_WATER, FLUID_TYPE_OIL];
                }
            }
        
            var m0 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                FluidsDeclaration: FluidsDeclaration
            });
        
            const coreModules = [m0, m1, m2, m3, m4, m5, m6];
        
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
    const [__c0, __c1, __c2, __c3, __c4, __c5, __c6] = __coreOf(sdk);
    var __part = (function (exports, _sdk, objectTypes_js, constants_js, events_js) {
    
        // The fill rectangle's inset from the tile edge, in pixels.
        const FILL_INSET = 12;
    
        // Fill opacity over the pipe sprite.
        const FILL_ALPHA = 0.9;
    
        /**
         * One pipe tile's fluid-fill state and pooled Graphics.
         */
        class PipeFill {
    
            /**
             * @param {number} tileX
             * @param {number} tileY
             * @param {number} chunk
             */
            constructor(tileX, tileY, chunk) {
                this.tileX = tileX;
                this.tileY = tileY;
                this.chunk = chunk;
                this.fluidType = _sdk.EMPTY;
                this.fraction = 0;
                this.graphics = new _sdk.Graphics();
            }
        }
    
        /**
         * Fluid-fill overlay per pipe tile, off the shared cache; the derived ObjectDrawLayer draws the
         * sprites, this layer only the fill the client mod fans out per network.
         */
        class PipeFluidDrawLayer extends _sdk.AbstractChunkedDrawLayer {
    
            constructor() {
                super();
                /**
                 * Pipe id -> its fill record.
                 * @type {Map<number, PipeFill>}
                 */
                this._fills = new Map();
                // Chunk -> the fill records in it, for map-mode geometry.
                this._fillsByChunk = new Map();
            }
    
            get layerIndex() {
                return constants_js.DRAW_LAYER_PIPE_FLUID;
            }
    
            /**
             * Mirrors a set pipe entry into an empty fill graphic.
             * @param {CacheEntry} entry
             * @returns {void}
             */
            onCacheSet(entry) {
                if (!objectTypes_js.isPipeType(entry.data.type)) {
                    return;
                }
                this.removePipe(entry.id);
                const record = new PipeFill(entry.tileX, entry.tileY, entry.chunk);
                this._fills.set(entry.id, record);
                _sdk.getOrCreate(this._fillsByChunk, record.chunk, () => new Set()).add(record);
                this._node(record.chunk).sprites.addChild(record.graphics);
                this._memberAdded(record.chunk);
            }
    
            /**
             * @param {CacheEntry} entry
             * @returns {void}
             */
            onCacheRemove(entry) {
                if (objectTypes_js.isPipeType(entry.data.type)) {
                    this.removePipe(entry.id);
                }
            }
    
            /**
             * @param {number} id
             * @returns {void}
             */
            removePipe(id) {
                const record = this._fills.get(id);
                if (record === undefined) {
                    return;
                }
                record.graphics.destroy();
                this._fills.delete(id);
                _sdk.removeFromGroup(this._fillsByChunk, record.chunk, record);
                const node = this._chunks.get(record.chunk);
                this._memberRemoved(record.chunk, node === undefined || node.isEmpty);
            }
    
            /**
             * Sets one pipe tile's fill; fraction 0 clears it.
             * @param {number} id
             * @param {number} fluidType
             * @param {number} fraction - fill level in [0, 1]
             * @returns {void}
             */
            setFluid(id, fluidType, fraction) {
                const record = this._fills.get(id);
                if (record === undefined) {
                    return;
                }
                record.fluidType = fluidType;
                record.fraction = fraction;
                this._redraw(record);
                this._dirtyChunks.add(record.chunk);
            }
    
            /**
             * Redraws one record's fill rectangle, bottom-up by fraction.
             * @private
             * @param {PipeFill} record
             * @returns {void}
             */
            _redraw(record) {
                const graphics = record.graphics;
                graphics.clear();
                if (record.fraction <= 0) {
                    return;
                }
                const inner = _sdk.TILE_SIZE - 2 * FILL_INSET;
                const height = Math.max(2, Math.round(inner * Math.min(record.fraction, 1)));
                graphics.rect(
                    record.tileX * _sdk.TILE_SIZE + FILL_INSET,
                    record.tileY * _sdk.TILE_SIZE + FILL_INSET + inner - height,
                    inner,
                    height,
                );
                graphics.fill({color: constants_js.fluidColor(record.fluidType), alpha: FILL_ALPHA});
            }
    
            /**
             * Draws every filled pipe tile in the chunk into its pooled Graphics.
             * @param {number} chunk
             * @param {Graphics} graphics
             * @returns {void}
             */
            _drawChunkGeometry(chunk, graphics) {
                const records = this._fillsByChunk.get(chunk);
                if (records === undefined) {
                    return;
                }
                for (const record of records) {
                    if (record.fraction <= 0) {
                        continue;
                    }
                    graphics.rect(record.tileX * _sdk.TILE_SIZE, record.tileY * _sdk.TILE_SIZE, _sdk.TILE_SIZE, _sdk.TILE_SIZE);
                    graphics.fill(constants_js.fluidColor(record.fluidType));
                }
            }
        }
    
        const MEMBER_FILL_ALPHA = 0.3;
        const LABEL_TEXT_SIZE = 15;
    
        /**
         * Debug overlay tinting each pipe network's member tiles (keyed by network id) with an
         * "id: amount/capacity" label at its first member.
         */
        class NetworkDebugDrawLayer extends _sdk.AbstractDebugDrawLayer {
    
            /**
             * @param {Map<number, number[]>} networkParts - shared network id -> member pipe ids, owned by FluidsClientMod
             * @param {Map<number, {fluidType: number, amount: number}>} fluidByNetwork - shared fluid state, same owner
             * @param {number} segmentCapacity - units one pipe segment buffers
             */
            constructor(networkParts, fluidByNetwork, segmentCapacity) {
                super();
                this._networkParts = networkParts;
                this._fluidByNetwork = fluidByNetwork;
                this._segmentCapacity = segmentCapacity;
                this._graphics = new _sdk.Graphics();
                this._labels = new _sdk.Container();
                this.addChild(this._graphics);
                this.addChild(this._labels);
            }
    
            get layerIndex() {
                return 101;
            }
    
            /**
             * @param {CacheEntry} entry
             * @returns {void}
             */
            onCacheChange(entry) {
                if (objectTypes_js.isPipeType(entry.data.type)) {
                    this.markStale();
                }
            }
    
            /**
             * Repaints every tracked network.
             * @private
             * @returns {void}
             */
            _repaint() {
                this._graphics.clear();
                for (const label of this._labels.removeChildren()) {
                    label.destroy();
                }
                for (const [networkId, parts] of this._networkParts) {
                    this._drawNetwork(networkId, parts);
                }
            }
    
            /**
             * @private
             * @param {number} networkId
             * @param {number[]} parts - member pipe ids
             * @returns {void}
             */
            _drawNetwork(networkId, parts) {
                const records = parts.map(id => this.cache.get(id));
                // A pipe left the viewport (or was just deleted): wait for the next recalc.
                if (records.length === 0 || records.some(record => record === null)) {
                    return;
                }
                const color = _sdk.DEBUG_COLOR(networkId);
                for (const record of records) {
                    this._graphics.rect(record.tileX * _sdk.TILE_SIZE, record.tileY * _sdk.TILE_SIZE, _sdk.TILE_SIZE, _sdk.TILE_SIZE);
                }
                this._graphics.fill({color, alpha: MEMBER_FILL_ALPHA});
                for (const record of records) {
                    _sdk.drawRect(this._graphics, record.tileX * _sdk.TILE_SIZE, record.tileY * _sdk.TILE_SIZE, _sdk.TILE_SIZE, _sdk.TILE_SIZE, color);
                }
    
                const fluid = this._fluidByNetwork.get(networkId);
                let amount = 0;
                if (fluid !== undefined) {
                    amount = fluid.amount;
                }
                const label = new _sdk.Text({
                    text: `${networkId}: ${amount}/${parts.length * this._segmentCapacity}`,
                    style: {
                        fontFamily: _sdk.GAME_FONT,
                        fontSize: LABEL_TEXT_SIZE,
                        fill: color,
                        fontWeight: "bold",
                        stroke: {color: 0x000000, width: 2},
                    },
                });
                label.x = records[0].tileX * _sdk.TILE_SIZE + 2;
                label.y = records[0].tileY * _sdk.TILE_SIZE + 2;
                this._labels.addChild(label);
            }
        }
    
        class FluidsClientMod extends _sdk.AbstractClientMod {
    
            constructor() {
                super();
                // Driven imperatively by onEvent.
                this._fluidLayer = new PipeFluidDrawLayer();
                // Network id -> member pipe ids.
                this._networkParts = new Map();
                // Inverse map, so a removed pipe cleans its network's tracking.
                this._pipeToNetwork = new Map();
                // Network id -> {fluidType, amount}.
                this._fluidByNetwork = new Map();
                // Tank object id -> held fluid type, from the tank fluid deltas.
                this._fluidByTank = new Map();
                // Debug overlay of network membership and fill.
                this._debugLayer = new NetworkDebugDrawLayer(this._networkParts, this._fluidByNetwork, constants_js.PIPE_SEGMENT_CAPACITY);
            }
    
            drawLayers(client) {
                return [this._fluidLayer, this._debugLayer];
            }
    
            setup(client) {
                client.objects.onRemove(entry => {
                    if (objectTypes_js.isPipeType(entry.data.type)) {
                        this._onPipeRemoved(entry.id);
                    }
                    if (objectTypes_js.isTankType(entry.data.type)) {
                        this._fluidByTank.delete(entry.id);
                    }
                });
            }
    
            /**
             * Single client-side hub for the pipe network/fluid events.
             * @param {AbstractEvent} event
             * @param {Client} client
             */
            onEvent(event, client) {
                if (event instanceof events_js.PipeNetworkRecalculateEvent) {
                    this._updateNetwork(event.networkId, event.parts);
                    this._debugLayer.markStale();
                    return;
                }
                if (event instanceof events_js.PipeFluidSetEvent) {
                    this._fluidByNetwork.set(event.networkId, {fluidType: event.fluidType, amount: event.amount});
                    this._repaintNetwork(event.networkId);
                    this._debugLayer.markStale();
                    return;
                }
                if (event instanceof events_js.TankFluidSetEvent) {
                    this._fluidByTank.set(event.objectId, event.fluidType);
                }
            }
    
            /**
             * Mirrors Pipes.canJoin: a pipe may not bridge different fluid types.
             * @param {ObjectType} type
             * @param {number} tileX
             * @param {number} tileY
             * @param {Direction} direction
             * @param {Client} client
             * @returns {boolean}
             */
            canPlace(type, tileX, tileY, direction, client) {
                if (!objectTypes_js.isPipeType(type)) {
                    return true;
                }
                const chunk = _sdk.chunkId(tileX, tileY);
                return constants_js.joinedFluidType(neighborDirection => {
                    const nx = tileX + _sdk.Direction.dx(neighborDirection);
                    const ny = tileY + _sdk.Direction.dy(neighborDirection);
                    const candidates = [];
                    if (_sdk.chunkId(nx, ny) === chunk) {
                        const pipe = client.objects.objectAt(nx, ny, objectTypes_js.PipeDefinition);
                        if (pipe !== null) {
                            candidates.push(this._networkFluidType(pipe.id));
                        }
                    }
                    const feeder = client.objects.outPortAt(tileX, tileY, _sdk.Direction.invert(neighborDirection));
                    if (feeder !== null) {
                        candidates.push(this._producedFluidType(client, feeder.entry.id));
                    }
                    return candidates;
                }) !== null;
            }
    
            /**
             * The fluid type bound to a cached pipe's network, or EMPTY.
             * @private
             * @param {number} pipeId
             * @returns {number}
             */
            _networkFluidType(pipeId) {
                const networkId = this._pipeToNetwork.get(pipeId);
                if (networkId === undefined) {
                    return _sdk.EMPTY;
                }
                const fluid = this._fluidByNetwork.get(networkId);
                if (fluid === undefined) {
                    return _sdk.EMPTY;
                }
                return fluid.fluidType;
            }
    
            /**
             * The fluid an object's out-port produces, or EMPTY: tank live content, else last output.
             * @private
             * @param {Client} client
             * @param {number} objectId
             * @returns {number}
             */
            _producedFluidType(client, objectId) {
                const tankFluid = this._fluidByTank.get(objectId);
                if (tankFluid !== undefined) {
                    return tankFluid;
                }
                const product = client.objects.lastProducedOf(objectId);
                if (product === undefined || !client.modRegistry.fluidTypes.has(product)) {
                    return _sdk.EMPTY;
                }
                return product;
            }
    
            /**
             * Records a recalculated network, dropping any network id a merge absorbed.
             * @private
             * @param {number} networkId
             * @param {number[]} parts - member pipe ids
             * @returns {void}
             */
            _updateNetwork(networkId, parts) {
                for (const id of parts) {
                    const previous = this._pipeToNetwork.get(id);
                    if (previous !== undefined && previous !== networkId) {
                        this._networkParts.delete(previous);
                        this._fluidByNetwork.delete(previous);
                    }
                    this._pipeToNetwork.set(id, networkId);
                }
                this._networkParts.set(networkId, parts);
                this._repaintNetwork(networkId);
            }
    
            /**
             * Fans a network's fluid state out to every member tile's fill.
             * @private
             * @param {number} networkId
             * @returns {void}
             */
            _repaintNetwork(networkId) {
                const parts = this._networkParts.get(networkId);
                if (parts === undefined) {
                    return;
                }
                const fluid = this._fluidByNetwork.get(networkId);
                let fluidType = _sdk.EMPTY;
                let fraction = 0;
                if (fluid !== undefined && fluid.amount > 0) {
                    fluidType = fluid.fluidType;
                    fraction = fluid.amount / (parts.length * constants_js.PIPE_SEGMENT_CAPACITY);
                }
                for (const id of parts) {
                    this._fluidLayer.setFluid(id, fluidType, fraction);
                }
            }
    
            /**
             * Drops a removed pipe's tracking; survivors re-register through their recalc events, which
             * precede the removal and already exclude the pipe.
             * @private
             * @param {number} id
             * @returns {void}
             */
            _onPipeRemoved(id) {
                const networkId = this._pipeToNetwork.get(id);
                this._pipeToNetwork.delete(id);
                // Only a fully dissolved network (the removed pipe held its id, no survivors recalced)
                // leaves stale tracking behind.
                if (networkId === id) {
                    this._networkParts.delete(id);
                    this._fluidByNetwork.delete(id);
                }
            }
        }
    
        exports.FluidsClientMod = FluidsClientMod;
    
        return exports;
    
    })({}, sdk, __c3, __c1, __c2);
    
    return new (__only(__part, "client"))();
}
