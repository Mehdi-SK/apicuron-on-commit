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
      if (response.status >= 400) {
        core.warning(`User '${username}' won't be credited - no ORCID associated with their github account`)
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

    return data.orcid_id
  } catch (error) {
    core.error(
      `Failed to fetch user info for ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
    return 'unknown'
  }
}

async function processCommits(
  userInfoConfig: UserInfoServiceConfig,
  resourceId: string,
  activityName: string,
  league: string,
  resourceUrl?: string
): Promise<Report[]> {
  const { payload } = github.context
  core.info(`Processing payload: ${JSON.stringify(payload, null, 2)}`)
  const repo = payload.repository!
  if (!payload.commits?.length) {
    throw new Error('No commits found in the payload')
  }
  const reports = await Promise.all(
    payload.commits.map(async (commit: any) => {
      if(!commit) throw new Error('Commit is undefined or null')
      const username = commit.author?.username || commit.committer?.username
      if (!username) {
        core.warning(`Skipping commit ${commit.id} - no username associated`)
        return null
      }

      const orcid = await fetchUserInfo(username, userInfoConfig)
      
      if (orcid === 'unknown') {
        core.info(`Skipping report for ${username} - no ORCID available`)
        return null
      }
      const resUrl = resourceUrl? `${resourceUrl}/${repo.html_url}` : `${repo.html_url}`
      
      return {
        curator_orcid: orcid,
        entity_uri: `${resUrl}/commit/${commit.id}`,
        resource_id: resourceId,
        timestamp: commit.timestamp,
        activity_term: activityName,
        league: league
      }
    })
  )
  return reports.filter((report): report is Report => report !== null)
}

async function sendToApi(
  reports: Report[],
  apiConfig: ReportApiConfig
): Promise<void> {
  try {
    core.info(`Sending ${reports.length} reports to ${apiConfig.endpoint}`);

    const requestBody = {
      reports: reports,
    };

    const response = await fetch(apiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.token}`,
        'version': '2' 
      },
      body: JSON.stringify(requestBody)
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const responseBody = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      core.error(`API Error: ${response.status} ${response.statusText}`);
      core.error(`Response body: ${JSON.stringify(responseBody)}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    core.info(`Successfully sent ${reports.length} reports`);
    core.debug(`API Response: ${JSON.stringify(responseBody)}`);
  } catch (error) {
    core.error('Failed to send reports');
    if (error instanceof Error) {
      core.error(error.stack || error.message);
    }
    throw error;
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
    const resourceId = core.getInput('RESOURCE_ID', { required: true })
    const activityName = core.getInput('ACTIVITY_NAME', { required: true })
    const league = core.getInput('LEAGUE', { required: true })
    const resourceUrl = core.getInput('RESOURCE_URL')
    const reports = await processCommits(
      userInfoConfig,
      resourceId,
      activityName,
      league,
      resourceUrl
    )

    if (reports.length === 0) {
      core.info('No valid commits to process')
      return
    }
    core.info(`Generated ${reports.length} reports`)
    core.info(`sending reports to API: ${reportApiConfig.endpoint}`)
    console.log(JSON.stringify(reports, null, 2))
    await sendToApi(reports, reportApiConfig)
    core.setOutput('reports sent:', JSON.stringify(reports))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
