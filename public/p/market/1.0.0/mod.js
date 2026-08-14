// Built by tools/build-mod.js — do not edit.

let __coreModules = null;

function __coreOf(sdk) {
    if (__coreModules === null) {
        var __part = (function (exports, _sdk) {
        
            // No terminal configured yet.
            const MARKET_MODE_NONE = 0;
            // Sell to market: consumes configured item from input port.
            const MARKET_MODE_SELL = 1;
            // Buy from market: produces configured item onto output port.
            const MARKET_MODE_BUY = 2;
        
            // Per-player currency balance (server-authoritative).
            const MARKET_SETTING_BALANCE = 10;
        
            // This mod's metrics fact type: one fact per trade side (shared flat keyspace, see MetricsFact.js).
            const METRICS_FACT_TYPE_TRADE_EXECUTED = 3;
        
            // TRADE_EXECUTED's `tag`: trade side `playerId` was on; a global price series reads SELL rows only.
            const METRICS_TRADE_SIDE_SELL = 0;
            const METRICS_TRADE_SIDE_BUY = 1;
        
            // Ticks between guide-price recomputes; stands in for "24 in-game hours".
            const GUIDE_PRICE_INTERVAL_TICKS = 86400;
        
            // Per-interval cap on guide-price movement, as fraction of current value.
            const GUIDE_PRICE_MAX_STEP_FRACTION = 0.05;
        
            var m1 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                GUIDE_PRICE_INTERVAL_TICKS: GUIDE_PRICE_INTERVAL_TICKS,
                GUIDE_PRICE_MAX_STEP_FRACTION: GUIDE_PRICE_MAX_STEP_FRACTION,
                MARKET_MODE_BUY: MARKET_MODE_BUY,
                MARKET_MODE_NONE: MARKET_MODE_NONE,
                MARKET_MODE_SELL: MARKET_MODE_SELL,
                MARKET_SETTING_BALANCE: MARKET_SETTING_BALANCE,
                METRICS_FACT_TYPE_TRADE_EXECUTED: METRICS_FACT_TYPE_TRADE_EXECUTED,
                METRICS_TRADE_SIDE_BUY: METRICS_TRADE_SIDE_BUY,
                METRICS_TRADE_SIDE_SELL: METRICS_TRADE_SIDE_SELL
            });
        
            /**
             * One terminal's standing bid, indexed by item type.
             */
            class MarketQuote {
        
                /**
                 * @param {number} eid
                 * @param {number} itemType
                 * @param {number} price
                 * @param {number} outPort
                 * @param {number} sequence
                 */
                constructor(eid, itemType, price, outPort, sequence) {
                    this.eid = eid;
                    this.itemType = itemType;
                    this.price = price;
                    this.outPort = outPort;
                    this.sequence = sequence;
                }
            }
        
            /**
             * One item's guide price and the trade activity accumulated toward its next recompute.
             */
            class GuidePrice {
        
                /**
                 * @param {number} price
                 */
                constructor(price) {
                    this.price = price;
                    this.tradeCount = 0;
                    this.priceSum = 0;
                    this.lastUpdateTick = 0;
                }
            }
        
            /**
             * The best current counterparty for a seller, or null when none qualify.
             */
            class MarketMatch {
        
                /**
                 * @param {boolean} npc
                 * @param {number} price
                 * @param {number} eid - NO_EID for an NPC match
                 * @param {number} outPort - EMPTY for an NPC match
                 */
                constructor(npc, price, eid, outPort) {
                    this.npc = npc;
                    this.price = price;
                    this.eid = eid;
                    this.outPort = outPort;
                }
            }
        
            /**
             * One confirmed trade, handed off from {@link TradingTerminalBehavior}'s POST_RESOLVE to
             * {@link MarketSimMod}'s onTick for currency settlement.
             */
            class MarketSettlement {
        
                /**
                 * @param {number} sellerEid
                 * @param {number} buyerEid - NO_EID for an NPC counterparty
                 * @param {number} itemType
                 * @param {number} price
                 */
                constructor(sellerEid, buyerEid, itemType, price) {
                    this.sellerEid = sellerEid;
                    this.buyerEid = buyerEid;
                    this.itemType = itemType;
                    this.price = price;
                }
            }
        
            /**
             * One confirmed NPC-sourced purchase, handed off from {@link TradingTerminalBehavior}'s
             * POST_RESOLVE to {@link MarketSimMod}'s onTick for currency settlement.
             */
            class MarketPurchase {
        
                /**
                 * @param {number} buyerEid
                 * @param {number} itemType
                 * @param {number} price
                 */
                constructor(buyerEid, itemType, price) {
                    this.buyerEid = buyerEid;
                    this.itemType = itemType;
                    this.price = price;
                }
            }
        
            /**
             * One side (buy or sell) of the book's standing-quote index: itemType -> quote[] for lookup,
             * eid -> quote for O(1) removal.
             */
            class QuoteIndex {
        
                constructor() {
                    this._byItem = new Map();
                    this._byEid = new Map();
                }
        
                /**
                 * @param {MarketQuote} quote
                 * @returns {void}
                 */
                post(quote) {
                    this.remove(quote.eid);
                    this._byEid.set(quote.eid, quote);
                    let quotes = this._byItem.get(quote.itemType);
                    if (quotes === undefined) {
                        quotes = [];
                        this._byItem.set(quote.itemType, quotes);
                    }
                    quotes.push(quote);
                }
        
                /**
                 * @param {number} eid
                 * @returns {void}
                 */
                remove(eid) {
                    const quote = this._byEid.get(eid);
                    if (quote === undefined) {
                        return;
                    }
                    this._byEid.delete(eid);
                    const quotes = this._byItem.get(quote.itemType);
                    quotes.splice(quotes.indexOf(quote), 1);
                    if (quotes.length === 0) {
                        this._byItem.delete(quote.itemType);
                    }
                }
        
                /**
                 * @param {number} itemType
                 * @returns {MarketQuote[]|undefined}
                 */
                list(itemType) {
                    return this._byItem.get(itemType);
                }
        
                /**
                 * @param {number} itemType
                 * @returns {number}
                 */
                count(itemType) {
                    const quotes = this._byItem.get(itemType);
                    if (quotes === undefined) {
                        return 0;
                    }
                    return quotes.length;
                }
            }
        
            /**
             * Player market: standing-quote index per item, seller-initiated matching, guide-price tracking,
             * per-tick settlement handoff. Engine-scoped via {@link GameEngine#provide}/{@link GameEngine#resolve}.
             */
            class MarketBook {
        
                /**
                 * @param {Map<number, number>} [fixedPrices] itemType -> NPC price
                 * @param {number} [guidePriceIntervalTicks] overridable so tests don't need real-length intervals
                 */
                constructor(fixedPrices = new Map(), guidePriceIntervalTicks = GUIDE_PRICE_INTERVAL_TICKS) {
                    this._fixedPrices = fixedPrices;
                    this._guidePriceIntervalTicks = guidePriceIntervalTicks;
                    this._nextSequence = 0;
        
                    // Posted buy quotes.
                    this._buys = new QuoteIndex();
                    // Posted sell quotes; matching never reads this, only guide-price/best-ask.
                    this._sells = new QuoteIndex();
        
                    // This tick's confirmed trades, drained by MarketSimMod.onTick.
                    this._settlements = [];
                    // This tick's confirmed NPC purchases, drained by MarketSimMod.onTick.
                    this._purchases = [];
        
                    // itemType -> GuidePrice.
                    this._guidePrices = new Map();
                    // Own tick clock; advanced once per onTick call.
                    this._tick = 0;
                }
        
                /**
                 * @param {number} itemType
                 * @returns {boolean}
                 */
                isFixedPrice(itemType) {
                    return this._fixedPrices.has(itemType);
                }
        
                /**
                 * @param {number} itemType
                 * @returns {number|undefined}
                 */
                fixedPriceOf(itemType) {
                    return this._fixedPrices.get(itemType);
                }
        
                /**
                 * Posts or replaces a buy terminal's standing bid.
                 * @param {number} eid
                 * @param {number} itemType
                 * @param {number} price
                 * @param {number} outPort
                 * @returns {void}
                 */
                postBuy(eid, itemType, price, outPort) {
                    const quote = new MarketQuote(eid, itemType, price, outPort, this._nextSequence);
                    this._nextSequence += 1;
                    this._buys.post(quote);
                }
        
                /**
                 * Removes a buy terminal's standing bid, if any.
                 * @param {number} eid
                 * @returns {void}
                 */
                removeBuy(eid) {
                    this._buys.remove(eid);
                }
        
                /**
                 * Posts or replaces a sell terminal's standing floor. Matching never looks this index up by
                 * item — each seller carries its own floor and initiates its own match — this only feeds the
                 * guide-price supply signal and the reported best ask.
                 * @param {number} eid
                 * @param {number} itemType
                 * @param {number} price
                 * @returns {void}
                 */
                postSell(eid, itemType, price) {
                    const quote = new MarketQuote(eid, itemType, price, _sdk.EMPTY, this._nextSequence);
                    this._nextSequence += 1;
                    this._sells.post(quote);
                }
        
                /**
                 * Removes a sell terminal's standing floor, if any.
                 * @param {number} eid
                 * @returns {void}
                 */
                removeSell(eid) {
                    this._sells.remove(eid);
                }
        
                /**
                 * @param {number} itemType
                 * @returns {number}
                 */
                buyCount(itemType) {
                    return this._buys.count(itemType);
                }
        
                /**
                 * @param {number} itemType
                 * @returns {number}
                 */
                sellCount(itemType) {
                    return this._sells.count(itemType);
                }
        
                /**
                 * @param {number} itemType
                 * @returns {number|undefined} the highest currently-posted bid, or undefined if none
                 */
                bestBid(itemType) {
                    const quotes = this._buys.list(itemType);
                    if (quotes === undefined || quotes.length === 0) {
                        return undefined;
                    }
                    let best = quotes[0].price;
                    for (let i = 1; i < quotes.length; i += 1) {
                        best = Math.max(best, quotes[i].price);
                    }
                    return best;
                }
        
                /**
                 * @param {number} itemType
                 * @returns {number|undefined} the lowest currently-posted ask, or undefined if none
                 */
                bestAsk(itemType) {
                    const quotes = this._sells.list(itemType);
                    if (quotes === undefined || quotes.length === 0) {
                        return undefined;
                    }
                    let best = quotes[0].price;
                    for (let i = 1; i < quotes.length; i += 1) {
                        best = Math.min(best, quotes[i].price);
                    }
                    return best;
                }
        
                /**
                 * The best current counterparty for a seller asking `floorPrice` for `itemType`: the
                 * highest-paying eligible buyer (clears the floor, its output port is currently free, its cached
                 * balance covers its own price), preferring a player buyer over the NPC on a tie. Null when
                 * nothing qualifies.
                 * @param {number} itemType
                 * @param {number} floorPrice
                 * @param {function(number): boolean} portIsEmpty
                 * @param {function(number): number} balanceOf
                 * @returns {MarketMatch|null}
                 */
                bestEligibleBuyer(itemType, floorPrice, portIsEmpty, balanceOf) {
                    let best = null;
                    const quotes = this._buys.list(itemType);
                    if (quotes !== undefined) {
                        for (const quote of quotes) {
                            if (quote.price < floorPrice) {
                                continue;
                            }
                            if (!portIsEmpty(quote.outPort)) {
                                continue;
                            }
                            if (balanceOf(quote.eid) < quote.price) {
                                continue;
                            }
                            if (best === null
                                || quote.price > best.price
                                || (quote.price === best.price && quote.sequence < best.sequence)) {
                                best = quote;
                            }
                        }
                    }
                    const fixedPrice = this._fixedPrices.get(itemType);
                    if (fixedPrice !== undefined && fixedPrice >= floorPrice && (best === null || fixedPrice > best.price)) {
                        return new MarketMatch(true, fixedPrice, null, null);
                    }
                    if (best === null) {
                        return null;
                    }
                    return new MarketMatch(false, best.price, best.eid, best.outPort);
                }
        
                /**
                 * Records a confirmed trade for MarketSimMod.onTick to settle; also feeds the guide-price
                 * trade-history signal.
                 * @param {number} sellerEid
                 * @param {number} buyerEid - NO_EID for an NPC counterparty
                 * @param {number} itemType
                 * @param {number} price
                 * @returns {void}
                 */
                recordSettlement(sellerEid, buyerEid, itemType, price) {
                    this._settlements.push(new MarketSettlement(sellerEid, buyerEid, itemType, price));
                    let guide = this._guidePrices.get(itemType);
                    if (guide === undefined) {
                        guide = new GuidePrice(price);
                        this._guidePrices.set(itemType, guide);
                    }
                    guide.tradeCount += 1;
                    guide.priceSum += price;
                }
        
                /**
                 * Returns and clears this tick's confirmed trades.
                 * @returns {MarketSettlement[]}
                 */
                drainSettlements() {
                    const settlements = this._settlements;
                    this._settlements = [];
                    return settlements;
                }
        
                /**
                 * Records a confirmed NPC-sourced purchase (a buy terminal creating a fixed-price item straight
                 * from the NPC's infinite supply) for MarketSimMod.onTick to settle.
                 * @param {number} buyerEid
                 * @param {number} itemType
                 * @param {number} price
                 * @returns {void}
                 */
                recordPurchase(buyerEid, itemType, price) {
                    this._purchases.push(new MarketPurchase(buyerEid, itemType, price));
                }
        
                /**
                 * Returns and clears this tick's confirmed NPC purchases.
                 * @returns {MarketPurchase[]}
                 */
                drainPurchases() {
                    const purchases = this._purchases;
                    this._purchases = [];
                    return purchases;
                }
        
                /**
                 * @param {number} itemType
                 * @returns {number|undefined} the item's guide price, or undefined if never traded/imbalanced
                 */
                guidePriceOf(itemType) {
                    const guide = this._guidePrices.get(itemType);
                    if (guide === undefined) {
                        return undefined;
                    }
                    return guide.price;
                }
        
                /**
                 * Advances this engine instance's tick clock, recomputing every tracked item's guide price whose
                 * interval has elapsed: a bounded nudge toward this interval's average trade price (volume-
                 * weighted), plus a bounded nudge for any standing buy/sell count imbalance. Never enforced on
                 * trades — a UI default only. Call once per onTick.
                 * @returns {void}
                 */
                advanceTick() {
                    this._tick += 1;
                    const tick = this._tick;
                    for (const [itemType, guide] of this._guidePrices) {
                        if (tick - guide.lastUpdateTick < this._guidePriceIntervalTicks) {
                            continue;
                        }
                        const maxStep = Math.max(1, Math.round(guide.price * GUIDE_PRICE_MAX_STEP_FRACTION));
                        let price = guide.price;
                        if (guide.tradeCount > 0) {
                            const average = guide.priceSum / guide.tradeCount;
                            const volumeWeight = Math.min(1, guide.tradeCount / 50);
                            const step = Math.round((average - price) * volumeWeight);
                            price += Math.max(-maxStep, Math.min(maxStep, step));
                        }
                        const imbalance = this.buyCount(itemType) - this.sellCount(itemType);
                        if (imbalance !== 0) {
                            const step = Math.sign(imbalance) * Math.min(maxStep, Math.abs(imbalance));
                            price += step;
                        }
                        guide.price = Math.max(1, price);
                        guide.tradeCount = 0;
                        guide.priceSum = 0;
                        guide.lastUpdateTick = tick;
                    }
                }
            }
        
            var m5 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                MarketBook: MarketBook
            });
        
            /**
             * Trading Terminal: input port (sell mode) and output port (buy mode), both always present; live
             * one is runtime `mode`, set by MarketSimMod via ConfigureTradingTerminalMessage.
             *
             * Pure ECS port I/O, never touches Game directly (currency/ownership live in MarketSimMod.onTick).
             * Each tick, an enabled seller finds the best eligible buyer (MarketBook.bestEligibleBuyer) and
             * submits a transfer via engine.submitTransfer, letting the engine's fan-in arbitration resolve
             * contention like belts/splitters do.
             */
            class TradingTerminalBehavior extends _sdk.AbstractBehavior {
        
                install(engine, placed) {
                    const fixedPrices = new Map();
                    for (const listing of engine.modRegistry.marketListings) {
                        if (listing.npcPrice !== null) {
                            fixedPrices.set(listing.itemType, listing.npcPrice);
                        }
                    }
                    engine.provide(MarketBook, new MarketBook(fixedPrices));
                    engine.defineComponent("MarketTerminal", [
                        {name: "mode"},
                        {name: "itemType", fill: _sdk.EMPTY},
                        {name: "price"},
                        // Buy only: cached owner balance, refreshed per tick by MarketSimMod.onTick. Not authoritative.
                        {name: "balance"},
                        // Buy only: cached chunk owner, lets _submitIntents pool balance across a player's buy terminals.
                        {name: "owner", fill: _sdk.PLAYER_ID_NONE},
                        // Sell only: whether this terminal's chunk is owned, refreshed per tick by MarketSimMod.onTick.
                        {name: "sellEnabled"},
                        // Sell-only scratch: price/counterparty this row is selling to this tick.
                        {name: "pendingPrice", fill: _sdk.EMPTY},
                        {name: "pendingBuyer", kind: "eid", fill: _sdk.NO_EID},
                        {name: "pendingIsNpc", fill: 0},
                        {name: "in", kind: "eid", fill: _sdk.NO_EID},
                        {name: "out", kind: "eid", fill: _sdk.NO_EID},
                        {name: "lastOutput", fill: _sdk.EMPTY},
                    ], {sparse: true});
                    engine.registerSystem(_sdk.TickPhase.SUBMIT_INTENTS, () => TradingTerminalBehavior._submitIntents(engine));
                    engine.registerSystem(_sdk.TickPhase.POST_RESOLVE, () => TradingTerminalBehavior._finish(engine));
                }
        
                onSpawn(engine, placed, eid, type, message) {
                    const def = engine.component("MarketTerminal");
                    engine.attachComponent(def, eid);
                    const terminal = def.store;
                    const row = def.row(eid);
                    terminal.in[row] = engine.portFor(type.inputPorts[0], message.x, message.y, message.direction).port;
                    const output = engine.portFor(type.outputPorts[0], message.x, message.y, message.direction);
                    terminal.out[row] = output.port;
                    engine.registerRenderedPort(output.port, output.tile.x, output.tile.y);
                }
        
                onDespawn(engine, placed, eid) {
                    const def = engine.component("MarketTerminal");
                    const row = def.row(eid);
                    engine.unregisterRenderedPort(def.store.out[row]);
                    const book = engine.resolve(MarketBook);
                    book.removeBuy(eid);
                    book.removeSell(eid);
                }
        
                syncData(engine, placed, eid) {
                    const def = engine.component("MarketTerminal");
                    const row = def.row(eid);
                    const last = def.store.lastOutput[row];
                    let lastOutput = last;
                    if (last === _sdk.EMPTY) {
                        lastOutput = null;
                    }
                    return {portIds: [def.store.out[row]], lastOutput};
                }
        
                resyncRenderedPorts(engine, placed, eid) {
                    const def = engine.component("MarketTerminal");
                    const out = def.store.out[def.row(eid)];
                    engine.registerRenderedPort(out, engine.Position.x[out], engine.Position.y[out]);
                }
        
                /**
                 * SUBMIT_INTENTS: a sell terminal armed with a live match submits exactly one transfer straight
                 * into its chosen buyer's output port (or a plain drain for an NPC counterparty); a buy terminal
                 * configured for an NPC-fixed-price item likewise submits a source-less create straight from the
                 * NPC's infinite supply — there's no real seller to match against, so it needs only its own
                 * output port free and its own cached balance to cover the price. A buy terminal on a
                 * player-market item still submits nothing itself; it only ever receives via a seller's transfer.
                 *
                 * `reservedBalance` tracks each buyer's remaining cached balance across this single pass, keyed
                 * by owning player rather than by terminal eid: a player with several buy terminals shares one
                 * balance, and committing a spend against one of their terminals (a sell-side match paying them,
                 * or an NPC purchase of their own) must reduce what any of their other terminals appear to have
                 * left, or the same tick-stale balance would clear every one of them independently and let a
                 * multi-terminal player spend past their real balance.
                 * @private
                 * @param {GameEngine} engine
                 * @returns {void}
                 */
                static _submitIntents(engine) {
                    const item = engine.Port.item;
                    const def = engine.component("MarketTerminal");
                    const terminal = def.store;
                    const book = engine.resolve(MarketBook);
                    const count = def.count;
                    const reservedBalance = new Map();
                    for (let row = 0; row < count; row += 1) {
                        terminal.pendingPrice[row] = _sdk.EMPTY;
                        terminal.pendingBuyer[row] = _sdk.NO_EID;
                        terminal.pendingIsNpc[row] = 0;
                        if (terminal.mode[row] === MARKET_MODE_BUY) {
                            TradingTerminalBehavior._submitNpcPurchase(engine, item, book, terminal, row, reservedBalance);
                            continue;
                        }
                        if (terminal.mode[row] !== MARKET_MODE_SELL || terminal.sellEnabled[row] === 0) {
                            continue;
                        }
                        const inPort = terminal.in[row];
                        if (item[inPort] !== terminal.itemType[row]) {
                            continue;
                        }
                        const match = book.bestEligibleBuyer(
                            terminal.itemType[row],
                            terminal.price[row],
                            port => item[port] === _sdk.EMPTY,
                            buyerEid => TradingTerminalBehavior._remainingBalance(def, terminal, buyerEid, reservedBalance),
                        );
                        if (match === null) {
                            continue;
                        }
                        terminal.pendingPrice[row] = match.price;
                        if (match.npc) {
                            engine.submitDrain(inPort, true);
                            terminal.pendingIsNpc[row] = 1;
                        } else {
                            engine.submitTransfer(inPort, match.outPort, true, true, _sdk.EMPTY, terminal.itemType[row]);
                            terminal.pendingBuyer[row] = match.eid;
                            const owner = terminal.owner[def.row(match.eid)];
                            const remaining = TradingTerminalBehavior._remainingBalance(def, terminal, match.eid, reservedBalance);
                            reservedBalance.set(owner, remaining - match.price);
                        }
                    }
                }
        
                /**
                 * A buy terminal configured for an NPC-fixed-price item purchases straight from the NPC's
                 * infinite supply whenever its output port is free and its owner's remaining balance covers the
                 * price — no matching needed, since there's no real seller on the other side. Player-market items
                 * have no fixed price and take no action here; they stay purely passive, waiting on a seller's
                 * transfer.
                 * @private
                 * @param {GameEngine} engine
                 * @param {Int32Array} item
                 * @param {MarketBook} book
                 * @param {object} terminal
                 * @param {number} row
                 * @param {Map<number, number>} reservedBalance owning player -> balance remaining this pass
                 * @returns {void}
                 */
                static _submitNpcPurchase(engine, item, book, terminal, row, reservedBalance) {
                    const itemType = terminal.itemType[row];
                    const fixedPrice = book.fixedPriceOf(itemType);
                    if (fixedPrice === undefined) {
                        return;
                    }
                    const outPort = terminal.out[row];
                    const owner = terminal.owner[row];
                    let remaining = terminal.balance[row];
                    if (reservedBalance.has(owner)) {
                        remaining = reservedBalance.get(owner);
                    }
                    if (remaining < fixedPrice) {
                        return;
                    }
                    if (item[outPort] !== _sdk.EMPTY) {
                        return;
                    }
                    engine.submitCreate(outPort, itemType, true);
                    terminal.pendingPrice[row] = fixedPrice;
                    terminal.pendingIsNpc[row] = 1;
                    reservedBalance.set(owner, remaining - fixedPrice);
                }
        
                /**
                 * A buyer's cached balance, minus whatever this pass has already committed to spend on behalf of
                 * its owning player (see `_submitIntents`).
                 * @private
                 * @param {ComponentDefinition} def
                 * @param {object} terminal
                 * @param {number} buyerEid
                 * @param {Map<number, number>} reservedBalance owning player -> balance remaining this pass
                 * @returns {number}
                 */
                static _remainingBalance(def, terminal, buyerEid, reservedBalance) {
                    const row = def.row(buyerEid);
                    const owner = terminal.owner[row];
                    if (reservedBalance.has(owner)) {
                        return reservedBalance.get(owner);
                    }
                    return terminal.balance[row];
                }
        
                /**
                 * POST_RESOLVE: a buy terminal whose output resolved records last_output (cosmetic) and, if it
                 * had an NPC purchase pending (from _submitNpcPurchase), hands the confirmed purchase off to
                 * MarketSimMod.onTick for currency settlement — a source-less create always lands once submitted
                 * (no counterpart contention), so no separate resolution check is needed beyond wasResolvedDest.
                 * A sell terminal whose attempted transfer actually landed this tick hands the confirmed trade off
                 * to MarketSimMod.onTick the same way (an NPC drain always lands once submitted — no counterpart
                 * contention — a real transfer may lose the engine's fan-in arbitration to a different seller
                 * targeting the same buyer, so it alone needs the resolution check).
                 * @private
                 * @param {GameEngine} engine
                 * @returns {void}
                 */
                static _finish(engine) {
                    const def = engine.component("MarketTerminal");
                    const terminal = def.store;
                    const eids = def.eids;
                    const book = engine.resolve(MarketBook);
                    const count = def.count;
                    for (let row = 0; row < count; row += 1) {
                        if (terminal.mode[row] === MARKET_MODE_BUY) {
                            if (engine.wasResolvedDest(terminal.out[row])) {
                                terminal.lastOutput[row] = terminal.itemType[row];
                                if (terminal.pendingPrice[row] !== _sdk.EMPTY) {
                                    book.recordPurchase(eids[row], terminal.itemType[row], terminal.pendingPrice[row]);
                                }
                            }
                            continue;
                        }
                        if (terminal.pendingPrice[row] === _sdk.EMPTY) {
                            continue;
                        }
                        const npc = terminal.pendingIsNpc[row] === 1;
                        const confirmed = npc || engine.resolvedDestFor(terminal.in[row]) !== _sdk.EMPTY;
                        if (!confirmed) {
                            continue;
                        }
                        const sellerEid = eids[row];
                        terminal.lastOutput[row] = terminal.itemType[row];
                        let buyerEid = _sdk.NO_EID;
                        if (!npc) {
                            buyerEid = terminal.pendingBuyer[row];
                        }
                        book.recordSettlement(sellerEid, buyerEid, terminal.itemType[row], terminal.pendingPrice[row]);
                    }
                }
            }
        
            var m6 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                TradingTerminalBehavior: TradingTerminalBehavior
            });
        
            const TradingTerminalType = new _sdk.ObjectType({
                name: "TradingTerminal",
                toolId: 9,
                inputPorts: [new _sdk.PortDefinition("in", {x: 0, y: 0, direction: _sdk.Direction.UP})],
                outputPorts: [new _sdk.PortDefinition("out", {x: 0, y: -1, direction: _sdk.Direction.UP})],
                geometry: "1x1",
                renderConnections: true,
                // Placeholder sprite; mod adds no new art.
                textureName: "demo-machine/0",
                label: "Trading Terminal",
                placement: new _sdk.PlacementRule({replaceSameKind: true}),
                // Never sends a message itself; submitting the panel is what sends ConfigureTradingTerminalMessage.
                tapAction: (record, session, client) => client.cache.writer("market").openConfig(record.id),
                behavior: new TradingTerminalBehavior(),
            });
        
            var m4 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                TradingTerminalType: TradingTerminalType
            });
        
            /**
             * Configures a placed terminal's standing quote. `price` is a floor in sell mode, a ceiling in buy
             * mode. Posting/updating a bid never costs anything up front — currency only moves per unit, when a
             * trade actually executes (see TradingTerminalBehavior).
             */
            class ConfigureTradingTerminalMessage extends _sdk.AbstractMessage {
        
                static wireFields = {
                    objectId: "int32",
                    mode: "int32",
                    itemType: "int32",
                    price: "int32",
                };
        
                /**
                 * @param {number} objectId
                 * @param {number} mode MARKET_MODE_SELL or MARKET_MODE_BUY
                 * @param {number} itemType
                 * @param {number} price
                 */
                constructor(objectId, mode, itemType, price) {
                    super();
                    this.objectId = objectId;
                    this.mode = mode;
                    this.itemType = itemType;
                    this.price = price;
                }
        
                /**
                 * Shape only; unknown item ids and non-positive prices are rejected server-side where the
                 * tradable catalog and the terminal actually live.
                 * @param {GameAPI} api
                 * @param {AbstractSession} session
                 * @returns {boolean}
                 */
                validate(api, session) {
                    return Number.isInteger(this.objectId) && Number.isInteger(this.mode)
                        && Number.isInteger(this.itemType) && Number.isInteger(this.price);
                }
            }
        
            /**
             * Requests the current market snapshot (fixed/live prices for every tradable item) plus `objectId`'s
             * own current configuration, sent when the config panel opens.
             */
            class MarketSnapshotRequestMessage extends _sdk.AbstractMessage {
        
                static wireFields = {
                    objectId: "int32",
                };
        
                /**
                 * @param {number} objectId
                 */
                constructor(objectId) {
                    super();
                    this.objectId = objectId;
                }
            }
        
            var m3 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                ConfigureTradingTerminalMessage: ConfigureTradingTerminalMessage,
                MarketSnapshotRequestMessage: MarketSnapshotRequestMessage
            });
        
            // Sentinel for "not applicable" in the snapshot's parallel arrays.
            const MARKET_SNAPSHOT_NONE = -1;
        
            /**
             * Tradable catalog plus the requesting terminal's own configuration; targeted at requester only.
             */
            class MarketSnapshotEvent extends _sdk.AbstractEvent {
        
                static wireFields = {
                    itemTypes: "int32[]",
                    npcPrices: "int32[]",
                    bestBidPrices: "int32[]",
                    bestAskPrices: "int32[]",
                    guidePrices: "int32[]",
                    currentMode: "int32",
                    currentItemType: "int32",
                    currentPrice: "int32",
                };
        
                /**
                 * @param {number[]} itemTypes
                 * @param {number[]} npcPrices - MARKET_SNAPSHOT_NONE where the item isn't NPC-priced
                 * @param {number[]} bestBidPrices - MARKET_SNAPSHOT_NONE where no buyer is currently posted
                 * @param {number[]} bestAskPrices - MARKET_SNAPSHOT_NONE where no seller is currently posted
                 * @param {number[]} guidePrices - MARKET_SNAPSHOT_NONE where the item has no guide price yet
                 * @param {number} currentMode MARKET_MODE_NONE/SELL/BUY, this terminal's live mode
                 * @param {number} currentItemType MARKET_SNAPSHOT_NONE when unconfigured
                 * @param {number} currentPrice MARKET_SNAPSHOT_NONE when unconfigured
                 */
                constructor(itemTypes, npcPrices, bestBidPrices, bestAskPrices, guidePrices, currentMode, currentItemType, currentPrice) {
                    super();
                    this.itemTypes = itemTypes;
                    this.npcPrices = npcPrices;
                    this.bestBidPrices = bestBidPrices;
                    this.bestAskPrices = bestAskPrices;
                    this.guidePrices = guidePrices;
                    this.currentMode = currentMode;
                    this.currentItemType = currentItemType;
                    this.currentPrice = currentPrice;
                }
            }
        
            var m2 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                MARKET_SNAPSHOT_NONE: MARKET_SNAPSHOT_NONE,
                MarketSnapshotEvent: MarketSnapshotEvent
            });
        
            class MarketDeclaration extends _sdk.AbstractModDeclaration {
        
                /**
                 * @returns {string}
                 */
                get name() {
                    return "Market";
                }
        
                get objectTypes() {
                    return [TradingTerminalType];
                }
        
                get wireClasses() {
                    return [
                        ConfigureTradingTerminalMessage,
                        MarketSnapshotRequestMessage,
                        MarketSnapshotEvent,
                    ];
                }
        
                get playerSettingEntries() {
                    return [
                        // optionCount only gates the clientWritable path; irrelevant here (server-authoritative).
                        new _sdk.PlayerSettingEntry(MARKET_SETTING_BALANCE, false, 0),
                    ];
                }
        
                get metricsGlobalQueries() {
                    return [
                        // SELL rows only, so the public price series doesn't double-count each trade.
                        new _sdk.MetricsGlobalQueryEntry(METRICS_FACT_TYPE_TRADE_EXECUTED, row => row.tag === METRICS_TRADE_SIDE_SELL),
                    ];
                }
            }
        
            var m0 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                MarketDeclaration: MarketDeclaration
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

