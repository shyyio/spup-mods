# Mod registry

Catalog of mods for Shy's Power-Up Factory, served at
[mods.spupgame.com](https://mods.spupgame.com) (browse: [spupgame.com/mods](https://spupgame.com/mods)).

Packaged mods are built from source here and served via Pages.

`my-spup-mod/registry.json`:

```json
{
    "name": "my-spup-mod", // lowercase letters, digits and dashes, 2-32 characters
    "author": "Bob",
    "repo": "https://github.com/bob/my-spup-mod",
    "path": ".", // where the mod lives in repo
    "description": "One sentence about what the mod adds.",
    "versions": [
        {"version": "1.0.0", "commit": "<40-char sha>", "toolchain": "1.0.0", "sdkVersion": 1}
    ]
}
```

`toolchain` is the game version your mod is built with: CI checks the game repo out at that tag and
runs its `tools/build-mod.js` over your pinned commit.

## Listing a mod

1. Fork this repo, add `mods/<name>/registry.json` with your first version's pinned commit.
2. Check it yourself: `npm run validate`.
3. Open a PR.
4. On merge, CI builds the pinned commit and publishes the package.

Releasing a new version is the same flow with one more entry in `versions`.