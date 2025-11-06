import * as core from '@actions/core'
import * as github from '@actions/github'
import { APICURONClient } from './apicuron-client/apicuron-client.js'
import { CommitProcessor } from './processors/commit.processor.js'
import { UserOrcidApiConfig } from './types/api-config.js'
import { RemoteApiProvider } from './orcid/orcid-providers/remote-api.provider.js'
interface ReportApiConfig {
  endpoint: string
  token: string
}

export async function run(): Promise<void> {
  try {
    const userInfoConfig: UserOrcidApiConfig = {
      endpoint: core.getInput('USER_INFO_SERVICE_ENDPOINT', { required: true }),
      token: core.getInput('USER_INFO_SERVICE_TOKEN')
    }
    const reportApiConfig: ReportApiConfig = {
      endpoint: core.getInput('REPORT_API_ENDPOINT', { required: true }),
      token: core.getInput('REPORT_API_TOKEN')
    }
    const resourceId = core.getInput('RESOURCE_ID', { required: true })
    const apicuronActivityName = core.getInput('ACTIVITY_NAME', {
      required: true
    })
    const apicuronLeague = core.getInput('LEAGUE', { required: true })
    const resourceUrl = core.getInput('RESOURCE_URL')

    const orcidProvider = new RemoteApiProvider(userInfoConfig)
    const commitProcessor = new CommitProcessor(orcidProvider)

    const githubPayload = github.context.payload

    const reports = await commitProcessor.process({
      githubPayload,
      apicuronActivityName,
      apicuronLeague,
      resourceUrl
    })

    if (reports.length === 0) {
      core.info('No valid commits to process')
      return
    }
    core.info(`Generated ${reports.length} reports`)
    core.info(`sending reports to API: ${reportApiConfig.endpoint}`)
    console.log(JSON.stringify(reports, null, 2))

    const apicuronClient = new APICURONClient(reportApiConfig)
    await apicuronClient.sendReports(reports)
    core.setOutput('reports sent:', JSON.stringify(reports))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