export function createSim(sdk) {
    const [__c0, __c1, __c2, __c3, __c4, __c5, __c6] = __coreOf(sdk);
    var __part = (function (exports, _sdk, MarketBook_js, objectTypes_js, messages_js, events_js, constants_js) {
    
        /**
         * The Market mod's session/currency layer: configuring a terminal, reporting the tradable catalog,
         * and the per-tick settlement pass (the one place currency and chunk ownership are reachable —
         * TradingTerminalBehavior itself never touches Game). See MarketBook for the matching engine this
         * wraps.
         */
        class MarketSimMod extends _sdk.AbstractSimMod {
    
            /**
             * All this mod's ECS content (the MarketTerminal component, its systems, and the engine-scoped
             * MarketBook) is installed by TradingTerminalBehavior.install, since it's shared with the client
             * bundle via the ObjectType — nothing further to register here.
             * @param {GameEngine} sim
             * @returns {void}
             */
            setup(sim) {}
    
            /**
             * @param {AbstractMessage} message
             * @param {AbstractSession} session
             * @param {Game} game
             * @returns {boolean}
             */
            onSessionMessage(message, session, game) {
                if (message instanceof messages_js.ConfigureTradingTerminalMessage) {
                    this._configure(message, game);
                    return true;
                }
                if (message instanceof messages_js.MarketSnapshotRequestMessage) {
                    this._sendSnapshot(message, session, game);
                    return true;
                }
                return false;
            }
    
            /**
             * Settles trades/purchases, refreshes buy-terminal balances, advances guide-price clock.
             * @param {Game} game
             * @returns {void}
             */
            onTick(game) {
                const engine = game.simEngine;
                const book = engine.resolve(MarketBook_js.MarketBook);
                // Shared across both passes: one chunk-owner lookup per terminal, not two.
                const owners = new Map();
                this._settle(book, engine, game, owners);
                this._settlePurchases(book, engine, game, owners);
                this._refreshBalances(engine, game, owners);
                book.advanceTick();
            }
    
            /**
             * Applies a configure request: shape was already validated on the wire; here we reject an
             * unknown target/item or a non-positive price on a player-market item (an NPC item's price is
             * fixed and ignored), then write the terminal's live quote and (re)post it to the book.
             * @param {ConfigureTradingTerminalMessage} message
             * @param {Game} game
             * @private
             * @returns {void}
             */
            _configure(message, game) {
                const engine = game.simEngine;
                const eid = engine.placed.eidByObjectId(message.objectId);
                if (eid === undefined || engine.placed.typeIdOf(eid) !== objectTypes_js.TradingTerminalType.typeId) {
                    return;
                }
                if (message.mode !== constants_js.MARKET_MODE_SELL && message.mode !== constants_js.MARKET_MODE_BUY) {
                    return;
                }
                const book = engine.resolve(MarketBook_js.MarketBook);
                const isFixed = book.isFixedPrice(message.itemType);
                if (!isFixed && message.price <= 0) {
                    return;
                }
                const def = engine.component("MarketTerminal");
                const terminal = def.store;
                const row = def.row(eid);
                book.removeBuy(eid);
                book.removeSell(eid);
                terminal.mode[row] = message.mode;
                terminal.itemType[row] = message.itemType;
                if (isFixed) {
                    terminal.price[row] = book.fixedPriceOf(message.itemType);
                    return;
                }
                terminal.price[row] = message.price;
                if (message.mode === constants_js.MARKET_MODE_SELL) {
                    book.postSell(eid, message.itemType, message.price);
                } else {
                    book.postBuy(eid, message.itemType, message.price, terminal.out[row]);
                }
            }
    
            /**
             * Publishes the tradable catalog (NPC + player-market items) and the requesting terminal's own
             * current configuration, directly to the requesting session.
             * @param {MarketSnapshotRequestMessage} message
             * @param {AbstractSession} session
             * @param {Game} game
             * @private
             * @returns {void}
             */
            _sendSnapshot(message, session, game) {
                const engine = game.simEngine;
                const book = engine.resolve(MarketBook_js.MarketBook);
                const itemTypes = [];
                const npcPrices = [];
                const bestBidPrices = [];
                const bestAskPrices = [];
                const guidePrices = [];
                for (const listing of engine.modRegistry.marketListings) {
                    const itemType = listing.itemType;
                    itemTypes.push(itemType);
                    const npcPrice = book.fixedPriceOf(itemType);
                    const npcSnapshot = npcPrice === undefined ? events_js.MARKET_SNAPSHOT_NONE : npcPrice;
                    npcPrices.push(npcSnapshot);
                    const bestBid = book.bestBid(itemType);
                    const bestBidSnapshot = bestBid === undefined ? events_js.MARKET_SNAPSHOT_NONE : bestBid;
                    bestBidPrices.push(bestBidSnapshot);
                    const bestAsk = book.bestAsk(itemType);
                    const bestAskSnapshot = bestAsk === undefined ? events_js.MARKET_SNAPSHOT_NONE : bestAsk;
                    bestAskPrices.push(bestAskSnapshot);
                    const guidePrice = book.guidePriceOf(itemType);
                    const guideSnapshot = guidePrice === undefined ? events_js.MARKET_SNAPSHOT_NONE : guidePrice;
                    guidePrices.push(guideSnapshot);
                }
    
                let currentMode = constants_js.MARKET_MODE_NONE;
                let currentItemType = events_js.MARKET_SNAPSHOT_NONE;
                let currentPrice = events_js.MARKET_SNAPSHOT_NONE;
                const eid = engine.placed.eidByObjectId(message.objectId);
                if (eid !== undefined && engine.placed.typeIdOf(eid) === objectTypes_js.TradingTerminalType.typeId) {
                    const def = engine.component("MarketTerminal");
                    const terminal = def.store;
                    const row = def.row(eid);
                    currentMode = terminal.mode[row];
                    if (currentMode !== constants_js.MARKET_MODE_NONE) {
                        currentItemType = terminal.itemType[row];
                        currentPrice = terminal.price[row];
                    }
                }
    
                game.bus.publishTo(session.id, new events_js.MarketSnapshotEvent(
                    itemTypes, npcPrices, bestBidPrices, bestAskPrices, guidePrices,
                    currentMode, currentItemType, currentPrice,
                ));
            }
    
            /**
             * @param {number} eid a placed terminal
             * @param {GameEngine} engine
             * @param {Game} game
             * @param {Map<number, number>} owners this tick's eid -> playerId cache, shared across both
             *     _settle and _refreshBalances so a terminal touched by both is only looked up once
             * @private
             * @returns {number} the chunk owner's playerId, or PLAYER_ID_NONE
             */
            _ownerOf(eid, engine, game, owners) {
                let owner = owners.get(eid);
                if (owner === undefined) {
                    const position = engine.Position;
                    owner = game.claims.ownerOf(_sdk.chunkId(position.x[eid], position.y[eid]));
                    owners.set(eid, owner);
                }
                return owner;
            }
    
            /**
             * Pays out this tick's confirmed trades: the seller is always credited (their item is already
             * gone); a real (non-NPC) buyer is debited. Both sides settle against their chunk's current
             * owner — an unclaimed chunk has nobody to pay, so that side of the trade is simply skipped
             * rather than left to error. Deltas are batched per player so a player with several terminals
             * confirming in the same tick gets one balance update, not one per trade.
             * @param {MarketBook} book
             * @param {GameEngine} engine
             * @param {Game} game
             * @param {Map<number, number>} owners this tick's eid -> playerId cache
             * @private
             * @returns {void}
             */
            _settle(book, engine, game, owners) {
                const settlements = book.drainSettlements();
                if (settlements.length === 0) {
                    return;
                }
                const deltas = new Map();
                for (const settlement of settlements) {
                    const sellerOwner = this._ownerOf(settlement.sellerEid, engine, game, owners);
                    if (sellerOwner !== _sdk.PLAYER_ID_NONE) {
                        deltas.set(sellerOwner, (deltas.get(sellerOwner) || 0) + settlement.price);
                        engine.emitMetrics(
                            constants_js.METRICS_FACT_TYPE_TRADE_EXECUTED, sellerOwner,
                            settlement.itemType, settlement.price, constants_js.METRICS_TRADE_SIDE_SELL,
                        );
                    }
                    if (settlement.buyerEid !== _sdk.NO_EID) {
                        const buyerOwner = this._ownerOf(settlement.buyerEid, engine, game, owners);
                        if (buyerOwner !== _sdk.PLAYER_ID_NONE) {
                            deltas.set(buyerOwner, (deltas.get(buyerOwner) || 0) - settlement.price);
                            engine.emitMetrics(
                                constants_js.METRICS_FACT_TYPE_TRADE_EXECUTED, buyerOwner,
                                settlement.itemType, settlement.price, constants_js.METRICS_TRADE_SIDE_BUY,
                            );
                        }
                    }
                }
                for (const [playerId, delta] of deltas) {
                    const current = game.playerSettings.get(playerId, constants_js.MARKET_SETTING_BALANCE) || 0;
                    const next = Math.max(0, current + delta);
                    game.playerSettings.set(playerId, constants_js.MARKET_SETTING_BALANCE, next);
                    game.bus.publishToPlayer(playerId, new _sdk.PlayerSettingsUpdateEvent(constants_js.MARKET_SETTING_BALANCE, next));
                }
            }
    
            /**
             * Pays out this tick's confirmed NPC purchases: the buyer is debited against its chunk's current
             * owner (an unclaimed chunk has nobody to charge, so the purchase is simply skipped rather than
             * left to error — reachable when the chunk was unclaimed after this terminal's cached owner/balance
             * were last refreshed, since that cache is a tick stale). Deltas are batched per player, same as
             * _settle.
             * @param {MarketBook} book
             * @param {GameEngine} engine
             * @param {Game} game
             * @param {Map<number, number>} owners this tick's eid -> playerId cache
             * @private
             * @returns {void}
             */
            _settlePurchases(book, engine, game, owners) {
                const purchases = book.drainPurchases();
                if (purchases.length === 0) {
                    return;
                }
                const deltas = new Map();
                for (const purchase of purchases) {
                    const buyerOwner = this._ownerOf(purchase.buyerEid, engine, game, owners);
                    if (buyerOwner !== _sdk.PLAYER_ID_NONE) {
                        deltas.set(buyerOwner, (deltas.get(buyerOwner) || 0) - purchase.price);
                        engine.emitMetrics(
                            constants_js.METRICS_FACT_TYPE_TRADE_EXECUTED, buyerOwner,
                            purchase.itemType, purchase.price, constants_js.METRICS_TRADE_SIDE_BUY,
                        );
                    }
                }
                for (const [playerId, delta] of deltas) {
                    const current = game.playerSettings.get(playerId, constants_js.MARKET_SETTING_BALANCE) || 0;
                    const next = Math.max(0, current + delta);
                    game.playerSettings.set(playerId, constants_js.MARKET_SETTING_BALANCE, next);
                    game.bus.publishToPlayer(playerId, new _sdk.PlayerSettingsUpdateEvent(constants_js.MARKET_SETTING_BALANCE, next));
                }
            }
    
            /**
             * Refreshes every terminal's chunk-ownership-derived cache for next tick's eligibility checks
             * (see TradingTerminalBehavior): a buy terminal's `balance` (from its chunk owner's real
             * balance — an unowned chunk caches 0, so it never wins a match) and a sell terminal's
             * `sellEnabled` (whether its chunk currently has any owner at all — an unclaimed seller must
             * never sell, since nobody could be paid for it).
             * @param {GameEngine} engine
             * @param {Game} game
             * @param {Map<number, number>} owners this tick's eid -> playerId cache
             * @private
             * @returns {void}
             */
            _refreshBalances(engine, game, owners) {
                const def = engine.component("MarketTerminal");
                const terminal = def.store;
                const eids = def.eids;
                const count = def.count;
                for (let row = 0; row < count; row += 1) {
                    if (terminal.mode[row] === constants_js.MARKET_MODE_SELL) {
                        const owner = this._ownerOf(eids[row], engine, game, owners);
                        if (owner === _sdk.PLAYER_ID_NONE) {
                            terminal.sellEnabled[row] = 0;
                        } else {
                            terminal.sellEnabled[row] = 1;
                        }
                        continue;
                    }
                    if (terminal.mode[row] !== constants_js.MARKET_MODE_BUY) {
                        continue;
                    }
                    const owner = this._ownerOf(eids[row], engine, game, owners);
                    let balance = 0;
                    if (owner !== _sdk.PLAYER_ID_NONE) {
                        balance = game.playerSettings.get(owner, constants_js.MARKET_SETTING_BALANCE) || 0;
                    }
                    terminal.balance[row] = balance;
                    terminal.owner[row] = owner;
                }
            }
        }
    
        exports.MarketSimMod = MarketSimMod;
    
        return exports;
    
    })({}, sdk, __c5, __c4, __c3, __c2, __c1);
    
    return new (__only(__part, "sim"))();
}

