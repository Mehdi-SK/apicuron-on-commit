import * as core from '@actions/core'
import * as github from '@actions/github'
interface ReportApiConfig {
  endpoint: string
  token: string
}
interface UserInfoServiceConfig {
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

async function fetchUserInfo(
  username: string,
  config: UserInfoServiceConfig
): Promise<string> {
  try {
    const url = new URL(config.endpoint)
    url.searchParams.append('profileName', username)
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `tokenKey ${config.token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json() as { orcid_id?: string }
    
    return data?.orcid_id || 'unknown'
  } catch (error) {
    core.error(`Failed to fetch user info for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return 'unknown'
  }
}

async function processCommits(userInfoConfig: UserInfoServiceConfig): Promise<Report[]> {
  const { payload } = github.context
  const repo = payload.repository!
  if (!payload.commits?.length) {
    throw new Error('No commits found in the payload')
  }
  const reports = await Promise.all(
    payload.commits.map(async (commit: any) => {
      const username = commit.author?.username || commit.committer?.username
      if (!username) {
        throw new Error('No username found in the commit')
      }
      const orcid = await fetchUserInfo(username, userInfoConfig)
      return {
        curator_orcid: orcid,
        entity_uri: `${repo.html_url}/commit/${commit.id}`,
        resource_id: repo.full_name?.toString() || 'unknown',
        timestamp: commit.timestamp,
        activity_term: 'commit',
        league: 'default'
      }
    })
  )
  return reports;
}

async function sendToApi(
  reports: Report[],
  apiConfig: ReportApiConfig
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
    core.info(`Successfully sent ${reports.length} reports`)
  } catch (error) {
    core.error('Failed to send reports')
    throw error
  }
}

export async function run(): Promise<void> {
  try {
    const userInfoConfig: UserInfoServiceConfig = {
      endpoint: core.getInput('USER_INFO_SERVICE_ENDPOINT', { required: true }),
      token: core.getInput('USER_INFO_SERVICE_TOKEN')
    }
    const reportApiConfig: ReportApiConfig = {
      endpoint: core.getInput('REPORT_API_ENDPOINT', { required: true }),
      token: core.getInput('REPORT_API_TOKEN')
    }
    const reports = await processCommits(userInfoConfig)
    
    if (reports.length === 0) {
      core.info('No valid commits to process')
      return
    }
    console.log(JSON.stringify(reports, null, 2))
    await sendToApi(reports, reportApiConfig)
    core.setOutput('reports sent:', JSON.stringify(reports))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}