// Builds one listed version from its pinned source commit into `public/p/<name>/<version>/`, and
// records the artifact hashes back into the mod's registry.json.
//
//   node tools/publish.js --mod market --version 1.4.0 [--builder <game repo checkout>]
//
// The builder comes from, in order: --builder, the checked-out source itself when it ships one
// (which is how a first-party mod is built with the very commit it pins), or the pinned
// @spup/mod-builder toolchain from npm.
// This runs a listed mod's own build, which is untrusted: install scripts are disabled, and the CI
// job that calls this holds a read-only token (committing the result is a separate job).

import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {RegistryManifest} from "./RegistryManifest.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_FILE = "mod.json";
// What a checkout must hold for it to build itself.
const BUILDER_ENTRY = "tools/build-mod.js";
const BUILDER_LOADER = "src/server/loader.js";
const CHECKER_ENTRY = "tools/mod-check.js";

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @returns {void}
 */
function run(command, args, cwd) {
    console.log(`  $ ${command} ${args.join(" ")}`);
    execFileSync(command, args, {cwd, stdio: "inherit"});
}

/**
 * Checks out exactly the pinned commit. Fetching a commit by hash is one request and no history,
 * but a host may refuse it (`uploadpack.allowReachableSHA1InWant` off), so a refusal falls back to
 * cloning and checking the hash out — slower, works anywhere.
 * @param {string} repo
 * @param {string} commit
 * @param {string} dir
 * @returns {void}
 */
function checkout(repo, commit, dir) {
    mkdirSync(dir, {recursive: true});
    const remote = `${repo}.git`;
    run("git", ["init", "--quiet"], dir);
    run("git", ["remote", "add", "origin", remote], dir);
    try {
        run("git", ["fetch", "--quiet", "--depth", "1", "origin", commit], dir);
    } catch (error) {
        console.log(`  (${remote} will not serve a commit by hash; cloning instead)`);
        run("git", ["fetch", "--quiet", "origin"], dir);
    }
    run("git", ["checkout", "--quiet", commit], dir);
}

/**
 * @param {string} path
 * @returns {string}
 */
function integrityOf(path) {
    return `sha256-${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

/**
 * Hashes exactly the files the built package declares, after checking that it is the package the
 * listing promised. Reading the emitted manifest (rather than the output directory) keeps a stale
 * file from an earlier build out of the record.
 * @param {string} outDir
 * @param {RegistryManifest} manifest
 * @param {RegistryVersion} version
 * @returns {Map<string, string>}
 */
function hashPackage(outDir, manifest, version) {
    const built = JSON.parse(readFileSync(join(outDir, MANIFEST_FILE), "utf8"));
    if (built.name !== manifest.name || built.version !== version.version) {
        throw new Error(
            `the build produced ${built.name} ${built.version}, but the listing says ` +
            `${manifest.name} ${version.version}`,
        );
    }
    if (built.sdkVersion !== version.sdkVersion) {
        throw new Error(
            `${manifest.name} ${version.version} is listed as sdkVersion ${version.sdkVersion}, ` +
            `but it builds against ${built.sdkVersion}`,
        );
    }
    const artifacts = new Map();
    for (const file of [MANIFEST_FILE, built.entry]) {
        const path = join(outDir, file);
        if (!existsSync(path)) {
            throw new Error(`the built package declares ${file}, which it did not produce`);
        }
        artifacts.set(file, integrityOf(path));
    }
    return artifacts;
}

/**
 * The builder to build a checkout with: an explicitly given one, or the checkout's own when it
 * ships the toolchain (the game repo does, and its mods pin it — so they build with exactly the
 * SDK and builder of the commit they name).
 * @param {string} source the checked-out source
 * @param {string|null} builderDir
 * @returns {string|null} a directory holding tools/build-mod.js, or null to fetch the toolchain
 */
function builderFor(source, builderDir) {
    if (builderDir !== null) {
        return builderDir;
    }
    if (existsSync(join(source, BUILDER_ENTRY))) {
        return source;
    }
    return null;
}

/**
 * Builds a version and returns its artifact hashes.
 * @param {RegistryManifest} manifest
 * @param {RegistryVersion} version
 * @param {string} outDir where the package is written
 * @param {string|null} builderDir a checkout providing the builder, or null to resolve one
 * @returns {Map<string, string>}
 */
export function buildVersion(manifest, version, outDir, builderDir) {
    const work = mkdtempSync(join(tmpdir(), `spup-${manifest.name}-`));
    try {
        // The builder names a package after the directory it builds, and a mod whose path is "."
        // is built straight from this checkout — so the checkout carries the listing's name.
        const source = join(work, manifest.name);
        checkout(manifest.repo, version.commit, source);
        if (existsSync(join(source, "package.json"))) {
            // A listed mod's dependencies are not allowed to run code at install time.
            run("npm", ["ci", "--no-audit", "--no-fund", "--ignore-scripts"], source);
        }
        const modDir = manifest.path === "." ? source : join(source, manifest.path);
        const buildArgs = [modDir, outDir, "--version", version.version];
        const builder = builderFor(source, builderDir);
        if (builder === null) {
            run("npx", ["--yes", `@spup/mod-builder@${version.toolchain}`, "build", ...buildArgs], work);
            run("npx", ["--yes", `@spup/mod-builder@${version.toolchain}`, "check", outDir], work);
        } else {
            run("node", [join(builder, BUILDER_ENTRY), ...buildArgs], builder);
            run("node", ["--import", join(builder, BUILDER_LOADER), join(builder, CHECKER_ENTRY), outDir], builder);
        }
        return hashPackage(outDir, manifest, version);
    } finally {
        rmSync(work, {recursive: true, force: true});
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const {values: args} = parseArgs({
        options: {
            "mod": {type: "string"},
            "version": {type: "string"},
            "out": {type: "string", default: join(ROOT, "public", "p")},
            "builder": {type: "string"},
            "rebuild": {type: "boolean", default: false},
        },
    });
    if (args.mod === undefined || args.version === undefined) {
        throw new Error("usage: publish.js --mod <name> --version <x.y.z> [--builder <dir>]");
    }
    const manifestPath = join(ROOT, "mods", args.mod, "registry.json");
    const manifest = RegistryManifest.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
    const version = manifest.find(args.version);
    if (version === null) {
        throw new Error(`${args.mod} lists no version ${args.version}`);
    }
    if (version.published && !args.rebuild) {
        throw new Error(`${args.mod} ${args.version} is already published; pass --rebuild to overwrite its hashes`);
    }
    const outDir = join(args.out, args.mod, args.version);
    // A rebuild starts from an empty directory: whatever the last build left behind is not part of
    // this one, and must not end up hashed into the listing.
    rmSync(outDir, {recursive: true, force: true});
    mkdirSync(outDir, {recursive: true});
    const artifacts = buildVersion(manifest, version, outDir, args.builder === undefined ? null : args.builder);

    version.artifacts = artifacts;
    version.publishedAt = new Date().toISOString().slice(0, 10);
    writeFileSync(manifestPath, `${JSON.stringify(manifest.toJSON(), null, 4)}\n`);
    console.log(`${args.mod} ${args.version} built into ${outDir}`);
    for (const [file, integrity] of artifacts) {
        console.log(`  ${file}  ${integrity}`);
    }
}