export function createClient(sdk) {
    const [__c0, __c1, __c2, __c3, __c4, __c5, __c6] = __coreOf(sdk);
    var __part = (function (exports, _sdk, events_js, messages_js, constants_js) {
    
        const MARKET_SCHEMA = {
            // objectId of the terminal the config panel is open for, or null when closed.
            configTarget: _sdk.schemaScalar(null),
            // Last MarketSnapshotEvent, or null before first response.
            snapshot: _sdk.schemaScalar(null),
        };
    
        /**
         * Feeds the "market" namespace: open config panel's target object and last catalog snapshot.
         */
        class MarketWriter extends _sdk.AbstractCacheWriter {
    
            /**
             * @param {ClientCache} state
             * @param {AbstractSession} session
             */
            constructor(state, session) {
                super(state);
                this._session = session;
            }
    
            /**
             * @param {AbstractEvent} event
             * @returns {void}
             */
            onEvent(event) {
                if (event instanceof events_js.MarketSnapshotEvent) {
                    this._state.set("market.snapshot", event);
                }
            }
    
            /**
             * Opens the config panel for a placed terminal and requests its current snapshot.
             * @param {number} objectId
             * @returns {void}
             */
            openConfig(objectId) {
                this._state.set("market.configTarget", objectId);
                this._state.set("market.snapshot", null);
                this._session.sendMessage(new messages_js.MarketSnapshotRequestMessage(objectId));
            }
    
            /**
             * @returns {void}
             */
            closeConfig() {
                this._state.set("market.configTarget", null);
            }
        }
    
        const PANEL_WIDTH = 340;
        const MAX_ITEM_ROWS = 6;
        // Neutral tint for a toggle's inactive side.
        const INACTIVE_TINT = 0x777777;
    
        /**
         * Configures a placed Trading Terminal (mode, item, price); framed-panel HUD layer like FriendsPanelLayer.
         */
        class TradingTerminalConfigLayer extends _sdk.ConnectedPanelLayer {
    
            /**
             * @param {Application} app
             * @param {ClientCache} cache
             * @param {AbstractSession} session
             * @param {ItemRegistry} items
             */
            constructor(
                app,
                cache,
                session,
                items,
            ) {
                super(app);
                this._cache = cache;
                this._session = session;
                this._items = items;
                this._objects = cache.view("objects");
                this.textureRegistry = null;
                this.zIndex = 9600;
                this.visible = false;
                this._managed = new _sdk.ManagedPanel();
    
                this._mode = constants_js.MARKET_MODE_SELL;
                this._itemIndex = 0;
                this._price = 1;
                this._priceEdited = false;
                // The price row's live Text, mutated in place by the +/- stepper instead of a full rebuild.
                this._priceText = null;
    
                this._connectors.set("terminal", () => this._managed.panel, () => {
                    const objectId = this._targetObjectId();
                    const entry = objectId === null ? null : this._objects.get(objectId);
                    if (entry === null) {
                        return null;
                    }
                    return {x: entry.tileX, y: entry.tileY};
                });
    
                cache.subscribe("market.configTarget", value => {
                    if (value === null) {
                        this._hide();
                    } else {
                        this._priceEdited = false;
                        this._show();
                    }
                });
                cache.subscribe("market.snapshot", () => {
                    if (this.visible) {
                        this._applySnapshot();
                        this._rebuild();
                    }
                });
            }
    
            /**
             * @private
             * @returns {number|null}
             */
            _targetObjectId() {
                return this._cache.get("market.configTarget");
            }
    
            /**
             * @private
             * @returns {MarketSnapshotEvent|null}
             */
            _snapshot() {
                return this._cache.get("market.snapshot");
            }
    
            /**
             * @private
             * @returns {void}
             */
            _show() {
                this.visible = true;
                this._rebuild();
            }
    
            /**
             * @private
             * @returns {void}
             */
            _hide() {
                this.visible = false;
                this._managed.hide();
            }
    
            /**
             * Seeds local UI state from a fresh snapshot: target's current config, else a default (first item, SELL).
             * @private
             * @returns {void}
             */
            _applySnapshot() {
                const snapshot = this._snapshot();
                if (snapshot === null) {
                    return;
                }
                if (snapshot.currentItemType !== events_js.MARKET_SNAPSHOT_NONE) {
                    this._mode = snapshot.currentMode;
                    const index = snapshot.itemTypes.indexOf(snapshot.currentItemType);
                    if (index === -1) {
                        this._itemIndex = 0;
                    } else {
                        this._itemIndex = index;
                    }
                    this._price = snapshot.currentPrice;
                    this._priceEdited = true;
                } else {
                    this._itemIndex = 0;
                    this._resetPriceDefault(snapshot);
                }
            }
    
            /**
             * Pre-fills the price from the best available same-side quote for the selected item; a no-op
             * once the player has touched the stepper.
             * @private
             * @param {MarketSnapshotEvent} [snapshot]
             * @returns {void}
             */
            _resetPriceDefault(snapshot = this._snapshot()) {
                if (this._priceEdited || snapshot === null || snapshot.itemTypes.length === 0) {
                    return;
                }
                const npc = snapshot.npcPrices[this._itemIndex];
                if (npc !== events_js.MARKET_SNAPSHOT_NONE) {
                    this._price = npc;
                    return;
                }
                const sameSide = this._mode === constants_js.MARKET_MODE_SELL
                    ? snapshot.bestAskPrices[this._itemIndex]
                    : snapshot.bestBidPrices[this._itemIndex];
                if (sameSide !== events_js.MARKET_SNAPSHOT_NONE) {
                    this._price = sameSide;
                    return;
                }
                const guide = snapshot.guidePrices[this._itemIndex];
                if (guide === events_js.MARKET_SNAPSHOT_NONE) {
                    this._price = 1;
                } else {
                    this._price = guide;
                }
            }
    
            /**
             * @private
             * @returns {void}
             */
            _rebuild() {
                const objectId = this._targetObjectId();
                if (objectId === null) {
                    return;
                }
                const snapshot = this._snapshot();
    
                const panel = this._managed.show({
                    app: this._app,
                    textureRegistry: this.textureRegistry,
                    title: "Trading Terminal",
                    titleColor: _sdk.PANEL_TITLE_TEXT,
                    tint: _sdk.PANEL_TINT,
                    width: PANEL_WIDTH,
                    onClose: () => this._cache.writer("market").closeConfig(),
                }, _sdk.UIPanel.centerPosition(this._app, PANEL_WIDTH), (stack) => this._buildBody(stack, objectId, snapshot));
                this.addChild(panel);
            }
    
            /**
             * @private
             * @param {PanelStack} stack
             * @param {number} objectId
             * @param {MarketSnapshotEvent|null} snapshot
             * @returns {void}
             */
            _buildBody(stack, objectId, snapshot) {
                if (snapshot === null) {
                    stack.text("Loading...");
                    return;
                }
    
                stack.header("Mode");
                stack.row((row) => this._fillModeRow(row));
                stack.gap();
    
                stack.header("Item");
                stack.scrollSection(this.viewport, snapshot.itemTypes, (itemType, i) => ({
                    label: `${this._items.require(itemType).name} (${this._itemDetail(snapshot, i)})`,
                    buttonLabel: i === this._itemIndex ? "Selected" : "Select",
                    buttonTint: i === this._itemIndex ? _sdk.ACTIVE_ACCENT : INACTIVE_TINT,
                    onClick: () => this._selectAndReset(() => this._itemIndex = i),
                }), "No tradable items configured.", {visibleRows: MAX_ITEM_ROWS});
                stack.gap();
    
                stack.header("Price");
                stack.row((row) => this._fillPriceRow(row, stack.contentWidth, snapshot));
                stack.gap();
    
                stack.row((row) => this._fillConfirmRow(row, objectId, snapshot));
            }
    
            /**
             * Applies a mode/item selection, resets the price to its default for the new selection, and
             * rebuilds the panel.
             * @private
             * @param {function(): void} assign
             * @returns {void}
             */
            _selectAndReset(assign) {
                assign();
                this._priceEdited = false;
                this._resetPriceDefault();
                this._rebuild();
            }
    
            /**
             * @private
             * @param {Container} row
             * @returns {void}
             */
            _fillModeRow(row) {
                const options = [
                    {value: constants_js.MARKET_MODE_SELL, label: "Sell"},
                    {value: constants_js.MARKET_MODE_BUY, label: "Buy"},
                ];
                const toggle = _sdk.buildToggleRow(this.textureRegistry, options, this._mode, mode => {
                    this._selectAndReset(() => {
                        this._mode = mode;
                    });
                }, {activeTint: _sdk.ACTIVE_ACCENT, inactiveTint: INACTIVE_TINT, gap: _sdk.ROW_GAP});
                row.addChild(toggle);
            }
    
            /**
             * @private
             * @param {MarketSnapshotEvent} snapshot
             * @param {number} i
             * @returns {string}
             */
            _itemDetail(snapshot, i) {
                const npc = snapshot.npcPrices[i];
                if (npc !== events_js.MARKET_SNAPSHOT_NONE) {
                    return `fixed: ${npc}`;
                }
                const bid = this._priceOrDash(snapshot.bestBidPrices[i]);
                const ask = this._priceOrDash(snapshot.bestAskPrices[i]);
                return `bid ${bid} / ask ${ask}`;
            }
    
            /**
             * @private
             * @param {number} price
             * @returns {string|number}
             */
            _priceOrDash(price) {
                if (price === events_js.MARKET_SNAPSHOT_NONE) {
                    return "-";
                }
                return price;
            }
    
            /**
             * @private
             * @param {Container} row
             * @param {number} contentWidth
             * @param {MarketSnapshotEvent} snapshot
             * @returns {void}
             */
            _fillPriceRow(row, contentWidth, snapshot) {
                const npcSelected = snapshot.itemTypes.length > 0 && snapshot.npcPrices[this._itemIndex] !== events_js.MARKET_SNAPSHOT_NONE;
                this._priceText = _sdk.panelText(this._priceLabel(npcSelected), _sdk.TextRole.BODY);
                this._priceText.y = (_sdk.ROW_HEIGHT - this._priceText.height) / 2;
                row.addChild(this._priceText);
                if (!npcSelected) {
                    const plus = _sdk.buildPanelButton(this.textureRegistry, "+", _sdk.ACTIVE_ACCENT, () => this._stepPrice(1));
                    plus.x = contentWidth - plus.width;
                    row.addChild(plus);
                    const minus = _sdk.buildPanelButton(this.textureRegistry, "-", _sdk.ACTIVE_ACCENT, () => this._stepPrice(-1));
                    minus.x = plus.x - minus.width - _sdk.ROW_GAP;
                    row.addChild(minus);
                }
            }
    
            /**
             * @private
             * @param {boolean} npcSelected
             * @returns {string}
             */
            _priceLabel(npcSelected) {
                if (npcSelected) {
                    return `Price: ${this._price} (fixed)`;
                }
                return `Price: ${this._price}`;
            }
    
            /**
             * Adjusts the price by `delta` and updates the price row's Text in place, skipping a full rebuild.
             * @private
             * @param {number} delta
             * @returns {void}
             */
            _stepPrice(delta) {
                this._price = Math.max(1, this._price + delta);
                this._priceEdited = true;
                this._priceText.text = this._priceLabel(false);
            }
    
            /**
             * @private
             * @param {Container} row
             * @param {number} objectId
             * @param {MarketSnapshotEvent} snapshot
             * @returns {void}
             */
            _fillConfirmRow(row, objectId, snapshot) {
                const canConfirm = snapshot.itemTypes.length > 0;
                const confirm = _sdk.buildPanelButton(this.textureRegistry, "Confirm", _sdk.ACTIVE_ACCENT, () => {
                    const itemType = snapshot.itemTypes[this._itemIndex];
                    this._session.sendMessage(new messages_js.ConfigureTradingTerminalMessage(objectId, this._mode, itemType, this._price));
                    this._cache.writer("market").closeConfig();
                }, !canConfirm);
                row.addChild(confirm);
            }
        }
    
        /**
         * The Market mod's client part: the "market" cache namespace and its screen-space config panel,
         * contributed via the generic hudLayers() hook (mounted on app.stage, not the world viewport).
         */
        class MarketClientMod extends _sdk.AbstractClientMod {
    
            constructor() {
                super();
                this._configLayer = null;
            }
    
            /**
             * @param {Client} client
             * @returns {void}
             */
            setup(client) {
                client.cache.register("market", MARKET_SCHEMA, new MarketWriter(client.cache, client.session));
                this._configLayer = new TradingTerminalConfigLayer(client.app, client.cache, client.session, client.modRegistry.items);
            }
    
            /**
             * @param {Client} client
             * @returns {Container[]}
             */
            hudLayers(client) {
                return [this._configLayer];
            }
        }
    
        exports.MarketClientMod = MarketClientMod;
    
        return exports;
    
    })({}, sdk, __c2, __c3, __c1);
    
    return new (__only(__part, "client"))();
}
