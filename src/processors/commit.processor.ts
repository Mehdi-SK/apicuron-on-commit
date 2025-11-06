import { Report } from '../types/report.schema.js'
import { ApicuronProcessor } from './processor.interface.js'
// import * as github from '@actions/github'
import * as core from '@actions/core'
import { OrcidProvider } from '../orcid/orcid-provider.type.js'
import { GithubPayload } from '../types/github.types.js'


type CommitProcessorInput = {
  githubPayload: GithubPayload
  apicuronActivityName: string
  apicuronLeague: string
  resourceUrl?: string
}
export class CommitProcessor
  implements ApicuronProcessor<CommitProcessorInput>
{
  private orcidProvider: OrcidProvider
  constructor(orcidProvider: OrcidProvider) {
    this.orcidProvider = orcidProvider
  }
  async process({ githubPayload, apicuronActivityName, apicuronLeague, resourceUrl }: CommitProcessorInput): Promise<Report[]> {
    // Implement the conversion logic from commit to report
    core.info(`Processing payload: ${JSON.stringify(githubPayload, null, 2)}`)
    const repo = githubPayload.repository!
    if (!githubPayload.commits?.length) {
      throw new Error('No commits found in the payload')
    }
    const reports = await Promise.all(
      githubPayload.commits.map(async (commit: any) => {
        if (!commit) throw new Error('Commit is undefined or null')
        const username = commit.author?.username || commit.committer?.username
        if (!username) {
          core.warning(`Skipping commit ${commit.id} - no username associated`)
          return null
        }

        const orcid = await this.orcidProvider.getUserOrcid(username)

        if (orcid === 'unknown') {
          core.info(`Skipping report for ${username} - no ORCID available`)
          return null
        }
        const resUrl = resourceUrl
          ? `${resourceUrl}/${repo.html_url}`
          : `${repo.html_url}`

        return {
          curator_orcid: orcid,
          entity_uri: `${resUrl}/commit/${commit.id}`,
          resource_id: resourceUrl,
          timestamp: commit.timestamp,
          activity_term: apicuronActivityName,
          league: apicuronLeague
        }
      })
    )
    return reports.filter((report): report is Report => report !== null)
  }
}
