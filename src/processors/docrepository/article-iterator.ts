import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import * as core from '@actions/core'
import YAML from 'yaml'
import { Glob } from 'glob'
import { minimatch } from 'minimatch'
export type IteratorConfig = {
  basePath: string
}

export type JekyllDefaultConfig = {
  excludedPaths: string[]
  defaults: Record<string, DefaultsConfig>
  globalDefaults: DefaultsConfig
}

export type DefaultsConfigValue =
  | Record<string, string>
  | string
  | string[]
  | Record<string, string>[]

export type DefaultsConfig = Record<string, DefaultsConfigValue>
type ConfigPath = string

const defaultExcludedPaths = [
  '_data/',
  '_drafts/',
  '_includes/',
  '_layouts/',
  '_sass/',
  '_site/',
  '.jekyll-cache',
  '.jekyll-metadata'
]
export class JekyllDefaultConfigBuilder {
  data: {
    exclude?: string[]
    defaults: {
      scope: {
        path: string
        type: string
      }
      values: Record<string, DefaultsConfigValue>
    }[]
  }

  excludedPaths: string[] = []
  defaults: Record<ConfigPath, DefaultsConfig> = {}
  globalDefaults: DefaultsConfig = {}
  constructor(yamlString: string) {
    this.data = YAML.parse(yamlString)
  }

  loadExcludes(): this {
    if (!!this.data.exclude && Array.isArray(this.data.exclude)) {
      this.excludedPaths = this.data.exclude.filter(
        (entry) => typeof entry === 'string'
      )
      if (this.excludedPaths.length <= this.data.exclude.length) {
        core.warning('Found non-string values in exclude array on Config')
      }
    }
    return this
  }

  loadDefaults(): this {
    if (!!this.data.defaults && Array.isArray(this.data.defaults)) {
      this.data.defaults.forEach((defaultEntry) => {
        const path = defaultEntry.scope.path
        const values = defaultEntry.values
        if (path == '') {
          this.globalDefaults = values as DefaultsConfig
          return
        }
        this.defaults[path] = values as DefaultsConfig
      })
    }
    return this
  }

  build(): JekyllDefaultConfig {
    return {
      defaults: this.defaults,
      excludedPaths: this.excludedPaths,
      globalDefaults: this.globalDefaults
    }
  }
}

export const jekyllConfigFile = '_config.yml' as const

/**
 * Resolve Jekyll-style defaults for a given file path.
 *
 * This function creates a shallow copy of `defaultConfig.globalDefaults` and then iterates over
 * the entries in `defaultConfig.defaults`. For each pattern key, if `minimatch(filePath, pattern)` is
 * true, the corresponding defaults object is shallow-merged into the result (via Object.assign).
 * Later matching patterns override properties from earlier matches.
 *
 * Notes:
 * - Merges are shallow: nested objects are not deeply merged.
 * - The returned object is a new object and does not mutate `defaultConfig.globalDefaults` or the
 *   originals in `defaultConfig.defaults`.
 * - Pattern matching is performed by the `minimatch` library and follows its semantics.
 *
 * @param filePath - The file path to test against configured default patterns.
 * @param defaultConfig - A Jekyll defaults configuration, expected to contain:
 *   - `globalDefaults`: a DefaultsConfig applied to all files initially.
 *   - `defaults`: a Record<string, DefaultsConfig> mapping minimatch patterns to defaults.
 * @returns The computed DefaultsConfig for the given file path.
 *
 * @example
 * // Given:
 * // globalDefaults = { layout: "default" }
 * // defaults = { "posts/**\/*.md": { layout: "post" }, "posts/2020/**": { author: "Alice" } }
 * // getFileDefaults("posts/2020/a.md", defaultConfig) -> { layout: "post", author: "Alice" }
 */
function getFileDefaults(
  filePath: string,
  defaultConfig: JekyllDefaultConfig
): DefaultsConfig {
  const defaults: DefaultsConfig = Object.assign(
    {},
    defaultConfig.globalDefaults
  )
  for (const path in defaultConfig.defaults) {
    if (minimatch(filePath, path)) {
      Object.assign(defaults, defaultConfig.defaults[path])
    }
  }
  return defaults
}

export async function* ArticleIterator(config: IteratorConfig) {
  const configPath = join(config.basePath, jekyllConfigFile)
  const exists = existsSync(configPath)
  let baseConfigObj: JekyllDefaultConfig = {
    excludedPaths: defaultExcludedPaths,
    defaults: {} as Record<string, DefaultsConfig>,
    globalDefaults: {} as DefaultsConfig
  }

  if (!exists) {
    // If the file is not find, we let the user know and emit a warning
    core.warning(
      `No ${jekyllConfigFile} found in page ${config.basePath} could not parse defaults !`
    )
  } else {
    // If the file is found the yaml is parsed and the config is loaded
    const yamlContent = readFileSync(configPath, 'utf-8')
    baseConfigObj = new JekyllDefaultConfigBuilder(yamlContent)
      .loadExcludes()
      .loadDefaults()
      .build()
  }

  const pathIterator = new Glob('./**/*.md', {
    ignore: baseConfigObj.excludedPaths,
    cwd: config.basePath
  })

  for await (const file of pathIterator) {
    const defaultValue = getFileDefaults(file, baseConfigObj)

    yield {
      filePath: file,
      defaults: defaultValue
    }
  }
}
