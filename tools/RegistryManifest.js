// The registry's per-mod manifest: where a mod's source lives, and one pinned commit per released
// version. The registry holds no mod source — CI builds every artifact from the pinned commit, so a
// published bundle always corresponds to public source.

const NAME_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const INTEGRITY_PATTERN = /^sha256-[0-9a-f]{64}$/;
// Any https git host: nothing here depends on where a mod's source lives.
const REPO_PATTERN = /^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[A-Za-z0-9._-]+)+$/;
const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

const MANIFEST_KEYS = ["name", "repo", "path", "description", "homepage", "versions"];
const VERSION_KEYS = ["version", "commit", "toolchain", "sdkVersion", "artifacts", "publishedAt"];

const RESERVED_NAMES = new Set(["mods", "mod", "core", "engine", "sdk", "official", "spup", "game"]);

/**
 * One released version: the source commit CI built, the toolchain it used, and the artifact hashes
 * that build produced.
 */
export class RegistryVersion {

    /**
     * @param {object} fields
     * @param {string} fields.version
     * @param {string} fields.commit 40-char sha of the source repo
     * @param {string} fields.toolchain builder version CI used
     * @param {number} fields.sdkVersion
     * @param {Map<string, string>} fields.artifacts package file -> "sha256-..."
     * @param {string|null} fields.publishedAt ISO date, set by CI
     */
    constructor({
            version,
            commit,
            toolchain,
            sdkVersion,
            artifacts,
            publishedAt}) {
        this.version = version;
        this.commit = commit;
        this.toolchain = toolchain;
        this.sdkVersion = sdkVersion;
        this.artifacts = artifacts;
        this.publishedAt = publishedAt;
    }

    /**
     * Whether CI has built and published this version yet.
     * @returns {boolean}
     */
    get published() {
        return this.artifacts.size > 0;
    }

    /**
     * @returns {object}
     */
    toJSON() {
        const json = {
            version: this.version,
            commit: this.commit,
            toolchain: this.toolchain,
            sdkVersion: this.sdkVersion,
        };
        if (this.artifacts.size > 0) {
            json.artifacts = Object.fromEntries(this.artifacts);
        }
        if (this.publishedAt !== null) {
            json.publishedAt = this.publishedAt;
        }
        return json;
    }

    /**
     * @param {object} json
     * @param {string} name the mod's name, for error messages
     * @returns {RegistryVersion}
     */
    static parse(json, name) {
        assertObject(json, VERSION_KEYS, `${name}: version entry`);
        if (typeof json.version !== "string" || !VERSION_PATTERN.test(json.version)) {
            throw new Error(`${name}: invalid version ${JSON.stringify(json.version)}`);
        }
        if (typeof json.commit !== "string" || !COMMIT_PATTERN.test(json.commit)) {
            throw new Error(`${name} ${json.version}: commit must be a full 40-character sha`);
        }
        if (typeof json.toolchain !== "string" || !VERSION_PATTERN.test(json.toolchain)) {
            throw new Error(`${name} ${json.version}: invalid toolchain version`);
        }
        if (!Number.isInteger(json.sdkVersion) || json.sdkVersion < 1) {
            throw new Error(`${name} ${json.version}: invalid sdkVersion`);
        }
        const artifacts = new Map();
        const declared = json.artifacts === undefined ? {} : json.artifacts;
        for (const [file, integrity] of Object.entries(declared)) {
            if (typeof integrity !== "string" || !INTEGRITY_PATTERN.test(integrity)) {
                throw new Error(`${name} ${json.version}: artifact ${file} has a malformed hash`);
            }
            artifacts.set(file, integrity);
        }
        if (json.publishedAt !== undefined && typeof json.publishedAt !== "string") {
            throw new Error(`${name} ${json.version}: publishedAt must be a string`);
        }
        const publishedAt = json.publishedAt === undefined ? null : json.publishedAt;
        return new RegistryVersion({
            version: json.version,
            commit: json.commit,
            toolchain: json.toolchain,
            sdkVersion: json.sdkVersion,
            artifacts,
            publishedAt,
        });
    }
}

export class RegistryManifest {

    /**
     * @param {object} fields
     * @param {string} fields.name
     * @param {string} fields.repo source repository URL, on any https git host
     * @param {string} fields.path subdirectory within the repo holding the mod ("." for its root)
     * @param {string} fields.description
     * @param {string|null} fields.homepage
     * @param {RegistryVersion[]} fields.versions oldest first
     */
    constructor({
            name,
            repo,
            path,
            description,
            homepage,
            versions}) {
        this.name = name;
        this.repo = repo;
        this.path = path;
        this.description = description;
        this.homepage = homepage;
        this.versions = versions;
    }

