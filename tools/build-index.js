// Generates the published catalog: what the server CLI resolves `mods add <name>` against, and what
// the game client's /mods page renders. Only versions CI has built and published appear in it.
//
// This is the site build — Cloudflare Pages runs it and serves `public/`.
//
//   node tools/build-index.js [--out public/index.json] [--base-url https://mods.spupgame.com]

import {mkdirSync, writeFileSync} from "node:fs";
import {join, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";
import {readManifests} from "./validate.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_BASE_URL = "https://mods.spupgame.com";
const CLIENT_URL = "https://spupgame.com";
const SOURCE_URL = "https://github.com/shyyio/spup-mods";

/**
 * The URL a published version's files are served from.
 * @param {string} baseUrl
 * @param {string} name
 * @param {string} version
 * @returns {string}
 */
export function packageUrl(baseUrl, name, version) {
    return `${baseUrl}/p/${name}/${version}/`;
}

/**
 * @param {string} baseUrl
 * @returns {object} the index payload
 */
export function buildIndex(baseUrl) {
    const mods = [];
    for (const manifest of readManifests()) {
        const versions = manifest.versions
            .filter(entry => entry.published)
            .map(entry => ({
                version: entry.version,
                sdkVersion: entry.sdkVersion,
                commit: entry.commit,
                url: packageUrl(baseUrl, manifest.name, entry.version),
                artifacts: Object.fromEntries(entry.artifacts),
                publishedAt: entry.publishedAt,
            }));
        if (versions.length === 0) {
            continue;
        }
        mods.push({
            name: manifest.name,
            author: manifest.author,
            repo: manifest.repo,
            description: manifest.description,
            homepage: manifest.homepage,
            // Versions are ordered oldest first, so the newest published one is the last.
            latest: versions[versions.length - 1].version,
            versions,
        });
    }
    return {baseUrl, mods};
}

/**
 * The plain-text welcome screen, in the same shape every other service in this project serves (see
 * AbstractHttpServer._infoScreenBanner in the game repo). Static here: Pages has no server.
 * @param {string} title
 * @param {string[]} fields "  label : value" lines
 * @returns {string}
 */
function infoScreen(title, fields) {
    const width = 46;
    const padTotal = width - title.length;
    const padLeft = Math.floor(padTotal / 2);
    const padRight = padTotal - padLeft;
    return [
        "+==============================================+",
        "|            SHY'S POWER-UP FACTORY            |",
        `|${" ".repeat(padLeft)}${title}${" ".repeat(padRight)}|`,
        "+==============================================+",
        "",
        ...fields,
        "",
    ].join("\n");
}

/**
 * Pages serves this for anything it cannot find. Without it a typo'd package URL answers 200 with
 * the welcome screen, and whatever asked for it fails on the parse instead of on the 404. Pages
 * serves it as HTML whatever _headers says, so the screen goes in a <pre> to survive the trip.
 * @param {string} baseUrl
 * @returns {string}
 */
function notFound(baseUrl) {
    const screen = infoScreen("Not Found", [
        "  There is no such file in this registry.",
        "",
        `  index      : ${baseUrl}/index.json`,
        `  browse     : ${CLIENT_URL}/mods`,
    ]);
    return `<!doctype html>
<meta charset="utf-8">
<title>Not Found</title>
<pre>${screen}</pre>
`;
}

/**
 * @param {object} index
 * @param {string} baseUrl
 * @returns {string}
 */
function homepage(index, baseUrl) {
    const versions = index.mods.reduce((count, mod) => count + mod.versions.length, 0);
    return infoScreen("Mod Registry", [
        `  mods       : ${index.mods.length} listed`,
        `  versions   : ${versions} published`,
        `  index      : ${baseUrl}/index.json`,
        `  browse     : ${CLIENT_URL}/mods`,
        `  source     : ${SOURCE_URL}`,
    ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const {values: args} = parseArgs({
        options: {
            "out": {type: "string", default: join(ROOT, "public", "index.json")},
            "base-url": {type: "string", default: DEFAULT_BASE_URL},
        },
    });
    const index = buildIndex(args["base-url"]);
    mkdirSync(dirname(args.out), {recursive: true});
    writeFileSync(args.out, `${JSON.stringify(index, null, 4)}\n`);
    writeFileSync(join(dirname(args.out), "index.html"), homepage(index, args["base-url"]));
    writeFileSync(join(dirname(args.out), "404.html"), notFound(args["base-url"]));
    console.log(`${args.out}: ${index.mods.length} mods`);
}
