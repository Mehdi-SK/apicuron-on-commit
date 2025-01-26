import * as core from '@actions/core'
import * as github from '@actions/github'
interface ApiConfig {
  endpoint: string
  token: string
}
interface Report {
  curator_orcid: string
  entity_uri: string
  resource_id: string
  timestamp: string
  activity_term: string
  league: string
}
function processCommits(): Report[] {
  const { payload } = github.context
  const repo = payload.repository!
  if (!payload.commits) {
    throw new Error('No commits found in the payload')
  }
  return (
    payload.commits?.map((commit: any) => ({
      curator_orcid: commit.author?.username || 'unknown',
      entity_uri: `${repo.html_url}/commit/${commit.id}`,
      resource_id: repo.full_name?.toString(),
      timestamp: commit.timestamp,
      activity_term: 'commit',
      league: 'default'
    })) || []
  )
}

async function sendToApi(
  reports: Report[],
  apiConfig: ApiConfig
): Promise<void> {
  try {
    const response = await fetch(apiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.token}`
      },
      body: JSON.stringify({ reports })
    })

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      )
    }

    core.info(`Successfully sent ${reports.length} reports to API`)
  } catch (error) {
    core.error('Failed to send reports to API')
    throw error
  }
}
/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const apiConfig: ApiConfig = {
      endpoint: core.getInput('APICURON_ENDPOINT', { required: true }),
      token: core.getInput('APICURON_TOKEN') || ''
    }
    const reports = processCommits()
    if (reports.length === 0) {
      core.info('No commits to process')
      return
    }
    console.log(JSON.stringify(reports))
    console.log(apiConfig)
    // await sendToApi(reports, apiConfig)
    core.setOutput('reports', JSON.stringify(reports))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
