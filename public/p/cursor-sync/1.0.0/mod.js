// Built by tools/build-mod.js — do not edit.

let __coreModules = null;

function __coreOf(sdk) {
    if (__coreModules === null) {
        var __part = (function (exports, _sdk) {
        
            // Player-setting keys; 1-3 reserved (persisted by old saves).
            const CURSOR_SETTING_SHARE = 4;
            const CURSOR_SETTING_DISPLAY = 5;
        
            // Audience option indices for both settings (the stored value is the index).
            const CURSOR_AUDIENCE_NONE = 0;
            const CURSOR_AUDIENCE_FRIENDS = 1;
            const CURSOR_AUDIENCE_EVERYONE = 2;
            // The audience of an absent setting, applied by the sim gate, client mirror, and control alike.
            const CURSOR_AUDIENCE_DEFAULT = CURSOR_AUDIENCE_EVERYONE;
            // Option labels, indexed by audience; each setting's label ends in the completing preposition.
            const CURSOR_AUDIENCE_OPTIONS = ["No one", "Friends", "Everyone"];
        
            /**
             * Whether an audience option admits another player; the holder admits themselves always,
             * except with no one.
             * @param {number} mode CURSOR_AUDIENCE_* option
             * @param {boolean} isSelf
             * @param {boolean} isFriend whether the other player is on the option holder's friend list
             * @returns {boolean}
             */
            function audienceAdmits(mode, isSelf, isFriend) {
                if (mode === CURSOR_AUDIENCE_NONE) {
                    return false;
                }
                if (isSelf) {
                    return true;
                }
                if (mode === CURSOR_AUDIENCE_FRIENDS) {
                    return isFriend;
                }
                return true;
            }
        
            // Own-cursor heartbeat interval; nothing is sent while the cursor rests. The receiver
            // interpolates over the same interval, trailing one heartbeat behind.
            const CURSOR_SEND_INTERVAL_MS = 100;
        
            var m1 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                CURSOR_AUDIENCE_DEFAULT: CURSOR_AUDIENCE_DEFAULT,
                CURSOR_AUDIENCE_EVERYONE: CURSOR_AUDIENCE_EVERYONE,
                CURSOR_AUDIENCE_FRIENDS: CURSOR_AUDIENCE_FRIENDS,
                CURSOR_AUDIENCE_NONE: CURSOR_AUDIENCE_NONE,
                CURSOR_AUDIENCE_OPTIONS: CURSOR_AUDIENCE_OPTIONS,
                CURSOR_SEND_INTERVAL_MS: CURSOR_SEND_INTERVAL_MS,
                CURSOR_SETTING_DISPLAY: CURSOR_SETTING_DISPLAY,
                CURSOR_SETTING_SHARE: CURSOR_SETTING_SHARE,
                audienceAdmits: audienceAdmits
            });
        
            /**
             * The sender's cursor heartbeat: its tile position (fractional), sent per interval while the
             * cursor moves.
             */
            class CursorMoveMessage extends _sdk.AbstractMessage {
        
                static wireFields = {
                    x: "float",
                    y: "float",
                };
        
                /**
                 * @param {number} x tile x, fractional
                 * @param {number} y tile y, fractional
                 */
                constructor(x, y) {
                    super();
                    this.x = x;
                    this.y = y;
                }
        
                /**
                 * @param {GameAPI} api
                 * @param {AbstractSession} session
                 * @returns {boolean}
                 */
                validate(api, session) {
                    // The region's half-open tile box, matching tileId's bounds.
                    return Number.isFinite(this.x) && Number.isFinite(this.y)
                        && this.x >= -_sdk.TILE_HALF && this.x < _sdk.TILE_HALF
                        && this.y >= -_sdk.TILE_HALF && this.y < _sdk.TILE_HALF;
                }
            }
        
            /**
             * Hides the sender's cursor: sent on window blur or zoom-out past world mode.
             */
            class CursorHideMessage extends _sdk.AbstractMessage {
        
                static wireFields = {};
            }
        
            var m3 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                CursorHideMessage: CursorHideMessage,
                CursorMoveMessage: CursorMoveMessage
            });
        
            /**
             * A player's cursor at a tile position (fractional); routed to the sessions viewing its chunk.
             */
            class PlayerCursorEvent extends _sdk.AbstractChunkRoutedEvent {
        
                static wireFields = {
                    playerId: "int64",
                    x: "float",
                    y: "float",
                };
        
                /**
                 * @param {number} playerId
                 * @param {number} x tile x, fractional
                 * @param {number} y tile y, fractional
                 */
                constructor(playerId, x, y) {
                    super(x, y);
                    this.playerId = playerId;
                }
            }
        
            /**
             * A player's cursor went away (blur, zoom-out, chunk crossing, share-off, disconnect). Targeted
             * (publishTo) at the sessions losing sight of it.
             */
            class PlayerCursorHideEvent extends _sdk.AbstractEvent {
        
                static wireFields = {
                    playerId: "int64",
                };
        
                /**
                 * @param {number} playerId
                 */
                constructor(playerId) {
                    super();
                    this.playerId = playerId;
                }
            }
        
            var m2 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                PlayerCursorEvent: PlayerCursorEvent,
                PlayerCursorHideEvent: PlayerCursorHideEvent
            });
        
            class CursorSyncDeclaration extends _sdk.AbstractModDeclaration {
        
                /**
                 * @returns {string}
                 */
                get name() {
                    return "CursorSync";
                }
        
                get wireClasses() {
                    return [
                        CursorMoveMessage,
                        CursorHideMessage,
                        PlayerCursorEvent,
                        PlayerCursorHideEvent,
                    ];
                }
        
                get playerSettingEntries() {
                    return [
                        new _sdk.PlayerSettingEntry(CURSOR_SETTING_SHARE, true, CURSOR_AUDIENCE_OPTIONS.length),
                        new _sdk.PlayerSettingEntry(CURSOR_SETTING_DISPLAY, true, CURSOR_AUDIENCE_OPTIONS.length),
                    ];
                }
            }
        
            var m0 = /*#__PURE__*/Object.freeze({
                __proto__: null,
                CursorSyncDeclaration: CursorSyncDeclaration
            });
        
            const coreModules = [m0, m1, m2, m3];
        
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
    const [__c0, __c1, __c2, __c3] = __coreOf(sdk);
    var __part = (function (exports, _sdk, constants_js, messages_js, events_js) {
    
        /**
         * A session's published cursor: its owner and the chunk it was last seen in, for targeted hides.
         */
        class CursorState {
    
            /**
             * @param {number} playerId
             * @param {number} chunk
             */
            constructor(playerId, chunk) {
                this.playerId = playerId;
                this.chunk = chunk;
            }
        }
    
        /**
         * Relays each session's cursor heartbeats to the sessions viewing its chunk, hiding it for
         * viewers losing sight (chunk crossing, hide message, setting change, disconnect). Each
         * heartbeat passes two audience gates: the owner's share setting and the viewer's display setting.
         */
        class CursorSyncSimMod extends _sdk.AbstractSimMod {
    
            constructor() {
                super();
                /**
                 * sessionId -> its cursor's {@link CursorState}, present only while the cursor is shown.
                 * @type {Map<number, CursorState>}
                 */
                this._cursorBySession = new Map();
            }
    
            /**
             * No ECS content; the mod lives entirely at the session level.
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
                if (message instanceof messages_js.CursorMoveMessage) {
                    this._handleCursorMove(message, session, game);
                    return true;
                }
                if (message instanceof messages_js.CursorHideMessage) {
                    this._hideCursor(session.id, game);
                    return true;
                }
                return false;
            }
    
            /**
             * @param {number} sessionId
             * @param {Game} game
             * @returns {void}
             */
            onSessionDisconnect(sessionId, game) {
                this._hideCursor(sessionId, game);
            }
    
            /**
             * @param {AbstractSession} session
             * @param {number} key
             * @param {number} value
             * @param {Game} game
             * @returns {void}
             */
            onPlayerSettingWritten(session, key, value, game) {
                if (value === constants_js.CURSOR_AUDIENCE_EVERYONE) {
                    return;
                }
                // The client applies its own narrowing write too, but the erase must not depend on it.
                // Erases are broad; the next heartbeat re-shows the cursor where still admitted.
                if (key === constants_js.CURSOR_SETTING_SHARE) {
                    this._hideCursor(session.id, game);
                }
                if (key === constants_js.CURSOR_SETTING_DISPLAY) {
                    this._eraseExcludedCursors(session.playerId, value, game);
                }
            }
    
            /**
             * An unfriend cuts the remover's friends-narrowed sight both ways: the removed player loses
             * a friends-sharing remover's cursor, a friends-displaying remover loses the removed player's.
             * @param {number} playerId
             * @param {number} friendId
             * @param {Game} game
             * @returns {void}
             */
            onFriendRemoved(playerId, friendId, game) {
                if (this._audienceOf(playerId, constants_js.CURSOR_SETTING_SHARE, game) === constants_js.CURSOR_AUDIENCE_FRIENDS) {
                    game.bus.publishToPlayer(friendId, new events_js.PlayerCursorHideEvent(playerId));
                }
                if (this._audienceOf(playerId, constants_js.CURSOR_SETTING_DISPLAY, game) === constants_js.CURSOR_AUDIENCE_FRIENDS) {
                    game.bus.publishToPlayer(playerId, new events_js.PlayerCursorHideEvent(friendId));
                }
            }
    
            /**
             * Publishes a cursor heartbeat to its chunk's viewers, hiding it first for viewers losing
             * sight on a chunk crossing.
             * @param {CursorMoveMessage} message
             * @param {AbstractSession} session
             * @param {Game} game
             * @private
             */
            _handleCursorMove(message, session, game) {
                // Client-side gating trusted but re-checked: a non-sharing player's cursor never fans out.
                const shareMode = this._audienceOf(session.playerId, constants_js.CURSOR_SETTING_SHARE, game);
                if (shareMode === constants_js.CURSOR_AUDIENCE_NONE) {
                    return;
                }
                const event = new events_js.PlayerCursorEvent(session.playerId, message.x, message.y);
                // The chunk getter recomputes; derive it once per heartbeat.
                const chunk = event.chunk;
                const state = this._cursorBySession.get(session.id);
                if (state === undefined) {
                    this._cursorBySession.set(session.id, new CursorState(session.playerId, chunk));
                } else {
                    if (state.chunk !== chunk) {
                        this._publishCursorHide(state.playerId, state.chunk, chunk, session.id, game);
                    }
                    state.chunk = chunk;
                }
                const viewers = game.bus.chunkSubscribers(chunk);
                if (viewers === undefined) {
                    return;
                }
                // Copied: a viewer's own dispatch may resubscribe while we fan out.
                for (const viewerSessionId of [...viewers]) {
                    // The owning session never gets its own cursor echoed back.
                    if (viewerSessionId === session.id) {
                        continue;
                    }
                    const viewerId = game.bus.playerIdOf(viewerSessionId);
                    const isSelf = viewerId === session.playerId;
                    if (!constants_js.audienceAdmits(shareMode, isSelf, game.players.isFriend(session.playerId, viewerId))) {
                        continue;
                    }
                    const displayMode = this._audienceOf(viewerId, constants_js.CURSOR_SETTING_DISPLAY, game);
                    if (!constants_js.audienceAdmits(displayMode, isSelf, game.players.isFriend(viewerId, session.playerId))) {
                        continue;
                    }
                    // The cursor label needs its owner's name; first sight of a player sends it.
                    game.syncUsernames(viewerSessionId, [session.playerId]);
                    game.bus.publishTo(viewerSessionId, event);
                }
            }
    
            /**
             * @param {number} playerId
             * @param {number} key CURSOR_SETTING_SHARE or CURSOR_SETTING_DISPLAY
             * @param {Game} game
             * @returns {number} the player's CURSOR_AUDIENCE_* option
             * @private
             */
            _audienceOf(playerId, key, game) {
                const value = game.playerSettings.get(playerId, key);
                return value === undefined ? constants_js.CURSOR_AUDIENCE_DEFAULT : value;
            }
    
            /**
             * Erases every shown cursor a viewer's narrowed display setting no longer admits.
             * @param {number} viewerId
             * @param {number} mode the new CURSOR_AUDIENCE_* option
             * @param {Game} game
             * @private
             */
            _eraseExcludedCursors(viewerId, mode, game) {
                const excludedIds = new Set();
                for (const state of this._cursorBySession.values()) {
                    const isSelf = viewerId === state.playerId;
                    if (!constants_js.audienceAdmits(mode, isSelf, game.players.isFriend(viewerId, state.playerId))) {
                        excludedIds.add(state.playerId);
                    }
                }
                for (const excludedId of excludedIds) {
                    game.bus.publishToPlayer(viewerId, new events_js.PlayerCursorHideEvent(excludedId));
                }
            }
    
            /**
             * Erases a session's cursor for every viewer of its last chunk (hide message, share change,
             * disconnect); a no-op when it was never shown.
             * @param {number} sessionId
             * @param {Game} game
             * @private
             */
            _hideCursor(sessionId, game) {
                const state = this._cursorBySession.get(sessionId);
                if (state === undefined) {
                    return;
                }
                this._cursorBySession.delete(sessionId);
                this._publishCursorHide(state.playerId, state.chunk, null, sessionId, game);
            }
    
            /**
             * Sends a hide to the sessions viewing `fromChunk` but not `toChunk` (null: all of them).
             * @param {number} playerId
             * @param {number} fromChunk
             * @param {number|null} toChunk
             * @param {number} ownerSessionId
             * @param {Game} game
             * @private
             */
            _publishCursorHide(playerId, fromChunk, toChunk, ownerSessionId, game) {
                const losing = game.bus.chunkSubscribers(fromChunk);
                if (losing === undefined) {
                    return;
                }
                const keeping = toChunk === null ? undefined : game.bus.chunkSubscribers(toChunk);
                // One shared instance: delivery only encodes, and publishTo never resubscribes.
                const event = new events_js.PlayerCursorHideEvent(playerId);
                for (const sessionId of losing) {
                    if (sessionId === ownerSessionId) {
                        continue;
                    }
                    if (keeping !== undefined && keeping.has(sessionId)) {
                        continue;
                    }
                    game.bus.publishTo(sessionId, event);
                }
            }
        }
    
        exports.CursorSyncSimMod = CursorSyncSimMod;
    
        return exports;
    
    })({}, sdk, __c1, __c3, __c2);
    
    return new (__only(__part, "sim"))();
}

