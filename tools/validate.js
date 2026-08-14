// PR validation: every manifest parses, names match their directory, and versions only ever move
// forward. Who may change a listing is a question for review and (once third parties list mods)
// CODEOWNERS — not something a field in the file itself can answer.
//
//   node tools/validate.js

import {readdirSync, readFileSync, existsSync} from "node:fs";
import {join, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {RegistryManifest} from "./RegistryManifest.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every listed mod's manifest.
 * @returns {RegistryManifest[]}
 */
export function readManifests() {
    const modsDir = join(ROOT, "mods");
    const manifests = [];
    for (const name of readdirSync(modsDir).sort()) {
        const path = join(modsDir, name, "registry.json");
        if (!existsSync(path)) {
            throw new Error(`mods/${name} has no registry.json`);
        }
        const manifest = RegistryManifest.parse(JSON.parse(readFileSync(path, "utf8")));
        if (manifest.name !== name) {
            throw new Error(`mods/${name}/registry.json declares the name "${manifest.name}"`);
        }
        manifests.push(manifest);
    }
    return manifests;
}

/**
 * What the per-file parse cannot see. Names cannot collide — readManifests keys them by directory
 * and rejects a mismatch — so this is only about what a build should have left behind.
 * @param {RegistryManifest[]} manifests
 * @returns {string[]} problems
 */
export function crossChecks(manifests) {
    const problems = [];
    for (const manifest of manifests) {
        for (const entry of manifest.versions) {
            if (entry.published && entry.artifacts.get("mod.js") === undefined) {
                problems.push(`${manifest.name} ${entry.version}: published without a mod.js hash`);
            }
        }
    }
    return problems;
}

/**
 * @param {RegistryManifest[]} manifests
 * @returns {string[]} the newest version of each mod, for the run's summary
 */
function summary(manifests) {
    return manifests.map(manifest => {
        const newest = manifest.versions[manifest.versions.length - 1];
        const state = newest.published ? "published" : "awaiting build";
        return `${manifest.name} ${newest.version} (${state})`;
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const manifests = readManifests();
    const problems = crossChecks(manifests);
    for (const line of summary(manifests)) {
        console.log(`  ${line}`);
    }
    if (problems.length > 0) {
        for (const problem of problems) {
            console.error(problem);
        }
        process.exitCode = 1;
    } else {
        console.log(`${manifests.length} mods listed, all valid`);
    }
}