    /**
     * The newest published version, or null when CI has not built one yet.
     * @returns {RegistryVersion|null}
     */
    get latest() {
        const published = this.versions.filter(entry => entry.published);
        if (published.length === 0) {
            return null;
        }
        return published[published.length - 1];
    }

    /**
     * @param {string} version
     * @returns {RegistryVersion|null}
     */
    find(version) {
        const found = this.versions.find(entry => entry.version === version);
        if (found === undefined) {
            return null;
        }
        return found;
    }

    /**
     * @returns {object}
     */
    toJSON() {
        const json = {
            name: this.name,
            repo: this.repo,
            path: this.path,
            description: this.description,
        };
        if (this.homepage !== null) {
            json.homepage = this.homepage;
        }
        json.versions = this.versions.map(entry => entry.toJSON());
        return json;
    }

    /**
     * @param {object} json
     * @returns {RegistryManifest}
     */
    static parse(json) {
        assertObject(json, MANIFEST_KEYS, "registry.json");
        if (typeof json.name !== "string" || !NAME_PATTERN.test(json.name)) {
            throw new Error(`invalid mod name ${JSON.stringify(json.name)}`);
        }
        if (RESERVED_NAMES.has(json.name)) {
            throw new Error(`"${json.name}" is a reserved name`);
        }
        if (typeof json.repo !== "string" || !REPO_PATTERN.test(json.repo)) {
            throw new Error(`${json.name}: repo must be an https git URL`);
        }
        if (json.repo.endsWith(".git")) {
            throw new Error(`${json.name}: drop the ".git" suffix from repo — the publisher adds it`);
        }
        if (typeof json.path !== "string" || !isModPath(json.path)) {
            throw new Error(`${json.name}: invalid path`);
        }
        if (typeof json.description !== "string" || json.description.length === 0 || json.description.length > 200) {
            throw new Error(`${json.name}: description must be 1-200 characters`);
        }
        if (json.homepage !== undefined && (typeof json.homepage !== "string" || !json.homepage.startsWith("https://"))) {
            throw new Error(`${json.name}: homepage must be an https URL`);
        }
        if (!Array.isArray(json.versions) || json.versions.length === 0) {
            throw new Error(`${json.name}: versions must be a non-empty array`);
        }
        const versions = json.versions.map(entry => RegistryVersion.parse(entry, json.name));
        assertMonotonic(versions, json.name);
        const homepage = json.homepage === undefined ? null : json.homepage;
        return new RegistryManifest({
            name: json.name,
            repo: json.repo,
            path: json.path,
            description: json.description,
            homepage,
            versions,
        });
    }
}

/**
 * Whether a path names a directory inside the mod's own checkout. "." is the repo root; anything
 * else is plain segments, and a `..` segment is refused — the publisher joins this onto a checkout,
 * so a path that walks out of it would build something the listing never named.
 * @param {string} path
 * @returns {boolean}
 */
function isModPath(path) {
    if (path === ".") {
        return true;
    }
    const segments = path.split("/");
    return segments.every(segment => segment !== "." && segment !== ".." && PATH_SEGMENT_PATTERN.test(segment));
}

/**
 * Versions are listed oldest first and must strictly increase: a rewritten or reordered history
 * would let a published version's meaning change under operators who already pinned it.
 * @param {RegistryVersion[]} versions
 * @param {string} name
 * @returns {void}
 */
function assertMonotonic(versions, name) {
    for (let index = 1; index < versions.length; index += 1) {
        if (compareVersions(versions[index - 1].version, versions[index].version) >= 0) {
            throw new Error(
                `${name}: versions must be listed oldest first and strictly increasing ` +
                `(${versions[index - 1].version} then ${versions[index].version})`,
            );
        }
    }
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number} negative when left is older
 */
export function compareVersions(left, right) {
    const leftParts = left.split(".").map(Number);
    const rightParts = right.split(".").map(Number);
    for (let index = 0; index < 3; index += 1) {
        if (leftParts[index] !== rightParts[index]) {
            return leftParts[index] - rightParts[index];
        }
    }
    return 0;
}

/**
 * @param {*} value
 * @param {string[]} allowed
 * @param {string} what
 * @returns {void}
 */
function assertObject(value, allowed, what) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${what} must be an object`);
    }
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key)) {
            throw new Error(`${what} has unknown key "${key}"`);
        }
    }
}
