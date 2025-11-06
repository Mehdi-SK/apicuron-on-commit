import { UserOrcidApiConfig } from '../../types/api-config.js'
import { OrcidProvider } from '../orcid-provider.type.js'
import * as core from '@actions/core'

export class RemoteApiProvider implements OrcidProvider {
  cache: Map<string, string> = new Map<string, string>()
  constructor(private remoteServiceApiConfig: UserOrcidApiConfig) {}

  async getUserOrcid(username: string): Promise<string> {
    if (this.cache.has(username)) {
      core.debug(`Cache hit for user '${username}'`)
      return this.cache.get(username)!
    }

    try {
      const url = new URL(this.remoteServiceApiConfig.endpoint)
      url.searchParams.append('profileName', username)
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `tokenKey ${this.remoteServiceApiConfig.token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        if (response.status >= 400) {
          core.warning(
            `User '${username}' won't be credited - no ORCID associated with their github account`
          )
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return 'unknown'
      }

      const data = (await response.json()) as { orcid_id?: string }

      if (!data?.orcid_id) {
        core.notice(`No ORCID found for user '${username}' in API response`)
        return 'unknown'
      }
      this.cache.set(username, data.orcid_id)
      return data.orcid_id
    } catch (error) {
      core.error(
        `Failed to fetch user info for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return 'unknown'
    }
  }
}