export function createClient(sdk) {
    const [__c0, __c1, __c2, __c3] = __coreOf(sdk);
    var __part = (function (exports, _sdk, constants_js, events_js, messages_js) {
    
        const REMOTE_CURSORS_SCHEMA = {
            byPlayer: _sdk.schemaMap(),
        };
    
        /**
         * @typedef {object} RemoteCursorState one remote player's live cursor
         * @property {number} playerId
         * @property {number} x tile x, fractional
         * @property {number} y tile y, fractional
         */
    
        /**
         * Writes the mirror of other players' cursors. The server gates delivery by the display setting and
         * hides a cursor for viewers losing sight of it; the setting is re-applied here so narrowing it
         * clears instantly, and a chunk unsubscribe drops its cursors, closing the last gap. Registered
         * under the "remoteCursors" namespace.
         */
        class RemoteCursorsWriter extends _sdk.AbstractCacheWriter {
    
            /**
             * @param {ClientCache} state own-player identity, friend list, and the display setting
             */
            constructor(state) {
                super(state);
                this._claims = state.view("chunkClaims");
                this._displayMode = constants_js.CURSOR_AUDIENCE_DEFAULT;
                state.subscribe("playerSettings.values", (key, value) => {
                    if (key === constants_js.CURSOR_SETTING_DISPLAY) {
                        this._setDisplayMode(value);
                    }
                });
            }
    
            /**
             * Applies the display setting: narrowing clears the cursors it no longer admits.
             * @private
             * @param {number} mode CURSOR_AUDIENCE_* option
             * @returns {void}
             */
            _setDisplayMode(mode) {
                this._displayMode = mode;
                this._state.mapDeleteWhere("remoteCursors.byPlayer", cursor => !this._admits(cursor.playerId));
            }
    
            /**
             * Whether the display setting admits a player's cursor.
             * @private
             * @param {number} playerId
             * @returns {boolean}
             */
            _admits(playerId) {
                // Own events are dropped before this gate; self-admission never applies.
                return constants_js.audienceAdmits(this._displayMode, false, this._claims.isFriend(playerId));
            }
    
            /**
             * Applies a cursor event; a chunk unsubscribe drops the cursors it contained.
             * @param {AbstractEvent} event
             * @returns {void}
             */
            onEvent(event) {
                if (event instanceof events_js.PlayerCursorEvent) {
                    if (event.playerId === this._claims.ownPlayerId || !this._admits(event.playerId)) {
                        return;
                    }
                    this._state.mapSet("remoteCursors.byPlayer", event.playerId, {
                        playerId: event.playerId,
                        x: event.x,
                        y: event.y,
                    });
                    return;
                }
                if (event instanceof events_js.PlayerCursorHideEvent) {
                    this._state.mapDelete("remoteCursors.byPlayer", event.playerId);
                    return;
                }
                if (event instanceof _sdk.ChunkUnsubscribeEvent) {
                    this._state.mapDeleteWhere("remoteCursors.byPlayer", cursor => _sdk.chunkId(cursor.x, cursor.y) === event.chunk);
                }
            }
        }
    
        // Classic arrow pointer outline, in screen pixels (the display counter-scales the zoom).
        const ARROW_POINTS = [0, 0, 0, 25, 7, 19, 11, 30, 15, 28, 11, 18, 18, 18];
        const ARROW_STROKE = 0xffffff;
        const ARROW_STROKE_WIDTH = 1.5;
    
        // Username label placement, right of the arrow.
        const LABEL_X = 20;
        const LABEL_Y = 22;
        const LABEL_STROKE = 0xffffff;
        const LABEL_STROKE_WIDTH = 3;
    
        // Idle displays kept pooled; more concurrent cursors than this is already unusual.
        const CURSOR_POOL_CAPACITY = 16;
    
        // A cursor without a heartbeat for this long dims to the idle alpha until it moves again.
        const CURSOR_IDLE_MS = 10_000;
        const CURSOR_IDLE_ALPHA = 0.6;
    
        /**
         * One remote cursor: a pointer arrow plus the player's username, gliding between heartbeat
         * positions over the send interval.
         */
        class RemoteCursorDisplay extends _sdk.Container {
    
            constructor() {
                super();
                this._xTween = new _sdk.Tween(0, constants_js.CURSOR_SEND_INTERVAL_MS);
                this._yTween = new _sdk.Tween(0, constants_js.CURSOR_SEND_INTERVAL_MS);
                this._idleMs = 0;
                this._arrow = new _sdk.Graphics();
                this._label = new _sdk.Text({
                    text: "",
                    style: {
                        fontFamily: _sdk.GAME_FONT,
                        fontSize: 15,
                        fill: 0x000000,
                        stroke: {color: LABEL_STROKE, width: LABEL_STROKE_WIDTH},
                    },
                });
                this._label.x = LABEL_X;
                this._label.y = LABEL_Y;
                this.addChild(this._arrow);
                this.addChild(this._label);
            }
    
            /**
             * Applies a player's identity: their username and stable color.
             * @param {string} username
             * @param {number} color
             * @returns {void}
             */
            show(username, color) {
                this._label.text = username;
                this._label.style.fill = color;
                this._arrow
                    .clear()
                    .poly(ARROW_POINTS)
                    .fill(color)
                    .stroke({color: ARROW_STROKE, width: ARROW_STROKE_WIDTH});
            }
    
            /**
             * Places the cursor with no in-flight glide.
             * @param {number} x world x
             * @param {number} y world y
             * @returns {void}
             */
            snap(x, y) {
                this._xTween.reset(x);
                this._yTween.reset(y);
                this.position.set(x, y);
                this._markActive();
            }
    
            /**
             * Glides toward a new heartbeat position.
             * @param {number} x world x
             * @param {number} y world y
             * @returns {void}
             */
            retarget(x, y) {
                this._xTween.to(x, _sdk.linear);
                this._yTween.to(y, _sdk.linear);
                this._markActive();
            }
    
            /**
             * Glides the position and dims the cursor once it has idled past {@link CURSOR_IDLE_MS}.
             * @param {number} deltaMS
             * @returns {void}
             */
            advance(deltaMS) {
                this.position.set(this._xTween.advance(deltaMS), this._yTween.advance(deltaMS));
                this._idleMs += deltaMS;
                if (this._idleMs >= CURSOR_IDLE_MS) {
                    this.alpha = CURSOR_IDLE_ALPHA;
                }
            }
    
            /**
             * @private
             * @returns {void}
             */
            _markActive() {
                this._idleMs = 0;
                this.alpha = 1;
            }
        }
    
        /**
         * Other players' live cursors, drawn from the remoteCursors state. Not chunk-mounted: cursors are
         * few and cross chunks freely. Hidden outside world mode.
         */
        class RemoteCursorsDrawLayer extends _sdk.AbstractDrawLayer {
    
            /**
             * @param {ClientCache} state cursor feed and username lookups
             */
            constructor(state) {
                super();
                this._players = state.view("players");
                const pool = new _sdk.DisplayPool(
                    () => {
                        const display = new RemoteCursorDisplay();
                        this.addChild(display);
                        return display;
                    },
                    display => {
                        display.visible = false;
                    },
                    display => {
                        display.visible = true;
                    },
                    CURSOR_POOL_CAPACITY,
                );
                this._displays = new _sdk.KeyedDisplayPool(pool);
                state.subscribe("remoteCursors.byPlayer", (playerId, cursor) => {
                    if (cursor === undefined) {
                        this._displays.release(playerId);
                    } else {
                        this._onUpsert(cursor);
                    }
                });
            }
    
            get layerIndex() {
                return 50;
            }
    
            /**
             * @private
             * @param {RemoteCursorState} cursor
             * @returns {void}
             */
            _onUpsert(cursor) {
                const x = cursor.x * _sdk.TILE_SIZE;
                const y = cursor.y * _sdk.TILE_SIZE;
                let display = this._displays.get(cursor.playerId);
                if (display === undefined) {
                    display = this._displays.take(cursor.playerId);
                    display.show(this._players.usernameOf(cursor.playerId), _sdk.claimColor(cursor.playerId));
                    display.snap(x, y);
                } else {
                    display.retarget(x, y);
                }
            }
    
            /**
             * Glides every cursor and counter-scales the displays to a constant screen size.
             * @param {number} frame
             * @param {number} deltaMS
             * @param {Set<number>} visibleChunks
             * @returns {void}
             */
            tick(frame, deltaMS, visibleChunks) {
                if (!this.visible) {
                    return;
                }
                const invScale = 1 / this.viewport.scale.x;
                for (const display of this._displays.values()) {
                    display.advance(deltaMS);
                    display.scale.set(invScale);
                }
            }
        }
    
        /**
         * Broadcasts the own cursor's tile position: one heartbeat per interval while it moves, silence
         * while it rests, an explicit hide on blur, zoom-out, or share-off.
         */
        class CursorPublisher {
    
            /**
             * @param {AbstractSession} session
             * @param {Mouse} mouse
             * @param {ClientCache} state
             * @param {WindowFocus} windowFocus
             */
            constructor(
                session,
                mouse,
                state,
                windowFocus,
            ) {
                this._session = session;
                this._mouse = mouse;
                this._playerSettings = state.view("playerSettings");
                this._windowFocus = windowFocus;
                this._viewMode = _sdk.ViewMode.WORLD;
                // Whether the cursor is currently shown remotely (a hide is owed when sending stops).
                this._shown = false;
                this._lastSentX = null;
                this._lastSentY = null;
                state.subscribe("playerSettings.values", (key, value) => {
                    // No wire hide: the server erases the cursor on the narrowing share write itself.
                    // Forgetting the last position makes the next heartbeat re-show it where allowed.
                    if (key === constants_js.CURSOR_SETTING_SHARE) {
                        this._reset();
                    }
                });
                windowFocus.onChange(focused => {
                    if (!focused) {
                        this._hide();
                    }
                });
            }
    
            /**
             * Starts the heartbeat timer (browser only).
             * @returns {void}
             */
            start() {
                _sdk.startHeartbeat(constants_js.CURSOR_SEND_INTERVAL_MS, () => this.tick());
            }
    
            /**
             * @param {ViewMode} mode
             * @returns {void}
             */
            setViewMode(mode) {
                this._viewMode = mode;
                if (mode !== _sdk.ViewMode.WORLD) {
                    this._hide();
                }
            }
    
            /**
             * One heartbeat: sends the cursor's tile position when sharing applies and it moved.
             * @returns {void}
             */
            tick() {
                if (!this._canSend() || this._mouse.currentX === null) {
                    return;
                }
                const x = this._mouse.currentX / _sdk.TILE_SIZE;
                const y = this._mouse.currentY / _sdk.TILE_SIZE;
                if (x === this._lastSentX && y === this._lastSentY) {
                    return;
                }
                this._lastSentX = x;
                this._lastSentY = y;
                this._shown = true;
                this._session.sendMessage(new messages_js.CursorMoveMessage(x, y));
            }
    
            /**
             * @private
             * @returns {boolean}
             */
            _canSend() {
                return this._windowFocus.focused
                    && this._viewMode === _sdk.ViewMode.WORLD
                    && this._playerSettings.get(constants_js.CURSOR_SETTING_SHARE) !== constants_js.CURSOR_AUDIENCE_NONE;
            }
    
            /**
             * Sends one hide when the cursor was shown; the next heartbeat re-shows it.
             * @private
             * @returns {void}
             */
            _hide() {
                const shown = this._shown;
                this._reset();
                if (shown) {
                    this._session.sendMessage(new messages_js.CursorHideMessage());
                }
            }
    
            /**
             * Forgets the shown cursor without a wire hide; the next heartbeat re-shows it.
             * @private
             * @returns {void}
             */
            _reset() {
                this._shown = false;
                this._lastSentX = null;
                this._lastSentY = null;
            }
        }
    
        class CursorSyncClientMod extends _sdk.AbstractClientMod {
    
            constructor() {
                super();
                this._layer = null;
                this._publisher = null;
            }
    
            /**
             * @param {Client} client
             * @returns {void}
             */
            setup(client) {
                client.cache.register("remoteCursors", REMOTE_CURSORS_SCHEMA, new RemoteCursorsWriter(client.cache));
                this._layer = new RemoteCursorsDrawLayer(client.cache);
                this._publisher = new CursorPublisher(client.session, _sdk.Mouse, client.cache, _sdk.WindowFocus);
            }
    
            /**
             * @param {Client} client
             * @returns {AbstractDrawLayer[]}
             */
            drawLayers(client) {
                return [this._layer];
            }
    
            /**
             * @param {Client} client
             * @returns {SettingCategory[]}
             */
            settingsCategories(client) {
                return [
                    new _sdk.SettingCategory("Cursor Sync", 10, [
                        new _sdk.PlayerSettingChoice(constants_js.CURSOR_SETTING_SHARE, "Share my cursor with", constants_js.CURSOR_AUDIENCE_OPTIONS, constants_js.CURSOR_AUDIENCE_DEFAULT),
                        new _sdk.PlayerSettingChoice(constants_js.CURSOR_SETTING_DISPLAY, "Display cursors from", constants_js.CURSOR_AUDIENCE_OPTIONS, constants_js.CURSOR_AUDIENCE_DEFAULT),
                    ]),
                ];
            }
    
            /**
             * @param {ViewMode} mode
             * @param {Client} client
             * @returns {void}
             */
            setViewMode(mode, client) {
                this._publisher.setViewMode(mode);
            }
    
            /**
             * Starts the heartbeat once the session is live.
             * @param {Client} client
             * @returns {void}
             */
            onReady(client) {
                this._publisher.start();
            }
        }
    
        exports.CursorSyncClientMod = CursorSyncClientMod;
    
        return exports;
    
    })({}, sdk, __c1, __c2, __c3);
    
    return new (__only(__part, "client"))();
}
